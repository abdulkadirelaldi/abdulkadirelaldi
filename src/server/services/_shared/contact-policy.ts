import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * İletişim formu POLİTİKASI — §8.15.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `src/lib/security/**` İÇİNDE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O dizin Güvenlik ajanının ve içindeki `rate-limit.ts` §8.4'ün — yani GİRİŞ'in
 * politikasıdır. §8.15 ondan üç noktada AYRIŞIR ve ortak bir sayaç iki kuralı
 * da bozardı:
 *
 *  1. SAYILAN ŞEY farklı. §8.4 BAŞARISIZ denemeleri sayar (`LoginAttempt`);
 *     §8.15 BAŞARILI gönderimleri sayar — burada "başarısız gönderim" diye bir
 *     kavram yok, mesaj ya kaydedilir ya reddedilir.
 *  2. KİMLİK YOK. §8.4'ün sonucu bir `User` kaydını kilitlemektir; iletişim
 *     formunda kilitlenecek hesap yoktur. Ortak sayaç, bir ziyaretçinin form
 *     doldurmasının panel hesabını kilitlemesi gibi saçma bir bağ kurardı.
 *  3. EŞİK VE PENCERE farklı (15 dakikada 5 ↔ saatte 3) ve aşımın sonucu
 *     farklı (15 dk hesap kilidi ↔ yalnızca o isteğin reddi).
 *
 * Bu modül `src/lib/security/**` içinden HİÇBİR ŞEY yeniden yazmaz; oradaki
 * politikaya da dokunmaz. Yalnızca kendi alanında kendi kuralını tanımlar.
 *
 * Modül SAFTIR (`next/*` içe aktarmaz, veritabanına dokunmaz, `process.env`
 * okumaz) — kapı testinin (`runtime-bagimsizligi`) saf tarafında kalır ve
 * sırlar dışarıdan parametre olarak girer, böylece testte gerçek `AUTH_SECRET`
 * gerekmez.
 */

/* ===========================================================================
 * HIZ SINIRI
 * ======================================================================== */

/**
 * §8.15 — "İletişim formu: IP başına saatte 3".
 *
 * EŞİK VE PENCERE TEK YERDE, `LOGIN_RATE_LIMIT`'in gerekçesiyle aynı sebeple:
 * ikisi ayrı dosyada tutulursa hangi sayının yürürlükte olduğu koda bakmadan
 * söylenemez ve §8.15 denetlenemez hâle gelir.
 *
 * SAYAÇ NEREDE DURUYOR: ayrı bir tabloda değil, `ContactMessage`'ın kendisinde.
 * `ContactMessage.ip` zaten var (§8/KVKK gereği 90 gün sonra temizleniyor) ve
 * sayılacak şey ile saklanacak şey AYNI KAYIT. Ayrı bir sayaç tablosu ikinci
 * bir yazma yolu, ikinci bir temizlik işi ve iki kaydın birbirinden sapabildiği
 * bir durum üretirdi.
 *
 * T-015b'de kurulum hız sınırı için `AuditLog` seçilmişti çünkü orada sayılacak
 * olayın kendi tablosu yoktu ve kimlik vardı. Burada tersi geçerli: kimlik yok,
 * ama olayın tablosu var.
 *
 * REDDEDİLEN kayıtlar sayıya GİRMEZ — kaydedilmezler. Yani sınır, "saatte 3
 * kabul" demektir; reddedilen bir istek pencereyi uzatmaz. Bu bilinçli: aşımda
 * hesap kilitlenmiyor, yalnızca o istek reddediliyor (§8.4'ten farkı bu).
 */
export const CONTACT_RATE_LIMIT = {
  /** Pencere içinde KABUL EDİLEN en fazla mesaj. Bu sayıya ulaşılmışsa yeni istek reddedilir. */
  maxPerWindow: 3,
  /** Geriye dönük sayım penceresi — §8.15 "saatte". */
  windowMinutes: 60,
} as const;

const MS_PER_MINUTE = 60_000;

/** Sayım penceresinin başlangıcı — bu andan öncesi dikkate alınmaz. */
export function contactRateWindowStart(now: Date): Date {
  return new Date(now.getTime() - CONTACT_RATE_LIMIT.windowMinutes * MS_PER_MINUTE);
}

/** Pencere içindeki kabul sayısı sınırı doldurmuş mu. */
export function isContactRateExceeded(acceptedInWindow: number): boolean {
  return acceptedInWindow >= CONTACT_RATE_LIMIT.maxPerWindow;
}

/* ===========================================================================
 * ZAMAN TUZAĞI — §8.15
 * ======================================================================== */

