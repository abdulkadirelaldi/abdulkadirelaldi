import { db } from '@/server/db';

import { dateToAppDay, toMeasureString } from './_shared';
import { gunDurumu } from './habit-gun';

/**
 * VERİYİ DIŞA AKTARMA (2026-10-31) — Cüzdan, Sağlık, Alışkanlık → CSV.
 *
 * EXCEL TÜRKÇE İÇİN: UTF-8 BOM (yoksa ç/ğ/ş bozuk görünür), `;` ayırıcı ve
 * VİRGÜLLÜ ondalık — TR bölgesel ayarlı Excel çift tıklamada sütunları ve
 * sayıları doğru açar. Tutarlar metinden yazılır, sayıya çevrilmez (ADR-014/D).
 */

export type DisaAktarTuru = 'cuzdan' | 'saglik' | 'aliskanlik';

/** Tek hücre: `;`, tırnak ya da satır sonu varsa tırnaklanır. SAF. */
function csvHucre(deger: string | number | boolean | null | undefined): string {
  if (deger === null || deger === undefined) return '';
  const metin = typeof deger === 'boolean' ? (deger ? 'evet' : 'hayır') : String(deger);
  // Formül enjeksiyonu: =, +, -, @ ile başlayan metin Excel'de formül olur.
  const guvenli = /^[=+\-@\t\r]/.test(metin) && !/^-?\d+(,\d+)?$/.test(metin) ? `'${metin}` : metin;
  return /[;"\n\r]/.test(guvenli) ? `"${guvenli.replace(/"/g, '""')}"` : guvenli;
}

/** Ondalık metin → Excel TR biçimi (`"1250.50"` → `"1250,50"`). SAF. */
export const ondalik = (deger: string | null | undefined): string | null =>
  deger ? deger.replace('.', ',') : null;

/** Satırlar → CSV (BOM + `;` + CRLF). SAF. */
export function csv(baslik: string[], satirlar: (string | number | boolean | null)[][]): string {
  const satir = (s: (string | number | boolean | null)[]) => s.map(csvHucre).join(';');
  return '﻿' + [baslik, ...satirlar].map(satir).join('\r\n') + '\r\n';
}

async function cuzdanCsv(): Promise<string> {
  const [hesaplar, borclar, akislar] = await Promise.all([
    db.walletAccount.findMany({ where: { isArchived: false }, orderBy: { createdAt: 'asc' } }),
    db.walletDebt.findMany({ orderBy: { createdAt: 'asc' } }),
    db.walletFlow.findMany({ orderBy: [{ date: 'desc' }, { createdAt: 'asc' }] }),
  ]);
  const para = (d: unknown) => ondalik(toMeasureString(d as never, 2));
  return csv(
    [
      'Bölüm',
      'Ad',
      'Kime/Kimden',
      'Tutar',
      'Kalan',
      'Aylık taksit',
      'Birim',
      'Sıklık',
      'Gün',
      'Tarih',
      'Kategori',
      'Not',
    ],
    [
      ...hesaplar.map((h) => [
        'Hesap',
        h.name,
        null,
        para(h.balance),
        null,
        null,
        h.unit,
        null,
        null,
        null,
        h.kind,
        null,
      ]),
      ...borclar.map((b) => [
        b.isClosed ? 'Borç (kapandı)' : 'Borç',
        b.name,
        b.lender,
        para(b.totalAmount),
        para(b.remainingAmount),
        para(b.monthlyPayment),
        b.unit,
        null,
        b.paymentDay,
        b.endDate ? dateToAppDay(b.endDate) : null,
        null,
        b.note,
      ]),
      ...akislar.map((a) => [
        a.kind === 'INCOME' ? 'Gelir' : 'Gider',
        a.name,
        a.counterparty,
        para(a.amount),
        null,
        null,
        a.unit,
        a.frequency,
        a.day,
        a.date ? dateToAppDay(a.date) : null,
        a.category,
        a.note,
      ]),
    ],
  );
}

async function saglikCsv(): Promise<string> {
  const kayitlar = await db.healthLog.findMany({ orderBy: { date: 'asc' } });
  const o = (d: unknown, olcek: number) => ondalik(toMeasureString(d as never, olcek));
  return csv(
    [
      'Gün',
      'Kilo',
      'Yağ %',
      'BMI',
      'Su %',
      'Kas kg',
      'Kemik kg',
      'Protein %',
      'İç yağ',
      'Deri altı yağ %',
      'İskelet kası %',
      'Bazal metab.',
      'Metabolik yaş',
      'Uyku sa',
      'Su ml',
      'Nabız',
      'Adım',
      'Ruh hâli',
      'Not',
    ],
    kayitlar.map((k) => [
      dateToAppDay(k.date),
      o(k.weightKg, 2),
      o(k.bodyFatPct, 1),
      o(k.bmi, 1),
      o(k.waterPct, 1),
      o(k.muscleKg, 2),
      o(k.boneKg, 2),
      o(k.proteinPct, 1),
      o(k.visceralFat, 1),
      o(k.subcutaneousFatPct, 1),
      o(k.skeletalMusclePct, 1),
      k.bmrKcal,
      k.metabolicAge,
      o(k.sleepHours, 2),
      k.waterMl,
      k.restingHr,
      k.steps,
      k.mood,
      k.note,
    ]),
  );
}

const DURUM_METNI = {
  YAPILDI: 'yapıldı',
  EKSIK: 'eksik',
  YAPILMADI: 'yapılmadı',
  ISARETSIZ: '',
} as const;

async function aliskanlikCsv(): Promise<string> {
  const isaretler = await db.habitLog.findMany({
    orderBy: [{ date: 'asc' }],
    select: {
      date: true,
      count: true,
      missed: true,
      habit: { select: { name: true, targetPerDay: true } },
    },
  });
  return csv(
    ['Gün', 'Alışkanlık', 'Sayı', 'Hedef', 'Durum'],
    isaretler.map((i) => [
      dateToAppDay(i.date),
      i.habit.name,
      i.count,
      i.habit.targetPerDay ?? 1,
      DURUM_METNI[gunDurumu(i.count, i.missed, i.habit.targetPerDay)],
    ]),
  );
}

export async function disaAktar(tur: DisaAktarTuru): Promise<string> {
  if (tur === 'cuzdan') return cuzdanCsv();
  if (tur === 'saglik') return saglikCsv();
  return aliskanlikCsv();
}
