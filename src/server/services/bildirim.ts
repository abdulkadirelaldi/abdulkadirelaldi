import webpush from 'web-push';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { SU_HEDEFI_ML } from '@/lib/hedefler';
import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';
import type { WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  startOfAppWeek,
  toMeasureString,
  type AppDay,
} from './_shared';
import { fetchHabitDay } from './habit-gun';
import { fetchHaftalikOzet, ozetMetni } from './haftalik-ozet';
import { fetchIslenenBorclar } from './odeme-onay';

/**
 * BİLDİRİMLER (2026-10-30) — telefona push.
 *
 * ZAMANLAYICI uygulama sürecinin İÇİNDE (`src/instrumentation.ts`): 5 dakikada
 * bir `bildirimTuru()`. Sunucuda ek cron yok. Tek örnek koşuyor (docker
 * compose `uygulama`), yine de tekrar VERİTABANINDA önlenir: (tür, anahtar,
 * gün) eşsiz — yeniden başlatma ya da çakışan tur aynı bildirimi ikinci kez
 * gönderemez.
 *
 * NE ZAMAN (İstanbul saati):
 *   borç       09–21 · ödeme gününden 2 gün önce ve ödeme günü
 *   alışkanlık 21–23 · işaretlenmemiş alışkanlık kaldıysa
 *   su         11, 15, 18 (2 saatlik pencere) · bugün 3,5 L'nin altındaysa
 *   haftalık   pazar 20–23 · hafta boş değilse
 * Rekor bildirimi zamanlayıcıdan değil set yazılırken gider (`spor-gelisim.ts`).
 * Pencere dışında gönderilmez: sunucu 19:00'da kalkarsa sabahın su
 * hatırlatması yığılıp gelmez.
 *
 * ANAHTARLAR: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Yoksa
 * özellik kapalı; ekran söyler.
 */

const SU_SAATLERI = [11, 15, 18] as const;

export interface Vapid {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function vapidAyarlari(env: Record<string, string | undefined> = process.env): Vapid | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim() || 'mailto:bildirim@abdulkadirelaldi.com';
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

export interface Bildirim {
  tur: 'borc' | 'aliskanlik' | 'su' | 'haftalik' | 'test';
  /** Gün içinde tekrarı önleyen anahtar. */
  anahtar: string;
  baslik: string;
  govde: string;
  url: string;
}

export interface Tercih {
  borc: boolean;
  aliskanlik: boolean;
  su: boolean;
  haftalik?: boolean;
}

export interface PlanGirdisi {
  gun: AppDay;
  /** İstanbul saati, 0–23. */
  saat: number;
  tercih: Tercih;
  borclar: { id: string; ad: string; odemeGunu: number; tutar: string | null }[];
  kalanAliskanliklar: string[];
  suMl: number | null;
  /** Ödenmiş ya da atlanmış taksitler: `borçId:YYYY-MM` — hatırlatılmaz. */
  odenen?: ReadonlySet<string>;
  /** Yalnızca pazar akşamı dolar; boş haftada `null`. */
  haftalikGovde?: string | null;
}

/** Ayın son günü — 31'inde ödenen borç şubatta 28'ine düşer. SAF. */
function sonGun(gun: AppDay): number {
  const [y, m] = gun.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Pazar 20:00–23:00. SAF. */
function haftalikZamani(gun: AppDay, saat: number): boolean {
  return gun === addAppDays(startOfAppWeek(gun), 6) && saat >= 20 && saat < 23;
}

/** Bu saatte gönderilmesi gerekenler. SAF — zamanlayıcının bütün kararı. */
export function planla(g: PlanGirdisi): Bildirim[] {
  const sonuc: Bildirim[] = [];

  if (g.tercih.borc && g.saat >= 9 && g.saat < 21) {
    for (const b of g.borclar) {
      for (const kala of [2, 0] as const) {
        const hedef = addAppDays(g.gun, kala);
        const gunNo = Number(hedef.slice(8, 10));
        if (gunNo !== Math.min(b.odemeGunu, sonGun(hedef))) continue;
        if (g.odenen?.has(`${b.id}:${hedef.slice(0, 7)}`)) continue;
        sonuc.push({
          tur: 'borc',
          anahtar: `${b.id}:${hedef}`,
          baslik: kala === 0 ? 'Bugün ödeme günü' : 'Ödeme yaklaşıyor',
          govde:
            kala === 0
              ? `${b.ad}${b.tutar ? ` · ${b.tutar}` : ''}`
              : `${b.ad} — 2 gün sonra${b.tutar ? ` · ${b.tutar}` : ''}`,
          url: '/panel/cuzdan',
        });
      }
    }
  }

  if (g.tercih.aliskanlik && g.saat >= 21 && g.kalanAliskanliklar.length > 0) {
    const n = g.kalanAliskanliklar.length;
    sonuc.push({
      tur: 'aliskanlik',
      anahtar: 'aksam',
      baslik: `Bugün ${n} alışkanlık kaldı`,
      govde: g.kalanAliskanliklar.slice(0, 4).join(', ') + (n > 4 ? '…' : ''),
      url: '/panel/hayat',
    });
  }

  const suSaati = [...SU_SAATLERI].reverse().find((s) => g.saat >= s && g.saat < s + 2);
  if (g.tercih.su && suSaati !== undefined && (g.suMl ?? 0) < SU_HEDEFI_ML) {
    const litre = ((g.suMl ?? 0) / 1000).toLocaleString('tr-TR');
    sonuc.push({
      tur: 'su',
      anahtar: `s${suSaati}`,
      baslik: 'Su içmeyi unutma 💧',
      govde: `Bugün ${litre} L içtin, hedef 3,5 L.`,
      url: '/panel',
    });
  }

  if (g.tercih.haftalik !== false && g.haftalikGovde && haftalikZamani(g.gun, g.saat)) {
    sonuc.push({
      tur: 'haftalik',
      anahtar: 'pazar',
      baslik: 'Haftan hazır 📊',
      govde: g.haftalikGovde,
      url: '/panel/haftalik',
    });
  }

  return sonuc;
}

const SAAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Istanbul',
});

