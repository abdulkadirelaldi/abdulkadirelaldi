import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { loginSchema } from '@/lib/schemas';

import {
  applyLoginClaims,
  authenticateUser,
  extractClientIp,
  refreshTwoFactorClaim,
} from './auth/credentials';
import { getTotpState } from './services/user';

/**
 * Auth.js v5 yapılandırması — PROGRAM.md §8.1–8.6, ADR-013.
 *
 * ADR-013 GEREĞİ:
 *   - `session.strategy = 'jwt'`. Credentials provider Auth.js v5'te YALNIZCA
 *     JWT ile çalışır; PrismaAdapter'ın DB oturumu bu akışla kullanılamaz.
 *   - PrismaAdapter YOK, `Account`/`Session` modelleri YOK.
 *
 * §8.6: `auth()` her Server Action ve Server Component'ten ayrıca çağrılır —
 * middleware'e GÜVENİLMEZ. Bu dosya o yardımcıyı ihraç eder.
 */

/**
 * §8.3 — oturum ömrü **24 saat** (ADR-035/A, eskiden 7 gündü).
 *
 * KISALTMANIN SEBEBİ BİR MARUZİYET PENCERESİ: JWT stratejisinde (ADR-013)
 * sunucuda oturum kaydı yok, yani dağıtılmış bir jeton süresi dolana kadar
 * geçerli kalır ve ÇALINMIŞ bir jeton da öyle. 7 günden 24 saate inmek o
 * pencereyi %85 daraltıyor — tek sabit, SIFIR sorgu, hiçbir ölçüm borcu yok.
 *
 * Tek kullanıcılı bir panelde bedeli günde bir giriş VE bir TOTP kodu (§8.1
 * gereği 2FA zorunlu, yani her giriş bir kod girişi demek). Kabul edildi.
 *
 * ⚠️ BU SABİT İKİ YERDE KULLANILIYOR — çerez `maxAge` ve oturum `maxAge` (JWT
 * `exp` ondan türer). İkisi TEK KAYNAKTAN beslendiği için sapamazlar; ayrı ayrı
 * yazılsaydı biri güncellenip diğeri kalınca tutarsız bir ömür çıkardı: çerez
 * ölmüş ama jeton geçerli, ya da tersi. `tests/unit/session-omru.test.ts` ikisinin
 * de bu sabitten geldiğini kaynaktan doğruluyor.
 *
 * (A) katmanı TEK BAŞINA anlamlıdır ve (B)'den bağımsızdır — ADR-035.
 */
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const useSecureCookies = process.env.NODE_ENV === 'production';

