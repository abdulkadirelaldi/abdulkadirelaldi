import * as z from 'zod';

import { Currency, PaymentMethod, TransactionType } from '@/types';

import {
  booleanFilterSchema,
  cuidSchema,
  dayDateSchema,
  mediumTextSchema,
  moneySchema,
  paginationSchema,
  partialWithoutDefaults,
} from './common';

/**
 * `RecurringTransaction` — tekrarlayan işlem ŞABLONU (ADR-015).
 *
 * Şablon bir KURAL, üretilen kayıt bir OLAYDIR. Bu yüzden ayrı modeldir ve
 * `fxRate`/`baseAmount` TAŞIMAZ: kur üretim anına aittir. Şablona kur konsaydı
 * aylar sonra üretilen kayıt eski kurla yazılırdı.
 *
 * `nextRunAt` ve `lastGeneratedAt` istemciden ALINMAZ — üretim işi yönetir.
 */

/** Basit tekrar kuralı. v1'de dört sıklık desteklenir (ADR-015 periodKey ile hizalı). */
export const recurrenceRuleSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
  error: 'Geçersiz tekrar sıklığı.',
});

const START_BEFORE_END = {
  error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
  path: ['endDate'],
};

const recurringBase = z.object({
  type: z.enum(TransactionType, { error: 'Geçersiz işlem türü.' }),
  amount: moneySchema,
  currency: z.enum(Currency, { error: 'Geçersiz para birimi.' }).default('TRY'),
  categoryId: cuidSchema,
  description: mediumTextSchema.optional(),
  method: z.enum(PaymentMethod, { error: 'Geçersiz ödeme yöntemi.' }).default('BANK_TRANSFER'),
  recurrenceRule: recurrenceRuleSchema,
  startDate: dayDateSchema,
  endDate: dayDateSchema.optional(),
  isActive: z.boolean().default(true),
});

export const createRecurringTransactionSchema = recurringBase.refine(
  (value) => !value.endDate || value.startDate <= value.endDate,
  START_BEFORE_END,
);

export const updateRecurringTransactionSchema = partialWithoutDefaults(recurringBase)
  .extend({ id: cuidSchema })
  .refine(
    (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
    START_BEFORE_END,
  );

export const recurringTransactionFilterSchema = paginationSchema.extend({
  type: z.enum(TransactionType).optional(),
  categoryId: cuidSchema.optional(),
  isActive: booleanFilterSchema.optional(),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;
export type RecurringTransactionFilterInput = z.infer<typeof recurringTransactionFilterSchema>;
