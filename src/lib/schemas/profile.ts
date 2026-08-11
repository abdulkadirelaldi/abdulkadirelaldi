import * as z from 'zod';

import {
  cuidSchema,
  localeSchema,
  longTextSchema,
  mediumTextSchema,
  optionalUrlSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/**
 * `Profile` (ADR-017) — tekil kayıt, sabit `id: "singleton"`.
 *
 * `socials` SERBEST JSON DEĞİLDİR: aşağıdaki şema onu açıkça bağlar. Serbest
 * bırakılsaydı public sayfada beklenmedik anahtarlar render edilir ve §8.8'in
 * "her girdi doğrulanır" kuralı Json alanının içinde delinmiş olurdu.
 */
export const socialsSchema = z
  .object({
    github: optionalUrlSchema.optional(),
    linkedin: optionalUrlSchema.optional(),
    x: optionalUrlSchema.optional(),
    instagram: optionalUrlSchema.optional(),
    youtube: optionalUrlSchema.optional(),
    website: optionalUrlSchema.optional(),
    email: z.email({ error: 'Geçerli bir e-posta adresi girin.' }).optional(),
  })
  // Bilinmeyen anahtar sessizce düşmez, HATA verir — yazım hatası fark edilsin.
  .strict();

const profileBase = z.object({
  locale: localeSchema,
  headline: shortTextSchema.min(1, { error: 'Başlık zorunludur.' }),
  subtitle: shortTextSchema.optional(),
  bio: longTextSchema.min(1, { error: 'Biyografi zorunludur.' }),
  location: shortTextSchema.optional(),
  availability: mediumTextSchema.optional(),
  socials: socialsSchema.optional(),
  avatarAttachmentId: cuidSchema.optional(),
  cvAttachmentId: cuidSchema.optional(),
});

export const createProfileSchema = profileBase;
export const updateProfileSchema = partialWithoutDefaults(profileBase);

export const profileFilterSchema = z.object({
  locale: z.string().optional(),
});

export type Socials = z.infer<typeof socialsSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileFilterInput = z.infer<typeof profileFilterSchema>;
