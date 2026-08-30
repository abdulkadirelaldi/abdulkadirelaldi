import * as z from 'zod';

import {
  cuidSchema,
  emailSchema,
  longTextSchema,
  paginationSchema,
  searchSchema,
  serverInterpreted,
  shortTextSchema,
  toFormSchema,
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
  /**
   * Honeypot (§8.15). KURALI SUNUCU KOYAR — bu yüzden burada `.max(0)` YOK.
   *
   * T-026b'de ölçüldü: `.max(0)` istemcide koşunca dolu honeypot bir doğrulama
   * hatasına dönüşüyor ve `handleSubmit` hiç tetiklenmiyordu — gönderim sunucuya
   * ULAŞMIYOR, spam sinyali kaydedilmiyor (ADR-020/C11 deliniyor) ve yanlış
   * pozitifte gerçek kullanıcı "Gönder"e basınca hiçbir şey olmuyordu.
   *
   * Doğru kural Zod'la İFADE EDİLEMEZ zaten: "dolu gelirse REDDET" değil,
   * "dolu gelirse işaretle ve YİNE KABUL ET". Zod'un elindeki tek sonuç
   * reddetmek. Bu yüzden alan `serverInterpreted` ile işaretli ve karar
   * `route.ts`'te (`assessContactSpam`).
   */
  website: serverInterpreted(
    z.string().optional(),
    'Honeypot — dolu gelirse sunucu spamScore yazar ve mesajı YİNE kaydeder (§8.15, ADR-020/C11). Reddetmez.',
  ),
});

/**
 * İSTEMCİ FORMUNUN KULLANACAĞI ŞEMA. `zodResolver`a BU verilir.
 *
 * `createContactMessageSchema` sunucunun şemasıdır; istemcide koşturulursa
 * honeypot alanı formu kilitler (yukarı bakınız). Ayrım `toFormSchema` ile
 * TÜRETİLİYOR, elle yazılmıyor — iki liste birbirinden sapamaz.
 */
export const contactMessageFormSchema = toFormSchema(createContactMessageSchema);

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
