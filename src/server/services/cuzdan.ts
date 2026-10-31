import type {
  UpdateWalletAccountInput,
  UpdateWalletDebtInput,
  UpdateWalletFlowInput,
  WalletAccountInput,
  WalletDebtInput,
  WalletDebtPaymentInput,
  WalletFlowInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { WalletAccountKind, WalletFlowKind, WalletFrequency, WalletUnit } from '@/types';

import {
  addAppDays,
  appDayToDate,
  appToday,
  computeBaseAmount,
  dateToAppDay,
  differenceInAppDays,
  subtractMoney,
  sumMoney,
  toMeasureString,
  type AppDay,
} from './_shared';
import { fetchKurlar, tlKarsiligi, type KurDurumu } from './kur';

/**
 * CÜZDAN (2026-10-30) — muhasebenin yerine kişisel varlık, borç, gelir/gider.
 *
 * Tutarlar uç uca METİN; TL karşılıkları kayıpsız (`computeBaseAmount`),
 * toplamlar `sumMoney` (ADR-014/D). Varlık ALIŞ, borç SATIŞ kuruyla (kur.ts).
 * Kuru bilinmeyen kalem toplama GİRMEZ ve ekranda "kur yok" diye işaretlenir —
 * sıfır saymak toplamı sessizce düşürürdü.
 *
 * "AY SONUNDA KALAN" TEK KURALLA: gelir ALIŞ, gider ve taksit SATIŞ kuruyla; atlanan
 * kalem girmez; taksit = bu ay ödenen + bu ay kalan (`kalanTaksit`). Aylık rapor da
 * aynısını kullanır.
 */

type Client = typeof db;

const para = (d: unknown): string => toMeasureString(d as never, 2) ?? '0.00';

/* ===========================================================================
 * SAF YARDIMCILAR
 * ======================================================================== */

/** Aylığa çeviren çarpan — haftalık 52/12, yıllık 1/12; tek seferlik aylığa girmez. */
export const AYLIK_CARPAN: Record<WalletFrequency, string | null> = {
  MONTHLY: '1',
  WEEKLY: '4.33333333',
  YEARLY: '0.08333333',
  ONCE: null,
};

/** Tutarın AYLIK karşılığı (aynı birimde); tek seferlikse `null`. SAF. */
export function aylikTutar(tutar: string, siklik: WalletFrequency): string | null {
  const carpan = AYLIK_CARPAN[siklik];
  return carpan === null ? null : computeBaseAmount(tutar, carpan);
}

/**
 * Borcun bitişine kalan ay. Bitiş tarihi varsa ondan (tam ay, yukarı yuvarlı);
 * yoksa kalan / taksit (yukarı). İkisi de yoksa `null`. SAF.
 */
export function kalanAy(
  kalan: string,
  taksit: string | null,
  bitis: AppDay | null,
  bugun: AppDay,
): number | null {
  if (bitis) return Math.max(0, Math.ceil(differenceInAppDays(bugun, bitis) / 30.44));
  if (taksit && Number(taksit) > 0) return Math.ceil(Number(kalan) / Number(taksit));
  return null;
}

/** Ödenen yüzde — `(toplam - kalan) / toplam`, 0–100 tam sayı. SAF. */
export function odenenYuzde(toplam: string, kalan: string): number {
  const t = Number(toplam);
  if (t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((t - Number(kalan)) / t) * 100)));
}

/** İşlenemeyen para hareketi: mesaj kullanıcıya gösterilir. */
export class OdemeHatasi extends Error {}

/** Bu ay daha ödenecek taksit: atlandıysa ya da ödendiyse 0, kalan borcu geçmez. SAF. */
export function kalanTaksit(
  aylik: string | null,
  kalanBorc: string,
  odenen: string,
  atlandi: boolean,
): string {
  if (!aylik || atlandi) return '0.00';
  const eksik = subtractMoney(aylik, odenen);
  if (eksik.startsWith('-')) return '0.00';
  return Number(kalanBorc) < Number(eksik) ? kalanBorc : eksik;
}

