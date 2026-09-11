import * as z from 'zod';

import { Currency, PaymentMethod, TransactionType } from '@/types';

import {
  booleanFilterSchema,
  cuidSchema,
  dayDateSchema,
  fxRateSchema,
  mediumTextSchema,
  moneySchema,
  paginationSchema,
  partialWithoutDefaults,
  periodKeySchema,
  searchSchema,
  shortTextSchema,
  sortDirectionSchema,
} from './common';

/**
 * `Transaction` — gerçekleşmiş para hareketi (ADR-014, ADR-015, ADR-016).
 *
 * BU ŞEMADA BİLEREK OLMAYANLAR:
 *  - `baseAmount`  → İSTEMCİDEN ALINMAZ. Sunucuda `amount × fxRate` ile hesaplanır.
 *                    İstemciden gelen bir toplama asla güvenilmez; güvenilseydi
 *                    tarayıcı konsolundan gelir tablosu değiştirilebilirdi.
 *  - `isRecurring`, `recurrenceRule` → şablon ayrı modelde (ADR-015).
 *  - `attachmentId` → ekler polimorfik `Attachment` üzerinden (ADR-018).
 *  - `sourceRecurringId`, `periodKey` → yalnızca cron üretimi doldurur; panel
 *                    formundan gelmez. Ayrı bir şemada (aşağıda) bağlanmıştır.
 */

/**
 * ÇAPRAZ DOĞRULAMA (ADR-014) — para birimi ile kur tutarlılığı.
 *
 * TRY işlemde kur 1.0 olmak ZORUNDA; başka bir değer `baseAmount` hesabını
 * sessizce bozar. TRY dışı işlemde kur 1.0 OLAMAZ — 1.0 bırakılırsa yabancı para
 * tutarı TRY sanılır ve aylık toplam yanlış çıkar. Her iki yön de kontrol edilir.
 */
function isFxRateConsistent(value: { currency?: Currency; fxRate?: string }): boolean {
  if (!value.currency || value.fxRate === undefined) return true;
  const rate = Number(value.fxRate);
  return value.currency === 'TRY' ? rate === 1 : rate !== 1;
}

const FX_RATE_RULE = {
  error:
    'Kur, para birimiyle tutarsız: TRY işlemlerde kur 1.0 olmalı, diğer para birimlerinde 1.0 olamaz.',
  path: ['fxRate'],
};

const transactionBase = z.object({
  type: z.enum(TransactionType, { error: 'Geçersiz işlem türü.' }),
  amount: moneySchema,
  currency: z.enum(Currency, { error: 'Geçersiz para birimi.' }).default('TRY'),
  /** İşlem anındaki kur, TRY bazlı. TRY'de 1.0 (ADR-014). */
  fxRate: fxRateSchema.default('1'),
  /** Gün semantiği — saat bileşeni kabul edilmez (ADR-016). */
  date: dayDateSchema,
  categoryId: cuidSchema,
  jobId: cuidSchema.optional(),
  clientId: cuidSchema.optional(),
  description: mediumTextSchema.optional(),
  method: z.enum(PaymentMethod, { error: 'Geçersiz ödeme yöntemi.' }).default('BANK_TRANSFER'),
  isPaid: z.boolean().default(true),
  paidAt: z.iso.datetime({ error: 'Ödeme tarihi ISO 8601 biçiminde olmalıdır.' }).optional(),
  invoiceNo: shortTextSchema.optional(),
});

export const createTransactionSchema = transactionBase.refine(isFxRateConsistent, FX_RATE_RULE);

export const updateTransactionSchema = partialWithoutDefaults(transactionBase)
  .extend({ id: cuidSchema })
  .refine(isFxRateConsistent, FX_RATE_RULE);

/**
 * Cron'un tekrarlayan şablondan ürettiği kayıt (ADR-015).
 * Panel formundan ERİŞİLEMEZ; yalnızca üretim işi kullanır.
 * `@@unique([sourceRecurringId, periodKey])` ile idempotanslık DB düzeyinde.
 */
export const createGeneratedTransactionSchema = transactionBase
  .extend({
    sourceRecurringId: cuidSchema,
    periodKey: periodKeySchema,
  })
  .refine(isFxRateConsistent, FX_RATE_RULE);

export const transactionFilterSchema = paginationSchema.extend({
  type: z.enum(TransactionType).optional(),
  currency: z.enum(Currency).optional(),
  method: z.enum(PaymentMethod).optional(),
  categoryId: cuidSchema.optional(),
  jobId: cuidSchema.optional(),
  clientId: cuidSchema.optional(),
  isPaid: booleanFilterSchema.optional(),
  /** Gün aralığı — `@db.Date` alanına uygulanır (ADR-016). */
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
  q: searchSchema.optional(),
  sort: sortDirectionSchema,
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateGeneratedTransactionInput = z.infer<typeof createGeneratedTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
