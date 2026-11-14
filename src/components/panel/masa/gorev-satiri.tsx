'use client';

import { Check } from 'lucide-react';

import { teslimMetni } from '@/lib/masa/bicim';
import { TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { cn } from '@/lib/utils/cn';
import type { AppDay } from '@/server/services/_shared/app-date';
import type { GorevDto } from '@/server/services/masa';

const TESLIM_RENGI = {
  gecikti: 'text-danger font-medium',
  bugun: 'text-accent font-medium',
  yakin: 'text-primary',
  ileri: 'text-muted',
  yok: 'text-muted',
} as const;

/**
 * GÖREV SATIRI (ADR-049 M2). Solda tamamla kutusu (tek dokunuş), ortada başlık + nerede/ne zaman;
 * satıra dokunmak düzenlemeyi açar. `yerGoster` dolap ekranında kapalı (zaten o dolaptasın).
 */
export function GorevSatiri({
  g,
  bugun,
  durumDegistir,
  ac,
  yerGoster = true,
}: {
  g: GorevDto;
  bugun: AppDay;
  durumDegistir: (g: GorevDto) => void;
  ac: (g: GorevDto) => void;
  yerGoster?: boolean;
}) {
  const bitti = g.durum === 'TAMAMLANDI';
  const teslim = teslimMetni(g, bugun);
  const yer = g.dolap
    ? `${g.dolap.emoji} ${g.dolap.ad}${g.raf ? ` › ${g.raf}` : ''}`
    : TAKVIM_KATMANLARI.KISISEL.ad;

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={bitti}
        aria-label={`${g.baslik} — ${bitti ? 'tamamlandı, geri al' : 'tamamla'}`}
        onClick={() => durumDegistir(g)}
        className={cn(
          'focus-ring flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          bitti ? 'border-success bg-success text-white' : 'border-line-hover hover:border-accent',
        )}
      >
        {bitti && <Check className="size-4" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => ac(g)}
        className="focus-ring flex min-h-11 min-w-0 flex-1 flex-col items-start rounded text-left"
      >
        <span
          className={cn(
            'text-primary w-full truncate text-sm font-medium',
            bitti && 'text-muted line-through',
          )}
        >
          {g.oncelik === 'YUKSEK' && !bitti && (
            <span className="text-danger mr-1" aria-label="Yüksek öncelik">
              ‼
            </span>
          )}
          {g.baslik}
        </span>
        <span className="text-muted flex w-full min-w-0 gap-1.5 truncate text-xs">
          {!bitti && (
            <span className={cn('shrink-0', TESLIM_RENGI[teslim.durum])}>{teslim.metin}</span>
          )}
          {yerGoster && (
            <>
              {!bitti && <span aria-hidden="true">·</span>}
              <span className="truncate">{yer}</span>
            </>
          )}
          {!yerGoster && g.raf && (
            <>
              {!bitti && <span aria-hidden="true">·</span>}
              <span className="truncate">{g.raf}</span>
            </>
          )}
        </span>
      </button>
    </li>
  );
}

/** Başlıklı görev öbeği; boşsa hiç basılmaz (boş başlık gürültüdür). */
export function GorevObegi({
  baslik,
  gorevler,
  ton = 'normal',
  children,
}: {
  baslik: string;
  gorevler: readonly GorevDto[];
  ton?: 'normal' | 'tehlike';
  children: (g: GorevDto) => React.ReactNode;
}) {
  if (gorevler.length === 0) return null;
  const id = `obek-${baslik.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h3
        id={id}
        className={cn('text-sm font-semibold', ton === 'tehlike' ? 'text-danger' : 'text-primary')}
      >
        {baslik} <span className="text-muted font-normal">· {gorevler.length}</span>
      </h3>
      <ul className="rounded-card border-line bg-surface divide-line divide-y border">
        {gorevler.map(children)}
      </ul>
    </section>
  );
}
