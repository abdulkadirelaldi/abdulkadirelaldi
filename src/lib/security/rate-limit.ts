/**
 * §8.4 — giriş hız sınırı ve hesap kilitleme POLİTİKASI.
 *
 * SINIR (ADR-013): **Tablo ve servis Backend'in, politika buranın.**
 * `LoginAttempt` kayıtlarını yazan/sayan kod `src/server/auth/login-attempt.ts`
 * içindedir ve BU DOSYA ONU YENİDEN YAZMAZ — yalnızca tüketir. Buradaki tek iş,
 * "kaç denemede, ne kadar süre kilitlenir" sorusuna cevap vermek ve kararı
 * uygulamak.
 *
 * ADR-022 sınırı: **denemeler `LoginAttempt`'e, sonuçlar `AuditLog`'a.**
 * Giriş denemeleri buradan `AuditLog`'a YAZILMAZ (Backend zaten `LoginAttempt`'e
 * yazıyor). Ama kilit UYGULANDIĞINDA `AuditLog`'a düşer: `User` kaydını
 * değiştiren kalıcı bir durum değişikliğidir ve `LoginAttempt`'in 90 günlük
 * temizliğinden (ADR-013) etkilenmemelidir.
 */

import { AuditAction } from '@/types';

/**
 * §8.4 — "Giriş denemesi: IP başına 15 dakikada 5; aşımda 15 dk kilit + log".
 *
 * ÜÇ DEĞER DE TEK YERDE. Eşiği bir dosyada, pencereyi başka dosyada tutmak
 * §8.4'ü denetlenemez hale getirir: hangi sayının yürürlükte olduğu koda
 * bakmadan söylenemez. Değişiklik gerekiyorsa yalnızca burası düzenlenir.
 */
export const LOGIN_RATE_LIMIT = {
  /** Bu sayıya ULAŞILDIĞINDA kilit uygulanır (5. başarısız deneme kilitler). */
  maxFailures: 5,
  /** Başarısızlıkların sayıldığı geriye dönük pencere. */
  windowMinutes: 15,
  /** Kilidin süresi. */
  lockMinutes: 15,
} as const;

const MS_PER_MINUTE = 60_000;

/** Sayım penceresinin başlangıcı — bu andan öncesi dikkate alınmaz. */
export function rateLimitWindowStart(now: Date): Date {
  return new Date(now.getTime() - LOGIN_RATE_LIMIT.windowMinutes * MS_PER_MINUTE);
}

/** Kilidin biteceği an. */
export function lockExpiresAt(now: Date): Date {
  return new Date(now.getTime() + LOGIN_RATE_LIMIT.lockMinutes * MS_PER_MINUTE);
}

/**
 * Kilidin hâlâ yürürlükte olup olmadığı.
 *
 * Backend'in giriş akışı da aynı karşılaştırmayı yapıyor (`credentials.ts`);
 * burada tekrar ediyoruz ki politika tarafı kendi kararını tek başına
 * sınayabilsin — iki yerde farklı bir "kilitli" tanımı oluşmasın diye
 * karşılaştırma birebir aynı: `lockedUntil > now`.
 */
export function isLocked(lockedUntil: Date | null | undefined, now: Date): boolean {
  return lockedUntil != null && lockedUntil.getTime() > now.getTime();
}

/**
 * `AuditLog.diff` için JSON'a yazılabilir değer kümesi.
 *
 * NEDEN `Record<string, unknown>` DEĞİL (T-013c/T1): Prisma'nın `Json` alanı
 * `InputJsonValue` bekler ve `unknown` ona atanamaz. `Record<string, unknown>`
 * kullanıldığında `LockoutClient` gerçek `PrismaClient` ile UYUŞMUYORDU —
 * Backend bunu T-013c'de elle yazdığı bir adaptörle aşmak zorunda kaldı.
 * Tipi JSON'a gerçekten yazılabilen değerlerle sınırlamak sorunu kökten çözer:
 * artık `const client: LockoutClient = db` doğrudan derleniyor.
 *
 * Kısıt aynı zamanda doğru olanı zorluyor: `diff`'e `Date` veya sınıf örneği
 * konamaz — sessizce `{}` olarak serileşir ve denetim kaydı boş çıkardı.
 */
export type AuditDiffValue = string | number | boolean | null;

/**
 * Kilidi yazmak ve denetim kaydını düşmek için gereken asgari Prisma yüzeyi.
 *
 * Dar tutuluyor ki testlerde taklit edilebilsin; ama gerçek `PrismaClient`
 * bu arayüzü SAĞLAMAK ZORUNDA. `tests/unit/rate-limit.test.ts` içindeki
 * uyum testi bunu derleme zamanında sabitler.
 */
export interface LockoutClient {
  user: {
    update(args: { where: { id: string }; data: { lockedUntil: Date } }): Promise<unknown>;
  };
  auditLog: {
    create(args: {
      data: {
        actorId?: string | null;
        actorEmailHash?: string | null;
        action: AuditAction;
        entity: string;
        entityId?: string | null;
        diff?: Record<string, AuditDiffValue>;
        ip?: string | null;
      };
    }): Promise<unknown>;
  };
}

/** Başarısızlıkları sayan işlev — Backend'in `countRecentFailures`'ı enjekte edilir. */
export type CountRecentFailures = (
  filter: { ip?: string; emailHash?: string },
  since: Date,
) => Promise<number>;

