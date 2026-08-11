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
  contactMessageId: cuidSchema.optional(),
  startDate: dayDateSchema.optional(),
  dueDate: dayDateSchema.optional(),
  deliveredAt: z.iso.datetime({ error: 'Teslim anı ISO 8601 biçiminde olmalıdır.' }).optional(),
  /** BRÜT anlaşma tutarı (ADR-014). */
  agreedAmount: moneySchema.optional(),
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
