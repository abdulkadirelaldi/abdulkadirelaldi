import { expect, test } from '@playwright/test';

/**
 * Yapışkan proje yığını — DÜZEN kapısı (2026-10-26).
 *
 * NEDEN: iki gerileme aynı gün canlıya çıktı ve hiçbir test yakalamadı.
 *   1. Yığın sınırsızdı; 16 projeyle başlık şeritleri ekranı doldurdu, yeni
 *      kart görünmedi.
 *   2. Düzeltmesi 760 px altındaki ekranlarda yığılmayı kapattı; çoğu dizüstü
 *      tarayıcı penceresi bu yükseklikte olduğu için kartlar hiç binmedi.
 *
 * NE ÖLÇÜLÜYOR: kısa ve uzun masaüstü penceresinde her kart yapışkan VE
 * yapışma noktası + kart yüksekliği pencereye sığıyor (sığmazsa kartın altı
 * bir sonraki kartın altında kalır). Ekran görüntüsü karşılaştırması değil —
 * sayı ölçümü; içerik değişince kırılmaz, düzen bozulunca kırılır.
 */
test.describe('proje yığını düzeni', () => {
  // ATLAMA YOK (CI atlanan testi reddediyor): her test pencereyi KENDİSİ
  // ayarlıyor, iki projede de (masaüstü/mobil) aynı ölçüm anlamlı.
  test('390×844 (telefon): kartlar yığılmıyor, düz liste', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/projeler');
    const konumlar = await page
      .locator('main ol > li:has(> article)')
      .evaluateAll((liler) => liler.map((li) => getComputedStyle(li).position));
    expect(konumlar.length).toBeGreaterThan(0);
    expect(konumlar.every((k) => k !== 'sticky')).toBe(true);
  });

  for (const yukseklik of [640, 880]) {
    test(`1440×${yukseklik}: her kart yapışkan ve pencereye sığıyor`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: yukseklik });
      await page.goto('/projeler');

      const kartlar = await page.locator('main ol > li:has(> article)').evaluateAll((liler) =>
        liler.map((li) => ({
          konum: getComputedStyle(li).position,
          ust: parseFloat(getComputedStyle(li).top),
          boy: li.querySelector('article')!.getBoundingClientRect().height,
        })),
      );

      expect(kartlar.length).toBeGreaterThan(0);
      for (const [sira, kart] of kartlar.entries()) {
        expect(kart.konum, `kart ${sira + 1} yapışkan değil`).toBe('sticky');
        expect(kart.ust + kart.boy, `kart ${sira + 1} pencereye sığmıyor`).toBeLessThanOrEqual(
          yukseklik,
        );
      }
      // Yığın sınırlı: en derin yapışma noktası pencerenin üst yarısında kalmalı.
      expect(Math.max(...kartlar.map((k) => k.ust))).toBeLessThan(yukseklik / 2);
    });
  }
});
