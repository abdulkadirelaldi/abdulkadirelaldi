'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ALT_SEKMELER } from '@/components/panel/panel-rotalar';
import { cn } from '@/lib/utils/cn';

/**
 * TELEFON ALT SEKME ÇUBUĞU — 2026-10-29.
 *
 * Panel çoğunlukla iPhone'dan, "Ana Ekrana Ekle" ile tam ekran kullanılıyor.
 * iOS uygulamalarındaki sekme çubuğu: başparmağın eriştiği yerde beş kişisel
 * bölüm. Geri kalan her şey üst çubuktaki "Daha" düğmesinde (`daha-dugmesi.tsx`).
 * Masaüstünde (`lg`) yok — orada yan menü var.
 *
 * GÜVENLİ ALAN: çubuk YÜZER — kenarlardan 12 px içeride, ana ekran
 * çubuğunun (home indicator) 8 px üstünde. Sayfa içeriği aynı payı panel
 * düzeninde bırakıyor (layout.tsx).
 *
 * DOKUNMA HEDEFİ: her sekme 64 px yüksek, ekran genişliğinin beşte biri.
 * Etkin sekmede simgenin arkasında hap (2026-10-30 modern görünüm).
 */
export function AltSekmeler() {
  const pathname = usePathname();
  const aktifMi = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Ana sekmeler"
      data-yazdirmada-gizle
      className="border-line bg-surface/92 fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 rounded-[1.75rem] border shadow-[0_8px_32px_-8px_rgb(0_0_0/0.25)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="grid grid-cols-5 px-1">
        {ALT_SEKMELER.map((sekme) => {
          const Icon = sekme.icon;
          const aktif = aktifMi(sekme.href);
          return (
            <li key={sekme.href}>
              <Link
                href={sekme.href}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  'focus-ring flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[1.5rem] text-[0.6875rem] font-medium tracking-tight transition-colors active:scale-95',
                  aktif ? 'text-accent' : 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'ease-brand flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300',
                    aktif && 'bg-accent/12',
                  )}
                >
                  <Icon className="size-[1.375rem]" />
                </span>
                {sekme.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
