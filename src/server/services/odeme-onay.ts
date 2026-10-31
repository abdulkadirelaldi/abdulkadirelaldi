import type { OdemeIsleInput } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  dateToAppDay,
  subtractMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import { borcOdemesiYaz } from './cuzdan';

/**
 * AYLIK ÖDEME ONAYI (2026-11-01) — günü gelen taksit ve gider için "ödendi mi?".
 *
 * Kapsam: borç taksitleri ve AYLIK giderler. Haftalık/yıllık gider ve gelir yok.
 * Bu ay gecikenler ve 7 gün içinde günü gelenler listelenir.
 *
 * GÜVENCE: tutar istemciden ALINMAZ, kaynaktan okunur. (tür, kaynak, dönem) eşsiz:
 * aynı ödeme iki kez işlenemez. Kayıt, hesaptan düşme ve borçtan düşme TEK işlem.
 * Hesapta yetmezse reddedilir: eksi bakiye altın/döviz kur hesabını bozar.
 */

const PENCERE_GUN = 7;

export class OdemeHatasi extends Error {}

export interface BekleyenOdeme {
  kaynakTur: 'BORC' | 'AKIS';
  kaynakId: string;
  ad: string;
  tutar: string;
  unit: WalletUnit;
  donem: string;
  /** Vadeye kalan gün; negatifse gecikmiş. */
  kala: number;
}

interface Kaynak {
  kaynakTur: 'BORC' | 'AKIS';
  kaynakId: string;
  ad: string;
  tutar: string;
  unit: WalletUnit;
  gun: number;
  /** Kaynağın eklendiği gün: öncesindeki vade "gecikmiş" sayılmaz. */
  olusturma?: AppDay;
}

