/**
 * Güvenlik başlıkları — TEK NOKTA.
 *
 * PROGRAM.md §8.7 (panel `noindex`), §8.12 (HSTS), §8.14 (çerçeveleme, MIME,
 * yönlendiren, izinler). Başka hiçbir dosyada güvenlik başlığı yazılmaz;
 * `middleware.ts` yalnızca burayı okur ve uygular.
 *
 * BİLEREK EKSİK — F0 kapsamı dışı, T-004 görev kartında yazılı:
 *   - `Content-Security-Policy` (§8.13, nonce tabanlı) → F6 / T-060.
 *     React Bits (§5) henüz kurulmadı; bileşenlerin inline script/style üretip
 *     üretmediği bilinmeden yazılacak bir CSP ya F2'de çöker ya da `unsafe-inline`
 *     tavizi verdirir. STATUS.md R1 bunu izliyor.
 *   - Oturum/yetki kontrolü (§8.5–8.6) → F1 / T-014. Auth.js henüz yok;
 *     buradaki koruma şu an YALNIZCA yol tabanlıdır ve kimlik doğrulamaz.
 *
 * Bu modül saf (pure) tutulur: `next/server` dahil hiçbir çalışma zamanına
 * bağımlı değildir, bu yüzden DB'siz ve `.env`'siz test edilebilir.
 */

/**
 * Panel kökleri. Bir yol bunlardan biriyle *segment sınırında* eşleşiyorsa
 * panel sayılır (§8.5).
 */
export const PANEL_PATH_PREFIXES = ['/panel', '/api/v1/panel'] as const;

/**
 * Yolun panele ait olup olmadığı.
 *
 * Düz `startsWith` KULLANILMAZ: `/paneller` veya `/panel-demo` gibi bir public
 * rota `/panel` ile başlar ama panel değildir. Böyle bir yol yanlışlıkla
 * `noindex` alırsa sessizce arama sonuçlarından düşer. Eşleşme yalnızca yolun
 * tam kendisi ya da ardından `/` gelen hâli için geçerlidir.
 */
export function isPanelPath(pathname: string): boolean {
  return PANEL_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * §8.14 — her yanıtta bulunan taban başlıklar.
 *
 * Yalnızca panele değil public tarafa da uygulanır: tıklama hırsızlığı
 * (clickjacking) ve MIME koklama (sniffing) public sayfalar için de geçerli
 * risklerdir, panelle sınırlı değildir.
 */
export const BASELINE_SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  // Sayfa hiçbir yerde çerçevelenemez — panelde tıklama hırsızlığına karşı.
  'X-Frame-Options': 'DENY',
  // Tarayıcı `Content-Type`'ı tahmin etmeye çalışmasın (yüklenen dosyalar için kritik).
  'X-Content-Type-Options': 'nosniff',
  // Dış siteye yalnızca köken gider; panel yolları yönlendirende sızmaz.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

/**
 * §8.14 — kısıtlı `Permissions-Policy`.
 *
 * Politika reddetme (deny-by-default) mantığıyla yazıldı: v1'de bu
 * yeteneklerin hiçbirine ihtiyaç yok (§1.2 kapsam dışı listesi), bu yüzden
 * hepsi kapatılır. Bir özellik gerektiğinde buraya açıkça eklenir.
 */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

/**
 * §8.7 — panel yanıtları arama motorlarına kapalı.
 * `robots.txt`'teki `Disallow` yalnızca bir ricadır; başlık bağlayıcıdır.
 */
export const PANEL_ROBOTS_HEADER = 'noindex, nofollow';

/**
 * §8.12 — HSTS.
 *
 * `preload` BİLEREK YOK. Preload listesine girmek pratikte geri alınamaz
 * (çıkış aylar sürer) ve tüm alt alan adlarının kalıcı HTTPS olmasını şart
 * koşar. `panel.` alt alan adı kararı (STATUS.md Q1) henüz verilmedi.
 * `preload` F7'de, domain ve SSL kesinleştikten sonra eklenir (T-072).
 */
export const HSTS_VALUE = 'max-age=63072000; includeSubDomains';

export interface SecurityHeaderContext {
  /** İstek yolu — `request.nextUrl.pathname`. */
  pathname: string;
  /** `NODE_ENV === 'production'` mı? */
  isProduction: boolean;
  /** İstek HTTPS üzerinden mi geldi? */
  isHttps: boolean;
}

/**
 * Bir istek için uygulanacak başlık kümesi.
 *
 * HSTS yalnızca üretimde VE HTTPS'te eklenir: yerelde `http://localhost`
 * üzerinde gönderilirse tarayıcı alan adını kalıcı olarak HTTPS'e sabitler ve
 * geliştirme ortamı erişilemez hâle gelir — temizlemesi elle tarayıcı ayarı
 * gerektirir.
 */
export function buildSecurityHeaders(context: SecurityHeaderContext): Record<string, string> {
  const headers: Record<string, string> = {
    ...BASELINE_SECURITY_HEADERS,
    'Permissions-Policy': PERMISSIONS_POLICY,
  };

  if (context.isProduction && context.isHttps) {
    headers['Strict-Transport-Security'] = HSTS_VALUE;
  }

  if (isPanelPath(context.pathname)) {
    headers['X-Robots-Tag'] = PANEL_ROBOTS_HEADER;
  }

  return headers;
}

/**
 * İsteğin HTTPS olup olmadığı.
 *
 * Coolify (§13.3) ters vekil sunucu olarak TLS'i sonlandırır; uygulamaya istek
 * düz HTTP olarak ulaşır ve gerçek şema `x-forwarded-proto` ile taşınır.
 *
 * Bu başlık istemci tarafından uydurulabilir — ancak buradaki tek etkisi HSTS
 * başlığının EKLENMESİdir. Sahte `https` değeri korumayı zayıflatmaz (düz HTTP
 * üzerinden gelen HSTS'i tarayıcı zaten yok sayar), sahte `http` değeri ise
 * yalnızca kendi isteğinden HSTS'i düşürür. Yani burada güven sınırı yoktur.
 *
 * NOT: Hız sınırlama ve giriş kilidi için istemci IP'si okunurken durum
 * TAMAMEN farklıdır — orada `x-forwarded-for` gerçek bir güven sınırıdır ve
 * doğrudan okunması §8.4/§8.15/§8.16'yı delerdi. O yardımcı T-014'te,
 * güvenilir vekil sayısı bilinerek yazılacak.
 */
export function isHttpsRequest(forwardedProto: string | null, urlProtocol: string): boolean {
  if (forwardedProto) {
    // Vekil zinciri virgülle ayrılmış liste bırakabilir; ilki istemciye en yakın olandır.
    const first = forwardedProto.split(',')[0]?.trim().toLowerCase();
    return first === 'https';
  }

  return urlProtocol === 'https:';
}
