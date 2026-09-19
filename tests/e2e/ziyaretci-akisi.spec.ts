import { expect, test } from '@playwright/test';

/**
 * §9 SENARYO 1 — "Ziyaretçi ana sayfayı açar, projeye tıklar, detay görür,
 * Kıyı Medya CTA'sı çalışır".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN ZİNCİR OLARAK ÖLÇÜLÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zincirin her halkası ayrı ayrı zaten ölçülüyordu: ana sayfa duman testinde,
 * detay sayfaları sitemap taramasında (200 dönüyor mu), CTA ise hiçbir yerde.
 * Eksik olan ARALARDAKİ BAĞLANTIYDI — kart gerçekten o projeye mi gidiyor,
 * gidilen sayfa gerçekten o proje mi, ve oradaki CTA doğru hedefi mi taşıyor.
 * Üç yeşil halka, kopuk bir zincire hiçbir şey söylemez (T-029d'nin dersi:
 * "200 dönüyor mu" ile "doğru şeyi veriyor mu" ayrı sorular).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KART SLUG'I SEED'DEN OKUNUYOR, TESTE GÖMÜLMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hangi projenin öne çıktığı seed verisine bağlı ve ADR-030 seed'i bir ölçüm
 * sözleşmesi sayıyor — ama sözleşme "şu slug hep ilk sırada" demiyor. Test bu
 * yüzden ana sayfadaki İLK proje kartını buluyor, slug'ını ondan okuyor ve
 * zinciri onunla sürüyor. Sabit bir slug yazsaydık, seed içeriği değiştiği gün
 * test kırılır ve kırılma "zincir bozuldu" gibi görünürdü.
 */

/** §12 — CTA hedefi ortamdan geliyor; yedek değer sayfanın kendi yedeğiyle aynı. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

test.describe('§9/1 · ana sayfa → proje kartı → detay → Kıyı Medya CTA', () => {
  test('zincirin dört halkası da bağlı', async ({ page, context }) => {
    /* ---- 1) Ana sayfa --------------------------------------------------- */
    const anaSayfa = await page.goto('/');
    expect(anaSayfa?.status(), 'ana sayfa 200 dönmeli').toBe(200);

    /*
     * Kart bağlantıları `/projeler/<slug>`; bölümün altındaki "Tüm projeler"
     * bağlantısı ise tam olarak `/projeler`. Seçici bu yüzden slug'lı olanı
     * arıyor — aksi hâlde test liste sayfasına gider ve "detay gördük" derdi.
     */
    const kart = page.locator('a[href^="/projeler/"]').first();
    await expect(kart, 'ana sayfada en az bir proje kartı olmalı').toBeVisible();

    const href = await kart.getAttribute('href');
    expect(href, 'kart href taşımalı').toBeTruthy();
    const slug = href!.replace('/projeler/', '');

    /* ---- 2) Karta tıkla → DETAY ---------------------------------------- */
    await kart.click();
    await expect(page, 'kart kendi projesinin detayına gitmeli').toHaveURL(
      new RegExp(`/projeler/${slug}$`),
    );

    // Sayfa gerçekten O proje mi: detaydaki CTA, projenin slug'ını taşıyor.
    // Yalnızca "bir detay sayfası açıldı" demek, kartların hepsinin aynı yere
    // gittiği bir gerilemeyi kaçırırdı.
    const cta = page.locator('[data-cta="proje-detay"]');
    await expect(cta, 'detay sayfasında Kıyı Medya CTA bulunmalı').toBeVisible();
    await expect(cta, 'CTA tıklanan projeye ait olmalı').toHaveAttribute('data-proje', slug);

    await expect(page.locator('h1')).toHaveCount(1);

    /* ---- 3) CTA'nın sözleşmesi ----------------------------------------- */
    await expect(cta).toHaveAttribute('href', KIYI_MEDYA_URL);

    /*
     * `rel="noopener"` GÜVENLİK İDDİASIDIR, biçimsel bir tercih değil:
     * `target="_blank"` ile açılan sayfa `window.opener` üzerinden bizi
     * başka bir adrese yönlendirebilir (tabnabbing). Tarayıcılar artık
     * varsayılan olarak koruyor ama eski sürümler korumuyor ve öznitelik
     * silindiğinde hiçbir şey görünür biçimde bozulmaz — tam da kapıya
     * yazılması gereken sınıf.
     */
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', /noopener/);

    /* ---- 4) CTA GERÇEKTEN çalışıyor mu --------------------------------- */
    /*
     * Öznitelik doğru ama bağlantı tıklanamaz olabilir (üstünde bir katman,
     * `pointer-events: none`, kapanmamış bir modal). Bu yüzden tıklanıyor.
     *
     * DIŞ SİTEYE İSTEK ATILMIYOR: kiyimedya.com'a giden istek yerel bir taslak
     * yanıtla karşılanıyor. Sebep ikili — üçüncü tarafın sitesini her CI
     * koşumunda yoklamak doğru değil, ve o site bir gün yavaşlasa kapımız onun
     * yüzünden kırmızıya dönerdi. Ölçtüğümüz şey BİZİM sayfamızın doğru hedefe
     * yönlendirmesi; hedefin ayakta olması bizim kapımızın konusu değil.
     *
     * `abort()` DENENDİ VE YETMEDİ: iptal edilen gezinme sekmeyi
     * `chrome-error://chromewebdata/` adresinde bırakıyor, yani istenen adres
     * kayboluyordu ve iddia ölçemeyeceği bir şeye bakıyordu. Bunun yerine
     * isteğin KENDİSİ kaydediliyor (tarayıcının gerçekten o adrese gittiğinin
     * kanıtı) ve taslak bir gövdeyle karşılanıyor.
     */
    let istenenAdres: string | null = null;
    await context.route(/kiyimedya\.com/, (route) => {
      istenenAdres = route.request().url();
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'e2e-taslak' });
    });

    const [yeniSekme] = await Promise.all([context.waitForEvent('page'), cta.click()]);
    await yeniSekme.waitForLoadState('domcontentloaded');

    /*
     * İKİ TARAF DA `new URL` ile normalleştiriliyor: tarayıcı köke giden
     * adrese sondaki eğik çizgiyi kendisi ekliyor (`…com` → `…com/`) ve düz
     * dize karşılaştırması bu yüzden kırılıyordu. Normalleştirme olmadan
     * iddia, ölçmek istediği şeyi değil bir biçim farkını ölçerdi.
     */
    expect(
      istenenAdres === null ? null : new URL(istenenAdres).href,
      'CTA tıklanınca Kıyı Medya adresine istek gitmeli',
    ).toBe(new URL(KIYI_MEDYA_URL).href);
    expect(yeniSekme.url(), 'yeni sekme CTA hedefinde olmalı').toContain(
      new URL(KIYI_MEDYA_URL).host,
    );

    await yeniSekme.close();
  });
});