/** O ayın ödeme günü: 31'i kısa ayda son güne düşer. SAF. */
function vade(donem: string, gun: number): AppDay {
  const [y, m] = donem.split('-').map(Number) as [number, number];
  const son = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${donem}-${String(Math.min(gun, son)).padStart(2, '0')}` as AppDay;
}

const gunFarki = (a: string, b: string) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** Listelenecekler: işlenmemiş, bu ay gecikmiş ya da pencere içinde; en acil önce. SAF. */
export function bekleyenleriSec(
  kaynaklar: readonly Kaynak[],
  islenen: ReadonlySet<string>,
  bugun: AppDay,
): BekleyenOdeme[] {
  const buAy = bugun.slice(0, 7);
  const gelecekAy = addAppDays(vade(buAy, 31), 1).slice(0, 7);
  const sonuc: BekleyenOdeme[] = [];
  for (const k of kaynaklar) {
    for (const donem of [buAy, gelecekAy]) {
      if (islenen.has(`${k.kaynakTur}:${k.kaynakId}:${donem}`)) continue;
      const vadeGunu = vade(donem, k.gun);
      if (k.olusturma && vadeGunu < k.olusturma) continue;
      const kala = gunFarki(vadeGunu, bugun);
      if (kala > PENCERE_GUN) continue;
      sonuc.push({
        kaynakTur: k.kaynakTur,
        kaynakId: k.kaynakId,
        ad: k.ad,
        tutar: k.tutar,
        unit: k.unit,
        donem,
        kala,
      });
    }
  }
  return sonuc.sort((a, b) => a.kala - b.kala);
}

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';
type Client = typeof db;

/** İki aylık işlenmiş kayıtlar + elle girilmiş borç ödemeleri → `TUR:id:YYYY-MM`. */
async function islenenKumesi(
  client: Pick<Client, 'walletOdeme' | 'walletDebtPayment'>,
  bugun: AppDay,
): Promise<Set<string>> {
  const buAy = bugun.slice(0, 7);
  const gelecekAy = addAppDays(vade(buAy, 31), 1).slice(0, 7);
  const [kayitlar, elle] = await Promise.all([
    client.walletOdeme.findMany({
      where: { donem: { in: [buAy, gelecekAy] } },
      select: { kaynakTur: true, kaynakId: true, donem: true },
    }),
    client.walletDebtPayment.findMany({
      where: { date: { gte: appDayToDate(`${buAy}-01` as AppDay) } },
      select: { debtId: true, date: true },
    }),
  ]);
  return new Set([
    ...kayitlar.map((k) => `${k.kaynakTur}:${k.kaynakId}:${k.donem}`),
    ...elle.map((o) => `BORC:${o.debtId}:${dateToAppDay(o.date).slice(0, 7)}`),
  ]);
}

export async function fetchBekleyenOdemeler(
  client: Pick<Client, 'walletDebt' | 'walletFlow' | 'walletOdeme' | 'walletDebtPayment'> = db,
  bugun: AppDay = appToday(),
): Promise<BekleyenOdeme[]> {
  const [borclar, giderler, islenen] = await Promise.all([
    client.walletDebt.findMany({
      where: { isClosed: false, paymentDay: { not: null }, monthlyPayment: { not: null } },
      select: {
        id: true,
        name: true,
        unit: true,
        monthlyPayment: true,
        paymentDay: true,
        createdAt: true,
      },
    }),
    client.walletFlow.findMany({
      where: { isActive: true, kind: 'EXPENSE', frequency: 'MONTHLY', day: { not: null } },
      select: { id: true, name: true, unit: true, amount: true, day: true, createdAt: true },
    }),
    islenenKumesi(client, bugun),
  ]);
  return bekleyenleriSec(
    [
      ...borclar.map((b): Kaynak => ({
        kaynakTur: 'BORC',
        kaynakId: b.id,
        ad: b.name,
        tutar: para(b.monthlyPayment),
        unit: b.unit as WalletUnit,
        gun: b.paymentDay ?? 1,
      })),
      ...giderler.map((g): Kaynak => ({
        kaynakTur: 'AKIS',
        kaynakId: g.id,
        ad: g.name,
        tutar: para(g.amount),
        unit: g.unit as WalletUnit,
        gun: g.day ?? 1,
      })),
    ],
    islenen,
    bugun,
  );
}

/** Bildirim planı için: işlenmiş taksitler `borçId:YYYY-MM`. */
export async function fetchIslenenBorclar(
  client: Pick<Client, 'walletOdeme' | 'walletDebtPayment'> = db,
  bugun: AppDay = appToday(),
): Promise<Set<string>> {
  const kume = await islenenKumesi(client, bugun);
  return new Set(
    [...kume].filter((k) => k.startsWith('BORC:')).map((k) => k.slice('BORC:'.length)),
  );
}

export async function odemeIsle(
  girdi: OdemeIsleInput,
  client: Pick<Client, '$transaction'> = db,
  bugun: AppDay = appToday(),
): Promise<{ yeni: boolean }> {
  try {
    await client.$transaction(async (tx) => {
      const kaynak =
        girdi.kaynakTur === 'BORC'
          ? await tx.walletDebt.findUnique({
              where: { id: girdi.kaynakId },
              select: { unit: true, monthlyPayment: true },
            })
          : await tx.walletFlow.findUnique({
              where: { id: girdi.kaynakId },
              select: { unit: true, amount: true },
            });
      if (!kaynak) throw new OdemeHatasi('Kayıt bulunamadı.');
      const tutar = para('monthlyPayment' in kaynak ? kaynak.monthlyPayment : kaynak.amount);
      const odendi = girdi.durum === 'ODENDI';

      await tx.walletOdeme.create({
        data: {
          kaynakTur: girdi.kaynakTur,
          kaynakId: girdi.kaynakId,
          donem: girdi.donem,
          durum: girdi.durum,
          hesapId: odendi ? (girdi.hesapId ?? null) : null,
          tutar: odendi ? tutar : null,
          gun: appDayToDate(bugun),
        },
      });
      if (!odendi) return;

      if (girdi.hesapId) {
        const hesap = await tx.walletAccount.findUnique({
          where: { id: girdi.hesapId },
          select: { unit: true, balance: true, isArchived: true },
        });
        if (!hesap || hesap.isArchived) throw new OdemeHatasi('Hesap bulunamadı.');
        if (hesap.unit !== kaynak.unit)
          throw new OdemeHatasi('Hesabın birimi ödemeyle aynı değil.');
        const kalan = subtractMoney(para(hesap.balance), tutar);
        if (kalan.startsWith('-')) throw new OdemeHatasi('Hesapta yeterli bakiye yok.');
        await tx.walletAccount.update({
          where: { id: girdi.hesapId },
          data: { balance: kalan },
        });
      }
      if (girdi.kaynakTur === 'BORC') {
        await borcOdemesiYaz(
          { debtId: girdi.kaynakId, date: bugun, amount: tutar, note: 'Aylık ödeme' },
          tx,
        );
      }
    });
    return { yeni: true };
  } catch (error) {
    // Aynı dönem zaten işlenmiş: hata değil, ikinci dokunuş etkisiz.
    if ((error as { code?: unknown }).code === 'P2002') return { yeni: false };
    throw error;
  }
}
