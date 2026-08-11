import { getToken } from 'next-auth/jwt';

import { readTwoFactorClaim, type TwoFactorClaim } from './two-factor';

/**
 * Ara katman için oturum okuyucu — §8.5.
 *
 * NEDEN `auth()` DEĞİL: `@/server/auth` içe aktarıldığı anda zincir
 * `authenticateUser` → `@/server/db` → Prisma + `pg` üzerinden Node API'lerine
 * iner. Ara katman **Edge çalışma zamanında** koşar; bu zincir orada
 * yüklenemez. `getToken` ise `jose` üzerinden Web Crypto kullanır ve Edge'de
 * çalışır.
 *
 * BU BİR "ÇEREZ VAR MI" KONTROLÜ DEĞİLDİR: `getToken` jetonu `AUTH_SECRET` ile
 * TÜREYEN anahtarla çözer. İmzası/şifrelemesi tutmayan, süresi geçmiş veya
 * uydurulmuş bir çerez `null` döner. Yine de §8.6 geçerlidir — aşağıdaki
 * uyarıya bakın.
 */

/**
 * Çerez adları — `src/server/auth.ts` ile BİREBİR aynı olmak ZORUNDA.
 *
 * Sapma sessizdir ve iki yönde de kötüdür: ad yanlışsa `getToken` her zaman
 * `null` döner ve giriş yapmış kullanıcı sonsuza dek `/giris`'e atılır; ters
 * durumda koruma hiç çalışmaz. Üstelik hiçbir hata mesajı çıkmaz.
 *
 * Bu yüzden `tests/unit/session.test.ts` `auth.ts` KAYNAĞINI okuyup adların
 * eşleştiğini doğrular — T-013a'nın dersi: "yapılandırma gerçekten uygulandı mı"
 * sorusu varsayımla değil, kanıtla cevaplanır.
 *
 * Ayrıca `getToken`'ın türettiği şifreleme tuzu (salt) varsayılan olarak çerez
 * ADIDIR; yani ad yanlışsa çözme de başarısız olur.
 */
export const SESSION_COOKIE_NAME_DEV = 'authjs.session-token';
export const SESSION_COOKIE_NAME_PROD = '__Secure-authjs.session-token';

export function sessionCookieName(isProduction: boolean): string {
  return isProduction ? SESSION_COOKIE_NAME_PROD : SESSION_COOKIE_NAME_DEV;
}

export interface SessionInfo {
  /** Auth.js JWT'sinde kullanıcı kimliği `sub` alanındadır. */
  userId: string;
  /**
   * §8.1 — hesapta 2FA kurulu mu?
   *
   * `null` = bilgi jetonda YOK (alanı taşımayan eski jeton). `false`'tan ayrı
   * tutulur; gerekçesi `two-factor.ts` → `requiresTwoFactorSetup`.
   *
   * VERİTABANINA BAKILMAZ: ara katman Edge'de koşuyor ve Prisma orada
   * yüklenemiyor (T-014/K1). Bilgi jetondan okunur.
   */
  twoFactorEnabled: TwoFactorClaim;
}

export interface ReadSessionOptions {
  isProduction: boolean;
  /** `AUTH_SECRET`. Yoksa oturum doğrulanamaz. */
  secret: string | undefined;
}

/**
 * Geçerli bir oturum varsa kimliğini döner, yoksa `null`.
 *
 * **KAPALI YÖNDE BAŞARISIZ OLUR (fail closed).** `AUTH_SECRET` tanımsızsa veya
 * çözme sırasında beklenmedik bir hata olursa `null` döner — yani erişim
 * REDDEDİLİR. Ters tasarım (hata durumunda içeri almak) yapılandırma hatasını
 * sessiz bir yetkilendirme atlatmasına çevirirdi.
 */
export async function readSession(
  request: Request,
  options: ReadSessionOptions,
): Promise<SessionInfo | null> {
  if (!options.secret) {
    // Üretimde bu bir yapılandırma hatasıdır; sessizce içeri almak yerine
    // gürültü çıkarıp reddediyoruz.
    console.error('[security] AUTH_SECRET tanımsız — oturum doğrulanamıyor, erişim reddedildi.');
    return null;
  }

  const cookieName = sessionCookieName(options.isProduction);

  try {
    const token = await getToken({
      req: request,
      secret: options.secret,
      cookieName,
      secureCookie: options.isProduction,
      // `salt` verilmezse `cookieName` kullanılır — `auth.ts` de aynı adı
      // kullandığı için türetilen anahtar eşleşir.
    });

    const userId = typeof token?.sub === 'string' ? token.sub : null;
    if (!userId) return null;

    return { userId, twoFactorEnabled: readTwoFactorClaim(token) };
  } catch (error) {
    // §8.20 — jetonun kendisi ASLA loglanmaz.
    console.error(
      '[security] oturum jetonu çözülemedi:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
