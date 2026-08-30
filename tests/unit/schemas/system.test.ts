import { describe, expect, it } from 'vitest';

import {
  auditLogFilterSchema,
  changePasswordSchema,
  createAttachmentSchema,
  createAuditLogSchema,
  createContactMessageSchema,
  createLoginAttemptSchema,
  createUserSchema,
  loginSchema,
  REDACTED_FIELD_NAMES,
  updateContactMessageSchema,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';
const HASH = 'a'.repeat(64);

describe('createUserSchema', () => {
  it('geçerli kullanıcı, e-posta küçük harfe indirilir', () => {
    const parsed = createUserSchema.parse({
      email: '  Abdulkadir@Example.COM ',
      name: 'Abdulkadir',
      password: 'cok-guclu-sifre-2026',
    });
    expect(parsed.email).toBe('abdulkadir@example.com');
  });

  it('12 karakterden kısa şifre reddeder (§8.2)', () => {
    expect(
      createUserSchema.safeParse({ email: 'a@b.com', name: 'A', password: 'kisa' }).success,
    ).toBe(false);
  });

  it('passwordHash gibi bir sır KABUL ETMEZ — hash T-013 katmanında üretilir', () => {
    const parsed = createUserSchema.parse({
      email: 'a@b.com',
      name: 'A',
      password: 'cok-guclu-sifre-2026',
      passwordHash: '$argon2id$sizinti',
    });
    expect(parsed).not.toHaveProperty('passwordHash');
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'eski-sifre-2025', newPassword: 'yeni-guclu-sifre-2026' };

  it('eşleşen şifreler geçerli', () => {
    expect(
      changePasswordSchema.safeParse({ ...base, newPasswordConfirm: base.newPassword }).success,
    ).toBe(true);
  });

  it('eşleşmeyen tekrar reddedilir', () => {
    const r = changePasswordSchema.safeParse({ ...base, newPasswordConfirm: 'baska' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['newPasswordConfirm']);
  });

  it('yeni şifre eskisiyle aynı olamaz', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'ayni-sifre-degeri-2026',
        newPassword: 'ayni-sifre-degeri-2026',
        newPasswordConfirm: 'ayni-sifre-degeri-2026',
      }).success,
    ).toBe(false);
  });
});

describe('loginSchema', () => {
  it('e-posta + şifre yeterli, TOTP opsiyonel', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
  it('6 haneli olmayan TOTP reddedilir', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '12345' }).success,
    ).toBe(false);
  });
});

