'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Bölüm giriş animasyonu — §5.1.
 *
 * ADR-025: `AnimatedContent` / `ScrollReveal` gsap istiyordu, gsap reddedildi.
 * Yerine framer-motion'ın `whileInView`'ı kullanılıyor — projede zaten var ve
 * bu iş için 15 satır yetiyor.
 *
 * §5.1 ayarları: `once: true` (bir kez oynar, kullanıcı yukarı kaydırınca
 * tekrar tetiklenmez) ve `amount: 0.2` (bölümün %20'si görününce başlar).
 *
 * `prefers-reduced-motion` aktifse hiçbir hareket yok — içerik doğrudan son
 * hâlinde render edilir. `motion.div` yerine düz `div` döndürülüyor ki
 * animasyon makinesi hiç kurulmasın.
 */
export function BolumGiris({
  children,
  className,
  gecikme = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Saniye. Ardışık öğeleri kademelendirmek için (§3.4 giriş 400ms). */
  gecikme?: number;
}) {
  const azHareket = useReducedMotion();

  if (azHareket) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: gecikme, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
