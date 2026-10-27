import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type SayfaBasligiProps = {
  baslik: string;
  /** Başlığın üstündeki kısa bölüm etiketi (ör. "Projeler"); verilmezse yok. */
  ust?: string;
  aciklama?: ReactNode;
  /** Sağda/altta ek eylem (ör. CV indir). */
  ek?: ReactNode;
  className?: string;
};

/**
 * İç sayfa başlığı — 2026-10-27 kurumsal tasarım.
 *
 * Önceki sürüm (ADR-045) terminal istemi, yanıp sönen imleç ve harf harf
 * yükselen 9rem başlık taşıyordu; "şablon" hissinin ana kaynağıydı. Şimdi
 * olağan bir sayfa başlığı: ince bir alt çizgiyle içerikten ayrılan, gövde
 * fontunda h1 ve açıklama.
 */
export function SayfaBasligi({ baslik, ust, aciklama, ek, className }: SayfaBasligiProps) {
  return (
    <header className={cn('border-line border-b pt-32 pb-10 md:pt-36 md:pb-14', className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          {ust && <p className="text-accent text-sm font-semibold">{ust}</p>}
          <h1 className="dev-baslik text-primary text-4xl md:text-5xl">{baslik}</h1>
          {aciklama && <div className="text-body text-base md:text-lg">{aciklama}</div>}
        </div>
        {ek && <div className="shrink-0">{ek}</div>}
      </div>
    </header>
  );
}
