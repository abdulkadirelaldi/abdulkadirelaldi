'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { ALANLAR, teslimMetni } from '@/lib/gorev/bicim';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { GorevDto } from '@/server/services/gorev';

const TESLIM_RENGI = {
  gecikti: 'text-danger',
  bugun: 'text-accent',
  yakin: 'text-body',
  ileri: 'text-muted',
  yok: 'text-muted',
} as const;

/**
 * GÖREV SATIRI (ADR-050). Solda tik (tek dokunuş), ortada başlık; altında renkli nokta + etiket
 * (yoksa alan) + teslim. Satıra dokunmak düzenlemeyi açar. Bilerek sade: öncelik, rozet, ikon yok.
 */
export function GorevSatiri({
  g,
  bugun,
  tikle,
  ac,
}: {
  g: GorevDto;
  bugun: AppDay;
  tikle: (g: GorevDto) => void;
  ac: (g: GorevDto) => void;
}) {
  const bitti = g.tamamlandiAt !== null;
  const teslim = teslimMetni(g, bugun);
  const alan = ALANLAR[g.alan];

  return (
    <li className="flex items-center gap-3 px-3 py-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={bitti}
        aria-label={`${g.baslik} — ${bitti ? 'bitti, geri al' : 'bitti olarak işaretle'}`}
        onClick={() => tikle(g)}
        className={cn(
          'focus-ring flex size-11 shrink-0 items-center justify-center rounded-full',
          'transition-transform active:scale-90',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-6 items-center justify-center rounded-full border-2 transition-colors',
            bitti ? 'border-success bg-success text-white' : 'border-line-hover',
          )}
        >
          {bitti && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      </button>
      <button
        type="button"
        onClick={() => ac(g)}
        className="focus-ring flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded py-1 text-left"
      >
        <span
          className={cn(
            'text-primary w-full truncate text-[0.9375rem]',
            bitti && 'text-muted line-through decoration-1',
          )}
        >
          {g.baslik}
        </span>
        <span className="text-muted flex w-full min-w-0 items-center gap-1.5 text-xs">
          <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', alan.nokta)} />
          <span className="truncate">{g.etiket ?? alan.ad}</span>
          {!bitti && g.acil && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-warning shrink-0 font-medium">Acil</span>
            </>
          )}
          {!bitti && teslim.metin && (
            <>
              <span aria-hidden="true">·</span>
              <span className={cn('shrink-0', TESLIM_RENGI[teslim.durum])}>{teslim.metin}</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Başlıklı görev öbeği; boşsa hiç basılmaz (boş başlık gürültüdür). */
export function GorevObegi({
  id,
  baslik,
  gorevler,
  ton = 'normal',
  children,
}: {
  id: string;
  baslik: string;
  gorevler: readonly GorevDto[];
  ton?: 'normal' | 'tehlike';
  children: (g: GorevDto) => ReactNode;
}) {
  if (gorevler.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2
        id={id}
        className={cn(
          'px-1 text-xs font-semibold tracking-wide uppercase',
          ton === 'tehlike' ? 'text-danger' : 'text-muted',
        )}
      >
        {baslik} <span className="font-normal">· {gorevler.length}</span>
      </h2>
      <ul className="rounded-card border-line bg-surface divide-line divide-y border">
        {gorevler.map(children)}
      </ul>
    </section>
  );
}
