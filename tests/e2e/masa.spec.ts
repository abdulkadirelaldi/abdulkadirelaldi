import { expect, test, type Page } from '@playwright/test';

import { adminCredentials, findAdminUser, masaSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * MASA BAŞTAN SONA (ADR-049 M2): dolap aç (Okul katmanı) → raf ve alt raf → rafa görev (uzak
 * tarih) ve dolapsız bugünkü görev → masa üstünde "Bugün" → tamamla → "tamamlananlar" →
 * uzak görev takvimde Okul katmanında, dokununca dolabına gider → içi dolu dolap silinmez.
 * İzler `e2e-masa-` önekiyle silinir.
 */
const UZAK = '2031-07-16';
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

test('masa: dolap, raf, görev; masa üstü, tamamla ve takvimde katman', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  const onek = `e2e-masa-${info.project.name}-${Date.now()}`;
  const dolapAdi = `${onek} Okul`;
  const odev = `${onek} Fizik ödevi`;
  const bugunku = `${onek} Kırtasiye`;
  await oturumAc(page, baseURL);

  try {
    await page.goto('/panel/masa');
    await page.getByRole('button', { name: 'Yeni dolap' }).click();
    let pencere = page.getByRole('dialog', { name: 'Yeni dolap' });
    await pencere.getByLabel('Dolap adı').fill(dolapAdi);
    await pencere.getByRole('radio', { name: '🎓' }).click();
    await pencere
      .getByRole('radiogroup', { name: 'Takvim katmanı' })
      .getByRole('radio', { name: 'Okul' })
      .click();
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();

    // Kayıttan sonra dolabın ekranı.
    await expect(page.getByRole('heading', { name: dolapAdi, level: 1 })).toBeVisible();
    await expect(page.getByText('Takvimde Okul katmanı')).toBeVisible();
    const dolapAdresi = new URL(page.url()).pathname;
    expect(dolapAdresi).toMatch(/^\/panel\/masa\/[^/]+$/);

    // Raf ve alt raf.
    await page.getByRole('button', { name: 'Yeni raf' }).click();
    pencere = page.getByRole('dialog', { name: 'Yeni raf' });
    await pencere.getByLabel('Raf adı').fill('Derslerim');
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();
    await page.getByRole('button', { name: 'Yeni raf' }).click();
    pencere = page.getByRole('dialog', { name: 'Yeni raf' });
    await pencere.getByLabel('Raf adı').fill('Fizik');
    await pencere.getByLabel('Üst raf').selectOption({ label: 'Derslerim' });
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();

    // Fizik rafına görev — raf ve dolap önceden seçili gelir.
    await page.getByRole('button', { name: 'Fizik rafına görev ekle' }).click();
    pencere = page.getByRole('dialog', { name: 'Yeni görev' });
    await expect(pencere.getByLabel('Raf')).toHaveValue(/.+/);
    await pencere.getByLabel('Başlık').fill(odev);
    await pencere.getByLabel('Teslim günü').fill(UZAK);
    await pencere.getByLabel('Saat').fill('14:30');
    await pencere.getByRole('radio', { name: 'Yüksek' }).click();
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();
    await expect(page.getByRole('button', { name: new RegExp(kacis(odev)) })).toBeVisible();

    // Fizik rafına not (M2b) — kaydet, yeniden aç, düzenle.
    const notAdi = `${onek} Newton yasaları`;
    await page.getByRole('button', { name: 'Fizik rafına not ekle' }).click();
    pencere = page.getByRole('dialog', { name: 'Yeni not' });
    await pencere.getByLabel('Başlık').fill(notAdi);
    await pencere.getByLabel('Not', { exact: true }).fill('F = m·a');
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();
    await page.getByRole('button', { name: new RegExp(kacis(notAdi)) }).click();
    pencere = page.getByRole('dialog', { name: 'Not' });
    await expect(pencere.getByLabel('Not', { exact: true })).toHaveValue('F = m·a');
    await pencere.getByLabel('Not', { exact: true }).fill('F = m·a — eylemsizlik, etki-tepki');
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();
    await page.getByRole('button', { name: new RegExp(kacis(notAdi)) }).click();
    await expect(
      page.getByRole('dialog', { name: 'Not' }).getByLabel('Not', { exact: true }),
    ).toHaveValue('F = m·a — eylemsizlik, etki-tepki');
    await page.keyboard.press('Escape');

    // İçi dolu dolap silinmez — mesaj ekranda.
    await page.getByRole('button', { name: 'Dolabı düzenle' }).click();
    pencere = page.getByRole('dialog', { name: 'Dolabı düzenle' });
    await pencere.getByRole('button', { name: 'Sil', exact: true }).click();
    await pencere.getByRole('button', { name: 'Eminim, sil' }).click();
    await expect(pencere.getByRole('alert')).toContainText('önce boşalt');
    await pencere.getByRole('button', { name: 'Vazgeç' }).click();

    // Masa üstünde bugünkü dolapsız görev.
    await page.goto('/panel/masa');
    await page.getByRole('button', { name: 'Yeni görev' }).click();
    pencere = page.getByRole('dialog', { name: 'Yeni görev' });
    await pencere.getByLabel('Başlık').fill(bugunku);
    await pencere.getByLabel('Teslim günü').fill(istanbulBugun());
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(pencere).toBeHidden();
    const bugunObegi = page.getByRole('region', { name: /^Bugün/ });
    await expect(
      bugunObegi.getByRole('button', { name: new RegExp(kacis(bugunku)) }),
    ).toBeVisible();

    // Tamamla → öbekten çıkar, tamamlananlara girer.
    await page.getByRole('checkbox', { name: `${bugunku} — tamamla` }).click();
    await expect(bugunObegi.getByRole('button', { name: new RegExp(kacis(bugunku)) })).toBeHidden();
    await page.getByText(/Son 7 günde tamamlananlar/).click();
    await expect(
      page.getByRole('checkbox', { name: `${bugunku} — tamamlandı, geri al` }),
    ).toBeVisible();

    // Uzak görev takvimde, Okul katmanında; İş grubu kapalıyken de görünür, Kişisel kapalıyken gizli.
    await page.goto(`/panel/takvim?gorunum=ay&tarih=${UZAK}`);
    const takvimde = page
      .locator(`[data-gun="${UZAK}"]`)
      .getByRole('button', { name: new RegExp(kacis(odev)) });
    await expect(takvimde).toBeVisible();
    await page.getByRole('button', { name: 'İş grubu' }).click();
    await expect(takvimde).toBeVisible();
    await page.getByRole('button', { name: 'Okul', exact: true }).click();
    await expect(takvimde).toBeHidden();
    await page.getByRole('button', { name: 'Okul', exact: true }).click();

    // Dokununca dolabına gider.
    await takvimde.click();
    await expect(page).toHaveURL(new RegExp(`${kacis(dolapAdresi)}$`));
    await expect(page.getByRole('heading', { name: dolapAdi, level: 1 })).toBeVisible();
  } finally {
    await masaSondaSil(onek);
  }
});

