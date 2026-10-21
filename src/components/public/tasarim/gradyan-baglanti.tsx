import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type Boyut = 'sm' | 'md' | 'lg';

const BOYUT: Record<Boyut, string> = {
  sm: 'h-9 px-4 text-[0.7rem]',
  md: 'h-11 px-6 text-xs',
  lg: 'h-14 px-8 text-sm',
};

/**
 * ADR-045 — gradyan hap düğme sınıfları (örnekteki "CONTACT ME").
 *
 * Gradyan iki kat genişlikte çiziliyor; üzerine gelince konumu kayıyor —
 * renk "akıyor" gibi görünüyor. Ok ikonu sağ üste kaçıp geri giriyor.
 * Beyaz metin gradyanın her durağında ≥ 4.6:1 (globals.css `--gradient-vurgu`).
 */
export function gradyanSiniflari(boyut: Boyut = 'md', className?: string) {
  return cn(
    'group/gradyan focus-ring rounded-pill bg-gradient-vurgu relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold tracking-[0.12em] text-white uppercase',
    'bg-[length:200%_100%] bg-left ease-brand transition-[background-position,transform,box-shadow] duration-500',
    'hover:bg-right hover:shadow-[0_10px_40px_-10px_var(--accent-glow)] active:scale-[0.97]',
    BOYUT[boyut],
    className,
  );
}

function Ok() {
  return (
    <span aria-hidden="true" className="relative size-4 overflow-hidden">
      <ArrowUpRight className="ease-brand absolute inset-0 size-4 transition-transform duration-300 group-hover/gradyan:translate-x-4 group-hover/gradyan:-translate-y-4" />
      <ArrowUpRight className="ease-brand absolute inset-0 size-4 -translate-x-4 translate-y-4 transition-transform duration-300 group-hover/gradyan:translate-x-0 group-hover/gradyan:translate-y-0" />
    </span>
  );
}

type OrtakProps = { children: ReactNode; boyut?: Boyut; className?: string };

/** Site içi gradyan bağlantı. */
export function GradyanBaglanti({
  children,
  boyut,
  className,
  ...props
}: OrtakProps & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link className={gradyanSiniflari(boyut, className)} {...props}>
      {children}
      <Ok />
    </Link>
  );
}

/** Dış adrese gradyan bağlantı — yeni sekmede, `noopener`. */
export function GradyanDisBaglanti({
  children,
  boyut,
  className,
  ...props
}: OrtakProps & Omit<ComponentProps<'a'>, 'className' | 'children' | 'target' | 'rel'>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={gradyanSiniflari(boyut, className)}
      {...props}
    >
      {children}
      <Ok />
    </a>
  );
}

/** İnce kenarlı hap — ikincil eylem ("CANLI PROJE" rozeti gibi). */
export function hapSiniflari(className?: string) {
  return cn(
    'focus-ring rounded-pill border-line-strong text-primary inline-flex h-9 items-center gap-2 border px-4 text-[0.7rem] font-semibold tracking-[0.12em] uppercase',
    'ease-brand transition-colors duration-300 hover:bg-primary hover:text-canvas hover:border-primary',
    className,
  );
}
