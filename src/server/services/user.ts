import { LOGIN_RATE_LIMIT, rateLimitWindowStart } from '@/lib/security/rate-limit';
import { db } from '@/server/db';

/**
 * Kullanıcı / 2FA servisi — §7.4, ADR-013.
 *
 * T-015 konvansiyonu: Prisma istemcisi ENJEKTE EDİLİR, girdi doğrulanmış gelir,
 * çıkışta `Decimal` yok (bu serviste para alanı da yok), `AuditLog` ve
 * `revalidatePath` SERVİSTE DEĞİL Server Action'da.
 *
 * §8.20: Bu servis `totpSecret`'ı ÇÖZMEZ ve kurtarma kodu ÜRETMEZ — şifreli
 * değeri saklar, hash'li listeyi yazar. Kripto işi T-013a'nın primitiflerinde.
 */

/* ===========================================================================
 * TİPLER — Frontend'in `totp-contract.ts` dosyasıyla yapısal olarak aynı
 * ======================================================================== */

export type TotpErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_TOTP'
  | 'ALREADY_ENABLED'
  | 'NOT_ENABLED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface TotpError {
  code: TotpErrorCode;
  message: string;
}

export interface TotpStatus {
  enabled: boolean;
  remainingBackupCodes: number;
}

export type TotpResult<T> = { ok: true; data: T } | { ok: false; error: TotpError };

/** §7.2 ile aynı zarf; Server Action olduğu için HTTP durumu yok, kod taşınır. */
export const TOTP_ERRORS: Record<TotpErrorCode, string> = {
  UNAUTHORIZED: 'Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.',
  INVALID_TOTP: 'Doğrulama kodu geçersiz. Uygulamanızdaki güncel kodu girin.',
  ALREADY_ENABLED: 'İki adımlı doğrulama zaten açık.',
  NOT_ENABLED: 'İki adımlı doğrulama açık değil.',
  RATE_LIMITED: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.',
  INTERNAL_ERROR: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
};

export function totpFail(code: TotpErrorCode): { ok: false; error: TotpError } {
  return { ok: false, error: { code, message: TOTP_ERRORS[code] } };
}

/* ===========================================================================
 * HIZ SINIRI — kurulum doğrulaması
 * ======================================================================== */

/**
 * Başarısız TOTP doğrulaması `AuditLog`'a `LOGIN_FAILED` olarak yazılır ve
 * sayım BURADAN yapılır.
 *
 * NEDEN `LoginAttempt` DEĞİL: o tablo §8.4'ün IP başına kilit sayacıdır ve
 * `applyLockoutPolicy` onu okuyup HESABI KİLİTLER. Kurulum sırasında kodu birkaç
 * kez yanlış giren dürüst bir kullanıcı, kendi hesabını kilitlemiş olurdu —
 * üstelik 2FA'yı henüz kuramamışken. İki sayaç ayrı tutuluyor: aynı eşiği
 * paylaşıyorlar ama biri hesabı kilitler, diğeri yalnızca bu akışı yavaşlatır.
 *
 * Eşik ve pencere Güvenlik ajanının `LOGIN_RATE_LIMIT` sabitinden gelir —
 * ikinci bir sihirli sayı tanımlanmaz (§8.4 tek yerden denetlenebilir kalsın).
 */
export const TOTP_SETUP_RATE_LIMIT = {
  maxFailures: LOGIN_RATE_LIMIT.maxFailures,
  windowMinutes: LOGIN_RATE_LIMIT.windowMinutes,
} as const;

/** Sayım için gereken asgari Prisma yüzeyi. */
export interface TotpAuditReader {
  auditLog: {
    count(args: {
      where: {
        action: 'LOGIN_FAILED';
        entity: string;
        entityId: string;
        createdAt: { gte: Date };
      };
    }): Promise<number>;
  };
}

/**
 * Son pencerede kaç başarısız TOTP doğrulaması yapıldı.
 *
 * Sorgu JSON alanına GİRMEZ: `action` + `entity` + `entityId` + `createdAt`
 * üzerinden çalışır ve `@@index([entity, entityId])` ile karşılanır.
 */
export async function countRecentTotpFailures(
  userId: string,
  now: Date = new Date(),
  client: TotpAuditReader = db,
): Promise<number> {
  return client.auditLog.count({
    where: {
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: userId,
      createdAt: { gte: rateLimitWindowStart(now) },
    },
  });
}

export async function isTotpSetupRateLimited(
  userId: string,
  now: Date = new Date(),
  client: TotpAuditReader = db,
): Promise<boolean> {
  return (await countRecentTotpFailures(userId, now, client)) >= TOTP_SETUP_RATE_LIMIT.maxFailures;
}

/* ===========================================================================
 * 2FA DURUMU VE MUTASYONLARI
 * ======================================================================== */

/** Servisin Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface UserTotpRecord {
  id: string;
  email: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpConfirmedAt: Date | null;
  totpBackupCodes: string[];
}

export interface UserTotpClient extends TotpAuditReader {
  user: {
    findUnique(args: { where: { id: string } }): Promise<UserTotpRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        totpSecret?: string | null;
        totpEnabled?: boolean;
        totpConfirmedAt?: Date | null;
        totpBackupCodes?: string[];
      };
    }): Promise<unknown>;
  };
}

export async function findUserTotpRecord(
  userId: string,
  client: UserTotpClient = db,
): Promise<UserTotpRecord | null> {
  return client.user.findUnique({ where: { id: userId } });
}

/**
 * Ekranın açılışta gördüğü durum.
 *
 * `enabled` ölçütü `totpConfirmedAt`tır, `totpEnabled` DEĞİL: kurulum başlatılmış
 * ama doğrulanmamış bir kullanıcıda secret vardır ve bayrak yanıltıcı olabilir.
 * Giriş akışı da (T-013b) aynı ölçütü kullanıyor — iki yerde farklı ölçüt
 * kullanmak "ekranda açık, girişte kapalı" gibi bir tutarsızlık üretirdi.
 */
export async function getTotpState(
  userId: string,
  client: UserTotpClient = db,
): Promise<TotpStatus> {
  const user = await findUserTotpRecord(userId, client);
  if (!user) return { enabled: false, remainingBackupCodes: 0 };

  return {
    enabled: user.totpConfirmedAt !== null,
    remainingBackupCodes: user.totpBackupCodes.length,
  };
}

/**
 * Kurulum secret'ını saklar — `totpConfirmedAt` DOLDURULMAZ.
 *
 * Bu ayrım ADR-013'ün özü: doğrulanmamış bir secret 2FA'yı etkinleştirmez.
 * Aksi hâlde QR'ı yanlış okuyan kullanıcı, çalışmayan bir authenticator'la
 * kendi hesabından kilitlenirdi.
 */
export async function storeTotpSecret(
  userId: string,
  encryptedSecret: string,
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { totpSecret: encryptedSecret, totpEnabled: false, totpConfirmedAt: null },
  });
}

/** 2FA'yı ETKİNLEŞTİRİR — yalnızca doğrulama başarılıysa çağrılır. */
export async function enableTotp(
  userId: string,
  hashedBackupCodes: string[],
  now: Date = new Date(),
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      totpConfirmedAt: now,
      totpBackupCodes: hashedBackupCodes,
    },
  });
}

/** Kurtarma kodlarını değiştirir — eskiler geçersizleşir (ADR-013). */
export async function replaceBackupCodes(
  userId: string,
  hashedBackupCodes: string[],
  client: UserTotpClient = db,
): Promise<void> {
  await client.user.update({
    where: { id: userId },
    data: { totpBackupCodes: hashedBackupCodes },
  });
}
