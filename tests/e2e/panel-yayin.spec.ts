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
 * NEDEN "YENİ KAYIT PUBLISHED" — DRAFT → PUBLISHED DEĞİL (ENGEL)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Senaryonun sözü "bir projeyi DRAFT'tan PUBLISHED'a çevir" idi. BUGÜN PANELDEN
 * YAPILAMIYOR: panel listesi `getPublishedProjects` okuyor, yani taslak kayıt
 * eklendiği anda listeden kayboluyor ve düzenlenecek bir satır kalmıyor
 * (`src/app/(panel)/panel/icerik/projeler/page.tsx` → ENGEL-1, Frontend'in
 * kendi notu). Bu bir test kısıtı değil, ÜRÜN kısıtı: bugün panelden bir
 * taslağı yayına almanın yolu yok.
 *
 * Ölçülen yol, aynı ADR-029 zincirinden geçen ve bugün GERÇEKTEN yapılabilen
 * yol: panelden doğrudan "Yayında" durumunda kayıt açmak. Etiket hesabı
 * (`revalidateContent` + `tagTargetsFor`) ekleme ve güncellemede AYNI; sınanan
 * mekanizma değişmiyor. Taslağın yayına alınması, panel tüm durumları
 * listeleyebildiği gün buraya eklenecek — raporda AÇIK BEKLEME olarak yazılı.
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
  await page.getByRole('button', { name: 'Yeni proje' }).click();

  await page.locator('#slug').fill(alanlar.slug);
  await page.locator('#title').fill(alanlar.baslik);
  await page.locator('#summary').fill('E2E senaryosunun ürettiği geçici kayıt.');
  await page.locator('#content').fill('## E2E\n\nBu içerik test tarafından yazıldı.');
  await page.locator('#status').selectOption({ label: alanlar.durum });

  if (alanlar.yayinTarihi) {
    await page.locator('#publishedAt').fill(alanlar.yayinTarihi);
  }

  await page.getByRole('button', { name: 'Ekle', exact: true }).click();
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

    // `exact: true` — sayfada iki düğüm var: formun kendi başarı satırı ve
    // ekranın bildirimi ("Proje eklendi. Taslak olarak kaydedildiyse…").
    // Gevşek desen ikisine birden uyup strict mode ihlali veriyor; daha
    // önemlisi, hangi bileşenin doğrulandığı belirsiz kalırdı (T-019b/K3).
    await expect(page.getByText('Proje eklendi.', { exact: true })).toBeVisible();

    // Action'ın DB'ye ne yazdığı — UI mesajı tek başına kanıt değil.
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

    await expect(page.getByText('Proje eklendi.', { exact: true })).toBeVisible();

    const durum = await projeDurumu(taslakSlug);
    expect(durum.bulundu).toBe(true);
    expect(durum.status).toBe('DRAFT');

    expect(await listedeVarMi(request, taslakSlug), 'taslak listede görünmemeli').toBe(false);
    expect(
      (await request.get(`/projeler/${taslakSlug}`)).status(),
      'taslak detayı 404 olmalı',
    ).toBe(404);
  });
});
