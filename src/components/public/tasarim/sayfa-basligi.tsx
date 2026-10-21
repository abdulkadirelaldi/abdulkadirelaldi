import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import { HarfHarf } from './harf-harf';

export type SayfaBasligiProps = {
  /** Dev başlık — sayfanın TEK `h1`'i. */
  baslik: string;
  /** Başlığın üstündeki terminal yolu, ör. `~/projeler`. */
  yol: string;
  /** Başlığın altındaki giriş metni. */
  aciklama?: ReactNode;
  /** Sağ alt köşedeki ek (sayaç, düğme…). */
  ek?: ReactNode;
  /** Başlığın arkasındaki süsler (Yuzen + Parlak*). */
  susler?: ReactNode;
  className?: string;
};

/**
 * ADR-045 — iç sayfa başlığı.
 *
 * Üstte terminal istemi gibi bir yol (`~/projeler`) ve yanıp sönen imleç —
 * sitenin "yazılım mühendisi" imzası. Altında harf harf yükselen dev başlık.
 * Görsel harfler `aria-hidden`; ekran okuyucu `sr-only` metni duyar.
 */
export function SayfaBasligi({ baslik, yol, aciklama, ek, susler, className }: SayfaBasligiProps) {
  return (
    <header
      className={cn('relative isolate overflow-hidden pt-36 pb-12 md:pt-44 md:pb-16', className)}
    >
      {susler}
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-8">
        <p className="tabular text-muted flex items-center gap-2 text-xs">
          <span className="text-accent-soft">abdulkadir@site</span>
          <span aria-hidden="true">:</span>
          <span className="text-primary">{yol}</span>
          <span aria-hidden="true">$</span>
          <span
            aria-hidden="true"
            className="bg-accent-soft inline-block h-3.5 w-2 animate-pulse"
          />
        </p>

        <h1 className="dev-baslik text-primary text-[clamp(2.4rem,10vw,9rem)]">
          <span className="sr-only">{baslik}</span>
          <HarfHarf metin={baslik} baslangic={0.05} />
        </h1>

        {(aciklama || ek) && (
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            {aciklama && (
              <div className="text-body animate-sayfa-giris max-w-xl text-base [animation-delay:0.35s] md:text-lg">
                {aciklama}
              </div>
            )}
            {ek && <div className="animate-sayfa-giris shrink-0 [animation-delay:0.45s]">{ek}</div>}
          </div>
        )}
      </div>
    </header>
  );
}
