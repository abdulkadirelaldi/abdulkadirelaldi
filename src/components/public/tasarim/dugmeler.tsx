import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Public sitenin düğme dili — 2026-10-27 kurumsal tasarım.
 *
 * İKİ TÜR, BAŞKA YOK: birincil (düz vurgu zemini) sayfanın tek ana eylemi için,
 * ikincil (çerçeveli) geri kalan her şey için. ADR-045'in gradyan, büyük harf ve
 * kayan ok animasyonlu "hap" düğmeleri şablon gibi duruyordu; burada yazım
 * olağan, hareket ince: renk geçişi, okun 2 px kayması, basınca %98.
 */

type Boyut = 'sm' | 'md' | 'lg';

const BOYUT: Record<Boyut, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

const TABAN =
  'group/dugme focus-ring rounded-btn inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98]';

export function birincilSiniflari(boyut: Boyut = 'md', className?: string) {
  return cn(TABAN, 'bg-accent hover:bg-accent-hover text-white', BOYUT[boyut], className);
}

export function ikincilSiniflari(boyut: Boyut = 'md', className?: string) {
  return cn(
    TABAN,
    'border-line-hover text-primary hover:border-line-strong hover:bg-surface border bg-white',
    BOYUT[boyut],
    className,
  );
}

type OrtakProps = { children: ReactNode; boyut?: Boyut; className?: string };

export function BirincilBaglanti({
  children,
  boyut,
  className,
  ...props
}: OrtakProps & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link className={birincilSiniflari(boyut, className)} {...props}>
      {children}
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform duration-200 group-hover/dugme:translate-x-0.5"
      />
    </Link>
  );
}

/** Dış bağlantı: yeni sekmede açılır, ok bunu işaret eder. */
export function BirincilDisBaglanti({
  children,
  boyut,
  className,
  ...props
}: OrtakProps & Omit<ComponentProps<'a'>, 'className' | 'children' | 'target' | 'rel'>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={birincilSiniflari(boyut, className)}
      {...props}
    >
      {children}
      <ArrowUpRight
        aria-hidden="true"
        className="size-4 transition-transform duration-200 group-hover/dugme:translate-x-0.5 group-hover/dugme:-translate-y-0.5"
      />
    </a>
  );
}
