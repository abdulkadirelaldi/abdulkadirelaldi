import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateBackupCodes, hashBackupCodes } from '@/server/auth/backup-codes';
import {
  authenticateUser,
  type AuthClient,
  type AuthUserRecord,
  type SessionClaims,
} from '@/server/auth/credentials';
import { hashEmail } from '@/server/auth/login-attempt';
import { hashPassword } from '@/server/auth/password';
import { encryptSecret, generateTotpSecret } from '@/server/auth/totp';

/**
 * Bu testler VERİTABANI GEREKTİRMEZ — Prisma istemcisi enjekte edilir.
 * `pnpm test` DB'siz ve .env'siz geçmeye devam etmeli (T-003c kazanımı).
 */

const FAST = { memoryCost: 1024, timeCost: 1, parallelism: 1 } as const;
const TEST_KEY = Buffer.alloc(32, 5).toString('base64');
const ORIGINAL_KEY = process.env.TOTP_ENCRYPTION_KEY;

const EMAIL = 'admin@example.com';
const PASSWORD = 'cok-guclu-sifre-2026';
const IP = '203.0.113.7';

beforeEach(() => {
  process.env.TOTP_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
  else process.env.TOTP_ENCRYPTION_KEY = ORIGINAL_KEY;
  vi.restoreAllMocks();
});

interface Harness {
  client: AuthClient;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  /** §8.4 başarısız deneme sayacı — kilitleme politikası bunu okur. */
  count: ReturnType<typeof vi.fn>;
  /** ADR-022 kilit denetim kaydı. */
  auditCreate: ReturnType<typeof vi.fn>;
}

function harness(user: AuthUserRecord | null, failureCount = 0): Harness {
  const findUnique = vi.fn().mockResolvedValue(user);
  const update = vi.fn().mockResolvedValue({});
  const create = vi.fn().mockResolvedValue({});
  const count = vi.fn().mockResolvedValue(failureCount);
  const auditCreate = vi.fn().mockResolvedValue({});
  return {
    findUnique,
    update,
    create,
    count,
    auditCreate,
    client: {
      user: { findUnique, update },
      loginAttempt: {
        create,
        count,
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: auditCreate },
    } as unknown as AuthClient,
  };
}

async function makeUser(overrides: Partial<AuthUserRecord> = {}): Promise<AuthUserRecord> {
  return {
    id: 'usr_1',
    email: EMAIL,
    name: 'Abdulkadir',
    passwordHash: await hashPassword(PASSWORD, FAST),
    lockedUntil: null,
    totpSecret: null,
    totpConfirmedAt: null,
    totpBackupCodes: [],
    ...overrides,
  };
}

/** Gerçek bir TOTP kodu üretir (otplib ile aynı yoldan). */
async function currentTotpToken(secret: string): Promise<string> {
  const { generate, NobleCryptoPlugin, ScureBase32Plugin } = await import('otplib');
  return generate({
    secret,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
    period: 30,
  });
}

describe('2FA kapalı kullanıcı', () => {
  it('doğru şifreyle giriş yapar', async () => {
    const h = harness(await makeUser());
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({
        id: 'usr_1',
        email: EMAIL,
        name: 'Abdulkadir',
        twoFactorEnabled: false,
      });
    }
  });

  it('YANLIŞ şifre reddedilir', async () => {
    const h = harness(await makeUser());
    const result = await authenticateUser(
      { email: EMAIL, password: 'yanlis-sifre-2026', ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });

  it('başarılı girişte lastLoginAt güncellenir', async () => {
    const h = harness(await makeUser());
    const now = new Date('2026-08-05T12:00:00Z');
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client, now);
    expect(h.update).toHaveBeenCalledWith({
      where: { id: 'usr_1' },
      data: { lastLoginAt: now },
    });
  });

  it('e-posta büyük/küçük harf farkıyla da bulunur', async () => {
    const h = harness(await makeUser());
    await authenticateUser({ email: '  ADMIN@Example.COM ', password: PASSWORD, ip: IP }, h.client);
    expect(h.findUnique).toHaveBeenCalledWith({ where: { email: EMAIL } });
  });
});

