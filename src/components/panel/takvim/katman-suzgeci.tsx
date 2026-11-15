'use client';

import { cn } from '@/lib/utils/cn';
import {
  grupDegistir,
  grupDurumu,
  KATMAN_GRUPLARI,
  KATMAN_SIRASI,
  katmanDegistir,
  type KatmanGrubu,
  TAKVIM_KATMANLARI,
} from '@/lib/takvim/katmanlar';
import type { TakvimKatman } from '@/types';

const GRUPLAR = Object.keys(KATMAN_GRUPLARI) as KatmanGrubu[];

/**
 * KATMAN SÜZGECİ (ADR-049). Üstte iki grup düğmesi (Kişisel = Kişisel + Okul, İş = Kıyı Medya +
 * Spectraloop), yanında dört katman. Grup kısmen açıksa `aria-pressed="mixed"` ve kesik kenar.
 */
export function KatmanSuzgeci({
  acik,
  degistir,
}: {
  acik: readonly TakvimKatman[];
  degistir: (yeni: TakvimKatman[]) => void;
}) {
  return (
    <div role="group" aria-label="Takvim katmanları" className="flex flex-wrap items-center gap-2">
      {GRUPLAR.map((g) => {
        const durum = grupDurumu(acik, g);
        return (
          <button
            key={g}
            type="button"
            aria-pressed={durum === 'acik' ? true : durum === 'kismen' ? 'mixed' : false}
            // Görünen ad etiketin başında (WCAG 2.5.3); yandaki "Kişisel" katmanından ayrışsın.
            aria-label={`${KATMAN_GRUPLARI[g].ad} grubu`}
            onClick={() => degistir(grupDegistir(acik, g))}
            className={cn(
              'focus-ring min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors',
              durum === 'acik' && 'border-accent bg-accent text-white',
              durum === 'kismen' && 'border-accent text-primary bg-accent/12 border-dashed',
              durum === 'kapali' && 'border-line bg-elevated text-muted',
            )}
          >
            {KATMAN_GRUPLARI[g].ad}
          </button>
        );
      })}
      <span aria-hidden="true" className="bg-line mx-1 hidden h-5 w-px sm:block" />
      {KATMAN_SIRASI.map((k) => {
        const secili = acik.includes(k);
        return (
          <button
            key={k}
            type="button"
            aria-pressed={secili}
            onClick={() => degistir(katmanDegistir(acik, k))}
            className={cn(
              'focus-ring flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
              secili
                ? 'border-accent bg-accent/12 text-primary font-medium'
                : 'border-line text-muted line-through decoration-1',
            )}
          >
            <span aria-hidden="true" className={cn(!secili && 'opacity-50')}>
              {TAKVIM_KATMANLARI[k].emoji}
            </span>
            {TAKVIM_KATMANLARI[k].ad}
          </button>
        );
      })}
    </div>
  );
}
