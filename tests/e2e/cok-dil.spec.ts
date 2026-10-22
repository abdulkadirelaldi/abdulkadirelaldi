import { expect, test } from '@playwright/test';

/**
 * ADR-046 — çok dil (tr · en · de).
 *
 * NE ÖLÇÜLÜYOR:
 *   1. Her dilin ana sayfası doğru `<html lang>` ile açılıyor ve menü o dilde.
 *   2. Yerelleştirilmiş adresler: `/en/projects`, `/de/projekte` 200; iç
 *      (Türkçe) yazım ve `/tr/...` KANONİK adrese 308 ile yönleniyor.
 *   3. hreflang: liste sayfası üç dili ve `x-default`ı bildiriyor.
 *   4. Dil seçici: liste sayfasında doğrudan karşılık; detay sayfasında
 *      `/api/v1/dil` çeviri anahtarıyla karşılığı buluyor, karşılık yoksa
 *      hedef dilin listesine düşüyor (404 DEĞİL).
 *   5. İletişim formu etiketleri sayfanın dilinde (istemci bileşenine giden
 *      sözlük dilimi doğru).
 *
 * Seed sözleşmesi (`prisma/seed.ts`): `kiyi-medya-kurumsal-site` projesinin
 * İngilizcesi `kiyi-medya-corporate-website` — üretim içeriğiyle (scripts/icerik)
 * AYNI slug, test iki veri kümesinde de geçer.
 *
 * NE ÖLÇÜLMÜYOR: çevirinin kalitesi (insan işi) ve uzun Almanca başlıkların
 * taşması — o, görsel bir kontrol (bkz. ADR-046 notu).
 */

test.describe('ADR-046 · çok dil', () => {
  for (const [adres, dil, menu] of [
    ['/', 'tr', 'Projeler'],
    ['/en', 'en', 'Projects'],
    ['/de', 'de', 'Projekte'],
  ] as const) {
    test(`${adres} → <html lang="${dil}"> ve menü o dilde`, async ({ page }) => {
      const yanit = await page.goto(adres);
      expect(yanit?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', dil);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(
        page.getByRole('navigation').getByRole('link', { name: menu, exact: true }).first(),
      ).toBeAttached();
    });
  }

  test('yerelleştirilmiş adresler 200 döner', async ({ request }) => {
    for (const adres of [
      '/en/projects',
      '/en/about',
      '/en/services',
      '/en/contact',
      '/en/cv',
      '/en/blog',
      '/de/projekte',
      '/de/ueber-mich',
      '/de/leistungen',
      '/de/kontakt',
      '/de/lebenslauf',
      '/de/blog',
    ]) {
      const yanit = await request.get(adres);
      expect(yanit.status(), adres).toBe(200);
    }
  });

  test('kanonik olmayan yazım 308 ile yönlenir', async ({ request }) => {
    for (const [kaynak, hedef] of [
      ['/tr/projeler', '/projeler'],
      ['/tr', '/'],
      ['/en/projeler', '/en/projects'],
      ['/de/hakkimda', '/de/ueber-mich'],
    ] as const) {
      const yanit = await request.get(kaynak, { maxRedirects: 0 });
      expect(yanit.status(), kaynak).toBe(308);
      expect(new URL(yanit.headers()['location'] ?? '', 'http://x').pathname, kaynak).toBe(hedef);
    }
  });

  test('bilinmeyen dil öneki 404', async ({ request }) => {
    expect((await request.get('/fr/projeler')).status()).toBe(404);
  });

  test('hreflang: üç dil + x-default, kanonik kendi adresi', async ({ page }) => {
    await page.goto('/de/projekte');
    const hreflang = (dil: string) =>
      page.locator(`link[rel="alternate"][hreflang="${dil}"]`).getAttribute('href');

    expect(new URL((await hreflang('tr')) ?? '').pathname).toBe('/projeler');
    expect(new URL((await hreflang('en')) ?? '').pathname).toBe('/en/projects');
    expect(new URL((await hreflang('de')) ?? '').pathname).toBe('/de/projekte');
    expect(new URL((await hreflang('x-default')) ?? '').pathname).toBe('/projeler');

    const kanonik = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(kanonik ?? '').pathname).toBe('/de/projekte');
  });

  test('dil seçici — liste sayfasında doğrudan karşılık', async ({ page }) => {
    await page.goto('/projeler');
    const secici = page.locator('a[hreflang="en"]').first();
    await expect(secici).toHaveAttribute('href', '/en/projects');
  });

  test('/api/v1/dil — detayda karşılığı çeviri anahtarıyla bulur', async ({ request }) => {
    const yanit = await request.get(
      '/api/v1/dil?hedef=en&yol=%2Fprojeler%2Fkiyi-medya-kurumsal-site',
      { maxRedirects: 0 },
    );
    expect(yanit.status()).toBe(307);
    expect(yanit.headers()['location']).toMatch(/\/en\/projects\/kiyi-medya-corporate-website$/);
  });

  test('/api/v1/dil — karşılık yoksa hedef dilin listesine', async ({ request }) => {
    // Veriden BAĞIMSIZ: üretim içeriğinde her projenin Almancası var, seed'de
    // yok. Bulunamayan kayıt ile karşılığı olmayan kayıt aynı dala düşüyor.
    const yanit = await request.get(
      '/api/v1/dil?hedef=de&yol=%2Fprojeler%2Fboyle-bir-proje-yok-12345',
      { maxRedirects: 0 },
    );
    expect(yanit.status()).toBe(307);
    expect(yanit.headers()['location']).toMatch(/\/de\/projekte$/);
  });

  test('/api/v1/dil — dış adrese yönlendirmez', async ({ request }) => {
    const yanit = await request.get('/api/v1/dil?hedef=en&yol=%2F%2Fevil.example%2Fx', {
      maxRedirects: 0,
    });
    const hedef = new URL(yanit.headers()['location'] ?? '', 'http://127.0.0.1');
    expect(hedef.hostname).not.toBe('evil.example');
    expect(hedef.pathname).toBe('/en');
    expect(yanit.headers()['location']).toBe('/en');
  });

  test('iletişim formu etiketleri sayfanın dilinde', async ({ page }) => {
    await page.goto('/de/kontakt');
    await expect(page.getByLabel('E-Mail', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nachricht senden' })).toBeVisible();
  });
});
