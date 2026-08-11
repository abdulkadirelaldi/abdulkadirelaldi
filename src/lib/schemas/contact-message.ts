import * as z from 'zod';

import {
  cuidSchema,
  emailSchema,
  longTextSchema,
  paginationSchema,
  searchSchema,
  shortTextSchema,
} from './common';

/**
 * `ContactMessage` (§4.1 /iletisim, ADR-020).
 *
 * `convertedJobId` YOKTUR — tek yön `Job.contactMessageId` (ADR-017).
 * `ip`, `isSpam`, `spamScore`, `honeypotHit` istemciden ALINMAZ; sunucuda
 * belirlenir. Bu yüzden public form şeması ile panel şeması AYRIDIR.
 */

/**
 * Public iletişim formu — ziyaretçinin gönderdiği alanlar.
 *
 * `website` bir HONEYPOT alanıdır (§8.15): gerçek kullanıcı görmez ve doldurmaz,
 * botlar doldurur. Dolu gelirse mesaj `honeypotHit` ile işaretlenir — SİLİNMEZ,
 * ayrılır (yanlış pozitifte gerçek müşteri kaybedilmesin).
 */
export const createContactMessageSchema = z.object({
  name: shortTextSchema.min(2, { error: 'Adınızı girin.' }),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(32, { error: 'Telefon numarası çok uzun.' })
    .regex(/^[0-9+()\s-]*$/, { error: 'Telefon numarası geçersiz.' })
    .optional(),
  subject: shortTextSchema.optional(),
  message: longTextSchema
    .min(10, { error: 'Mesajınız en az 10 karakter olmalıdır.' })
    .max(5000, { error: 'Mesajınız en fazla 5000 karakter olabilir.' }),
  sourcePage: shortTextSchema.optional(),
  /** Honeypot — BOŞ gelmeli. Dolu gelirse sunucu spam olarak işaretler. */
  website: z.string().max(0, { error: 'Doğrulama başarısız.' }).optional(),
});

/** Panelden yapılabilecek tek şey mesajın durumunu değiştirmektir; içeriği değişmez. */
export const updateContactMessageSchema = z.object({
  id: cuidSchema,
  isRead: z.boolean().optional(),
  isSpam: z.boolean().optional(),
  repliedAt: z.iso.datetime().nullable().optional(),
  archivedAt: z.iso.datetime().nullable().optional(),
});

export const contactMessageFilterSchema = paginationSchema.extend({
  isRead: z.coerce.boolean().optional(),
  isSpam: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  q: searchSchema.optional(),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>;
export type UpdateContactMessageInput = z.infer<typeof updateContactMessageSchema>;
export type ContactMessageFilterInput = z.infer<typeof contactMessageFilterSchema>;
