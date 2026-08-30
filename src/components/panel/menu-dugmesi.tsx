'use client';

import { Menu } from 'lucide-react';

import { useMenuDurumu } from '@/components/panel/panel-kabuk';

/**
 * Mobil menü düğmesi — çekmeceyi açar. `lg` üstünde gizli, çünkü orada kenar
 * çubuğu zaten açık.
 *
 * Düğme Topbar'da, çekmece Sidebar'da; ikisi `PanelKabuk` bağlamı üzerinden
 * konuşuyor (gerekçe orada).
 */
export function MenuDugmesi() {
  const { ac, acik } = useMenuDurumu();

  return (
    <button
      type="button"
      onClick={ac}
      aria-expanded={acik}
      aria-controls="panel-menu"
      className="focus-ring rounded-btn text-body hover:text-primary hover:bg-elevated ease-brand duration-micro -ml-2 p-2 transition-colors lg:hidden"
    >
      <Menu className="size-5" aria-hidden="true" />
      <span className="sr-only">Menüyü aç</span>
    </button>
  );
}
