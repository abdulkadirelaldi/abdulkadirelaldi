import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { DILLER, type Dil } from '@/i18n/diller';

/**
 * Dil başına indirilecek CV PDF'i — `public/cv/`. İki kaynak, ÖNCELİK SIRASIYLA:
 *
 *   1. `public/cv/ozel/abdulkadir-elaldi-cv-<dil>.pdf` — sahibinin KENDİ
 *      hazırladığı CV (2026-10-23: Türkçe; telefon numarası yayından önce
 *      metin katmanından SİLİNDİ — herkese açık dosya bot'larca taranır).
 *   2. `public/cv/abdulkadir-elaldi-cv-<dil>.pdf` — `scripts/cv-pdf.mjs`in
 *      `/cv` sayfasından ürettiği PDF (o dilde özel CV yoksa).
 *
 * Panelden yüklenen CV (R2) ikisinden de önce gelir — bkz. `cv-indir.tsx`.
 *
 * Dosyalar MODÜL YÜKLENİRKEN bir kez aranır (yalnızca dağıtımla değişir).
 * Sorgudaki `v` dosyanın değişme anı: CV güncellenince eski PDF inmesin.
 */
const ADAYLAR = (d: Dil) => [
  `cv/ozel/abdulkadir-elaldi-cv-${d}.pdf`,
  `cv/abdulkadir-elaldi-cv-${d}.pdf`,
];

export const URETILMIS_CV = Object.fromEntries(
  DILLER.map((d) => {
    const bulunan = ADAYLAR(d).find((yol) => existsSync(join(process.cwd(), 'public', yol)));
    if (!bulunan) return [d, null];
    const surum = Math.floor(statSync(join(process.cwd(), 'public', bulunan)).mtimeMs);
    return [d, `/${bulunan}?v=${surum}`];
  }),
) as Record<Dil, string | null>;
