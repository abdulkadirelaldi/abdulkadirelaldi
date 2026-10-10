import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * §9 SENARYO 7 — "Mobil görünümde ana sayfa ve panel kullanılabilir".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ATLANAN TEST YOK — İDDİA GÖRÜNÜME GÖRE SEÇİLİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu paket iki projede koşuyor (Pixel 5 ve masaüstü). Menü düğmesi `lg:hidden`,
 * yani masaüstünde GÖRÜNMEMESİ gerekiyor. Kolay yol `test.skip(masaüstü)`
 * olurdu — ama atlanan test CI'daki "atlanan test yok" nöbetini (T-005b)
 * kırmızıya çevirir ve haklı olarak: atlanan test, unutulmuş bir kapıdır.
 *
 * Bunun yerine T-029e'nin disiplini uygulanıyor: **önce ölç, sonra doğru
 * iddiayı seç.** Mobilde "düğme var ve çekmeceyi açıyor", masaüstünde "düğme
 * YOK ve kenar çubuğu zaten duruyor" ölçülüyor. İki görünüm de gerçek bir şey
 * doğruluyor; hiçbiri boşa koşmuyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dokunmatik jestler (kaydırarak kapatma), ekran okuyucu ile gerçek gezinme ve
 * küçük ekranda form doldurma ergonomisi ölçülmüyor. Bu paket "panel mobilde
 * KULLANILABİLİR mi" sorusunun üç somut alt sorusunu ölçüyor: menüye
 * ulaşılıyor mu, nerede olduğum görünüyor mu, tablo sayfayı taşırıyor mu.
 */

/** `lg` kırılma noktası (Tailwind varsayılanı) — menü düğmesi bunun altında var. */
const LG_ESIGI = 1024;

