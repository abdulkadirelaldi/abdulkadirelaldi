import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { ALANLAR, teslimMetni } from '@/lib/gorev/bicim';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { GorevDto } from '@/server/services/gorev';

const EN_COK = 5;

/**
 * BUGÜN PANOSUNDA İŞLER (ADR-050) — teslimi bugün ya da geçmiş açık görevler. Sunucu bileşeni;
 * dokununca İşler açılır (tik orada).
 */
export function BugunIslerKarti({
  bugun,
  gorevler,
}: {
  bugun: AppDay;
  gorevler: readonly GorevDto[];
}) {
  return (
    <section aria-labelledby="isler-baslik" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="isler-baslik" className="text-primary text-base font-semibold">
          Bugünün işleri
        </h3>
        <Link
          href="/panel/isler"
          className="focus-ring text-accent inline-flex min-h-10 shrink-0 items-center gap-0.5 rounded text-xs font-medium"
        >
          Tümü
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <Link
        href="/panel/isler"
        className="focus-ring rounded-card border-line bg-surface flex flex-col border"
      >
        {gorevler.length === 0 ? (
          <span className="text-muted p-4 text-center text-sm">Bugün için iş yok.</span>
        ) : (
          <ul className="divide-line divide-y">
            {gorevler.slice(0, EN_COK).map((g) => {
              const t = teslimMetni(g, bugun);
              return (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    aria-hidden="true"
                    className="border-line-hover size-4 shrink-0 rounded-full border-2"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-primary truncate text-sm">{g.baslik}</span>
                    <span className="text-muted flex items-center gap-1.5 truncate text-xs">
                      <span
                        aria-hidden="true"
                        className={cn('size-1.5 shrink-0 rounded-full', ALANLAR[g.alan].nokta)}
                      />
                      {g.etiket ?? ALANLAR[g.alan].ad}
                      <span aria-hidden="true">·</span>
                      <span className={cn(t.durum === 'gecikti' && 'text-danger')}>{t.metin}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {gorevler.length > EN_COK && (
          <span className="text-muted border-line border-t px-4 py-2 text-xs">
            +{gorevler.length - EN_COK} iş daha
          </span>
        )}
      </Link>
    </section>
  );
}
