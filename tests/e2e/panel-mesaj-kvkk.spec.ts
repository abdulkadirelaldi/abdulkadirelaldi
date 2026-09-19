import process from 'node:process';

import { expect, test } from '@playwright/test';

import {
  E2E_ICERIK_ONEKI,
  adminCredentials,
  findAdminUser,
  iletisimMesajiOzeti,
  iletisimMesajlariniTemizle,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * KVKK SINIRI — `ip` / `userAgent` hangi rotanın yükünde var (§8.20, ADR-020).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR PAKET, NEDEN İKİNCİ BİR ÖLÇÜM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Frontend T-041f'de kendi yorumunun yanlış olduğunu ÖLÇTÜ ve raporladı:
 * detaydaki "Göster/Gizle" düğmesi bir YETKİ SINIRI DEĞİL. Veri bileşene prop
 * olarak geçtiği için `ip`/`userAgent` detay rotasının RSC yükünde düğme
 * kapalıyken de duruyor; düğme yalnızca EKRANDA gösterip gizliyor.
 *
 * Gerçek sınır **liste/detay ayrımı** ve o Backend'in `LIST_SELECT`inde kurulu:
 * liste sorgusu bu iki sütunu hiç çekmiyor.
 *
 * Kendi ölçümümü yapıyorum çünkü bu, KVKK kapsamında kişisel veri taşıyan bir
 * sınır: "başkası ölçtü" yeterli bir kanıt değil, ve ölçüm ucuz. Ayrıca bu
 * paket sınırın KENDİSİNİ kapıya bağlıyor — Backend bir gün `LIST_SELECT`e
 * `ip` eklerse liste yükünde sızıntı başlar ve hiçbir birim testi bunu
 * görmezdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AYIRT EDİCİ İŞARETLER — gerçek kişisel veri kullanılmıyor
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mesaj, uca ÖZEL BAŞLIKLARLA gönderiliyor: `User-Agent` ve `X-Forwarded-For`
 * (`extractClientIp` ilkini okuyor). Böylece aranan dizeler testin ürettiği
 * uydurma değerler oluyor — gerçek bir ziyaretçinin IP'si ya da tarayıcı
 * imzası test çıktısına hiç girmiyor. IP için `203.0.113.x` seçildi: RFC 5737
 * belgeleme bloğu, hiçbir gerçek makineye ait olamaz ve sayfada başka bir
 * sebeple geçme ihtimali yok (`127.0.0.1` geçerdi — temel adres o).
 */

const KOSUM = `${E2E_ICERIK_ONEKI}-${process.pid}-${Date.now()}`;
const KONU = `${KOSUM}-kvkk`;
const UA_ISARETI = 'E2E-KVKK-SONDA-UA-4B71';
const IP_ISARETI = '203.0.113.42';

/** §8.15 zaman tuzağı — meşru ziyaretçi hızı. */
const BEKLEME_MS = 3_500;

test.describe('§8.20 / ADR-020 · KVKK alanları liste yükünde YOK, detayda VAR', () => {
  test.afterAll(async () => {
    await iletisimMesajlariniTemizle(KOSUM);
  });

  test('`ip`/`userAgent` yalnızca detay rotasının yükünde', async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    /* ---- 1) İşaretli bir mesaj üret ------------------------------------ */
    const jeton = await (await request.get('/api/v1/iletisim')).json();
    await page.waitForTimeout(BEKLEME_MS);

    const gonderim = await request.post('/api/v1/iletisim', {
      headers: {
        'User-Agent': UA_ISARETI,
        'X-Forwarded-For': IP_ISARETI,
      },
      data: {
        name: 'E2E KVKK',
        email: 'e2e-kvkk@ornek.test',
        subject: KONU,
        message:
          'KVKK sınırını ölçen E2E mesajı. Gövde önemsiz; ölçülen şey ip ve userAgent alanlarının hangi rotanın yükünde taşındığı.',
        formToken: jeton.data.formToken,
        website: '',
      },
    });

    expect(gonderim.status(), 'sonda mesajı kabul edilmeli').toBeLessThan(400);

    const ozet = await iletisimMesajiOzeti({ subject: KONU });
    expect(ozet.bulundu).toBe(true);
    expect(ozet.ipYazildi, 'X-Forwarded-For okunup kaydedilmeli').toBe(true);
    expect(ozet.userAgentYazildi, 'userAgent kaydedilmeli').toBe(true);

    const mesajId = ozet.id ?? '';
    expect(mesajId).toBeTruthy();

    /* ---- 2) Oturum ------------------------------------------------------ */
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();
    await applySessionCookie(
      context,
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );

    /* ---- 3) LİSTE rotasının HAM yükü — sızıntı olmamalı ---------------- */
    const listeYanit = await page.goto('/panel/mesajlar?gorunum=hepsi');
    expect(listeYanit?.status()).toBe(200);
    expect(page.url(), "oturum geçerli olmalı — /giris'e düşmemeli").toContain('/panel/mesajlar');

    /*
     * `page.content()` DEĞİL, sunucudan gelen HAM gövde: RSC yükü
     * `self.__next_f.push(...)` betik parçalarında taşınıyor ve prop olarak
     * geçen bir değer ekranda hiç görünmeden orada durabilir — aradığımız
     * sızıntı tam olarak bu biçimde olurdu.
     *
     * ⚠️ HAM GÖVDE GEZİNME YANITINDAN OKUNUYOR (`response.text()`), ayrı bir
     * istek bağlamından değil. İki yanlış deneme kayda değer, çünkü ikisi de
     * testi VAKUMDA YEŞİL bırakıyordu:
     *
     *   1. `request` fixture'ı — tarayıcının çerezlerini taşımıyor.
     *   2. `page.request` — yönlendirmeleri İZLİYOR, yani oturum geçmese bile
     *      `/giris` sayfasının gövdesiyle 200 dönüyor.
     *
     * Her iki hâlde de "işaret gövdede yok" sonucu giriş sayfasından gelirdi:
     * kişisel veri sızıntısını ölçtüğünü sanan, aslında hiçbir şey ölçmeyen
     * bir kapı. Gezinme yanıtı hem oturumu hem doğru sayfayı garantiliyor;
     * altındaki kimlik kontrolü de "bu gövde gerçekten bizim satırımızı
     * içeriyor" diyerek son boşluğu kapatıyor.
     */
    const listeHam = (await listeYanit?.text()) ?? '';
    /*
     * "Doğru sayfaya bakıyor muyuz" işareti olarak MESAJ KİMLİĞİ kullanılıyor.
     * Önce ekrandaki bir metin ("okunmamış") denendi ve tutmadı: RSC yükünde
     * Türkçe karakterler `\uXXXX` kaçışlarıyla taşınıyor, yani ham gövdede
     * düz metin aranması yanıltıcı. Kimlik ASCII ve aynı zamanda "bizim
     * satırımız bu gövdede" demek — tek satırda iki iş.
     */
    expect(listeHam, 'ham gövde gerçekten bu mesajın olduğu liste olmalı').toContain(mesajId);

    expect(
      listeHam.includes(UA_ISARETI),
      'LİSTE yükünde userAgent var — `LIST_SELECT` sınırı delinmiş (§8.20/ADR-020)',
    ).toBe(false);
    expect(
      listeHam.includes(IP_ISARETI),
      'LİSTE yükünde ip var — `LIST_SELECT` sınırı delinmiş (§8.20/ADR-020)',
    ).toBe(false);

    // Satır gerçekten listede; yani yukarıdaki "yok" sonucu, mesajın hiç
    // listelenmemesinden kaynaklanmıyor. Bu satır olmadan test, boş bir
    // listede de yeşil kalırdı — T-029e'deki "öncül bayat" tuzağının aynısı.
    await expect(page.locator(`[data-mesaj-satir][data-mesaj-id="${mesajId}"]`)).toBeVisible();

    /* ---- 4) DETAY rotası — veri yükte VAR, ekranda GİZLİ --------------- */
    const detayYanit = await page.goto(`/panel/mesajlar/${mesajId}`);
    expect(detayYanit?.status(), 'detay 200 dönmeli').toBe(200);
    const detayHam = (await detayYanit?.text()) ?? '';

    /*
     * ÖLÇÜLEN GERÇEK, İSTENEN DEĞİL: değer düğme kapalıyken de yükte.
     * Bu iddiayı "olmasın" diye yazmak, uygulamanın yapmadığı bir sözü kapıya
     * yazmak olurdu. Böyle yazıldığında kapı, sınırın GERÇEKTEN durduğu yeri
     * (liste/detay) koruyor ve düğmeye yanlış bir anlam yüklemiyor.
     */
    expect(
      detayHam.includes(UA_ISARETI),
      'detay yükünde userAgent BEKLENİYOR — düğme bir perde, yetki sınırı değil',
    ).toBe(true);

    // Ekranda ise kapalı başlıyor.
    await expect(page.getByText(UA_ISARETI)).toBeHidden();
    await page.getByRole('button', { name: 'Göster' }).click();
    await expect(page.getByText(UA_ISARETI)).toBeVisible();
    await expect(page.getByText(IP_ISARETI)).toBeVisible();
  });
});
