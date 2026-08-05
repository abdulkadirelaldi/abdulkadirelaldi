import { describe, expect, it } from 'vitest';

import {
  BASELINE_SECURITY_HEADERS,
  HSTS_VALUE,
  PANEL_ROBOTS_HEADER,
  buildSecurityHeaders,
  isHttpsRequest,
  isPanelPath,
} from '@/lib/security/headers';

/**
 * PROGRAM.md §8.7, §8.12, §8.14 — başlık mantığının saf birim testi.
 *
 * Bu dosya bilinçli olarak `@/server/db` veya Prisma zincirinden hiçbir şey
 * içe aktarmaz; veritabanı ve `.env` olmadan geçer (T-004 kabul kriteri).
 */

describe('isPanelPath', () => {
  it('panel köklerini ve alt yollarını tanır', () => {
    expect(isPanelPath('/panel')).toBe(true);
    expect(isPanelPath('/panel/')).toBe(true);
    expect(isPanelPath('/panel/muhasebe')).toBe(true);
    expect(isPanelPath('/panel/muhasebe/raporlar')).toBe(true);
    expect(isPanelPath('/api/v1/panel')).toBe(true);
    expect(isPanelPath('/api/v1/panel/islem')).toBe(true);
  });

  it('public yolları panel saymaz', () => {
    expect(isPanelPath('/')).toBe(false);
    expect(isPanelPath('/projeler')).toBe(false);
    expect(isPanelPath('/api/v1/health')).toBe(false);
    expect(isPanelPath('/api/v1/iletisim')).toBe(false);
  });

  /**
   * Gerileme (regression) testi: düz `startsWith('/panel')` kullanılsaydı
   * bunların hepsi panel sayılırdı. `/paneller` gibi bir public rota
   * `noindex` alsaydı arama sonuçlarından sessizce düşerdi — hata vermeyen,
   * aylar sonra fark edilen türden bir kayıp.
   */
  it('segment sınırında olmayan benzer yolları panel SAYMAZ', () => {
    expect(isPanelPath('/paneller')).toBe(false);
    expect(isPanelPath('/panel-demo')).toBe(false);
    expect(isPanelPath('/panelist')).toBe(false);
    expect(isPanelPath('/api/v1/paneller')).toBe(false);
  });
});

describe('buildSecurityHeaders', () => {
  const publicContext = { pathname: '/', isProduction: false, isHttps: false };
  const panelContext = { pathname: '/panel/muhasebe', isProduction: false, isHttps: false };

  it('§8.14 taban başlıklarını her yola uygular', () => {
    for (const context of [publicContext, panelContext]) {
      const headers = buildSecurityHeaders(context);

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toBeTruthy();
    }
  });

  it('§8.14 — Permissions-Policy kısıtlıdır, hassas yetenekler kapalı', () => {
    const policy = buildSecurityHeaders(publicContext)['Permissions-Policy'] ?? '';

    for (const capability of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(policy).toContain(`${capability}=()`);
    }
  });

  it('§8.7 — X-Robots-Tag YALNIZCA panel yollarına eklenir', () => {
    expect(buildSecurityHeaders(panelContext)['X-Robots-Tag']).toBe(PANEL_ROBOTS_HEADER);
    expect(buildSecurityHeaders(panelContext)['X-Robots-Tag']).toBe('noindex, nofollow');

    // Public sayfaların indekslenmesi gerekiyor (K4) — başlık burada olmamalı.
    expect(buildSecurityHeaders(publicContext)['X-Robots-Tag']).toBeUndefined();
  });

  describe('§8.12 — HSTS', () => {
    it('üretim + HTTPS ise eklenir', () => {
      const headers = buildSecurityHeaders({
        pathname: '/',
        isProduction: true,
        isHttps: true,
      });

      expect(headers['Strict-Transport-Security']).toBe(HSTS_VALUE);
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    /**
     * Yerelde HSTS gönderilirse tarayıcı `localhost`'u kalıcı olarak HTTPS'e
     * sabitler; geliştirme ortamı erişilemez hâle gelir ve temizlenmesi elle
     * tarayıcı ayarı gerektirir.
     */
    it('geliştirme ortamında ASLA eklenmez', () => {
      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: false, isHttps: false })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();

      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: false, isHttps: true })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();
    });

    it('üretimde bile düz HTTP isteğine eklenmez', () => {
      expect(
        buildSecurityHeaders({ pathname: '/', isProduction: true, isHttps: false })[
          'Strict-Transport-Security'
        ],
      ).toBeUndefined();
    });

    /**
     * `preload` geri alınamaz (çıkış aylar sürer) ve tüm alt alan adlarının
     * kalıcı HTTPS olmasını şart koşar. `panel.` alt alan adı kararı
     * (STATUS.md Q1) henüz verilmedi — F7'ye kadar eklenmemeli.
     */
    it('F0 boyunca `preload` TAŞIMAZ', () => {
      expect(HSTS_VALUE).not.toContain('preload');
    });
  });

  it('taban başlık nesnesi dondurulmuş — çağrı arasında sızma olmaz', () => {
    const first = buildSecurityHeaders(publicContext);
    first['X-Frame-Options'] = 'SAMEORIGIN';

    expect(buildSecurityHeaders(publicContext)['X-Frame-Options']).toBe('DENY');
    expect(BASELINE_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });
});

describe('isHttpsRequest', () => {
  it('ters vekilin x-forwarded-proto başlığını dikkate alır', () => {
    expect(isHttpsRequest('https', 'http:')).toBe(true);
    expect(isHttpsRequest('http', 'http:')).toBe(false);
  });

  it('vekil zinciri listesinde ilk değeri kullanır', () => {
    expect(isHttpsRequest('https, http', 'http:')).toBe(true);
    expect(isHttpsRequest('http, https', 'http:')).toBe(false);
  });

  it('başlık büyük/küçük harf ve boşluğa duyarsızdır', () => {
    expect(isHttpsRequest(' HTTPS ', 'http:')).toBe(true);
  });

  it('başlık yoksa isteğin kendi şemasına düşer', () => {
    expect(isHttpsRequest(null, 'https:')).toBe(true);
    expect(isHttpsRequest(null, 'http:')).toBe(false);
  });
});
