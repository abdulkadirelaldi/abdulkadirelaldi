import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { DILLER, type Dil } from '@/i18n/diller';

/**
 * `scripts/cv-pdf.mjs`in ürettiği dil başına CV PDF'i — `public/cv/`. Dosya
 * MODÜL YÜKLENİRKEN bir kez aranır (yalnızca dağıtımla değişir). Sorgudaki
 * `v` dosyanın değişme anı: `public/` görselleri 7 gün önbellekte (next.config)
 * ve CV güncellenince eski PDF'in inmesi istenmez.
 */
export const URETILMIS_CV = Object.fromEntries(
  DILLER.map((d) => {
    const dosya = join(process.cwd(), 'public', 'cv', `abdulkadir-elaldi-cv-${d}.pdf`);
    if (!existsSync(dosya)) return [d, null];
    return [d, `/cv/abdulkadir-elaldi-cv-${d}.pdf?v=${Math.floor(statSync(dosya).mtimeMs)}`];
  }),
) as Record<Dil, string | null>;
