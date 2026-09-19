import process from 'node:process';

import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import {
  E2E_ICERIK_ONEKI,
  adminCredentials,
  findAdminUser,
  projeDurumu,
  projeleriTemizle,
} from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * §9 SENARYO 6 — "Panelden proje yayınlanır → public sayfada görünür".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU TEST ASLINDA ADR-029'UN SINAVI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zincirin kendisi düz: action yazar, sayfa okur. Zor olan ARADAKİ ÖNBELLEK.
 * ADR-011 public okumaları `unstable_cache` ile sarmalıyor (bir saatlik emniyet
 * ağı), ADR-029 ise mutasyonun HANGİ etiketleri düşüreceğini tarif ediyor.
 * Etiket düşmezse yayınlanan proje public'te **bir saat görünmez** — kimse
 * hata almaz, kimse uyarı görmez; içerik "bazen gecikmeli geliyor" sanılır.
 * Teşhisi en zor sınıf.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖNBELLEK ÖNCE ISITILIYOR — YOKSA TEST YALAN SÖYLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu testin en kritik satırı, projeyi eklemeden ÖNCE atılan iki istek:
 *
 *   GET /projeler          → liste önbelleğe girer (`content:project:tr`)
 *   GET /projeler/<slug>   → 404 SONUCU önbelleğe girer (`content:project:tr:<slug>`)
 *
 * Isıtma olmadan test, etiket düşürme TAMAMEN BOZULSA BİLE yeşil kalırdı:
 * önbellekte girdi yoksa ekleme sonrası ilk okuma zaten veritabanına gider ve
 * yeni projeyi görür. Yani "yeşil" olurdu ama ölçtüğü şey ADR-029 değil,
 * önbelleğin boş olması olurdu — görev kartının uyardığı tuzak birebir bu.
 *
 * İkinci ısıtma (404) ADR-029'un en ince maddesini sınıyor: `getProjectBySlug`
 * OLUMSUZ SONUCU DA ÖNBELLEKLER. Yalnızca `localeTag` düşürülse yeni kayıt
 * listede görünür ama kendi sayfasında bir saat 404 kalırdı — "listede var,
 * tıklayınca yok".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DRAFT → PUBLISHED — T-039'un AÇIK BEKLEMESİ, T-044g'de KAPANDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-039'da senaryonun literal hâli ("bir projeyi DRAFT'tan PUBLISHED'a çevir")
 * ölçülememişti ve sebebi bir test kısıtı değil ÜRÜN kısıtıydı: panel listesi
 * `getPublishedProjects` okuduğu için taslak kayıt eklendiği anda listeden
 * kayboluyordu (ENGEL-1). O turda yazılan şey şuydu: "panel tüm durumları
 * listeleyebildiği gün buraya eklenecek".
 *
 * T-043f o günü getirdi — liste artık `fetchProjectsForPanel` (ham, önbeleksiz,
 * tüm durumlar) okuyor ve düzenleme ayrı bir rotada. Aşağıdaki ÜÇÜNCÜ test
 * bekleyen iddiayı bağlıyor: taslak panelde görünüyor, `/panel/icerik/projeler/
 * <id>` üzerinden yayına alınıyor ve public taraf ANINDA görüyor.
 *
 * Bekleme "unutulmuş TODO" olarak değil, kapının kendi kaydında durdu ve
 * kapanma koşulu gerçekleştiğinde kapandı.
 */

/**
 * KOŞUM ANAHTARI — süreç kimliği + zaman damgası.
 *
 * Bu paket İKİ PROJEDE koşuyor (masaüstü ve mobil) ve `fullyParallel: true`
 * yerelde onları AYRI İŞÇİLERDE aynı anda başlatabiliyor. Temizlik yalnızca
 * `E2E_ICERIK_ONEKI` önekine dayansaydı, bir projenin `afterAll`ı diğerinin
 * HÂLÂ KULLANDIĞI kaydı silerdi: sıraya bağlı, açıklaması zor bir kırılma —
 * `clearAllLoginAttempts` notundaki hatanın aynısı. Anahtar süreç başına
 * benzersiz; genel süpürme (`globalTeardown`) yine ortak öneke bakıyor.
 */
const KOSUM = `${E2E_ICERIK_ONEKI}-${process.pid}-${Date.now()}`;
const SLUG = `${KOSUM}-yayin`;
const BASLIK = `E2E Yayın Senaryosu ${SLUG.slice(-6)}`;

