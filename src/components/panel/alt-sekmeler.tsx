'use client';

import { Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMenuDurumu } from '@/components/panel/panel-kabuk';
import { ALT_SEKMELER } from '@/components/panel/panel-rotalar';
import { cn } from '@/lib/utils/cn';

/**
 * TELEFON ALT SEKME ÇUBUĞU — 2026-10-29.
 *
 * Panel çoğunlukla iPhone'dan, "Ana Ekrana Ekle" ile tam ekran kullanılıyor.
 * iOS uygulamalarındaki sekme çubuğu: başparmağın eriştiği yerde dört ana
 * bölüm + "Daha" (geri kalan her şey, mevcut çekmecede). Masaüstünde
 * (`lg`) yok — orada yan menü var.
 *
 * GÜVENLİ ALAN: `pb-[env(safe-area-inset-bottom)]` — ana ekran çubuğu
 * (home indicator) sekmelerin üstüne binmesin. Sayfa içeriği aynı payı
 * panel düzeninde bırakıyor (layout.tsx).
 *
 * DOKUNMA HEDEFİ: her sekme en az 48 px yüksek, ekran genişliğinin beşte biri.
 */
export function AltSekmeler() {
  const pathname = usePathname();
  const { ac, acik } = useMenuDurumu();
  const aktifMi = (href: string) =>
    href === '/panel' ? pathname === '/panel' : pathname.startsWith(href);
  const dahaAktif = !acik && !ALT_SEKMELER.some((s) => aktifMi(s.href));

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
        <li>
          <button
            type="button"
            onClick={ac}
            aria-expanded={acik}
            aria-controls="panel-menu"
            className={cn(
              'focus-ring flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors active:opacity-60',
              acik || dahaAktif ? 'text-accent' : 'text-muted',
            )}
          >
            <Ellipsis className="size-6" aria-hidden="true" />
            Daha
          </button>
        </li>
      </ul>
    </nav>
  );
}
