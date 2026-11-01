import Link from 'next/link';

import { DURUM_GORUNUMLERI, icerikYolu } from '@/components/panel/icerik-gorunumleri';
import type { Dil } from '@/i18n/diller';

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
    <nav aria-label="Durum süzgeci" className="sekme-seridi">
      <ul className="flex min-w-max gap-1.5">
        {DURUM_GORUNUMLERI.map((gorunum) => {
          const secili = gorunum.anahtar === aktif;
          return (
            <li key={gorunum.anahtar}>
              <Link
                href={icerikYolu(taban, { durum: gorunum.anahtar, dil })}
                aria-current={secili ? 'page' : undefined}
                className="focus-ring sekme"
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