/** Kullanıcının o anki planı için veriyi toplar. */
async function planGirdisi(userId: string, simdi: Date): Promise<PlanGirdisi> {
  const gun = appToday(simdi);
  const saat = Number(SAAT.format(simdi));
  const [tercih, borclar, gunluk, saglik] = await Promise.all([
    db.bildirimTercihi.findUnique({ where: { userId } }),
    db.walletDebt.findMany({
      where: { isClosed: false, paymentDay: { not: null } },
      select: { id: true, name: true, paymentDay: true, monthlyPayment: true, unit: true },
    }),
    fetchHabitDay(gun, db, gun),
    db.healthLog.findUnique({ where: { date: appDayToDate(gun) }, select: { waterMl: true } }),
  ]);
  return {
    gun,
    saat,
    tercih: tercih ?? { borc: true, aliskanlik: true, su: true },
    borclar: borclar.map((b) => {
      const tutar = toMeasureString(b.monthlyPayment, 2);
      return {
        id: b.id,
        ad: b.name,
        odemeGunu: b.paymentDay ?? 1,
        tutar: tutar ? miktarBicim(tutar, b.unit as WalletUnit) : null,
      };
    }),
    kalanAliskanliklar: gunluk.items
      .filter((i) => i.durum !== 'YAPILDI' && i.durum !== 'YAPILMADI')
      .map((i) => i.name),
    suMl: saglik?.waterMl ?? null,
    odenen: await fetchIslenenBorclar(),
    haftalikGovde: haftalikZamani(gun, saat)
      ? ozetMetni(await fetchHaftalikOzet(gun, db, gun))
      : null,
  };
}

/** Kullanıcının tüm cihazlarına gönderir; ölü abonelikleri temizler. Gönderilen cihaz sayısı. */
export async function kullaniciyaGonder(
  userId: string,
  b: Pick<Bildirim, 'baslik' | 'govde' | 'url'>,
  vapid: Vapid,
): Promise<number> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const abonelikler = await db.pushAbonelik.findMany({ where: { userId } });
  let ulasan = 0;
  await Promise.all(
    abonelikler.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          JSON.stringify({ baslik: b.baslik, govde: b.govde, url: b.url }),
          { TTL: 60 * 60 },
        );
        ulasan += 1;
      } catch (error) {
        const kod = (error as { statusCode?: number }).statusCode;
        // Abonelik sona ermiş (uygulama silindi, izin geri alındı) — kaydı sil.
        if (kod === 404 || kod === 410) {
          await db.pushAbonelik.delete({ where: { id: a.id } }).catch(() => undefined);
        } else {
          guvenliHata('[bildirim] gönderilemedi:', kod ?? (error as Error).message);
        }
      }
    }),
  );
  return ulasan;
}

/** Zamanlayıcı turu — `instrumentation.ts` 5 dakikada bir çağırır. */
export async function bildirimTuru(simdi: Date = new Date()): Promise<number> {
  const vapid = vapidAyarlari();
  if (!vapid) return 0;

  const kullanicilar = await db.pushAbonelik.findMany({
    distinct: ['userId'],
    select: { userId: true },
  });
  let gonderilen = 0;
  for (const { userId } of kullanicilar) {
    const girdi = await planGirdisi(userId, simdi);
    for (const b of planla(girdi)) {
      // Önce KAYIT: eşsizlik ihlali (P2002) = bugün zaten gönderildi → atla.
      const yeni = await db.bildirimKaydi
        .create({
          data: { tur: b.tur, anahtar: `${userId}:${b.anahtar}`, gun: appDayToDate(girdi.gun) },
        })
        .then(() => true)
        .catch(() => false);
      if (yeni) gonderilen += await kullaniciyaGonder(userId, b, vapid);
    }
  }
  // Eski kayıtları temizle (30 gün) — tablo büyümesin.
  await db.bildirimKaydi.deleteMany({
    where: { gun: { lt: appDayToDate(addAppDays(appToday(simdi), -30)) } },
  });
  return gonderilen;
}
