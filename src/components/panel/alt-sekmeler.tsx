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
 * GÜVENLİ ALAN: `pb-[env(safe-area-inset-bottom)]` — ana ekran çubuğu
 * (home indicator) sekmelerin üstüne binmesin. Sayfa içeriği aynı payı
 * panel düzeninde bırakıyor (layout.tsx).
 *
 * DOKUNMA HEDEFİ: her sekme en az 48 px yüksek, ekran genişliğinin beşte biri.
 */
export function AltSekmeler() {
  const pathname = usePathname();
  const aktifMi = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Ana sekmeler"
      data-yazdirmada-gizle
      className="border-line bg-canvas/90 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {ALT_SEKMELER.map((sekme) => {
          const Icon = sekme.icon;
          const aktif = aktifMi(sekme.href);
          return (
            <li key={sekme.href}>
              <Link
                href={sekme.href}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  'focus-ring flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors active:opacity-60',
                  aktif ? 'text-accent' : 'text-muted',
                )}
              >
                <Icon className={cn('size-6 transition-transform', aktif && 'scale-110')} />
                {sekme.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