describe('KULLANICI NUMARALANDIRMA KORUMASI', () => {
  it('var olmayan kullanıcı da INVALID_CREDENTIALS döner', async () => {
    const h = harness(null);
    const result = await authenticateUser(
      { email: 'yok@example.com', password: PASSWORD, ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });

  it('var olmayan kullanıcıda da DOĞRULAMA MALİYETİ ödenir', async () => {
    // Süre farkı, hangi e-postaların kayıtlı olduğunu ele verirdi.
    const { default: argon2 } = await import('argon2');
    const spy = vi.spyOn(argon2, 'verify');
    const h = harness(null);
    await authenticateUser({ email: 'yok@example.com', password: PASSWORD, ip: IP }, h.client);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('KİLİTLİ hesapta YANLIŞ şifre, kilidi ele vermez', async () => {
    // Kilit durumu şifre doğrulanmadan bildirilseydi, hesabın varlığı sızardı.
    const h = harness(await makeUser({ lockedUntil: new Date('2099-01-01T00:00:00Z') }));
    const result = await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    expect(result).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });
});

describe('User.lockedUntil — politika T-014’te, SAYGI burada', () => {
  it('gelecekte kilit varsa doğru şifreyle bile giriş REDDEDİLİR', async () => {
    const h = harness(await makeUser({ lockedUntil: new Date('2099-01-01T00:00:00Z') }));
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result).toEqual({ ok: false, reason: 'ACCOUNT_LOCKED' });
  });

  it('GEÇMİŞTE kalmış kilit girişi engellemez', async () => {
    const h = harness(await makeUser({ lockedUntil: new Date('2020-01-01T00:00:00Z') }));
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
  });
});

describe('2FA açık kullanıcı — §8.1 zorunlu', () => {
  async function totpUser(extra: Partial<AuthUserRecord> = {}) {
    const secret = await generateTotpSecret();
    const user = await makeUser({
      totpSecret: encryptSecret(secret),
      totpConfirmedAt: new Date('2026-01-01T00:00:00Z'),
      ...extra,
    });
    return { user, secret };
  }

  it('TOTP KODU VERMEDEN oturum açılamaz', async () => {
    const { user } = await totpUser();
    const h = harness(user);
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result).toEqual({ ok: false, reason: 'TOTP_REQUIRED' });
  });

  it('doğru şifre + DOĞRU TOTP → giriş', async () => {
    const { user, secret } = await totpUser();
    const h = harness(user);
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: await currentTotpToken(secret), ip: IP },
      h.client,
    );
    expect(result.ok).toBe(true);
  });

  it('doğru şifre + YANLIŞ TOTP → INVALID_TOTP', async () => {
    const { user } = await totpUser();
    const h = harness(user);
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: '000000', ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_TOTP' });
  });

  it('TOTP secret ÇÖZÜLEMEZSE giriş reddedilir (fırlatmaz)', async () => {
    const { user } = await totpUser();
    const h = harness({ ...user, totpSecret: 'v1.bozuk.veri.burada' });
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: '123456', ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_TOTP' });
  });

  it('totpConfirmedAt BOŞSA 2FA istenmez (kurulum tamamlanmamış)', async () => {
    const secret = await generateTotpSecret();
    const h = harness(await makeUser({ totpSecret: encryptSecret(secret), totpConfirmedAt: null }));
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
  });
});

describe('kurtarma kodu ile giriş — ADR-013', () => {
  async function userWithBackupCodes() {
    const secret = await generateTotpSecret();
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(codes, FAST);
    const user = await makeUser({
      totpSecret: encryptSecret(secret),
      totpConfirmedAt: new Date('2026-01-01T00:00:00Z'),
      totpBackupCodes: hashes,
    });
    return { user, codes, hashes };
  }

  it('TOTP yerine kurtarma kodu kabul edilir', async () => {
    const { user, codes } = await userWithBackupCodes();
    const h = harness(user);
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: codes[1], ip: IP },
      h.client,
    );
    expect(result.ok).toBe(true);
  });

  it('kullanılan kod TÜKETİLİR — kalan hash’ler kaydedilir', async () => {
    const { user, codes, hashes } = await userWithBackupCodes();
    const h = harness(user);
    await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: codes[0], ip: IP },
      h.client,
    );
    const call = h.update.mock.calls.find((c) => c[0]?.data?.totpBackupCodes);
    expect(call?.[0].data.totpBackupCodes).toHaveLength(2);
    expect(call?.[0].data.totpBackupCodes).not.toContain(hashes[0]);
  });

  it('KULLANILMIŞ kod ikinci kez kabul EDİLMEZ', async () => {
    const { user, codes } = await userWithBackupCodes();

    const first = harness(user);
    await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: codes[0], ip: IP },
      first.client,
    );
    const remaining = first.update.mock.calls.find((c) => c[0]?.data?.totpBackupCodes)?.[0].data
      .totpBackupCodes as string[];

    const second = harness({ ...user, totpBackupCodes: remaining });
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: codes[0], ip: IP },
      second.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_TOTP' });
  });

  it('tüketim KAYDEDİLEMEZSE giriş reddedilir', async () => {
    // Aksi hâlde kod sınırsız kullanılabilir hale gelirdi.
    const { user, codes } = await userWithBackupCodes();
    const h = harness(user);
    h.update.mockRejectedValue(new Error('db down'));
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: codes[0], ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_TOTP' });
  });

  it('kurtarma kodu yoksa yanlış TOTP yine reddedilir', async () => {
    const secret = await generateTotpSecret();
    const h = harness(
      await makeUser({
        totpSecret: encryptSecret(secret),
        totpConfirmedAt: new Date(),
        totpBackupCodes: [],
      }),
    );
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: '000000', ip: IP },
      h.client,
    );
    expect(result).toEqual({ ok: false, reason: 'INVALID_TOTP' });
  });
});

