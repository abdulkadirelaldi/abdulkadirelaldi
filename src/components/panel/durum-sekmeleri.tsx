import Link from 'next/link';

import { DURUM_GORUNUMLERI, icerikYolu } from '@/components/panel/icerik-gorunumleri';
import type { Dil } from '@/i18n/diller';
import { cn } from '@/lib/utils/cn';

/**
 * Durum sekmeleri — T-041f'teki mesaj sekmeleriyle AYNI karar: her görünüm bir
 * ADRES, bu yüzden `Link` (düğme değil) ve `nav` (`tablist` değil).
 *
 * Sunucu süzüyor: `fetchProjectsForPanel` filtreyi Prisma'ya geçiriyor. İstemcide
 * süzmek, sayfalanmış bir listede zaten yanlış cevap verirdi — elde yalnızca
 * o sayfanın satırları var.
 *
 * SERVER COMPONENT: `'use client'` yok. Sekmeler yalnızca bağlantı olduğu için
 * istemci JS'i gerekmiyor.
 *
 * `dil` KORUNUYOR: İngilizce listede "Taslak"a geçmek Türkçe taslakları
 * göstermemeli (ADR-046).
 */
export function DurumSekmeleri({ taban, aktif, dil }: { taban: string; aktif: string; dil?: Dil }) {
  return (
    <nav aria-label="Durum süzgeci" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="flex min-w-max gap-1.5">
        {DURUM_GORUNUMLERI.map((gorunum) => {
          const secili = gorunum.anahtar === aktif;
          return (
            <li key={gorunum.anahtar}>
              <Link
                href={icerikYolu(taban, { durum: gorunum.anahtar, dil })}
                aria-current={secili ? 'page' : undefined}
                className={cn(
                  'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
                  secili
                    ? 'border-accent/40 bg-accent/12 text-accent-soft'
                    : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                )}
              >
                {gorunum.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