/**
 * KIYI MEDYA KÖPRÜSÜ (ADR-049 M3): köprü anahtarı tanımlı değilken (CI, yerel) Kıyı Medya
 * katmanındaki dolap bunu SÖYLER — sıfır gelir/gider gösterip "her şey yolunda" demez.
 */
test('masa: Kıyı Medya dolabı köprü bağlı değilken bunu söyler', async ({ page, baseURL }, info) => {
  const onek = `e2e-masa-kiyi-${info.project.name}-${Date.now()}`;
  await oturumAc(page, baseURL);
  try {
    await page.goto('/panel/masa');
    await page.getByRole('button', { name: 'Yeni dolap' }).click();
    const pencere = page.getByRole('dialog', { name: 'Yeni dolap' });
    await pencere.getByLabel('Dolap adı').fill(`${onek} Kıyı`);
    await pencere
      .getByRole('radiogroup', { name: 'Takvim katmanı' })
      .getByRole('radio', { name: 'Kıyı Medya' })
      .click();
    await pencere.getByRole('button', { name: 'Kaydet', exact: true }).click();
    const ozet = page.getByRole('region', { name: 'Kıyı Medya — bu ay' });
    await expect(ozet).toContainText('Köprü bağlı değil');
    await expect(ozet).not.toContainText('₺');
    await expect(ozet.getByRole('link', { name: 'Kıyı Medya paneli' })).toHaveAttribute(
      'href',
      /\/admin\/dashboard$/,
    );
  } finally {
    await masaSondaSil(onek);
  }
});