describe('LoginAttempt kaydı — §8.4', () => {
  it('BAŞARILI giriş kaydedilir', async () => {
    const h = harness(await makeUser());
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(h.create).toHaveBeenCalledWith({
      data: { ip: IP, emailHash: hashEmail(EMAIL), success: true },
    });
  });

  it('BAŞARISIZ giriş kaydedilir', async () => {
    const h = harness(await makeUser());
    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    expect(h.create).toHaveBeenCalledWith({
      data: { ip: IP, emailHash: hashEmail(EMAIL), success: false },
    });
  });

  it('kayıtta HAM E-POSTA yok, yalnızca özet (§8.20)', async () => {
    const h = harness(null);
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    const payload = JSON.stringify(h.create.mock.calls[0]?.[0]);
    expect(payload).not.toContain(EMAIL);
    expect(payload).not.toContain('admin');
    expect(payload).toContain(hashEmail(EMAIL));
  });

  it('var olmayan kullanıcı için de deneme kaydedilir', async () => {
    const h = harness(null);
    await authenticateUser({ email: 'yok@example.com', password: PASSWORD, ip: IP }, h.client);
    expect(h.create).toHaveBeenCalledTimes(1);
  });
});

describe('needsRehash — T-013a/T2c sessiz yükseltme', () => {
  it('zayıf parametreli hash doğru girişten sonra YÜKSELTİLİR', async () => {
    const h = harness(await makeUser()); // FAST parametreleriyle üretildi
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    const call = h.update.mock.calls.find((c) => c[0]?.data?.passwordHash);
    expect(call).toBeDefined();
    expect(call?.[0].data.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(call?.[0].data.passwordHash).not.toBe(h.findUnique.mock.results[0]);
  });

  it('yükseltme BAŞARISIZ olsa bile giriş engellenmez', async () => {
    const h = harness(await makeUser());
    h.update.mockRejectedValue(new Error('db down'));
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
  });

  it('güncel parametreli hash yeniden üretilmez', async () => {
    const h = harness(await makeUser({ passwordHash: await hashPassword(PASSWORD) }));
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(h.update.mock.calls.find((c) => c[0]?.data?.passwordHash)).toBeUndefined();
  });
});

describe('extractClientIp — §8.4 denetim kaydı', () => {
  const make = (headers: Record<string, string>) => new Request('https://x.test', { headers });

  it('x-forwarded-for ilk değerini alır (ters vekil zinciri)', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(
      extractClientIp(make({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' })),
    ).toBe('203.0.113.7');
  });

  it('tek değerli x-forwarded-for', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(extractClientIp(make({ 'x-forwarded-for': ' 198.51.100.4 ' }))).toBe('198.51.100.4');
  });

  it('x-forwarded-for yoksa x-real-ip', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(extractClientIp(make({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
  });

  it('hiç başlık yoksa "unknown" — uydurma değer yazılmaz', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(extractClientIp(make({}))).toBe('unknown');
  });

  it('istek yoksa "unknown"', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(extractClientIp(undefined)).toBe('unknown');
  });

  it('boş x-forwarded-for x-real-ip’ye düşer', async () => {
    const { extractClientIp } = await import('@/server/auth/credentials');
    expect(extractClientIp(make({ 'x-forwarded-for': '  ,  ', 'x-real-ip': '10.0.0.1' }))).toBe(
      '10.0.0.1',
    );
  });
});

describe('§8.4 kilitleme bağlantısı — BULGU-005 regresyonu', () => {
  it('başarısız denemede applyLockoutPolicy ÇAĞRILIR (sayaç okunur)', async () => {
    const h = harness(await makeUser(), 0);
    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    // Politika sayımı `loginAttempt.count` üzerinden yapar.
    expect(h.count).toHaveBeenCalled();
  });

  it('SIRA: önce recordLoginAttempt, SONRA sayım', async () => {
    // Ters sırada tetikleyen deneme sayıma girmez ve kilit 5 yerine 6'da uygulanır.
    const order: string[] = [];
    const h = harness(await makeUser(), 0);
    h.create.mockImplementation(async () => {
      order.push('record');
      return {};
    });
    h.count.mockImplementation(async () => {
      order.push('count');
      return 0;
    });

    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    expect(order).toEqual(['record', 'count']);
  });

  it('EŞİĞE ULAŞILINCA lockedUntil YAZILIR', async () => {
    const h = harness(await makeUser(), 5); // 5 başarısız deneme sayıldı
    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);

    const lockCall = h.update.mock.calls.find((c) => c[0]?.data?.lockedUntil);
    expect(lockCall).toBeDefined();
    expect(lockCall?.[0].data.lockedUntil).toBeInstanceOf(Date);
  });

  it('eşiğin ALTINDA kilit yazılmaz', async () => {
    const h = harness(await makeUser(), 2);
    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    expect(h.update.mock.calls.find((c) => c[0]?.data?.lockedUntil)).toBeUndefined();
  });

  it('kilit ADR-022 uyarınca AuditLog’a düşer', async () => {
    const h = harness(await makeUser(), 5);
    await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);

    expect(h.auditCreate).toHaveBeenCalled();
    const data = h.auditCreate.mock.calls[0]?.[0]?.data;
    expect(data.entity).toBe('User');
    expect(data.actorId ?? null).toBeNull(); // kimliği doğrulanmamış istek
    expect(JSON.stringify(data)).not.toContain(EMAIL); // §8.20
  });

  it('var olmayan kullanıcıda sayım yapılır ama kilit YAZILMAZ', async () => {
    const h = harness(null, 5);
    await authenticateUser({ email: 'yok@example.com', password: 'x', ip: IP }, h.client);
    expect(h.count).toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
  });

  it('BAŞARILI girişte kilitleme politikası çalışmaz', async () => {
    const h = harness(await makeUser(), 0);
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
    expect(h.count).not.toHaveBeenCalled();
  });

  it('kilit yazımı DB hatası verse bile giriş akışı çökmez', async () => {
    const h = harness(await makeUser(), 5);
    h.update.mockRejectedValue(new Error('db down'));
    const result = await authenticateUser({ email: EMAIL, password: 'yanlis', ip: IP }, h.client);
    expect(result).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });
});

describe('twoFactorEnabled — §8.1 kapısının kaynağı (BULGU-008)', () => {
  it('2FA KURULU DEĞİLSE false döner', async () => {
    const h = harness(await makeUser({ totpConfirmedAt: null }));
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.twoFactorEnabled).toBe(false);
  });

  it('2FA KURULUYSA true döner', async () => {
    const secret = await generateTotpSecret();
    const h = harness(
      await makeUser({
        totpSecret: encryptSecret(secret),
        totpConfirmedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: await currentTotpToken(secret), ip: IP },
      h.client,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.twoFactorEnabled).toBe(true);
  });

  it('ölçüt totpConfirmedAt — totpEnabled bayrağı DEĞİL', async () => {
    // Kurulum yarıda kalmışsa bayrak true olabilir ama 2FA fiilen kurulu değildir;
    // giriş akışı da aynı ölçütü kullanıyor (T-015b/K4).
    const secret = await generateTotpSecret();
    const h = harness(
      await makeUser({
        totpSecret: encryptSecret(secret),
        totpEnabled: true,
        totpConfirmedAt: null,
      } as Partial<AuthUserRecord>),
    );
    const result = await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.twoFactorEnabled).toBe(false);
  });

  it('YENİ SORGU EKLENMEDİ — kullanıcı bir kez okunuyor', async () => {
    const h = harness(await makeUser());
    await authenticateUser({ email: EMAIL, password: PASSWORD, ip: IP }, h.client);
    expect(h.findUnique).toHaveBeenCalledTimes(1);
  });

  it('§8.20 — dönen nesnede secret, kurtarma kodu veya sayısı YOK', async () => {
    const secret = await generateTotpSecret();
    const h = harness(
      await makeUser({
        totpSecret: encryptSecret(secret),
        totpConfirmedAt: new Date(),
        totpBackupCodes: ['h1', 'h2', 'h3'],
      }),
    );
    const result = await authenticateUser(
      { email: EMAIL, password: PASSWORD, totpCode: await currentTotpToken(secret), ip: IP },
      h.client,
    );
    if (!result.ok) throw new Error('başarılı olmalıydı');

    expect(Object.keys(result.user).sort()).toEqual(['email', 'id', 'name', 'twoFactorEnabled']);
    const payload = JSON.stringify(result.user);
    expect(payload).not.toContain(secret);
    expect(payload).not.toContain('h1');
    expect(payload).not.toContain('3'); // kurtarma kodu SAYISI da taşınmıyor
  });
});

