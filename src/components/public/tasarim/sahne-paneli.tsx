import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type SahnePaneliProps = {
  children: ReactNode;
  /** `acik`: aydınlık token'larla (örnekteki "SERVICES"); `koyu`: zemin rengi. */
  ton: 'acik' | 'koyu';
  /** Üst üste binme sırası — sonraki panel öncekinin üstüne kayar. */
  katman: number;
  id?: string;
  className?: string;
  'aria-labelledby'?: string;
};

/**
 * ADR-045 — bir öncekinin üstüne kayan bölüm paneli.
 *
 * Panel ekrana girerken %94'ten %100'e büyüyor (`.panel-otur`, SAF CSS
 * scroll-driven — globals.css). Negatif üst boşluk + yuvarlak üst köşeler bir
 * önceki bölümün altına binmesini sağlıyor. Sunucu bileşeni, JS yok.
 *
 * `acik` ton `.panel-acik` sınıfıyla ÖLÇÜLMÜŞ aydınlık token'ları kapsamlı
 * basıyor — içindeki her bileşen (form dahil) kendiliğinden aydınlığa geçiyor.
 */
export function SahnePaneli({ children, ton, katman, id, className, ...aria }: SahnePaneliProps) {
  return (
    <section
      id={id}
      aria-labelledby={aria['aria-labelledby']}
      style={{ zIndex: katman }}
      className={cn(
        'panel-otur relative -mt-10 scroll-mt-10 rounded-t-[2.5rem] md:rounded-t-[3.5rem]',
        ton === 'acik' ? 'panel-acik bg-canvas text-body' : 'bg-canvas border-line border-t',
        className,
      )}
    >
      {children}
    </section>
  );
}
