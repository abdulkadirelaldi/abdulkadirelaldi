import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Panel üst çubuğu — Sunucu Bileşeni.
 *
 * §5.2.1 gereği efekt yok. Sağdaki alan T-030'da oturum menüsü ve hızlı ekleme
 * eylemiyle dolacak; şu an yalnızca tema anahtarı ve siteye dönüş bağlantısı var.
 */
export function Topbar({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <h1 className="truncate text-lg">{title}</h1>

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
