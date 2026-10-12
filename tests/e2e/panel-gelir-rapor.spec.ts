import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, islemSondasiSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * §9 SENARYO 5 — "Gelir kaydı girilir → dashboard toplamına yansır".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * §9'UN SON AÇIK MADDESİ — DÖRT TURLUK AÇIK BEKLEMENİN KAPANIŞI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu senaryo T-107a'dan beri `tests/unit/senaryo-9-5-bekleme.test.ts` içinde
 * bir AÇIK BEKLEME olarak duruyordu: zincirin dört halkası tek tek yoklanıyor,
 * son halka geldiği gün kapı kırmızıya dönüyordu. T-107c'de döndü:
 *
 *   1. İşlem kaydı ekranı        → T-104 · `/panel/muhasebe/yeni`
 *   2. Yazma yolu (Server Action)→ T-101 · `createTransactionAction`
 *   3. Aylık toplam servisi      → T-102 · `fetchMonthlyReport`
 *   4. Toplamın EKRANA ulaşması  → T-105 · `/panel/muhasebe/raporlar`
 *
 * Dördüncü halkanın adı T-107b'de düzeltilmişti: eksik olan "dashboard kartı"
 * değildi — muhasebe listesindeki `toplam` SATIR SAYISI'ydı, para toplamı
 * değil. §9/5'in "toplam" dediği şey artık rapor ekranında.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AKIŞ EKRANDAN BAŞLIYOR — T-039'UN DERSİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kayıt `createTransactionAction`a elle POST atılarak değil, **muhasebe
 * listesindeki "Yeni işlem" bağlantısına basılıp form doldurularak** giriliyor.
 * T-039'da öğrenildi ve T-043g'de kural oldu: *akışın nereden başladığı
 * senaryonun parçasıdır.* Action'a doğrudan istek atmak, kullanıcının
 * kullandığı yolu (bağlantı → form → doğrulama → yönlendirme) hiç ölçmez;
 * o yol kırılsa senaryo yine yeşil kalırdı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖLÇÜM DELTA — MUTLAK DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rapor ekranındaki "Tahsil edilen" toplamı ÖNCE ve SONRA okunuyor; iddia
 * farkın tam olarak girilen tutara eşit olması. Mutlak bir sayı iddia etmek
 * seed verisine ve paralel koşan paketlere bağlı olurdu — yani kırılgan ve
 * ADR-030'un sözleşmesini test verisine bağımlı hâle getirirdi.
 *
 * Fark ölçmek ayrıca DAHA GÜÇLÜ bir şey söylüyor: toplam sadece "bir sayı
 * basıyor" değil, **bu kaydı sayıyor.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * (1) Tahakkuk tarafı (`income.invoiced`) ve net satırları ölçülmüyor; bu
 *     senaryo §9/5'in cümlesini (gelir → toplam) kapsıyor, raporun tamamını
 *     değil. İki esasın ayrımı Backend'in `rapor.test.ts`inde ölçülü.
 * (2) Ay/yıl geçişleri burada değil: ay sınırı davranışı birim testlerinde ve
 *     `tests/unit/tarih-sutun-eslesmesi.test.ts`te öncülüyle birlikte ölçülü.
 * (3) Kategori dağılımı ve CSV dışa aktarımı bu senaryonun dışında.
 */

/** Koşuma özgü sonek — iki Playwright projesi aynı anda koşuyor. */
const KOSUM = `${process.pid}-${Date.now().toString(36)}`;

/**
 * Açıklama işareti `e2e` ile BAŞLAMAK ZORUNDA.
 *
 * `global-teardown.ts` kalıntı sayımı `e2e`/`E2E` önekini arıyor (T-107b).
 * Başka bir işaret seçmek, kendi `afterAll`um çökerse deftere düşen bir para
 * kaydını GÖRÜNMEZ kılardı — ve o kalıntı bir sonraki koşumun aylık toplamını
 * sessizce kaydırırdı.
 */
