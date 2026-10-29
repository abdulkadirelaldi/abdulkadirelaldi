import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * §8.13 — NONCE TABANLI CSP, GERÇEK TARAYICIDA (T-060).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BİRİM TESTİ YETMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `security-headers.test.ts` politikanın METNİNİ kilitliyor. Ama bir CSP'nin
 * iki ayrı kırılma biçimi var ve ikisi de yalnızca tarayıcıda görünür:
 *
 *   1. ÇOK SIKI — bir kaynak engellenir. Belirti çoğu zaman SESSİZ: WebGL
 *      arka planı çizilmez, grafik boş kalır, hidrasyon olmaz ve sayfa HTML
 *      olarak "çalışıyor" görünür. Konsolda bir satır, başka hiçbir şey.
 *   2. NONCE BASILMAMIŞ — Next.js nonce'u istek başlığından okuyamazsa kendi
 *      satır içi betikleri reddedilir; (1)'in en ağır hâli.
 *
 * Bu yüzden her sayfada: tarayıcının `securitypolicyviolation` olaylarını
 * topluyoruz (sıfır olmalı), satır içi betiklerin HEPSİNİN nonce taşıdığını
 * ölçüyoruz ve hidrasyonun gerçekleştiğini bir etkileşimle doğruluyoruz.
 *
 * Yüzeyler riskine göre seçildi: WebGL (Aurora, ana sayfa), MDX (blog),
 * Recharts (raporlar), satır içi `style` yoğun SVG grafikler (sağlık), MDX
 * editörü (panel), giriş formu.
 */

declare global {
  interface Window {
    __cspIhlalleri: string[];
  }
}

async function ihlalDinle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__cspIhlalleri = [];
    document.addEventListener('securitypolicyviolation', (olay) => {
      window.__cspIhlalleri.push(`${olay.violatedDirective} ← ${olay.blockedURI || 'inline'}`);
    });
  });
}

async function denetle(page: Page, yol: string): Promise<void> {
  const yanit = await page.goto(yol);
  expect(yanit?.status(), `${yol} yüklenmeli`).toBeLessThan(400);

  const csp = yanit?.headers()['content-security-policy'] ?? '';
  expect(csp, `${yol}: CSP başlığı yok`).toContain("'strict-dynamic'");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

  await page.waitForLoadState('networkidle');

  const ihlaller = await page.evaluate(() => window.__cspIhlalleri);
  expect(ihlaller, `${yol}: CSP ihlali`).toEqual([]);

  /*
   * Satır içi betiklerin HEPSİ nonce taşıyor. `nonce` ÖZNİTELİĞİ yüklemeden
   * sonra tarayıcı tarafından GİZLENİYOR (boş döner) — ÖZELLİK okunuyor.
   */
  const nonceDurumu = await page.evaluate(() => {
    const betikler = [...document.querySelectorAll<HTMLScriptElement>('script:not([src])')];
    return { toplam: betikler.length, nonceli: betikler.filter((b) => b.nonce).length };
  });
  expect(nonceDurumu.toplam, `${yol}: satır içi betik bulunamadı — ölçüm vakumda`).toBeGreaterThan(
    0,
  );
  expect(nonceDurumu.nonceli, `${yol}: nonce'suz satır içi betik`).toBe(nonceDurumu.toplam);
}

test.describe('§8.13 · public', () => {
  test.beforeEach(async ({ page }) => ihlalDinle(page));

  for (const yol of ['/', '/projeler', '/blog', '/iletisim', '/giris']) {
    test(`${yol} — ihlal yok, betikler nonce'lu`, async ({ page }) => {
      await denetle(page, yol);
    });
  }

  test('blog yazısı (MDX) — ihlal yok', async ({ page }) => {
    await page.goto('/blog');
    const ilk = page.locator('main a[href^="/blog/"]').first();
    const href = await ilk.getAttribute('href');
    expect(href, 'yayında en az bir yazı olmalı (seed)').toBeTruthy();
    await denetle(page, href ?? '/blog');
  });

  test('HİDRASYON gerçekleşiyor — nonce Next.js betiklerine basılmış', async ({ page }) => {
    /*
     * Betikler reddedilseydi sayfa HTML olarak yine görünürdü; ayırt edici
     * olan istemci etkileşimi. Mobil menü düğmesi bir istemci bileşeni ve
     * etiketi React DURUMUNDAN geliyor — tıktan sonra değişiyorsa hidrasyon
     * olmuştur.
     *
     * ADR-045: önceki sonda public'teki TEMA düğmesiydi; public site artık hep
     * koyu ve düğme yalnızca panelde. Menü düğmesi yalnızca dar ekranda
     * görünür, bu yüzden görünüm her iki projede de mobile çekiliyor.
     */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const dugme = page.getByRole('button', { name: /^Menüyü (aç|kapat)$/ });
    await expect(dugme).toHaveAttribute('aria-label', 'Menüyü aç');
    await dugme.click();
    // React durumu değişti → etiket değişti. Hidrasyon olmasaydı tık hiçbir şey yapmazdı.
    await expect(dugme).toHaveAttribute('aria-label', 'Menüyü kapat');
  });
});

test.describe('§8.13 · panel', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await ihlalDinle(page);
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();
    await applySessionCookie(
      page.context(),
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );
  });

  for (const yol of [
    '/panel',
    '/panel/saglik',
    '/panel/spor',
    '/panel/icerik/blog/yeni',
    '/panel/hayat',
  ]) {
    test(`${yol} — ihlal yok, betikler nonce'lu`, async ({ page }) => {
      await denetle(page, yol);
    });
  }
});
