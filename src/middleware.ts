import { NextResponse, type NextRequest } from 'next/server';

import { buildSecurityHeaders, isHttpsRequest } from '@/lib/security/headers';

/**
 * Kenar (edge) ara katmanı — PROGRAM.md §8.5, §8.7, §8.12, §8.14.
 *
 * KONUM NOTU: Proje `src/` dizini kullandığı için Next.js bu dosyayı
 * `src/middleware.ts` yolunda arar — depo kökünde duran bir `middleware.ts`
 * sessizce yok sayılır ve tüm başlıklar uygulanmamış olurdu. Bu, hata vermeden
 * kaybolan bir koruma olacağı için `tests/e2e/security-headers.spec.ts` gerçek
 * sunucu yanıtı üzerinden başlıkların var olduğunu doğrular.
 *
 * ŞU ANDA NE YAPAR:
 *   - Her yanıta §8.14 taban güvenlik başlıklarını ekler
 *   - Üretim + HTTPS ise HSTS ekler (§8.12)
 *   - Panel yollarına `X-Robots-Tag: noindex, nofollow` ekler (§8.7)
 *
 * ŞU ANDA NE YAPMAZ — ve bu bilinçlidir:
 *   - KİMLİK DOĞRULAMAZ. Auth.js F1'de gelecek (T-014). Bu ara katman şu an
 *     yalnızca yol tabanlıdır; `/panel` hâlâ herkese açıktır. Tek işlevi,
 *     panel henüz korunmadan arama motorlarına düşmesini engellemektir.
 *   - CSP yazmaz (§8.13) — F6 / T-060, STATUS.md R1.
 *   - Hız sınırlaması yapmaz (§8.4, §8.15–16) — T-014 ve T-027.
 *
 * §8.6 hatırlatması: Bu ara katman kimlik doğrulamaya başladığında bile, her
 * Server Action kendi `auth()` kontrolünü ayrıca yapar. Server Action'lar
 * matcher'dan bağımsız birer HTTP ucudur; ara katmana güvenilmez.
 */
export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  const headers = buildSecurityHeaders({
    pathname: request.nextUrl.pathname,
    isProduction: process.env.NODE_ENV === 'production',
    isHttps: isHttpsRequest(
      request.headers.get('x-forwarded-proto'),
      request.nextUrl.protocol,
    ),
  });

  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  return response;
}

/**
 * Matcher — kapsayıcı, birkaç açık istisnayla.
 *
 * NEDEN YALNIZCA `/panel/*` DEĞİL: §8.14 başlıkları public tarafta da
 * gereklidir ve `next.config.ts` ortak dosya olduğu için (T-004 kapsam dışı)
 * `headers()` üzerinden verilemez. Matcher `/panel/*` ve `/api/v1/panel/*`
 * yollarını kapsar (§8.5 şartı) ve ek olarak geri kalan sayfaları da taban
 * başlıklarla korur. `X-Robots-Tag` yine YALNIZCA panel yollarına eklenir —
 * ayrımı `isPanelPath()` yapar.
 *
 * DIŞARIDA KALANLAR:
 *   - `/api/v1/health` — Coolify sağlık kontrolü ve Uptime Kuma (§13.6–13.7)
 *     bu ucu kimliksiz ve çok sık yoklar; ara katmanı her yoklamada çalıştırmak
 *     gereksiz. Backend T-003b notu T2 bu ucun matcher dışında kalmasını
 *     açıkça şart koştu. Uç kendi `Cache-Control` ve `X-Robots-Tag`
 *     başlıklarını zaten kendisi yazıyor.
 *   - `_next/static`, `_next/image` — derleme çıktısı, Next kendi başlıklarını verir
 *   - Statik dosyalar ve SEO dosyaları (`favicon.ico`, `robots.txt`, `sitemap.xml`,
 *     `rss.xml`, görseller, fontlar) — her istekte ara katman çalıştırmak LCP'ye
 *     (K1) bedel yazar, karşılığında güvenlik kazancı yok
 *
 * Desen `tests/unit/middleware-matcher.test.ts` içinde birebir dosyadan okunup
 * doğrulanır; buradaki metin ile testin beklentisi kayamaz.
 */
export const config = {
  matcher: [
    '/((?!api/v1/health(?:/|$)|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|rss\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|map)$).*)',
  ],
};
