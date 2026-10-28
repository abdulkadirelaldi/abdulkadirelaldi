'use client';

import { useEffect, useRef, useState } from 'react';

import { useAzHareket } from '@/components/az-hareket';

const SURE = 1400; // ms

/**
 * Ekrana girince 0'dan hedefe sayan sayı (2026-10-28, ana sayfa istatistikleri).
 *
 * SUNUCU SON DEĞERİ BASAR: JS yoksa, arama motorunda ve "hareketi azalt"
 * açıkken sayı baştan doğru. Sayma yalnızca istemcide, öğe HENÜZ EKRANDA
 * DEĞİLKEN bağlanırsa başlıyor — ekrandaki bir sayıyı 0'a düşürüp yeniden
 * saymak titreme olurdu. framer-motion yok (ADR-045 ölçümü): `requestAnimationFrame`
 * ve tek bir `IntersectionObserver`.
 */
export function Sayac({ deger }: { deger: number }) {
  const azHareket = useAzHareket();
  const kap = useRef<HTMLSpanElement>(null);
  const [gosterilen, setGosterilen] = useState(deger);

  useEffect(() => {
    const oge = kap.current;
    if (azHareket || !oge) return;
    if (oge.getBoundingClientRect().top < window.innerHeight) return;

    setGosterilen(0);
    let kare = 0;
    const gozlemci = new IntersectionObserver(
      ([girdi]) => {
        if (!girdi?.isIntersecting) return;
        gozlemci.disconnect();
        const basla = performance.now();
        const adim = (simdi: number) => {
          const t = Math.min(1, (simdi - basla) / SURE);
          // easeOutCubic — sona doğru yavaşlar.
          setGosterilen(Math.round(deger * (1 - (1 - t) ** 3)));
          if (t < 1) kare = requestAnimationFrame(adim);
        };
        kare = requestAnimationFrame(adim);
      },
      { threshold: 0.6 },
    );
    gozlemci.observe(oge);
    return () => {
      gozlemci.disconnect();
      cancelAnimationFrame(kare);
      setGosterilen(deger);
    };
  }, [deger, azHareket]);

  return (
    <span ref={kap} className="tabular">
      {gosterilen}
    </span>
  );
}
