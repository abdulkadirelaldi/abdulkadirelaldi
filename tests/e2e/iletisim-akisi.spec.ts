import process from 'node:process';

import { expect, test } from '@playwright/test';

import {
  E2E_ICERIK_ONEKI,
  adminCredentials,
  findAdminUser,
  iletisimMesajiOzeti,
  iletisimMesajlariniTemizle,
  mesajKutusuIceriyorMu,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * §9 SENARYO 2 — "Ziyaretçi iletişim formunu doldurur → mesaj panele düşer".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SENARYONUN NERESİ ÖLÇÜLÜYOR — VE NERESİ BEKLİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zincir dört halka ve **T-043g'de dördü de kapandı**:
 *
 *   1. /iletisim formu           → gerçek tarayıcı, gerçek form
 *   2. POST /api/v1/iletisim     → uç (ayrıca `api-routes.spec.ts`)
 *   3. ContactMessage kaydı      → DB'de alan alan doğrulanıyor
 *   4. panel mesaj kutusu EKRANI → **T-043g'de bağlandı** (T-039'da açık beklemeydi)
 *
 * T-039'da dördüncü halka için "elden gelen son adım" ölçülüyordu: ekranın
 * besleneceği okuma yolu (`fetchContactMessages`) mesajı görüyor muydu. O iddia
 * KORUNUYOR — çünkü ekranın boş kalmasının iki ayrı sebebi olabilir (okuma yolu
 * görmüyor / ekran göstermiyor) ve tek bir iddia bunları ayırt edemez. Şimdi
 * üstüne ekranın kendisi geldi: satır DOM'da, önizleme listede, tam gövde
 * detayda.
 *
 * NEDEN `test.fixme` / `test.skip` YOK: atlanan bir test, CI'daki "atlanan test
 * yok" nöbetini (T-005b) kırmızıya çevirir — ve haklı olarak: atlanan test,
 * unutulmuş bir kapıdır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `?gorunum=hepsi`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Frontend'in önerisi ve doğru: `?gorunum=gelen` spam olmayanları süzer, yani
 * iddia dolaylı olarak `isSpam=false` hesabına bağlanırdı. Zaman tuzağı ya da
 * honeypot bir gün yanlış pozitif üretmeye başlarsa ASIL istediğimiz şey,
 * `spamScore === 0` iddiasının (aşağıda, 2. bölüm) kırmızıya dönmesi — "mesaj
 * listede görünmüyor" diye ikinci bir kırmızı değil. Süzmeyen görünüm, iki
 * arızayı iki ayrı satırda tutuyor.
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
/**
 * Mesaj BİLEREK 160 karakterden uzun (`PREVIEW_LENGTH`).
 *
 * Liste `preview` taşıyor, detay tam gövdeyi. Kısa bir mesajda ikisi aynı
 * dizeye eşit olurdu ve "listede önizleme, detayda tam gövde" iddiası hiçbir
 * şey ölçmezdi — iki farklı sözleşmeyi aynı veriyle doğrulamış olurduk.
 * `KUYRUK_IMZASI` 160. karakterden SONRA geçiyor: listede görünmemeli,
 * detayda görünmeli.
 */
const KUYRUK_IMZASI = 'KUYRUK-IMZASI-9F2C';
const MESAJ =
  'Merhaba, portföyünüzü inceledim. Kurumsal bir site için görüşmek istiyorum. ' +
  'Özellikle kurumsal site ve panel işleriniz ilgimi çekti; bütçe ve takvim ' +
  `konusunda bir ön görüşme yapabilir miyiz? Bu mesaj E2E senaryosu tarafından üretildi. ${KUYRUK_IMZASI}`;

/** §8.15 — minFillSeconds 3; gerçek ziyaretçi hızında davranmak için pay bırakıldı. */
const DOLDURMA_SURESI_MS = 3_500;

test.describe('§9/2 · ziyaretçi mesajı → veritabanı → panelin okuma yolu', () => {
  test.afterAll(async () => {
    await iletisimMesajlariniTemizle(KOSUM);
  });

  test('form gönderilir, kayıt açılır ve mesaj PANELDE görünür', async ({
    page,
    context,
    request,
    baseURL,
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

    /* ---- 4) PANEL EKRANI — T-039'un açık beklemesi burada kapanıyor ----- */
    const mesajId = ozet.id;
    expect(mesajId, 'özet kimliği döndürmeli — satır onunla bulunuyor').toBeTruthy();

    const { email } = adminCredentials();
    const yonetici = await findAdminUser();
    await applySessionCookie(
      context,
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );

    await page.goto('/panel/mesajlar?gorunum=hepsi');

    // Satır DOM'da mı — seçici Frontend'in bu iş için koyduğu kanca, sınıf adı
    // değil (Tailwind değişikliği testi sessizce kırmasın).
    // Bileşik seçici İKİ KANCAYI birden sınıyor: satır işareti ve kimlik aynı
    // düğümde olmalı. Ayrı ayrı sorsaydık, kimliği taşıyan başka bir düğüm
    // (ör. gelecekteki bir önizleme kartı) testi yanlışlıkla yeşil tutabilirdi.
    const satir = page.locator(`[data-mesaj-satir][data-mesaj-id="${mesajId}"]`);
    await expect(satir, 'gönderilen mesaj panel listesinde görünmeli').toBeVisible();

    // Liste ÖNİZLEME taşıyor, tam gövdeyi DEĞİL.
    const listeHtml = await page.content();
    expect(
      listeHtml.includes(KUYRUK_IMZASI),
      'liste tam gövdeyi taşıyor — `preview` sözleşmesi bozulmuş',
    ).toBe(false);

    // Okunmamış rozeti — filtreden bağımsız sayaç (Backend T-038).
    await expect(page.getByText(/\d+ okunmamış/)).toBeVisible();

    const satirSayisi = await page.locator('[data-mesaj-satir]').count();
    expect(satirSayisi, 'en az bir satır listelenmeli').toBeGreaterThanOrEqual(1);

    /* ---- 4b) Detay — TAM gövde burada -------------------------------- */
    await satir.click();
    await expect(page).toHaveURL(new RegExp(`/panel/mesajlar/${mesajId}$`));

    await expect(
      page.getByText(KUYRUK_IMZASI, { exact: false }),
      'detay sayfası tam gövdeyi göstermeli',
    ).toBeVisible();

    /* ---- 5) Uç, aynı gövdeyi ikinci kez kabul ediyor mu ------------------
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
