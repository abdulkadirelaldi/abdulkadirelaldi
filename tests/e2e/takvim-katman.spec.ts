import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, takvimSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * TAKVİM KATMANLARI (ADR-049): Okul ve Kıyı Medya katmanında iki etkinlik → "İş" grubu kapanınca
 * yalnızca Okul görünür, seçim yenilemeden sonra da durur (çerez) → hepsi kapalıyken ekran söyler
 * → iki grup birden açıkken ikisi de görünür. Tarih uzak ayda (2031-07): gerçek etkinliklerle
 * karışmasın. İzler başlık önekiyle silinir.
 */
const GUN = '2031-07-16'; // çarşamba
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function oturumAc(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

async function etkinlikEkle(page: Page, baslik: string, katman: string) {
  await page.getByRole('button', { name: 'Yeni', exact: true }).click();
  const pencere = page.getByRole('dialog', { name: 'Yeni etkinlik' });
  await pencere.getByRole('textbox', { name: 'Başlık', exact: true }).fill(baslik);
  await pencere
    .getByRole('radiogroup', { name: 'Katman' })
    .getByRole('radio', { name: katman })
    .click();
  await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(pencere).toBeHidden();
}

test('takvim katmanları: grup düğmeleri süzer, seçim cihazda hatırlanır', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(90_000);
  const onek = `e2e-katman-${info.project.name}-${Date.now()}`;
  const okul = `${onek} Fizik vizesi`;
  const is = `${onek} Müşteri çekimi`;
  const gor = (baslik: string) =>
    page.locator(`[data-gun="${GUN}"]`).getByRole('button', { name: new RegExp(kacis(baslik)) });
  const grup = (ad: string) => page.getByRole('button', { name: `${ad} grubu` });
  await oturumAc(page, baseURL);

  try {
    await page.goto(`/panel/takvim?gorunum=ay&tarih=${GUN}`);
    await expect(page.getByRole('heading', { name: 'Temmuz 2031' })).toBeVisible();
    // Çerez yok → hepsi açık.
    await expect(grup('Kişisel')).toHaveAttribute('aria-pressed', 'true');
    await expect(grup('İş')).toHaveAttribute('aria-pressed', 'true');

    await etkinlikEkle(page, okul, 'Okul');
    await etkinlikEkle(page, is, 'Kıyı Medya');
    await expect(gor(okul)).toBeVisible();
    await expect(gor(is)).toBeVisible();

    // Ayrıntıda katman adı.
    await gor(okul).click();
    await expect(page.getByRole('dialog', { name: 'Etkinlik' }).getByText(/· Okul$/)).toBeVisible();
    await page.keyboard.press('Escape');

    // "İş" kapanır → yalnızca kişisel taraf.
    await grup('İş').click();
    await expect(grup('İş')).toHaveAttribute('aria-pressed', 'false');
    await expect(gor(is)).toBeHidden();
    await expect(gor(okul)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'gizli' })).toBeVisible();

    // Seçim yenilemeden sonra da durur.
    await page.reload();
    await expect(grup('İş')).toHaveAttribute('aria-pressed', 'false');
    await expect(gor(is)).toBeHidden();
    await expect(gor(okul)).toBeVisible();

    // Tek katman kapanınca grup "kısmen".
    await page.getByRole('button', { name: 'Okul', exact: true }).click();
    await expect(grup('Kişisel')).toHaveAttribute('aria-pressed', 'mixed');
    await expect(gor(okul)).toBeHidden();

    // Hepsi kapalı → ekran söyler.
    await page.getByRole('button', { name: 'Kişisel', exact: true }).click();
    await expect(page.getByText('Hiçbir katman açık değil')).toBeVisible();

    // İki grup birden → ikisi de görünür.
    await grup('Kişisel').click();
    await grup('İş').click();
    await expect(gor(okul)).toBeVisible();
    await expect(gor(is)).toBeVisible();
  } finally {
    await takvimSondaSil(onek);
  }
});
