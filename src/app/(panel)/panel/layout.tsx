import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AltSekmeler } from '@/components/panel/alt-sekmeler';
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
  /*
   * 2026-10-29 — panel iPhone'dan "Ana Ekrana Ekle" ile TAM EKRAN kullanılıyor.
   * Bildirim dosyasının adı `/panel` ile BAŞLAMIYOR: middleware `/panel/*`ı
   * oturuma bağlıyor, oturumsuz istek bildirimi alamazdı.
   */
  manifest: '/ae-panel.webmanifest',
  appleWebApp: { capable: true, title: 'AE Panel', statusBarStyle: 'black-translucent' },
};

/**
 * `viewportFit: 'cover'` — içerik çentiğin ve ana ekran çubuğunun altına
 * uzanır, `env(safe-area-inset-*)` değerleri dolu gelir. Üst çubuk ve alt
 * sekmeler bu payı kendileri bırakıyor.
 */
export const viewport: Viewport = { viewportFit: 'cover' };

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
          data-yazdirmada-gizle
          className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
        >
          İçeriğe geç
        </a>

        <Sidebar />

        {/* Telefonda alt sekme çubuğu kadar pay (56 px + ana ekran çubuğu). */}
        <div className="flex min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>

        <AltSekmeler />
      </div>
    </PanelKabuk>
  );
}
