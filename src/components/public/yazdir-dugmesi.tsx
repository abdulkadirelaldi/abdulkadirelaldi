'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * "Yazdır" düğmesi — /cv.
 *
 * SAYFANIN TEK İSTEMCİ BİLEŞENİ ve en uçtaki yaprak: `window.print()` için
 * istemci gerekiyor, sayfanın geri kalanı için gerekmiyor.
 *
 * `data-yazdirmada-gizle` KENDİ ÜSTÜNDE: çıktının içinde "Yazdır" yazan bir
 * düğme görünmesi anlamsız olurdu. Düğme kaybolsa bile sayfa yazdırılabilir —
 * tarayıcının kendi yazdırma komutu her zaman çalışır; bu yalnızca kısayol.
 */
export function YazdirDugmesi() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-yazdirmada-gizle
      onClick={() => window.print()}
    >
      <Printer className="size-4" aria-hidden="true" />
      Yazdır
    </Button>
  );
}
