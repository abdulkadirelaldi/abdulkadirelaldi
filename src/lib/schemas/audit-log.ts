import * as z from 'zod';

import { AuditAction } from '@/types';

import { cuidSchema, paginationSchema, shortTextSchema, sortDirectionSchema } from './common';

/**
 * `AuditLog` (§8.19, ADR-020) — tüm panel mutasyonları buraya yazılır.
 *
 * `diff` alanı ALAN ADI BAZLI REDAKSİYONDAN geçmiş olmalıdır (§8.20).
 * Redaksiyon T-015'teki yardımcının işidir; bu şema `diff`'i doğrulayamaz
 * (şekli varlığa göre değişir) ama redakte edilecek alan adlarını
 * SÖZLEŞME OLARAK burada yayınlar — tek liste, iki yerde tutulmaz.
 */

/** §8.20 — bu adları taşıyan her alan `diff` içinde maskelenir. */
export const REDACTED_FIELD_NAMES = [
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'totpSecret',
  'totpBackupCodes',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'email',
] as const;

export type RedactedFieldName = (typeof REDACTED_FIELD_NAMES)[number];

/**
 * `diff` serbest şekillidir çünkü her varlık için farklıdır.
 * `z.unknown()` GEREKÇESİ: burada şekli bilmek mümkün değil ve `any` yasak (§2).
 * Güvenlik, şekil doğrulamasıyla değil REDAKSİYONLA sağlanır.
 */
export const auditDiffSchema = z.record(z.string(), z.unknown());

export const createAuditLogSchema = z.object({
  actorId: cuidSchema.optional(),
  actorEmailHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  action: z.enum(AuditAction, { error: 'Geçersiz denetim eylemi.' }),
  entity: shortTextSchema.min(1, { error: 'Varlık adı zorunludur.' }),
  entityId: cuidSchema.optional(),
  diff: auditDiffSchema.optional(),
  ip: z.string().trim().max(64).optional(),
  userAgent: z.string().trim().max(512).optional(),
});

/** Denetim kaydı değiştirilemez. Güncelleme şeması bilerek boştur. */
export const updateAuditLogSchema = z.object({});

export const auditLogFilterSchema = paginationSchema.extend({
  action: z.enum(AuditAction).optional(),
  entity: shortTextSchema.optional(),
  entityId: cuidSchema.optional(),
  actorId: cuidSchema.optional(),
  sort: sortDirectionSchema,
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type UpdateAuditLogInput = z.infer<typeof updateAuditLogSchema>;
export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;