export const { handlers, auth, signIn, signOut } = NextAuth({
  /**
   * `trustHost` üretimde ters vekil (Coolify) arkasında çalışmak için gerekli;
   * aksi hâlde Auth.js `Host` başlığını doğrulayamaz ve isteği reddeder (§13.3).
   */
  trustHost: true,

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  /**
   * §8.3 — çerez bayrakları AÇIKÇA verilir.
   *
   * Auth.js varsayılanları bugün bunlarla örtüşüyor olabilir ama bir güvenlik
   * kabul şartını kütüphane varsayılanına bırakmak, sürüm notlarına bağlı hale
   * getirmek demektir (T-013a'da otplib'de tam bu sınıf hata çıktı).
   */
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
        totpCode: { label: 'Doğrulama kodu', type: 'text' },
      },

      async authorize(credentials, request) {
        // §8.8 — her girdi Zod ile doğrulanır. Şema T-011'de yazıldı, yeniden yazılmaz.
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          // Biçimsel hata da "geçersiz kimlik bilgisi"dir; ayrım sızdırmaz.
          throw new CredentialsError('INVALID_CREDENTIALS');
        }

        const result = await authenticateUser({
          email: parsed.data.email,
          password: parsed.data.password,
          totpCode: parsed.data.totpCode,
          ip: extractClientIp(request),
        });

        if (!result.ok) {
          throw new CredentialsError(result.reason);
        }

        // Bu nesne JWT'ye taşınır — HASSAS ALAN KOYULMAZ.
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          // §8.1 kapısının okuduğu alan (BULGU-008). Yeni sorgu yok:
          // `authenticateUser` kullanıcı kaydını zaten okumuştu.
          tfa: result.user.twoFactorEnabled,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * JWT içeriği ASGARİ tutulur (§8.20).
     * `sub` zaten kullanıcı kimliğini taşır; ek olarak yalnızca görüntüleme için
     * gereken `email` ve `name` konur. Şifre, TOTP durumu, kurtarma kodu sayısı
     * gibi hiçbir hassas alan JWT'ye GİRMEZ — JWT istemcide okunabilir bir çerezdir.
     */
    /**
     * Jeton alanları — mantık `./auth/credentials` içinde, burada yalnızca
     * bağlantı var. Gerekçe: bu dosya `next-auth` import ettiği için Vitest'in
     * node ortamında yüklenemiyor; mantık burada kalsaydı test edilemezdi
     * (T-013b/T3). `getTotpState` ENJEKTE EDİLİYOR, böylece tazeleme yolu
     * veritabanı olmadan test edilebiliyor.
     */
    async jwt({ token, user, trigger }) {
      // GİRİŞ — `user` yalnızca `authorize` başarılı olduğunda dolu gelir.
      if (user) return applyLoginClaims(token, user);

      // KURULUM SONRASI TAZELEME — yalnızca açık `update()` çağrılarında.
      // Normal istek yolunda veritabanına GİDİLMEZ.
      if (trigger === 'update') return refreshTwoFactorClaim(token, getTotpState);

      return token;
    },

    /** Server Component ve Server Action'ların gördüğü nesne. */
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      /*
       * ADR-035/B — `iat` oturuma taşınıyor.
       *
       * BURADA VERİTABANINA GİDİLMİYOR ve bu kasıtlı: karşılaştırmayı bu geri
       * çağrıya koymak, `auth()` çağıran HER yolu (okuma dahil) veritabanına
       * bağlardı ve karşılığında hiçbir okumayı korumazdı — okuma koruması ara
       * katmanda, o da Edge'de ve DB okuyamıyor (T-014/K1).
       *
       * Burada yalnızca jetonun kendi alanı kopyalanıyor; kararı yazma kapısı
       * (`currentActorId`) veriyor.
       */
      session.tokenIssuedAt = typeof token.iat === 'number' ? token.iat : undefined;
      return session;
    },
  },

  pages: {
    signIn: '/giris',
    error: '/giris',
  },

  /**
   * §8.20 — Auth.js'in kendi hata logları e-posta içerebilir.
   * Bu yüzden `error` olayı bilerek daraltılır: yalnızca hata TÜRÜ yazılır.
   */
  logger: {
    error(error) {
      console.error('[auth]', error.name);
    },
    warn(code) {
      console.warn('[auth]', code);
    },
    debug() {
      // Üretimde ve geliştirmede sessiz — debug çıktısı token taşıyabilir.
    },
  },
});

/**
 * `authorize` içinden fırlatılan hata — `code` istemciye bu sınıfla ulaşır.
 *
 * `CredentialsSignin`'İ GENİŞLETMEK ZORUNLUDUR, adı elle set etmek YETMEZ.
 * Auth.js şu kontrolü yapıyor:
 *
 *     if (error instanceof CredentialsSignin) params.set('code', error.code)
 *
 * `name = 'CredentialsSignin'` atanmış düz bir `Error` bu `instanceof`
 * kontrolünü GEÇEMEZ. İlk sürüm böyleydi ve sonucu şuydu: hata
 * `CallbackRouteError`'a sarılıyor, istemciye `error=Configuration` gidiyor,
 * `code` HİÇ GİTMİYORDU. Dört hata kodu ayırt edilemiyor, `TOTP_REQUIRED`
 * ulaşmadığı için ikinci adım hiç açılmıyor ve 2FA'lı kullanıcı giriş
 * yapamıyordu. Sınıf kimliği burada davranışın kendisidir.
 */
class CredentialsError extends CredentialsSignin {
  override code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
