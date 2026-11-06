import { expect, test, type Page } from '@playwright/test';

import { dersBul } from '../../src/lib/ingilizce/mufredat';
import type { Alistirma } from '../../src/lib/ingilizce/tipler';

import { adminCredentials, findAdminUser, ingilizceSondaSil } from './_helpers/db';
import { applySessionCookie } from './_helpers/session';

/**
 * İNGİLİZCE DERSİ BAŞTAN SONA (2026-11-06): ilk ders gerçek tarayıcıda oynanır — her alıştırma
 * türü doğru cevaplanır, konuşma atlanır (tarayıcıda mikrofon yok), bitişte XP sunucudan gelir.
 * Cevaplar müfredattan okunur: içerik değişse de test aynı kalır.
 */
const DERS = 'gunluk-u1-d1';
const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function cevapla(page: Page, a: Alistirma): Promise<void> {
  switch (a.tur) {
    case 'bosluk':
    case 'secmeli':
      await page
        .getByRole('radio', { name: new RegExp(`(^|\\) )${kacis(a.secenekler[a.dogru]!)}$`) })
        .click();
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    case 'dinle': {
      const { kelimeler } = await import('../../src/lib/ingilizce/degerlendir');
      const kutular = page.getByRole('group', { name: 'Kelimeler' });
      for (const k of kelimeler(a.cumle)) {
        await kutular
          .getByRole('button', { name: k, exact: true })
          .and(page.locator(':enabled'))
          .first()
          .click();
      }
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    }
    case 'yaz':
      await page.getByLabel('İngilizce çeviri').fill(a.cevaplar[0]!);
      await page.getByRole('button', { name: 'Kontrol et' }).click();
      return;
    case 'eslestir':
      for (const [en, tr] of a.ciftler) {
        await page
          .getByRole('group', { name: 'İngilizce' })
          .getByRole('button', { name: en, exact: true })
          .click();
        await page
          .getByRole('group', { name: 'Türkçe' })
          .getByRole('button', { name: tr, exact: true })
          .click();
      }
      return;
    case 'konus':
      await page.getByRole('button', { name: 'Şu an konuşamıyorum' }).click();
      return;
  }
}

test('ilk ders oynanır, XP kaydedilir', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const baslangic = new Date();
  const { email } = adminCredentials();
  const yonetici = await findAdminUser();
  await applySessionCookie(
    page.context(),
    { userId: yonetici.id, email, twoFactorEnabled: true },
    baseURL ?? 'http://127.0.0.1:3100',
  );
  const ders = dersBul(DERS)!.ders;

  try {
    await page.goto('/panel/ingilizce');
    await expect(page.getByRole('heading', { name: /1\. / }).first()).toBeVisible();
    await page.goto(`/panel/ingilizce/ders/${DERS}`);
    await page.getByRole('button', { name: /Derse başla/ }).click();

    for (let tur = 0; tur < ders.alistirmalar.length * 2; tur += 1) {
      if (await page.getByRole('heading', { name: 'Ders bitti!' }).isVisible()) break;
      const id = await page.locator('[data-alistirma]').getAttribute('data-alistirma');
      const a = ders.alistirmalar.find((x) => x.id === id)!;
      await cevapla(page, a);
      if (a.tur === 'konus') continue;
      const devam = page.getByRole('button', { name: 'Devam' });
      await expect(devam).toBeVisible();
      if (a.tur !== 'eslestir')
        await expect(page.getByRole('status')).toContainText(/Harika|Neredeyse/);
      await devam.click();
    }

    await expect(page.getByRole('heading', { name: 'Ders bitti!' })).toBeVisible();
    await expect(page.getByText(/^\+\d+$/)).toBeVisible();
    await expect(page.getByText('Günlük hedef')).toBeVisible();
  } finally {
    await ingilizceSondaSil(DERS, baslangic);
  }
});
