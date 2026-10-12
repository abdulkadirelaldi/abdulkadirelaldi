import { expect, test, type Page } from '@playwright/test';

import {
  adminCredentials,
  arsivliBagSondasi,
  arsivliBagSondasiSil,
  findAdminUser,
  type ArsivliBagSondasi,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * ARŞİVLİ BAĞ KOPMASI — `<select>` İLK SEÇENEĞE DÜŞMÜYOR (T-107c).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KUSUR NE, VE NEDEN TARAYICI OLMADAN ÖLÇÜLEMEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seçiciler arşivlenmiş kayıtları listelemiyor — doğru karar, yoksa arşivleme
 * anlamını yitirir. Ama bu TEK BAŞINA bir bağı koparıyordu:
 *
 *   Arşivli bir kayda BAĞLI bir satır düzenlenirken o kayıt listede olmaz;
 *   `<select>` değeri hiçbir `<option>` ile eşleşmeyince **tarayıcı sessizce
 *   ilk seçeneğe düşer** ve KAYDETMEK bağı BAŞKA bir kayda bağlar.
 *
 * Frontend kusuru iki turda iki kez bildirdi (T-103 müşteri, T-104 kategori) ve
 * ikisini de çözdü: sayfa, düzenlenen satırın arşivli bağını seçeneklere EK
 * OLARAK geçiriyor ve "(arşivli)" işaretiyle çiziyor. **Kapı yoktu** — çözümü
 * kaldıran bir düzenleme sessiz kalırdı.
 *
 * ⚠️ BU DAVRANIŞ YALNIZCA GERÇEK TARAYICIDA ÖLÇÜLEBİLİR. "İlk seçeneğe düşme"
 * HTML `<select>`in kendi davranışı; bir birim testi `value` prop'unu okur ve
 * doğru değeri görür — tarayıcının o değeri eşleşmediği için ATTIĞINI görmez.
 * Kusur tam olarak bu boşlukta yaşıyordu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ VAKA, TEK PAKET — VE RİSKLERİ FARKLI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   MÜŞTERİ (`Job.clientId`, opsiyonel) → ilk seçenek "müşteri yok" olabilir,
 *   yani bağ KOPAR. Sonucu veri kaybı.
 *
 *   KATEGORİ (`Transaction.categoryId`, ZORUNLU) → "kategori yok" seçeneği
 *   bile YOK, yani ilk seçenek HER ZAMAN geçerli bir kategoridir ve kayıt
 *   sessizce YANLIŞ KIRILIMA düşer. Kategori raporlamanın kırılım anahtarı
 *   olduğu için sonucu defterin bozulması — daha sinsi, çünkü hiçbir alan
 *   boşalmıyor, yalnızca yanlış doluyor.
 *
 * İkisi aynı kalıbı koruduğu için tek pakette ölçülüyor; kalıp bir gün
 * ayrışırsa iki ayrı iddia ayrı ayrı kırılır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (1) Kullanıcının BAŞKA bir arşivli kaydı seçEMEDİĞİ ölçülmüyor — seçenek
 *     listesinde yalnızca kaydın KENDİ arşivli bağı var, bu da aşağıda
 *     seçenek sayımıyla dolaylı olarak görünüyor ama ayrı bir iddia değil.
 * (2) Arşivli bağın `(arşivli)` dışındaki görsel işaretleri (renk, ikon).
 */

const KOSUM = `${process.pid}-${Date.now().toString(36)}`;
/** `e2e` öneki ZORUNLU — teardown kalıntı sayımı bunu arıyor (T-107b). */
const ONEK = `e2e-arsiv-${KOSUM}`;

async function panelOturumu(page: Page, baseURL: string | undefined): Promise<void> {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();

  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

test.describe('arşivli bağ korunuyor — iki seçici', () => {
  let sonda: ArsivliBagSondasi;

  test.beforeAll(async () => {
    sonda = await arsivliBagSondasi(ONEK);
  });

  test.afterAll(async () => {
    const silinen = await arsivliBagSondasiSil(ONEK);
    expect(silinen, 'fikstür silinemedi — kalıntı bırakıyor').toBeGreaterThan(0);
  });

  test('arşivli KATEGORİye bağlı işlem: seçici bağı koruyor ve kaydetmek bozmuyor', async ({
    page,
    baseURL,
  }) => {
    await panelOturumu(page, baseURL);

    const yanit = await page.goto(`/panel/muhasebe/${sonda.islemId}`);
    expect(yanit?.status(), 'düzenleme ekranı 200 dönmeli').toBe(200);
    expect(page.url(), 'girişe atılmış olabilir').toContain(`/panel/muhasebe/${sonda.islemId}`);

    const secici = page.locator('#categoryId');
    await expect(secici, 'kategori seçicisi yok').toBeVisible();

    /* ---- ÇAPA: seçici gerçekten dolu ve arşivli bağ seçenekler arasında --- */
    const secenekler = secici.locator('option');
    expect(await secenekler.count(), 'kategori seçeneği hiç yok').toBeGreaterThan(0);

    /*
     * ⚠️ ASIL İDDİA: SEÇİLİ DEĞER kaydın KENDİ kategorisi.
     *
     * Kusur hâlindeyken burada ilk seçeneğin kimliği okunurdu — ki o GEÇERLİ
     * bir kategori olduğu için hiçbir şey hata vermez, hiçbir alan boşalmaz.
     * Yalnızca yanlış olur.
     */
    await expect(
      secici,
      'Seçici kaydın arşivli kategorisini DEĞİL başka bir değeri gösteriyor — ' +
        '`<select>` ilk seçeneğe düşmüş. Kaydetmek işlemi YANLIŞ KIRILIMA bağlar ' +
        've defterin kategori dağılımı sessizce bozulur (T-104).',
    ).toHaveValue(sonda.kategoriId);

    /* ---- Arşivli olduğu KULLANICIYA da söyleniyor -------------------- */
    const seciliEtiket = await secici.locator(`option[value="${sonda.kategoriId}"]`).textContent();
    expect(seciliEtiket ?? '', 'arşivli bağ işaretlenmemiş — kullanıcı durumu bilmiyor').toContain(
      'arşivli',
    );

    /* ---- KAYDETMEK bağı bozmuyor (seçiciye DOKUNMADAN) --------------- */
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page).toHaveURL(/\/panel\/muhasebe(\?|$|\/)/);

    /*
     * Kalıcılık formun kendi mesajıyla değil, FORMU YENİDEN AÇARAK
     * doğrulanıyor: "kaydettim" bir iddia, yeniden okunan değer bir sonuç.
     */
    await page.goto(`/panel/muhasebe/${sonda.islemId}`);
    await expect(
      page.locator('#categoryId'),
      'Kaydetmek kategoriyi DEĞİŞTİRDİ — bağ koptu ve kayıt başka kırılıma düştü.',
    ).toHaveValue(sonda.kategoriId);
  });

  test('arşivli MÜŞTERİye bağlı iş: seçici bağı koruyor ve kaydetmek bozmuyor', async ({
    page,
    baseURL,
  }) => {
    await panelOturumu(page, baseURL);

    const yanit = await page.goto(`/panel/isler/${sonda.isId}`);
    expect(yanit?.status(), 'iş düzenleme ekranı 200 dönmeli').toBe(200);

    const secici = page.locator('#clientId');
    await expect(secici, 'müşteri seçicisi yok').toBeVisible();
    expect(await secici.locator('option').count(), 'müşteri seçeneği hiç yok').toBeGreaterThan(0);

    await expect(
      secici,
      'Seçici işin arşivli müşterisini DEĞİL başka bir değeri gösteriyor — ' +
        'kaydetmek işi BAŞKA MÜŞTERİYE bağlar ya da bağı tamamen koparır (T-103).',
    ).toHaveValue(sonda.musteriId);

    const seciliEtiket = await secici.locator(`option[value="${sonda.musteriId}"]`).textContent();
    expect(seciliEtiket ?? '', 'arşivli müşteri işaretlenmemiş').toContain('arşivli');

    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page).toHaveURL(/\/panel\/isler(\?|$|\/)/);

    await page.goto(`/panel/isler/${sonda.isId}`);
    await expect(
      page.locator('#clientId'),
      'Kaydetmek müşteriyi DEĞİŞTİRDİ — sessiz veri kaybı.',
    ).toHaveValue(sonda.musteriId);
  });
});
