import * as z from 'zod';

import {
  booleanFilterSchema,
  cuidSchema,
  emailSchema,
  mediumTextSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
} from './common';

/**
 * `Client` — müşteri (ADR-017).
 *
 * `email` benzersizdir: mesajdan otomatik müşteri açma `upsert` ile çalışır,
 * yoksa aynı kişi her mesajda yeniden oluşur ve müşteri bazlı muhasebe bozulur.
 *
 * SİLME YOKTUR — `isArchived` ile arşivlenir. Bağlı FK'ler `onDelete: Restrict`;
 * Frontend "silinemiyor" durumunu arşivleme akışıyla karşılamak zorundadır.
 */
const clientBase = z.object({
  name: shortTextSchema.min(1, { error: 'Müşteri adı zorunludur.' }),
  company: shortTextSchema.optional(),
  email: emailSchema.optional(),
  phone: z
    .string()
    .trim()
    .max(32, { error: 'Telefon numarası çok uzun.' })
    .regex(/^[0-9+()\s-]*$/, { error: 'Telefon numarası geçersiz.' })
    .optional(),
  notes: mediumTextSchema.optional(),
  isKiyiMedya: z.boolean().default(false),
  /**
   * T-117 — logo şeridinde göster. VARSAYILAN KAPALI: bir müşteriyi herkese
   * açmak bilinçli bir işaret olmalı. Açıksa public'e YALNIZCA ad + logo çıkar.
   */
  showOnSite: z.boolean().default(false),
  /** T-117 — logo eklentisi (entity CLIENT). Varlığı `attachment-refs`te doğrulanıyor. */
  logoAttachmentId: cuidSchema.optional(),
});

export const createClientSchema = clientBase;
export const updateClientSchema = partialWithoutDefaults(clientBase).extend({
  id: cuidSchema,
  // Logo KALDIRILABİLİR: `null` = temizle (güncellemede "boşalt" kuralı).
  logoAttachmentId: clientBase.shape.logoAttachmentId.nullable(),
});

/** Referans veri arşivleme (ADR-017) — hard delete yerine bu kullanılır. */
export const archiveClientSchema = z.object({
  id: cuidSchema,
  isArchived: z.boolean(),
});

export const clientFilterSchema = paginationSchema.extend({
  isArchived: booleanFilterSchema.optional(),
  isKiyiMedya: booleanFilterSchema.optional(),
  q: searchSchema.optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ArchiveClientInput = z.infer<typeof archiveClientSchema>;
export type ClientFilterInput = z.infer<typeof clientFilterSchema>;
