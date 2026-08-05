import { expect, test } from '@playwright/test';

/**
 * PROGRAM.md §8.7, §8.12, §8.14 — güvenlik başlıklarının GERÇEK sunucu
 * yanıtları üzerinde doğrulanması.
 *
 * Bu dosya birim testlerinin tekrarı değildir. Birim testi
 * `buildSecurityHeaders()` fonksiyonunun doğru nesneyi ürettiğini gösterir;
 * burada ise ara katmanın Next tarafından GERÇEKTEN ÇALIŞTIRILDIĞI doğrulanır.
 * Aradaki fark F0'da somut bir tuzaktı: proje `src/` dizini kullandığı için
 * ara katman `src/middleware.ts` yolunda olmak zorunda — depo kökündeki bir
 * `middleware.ts` hata vermeden yok sayılır, birim testleri yeşil kalır ve
 * üretimde HİÇBİR başlık uygulanmaz. Yalnızca bu test o durumu yakalar.
 */

/** §8.14 — her yanıtta bulunması gereken taban başlıklar. */
const BASELINE = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
} as const;

test.describe('§8.14 — taban güvenlik başlıkları', () => {
  for (const path of ['/', '/panel']) {
    test(`${path} taban başlıkları taşır`, async ({ request }) => {
      const headers = (await request.get(path)).headers();

      for (const [name, value] of Object.entries(BASELINE)) {
        expect(headers[name], `${path} → ${name}`).toBe(value);
      }

      expect(headers['permissions-policy']).toContain('camera=()');
      expect(headers['permissions-policy']).toContain('geolocation=()');
      expect(headers['permissions-policy']).toContain('microphone=()');
    });
  }

  test('§8.14 — X-Powered-By sızmaz', async ({ request }) => {
    const headers = (await request.get('/')).headers();

    expect(headers['x-powered-by']).toBeUndefined();
  });
});

test.describe('§8.7 — panel arama motorlarına kapalı', () => {
  test('/panel yanıtı X-Robots-Tag: noindex, nofollow taşır', async ({ request }) => {
    const headers = (await request.get('/panel')).headers();

    expect(headers['x-robots-tag']).toBe('noindex, nofollow');
  });

  /**
   * Public taraf indekslenebilir kalmalı (§1.1 K4 — site ticari dönüşüm
   * hedefi taşıyor). Matcher genişletilirken buranın sessizce `noindex`
   * alması, aylar sonra fark edilecek türden bir SEO kaybı olurdu.
   */
  test('ana sayfa X-Robots-Tag TAŞIMAZ', async ({ request }) => {
    const headers = (await request.get('/')).headers();

    expect(headers['x-robots-tag']).toBeUndefined();
  });
});

/**
 * §13.6–13.7 — Coolify sağlık kontrolü ve Uptime Kuma bu ucu kimliksiz ve çok
 * sık yoklar (Backend T-003b notu T2), bu yüzden matcher DIŞINDA kalmalı.
 *
 * KANIT OLARAK `X-Robots-Tag` KULLANILAMAZ: uç bu başlığı kendi elleriyle
 * yazıyor (`src/app/api/v1/health/route.ts`). "Health'te X-Robots-Tag yok"
 * beklentisi bu yüzden yanlış olurdu — ayrıntı için `docs/security/README.md`
 * BULGU-001. Ayırt edici işaret `X-Frame-Options`: bu başlığı YALNIZCA ara
 * katman yazar, uç yazmaz.
 */
test.describe('matcher sınırı — /api/v1/health dışarıda', () => {
  test('health ucu ara katman başlıklarını TAŞIMAZ', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const headers = response.headers();

    // Durum kodu bilinçli olarak doğrulanmıyor: DB kapalıyken 503 döner ve
    // bu DOĞRU davranıştır (T-003b). Burada yalnızca başlıklar denetlenir.
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['permissions-policy']).toBeUndefined();
    expect(headers['referrer-policy']).toBeUndefined();
  });

  test('health ucu kendi başlıklarını yazmayı sürdürüyor', async ({ request }) => {
    const headers = (await request.get('/api/v1/health')).headers();

    // Bu uç matcher dışında olduğu için kendi korumasını kendi yazmak
    // zorunda. Backend bu başlıkları kaldırırsa uç savunmasız kalır — bu
    // test o gerilemeyi (regression) yakalar.
    expect(headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(headers['cache-control']).toContain('no-store');
  });
});

/**
 * §8.12 — HSTS yalnızca üretim + HTTPS.
 *
 * `pnpm build && pnpm start` NODE_ENV=production ile koşar, ancak istek düz
 * HTTP üzerinden gelir; bu yüzden HSTS eklenmemeli. Eklenseydi tarayıcı
 * `127.0.0.1`'i kalıcı olarak HTTPS'e sabitler ve yerel geliştirmeyi kırardı.
 */
test.describe('§8.12 — HSTS', () => {
  test('düz HTTP isteğine HSTS eklenmez', async ({ request }) => {
    for (const path of ['/', '/panel']) {
      const headers = (await request.get(path)).headers();
      expect(headers['strict-transport-security'], path).toBeUndefined();
    }
  });
});

/**
 * F0 SINIRI — bu test bilerek "henüz yok" doğrular.
 *
 * CSP (§8.13) F6/T-060'ta yazılacak. Buradaki beklenti T-060'ta TERSİNE
 * ÇEVRİLECEK; testin varlığı, CSP'nin sessizce unutulmamasını ve eklendiğinde
 * bu dosyanın güncellenmesini garanti eder.
 */
test('§8.13 — CSP F0 kapsamında henüz yok (T-060 bu beklentiyi tersine çevirecek)', async ({
  request,
}) => {
  const headers = (await request.get('/')).headers();

  expect(headers['content-security-policy']).toBeUndefined();
});
