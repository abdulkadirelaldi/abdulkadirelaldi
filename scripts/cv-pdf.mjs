/**
 * CV PDF'leri — `/cv` sayfasının YAZDIRMA görünümünden, üç dil (2026-10-23).
 *
 *   node scripts/cv-pdf.mjs [taban-adres]     # varsayılan http://127.0.0.1:3005
 *
 * NEDEN BÖYLE: panelden PDF yüklemek R2 ister ve R2 henüz yok; ziyaretçi
 * "PDF yakında" görüyordu. `/cv` zaten yazdırmaya göre tasarlandı (globals.css
 * `@media print`: A4, beyaz kâğıt, mürekkep paleti) — PDF'i tarayıcının kendi
 * yazdırma motoru üretiyor, ikinci bir şablon yok. İçerik değişince yeniden
 * çalıştırılır; çıktı `public/cv/` altında, depoya girer, imajla yayına çıkar.
 *
 * Öncelik: panelden YÜKLENEN CV > `public/cv/ozel/` altındaki sahibin kendi PDF'i >
 * bu betiğin çıktısı (bkz. src/components/public/uretilmis-cv.ts).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

const TABAN = process.argv[2] ?? 'http://127.0.0.1:3005';
const SAYFALAR = { tr: '/cv', en: '/en/cv', de: '/de/lebenslauf' };
const HEDEF = join(process.cwd(), 'public', 'cv');
mkdirSync(HEDEF, { recursive: true });

const tarayici = await chromium.launch();
const sayfa = await tarayici.newPage();
for (const [dil, yol] of Object.entries(SAYFALAR)) {
  const yanit = await sayfa.goto(TABAN + yol, { waitUntil: 'networkidle' });
  if (yanit?.status() !== 200) throw new Error(`${yol} → ${yanit?.status()}`);
  await sayfa.emulateMedia({ media: 'print' });
  const dosya = join(HEDEF, `abdulkadir-elaldi-cv-${dil}.pdf`);
  await sayfa.pdf({ path: dosya, preferCSSPageSize: true, printBackground: true });
  process.stdout.write(`[cv-pdf] ${dil} → ${dosya}\n`);
}
await tarayici.close();
