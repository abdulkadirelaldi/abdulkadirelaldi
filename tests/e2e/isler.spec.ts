import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, islerSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * İŞLER BAŞTAN SONA (ADR-050/057): hızlı ekle (Enter) → formla bugünkü Kıyı Medya işi (etiketli) →
 * alan süzgeci → sokakta pano + dükkâna giriş → tik → "Bitenler" → geri al → Bugün panosunda kart. İzler `e2e-isler-` önekiyle.
 */
const istanbulBugun = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

async function oturumAc(page: Page, baseURL: string | undefined) {
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
}

test('işler: hızlı ekle, formla ekle, süz, tikle, bitenler ve Bugün kartı', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(90_000);
  const onek = `e2e-isler-${info.project.name}-${Date.now()}`;
  const hizli = `${onek} kitap al`;
  const kurgu = `${onek} reels kurgusu`;
  await oturumAc(page, baseURL);

  try {
    await page.goto('/panel/isler?gorunum=liste');
    await expect(page.getByRole('heading', { name: 'İşler', level: 1 })).toBeVisible();

    // Hızlı ekle: yaz + Enter → Tarihsiz öbeğinde, Kişisel.
    await page.getByLabel('Hızlı ekle').fill(hizli);
    await page.getByLabel('Hızlı ekle').press('Enter');
    const tarihsiz = page.getByRole('region', { name: /Tarihsiz/ });
    await expect(tarihsiz.getByText(hizli)).toBeVisible();
    await expect(page.getByLabel('Hızlı ekle')).toHaveValue('');

    // Formla: bugün, Kıyı Medya, etiket.
    await page.getByRole('button', { name: 'Ayrıntılı ekle' }).click();
    const pencere = page.getByRole('dialog', { name: 'Yeni iş' });
    await pencere.getByLabel('Ne yapılacak?').fill(kurgu);
    await pencere.getByRole('radio', { name: 'Kıyı Medya' }).click();
    await pencere.getByLabel('Gün').fill(istanbulBugun());
    await pencere.getByLabel('Saat').fill('21:00');
    // Etiket = önek: dükkân testin kendisine ait olur, temizlikte kaydıyla gider (ADR-058).
    await pencere.getByLabel('Etiket').fill(onek);
    await page.screenshot({ path: `test-results/isler-form-${info.project.name}.png` });
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();

    const bugun = page.getByRole('region', { name: /^Bugün/ });
    const satir = bugun.getByRole('listitem').filter({ hasText: kurgu });
    await expect(satir).toContainText(onek);
    await expect(satir).toContainText('Bugün 21:00');
    await page.screenshot({
      path: `test-results/isler-liste-${info.project.name}.png`,
      fullPage: true,
    });

    // Süzgeç: Okul seçilince Kıyı işi görünmez, Kıyı seçilince görünür.
    await page.getByRole('tab', { name: /Okul/ }).click();
    await expect(page.getByText(kurgu)).toBeHidden();
    await page.getByRole('tab', { name: /Kıyı Medya/ }).click();
    await expect(page.getByText(kurgu)).toBeVisible();
    await expect(page.getByText(hizli)).toBeHidden();
    await page.getByRole('tab', { name: /Tümü/ }).click();

    // Bugün panosunda kart.
    await page.goto('/panel');
    const kart = page.getByRole('region', { name: 'Bugünün işleri' });
    await expect(kart.getByText(kurgu)).toBeVisible();

    // Sokak (ADR-057): iş dikkat panosunda; testin dükkânına girilir, tik orada atılır.
    await page.goto('/panel/isler');
    const pano = page.getByRole('region', { name: 'Dikkat panosu' });
    await expect(pano.getByText(kurgu)).toBeVisible();
    await page.screenshot({
      path: `test-results/isler-sokak-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: new RegExp(`^${onek} — `) }).click();
    await expect(page).toHaveURL(/dukkan=/);
    await expect(page.getByRole('heading', { name: onek, level: 2 })).toBeVisible();
    await expect(page.getByText(hizli)).toBeHidden();

    // Dükkân kaydı (ADR-058): Drive + paket → sayaç +1.
    await page.getByRole('button', { name: `${onek} dükkânını düzenle` }).click();
    const dk = page.getByRole('dialog', { name: `${onek} — dükkân` });
    await dk.getByLabel('Drive klasörü').fill('https://drive.google.com/drive/folders/e2e');
    await dk.getByLabel('Aylık paket var').check();
    await dk.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(dk).toBeHidden();
    await expect(page.getByRole('link', { name: 'Drive' })).toHaveAttribute(
      'href',
      'https://drive.google.com/drive/folders/e2e',
    );
    await expect(page.getByText('0/4')).toBeVisible();
    // Sayaç önce ekranda işlenir; yenilemeden önce sunucu eyleminin yanıtı beklenir.
    const kayit = page.waitForResponse((r) => r.request().method() === 'POST' && r.ok());
    await page.getByRole('button', { name: 'Reels teslim edildi, bir artır' }).click();
    await expect(page.getByText('1/4')).toBeVisible();
    await kayit;
    await page.reload();
    await expect(page.getByText('1/4')).toBeVisible();

    // Tik → Bitenler; geri al → yeniden Bugün.
    await page.getByRole('checkbox', { name: `${kurgu} — bitti olarak işaretle` }).click();
    await expect(page.getByRole('region', { name: /^Bugün/ }).getByText(kurgu)).toBeHidden();
    await page.getByText(/Bitenler · son 7 gün/).click();
    const geriAl = page.getByRole('checkbox', { name: `${kurgu} — bitti, geri al` });
    await expect(geriAl).toBeChecked();
    await page.screenshot({
      path: `test-results/isler-biten-${info.project.name}.png`,
      fullPage: true,
    });
    await geriAl.click();
    await expect(page.getByRole('region', { name: /^Bugün/ }).getByText(kurgu)).toBeVisible();

    // Acil işareti (ADR-058): formdan → satırda "Acil".
    await page.getByRole('button', { name: new RegExp(kurgu) }).click();
    const acilForm = page.getByRole('dialog', { name: 'İşi düzenle' });
    await acilForm.getByLabel('Acil').check();
    await acilForm.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(acilForm).toBeHidden();
    await expect(
      page.getByRole('listitem').filter({ hasText: kurgu }).getByText('Acil', { exact: true }),
    ).toBeVisible();

    // Düzenle → sil.
    await page.getByRole('button', { name: new RegExp(kurgu) }).click();
    const duzenle = page.getByRole('dialog', { name: 'İşi düzenle' });
    await duzenle.getByRole('button', { name: 'Sil' }).click();
    await duzenle.getByRole('button', { name: 'Eminim, sil' }).click();
    await expect(page.getByText(kurgu)).toBeHidden();
  } finally {
    await islerSondaSil(onek);
  }
});