describe('jeton alanları — §8.1 kapısının şekli (BULGU-008)', () => {
  it('GİRİŞ: tfa true olarak jetona yazılır', async () => {
    const { applyLoginClaims } = await import('@/server/auth/credentials');
    const token = applyLoginClaims<SessionClaims>(
      {},
      { id: 'usr_1', email: EMAIL, name: 'Abdulkadir', tfa: true },
    );
    expect(token).toEqual({ sub: 'usr_1', email: EMAIL, name: 'Abdulkadir', tfa: true });
  });

  it('GİRİŞ: tfa false olarak jetona yazılır', async () => {
    const { applyLoginClaims } = await import('@/server/auth/credentials');
    expect(applyLoginClaims<SessionClaims>({}, { id: 'usr_1', tfa: false }).tfa).toBe(false);
  });

  it('§8.20 — jetonda YALNIZCA dört alan var', async () => {
    const { applyLoginClaims } = await import('@/server/auth/credentials');
    const token = applyLoginClaims<SessionClaims>(
      {},
      { id: 'usr_1', email: EMAIL, name: 'Abdulkadir', tfa: true },
    );
    expect(Object.keys(token).sort()).toEqual(['email', 'name', 'sub', 'tfa']);
  });

  it('null email/name undefined’a çevrilir', async () => {
    const { applyLoginClaims } = await import('@/server/auth/credentials');
    const token = applyLoginClaims<SessionClaims>(
      {},
      { id: 'usr_1', email: null, name: null, tfa: false },
    );
    expect(token.email).toBeUndefined();
    expect(token.name).toBeUndefined();
  });
});