export interface LockoutDeps {
  countRecentFailures: CountRecentFailures;
  client: LockoutClient;
}

export interface EvaluateLockoutInput {
  /** İstemci IP'si. §8.4 sayımı IP başınadır. */
  ip: string;
  /** §8.20 — ham e-posta değil, özeti. */
  emailHash: string;
  /**
   * Kilitlenecek kullanıcı. Var olmayan bir e-posta denendiyse `null` —
   * o durumda yazılacak bir `User` kaydı yoktur.
   */
  userId: string | null;
}

export type LockoutDecision =
  | { locked: false; failures: number }
  | { locked: true; failures: number; lockedUntil: Date; applied: boolean };

/**
 * BAŞARISIZ bir giriş denemesinden SONRA çağrılır ve §8.4'ü uygular.
 *
 * ÇAĞRI SIRASI ÖNEMLİ: Backend'in `recordLoginAttempt` çağrısı bu fonksiyondan
 * ÖNCE tamamlanmış olmalı. Aksi hâlde tetikleyen denemenin kendisi sayıma
 * girmez ve kilit bir deneme geç uygulanır — yani 5 yerine 6'da.
 *
 * ASLA FIRLATMAZ. Gerekçe `recordLoginAttempt` ile aynı: denetim/kilit yazımının
 * çökmesi giriş akışını 500'e düşürmemeli. Ancak sessizce yutmaz da — yazım
 * başarısız olursa `applied: false` döner ve olay loga yazılır, böylece
 * "kilit uygulandı sanılıp uygulanmamış olması" çağıran tarafından görülebilir.
 */
export async function applyLockoutPolicy(
  input: EvaluateLockoutInput,
  deps: LockoutDeps,
  now: Date = new Date(),
): Promise<LockoutDecision> {
  let failures: number;

  try {
    failures = await deps.countRecentFailures({ ip: input.ip }, rateLimitWindowStart(now));
  } catch (error) {
    console.error(
      '[security] başarısız deneme sayımı okunamadı:',
      error instanceof Error ? error.message : error,
    );
    // Sayamıyorsak kilitleyemeyiz; akışı bozmadan devam et.
    return { locked: false, failures: 0 };
  }

  if (failures < LOGIN_RATE_LIMIT.maxFailures) {
    return { locked: false, failures };
  }

  const lockedUntil = lockExpiresAt(now);

  // Var olmayan bir e-posta denendiyse kilitlenecek kayıt yok. Sayım yine de
  // yapıldı; karar raporlanır ama uygulanamaz.
  if (!input.userId) {
    return { locked: true, failures, lockedUntil, applied: false };
  }

  try {
    await deps.client.user.update({
      where: { id: input.userId },
      data: { lockedUntil },
    });
  } catch (error) {
    console.error(
      '[security] hesap kilidi yazılamadı:',
      error instanceof Error ? error.message : error,
    );
    return { locked: true, failures, lockedUntil, applied: false };
  }

  await writeLockAuditLog(input, { failures, lockedUntil }, deps.client);

  return { locked: true, failures, lockedUntil, applied: true };
}

/**
 * Kilit olayını `AuditLog`'a yazar — ADR-022.
 *
 * `action: UPDATE` seçildi: `AuditAction` içinde bir `LOCK` değeri YOK ve
 * eklemek migration gerektirir. Olay özünde bir `User` güncellemesidir
 * (`lockedUntil` yazılır), dolayısıyla §8.19'un kapsamına zaten bu sıfatla
 * girer. Ayırt edici bilgi `diff.reason` alanındadır.
 *
 * `actorId` BİLEREK `null`: kilidi uygulayan, kimliği doğrulanmamış bir
 * istektir — hesabın sahibi değil. Kilitlenen hesabı `entityId` gösterir,
 * denemenin hangi e-postaya yapıldığını `actorEmailHash` (§8.20 — ham e-posta
 * değil). Buraya `input.userId` yazmak, saldırıya uğrayan kullanıcıyı olayın
 * FAİLİ gibi gösterirdi.
 */
async function writeLockAuditLog(
  input: EvaluateLockoutInput,
  outcome: { failures: number; lockedUntil: Date },
  client: LockoutClient,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorId: null,
        actorEmailHash: input.emailHash,
        action: AuditAction.UPDATE,
        entity: 'User',
        entityId: input.userId,
        /**
         * §8.20 — `diff` içinde ham e-posta, şifre veya jeton YOK.
         * Yalnızca kararın kendisi ve hangi eşikle verildiği.
         */
        diff: {
          lockedUntil: outcome.lockedUntil.toISOString(),
          reason: 'LOGIN_RATE_LIMIT',
          failedAttempts: outcome.failures,
          windowMinutes: LOGIN_RATE_LIMIT.windowMinutes,
          lockMinutes: LOGIN_RATE_LIMIT.lockMinutes,
        },
        ip: input.ip,
      },
    });
  } catch (error) {
    // Kilit YAZILDI ama denetim kaydı yazılamadı. Kilidi geri almıyoruz —
    // güvenlik kararı denetim kaydından daha önemli.
    console.error(
      '[security] kilit denetim kaydı yazılamadı:',
      error instanceof Error ? error.message : error,
    );
  }
}
