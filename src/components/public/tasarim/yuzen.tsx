import type { CSSProperties, ReactNode } from 'react';

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
 * İkisi de SAF CSS ve iki ayrı katmanda: dış katman kaydırmayı (`.paralaks`,
 * `translate` özelliği, scroll-driven), iç katman süzülmeyi (`animate-yuzme`,
 * `transform`) taşıyor — ayrı özellikler olduğu için birbirini ezmiyorlar.
 * Sunucu bileşeni, JS yok.
 *
 * Süs olduğu için `aria-hidden` ve `pointer-events-none`. Hareket azaltılmışsa
 * ikisi de durur (globals.css).
 */
export function Yuzen({ children, hiz = -120, gecikme = 0, className }: YuzenProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('paralaks pointer-events-none absolute', className)}
      style={{ '--paralaks': `${hiz}px` } as CSSProperties}
    >
      <div className="animate-yuzme" style={{ animationDelay: `${gecikme}s` }}>
        {children}
      </div>
    </div>
  );
}
