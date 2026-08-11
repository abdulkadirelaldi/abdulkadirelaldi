import * as z from 'zod';

import { cuidSchema, emailSchema, shortTextSchema } from './common';

/**
 * `User` — tek kullanıcı (§1.B), Auth.js v5 + Credentials + TOTP (ADR-013).
 *
 * DİKKAT: Bu şemalar HAM SIR KABUL ETMEZ ve ETMEMELİDİR.
 * `passwordHash`, `totpSecret`, `totpBackupCodes` alanları burada YOKTUR —
 * hash'leme (argon2id) ve şifreleme (TOTP_ENCRYPTION_KEY) T-013'te auth
 * katmanında yapılır. Şema düz şifreyi alır, hash'i değil.
 */

/** §8.2 — argon2id ile hash'lenecek düz şifre. Uzunluk tek gerçek koruma. */
export const passwordSchema = z
  .string()
  .min(12, { error: 'Şifre en az 12 karakter olmalıdır.' })
  .max(128, { error: 'Şifre en fazla 128 karakter olabilir.' });

/** 6 haneli TOTP kodu (§8.1). */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'Doğrulama kodu 6 haneli olmalıdır.' });

/** Kurtarma kodu (ADR-013). Tek kullanımlıktır, argon2id ile hash'li saklanır. */
export const totpBackupCodeSchema = z
  .string()
  .trim()
  .min(8, { error: 'Kurtarma kodu geçersiz.' })
  .max(64, { error: 'Kurtarma kodu geçersiz.' });

export const createUserSchema = z.object({
  email: emailSchema,
  name: shortTextSchema.min(1, { error: 'Ad zorunludur.' }),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  id: cuidSchema,
  email: emailSchema.optional(),
  name: shortTextSchema.min(1, { error: 'Ad zorunludur.' }).optional(),
});

/** Şifre değiştirme — mevcut şifre zorunlu, yeni şifre iki kez. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Mevcut şifre zorunludur.' }),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((value) => value.newPassword === value.newPasswordConfirm, {
    error: 'Şifreler eşleşmiyor.',
    path: ['newPasswordConfirm'],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    error: 'Yeni şifre mevcut şifreyle aynı olamaz.',
    path: ['newPassword'],
  });

/**
 * Giriş formundaki ikinci adım kodu — TOTP **veya** kurtarma kodu (ADR-013).
 *
 * TEK ALAN, İKİ BİÇİM: kullanıcı telefonundaki 6 haneli kodu da, kâğıda yazdığı
 * `ABCDE-FGHIJ` kurtarma kodunu da aynı kutuya yazar. Ayrı alan istemek,
 * telefonunu kaybetmiş birinin akışını gereksiz yere karmaşıklaştırırdı.
 *
 * NEDEN BİRLEŞİM: `loginSchema` yalnızca `totpCodeSchema` (`/^\d{6}$/`)
 * kullanıyordu. Sonuç: kurtarma kodu biçimi `authenticateUser`'a HİÇ ULAŞMADAN
 * `INVALID_CREDENTIALS` oluyordu — `credentials.ts` içindeki
 * `verifyTotpWithRecovery` kurtarma yolunu destekliyor olmasına rağmen ÖLÜ KODDU.
 * Yani ADR-013'ün kurtarma yolu şema tarafından kapatılmıştı.
 *
 * Biçim esnekliği (küçük harf, tiresiz, boşluklu) burada DEĞİL
 * `normalizeBackupCode` içinde ele alınır; bu şema yalnızca kaba uzunluk/biçim
 * kapısıdır ve gerçek doğrulama argon2id karşılaştırmasıdır.
 */
export const loginCodeSchema = z.union([totpCodeSchema, totpBackupCodeSchema], {
  error: 'Doğrulama kodu 6 haneli olmalı veya geçerli bir kurtarma kodu girilmelidir.',
});

/** Giriş formu (§8.1). 2FA kodu ikinci adımda sorulur, burada opsiyonel. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Şifre zorunludur.' }),
  /**
   * BOŞ DİZE = "GÖNDERİLMEDİ" demektir.
   *
   * HTML formu, alan ekranda görünmese bile `totpCode=""` gönderir; Auth.js'in
   * `credentials` yapılandırmasında alan tanımlı olduğu için bu varsayılan
   * davranıştır. Boş dize doğrudan `loginCodeSchema`'ya girseydi hem 6 hane
   * regex'ini hem kurtarma kodu uzunluğunu kaçırır ve şema hatası olurdu —
   * yani ilk adım `TOTP_REQUIRED` yerine `INVALID_CREDENTIALS` dönerdi ve
   * iki adımlı akış hiç açılmazdı.
   *
   * ÖLÇÜLDÜ (T-013c izole deneyi):
   *   totpCode hiç yok  → code=TOTP_REQUIRED       ✓
   *   totpCode = ""     → code=INVALID_CREDENTIALS ✗  ← bu düzeltmeden önce
   */
  totpCode: z.preprocess((value) => (value === '' ? undefined : value), loginCodeSchema.optional()),
});

export const userFilterSchema = z.object({});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginCodeInput = z.infer<typeof loginCodeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;
