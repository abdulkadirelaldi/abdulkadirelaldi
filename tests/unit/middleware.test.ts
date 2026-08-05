import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { config, middleware } from '@/middleware';

/**
 * PROGRAM.md §8.5, §8.7, §8.14 — ara katmanın birim testi.
 *
 * İki ayrı şey doğrulanır:
 *   1. Ara katman ÇAĞRILDIĞINDA doğru başlıkları yazıyor mu?
 *   2. Matcher deseni hangi yolları KAPSIYOR / KAPSAMIYOR?
 *
 * (2) için desen kaynak dosyadan okunup derlenir; testin beklentisiyle
 * gönderilen desen arasında kayma olamaz. Bu bir YAKLAŞIKLAMADIR — Next
 * matcher'ı `path-to-regexp` ile çevirir. Gerçek çalışma zamanı davranışının
 * kanıtı `tests/e2e/security-headers.spec.ts` içindedir; burası hızlı geri
 * bildirim içindir.
 */

function requestFor(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), { headers });
}

describe('middleware — başlık uygulaması', () => {
  it('§8.7 — /panel yanıtı X-Robots-Tag: noindex, nofollow taşır', () => {
    const response = middleware(requestFor('/panel'));

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('§8.7 — /api/v1/panel/* yanıtı da noindex taşır', () => {
    const response = middleware(requestFor('/api/v1/panel/islem'));

    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('§8.14 — taban güvenlik başlıkları public sayfaya da uygulanır', () => {
    const response = middleware(requestFor('/'));

    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('permissions-policy')).toContain('camera=()');
  });

  it('public sayfa noindex ALMAZ — site indekslenebilir kalmalı (K4)', () => {
    expect(middleware(requestFor('/')).headers.get('x-robots-tag')).toBeNull();
    expect(middleware(requestFor('/projeler')).headers.get('x-robots-tag')).toBeNull();
  });

  it('§8.12 — test ortamı üretim olmadığı için HSTS eklenmez', () => {
    const response = middleware(requestFor('/', { 'x-forwarded-proto': 'https' }));

    expect(response.headers.get('strict-transport-security')).toBeNull();
  });
});

/**
 * Matcher deseni — kaynak dosyadan okunur.
 *
 * `config.matcher` metnini doğrudan kullanmak yerine dosyayı okumuyoruz;
 * `config` zaten içe aktarıldı. Ancak Next'in dosyayı derleme zamanında
 * *metin olarak* ayrıştırdığını da doğrulamak gerekiyor: desen değişmez bir
 * dize sabiti olarak yazılmazsa Next onu sessizce yok sayar ve ara katman
 * hiçbir yolda çalışmaz.
 */
describe('middleware — matcher deseni', () => {
  const matcher = config.matcher[0];

  it('tek bir desen olarak dışa aktarılır', () => {
    expect(config.matcher).toHaveLength(1);
    expect(typeof matcher).toBe('string');
  });

  /**
   * Next `config` nesnesini derleme zamanında statik olarak çözer. Desen bir
   * değişkenden veya şablon dizesinden gelirse yok sayılır — ara katman hiç
   * çalışmaz, üstelik hata da vermez. Kaynak metinde deseni birebir arıyoruz.
   */
  it('kaynak dosyada değişmez dize sabiti olarak yazılmıştır', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/middleware.ts'),
      'utf8',
    );

    // Çalışma zamanındaki dize, kaynakta kaçışlanmış hâliyle duruyor:
    // `\.` karakterleri dosyada `\\.` olarak yazılır. JSON.stringify tam da
    // bu kaçışlamayı geri üretir.
    const sourceLiteral = JSON.stringify(matcher).slice(1, -1);

    expect(source).toContain(`matcher: [`);
    expect(source).toContain(sourceLiteral);
  });

  describe('kapsam', () => {
    // Yaklaşık derleme — gerçek kanıt E2E'de.
    const pattern = new RegExp(`^${matcher}$`);

    it('§8.5 — /panel ve alt yolları KAPSAR', () => {
      expect(pattern.test('/panel')).toBe(true);
      expect(pattern.test('/panel/muhasebe')).toBe(true);
      expect(pattern.test('/panel/muhasebe/raporlar')).toBe(true);
    });

    it('§8.5 — /api/v1/panel/* KAPSAR', () => {
      expect(pattern.test('/api/v1/panel')).toBe(true);
      expect(pattern.test('/api/v1/panel/islem')).toBe(true);
    });

    it('public sayfaları KAPSAR — §8.14 başlıkları oraya da gerekli', () => {
      expect(pattern.test('/')).toBe(true);
      expect(pattern.test('/projeler')).toBe(true);
      expect(pattern.test('/blog/ilk-yazi')).toBe(true);
    });

    /**
     * Backend T-003b notu T2: Coolify ve Uptime Kuma (§13.6–13.7) bu ucu
     * kimliksiz yoklar; matcher dışında kalmalı.
     */
    it('/api/v1/health KAPSAMAZ', () => {
      expect(pattern.test('/api/v1/health')).toBe(false);
      expect(pattern.test('/api/v1/health/')).toBe(false);
    });

    /**
     * Dar bir istisna yazılmazsa `/api/v1/healthcheck` gibi ileride
     * eklenebilecek bir uç da sessizce korumasız kalırdı.
     */
    it('istisna dardır — /api/v1/health ile başlayan başka uçlar KAPSANIR', () => {
      expect(pattern.test('/api/v1/healthcheck')).toBe(true);
    });

    it('derleme çıktısını ve statik dosyaları KAPSAMAZ', () => {
      expect(pattern.test('/_next/static/chunks/main.js')).toBe(false);
      expect(pattern.test('/_next/image')).toBe(false);
      expect(pattern.test('/favicon.ico')).toBe(false);
      expect(pattern.test('/robots.txt')).toBe(false);
      expect(pattern.test('/sitemap.xml')).toBe(false);
      expect(pattern.test('/og-kapak.png')).toBe(false);
      expect(pattern.test('/fonts/inter.woff2')).toBe(false);
    });
  });
});
