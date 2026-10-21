'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type YuzenProps = {
  children: ReactNode;
  /** Kaydırma boyunca toplam dikey kayma (px). Negatif = yukarı. */
  hiz?: number;
  /** Kendi kendine süzülme gecikmesi (sn) — yan yana süsler aynı anda zıplamasın. */
  gecikme?: number;
  className?: string;
};

/**
 * ADR-045 — yüzen süs: kaydırmaya bağlı paralaks + kendi kendine süzülme.
 *
 * İki hareket iki ayrı katmanda: dış katman kaydırmayı (framer), iç katman
 * süzülmeyi (CSS `animate-yuzme`) taşıyor — aynı `transform`u paylaşsalar
 * biri ötekini ezerdi.
 *
 * Süs olduğu için `aria-hidden` ve `pointer-events-none`. Hareket azaltılmışsa
 * paralaks uygulanmıyor; CSS süzülmesini globals.css'teki blok durduruyor.
 */
export function Yuzen({ children, hiz = -120, gecikme = 0, className }: YuzenProps) {
  const kap = useRef<HTMLDivElement>(null);
  const azHareket = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: kap, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, hiz]);

  return (
    <motion.div
      ref={kap}
      aria-hidden="true"
      className={cn('pointer-events-none absolute', className)}
      style={azHareket ? undefined : { y }}
    >
      <div className="animate-yuzme" style={{ animationDelay: `${gecikme}s` }}>
        {children}
      </div>
    </motion.div>
  );
}