/**
 * §8.15'in ikinci yarısı: "zaman tuzağı".
 *
 * MEKANİZMA: form ÇİZİLDİĞİNDE sunucu imzalı bir jeton verir (`GET`), form
 * GÖNDERİLDİĞİNDE jeton geri gelir ve sunucu aradaki süreyi ölçer. İnsan
 * okuyup yazar; bot anında gönderir.
 *
 * NEDEN İMZALI JETON, NEDEN DÜZ BİR ZAMAN DAMGASI DEĞİL: istemcinin gönderdiği
 * çıplak bir `renderedAt` alanı hiçbir şey ölçmez — bot oraya istediği değeri
 * yazar. İmza, damganın SUNUCU tarafından verildiğini kanıtlar.
 *
 * NEDEN DURUMSUZ (jeton veritabanına yazılmıyor): tek kullanımlık jeton için
 * her form çiziminde bir satır yazmak, ziyaret sayısı kadar yazma ve ayrı bir
 * temizlik işi demektir — üstelik jetonu asıl sınırlayan şey hız sınırıdır.
 * BUNUN AÇIK BEDELİ: bir jeton `maxAgeMinutes` boyunca tekrar kullanılabilir.
 * Yani zaman tuzağı "aynı jetonla tekrar gönderme"yi DEĞİL, "anında doldurma"yı
 * yakalar; tekrarı hız sınırı keser. İkisi birlikte §8.15'i karşılıyor.
 *
 * SONUÇ REDDETMEK DEĞİL, İŞARETLEMEK. Bkz. `CONTACT_SPAM_SIGNAL_SCORES`.
 */
export const CONTACT_TIME_TRAP = {
  /**
   * Formun çizilmesi ile gönderilmesi arasında geçmesi gereken asgari süre.
   *
   * 3 saniye: en kısa gerçek doldurma (yapıştır-yapıştır-gönder) bile bunun
   * üstünde kalır, ama otomatik gönderim altında kalır. Daha yüksek bir değer
   * (10 sn+) hızlı yazan gerçek kullanıcıyı işaretlemeye başlardı.
   */
  minFillSeconds: 3,
  /**
   * Jetonun geçerlilik süresi. Bir sekmenin açık unutulması olağan olduğu için
   * cömert; asıl işi jetonun sonsuza dek yeniden kullanılmasını engellemek.
   */
  maxAgeMinutes: 120,
} as const;

/** Jeton biçimi: `v1.<ms>.<imza>`. Sürüm öneki, biçim değişirse eski jetonları geçersiz kılar. */
const TOKEN_VERSION = 'v1';
/**
 * `AUTH_SECRET`'ten TÜRETİLMİŞ ayrı bir anahtar kullanılır — sır doğrudan
 * kullanılmaz. Alan ayrımı (domain separation): buradan sızacak bir imza,
 * oturum çerezleri için kullanılan anahtar hakkında bilgi vermez.
 *
 * Yeni bir ortam değişkeni EKLENMEDİ (§12 listesi büyümüyor): tek kullanıcılı
 * bir kurulumda ikinci bir sırrı üretimde ayarlamayı unutmak, formu sessizce
 * bozardı.
 */
const TOKEN_KEY_INFO = 'iletisim-form-token/v1';

function deriveTokenKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(TOKEN_KEY_INFO, 'utf8').digest();
}

function sign(issuedAtMs: number, secret: string): string {
  return createHmac('sha256', deriveTokenKey(secret))
    .update(`${TOKEN_VERSION}:${issuedAtMs}`, 'utf8')
    .digest('hex');
}

/** Formun çizildiği anı imzalar. `GET /api/v1/iletisim` bunu döner. */
export function issueFormToken(now: Date, secret: string): string {
  const issuedAt = now.getTime();
  return `${TOKEN_VERSION}.${issuedAt}.${sign(issuedAt, secret)}`;
}

export type FormTokenVerdict =
  | { status: 'ok'; elapsedSeconds: number }
  /** Jeton yok, biçimi bozuk veya imza tutmuyor — kaynağı doğrulanamıyor. */
  | { status: 'unverifiable' }
  /** İmza geçerli ama çok hızlı gönderilmiş — zaman tuzağı. */
  | { status: 'too-fast'; elapsedSeconds: number }
  /** İmza geçerli ama jeton eskimiş; sekme uzun süre açık kalmış olabilir. */
  | { status: 'expired'; elapsedSeconds: number };

/**
 * Jetonu doğrular ve geçen süreyi ölçer.
 *
 * İmza karşılaştırması `timingSafeEqual` ile: sabit zamanlı olmayan bir
 * karşılaştırma, imzayı bayt bayt tahmin etmeye açık kapı bırakırdı.
 */
