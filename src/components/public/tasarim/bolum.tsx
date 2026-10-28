import type { ReactNode } from 'react';

import { BolumGiris } from '@/components/public/bolum-giris';
import { cn } from '@/lib/utils/cn';

export type BolumProps = {
  id: string;
  baslik: string;
  /** Başlığın altındaki kısa açıklama. */
  aciklama?: ReactNode;
  /** Başlık satırının sağındaki eylem (ör. "Tüm projeler"). */
  ek?: ReactNode;
  /** Zemin: bölümler beyaz/gri sırayla ayrışır — çizgi ya da süs yerine. */
  ton?: 'beyaz' | 'gri';
  children: ReactNode;
  className?: string;
};

/**
 * Ana sayfa bölümü — 2026-10-27 kurumsal tasarım.
 *
 * ADR-045'in kaydırdıkça dolan 10rem kontur başlıklarının, üst üste binen
 * yuvarlak "sahne panellerinin" ve yüzen şekillerin yerine: sabit genişlikte
 * bir kap, solda başlık + açıklama, sağda tek eylem. Bölümler zemin tonuyla
 * ayrışıyor. Başlık satırı ekrana girerken belirir (`BolumGiris`); içerik
 * kendi öğelerini ayrıca kademelendirir.
 */
export function Bolum({
  id,
  baslik,
  aciklama,
  ek,
  ton = 'beyaz',
  children,
  className,
}: BolumProps) {
  const baslikId = `${id}-baslik`;
  return (
    <section
      id={id}
      aria-labelledby={baslikId}
      className={cn(
        'scroll-mt-20 py-20 md:py-24',
        ton === 'gri' ? 'bg-surface border-line border-y' : 'bg-canvas',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <BolumGiris className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 id={baslikId} className="dev-baslik text-primary text-3xl md:text-4xl">
              {baslik}
            </h2>
            {aciklama && <div className="text-body text-base">{aciklama}</div>}
          </div>
          {ek && <div className="shrink-0">{ek}</div>}
        </BolumGiris>
        {children}
      </div>
    </section>
  );
}
