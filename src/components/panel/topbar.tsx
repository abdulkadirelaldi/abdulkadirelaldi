import Link from 'next/link';
import type { ReactNode } from 'react';

import { KirintiYolu } from '@/components/panel/kirinti-yolu';
import { MenuDugmesi } from '@/components/panel/menu-dugmesi';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Panel üst çubuğu — SUNUCU BİLEŞENİ, iki istemci yaprağıyla.
 *
 * `MenuDugmesi` ve `KirintiYolu` istemci; ikisi de küçük ve uçta. Topbar'ın
 * kendisini istemciye çevirmek, her panel sayfasının başlığını istemci
 * paketine taşımak olurdu — T-023'ün ölçtüğü şey tam olarak bunun bedeliydi.
 *
 * §5.2.1 gereği efekt yok: yalnızca renk geçişi ve arka plan bulanıklığı.
 *
 * BAŞLIK `<h1>`: her panel sayfasında tek başlık burasıdır, sayfa gövdesi
 * `<h2>` ile devam eder (T-024'ün başlık sırası dersi).
 */
export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <MenuDugmesi />

        <div className="flex min-w-0 flex-col">
          <KirintiYolu />
          <h1 className="truncate text-lg">{title}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {actions}

          <Link
            href="/"
            className="focus-ring ease-brand duration-micro rounded-btn border-line bg-surface text-body hover:border-line-hover hover:text-primary hidden border px-3 py-2 text-sm transition-colors sm:inline-flex"
          >
            Siteye dön
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
