import { expect, test } from '@playwright/test';

/**
 * F0 duman testi — uygulama üretim derlemesinde ayağa kalkıyor ve sayfa
 * boyanıyor mu?
 *
 * §9'daki gerçek senaryolar (ziyaretçi → proje → Kıyı Medya CTA) T-029'da
 * yazılacak; şu an public tarafta yalnızca T-002'nin geçici doğrulama sayfası
 * var. Bu yüzden test METNE değil YAPIYA bakar — aksi hâlde T-021 ana sayfayı
 * yazdığı gün kırılırdı.
 */

test.describe('duman testi', () => {
  test('ana sayfa açılır ve tek bir h1 gösterir', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);

    const headings = page.locator('h1');
    await expect(headings).toHaveCount(1);
    await expect(headings.first()).toBeVisible();
    await expect(headings.first()).not.toBeEmpty();
  });

  test('panel iskeleti açılır', async ({ page }) => {
    const response = await page.goto('/panel');

    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
  });

  /**
   * §1.1 K5 — "klavye ile tam gezinilebilir". Sayfaya girip Tab'a basınca
   * odağın gövdede kalmaması, ilerideki tüm erişilebilirlik testlerinin
   * dayandığı asgari koşul.
   */
  test('sayfa klavyeyle gezilebilir — ilk Tab odağı taşır', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? null);

    expect(focusedTag).not.toBeNull();
    expect(focusedTag).not.toBe('BODY');
  });
});