const ACIKLAMA = `e2e-9-5-${KOSUM}`;

/** Ayırt edici tutar: seed'deki hiçbir değere eşit olmayacak kadar tuhaf. */
const TUTAR = '1337.42';
/** Ekranda beklenen biçim (tr-TR) — liste çapası için. */
const TUTAR_EKRAN = '1.337,42';
/**
 * Aynı tutarın KURUŞ karşılığı — iddia bununla karşılaştırılıyor.
 *
 * ⚠️ NEDEN ELLE YAZILI: ilk kurulumda beklentiyi `kurusaCevir(TUTAR)` ile
 * üretiyordum ve paket koşturulduğunda **100 kat sapma** çıktı. Sebep:
 * `kurusaCevir` TÜRKÇE biçim okuyor (nokta = binlik ayırıcı), `TUTAR` ise
 * MAKİNE biçimi (nokta = ondalık). `'1337.42'` → noktalar atılıyor → `133742`
 * tam kısım sanılıyor → `13374200` kuruş.
 *
 * Ders ADR-014'ün ta kendisi, test tarafında: bir para değeri, hangi BİÇİMDE
 * olduğu söylenmeden taşınamaz. İki temsil artık ayrı ve `kurusaCevir`
 * yalnızca EKRAN metnine uygulanıyor; karşılık gelmeleri aşağıda ölçülüyor.
 */
const TUTAR_KURUS = 133742;

/**
 * ⚠️ ÖLÇÜM AYI PROJEYE GÖRE AYRI — VE SEBEBİ KOŞUMDA ÖLÇÜLDÜ.
 *
 * İlk kurulum "bugün"ü kullanıyordu ve rapor ekranının varsayılan ayını
 * okuyordu. Tek projede geçti, İKİ PROJE BİRLİKTE koşunca düştü: iki
 * Playwright projesi (masaüstü + Pixel 5) EŞZAMANLI koşuyor, ikisi de aynı
 * aya kayıt yazıyor ve ikisi de aynı toplamı okuyordu — biri diğerinin
 * kaydını da sayıyordu.
 *
 * Yalıtım ayla sağlanıyor: her proje KENDİ ayına yazıp kendi ayını okuyor.
 * Geçmiş bir yıl seçilmesi ayrıca ölçümü MUTLAK yapıyor — o ayda seed verisi
 * yok, yani "önce 0" iddiası ay süzgecinin çalıştığını da kanıtlıyor.
 *
 * Takas kayda geçsin: "bugün" daha gerçekçi bir akıştı. Ama yalıtım burada
 * daha değerli — senaryonun iddiası (kayıt → aylık toplam) ayın HANGİ ay
 * olduğuna bağlı değil, ve kırılgan bir kapı susturulmaya davettir.
 */
const OLCUM_YILI = 2019;
const olcumAyi = (projeAdi: string): number => (projeAdi.includes('mobile') ? 4 : 3);

