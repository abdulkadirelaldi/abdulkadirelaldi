import type { ReactNode } from 'react';

import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';

/**
 * Public route group layout — §4.3.
 *
 * "İçeriğe geç" bağlantısı klavye kullanıcısının her sayfada menüyü tekrar
 * tekrar geçmesini engeller (K5 / WCAG 2.4.1). Odaklanana kadar görünmez.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#icerik"
        className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
      >
        İçeriğe geç
      </a>

      <Navbar />

      <main id="icerik" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