/** Panel formunu doldurup kaydeder. */
async function paneldenProjeEkle(
  page: Page,
  alanlar: { slug: string; baslik: string; durum: 'Taslak' | 'Yayında'; yayinTarihi?: string },
): Promise<void> {
  await page.goto('/panel/icerik/projeler');

  /*
   * T-043f'te "Yeni proje" LİSTE İÇİ FORM olmaktan çıkıp AYRI ROTAYA
   * (`/panel/icerik/projeler/yeni`) taşındı; artık `button` değil `link`.
   * Bu paket o değişiklikte kırıldı ve kırılması DOĞRU: ekleme akışının
   * nereden başladığı senaryonun parçası. Rol adını güncellemek, testi
   * "yeni gerçeğe" bağlamak demek — seçiciyi gevşetip iki hâli birden kabul
   * etmek, akışın değiştiğini gizlerdi.
   */
  await page.getByRole('link', { name: 'Yeni proje' }).click();
  await expect(page).toHaveURL(/\/panel\/icerik\/projeler\/yeni$/);

  await page.locator('#slug').fill(alanlar.slug);
  await page.locator('#title').fill(alanlar.baslik);
  await page.locator('#summary').fill('E2E senaryosunun ürettiği geçici kayıt.');
  await page.locator('#content').fill('## E2E\n\nBu içerik test tarafından yazıldı.');
  await page.locator('#status').selectOption({ label: alanlar.durum });

  if (alanlar.yayinTarihi) {
    await page.locator('#publishedAt').fill(alanlar.yayinTarihi);
  }

  await page.getByRole('button', { name: 'Ekle', exact: true }).click();

  // Ekleme başarılıysa form listeye dönüyor (`router.push`). Bekleme burada,
  // çağıran tarafta değil: her senaryonun aynı satırı tekrar etmesi gerekmesin.
  await expect(page).toHaveURL(/\/panel\/icerik\/projeler$/);
}

/**
 * `/projeler` listesinde slug geçiyor mu?
 *
 * Sayfa GÖVDESİNDEN okunuyor (tarayıcı DOM'u değil): önbellek davranışını
 * ölçtüğümüz için sunucunun O İSTEKTE ne ürettiği önemli; istemci tarafı bir
 * yeniden doğrulama sonucu bizi yanıltmasın.
 */
async function listedeVarMi(request: APIRequestContext, slug: string): Promise<boolean> {
  const yanit = await request.get('/projeler');
  expect(yanit.status(), '/projeler 200 dönmeli').toBe(200);

  return (await yanit.text()).includes(`/projeler/${slug}`);
}