/* ===========================================================================
 * DTO'lar
 * ======================================================================== */

export interface HesapDto {
  id: string;
  name: string;
  kind: WalletAccountKind;
  unit: WalletUnit;
  balance: string;
  /** TL karşılığı (alış) — kur yoksa `null`. */
  tl: string | null;
}

export interface BorcDto {
  id: string;
  name: string;
  lender: string | null;
  unit: WalletUnit;
  totalAmount: string;
  remainingAmount: string;
  monthlyPayment: string | null;
  paymentDay: number | null;
  endDate: AppDay | null;
  note: string | null;
  isClosed: boolean;
  /** Kalan borcun TL karşılığı (satış) — kur yoksa `null`. */
  kalanTl: string | null;
  /** Aylık taksidin TL karşılığı (satış). */
  taksitTl: string | null;
  odenenYuzde: number;
  kalanAy: number | null;
}

export interface AkisDto {
  id: string;
  kind: WalletFlowKind;
  name: string;
  counterparty: string | null;
  unit: WalletUnit;
  amount: string;
  frequency: WalletFrequency;
  day: number | null;
  date: AppDay | null;
  category: string | null;
  note: string | null;
  isActive: boolean;
  /**
   * BU AYA düşen TL — tekrarlayanda aylık karşılık, tek seferlikte bu ay
   * tarihliyse tutarın kendisi; başka aya aitse `null`.
   */
  aylikTl: string | null;
}

export interface CuzdanOzeti {
  varlikTl: string;
  borcTl: string;
  netTl: string;
  aylikGelirTl: string;
  aylikGiderTl: string;
  /** Bu ayın tek seferlik harcamaları: düzenli giderler hariç. */
  harcananTl: string;
  /** Bu ay ödenen + bu ay daha ödenecek taksit. */
  aylikTaksitTl: string;
  /** Gelir − gider − taksit. */
  aylikKalanTl: string;
  /** Kuru bilinmediği için toplamlara GİRMEYEN kalem sayısı. */
  kursuzKalem: number;
}

