import process from 'node:process';

import { hashBackupCodes } from '@/server/auth/backup-codes';
import { hashEmail } from '@/server/auth/login-attempt';
import { encryptSecret } from '@/server/auth/totp';
import { db } from '@/server/db';

/**
 * E2E veritabanı görevleri — AYRI BİR NODE SÜRECİNDE koşar.
 *
 * Çağrılma biçimi (bkz. `db.ts`):
 *   node --import ./tests/e2e/_helpers/db-register.mjs \
 *        tests/e2e/_helpers/db-task.ts <komut> [json-argüman]
 *
 * Sonuç stdout'a TEK SATIR JSON olarak yazılır. Neden ayrı süreç: gerekçe
 * `db-resolver.mjs` başında.
 *
 * §8.20: Bu betik şifre, TOTP secret'ı veya kurtarma kodunu ASLA yazdırmaz —
 * yalnızca sayılar ve boolean'lar döner. Sabit test secret'ı çağıran tarafta
 * zaten bilinir; buradan geri gönderilmesine gerek yok.
 */

/** Sabit test secret'ı — RFC 6238 tohumunun Base32 hâli. */
export const TEST_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Sabit kurtarma kodları — biçim `XXXXX-XXXXX` (ADR-013). */
export const TEST_BACKUP_CODES = ['AAAAA-BBBBB', 'CCCCC-DDDDD', 'EEEEE-FFFFF'] as const;

function adminEmail(): string {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error('ADMIN_EMAIL tanımlı değil (§12). .env dosyasını kontrol edin.');
  }
  return email;
}

async function requireAdmin() {
  const email = adminEmail();
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error(`Yönetici hesabı bulunamadı (${email}). Önce "pnpm db:seed" çalıştırın.`);
  }

  return user;
}

/**
 * TÜM giriş denemelerini siler — e-posta özetine göre DEĞİL.
 *
 * §8.4 sayımı **IP başınadır** (`countRecentFailures({ ip }, …)`). Bir zamanlar
 * burası `emailHash`'e göre siliyordu ve şu sessiz hataya yol açtı: var olmayan
 * bir e-postayla yapılan deneme FARKLI bir özet üretiyor, silinmiyor, ama AYNI
 * IP'den geldiği için sayaçta kalmaya devam ediyordu. Sonuç: dört yanlış şifre
 * girip beklediğinden bir erken kilitlenen, sıraya bağlı ve açıklaması zor bir
 * kırılma. "Dört deneme kilitlemez" sınır testi bunu yakaladı.
 *
 * Seed durumunda hiç deneme kaydı yok; tabloyu boşaltmak seed durumuna dönmenin
 * ta kendisidir.
 */
async function clearAllLoginAttempts(): Promise<number> {
  const { count } = await db.loginAttempt.deleteMany({});
  return count;
}

/** Kullanıcıyı seed durumuna döndürür ve testin bıraktığı izleri siler. */
async function resetAuthState(since?: string): Promise<void> {
  const user = await requireAdmin();

  await db.user.update({
    where: { id: user.id },
    data: {
      // `prisma/seed.ts` bu üçünü boş bırakıyor — 2FA kapalı.
      totpSecret: null,
      totpConfirmedAt: null,
      totpBackupCodes: [],
      lockedUntil: null,
    },
  });

  await clearAllLoginAttempts();

  await db.auditLog.deleteMany({
    where: {
      entity: 'User',
      actorEmailHash: hashEmail(user.email),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
  });
}

const komutlar: Record<string, (arg?: string) => Promise<unknown>> = {
  /** Yönetici kaydının test için gereken alanları. */
  async admin() {
    const user = await requireAdmin();
    return {
      id: user.id,
      email: user.email,
      twoFactorEnabled: user.totpConfirmedAt != null,
      remainingBackupCodes: user.totpBackupCodes.length,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
    };
  },

  /** 2FA'yı açar — seed kapalı bıraktığı için §9/3'ün ikinci yarısı buna bağlı. */
  async enableTwoFactor() {
    const user = await requireAdmin();

    await db.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptSecret(TEST_TOTP_SECRET),
        totpConfirmedAt: new Date(),
        totpBackupCodes: await hashBackupCodes([...TEST_BACKUP_CODES]),
      },
    });

    return { secret: TEST_TOTP_SECRET, backupCodes: TEST_BACKUP_CODES };
  },

  async resetAuthState(since) {
    await resetAuthState(since);
    return { ok: true };
  },

  /** §8.4 sayacını sıfırlar — testler arası sızmayı önler. */
  async clearLoginAttempts() {
    return { deleted: await clearAllLoginAttempts() };
  },

  async clearLock() {
    const user = await requireAdmin();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: null } });
    return { ok: true };
  },

  /** Kilit denetim kaydı sayısı — ADR-022'nin uçtan uca doğrulanması için. */
  async lockAuditCount() {
    const user = await requireAdmin();
    const count = await db.auditLog.count({
      where: { entity: 'User', actorEmailHash: hashEmail(user.email), action: 'UPDATE' },
    });
    return { count };
  },
};

async function main(): Promise<void> {
  const [, , komut, arg] = process.argv;
  const calistir = komut ? komutlar[komut] : undefined;

  if (!calistir) {
    throw new Error(`Bilinmeyen komut: ${komut ?? '(yok)'}`);
  }

  const sonuc = await calistir(arg);

  // Çıktı YAZILDIKTAN SONRA süreç zorla sonlandırılır — gerekçe aşağıda.
  await new Promise<void>((resolve) => {
    process.stdout.write(JSON.stringify(sonuc ?? null), () => resolve());
  });
}

/**
 * Süreç `process.exit()` ile KAPATILIR — `$disconnect()` yetmiyor.
 *
 * ÖLÇÜLDÜ: `db.$disconnect()` çağrıldıktan sonra bile süreç tam 30 saniye
 * daha yaşıyor. Sebep, Prisma 7'nin sürücü adaptörü (ADR-005): altta yatan
 * `pg` havuzunu `src/server/db.ts` oluşturuyor ve `$disconnect()` onu
 * KAPATMIYOR; havuz `idleTimeoutMillis: 30_000` boyunca olay döngüsünü ayakta
 * tutuyor. Sonuç birebir 30 sn — tesadüf değil.
 *
 * Bu, kısa ömürlü her betiği etkiliyor (bkz. rapor / BULGU-007). Testler için
 * doğru çözüm burada beklemek değil, işi bitince çıkmak: çıktı zaten
 * yazıldı, veritabanı işlemi zaten tamamlandı.
 */
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    process.stderr.write(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