test.describe('§9/6 · panelden yayınla → public sayfada görün (ADR-011 + ADR-029)', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    // YALNIZCA BU KOŞUMUN kayıtları; `globalTeardown` ortak öneke bakan
    // emniyet ağı olarak kalıyor.
    await projeleriTemizle(KOSUM);
  });

  test('yayınlanan proje listede ve detay sayfasında ANINDA görünür', async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();

    /* ---- 0) ÖNBELLEĞİ ISIT — testin geçerliliği buna bağlı ------------- */
    expect(await listedeVarMi(request, SLUG), 'slug test başlarken listede olmamalı').toBe(false);

    const oncesi = await request.get(`/projeler/${SLUG}`);
    expect(oncesi.status(), 'kayıt yokken detay 404 dönmeli (olumsuz sonuç önbelleğe girer)').toBe(
      404,
    );

    /* ---- 1) Panelden yayınla ------------------------------------------- */
    await applySessionCookie(
      context,
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );

    await paneldenProjeEkle(page, {
      slug: SLUG,
      baslik: BASLIK,
      durum: 'Yayında',
      // `publishedWhere` iki koşul arıyor: PUBLISHED **ve** publishedAt <= now.
      // Boş bırakılsaydı kayıt yayında sayılmaz, test ADR-029'u değil eksik bir
      // alanı ölçerdi.
      yayinTarihi: '2026-01-15T09:00',
    });

    // Action'ın DB'ye ne yazdığı — UI akışı tek başına kanıt değil.
    const durum = await projeDurumu(SLUG);
    expect(durum.bulundu, "proje DB'ye yazılmalı").toBe(true);
    expect(durum.status).toBe('PUBLISHED');

    /* ---- 2) Public liste ----------------------------------------------- */
    expect(
      await listedeVarMi(request, SLUG),
      'ADR-029: `content:project:tr` düşürülmediyse liste BAYAT kalır ve proje bir saat görünmez',
    ).toBe(true);

    /* ---- 3) Detay sayfası ---------------------------------------------- */
    const detay = await request.get(`/projeler/${SLUG}`);
    expect(
      detay.status(),
      'ADR-029: slug etiketi düşürülmediyse ÖNBELLEKLENMİŞ 404 servis edilir — "listede var, tıklayınca yok"',
    ).toBe(200);
    expect(await detay.text()).toContain(BASLIK);
  });

  /**
   * TERS YÖN — taslak sızmıyor.
   *
   * Yayın kapısının gerçekten bir kapı olduğunu, yalnızca yayınlananın
   * göründüğünü doğrular. Bu olmadan "her şey görünüyor" bir uygulama da
   * yukarıdaki testi geçerdi.
   */
  test('TASLAK kayıt public tarafa sızmıyor', async ({ page, context, request, baseURL }) => {
    const taslakSlug = `${KOSUM}-taslak`;
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();

    await applySessionCookie(
      context,
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );

    await paneldenProjeEkle(page, {
      slug: taslakSlug,
      baslik: `E2E Taslak ${taslakSlug.slice(-6)}`,
      durum: 'Taslak',
    });

    const durum = await projeDurumu(taslakSlug);
    expect(durum.bulundu).toBe(true);
    expect(durum.status).toBe('DRAFT');

    expect(await listedeVarMi(request, taslakSlug), 'taslak listede görünmemeli').toBe(false);
    expect(
      (await request.get(`/projeler/${taslakSlug}`)).status(),
      'taslak detayı 404 olmalı',
    ).toBe(404);
  });

  /**
   * §9/6'NIN LİTERAL HÂLİ — taslağı panelden yayına al.
   *
   * İkinci testten farkı YALNIZCA geçiş: orada kayıt doğrudan "Yayında"
   * açılıyor (`createProjectAction`), burada önce taslak açılıp sonra
   * `updateProjectAction` ile yayına alınıyor. ADR-029 açısından ikisi ayrı
   * yollar: ekleme `tagTargetsFor(null, dto)`, güncelleme `tagTargetsFor(
   * before, dto)` çağırıyor ve ikincisi ESKİ durumu da hesaba katmak zorunda.
   * Yani bu test "aynı şeyin tekrarı" değil, ikinci bir etiket hesabının sınavı.
   */
  test('TASLAK → YAYINDA: panelden yayına alınıyor, public ANINDA görüyor', async ({
    page,
    context,
    request,
    baseURL,
  }) => {
    const gecisSlug = `${KOSUM}-gecis`;
    const gecisBaslik = `E2E Geçiş Senaryosu ${gecisSlug.slice(-6)}`;
    const { email } = adminCredentials();
    const yonetici = await findAdminUser();

    await applySessionCookie(
      context,
      { userId: yonetici.id, email, twoFactorEnabled: true },
      baseURL ?? 'http://127.0.0.1:3100',
    );

    /* ---- 1) Taslak olarak aç ------------------------------------------- */
    await paneldenProjeEkle(page, {
      slug: gecisSlug,
      baslik: gecisBaslik,
      durum: 'Taslak',
      // Yayın tarihi ŞİMDİDEN veriliyor: geçişte ölçmek istediğimiz şey durum
      // değişikliğinin etkisi. Tarih o anda girilseydi, kayıt public'te
      // görünmediğinde sebebin hangisi olduğu (durum mu tarih mi) belirsiz
      // kalırdı — iki değişkeni aynı anda oynatmamak için.
      yayinTarihi: '2026-01-15T09:00',
    });

    expect((await projeDurumu(gecisSlug)).status).toBe('DRAFT');

    /* ---- 2) ÖNBELLEĞİ ISIT (taslak hâliyle) ----------------------------- */
    expect(await listedeVarMi(request, gecisSlug), 'taslak public listede olmamalı').toBe(false);
    expect((await request.get(`/projeler/${gecisSlug}`)).status(), 'taslak detayı 404').toBe(404);

    /* ---- 3) Panelde TASLAK GÖRÜNÜYOR — ENGEL-1 kapandı ------------------ */
    await page.goto('/panel/icerik/projeler?durum=taslak');

    const satir = page.getByRole('row', { name: new RegExp(gecisBaslik) });
    await expect(satir, 'taslak panel listesinde görünmeli (ENGEL-1)').toBeVisible();

    /* ---- 4) Düzenleme rotasında yayına al ------------------------------- */
    await satir.getByRole('link', { name: 'Düzenle' }).click();
    await expect(page).toHaveURL(/\/panel\/icerik\/projeler\/[a-z0-9]+$/);

    await page.locator('#status').selectOption({ label: 'Yayında' });
    await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(page.getByText(/Kaydedildi/)).toBeVisible();

    expect((await projeDurumu(gecisSlug)).status, 'DB durumu PUBLISHED olmalı').toBe('PUBLISHED');

    /* ---- 5) Public taraf ANINDA görüyor mu ------------------------------ */
    expect(
      await listedeVarMi(request, gecisSlug),
      'ADR-029: güncelleme yolunda `content:project:tr` düşürülmediyse liste BAYAT kalır',
    ).toBe(true);

    const detay = await request.get(`/projeler/${gecisSlug}`);
    expect(
      detay.status(),
      'ADR-029: güncellemede slug etiketi düşürülmediyse ÖNBELLEKLENMİŞ 404 servis edilir',
    ).toBe(200);
    expect(await detay.text()).toContain(gecisBaslik);
  });
});
