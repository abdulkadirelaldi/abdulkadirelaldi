import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PanelKabuk } from '@/components/panel/panel-kabuk';
import { Sidebar } from '@/components/panel/sidebar';

/**
 * Panel route group layout — §4.3.
 *
 * §8.7 — panel arama motorlarına kapalı. `robots` metadata'sı `X-Robots-Tag`
 * başlığının yerine geçmez; başlık ve `middleware.ts` koruması Güvenlik
 * ajanının işidir (T-004). Bu, ucuz ikinci bir katman.
 *
 * §5.2.1 — panelde WebGL/shader/ağır efekt YOK.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `PanelKabuk` yalnızca MOBİL ÇEKMECENİN durumunu tutar (tek boolean). Kenar
 * çubuğu ile üst çubuktaki menü düğmesi kardeş bileşenler; durumu paylaşacak
 * ortak bir ata gerekiyordu ve o ata burası.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <PanelKabuk>
      <div className="flex min-h-dvh">
        <a
          href="#panel-icerik"
          className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
        >
          İçeriğe geç
        </a>

        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </PanelKabuk>
  );
}