async function panelOturumu(page: Page, baseURL: string | undefined): Promise<void> {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();

  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

/**
 * Türkçe biçimli para dizesini kuruşa çevirir — `"₺85.625,00"` → `8562500`.
 *
 * Kayan noktaya HİÇ çevrilmiyor (ADR-014'ün kuralı testte de geçerli):
 * binlik ayırıcılar atılıyor, ondalık virgülü noktaya çevriliyor ve sayı
 * tamsayı kuruş olarak okunuyor. `Number('85625.00') * 100` yazmak kuruş
 * sapması üretebilirdi ve tam bu paketin ölçtüğü şeyi bulanıklaştırırdı.
 */
function kurusaCevir(metin: string): number {
  const temiz = metin.replace(/[^\d.,-]/g, '');
  const [tam = '0', kesir = ''] = temiz.replace(/\./g, '').split(',');
  const kurus = kesir.padEnd(2, '0').slice(0, 2);
  const isaret = tam.startsWith('-') ? -1 : 1;
  return isaret * Number(`${tam.replace('-', '')}${kurus}`);
}

/** Rapor ekranındaki bir kutunun tutarını kuruş olarak okur. */
async function kutuTutari(page: Page, etiket: string): Promise<number> {
  const deger = page
    .locator('dt', { hasText: new RegExp(`^${etiket}$`) })
    .locator('xpath=following-sibling::dd[1]')
    .locator('span')
    .first();

  await expect(deger, `"${etiket}" kutusu rapor ekranında bulunamadı`).toBeVisible();
  return kurusaCevir((await deger.textContent()) ?? '');
}

test.describe('§9/5 · gelir kaydı → aylık toplam', () => {
  test.afterAll(async () => {
    const silinen = await islemSondasiSil(ACIKLAMA);
    // Temizliğin GERÇEKTEN çalıştığı iddia ediliyor: sessizce 0 silmek,
    // kalıntıyı teardown'ın kalıntı kapısına bırakmak olurdu.
    expect(silinen, 'senaryonun yazdığı işlem silinemedi').toBeGreaterThan(0);
  });

  test('muhasebe ekranından girilen gelir, rapor toplamına YANSIYOR', async ({ page, baseURL }) => {
    /* ═══ 0. ÖNKOŞUL — tutarın üç temsili birbirine karşılık geliyor ════
     *
     * ⚠️ BU BLOK AYRI BİR `test()` İKEN KOŞUMDA KIRILDI ve sebebi öğretici:
     * `fullyParallel: true` aynı dosyanın testlerini AYRI WORKER'lara
     * dağıtıyor. Her worker kendi modül örneğini yüklediği için `ACIKLAMA`
     * (pid + zaman) worker'a özgü oluyor; hiçbir şey yazmayan önkoşul
     * worker'ı kendi `afterAll`unu koşturup "0 sildi" diye kırılıyordu.
     *
     * Önkoşul zaten bağımsız bir senaryo değil — ana iddianın girdisini
     * doğruluyor. Aynı teste alınınca hem worker ayrımı kayboldu hem de
     * `afterAll`un "temizlik gerçekten çalıştı" iddiası anlamlı kaldı.
     *
     * Üç temsil: form girdisi (`1337.42`), ekran biçimi (`1.337,42`), kuruş
     * (`133742`). Biri kaydığında senaryo yanlış sebeple kırılır ya da daha
     * kötüsü yanlış sebeple GEÇER.
     */
    expect(kurusaCevir(TUTAR_EKRAN), 'ekran biçimi kuruşa çevrilemiyor').toBe(TUTAR_KURUS);
    {
      // Makine biçiminden kuruş: kayan noktaya ÇEVİRMEDEN (ADR-014).
      const [tam = '0', kesir = ''] = TUTAR.split('.');
      expect(Number(`${tam}${kesir.padEnd(2, '0').slice(0, 2)}`)).toBe(TUTAR_KURUS);
    }

    await panelOturumu(page, baseURL);

    /* ═══ 1. ÖNCEKİ TOPLAM ═════════════════════════════════════════════ */
    const ay = olcumAyi(test.info().project.name);
    const raporYolu = `/panel/muhasebe/raporlar?yil=${OLCUM_YILI}&ay=${ay}`;

    const raporYanit = await page.goto(raporYolu);
    expect(raporYanit?.status(), 'rapor ekranı 200 dönmeli').toBe(200);
    expect(page.url(), 'girişe atılmış olabilir — adresi doğrula').toContain(
      '/panel/muhasebe/raporlar',
    );

    const once = await kutuTutari(page, 'Tahsil edilen');
    expect(
      once,
      `${OLCUM_YILI}-${ay} ayında ÖNCEDEN tahsilat var (${once} kuruş). Ölçüm ayı ` +
        'yalıtımı bozulmuş: ya seed o aya veri yazdı ya başka bir paket aynı ayı ' +
        'kullanıyor. Delta ölçümü güvenilmez.',
    ).toBe(0);

    /* ═══ 2. AKIŞ EKRANDAN BAŞLIYOR ════════════════════════════════════
     *
     * Listeye gidip "Yeni işlem" bağlantısına basılıyor. Doğrudan
     * `/panel/muhasebe/yeni`e gitmek de çalışırdı ama kullanıcının yolunu
     * atlardı: bağlantının var olduğu ve doğru yere gittiği de senaryonun
     * bir parçası (T-039).
     */
    await page.goto('/panel/muhasebe');
    await page.getByRole('link', { name: 'Yeni işlem' }).click();
    await expect(page).toHaveURL(/\/panel\/muhasebe\/yeni/);

    /* ═══ 3. FORM — GELİR, TRY, BUGÜN ══════════════════════════════════ */
    await page.locator('#type').selectOption('INCOME');

    /*
     * Tarih ÖLÇÜM AYINA yazılıyor (yukarıdaki yalıtım notu). Tarayıcı
     * `type="date"` alanı ISO bekliyor.
     */
    await page.locator('#date').fill(`${OLCUM_YILI}-${String(ay).padStart(2, '0')}-15`);

    /*
     * Kategori: seçici yalnızca AKTİF kategorileri listeliyor (arşivli olanlar
     * yok — T-104'ün kararı) ve seed en az bir tane üretiyor (ADR-030).
     * Hangi kategori olduğu bu senaryo için önemsiz: `collected` İŞLEMİN
     * türüne bakıyor, kategorinin türüne DEĞİL (ADR-039).
     */
    const kategori = page.locator('#categoryId');
    await expect(
      kategori.locator('option').first(),
      'seed aktif kategori üretmemiş',
    ).toBeAttached();
    await kategori.selectOption({ index: 0 });

    await page.locator('#amount').fill(TUTAR);
    await page.locator('#description').fill(ACIKLAMA);

    await page.getByRole('button', { name: 'Ekle' }).click();

    /*
     * Kaydın yazıldığı, LİSTEDE görünmesiyle doğrulanıyor — formun kendi
     * "başarılı" mesajıyla değil. Mesaj bir iddia, liste bir sonuç.
     *
     * ⚠️ ÇAPA AÇIKLAMA DEĞİL TUTAR — ölçüldü: liste `description` sütunu
     * BASMIYOR (sütunlar: Tarih · Tür · Kategori/iş · Tutar · TRY karşılığı ·
     * Ödeme). İlk kurulumda açıklamayı aramıştım ve paket koşturulduğunda
     * düştü; "kayıt listede görünmüyor" diyen hata aslında "bu sütun yok"
     * demekti. Açıklama yine yazılıyor ama temizlik işareti olarak
     * (`islemSondasiSil` onu kullanıyor).
     *
     * Tutar çapa olarak yeterince ayırt edici: `1.337,42` seed'de yok.
     */
    await expect(page).toHaveURL(/\/panel\/muhasebe(\?|$)/);
    await expect(
      page.getByText(TUTAR_EKRAN).first(),
      'kayıt listede görünmüyor — yazma yolu kopmuş olabilir',
    ).toBeVisible();

    /* ═══ 4. TOPLAM BU KAYDI SAYIYOR MU ════════════════════════════════ */
    await page.goto(raporYolu);
    const sonra = await kutuTutari(page, 'Tahsil edilen');

    expect(
      sonra - once,
      `Aylık "Tahsil edilen" toplamı girilen tutar kadar ARTMADI.\n` +
        `  önce: ${once} kuruş · sonra: ${sonra} kuruş · beklenen fark: ${TUTAR_KURUS} kuruş\n` +
        '§9/5 zinciri kopuk: kayıt yazıldı (listede görünüyor) ama aylık toplam ' +
        'onu saymıyor. Olası sebepler: ay sınırı (ADR-016 / `@db.Date`), ' +
        '`isPaid` varsayılanı, ya da `baseAmount` türetmesi (ADR-014).',
    ).toBe(TUTAR_KURUS);
  });
});
