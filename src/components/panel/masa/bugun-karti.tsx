import { ChevronRight, ListChecks } from 'lucide-react';
import Link from 'next/link';

import { teslimMetni } from '@/lib/masa/bicim';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { GorevDto } from '@/server/services/masa';

const EN_COK = 4;

/**
 * BUGÜN PANOSUNDA GÖREVLER (ADR-049 M2) — teslimi bugün ya da geçmiş açık görevler. Sunucu
 * bileşeni; dokununca Masa açılır (tamamlama orada).
 */
export function BugunGorevKarti({
  bugun,
  gorevler,
}: {
  bugun: AppDay;
  gorevler: readonly GorevDto[];
}) {
  return (
    <section aria-labelledby="gorev-baslik" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="gorev-baslik" className="text-primary text-base font-semibold">
          Bugünün görevleri
        </h3>
        <Link
          href="/panel/masa"
          className="focus-ring text-accent inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded text-xs font-medium"
        >
          Masa
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {gorevler.length === 0 ? (
        <Link
          href="/panel/masa"
          className="focus-ring rounded-card border-line-hover text-muted flex items-center justify-center gap-2 border border-dashed p-4 text-center text-sm"
        >
          <ListChecks className="size-4" aria-hidden="true" />
          Bugün teslimi olan görev yok
        </Link>
      ) : (
        <Link
          href="/panel/masa"
          className="focus-ring rounded-card border-line bg-surface flex flex-col border"
        >
          <ul className="divide-line divide-y">
            {gorevler.slice(0, EN_COK).map((g) => {
              const t = teslimMetni(g, bugun);
              return (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span aria-hidden="true" className="text-base">
                    {g.dolap?.emoji ?? '☑️'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-primary truncate text-sm font-medium">{g.baslik}</span>
                    <span
                      className={cn(
                        'truncate text-xs',
                        t.durum === 'gecikti' ? 'text-danger font-medium' : 'text-muted',
                      )}
                    >
                      {t.metin}
                      {g.dolap && ` · ${g.dolap.ad}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {gorevler.length > EN_COK && (
            <span className="text-muted border-line border-t px-4 py-2 text-xs">
              +{gorevler.length - EN_COK} görev daha
            </span>
          )}
        </Link>
      )}
    </section>
  );
}