describe('update tetikleyicisi — kurulum sonrası tazeleme (BULGU-008)', () => {
  it('tfa false → true olarak TAZELENİR', async () => {
    const { refreshTwoFactorClaim } = await import('@/server/auth/credentials');
    const read = vi.fn().mockResolvedValue({ enabled: true });

    const token = await refreshTwoFactorClaim({ sub: 'usr_1', tfa: false }, read);

    expect(read).toHaveBeenCalledWith('usr_1');
    expect(token.tfa).toBe(true);
  });

  it('2FA kapatılmışsa true → false olarak da tazelenir', async () => {
    const { refreshTwoFactorClaim } = await import('@/server/auth/credentials');
    const token = await refreshTwoFactorClaim(
      { sub: 'usr_1', tfa: true },
      vi.fn().mockResolvedValue({ enabled: false }),
    );
    expect(token.tfa).toBe(false);
  });

  it('DEĞER VERİTABANINDAN okunur — istemci gövdesi dikkate ALINMAZ', async () => {
    // Kullanıcı `update({ tfa: true })` gönderse bile karar DB'nin.
    const { refreshTwoFactorClaim } = await import('@/server/auth/credentials');
    const token = await refreshTwoFactorClaim(
      { sub: 'usr_1', tfa: true },
      vi.fn().mockResolvedValue({ enabled: false }),
    );
    expect(token.tfa).toBe(false);
  });

  it('sub yoksa okuma DENENMEZ', async () => {
    const { refreshTwoFactorClaim } = await import('@/server/auth/credentials');
    const read = vi.fn();
    await refreshTwoFactorClaim({ tfa: false }, read);
    expect(read).not.toHaveBeenCalled();
  });

  it('DB hatasında jeton OLDUĞU GİBİ kalır (kilitlenme yok)', async () => {
    const { refreshTwoFactorClaim } = await import('@/server/auth/credentials');
    const token = await refreshTwoFactorClaim(
      { sub: 'usr_1', tfa: false },
      vi.fn().mockRejectedValue(new Error('db down')),
    );
    expect(token.tfa).toBe(false);
  });
});