export interface CuzdanDto {
  hesaplar: HesapDto[];
  borclar: BorcDto[];
  gelirler: AkisDto[];
  /** Tekrarlayan giderler (kira, abonelik…). */
  giderler: AkisDto[];
  /** Bu ayın TEK SEFERLİK giderleri (hızlı harcama dahil), yeniden eskiye. */
  harcamalar: AkisDto[];
  ozet: CuzdanOzeti;
  kur: Pick<KurDurumu, 'guncellendi' | 'bayat'> & { kurlar: KurDurumu['kurlar'] };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

export async function fetchCuzdan(
  client: Client = db,
  bugun: AppDay = appToday(),
  kurDurumu?: KurDurumu,
): Promise<CuzdanDto> {
  const buAyKodu = bugun.slice(0, 7);
  const [hesapSatir, borcSatir, akisSatir, odemeSatir, onaySatir, kur] = await Promise.all([
    client.walletAccount.findMany({
      where: { isArchived: false },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    }),
    client.walletDebt.findMany({
      where: { isClosed: false },
      orderBy: [{ endDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    }),
    client.walletFlow.findMany({
      where: { isActive: true },
      orderBy: [{ day: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    }),
    client.walletDebtPayment.findMany({
      where: { date: { gte: appDayToDate(`${buAyKodu}-01` as AppDay) } },
      select: { debtId: true, date: true, amount: true, debt: { select: { unit: true } } },
    }),
    client.walletOdeme.findMany({
      where: { donem: buAyKodu, durum: 'ATLANDI' },
      select: { kaynakTur: true, kaynakId: true },
    }),
    kurDurumu ? Promise.resolve(kurDurumu) : fetchKurlar(),
  ]);
  const { kurlar } = kur;
  let kursuz = 0;
  const say = (v: string | null) => {
    if (v === null) kursuz += 1;
    return v;
  };

  const hesaplar: HesapDto[] = hesapSatir.map((h) => {
    const balance = para(h.balance);
    return {
      id: h.id,
      name: h.name,
      kind: h.kind as WalletAccountKind,
      unit: h.unit as WalletUnit,
      balance,
      tl: say(tlKarsiligi(balance, h.unit as WalletUnit, kurlar, 'alis')),
    };
  });

  const borclar: BorcDto[] = borcSatir.map((b) => {
    const unit = b.unit as WalletUnit;
    const remainingAmount = para(b.remainingAmount);
    const totalAmount = para(b.totalAmount);
    const monthlyPayment = b.monthlyPayment === null ? null : para(b.monthlyPayment);
    const endDate = b.endDate ? dateToAppDay(b.endDate) : null;
    return {
      id: b.id,
      name: b.name,
      lender: b.lender,
      unit,
      totalAmount,
      remainingAmount,
      monthlyPayment,
      paymentDay: b.paymentDay,
      endDate,
      note: b.note,
      isClosed: b.isClosed,
      kalanTl: say(tlKarsiligi(remainingAmount, unit, kurlar, 'satis')),
      taksitTl: monthlyPayment === null ? null : tlKarsiligi(monthlyPayment, unit, kurlar, 'satis'),
      odenenYuzde: odenenYuzde(totalAmount, remainingAmount),
      kalanAy: kalanAy(remainingAmount, monthlyPayment, endDate, bugun),
    };
  });

  const akislar: AkisDto[] = akisSatir.map((a) => {
    const unit = a.unit as WalletUnit;
    const amount = para(a.amount);
    const frequency = a.frequency as WalletFrequency;
    const gun = a.date ? dateToAppDay(a.date) : null;
    // Tek seferlik kalem, tarihi BU AY ise bu ayın hesabına girer (2026-10-30).
    const buAy = frequency === 'ONCE' && gun !== null && gun.slice(0, 7) === bugun.slice(0, 7);
    const aylik = buAy ? amount : aylikTutar(amount, frequency);
    return {
      id: a.id,
      kind: a.kind as WalletFlowKind,
      name: a.name,
      counterparty: a.counterparty,
      unit,
      amount,
      frequency: a.frequency as WalletFrequency,
      day: a.day,
      date: a.date ? dateToAppDay(a.date) : null,
      category: a.category,
      note: a.note,
      isActive: a.isActive,
      aylikTl:
        aylik === null
          ? null
          : say(tlKarsiligi(aylik, unit, kurlar, a.kind === 'INCOME' ? 'alis' : 'satis')),
    };
  });

  const bilinen = (v: string | null): v is string => v !== null;
  const topla = (degerler: (string | null)[]) => sumMoney(degerler.filter(bilinen));
  const varlikTl = topla(hesaplar.map((h) => h.tl));
  const borcTl = topla(borclar.map((b) => b.kalanTl));
  // Geçmiş aylara ait tek seferlikler listelere ve toplamlara girmez.
  const buAyMi = (a: AkisDto) => a.date !== null && a.date.slice(0, 7) === bugun.slice(0, 7);
  const gecerli = akislar.filter((a) => a.frequency !== 'ONCE' || buAyMi(a));
  const gelirler = gecerli.filter((a) => a.kind === 'INCOME');
  const giderler = gecerli.filter((a) => a.kind === 'EXPENSE' && a.frequency !== 'ONCE');
  const harcamalar = gecerli
    .filter((a) => a.kind === 'EXPENSE' && a.frequency === 'ONCE')
    .sort((x, y) => (y.date ?? '').localeCompare(x.date ?? ''));
  const aylikGelirTl = topla(gelirler.map((a) => a.aylikTl));
  const atlanan = new Set(onaySatir.map((o) => `${o.kaynakTur}:${o.kaynakId}`));
  const aylikGiderTl = topla(
    [...giderler.filter((g) => !atlanan.has(`AKIS:${g.id}`)), ...harcamalar].map((a) => a.aylikTl),
  );
  const buAyOdemeleri = odemeSatir.filter((o) => dateToAppDay(o.date).slice(0, 7) === buAyKodu);
  const odenen = (borcId: string) =>
    sumMoney(buAyOdemeleri.filter((o) => o.debtId === borcId).map((o) => para(o.amount)));
  const aylikTaksitTl = topla([
    ...buAyOdemeleri.map((o) =>
      tlKarsiligi(para(o.amount), o.debt.unit as WalletUnit, kurlar, 'satis'),
    ),
    ...borclar.map((b) =>
      tlKarsiligi(
        kalanTaksit(b.monthlyPayment, b.remainingAmount, odenen(b.id), atlanan.has(`BORC:${b.id}`)),
        b.unit,
        kurlar,
        'satis',
      ),
    ),
  ]);

  return {
    hesaplar,
    borclar,
    gelirler,
    giderler,
    harcamalar,
    ozet: {
      varlikTl,
      borcTl,
      netTl: subtractMoney(varlikTl, borcTl),
      aylikGelirTl,
      aylikGiderTl,
      harcananTl: topla(harcamalar.map((a) => a.aylikTl)),
      aylikTaksitTl,
      aylikKalanTl: subtractMoney(aylikGelirTl, sumMoney([aylikGiderTl, aylikTaksitTl])),
      kursuzKalem: kursuz,
    },
    kur: { kurlar, guncellendi: kur.guncellendi, bayat: kur.bayat },
  };
}

/** Tek borcun ödemeleri — borç ekranı için. */
export async function fetchDebtPayments(
  debtId: string,
  client: Client = db,
): Promise<{ id: string; date: AppDay; amount: string; note: string | null }[]> {
  const satirlar = await client.walletDebtPayment.findMany({
    where: { debtId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
  return satirlar.map((p) => ({
    id: p.id,
    date: dateToAppDay(p.date),
    amount: para(p.amount),
    note: p.note,
  }));
}

/** Ödemede seçilebilecek hesaplar: arşivsiz ve aynı birimde. */
export async function fetchOdemeHesaplari(
  unit: WalletUnit,
  client: Pick<Client, 'walletAccount'> = db,
): Promise<{ id: string; name: string; unit: WalletUnit; balance: string }[]> {
  const satirlar = await client.walletAccount.findMany({
    where: { isArchived: false, unit },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return satirlar.map((h) => ({
    id: h.id,
    name: h.name,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  }));
}

export interface CuzdanArsivi {
  hesaplar: { id: string; name: string; unit: WalletUnit; balance: string }[];
  borclar: { id: string; name: string; unit: WalletUnit; totalAmount: string }[];
  sonlananlar: {
    id: string;
    name: string;
    unit: WalletUnit;
    amount: string;
    bitis: AppDay | null;
  }[];
  /** Tarihi girilmemiş eski tek seferlik kalemler: hiçbir toplama girmez, düzeltilmeli. */
  tarihsizler: { id: string; name: string; unit: WalletUnit; amount: string }[];
}

/** Ana ekranda görünmeyen ama silinmemiş kayıtlar. */
export async function fetchCuzdanArsivi(
  client: Pick<Client, 'walletAccount' | 'walletDebt' | 'walletFlow'> = db,
): Promise<CuzdanArsivi> {
  const [hesaplar, borclar, sonlananlar, tarihsizler] = await Promise.all([
    client.walletAccount.findMany({
      where: { isArchived: true },
      orderBy: { updatedAt: 'desc' },
    }),
    client.walletDebt.findMany({ where: { isClosed: true }, orderBy: { updatedAt: 'desc' } }),
    client.walletFlow.findMany({
      where: { isActive: false, frequency: { not: 'ONCE' } },
      orderBy: { updatedAt: 'desc' },
    }),
    client.walletFlow.findMany({
      where: { frequency: 'ONCE', date: null },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    hesaplar: hesaplar.map((h) => ({
      id: h.id,
      name: h.name,
      unit: h.unit as WalletUnit,
      balance: para(h.balance),
    })),
    borclar: borclar.map((b) => ({
      id: b.id,
      name: b.name,
      unit: b.unit as WalletUnit,
      totalAmount: para(b.totalAmount),
    })),
    sonlananlar: sonlananlar.map((a) => ({
      id: a.id,
      name: a.name,
      unit: a.unit as WalletUnit,
      amount: para(a.amount),
      bitis: a.bitisGunu ? dateToAppDay(a.bitisGunu) : null,
    })),
    tarihsizler: tarihsizler.map((a) => ({
      id: a.id,
      name: a.name,
      unit: a.unit as WalletUnit,
      amount: para(a.amount),
    })),
  };
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

const bosaNull = (v: string | undefined | null) => (v?.trim() ? v.trim() : null);

export async function createWalletAccount(input: WalletAccountInput, client: Client = db) {
  const sira = await client.walletAccount.count();
  return client.walletAccount.create({
    data: { ...input, order: (sira + 1) * 10 },
    select: { id: true },
  });
}

export async function updateWalletAccount(input: UpdateWalletAccountInput, client: Client = db) {
  const { id, ...alanlar } = input;
  return client.walletAccount.update({ where: { id }, data: alanlar, select: { id: true } });
}

export async function archiveWalletAccount(id: string, client: Client = db) {
  return client.walletAccount.update({
    where: { id },
    data: { isArchived: true },
    select: { id: true },
  });
}

export async function restoreWalletAccount(id: string, client: Client = db) {
  return client.walletAccount.update({
    where: { id },
    data: { isArchived: false },
    select: { id: true },
  });
}

export async function createWalletDebt(input: WalletDebtInput, client: Client = db) {
  return client.walletDebt.create({
    data: {
      name: input.name,
      lender: bosaNull(input.lender),
      unit: input.unit,
      totalAmount: input.totalAmount,
      remainingAmount: input.remainingAmount,
      monthlyPayment: input.monthlyPayment ?? null,
      paymentDay: input.paymentDay ?? null,
      endDate: input.endDate ? appDayToDate(input.endDate) : null,
      note: bosaNull(input.note),
    },
    select: { id: true },
  });
}

export async function updateWalletDebt(input: UpdateWalletDebtInput, client: Client = db) {
  const { id, endDate, ...alanlar } = input;
  return client.walletDebt.update({
    where: { id },
    data: {
      ...alanlar,
      // Kalan elle değişince durum da değişir: düzeltilen borç yeniden açılır.
      ...(alanlar.remainingAmount !== undefined
        ? { isClosed: Number(alanlar.remainingAmount) === 0 }
        : {}),
      ...(endDate !== undefined
        ? { endDate: endDate === null ? null : appDayToDate(endDate) }
        : {}),
    },
    select: { id: true },
  });
}

export async function deleteWalletDebt(id: string, client: Client = db) {
  return client.walletDebt.delete({ where: { id }, select: { id: true } });
}

/** Hesaptan düşer: arşivli hesap, farklı birim ve eksi bakiye reddedilir. */
export async function hesaptanDus(
  hesapId: string,
  unit: WalletUnit,
  tutar: string,
  tx: Pick<Client, 'walletAccount'>,
): Promise<void> {
  const hesap = await tx.walletAccount.findUnique({
    where: { id: hesapId },
    select: { unit: true, balance: true, isArchived: true },
  });
  if (!hesap || hesap.isArchived) throw new OdemeHatasi('Hesap bulunamadı.');
  if (hesap.unit !== unit) throw new OdemeHatasi('Hesabın birimi ödemeyle aynı değil.');
  const kalan = subtractMoney(para(hesap.balance), tutar);
  if (kalan.startsWith('-')) throw new OdemeHatasi('Hesapta yeterli bakiye yok.');
  await tx.walletAccount.update({ where: { id: hesapId }, data: { balance: kalan } });
}

/** Hesaba iade eder; hesap silinmişse iade edilecek yer yoktur. */
export async function hesabaIade(
  hesapId: string,
  tutar: string,
  tx: Pick<Client, 'walletAccount'>,
): Promise<void> {
  const hesap = await tx.walletAccount.findUnique({
    where: { id: hesapId },
    select: { balance: true },
  });
  if (!hesap) return;
  await tx.walletAccount.update({
    where: { id: hesapId },
    data: { balance: sumMoney([para(hesap.balance), tutar]) },
  });
}

/** Silinen ödemeyi kalana geri ekler ve borcu açar; kalan toplamı geçmez. */
export async function borcaGeriEkle(
  debtId: string,
  tutar: string,
  tx: Pick<Client, 'walletDebt'>,
): Promise<void> {
  const borc = await tx.walletDebt.findUnique({
    where: { id: debtId },
    select: { remainingAmount: true, totalAmount: true },
  });
  if (!borc) return;
  const yeni = sumMoney([para(borc.remainingAmount), tutar]);
  const toplam = para(borc.totalAmount);
  await tx.walletDebt.update({
    where: { id: debtId },
    data: { remainingAmount: Number(yeni) > Number(toplam) ? toplam : yeni, isClosed: false },
  });
}

/** Ödemeyi yazar ve kalanı düşürür — çağıranın işlemi içinde (`tx`). */
export async function borcOdemesiYaz(
  input: WalletDebtPaymentInput,
  tx: Pick<Client, 'walletDebt' | 'walletDebtPayment'>,
): Promise<{ remainingAmount: string; isClosed: boolean }> {
  const borc = await tx.walletDebt.findUnique({
    where: { id: input.debtId },
    select: { remainingAmount: true },
  });
  if (!borc) throw new Error('Borç bulunamadı.');
  await tx.walletDebtPayment.create({
    data: {
      debtId: input.debtId,
      date: appDayToDate(input.date),
      amount: input.amount,
      note: bosaNull(input.note),
      hesapId: input.hesapId ?? null,
    },
  });
  const fark = subtractMoney(para(borc.remainingAmount), input.amount);
  const remainingAmount = fark.startsWith('-') ? '0.00' : fark;
  const isClosed = remainingAmount === '0.00';
  await tx.walletDebt.update({
    where: { id: input.debtId },
    data: { remainingAmount, isClosed },
  });
  return { remainingAmount, isClosed };
}

export async function addDebtPayment(
  input: WalletDebtPaymentInput,
  client: Client = db,
): Promise<{ remainingAmount: string; isClosed: boolean }> {
  return client.$transaction(async (tx) => {
    const borc = await tx.walletDebt.findUnique({
      where: { id: input.debtId },
      select: { remainingAmount: true, unit: true },
    });
    if (!borc) throw new OdemeHatasi('Borç bulunamadı.');
    if (Number(input.amount) > Number(para(borc.remainingAmount))) {
      throw new OdemeHatasi('Ödeme kalan borçtan fazla olamaz.');
    }
    if (input.hesapId) {
      await hesaptanDus(input.hesapId, borc.unit as WalletUnit, input.amount, tx);
    }
    return borcOdemesiYaz(input, tx);
  });
}

/**
 * Ödemeyi siler: hesaba iade, kalana geri ekleme ve bağlı aylık onay TEK işlemde.
 * Ödeme onayından gelen eski kayıtlarda hesap yalnızca onay kaydındadır.
 */
export async function deleteDebtPayment(id: string, client: Client = db): Promise<void> {
  await client.$transaction(async (tx) => {
    const odeme = await tx.walletDebtPayment.findUnique({ where: { id } });
    if (!odeme) throw new OdemeHatasi('Ödeme bulunamadı.');
    const tutar = para(odeme.amount);
    const onay = await tx.walletOdeme.findFirst({
      where: {
        kaynakTur: 'BORC',
        kaynakId: odeme.debtId,
        gun: odeme.date,
        tutar: odeme.amount,
        durum: 'ODENDI',
      },
    });
    const hesapId = odeme.hesapId ?? onay?.hesapId ?? null;
    if (hesapId) await hesabaIade(hesapId, tutar, tx);
    await borcaGeriEkle(odeme.debtId, tutar, tx);
    if (onay) await tx.walletOdeme.delete({ where: { id: onay.id } });
    await tx.walletDebtPayment.delete({ where: { id } });
  });
}

export async function createWalletFlow(
  input: WalletFlowInput,
  client: Pick<Client, 'walletFlow'> = db,
) {
  return client.walletFlow.create({
    data: {
      kind: input.kind,
      name: input.name,
      counterparty: bosaNull(input.counterparty),
      unit: input.unit,
      amount: input.amount,
      frequency: input.frequency,
      day: input.day ?? null,
      date: input.date ? appDayToDate(input.date) : null,
      category: bosaNull(input.category),
      note: bosaNull(input.note),
    },
    select: { id: true },
  });
}

export async function updateWalletFlow(input: UpdateWalletFlowInput, client: Client = db) {
  const { id, date, ...alanlar } = input;
  return client.walletFlow.update({
    where: { id },
    data: { ...alanlar, ...(date !== undefined ? { date: date && appDayToDate(date) } : {}) },
    select: { id: true },
  });
}

/** Düzenli kalemi sonlandırır: geçmiş aylar raporda kalır, bu aydan itibaren sayılmaz. */
export async function sonlandirWalletFlow(
  id: string,
  client: Pick<Client, 'walletFlow'> = db,
  bugun: AppDay = appToday(),
) {
  return client.walletFlow.update({
    where: { id },
    data: { isActive: false, bitisGunu: appDayToDate(bugun) },
    select: { id: true },
  });
}

export async function yenidenBaslatWalletFlow(id: string, client: Pick<Client, 'walletFlow'> = db) {
  return client.walletFlow.update({
    where: { id },
    data: { isActive: true, bitisGunu: null },
    select: { id: true },
  });
}

export async function deleteWalletFlow(id: string, client: Client = db) {
  return client.walletFlow.delete({ where: { id }, select: { id: true } });
}

/* ===========================================================================
 * TEKİL OKUMA — düzenleme ekranları
 * ======================================================================== */

export async function fetchWalletAccountById(
  id: string,
  client: Client = db,
): Promise<Omit<HesapDto, 'tl'> | null> {
  const h = await client.walletAccount.findUnique({ where: { id } });
  if (!h || h.isArchived) return null;
  return {
    id: h.id,
    name: h.name,
    kind: h.kind as WalletAccountKind,
    unit: h.unit as WalletUnit,
    balance: para(h.balance),
  };
}

export async function fetchWalletDebtById(
  id: string,
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<Omit<BorcDto, 'kalanTl' | 'taksitTl'> | null> {
  const b = await client.walletDebt.findUnique({ where: { id } });
  if (!b) return null;
  const remainingAmount = para(b.remainingAmount);
  const totalAmount = para(b.totalAmount);
  const monthlyPayment = b.monthlyPayment === null ? null : para(b.monthlyPayment);
  const endDate = b.endDate ? dateToAppDay(b.endDate) : null;
  return {
    id: b.id,
    name: b.name,
    lender: b.lender,
    unit: b.unit as WalletUnit,
    totalAmount,
    remainingAmount,
    monthlyPayment,
    paymentDay: b.paymentDay,
    endDate,
    note: b.note,
    isClosed: b.isClosed,
    odenenYuzde: odenenYuzde(totalAmount, remainingAmount),
    kalanAy: kalanAy(remainingAmount, monthlyPayment, endDate, bugun),
  };
}

export async function fetchWalletFlowById(
  id: string,
  client: Client = db,
): Promise<Omit<AkisDto, 'aylikTl'> | null> {
  const a = await client.walletFlow.findUnique({ where: { id } });
  if (!a) return null;
  return {
    id: a.id,
    kind: a.kind as WalletFlowKind,
    name: a.name,
    counterparty: a.counterparty,
    unit: a.unit as WalletUnit,
    amount: para(a.amount),
    frequency: a.frequency as WalletFrequency,
    day: a.day,
    date: a.date ? dateToAppDay(a.date) : null,
    category: a.category,
    note: a.note,
    isActive: a.isActive,
  };
}

/* ===========================================================================
 * AYLIK BÜTÇE (2026-10-31) — kategori başına limit
 * ======================================================================== */

export interface ButceSatiri {
  kategori: string;
  harcananTl: string;
  /** Limit yoksa `null` — yalnızca harcama gösterilir. */
  limitTl: string | null;
  /** Limitin yüzde kaçı harcandı; limit yoksa `null`. 100'ü geçebilir. */
  yuzde: number | null;
  /** Kalan (eksiyse aşım); limit yoksa `null`. */
  kalanTl: string | null;
}

/**
 * Bu ayın harcamaları + limitler → satırlar; en çok harcanan önce. Kategorisiz
 * harcama "Diğer". Kuru bilinmeyen kalem (`aylikTl` null) toplama GİRMEZ. SAF.
 */
export function butceOzeti(
  harcamalar: readonly Pick<AkisDto, 'category' | 'aylikTl'>[],
  limitler: readonly { kategori: string; limitTl: string }[],
): ButceSatiri[] {
  const gruplar = new Map<string, string[]>();
  for (const h of harcamalar) {
    if (h.aylikTl === null) continue;
    const k = h.category ?? 'Diğer';
    gruplar.set(k, [...(gruplar.get(k) ?? []), h.aylikTl]);
  }
  const limit = new Map(limitler.map((l) => [l.kategori, l.limitTl]));
  return [...new Set([...gruplar.keys(), ...limit.keys()])]
    .map((kategori): ButceSatiri => {
      const harcananTl = sumMoney(gruplar.get(kategori) ?? []);
      const limitTl = limit.get(kategori) ?? null;
      return {
        kategori,
        harcananTl,
        limitTl,
        yuzde:
          limitTl === null || Number(limitTl) === 0
            ? null
            : Math.round((Number(harcananTl) / Number(limitTl)) * 100),
        kalanTl: limitTl === null ? null : subtractMoney(limitTl, harcananTl),
      };
    })
    .sort((a, b) => Number(b.harcananTl) - Number(a.harcananTl));
}

export async function fetchButceLimitleri(
  client: Pick<typeof db, 'walletButce'> = db,
): Promise<{ kategori: string; limitTl: string }[]> {
  const satirlar = await client.walletButce.findMany({ orderBy: { kategori: 'asc' } });
  return satirlar.map((s) => ({ kategori: s.kategori, limitTl: para(s.limitTl) }));
}

/** Limiti koyar; `null` kaldırır. */
export async function butceKoy(
  kategori: string,
  limitTl: string | null,
  client: Pick<typeof db, 'walletButce'> = db,
): Promise<void> {
  if (limitTl === null) {
    await client.walletButce.deleteMany({ where: { kategori } });
    return;
  }
  await client.walletButce.upsert({
    where: { kategori },
    create: { kategori, limitTl },
    update: { limitTl },
  });
}

/** Kuyruktan gelen kaydın kabul edilen en eski yaşı (gün). */
const KUYRUK_EN_ESKI_GUN = 30;

/**
 * Çevrimdışı kuyruğundan gelen gün: gelecek ya da 30 günden eski olamaz (cihaz
 * saati yanlış olabilir) — öyleyse bugün. Gün yoksa bugün. SAF.
 */
export function kuyrukGunu(gun: AppDay | undefined, bugun: AppDay): AppDay {
  if (!gun || gun > bugun || gun < addAppDays(bugun, -KUYRUK_EN_ESKI_GUN)) return bugun;
  return gun;
}
