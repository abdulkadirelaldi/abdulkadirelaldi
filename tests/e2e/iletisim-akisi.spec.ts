import process from 'node:process';

import { expect, test } from '@playwright/test';

import {
  E2E_ICERIK_ONEKI,
  iletisimMesajiOzeti,
  iletisimMesajlariniTemizle,
  mesajKutusuIceriyorMu,
} from './_helpers/db';

/**
 * §9 SENARYO 2 — "Ziyaretçi iletişim formunu doldurur → mesaj panele düşer".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SENARYONUN NERESİ ÖLÇÜLÜYOR — VE NERESİ BEKLİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zincir dört halka:
 *
 *   1. /iletisim formu           → ÖLÇÜLÜYOR (gerçek tarayıcı, gerçek form)
 *   2. POST /api/v1/iletisim     → ÖLÇÜLÜYOR (uç zaten api-routes.spec'te de var)
 *   3. ContactMessage kaydı      → ÖLÇÜLÜYOR (DB'de doğrulanıyor)
 *   4. panel mesaj kutusu EKRANI → **BEKLİYOR — ekran henüz yazılmadı**
 *
 * Dördüncü halka için ELDEN GELEN SON ADIM ÖLÇÜLÜYOR: ekranın besleneceği
 * okuma yolu (`fetchContactMessages`, T-038) bu mesajı GERÇEKTEN görüyor mu?
 * Ekran yazıldığında geriye yalnızca "liste bu satırı gösteriyor mu" kalacak;
 * zincirin altındaki her şey bugünden kilitli.
 *
 * NEDEN `test.fixme` / `test.skip` YOK: atlanan bir test, CI'daki "atlanan test
 * yok" nöbetini (T-005b) kırmızıya çevirir — ve haklı olarak: atlanan test,
 * unutulmuş bir kapıdır. Bekleyen kısım bir TODO satırı olarak da bırakılmadı;
 * raporda ve `docs/security/README.md`'de AÇIK BEKLEME olarak yazılı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ZAMAN TUZAĞI — TEST GERÇEK BİR ZİYARETÇİ GİBİ DAVRANMAK ZORUNDA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §8.15 zaman tuzağı formu üç saniyeden hızlı gönderen istemciyi işaretliyor
 * (`CONTACT_TIME_TRAP.minFillSeconds`). Playwright formu milisaniyelerde
 * doldurur; beklemeseydik mesaj `tooFast` sinyali alır ve test, gerçek bir
 * ziyaretçinin YAŞAMADIĞI bir yolu ölçerdi. Bekleme bu yüzden testin gürültüsü
 * değil, senaryonun parçası: aşağıda `spamScore === 0` iddiası da tam olarak
 * bunu doğruluyor — meşru ziyaretçi spam'e düşmüyor.
 */

/**
 * KOŞUM ANAHTARI — gerekçe `panel-yayin.spec.ts` içinde: paket iki projede
 * koşuyor ve temizlik ortak öneke dayansaydı biri diğerinin kaydını silerdi.
 */
const KOSUM = `${E2E_ICERIK_ONEKI}-${process.pid}-${Date.now()}`;
const KONU = `${KOSUM}-konu`;
const AD = 'E2E Ziyaretçi';
const EPOSTA = 'e2e-ziyaretci@ornek.test';
const MESAJ =
  'Merhaba, portföyünüzü inceledim. Kurumsal bir site için görüşmek istiyorum. Bu mesaj E2E senaryosu tarafından üretildi.';

/** §8.15 — minFillSeconds 3; gerçek ziyaretçi hızında davranmak için pay bırakıldı. */
const DOLDURMA_SURESI_MS = 3_500;