async function panelOturumu(page: Page, baseURL: string | undefined): Promise<void> {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();

  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

test.describe('§9/7 · panel mobil gezinmesi', () => {
  test('menü, kırıntı yolu ve tablo taşması — görünüme göre', async ({ page, baseURL }) => {
    await panelOturumu(page, baseURL);

    const genislik = page.viewportSize()?.width ?? 0;
    expect(genislik, 'görünüm genişliği okunabilmeli').toBeGreaterThan(0);
    const mobil = genislik < LG_ESIGI;

    await page.goto('/panel/icerik/projeler');

    const menuDugmesi = page.getByRole('button', { name: 'Menüyü aç' });
    const kenarCubugu = page.getByRole('navigation', { name: 'Panel menüsü' });

    if (mobil) {
      /* ---- MOBİL: menüye ulaşılabiliyor mu -------------------------- */
      await expect(menuDugmesi, 'mobilde menü düğmesi görünmeli').toBeVisible();
      await expect(menuDugmesi).toHaveAttribute('aria-expanded', 'false');

      await menuDugmesi.click();

      const cekmece = page.getByRole('dialog', { name: 'Panel menüsü' });
      await expect(cekmece, 'düğme çekmeceyi açmalı').toBeVisible();
      await expect(cekmece).toHaveAttribute('aria-modal', 'true');
      await expect(menuDugmesi).toHaveAttribute('aria-expanded', 'true');

      /*
       * `aria-controls` HEDEFİ GERÇEKTEN VAR MI (BULGU-021).
       *
       * Düğme `aria-controls="panel-menu"` diyor. Ekran okuyucu bu kimlikle
       * bir öğe arar; yoksa bağ kopuktur ve "bu düğme neyi açıyor" bilgisi
       * kaybolur. Hiçbir görsel test bunu yakalamaz — düğme çalışıyor gibi
       * görünür. Bu yüzden kimliğin ÇÖZÜLDÜĞÜ ayrıca ölçülüyor.
       *
       * ⚠️ İDDİA BİLEREK YALNIZCA ÇEKMECE AÇIKKEN — T-051/E kararı.
       *
       * Çekmece kapalıyken DOM'da HİÇ YOK (Frontend'in bilinçli kararı: odak
       * tuzağı olmasın). Yani `panel-menu` kimliği kapalıyken sarkıyor. "Hiç
       * sarkmasın" demek çekmeceyi monte tutup `hidden` ile gizlemek demek —
       * ve o takas ÖLÇÜLEBİLİR bir özelliği (kapalıyken odaklanabilir hiçbir
       * öğe DOM'da yok) tanımsız davranışlı bir iyileştirme için verirdi:
       * `hidden` öğeyi erişilebilirlik ağacından da çıkarır, yani
       * `aria-controls` "var olan ama gezinilemeyen" bir öğeyi gösterir.
       *
       * Asıl semantiği taşıyan `aria-expanded` ve o her iki durumda doğru
       * (yukarıda ölçülüyor). `aria-controls` isteğe bağlı bir ipucu ve
       * destek düzeyi tutarsız. Bu yüzden karar: çekmece monte EDİLMEYECEK,
       * `aria-controls` KALACAK ve iddia ipucunun eyleme dönüşebildiği TEK
       * duruma (açık) bağlı kalacak. Gerekçenin tamamı
       * docs/security/README.md → "BULGU-021'in bıraktığı incelik".
       */
      const hedefId = await menuDugmesi.getAttribute('aria-controls');
      expect(hedefId, 'düğme bir aria-controls hedefi bildirmeli').toBeTruthy();
      await expect(
        page.locator(`#${hedefId}`),
        `aria-controls="${hedefId}" hedefi DOM'da YOK — kopuk referans (BULGU-021). ` +
          `Düzeltme tek satır ve Frontend'in: mobil çekmecenin role="dialog" div'ine ` +
          `id="${hedefId}" eklenmesi. Bu iddia bilerek KIRMIZI bırakıldı (BULGU-016 kalıbı): ` +
          'susturmak, ekran okuyucu kullanıcısının kaybettiği bağı görünmez kılardı.',
      ).toHaveCount(1);

      /* Çekmeceden gezinmek onu kapatmalı: açık kalsaydı hedef sayfa
         görünmez ve kullanıcı ikinci bir dokunuşa mahkûm olurdu. */
      await cekmece.getByRole('link', { name: 'Mesajlar' }).click();
      await expect(page).toHaveURL(/\/panel\/mesajlar/);
      await expect(cekmece, 'gezinince çekmece kapanmalı').toBeHidden();
    } else {
      /* ---- MASAÜSTÜ: düğme YOK, kenar çubuğu zaten duruyor ---------- */
      await expect(menuDugmesi, 'masaüstünde menü düğmesi gizli olmalı (lg:hidden)').toBeHidden();
      await expect(kenarCubugu.first(), 'masaüstünde kenar çubuğu görünür olmalı').toBeVisible();

      await page.goto('/panel/mesajlar');
    }

    /* ---- HER İKİ GÖRÜNÜM: nerede olduğum görünüyor mu -------------- */
    const kirinti = page.getByRole('navigation', { name: 'Neredeyim' });
    await expect(kirinti, 'kırıntı yolu her görünümde olmalı').toBeVisible();
    await expect(
      kirinti.locator('[aria-current="page"]'),
      'kırıntı yolunun son öğesi aria-current taşımalı',
    ).toHaveCount(1);

    /* ---- HER İKİ GÖRÜNÜM: tablo sayfayı taşırmıyor ----------------- */
    await page.goto('/panel/icerik/projeler');
    await expect(page.locator('table')).toBeVisible();

    /*
     * Ölçülen şey SAYFANIN yatay taşması, tablonun kendisi değil: tablo
     * `overflow-x-auto` bir kapsayıcıda ve kendi içinde kayması DOĞRU
     * davranış. Yanlış olan, tüm sayfanın yana kayması — mobilde okunabilirliği
     * bitiren ve §1.1/K5'in klavye gezinmesini de bozan hâl.
     *
     * Bir piksellik pay: alt piksel yuvarlamaları `scrollWidth`i 1 artırabiliyor
     * ve bu görünür bir taşma değil.
     */
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(
      tasma,
      'sayfa yatay taşıyor — tablo kapsayıcısı dışına çıkmış olmalı',
    ).toBeLessThanOrEqual(1);
  });
});
