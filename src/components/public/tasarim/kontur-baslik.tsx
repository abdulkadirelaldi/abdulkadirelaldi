'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

import { cn } from '@/lib/utils/cn';

export type KonturBaslikProps = {
  metin: string;
  /** Başlık düzeyi — sayfada tek `h1` kuralı çağıranın sorumluluğunda. */
  as?: 'h1' | 'h2';
  id?: string;
  className?: string;
};

/**
 * ADR-045 — kaydırdıkça DOLAN kontur başlık (örnekteki "ABOUT ME").
 *
 * İKİ KATMAN, TEK METİN:
 *   - alttaki kontur kopya SÜS (`aria-hidden`), hep görünür;
 *   - üstteki DOLU kopya başlığın kendisi; `clip-path` ile soldan sağa açılır.
 * Ekran okuyucu metni BİR kez duyar; erişilebilir ad dolu katmandan gelir.
 *
 * İLERLEME: başlık ekranın altından girdiği an 0, ekranın ortasına geldiğinde
 * 1 — yani okuyucu başlığa vardığında yazı DOLMUŞ oluyor, yarım kalmıyor.
 *
 * HAREKET AZALTILMIŞSA dolu katman baştan tam görünür; kırpma hiç uygulanmaz.
 */
export function KonturBaslik({ metin, as: Etiket = 'h2', id, className }: KonturBaslikProps) {
  const kap = useRef<HTMLHeadingElement>(null);
  const azHareket = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: kap, offset: ['start end', 'center center'] });
  const kirpma = useTransform(scrollYProgress, [0, 1], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)']);

  const MotionEtiket = Etiket === 'h1' ? motion.h1 : motion.h2;

  return (
    <div className={cn('relative', className)}>
      <span aria-hidden="true" className="dev-baslik metin-kontur block">
        {metin}
      </span>
      <MotionEtiket
        ref={kap}
        id={id}
        className="dev-baslik text-primary absolute inset-0"
        style={azHareket ? undefined : { clipPath: kirpma }}
      >
        {metin}
      </MotionEtiket>
    </div>
  );
}
