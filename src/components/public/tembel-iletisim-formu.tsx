'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

/**
 * Ana sayfadaki iletişim formu — EKRANA YAKLAŞINCA yüklenir.
 *
 * ÖLÇÜLDÜ (ADR-045, Lighthouse mobil): form Zod + react-hook-form ile ~35 kB
 * betik getiriyor ve ana sayfanın EN ALTINDA. İlk yüklemede istenen her bayt
 * mobil LCP benzetimine yazılıyor; form ilk ekranda görünmediği hâlde LCP'yi
 * uzatıyordu. Kap, form gelmeden SON YÜKSEKLİĞİNDE (CLS yok) ve görünüm
 * alanına 600 px kala yükleme başlıyor — kullanıcı vardığında form hazır.
 *
 * /iletisim'de form sayfanın ASIL içeriği; orada doğrudan yükleniyor.
 */
const IletisimFormu = dynamic(
  () => import('@/components/public/iletisim-formu').then((m) => m.IletisimFormu),
  { ssr: false, loading: () => <FormIskeleti /> },
);

function FormIskeleti() {
  // `role="status"`: rolsüz bir div'e `aria-label` verilemez (axe
  // aria-prohibited-attr); durum bölgesi ekran okuyucuya metni okutur.
  return (
    <div role="status" aria-busy="true" className="min-h-[34rem]">
      <span className="sr-only">Form yükleniyor</span>
    </div>
  );
}

export function TembelIletisimFormu({ eposta }: { eposta: string | null }) {
  const kap = useRef<HTMLDivElement>(null);
  const [yukle, setYukle] = useState(false);

  useEffect(() => {
    const oge = kap.current;
    if (!oge) return;
    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        if (girdiler.some((g) => g.isIntersecting)) {
          setYukle(true);
          gozlemci.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    gozlemci.observe(oge);
    return () => gozlemci.disconnect();
  }, []);

  return <div ref={kap}>{yukle ? <IletisimFormu eposta={eposta} /> : <FormIskeleti />}</div>;
}
