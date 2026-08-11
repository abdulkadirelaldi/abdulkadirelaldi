import * as z from 'zod';

import { AttachmentEntity } from '@/types';

import { cuidSchema, orderSchema, paginationSchema } from './common';

/**
 * `Attachment` (ADR-018) — R2 nesnesi.
 *
 * `url` ALANI YOKTUR ve şemaya da EKLENMEZ. §8.11 private bucket + 15 dk imzalı
 * URL istiyor; kalıcı URL ya bayat olurdu ya da bucket'ın public olduğu anlamına
 * gelirdi. İmzalı URL istek anında `key`den üretilir.
 */

/** §8.11 — yalnızca izin verilen tipler. Magic byte kontrolü T-015'te ayrıca yapılır. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
] as const;

/** §8.11 — 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const createAttachmentSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, { error: 'Dosya anahtarı zorunludur.' })
    .max(512, { error: 'Dosya anahtarı çok uzun.' }),
  mime: z.enum(ALLOWED_MIME_TYPES, {
    error: 'Bu dosya tipi kabul edilmiyor (JPEG, PNG, WebP, AVIF, SVG, PDF).',
  }),
  size: z
    .number()
    .int({ error: 'Dosya boyutu geçersiz.' })
    .positive({ error: 'Dosya boş olamaz.' })
    .max(MAX_UPLOAD_BYTES, { error: 'Dosya en fazla 10 MB olabilir.' }),
  checksum: z.string().regex(/^[a-f0-9]{64}$/, { error: 'Sağlama toplamı geçersiz.' }),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  entity: z.enum(AttachmentEntity, { error: 'Geçersiz bağlantı türü.' }),
  entityId: cuidSchema,
  order: orderSchema,
});

export const updateAttachmentSchema = z.object({
  id: cuidSchema,
  order: orderSchema.optional(),
  entityId: cuidSchema.optional(),
});

export const attachmentFilterSchema = paginationSchema.extend({
  entity: z.enum(AttachmentEntity).optional(),
  entityId: cuidSchema.optional(),
  mime: z.enum(ALLOWED_MIME_TYPES).optional(),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type UpdateAttachmentInput = z.infer<typeof updateAttachmentSchema>;
export type AttachmentFilterInput = z.infer<typeof attachmentFilterSchema>;
