'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

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
 * Panel ekrana girerken %94'ten %100'e büyüyor; kenarlar içeri çekik başlayıp
 * tam genişliğe açılıyor — örnekteki "kart yukarı süzülüp sahneyi kaplıyor"
 * hissi. Negatif üst boşluk + yuvarlak üst köşeler bir önceki bölümün altına
 * binmesini sağlıyor.
 *
 * `acik` ton `.panel-acik` sınıfıyla ÖLÇÜLMÜŞ aydınlık token'ları kapsamlı
 * basıyor (globals.css) — içindeki her bileşen (form dahil) kendiliğinden
 * aydınlık renge geçiyor, ayrı bir "açık sürüm" yazmak gerekmiyor.
 *
 * Hareket azaltılmışsa ölçek uygulanmıyor.
 */
export function SahnePaneli({ children, ton, katman, id, className, ...aria }: SahnePaneliProps) {
  const kap = useRef<HTMLElement>(null);
  const azHareket = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: kap, offset: ['start end', 'start 35%'] });
  const olcek = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <motion.section
      ref={kap}
      id={id}
      aria-labelledby={aria['aria-labelledby']}
      style={azHareket ? { zIndex: katman } : { scale: olcek, zIndex: katman }}
      className={cn(
        'relative -mt-10 origin-top scroll-mt-10 rounded-t-[2.5rem] md:rounded-t-[3.5rem]',
        ton === 'acik' ? 'panel-acik bg-canvas text-body' : 'bg-canvas border-line border-t',
        className,
      )}
    >
      {children}
    </motion.section>
  );
}