export function verifyFormToken(
  token: string | undefined | null,
  now: Date,
  secret: string,
): FormTokenVerdict {
  if (typeof token !== 'string') return { status: 'unverifiable' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { status: 'unverifiable' };

  const issuedAt = Number(parts[1]);
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return { status: 'unverifiable' };

  const provided = Buffer.from(parts[2] ?? '', 'utf8');
  const expected = Buffer.from(sign(issuedAt, secret), 'utf8');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { status: 'unverifiable' };
  }

  const elapsedMs = now.getTime() - issuedAt;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Gelecekten gelen damga: saat kayması ya da kurcalama. İmza geçerli olsa da
  // "yeterince bekledi" sayılamaz — en katı yorum uygulanır.
  if (elapsedMs < 0) return { status: 'too-fast', elapsedSeconds };
  if (elapsedSeconds < CONTACT_TIME_TRAP.minFillSeconds) {
    return { status: 'too-fast', elapsedSeconds };
  }
  if (elapsedMs > CONTACT_TIME_TRAP.maxAgeMinutes * MS_PER_MINUTE) {
    return { status: 'expired', elapsedSeconds };
  }

  return { status: 'ok', elapsedSeconds };
}

/* ===========================================================================
 * SPAM PUANI — ADR-020/C11
 * ======================================================================== */

/**
 * `ContactMessage.spamScore` DOLDURULUYOR ve nasıl doldurulduğu burada.
 *
 * Alanı boş bırakmak da bir seçenekti; reddedildi. `honeypotHit` yalnızca TEK
 * sinyali taşır (honeypot dolu mu), oysa üç ayrı sinyal var ve panelde mesajı
 * inceleyen kişi hangisinin tetiklendiğini bilmek ister. Tek bir boolean,
 * "honeypot temiz ama jetonsuz ve 0 saniyede gönderilmiş" mesajı ile gerçek bir
 * müşteriyi ayırt edilemez kılardı.
 *
 * Puan, tetiklenen sinyallerin TOPLAMIDIR — model yok, sezgisel ağırlık yok:
 * panelde puan görülünce hangi sinyallerin toplandığı bu tablodan geri okunur.
 */
export const CONTACT_SPAM_SIGNAL_SCORES = {
  /** Honeypot dolu. Gerçek kullanıcı bu alanı GÖREMEZ; tek başına yeterli kanıt. */
  honeypotFilled: 60,
  /** Zaman tuzağı: form asgari süreden hızlı gönderilmiş. */
  tooFast: 30,
  /**
   * Jeton yok veya imza tutmuyor. Tek başına spam saymaya YETMİYOR: jetonu
   * getiren istek ağ hatasıyla düşmüş olabilir ve gerçek bir müşteriyi bu
   * yüzden spam'e atmak, ADR-020/C11'in korumaya çalıştığı şeyi bozardı.
   */
  tokenUnverifiable: 20,
} as const;

/**
 * Bu puana ULAŞAN mesaj `isSpam` işaretlenir.
 *
 * 50 seçildi: honeypot (60) tek başına aşar, zaman tuzağı (30) tek başına
 * aşmaz ama jetonsuzlukla birleşince (50) aşar. `expired` jeton hiç puan
 * getirmez — açık unutulmuş bir sekme spam kanıtı değildir.
 */
export const CONTACT_SPAM_THRESHOLD = 50;

export interface SpamSignalInput {
  honeypotFilled: boolean;
  tokenVerdict: FormTokenVerdict;
}

export interface SpamAssessment {
  spamScore: number;
  isSpam: boolean;
  honeypotHit: boolean;
  /** Tetiklenen sinyal adları — YALNIZCA sunucu logu için (§8.20: ham e-posta yok). */
  signals: string[];
}

/** Sinyalleri toplar. Karar verir ama HİÇBİR ŞEYİ REDDETMEZ — mesaj yine kaydedilir. */
export function assessContactSpam(input: SpamSignalInput): SpamAssessment {
  const signals: string[] = [];
  let spamScore = 0;

  if (input.honeypotFilled) {
    spamScore += CONTACT_SPAM_SIGNAL_SCORES.honeypotFilled;
    signals.push('honeypotFilled');
  }
  if (input.tokenVerdict.status === 'too-fast') {
    spamScore += CONTACT_SPAM_SIGNAL_SCORES.tooFast;
    signals.push('tooFast');
  }
  if (input.tokenVerdict.status === 'unverifiable') {
    spamScore += CONTACT_SPAM_SIGNAL_SCORES.tokenUnverifiable;
    signals.push('tokenUnverifiable');
  }

  return {
    spamScore,
    isSpam: spamScore >= CONTACT_SPAM_THRESHOLD,
    honeypotHit: input.honeypotFilled,
    signals,
  };
}