describe('createLoginAttemptSchema — §8.20', () => {
  it('IP + emailHash ile geçerli', () => {
    expect(
      createLoginAttemptSchema.safeParse({ ip: '192.168.1.1', emailHash: HASH, success: false })
        .success,
    ).toBe(true);
  });

  it('HAM E-POSTA yazılmışsa REDDEDER', () => {
    const r = createLoginAttemptSchema.safeParse({
      ip: '192.168.1.1',
      emailHash: 'abdulkadir@example.com',
      success: false,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain('ham e-posta');
  });

  it('geçersiz IP reddeder', () => {
    expect(
      createLoginAttemptSchema.safeParse({ ip: '999.1.1.1', emailHash: HASH, success: true })
        .success,
    ).toBe(false);
  });
});

describe('createAuditLogSchema — ADR-020', () => {
  it('geçerli denetim kaydı', () => {
    expect(
      createAuditLogSchema.safeParse({ action: 'CREATE', entity: 'Transaction', entityId: ID })
        .success,
    ).toBe(true);
  });

  it('geçersiz eylem reddeder', () => {
    expect(createAuditLogSchema.safeParse({ action: 'SILDI', entity: 'X' }).success).toBe(false);
  });

  it('redaksiyon listesi §8.20 alanlarını kapsar', () => {
    for (const field of [
      'password',
      'passwordHash',
      'totpSecret',
      'totpBackupCodes',
      'token',
      'email',
    ]) {
      expect(REDACTED_FIELD_NAMES).toContain(field);
    }
  });

  it('filtre eylem enum doğrular', () => {
    expect(auditLogFilterSchema.safeParse({ action: 'LOGIN' }).success).toBe(true);
    expect(auditLogFilterSchema.safeParse({ action: 'GIRIS' }).success).toBe(false);
  });
});

describe('createAttachmentSchema — ADR-018', () => {
  const valid = {
    key: 'projects/abc.webp',
    mime: 'image/webp',
    size: 12345,
    checksum: HASH,
    entity: 'PROJECT',
    entityId: ID,
  };

  it('geçerli ek kabul eder', () => {
    expect(createAttachmentSchema.safeParse(valid).success).toBe(true);
  });

  it('url alanı KABUL EDİLMEZ — §8.11 imzalı URL istek anında üretilir', () => {
    const parsed = createAttachmentSchema.parse({ ...valid, url: 'https://public.example/x.webp' });
    expect(parsed).not.toHaveProperty('url');
  });

  it('izinsiz MIME reddeder', () => {
    expect(createAttachmentSchema.safeParse({ ...valid, mime: 'application/zip' }).success).toBe(
      false,
    );
  });

  it('10 MB üstü reddeder (§8.11)', () => {
    expect(createAttachmentSchema.safeParse({ ...valid, size: 11 * 1024 * 1024 }).success).toBe(
      false,
    );
  });
});

describe('createContactMessageSchema — §8.15', () => {
  const valid = {
    name: 'Ayşe',
    email: 'ayse@example.com',
    message: 'Merhaba, bir projem var ve görüşmek isterim.',
  };

  it('geçerli mesaj kabul eder', () => {
    expect(createContactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('10 karakterden kısa mesaj reddeder', () => {
    expect(createContactMessageSchema.safeParse({ ...valid, message: 'selam' }).success).toBe(
      false,
    );
  });

  /**
   * DEĞİŞTİ (T-031) — bu test eskiden "HONEYPOT dolu gelirse REDDEDER" diyordu
   * ve tam olarak T-026b'de ölçülen kusuru sabitliyordu.
   *
   * Reddetmek YANLIŞ sonuçtur: aynı şema istemcide `zodResolver` ile koşunca
   * dolu honeypot bir doğrulama hatasına dönüşüyor, `handleSubmit` hiç
   * tetiklenmiyor ve gönderim sunucuya ULAŞMIYORDU — bot kazanıyor, spam
   * sinyali kaydedilmiyor (ADR-020/C11), yanlış pozitifte gerçek kullanıcı
   * "Gönder"e basınca hiçbir şey olmuyordu.
   *
   * Doğru kural "işaretle ve YİNE KABUL ET" ve Zod bunu ifade edemez; bu yüzden
   * alan `serverInterpreted` ile işaretli, karar `route.ts`'te.
   */
  it('HONEYPOT dolu gelirse REDDETMEZ — kural sunucuda (T-026b/T-031)', () => {
    expect(
      createContactMessageSchema.safeParse({ ...valid, website: 'https://spam.example' }).success,
    ).toBe(true);
  });

  it('isSpam / spamScore istemciden alınmaz — sunucu belirler', () => {
    const parsed = createContactMessageSchema.parse({ ...valid, isSpam: false, spamScore: 0 });
    expect(parsed).not.toHaveProperty('isSpam');
    expect(parsed).not.toHaveProperty('spamScore');
  });

  it('panel güncellemesi yalnızca durum alanlarını taşır', () => {
    expect(updateContactMessageSchema.safeParse({ id: ID, isRead: true }).success).toBe(true);
    const parsed = updateContactMessageSchema.parse({ id: ID, message: 'değiştirildi' });
    expect(parsed).not.toHaveProperty('message');
  });
});

describe('loginSchema — T-013c / ENGEL-2 regresyonu', () => {
  it('6 haneli TOTP kodunu kabul eder', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '123456' });
    expect(r.success).toBe(true);
  });

  it('KURTARMA KODU biçimini kabul eder (ADR-013 yolu açık)', () => {
    // Bu şema yalnızca `totpCodeSchema` kullanıyorken `ABCDE-FGHIJ` reddediliyordu
    // ve kurtarma yolu authenticateUser'a hiç ulaşmadan ölü kod hâline geliyordu.
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'ABCDE-FGHIJ' });
    expect(r.success).toBe(true);
  });

  it('küçük harf ve tiresiz kurtarma kodunu da kabul eder', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'abcdefghij' }).success,
    ).toBe(true);
  });

  it('BOŞ DİZE "gönderilmedi" sayılır — iki adımlı akışın koşulu', () => {
    // HTML formu ilk adımda daima `totpCode=""` gönderir. Boş dize şema hatası
    // olsaydı ilk adım TOTP_REQUIRED yerine INVALID_CREDENTIALS dönerdi.
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.totpCode).toBeUndefined();
  });

  it('alan hiç gönderilmezse de geçerli', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.totpCode).toBeUndefined();
  });

  it('anlamsız kısa kod hâlâ REDDEDİLİR', () => {
    // Birleşim her şeyi kabul etmemeli: 3 karakter ne TOTP ne kurtarma kodu.
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: 'abc' }).success,
    ).toBe(false);
  });

  it('5 haneli sayı reddedilir (TOTP 6 hane)', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'x', totpCode: '12345' }).success,
    ).toBe(false);
  });
});
