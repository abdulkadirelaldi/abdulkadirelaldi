import * as z from 'zod';

import { Currency, JobStatus } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  fxRateSchema,
  mediumTextSchema,
  moneySchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
} from './common';

/**
 * `Job` — iş kartı (§4.2 kanban, ADR-017 beş kolon).
 *
 * BU ŞEMADA BİLEREK OLMAYANLAR:
 *  - `baseAmount` → İSTEMCİDEN ALINMAZ, sunucuda `agreedAmount × fxRate`.
 *  - `paidAmount` / `remainingAmount` → sütun değil (ADR-014); bağlı
 *    `Transaction.baseAmount` toplamından türetilir. Tek doğruluk kaynağı.
 *  - KDV / stopaj → v1 kapsamı dışı (ADR-014). `agreedAmount` BRÜT tutardır.
 */
function isFxRateConsistent(value: { currency?: Currency; fxRate?: string }): boolean {
  if (!value.currency || value.fxRate === undefined) return true;
  const rate = Number(value.fxRate);
  return value.currency === 'TRY' ? rate === 1 : rate !== 1;
}

const FX_RATE_RULE = {
  error:
    'Kur, para birimiyle tutarsız: TRY işlerde kur 1.0 olmalı, diğer para birimlerinde 1.0 olamaz.',
  path: ['fxRate'],
};

const DUE_AFTER_START = {
  error: 'Teslim tarihi, başlangıç tarihinden önce olamaz.',
  path: ['dueDate'],
};

const jobBase = z.object({
  title: shortTextSchema.min(1, { error: 'İş başlığı zorunludur.' }),
  description: mediumTextSchema.optional(),
  status: z.enum(JobStatus, { error: 'Geçersiz iş durumu.' }).default('LEAD'),
  clientId: cuidSchema.optional(),
  /*
   * ⚠️ `contactMessageId` BU ŞEMADA YOK — T-106'da ÇIKARILDI.
   *
   * Opsiyonel bir alan olarak duruyordu ve HİÇBİR YAZMA YOLU ONU
   * ONURLANDIRMIYORDU: `createJob` da `updateJob` da bilerek yoksayıyor, çünkü
   * `Job.contactMessageId @unique` dönüşüm korumasının GERÇEK güvencesidir
   * (T-038). Elle doldurulabilseydi bir mesaj "rezerve edilip" gerçek dönüşüm
   * kalıcı olarak engellenebilirdi — kullanıcı CONFLICT alır ve sebebini
   * anlayamaz.
   *
   * `serverInterpreted` ile işaretlemek YANLIŞ ARAÇ olurdu: o konvansiyon
   * kuralını SUNUCUNUN YORUMLADIĞI alanlar içindir (honeypot gibi: "kabul et ve
   * işaretle"). Burada sunucu alanı yorumlamıyor, TAMAMEN YOKSAYIYOR — işaret
   * koymak "sunucu bunu hallediyor" diye bir şey söylerdi ve o bir yalan olurdu.
   * Alan basitçe bu işlemin girdisi değil.
   *
   * Alanın MEŞRU yazarı tek: `convertMessageToJobSchema` (aşağıda) ve o şema
   * ayrı duruyor, yani çıkarmak hiçbir şeyi kırmıyor.
   */
  startDate: dayDateSchema.optional(),
  dueDate: dayDateSchema.optional(),
  deliveredAt: z.iso.datetime({ error: 'Teslim anı ISO 8601 biçiminde olmalıdır.' }).optional(),
  /**
   * BRÜT anlaşma tutarı (ADR-014).
   *
   * ═══════════════════════════════════════════════════════════════════════════
   * ⚠️ `.nullable()` — "TUTARI SİLDİM" İFADE EDİLEBİLİR OLSUN (T-106)
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * `moneySchema.optional()` yalnızca `string | undefined` veriyordu ve
   * `partialWithoutDefaults`ten geçen `updateJobSchema`da `undefined` "BU ALANA
   * DOKUNMA" anlamına geliyor (T-031 konvansiyonu). Sonuç: bir işin tutarı
   * GİRİLDİKTEN SONRA GERİ ALINAMIYORDU — T-103 iş formunda "tutarı sil"
   * düğmesini bu yüzden yazamadı.
   *
   * `.nullable().optional()` ile üç durum AYRI AYRI ifade edilebiliyor ve bu
   * tam olarak T-031'in belgelenmiş `undefined ≠ null` kuralı:
   *
   *   alan gönderilmedi (`undefined`) → DOKUNMA
   *   `null` gönderildi               → TEMİZLE (tutar artık bilinmiyor)
   *   dize gönderildi                 → o değere ayarla
   *
   * ⚠️ TEMİZLEME `baseAmount`I DA NULL'A ÇEKER ve bu zorunlu: ADR-014'ün kuralı
   * "`agreedAmount` null ise `baseAmount` da null" (`deriveBaseAmount`). Tutarı
   * silip TRY karşılığını bırakmak, kaydı kendi içinde tutarsız yapardı — ve
   * `LEAD` aşamasına dönen bir işin `baseAmount`ı 85.000 kalsaydı raporlar onu
   * saymaya devam ederdi. `tests/unit/services/is-musteri.test.ts` ölçüyor.
   */
  agreedAmount: moneySchema.nullable().optional(),
  currency: z.enum(Currency, { error: 'Geçersiz para birimi.' }).default('TRY'),
  fxRate: fxRateSchema.default('1'),
});

export const createJobSchema = jobBase
  .refine(isFxRateConsistent, FX_RATE_RULE)
  .refine(
    (value) => !value.startDate || !value.dueDate || value.startDate <= value.dueDate,
    DUE_AFTER_START,
  );

export const updateJobSchema = partialWithoutDefaults(jobBase)
  .extend({ id: cuidSchema })
  .refine(isFxRateConsistent, FX_RATE_RULE)
  .refine(
    (value) => !value.startDate || !value.dueDate || value.startDate <= value.dueDate,
    DUE_AFTER_START,
  );

/** §4.2 — kanban'da kart sürüklendiğinde yalnızca durum değişir. */
export const changeJobStatusSchema = z.object({
  id: cuidSchema,
  status: z.enum(JobStatus, { error: 'Geçersiz iş durumu.' }),
});

/** §6 — gelen mesajdan tek tıkla iş kartı + müşteri (upsert) oluşturma. */
export const convertMessageToJobSchema = z.object({
  contactMessageId: cuidSchema,
  title: shortTextSchema.min(1, { error: 'İş başlığı zorunludur.' }),
});

export const jobFilterSchema = paginationSchema.extend({
  status: z.enum(JobStatus).optional(),
  clientId: cuidSchema.optional(),
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
  q: searchSchema.optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ChangeJobStatusInput = z.infer<typeof changeJobStatusSchema>;
export type ConvertMessageToJobInput = z.infer<typeof convertMessageToJobSchema>;
export type JobFilterInput = z.infer<typeof jobFilterSchema>;