test.describe('§9/2 · ziyaretçi mesajı → veritabanı → panelin okuma yolu', () => {
  test.afterAll(async () => {
    await iletisimMesajlariniTemizle(KOSUM);
  });

  test('form gönderilir, kayıt açılır ve panelin okuma yolu mesajı görür', async ({
    page,
    request,
  }) => {
    /* ---- 1) Ziyaretçi formu doldurur ----------------------------------- */
    const yanit = await page.goto('/iletisim');
    expect(yanit?.status(), '/iletisim 200 dönmeli').toBe(200);

    const oncekiKutu = await mesajKutusuIceriyorMu(KONU);
    expect(oncekiKutu.iceriyor, 'mesaj test başlarken kutuda olmamalı').toBe(false);

    await page.locator('#ad').fill(AD);
    await page.locator('#eposta').fill(EPOSTA);
    await page.locator('#konu').fill(KONU);
    await page.locator('#mesaj').fill(MESAJ);

    // Honeypot (`#website`) BİLEREK BOŞ bırakılıyor: dolduran bir test, §8.15'in
    // spam dalını ölçerdi — burada ölçülen şey MEŞRU ziyaretçinin yolu.
    await expect(page.locator('#website')).toHaveValue('');

    await page.waitForTimeout(DOLDURMA_SURESI_MS);
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Mesajın bana ulaştı' })).toBeVisible();

    /* ---- 2) Kayıt DB'ye düştü mü ---------------------------------------- */
    const ozet = await iletisimMesajiOzeti({
      subject: KONU,
      name: AD,
      email: EPOSTA,
      message: MESAJ,
    });

    expect(ozet.bulundu, 'mesaj ContactMessage tablosuna yazılmalı').toBe(true);
    expect(ozet.adEsit, 'ad birebir kaydedilmeli').toBe(true);
    expect(ozet.epostaEsit, 'e-posta birebir kaydedilmeli').toBe(true);
    expect(ozet.mesajEsit, 'mesaj gövdesi birebir kaydedilmeli — kırpılmamalı').toBe(true);

    // MEŞRU ZİYARETÇİ SPAM'E DÜŞMÜYOR (§8.15 / ADR-020). Bu iddia olmasaydı
    // honeypot ya da zaman tuzağı yanlış pozitif üretmeye başladığında test
    // yine yeşil kalırdı: kayıt açılıyor ama panelde spam kutusunda duruyor.
    expect(ozet.isSpam, 'meşru mesaj spam işaretlenmemeli').toBe(false);
    expect(ozet.spamScore, 'hiçbir spam sinyali tetiklenmemeli').toBe(0);
    expect(ozet.honeypotHit).toBe(false);

    // Yeni mesaj OKUNMAMIŞ ve ARŞİVSİZ başlar — panelin rozetinin dayanağı.
    expect(ozet.isRead).toBe(false);
    expect(ozet.arsivlendi).toBe(false);

    // §8.15/ADR-020: bağlam alanları yazılıyor (değerleri değil, varlıkları).
    expect(ozet.ipYazildi || ozet.userAgentYazildi, 'en az bir bağlam alanı yazılmalı').toBe(true);
    expect(ozet.userAgentYazildi, 'userAgent kaydedilmeli — spam incelemesinin ayırt edicisi').toBe(
      true,
    );

    /* ---- 3) Panelin OKUMA YOLU görüyor mu ------------------------------- */
    const kutu = await mesajKutusuIceriyorMu(KONU);

    expect(
      kutu.iceriyor,
      'panelin varsayılan filtresi mesajı görmüyor — ekran yazıldığında kutu BOŞ görünürdü',
    ).toBe(true);
    expect(kutu.isRead).toBe(false);
    expect(kutu.isSpam).toBe(false);
    expect(kutu.okunmamis, 'okunmamış rozeti en az bu mesajı saymalı').toBeGreaterThanOrEqual(1);
    expect(kutu.onizlemeUzunlugu ?? 0, 'liste önizlemesi boş olmamalı').toBeGreaterThan(0);

    /* ---- 4) Uç, aynı gövdeyi ikinci kez kabul ediyor mu ------------------
     *
     * §8.15 saatlik sınır IP başına ÜÇ mesaj. Test tek mesaj gönderdi; ikinci
     * bir POST'un 429 DÖNMEMESİ, sınırın gereğinden dar olmadığını gösterir.
     * Gerçek kullanıcı bir düzeltme mesajı gönderebilmeli.
     *
     * Bu istek `request` bağlamından (tarayıcısız) gidiyor ve kayıt açıyor;
     * konusu aynı önekle başladığı için temizlik onu da siliyor.
     */
    const jeton = await (await request.get('/api/v1/iletisim')).json();

    // Jetonu alıp ANINDA göndermek `tooFast` sinyali üretiyordu (ölçüldü:
    // "spam sinyali … puan=30, sinyaller=tooFast"). Ölçmek istediğimiz şey
    // saatlik sınır olduğu için bu istek de meşru bir ziyaretçi gibi bekliyor;
    // aksi hâlde ikinci mesaj spam'e düşer ve testin adı yaptığı şeyi anlatmaz.
    await page.waitForTimeout(DOLDURMA_SURESI_MS);

    const ikinci = await request.post('/api/v1/iletisim', {
      data: {
        name: AD,
        email: EPOSTA,
        subject: `${KONU}-duzeltme`,
        message: `${MESAJ} (düzeltme)`,
        formToken: jeton.data.formToken,
        website: '',
      },
    });

    expect(
      ikinci.status(),
      'ikinci meşru mesaj reddedilmemeli — §8.15 sınırı saatte 3',
    ).toBeLessThan(400);

    const ikinciOzet = await iletisimMesajiOzeti({ subject: `${KONU}-duzeltme` });
    expect(ikinciOzet.bulundu).toBe(true);
    expect(ikinciOzet.isSpam, 'ikinci meşru mesaj da spam sayılmamalı').toBe(false);
    expect(ikinciOzet.spamScore, 'jeton doğru kullanıldıysa hiçbir sinyal tetiklenmez').toBe(0);
  });
});
