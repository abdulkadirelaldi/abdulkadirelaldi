import * as z from 'zod';

import { TransactionType } from '@/types';

import { cuidSchema, paginationSchema, partialWithoutDefaults, shortTextSchema } from './common';

/**
 * `TransactionCategory` (ADR-017) — referans veri.
 * Silinmez, arşivlenir; bağlı `Transaction` FK'si `onDelete: Restrict`.
 */
const categoryBase = z.object({
  name: shortTextSchema.min(1, { error: 'Kategori adı zorunludur.' }),
  type: z.enum(TransactionType, { error: 'Geçersiz kategori türü.' }),
  /** Panel grafiklerinde kullanılır; §3.1 gereği token dışı renk yalnızca VERİDİR. */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Renk #RRGGBB biçiminde olmalıdır.' })
    .optional(),
  icon: shortTextSchema.optional(),
});

export const createTransactionCategorySchema = categoryBase;
export const updateTransactionCategorySchema = partialWithoutDefaults(categoryBase).extend({
  id: cuidSchema,
});

export const archiveTransactionCategorySchema = z.object({
  id: cuidSchema,
  isArchived: z.boolean(),
});

export const transactionCategoryFilterSchema = paginationSchema.extend({
  type: z.enum(TransactionType).optional(),
  isArchived: z.coerce.boolean().optional(),
});

export type CreateTransactionCategoryInput = z.infer<typeof createTransactionCategorySchema>;
export type UpdateTransactionCategoryInput = z.infer<typeof updateTransactionCategorySchema>;
export type ArchiveTransactionCategoryInput = z.infer<typeof archiveTransactionCategorySchema>;
export type TransactionCategoryFilterInput = z.infer<typeof transactionCategoryFilterSchema>;
