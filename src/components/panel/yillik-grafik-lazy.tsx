'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * YILLIK GRAFİĞİN TEMBEL SARMALAYICISI — §5.2.
 *
 * Recharts yığınının ölçümü ve eşik karşılaştırması `yillik-grafik.tsx`in
 * başında DEĞİL burada: tembelliği kuran yer burası ve sayı kararın yanında
 * dursun.
 *
 * `ssr: false` — grafik tamamen istemci geometrisi; sunucuda çizmek yığını
 * ilk yüke sokmadan HTML'e de koymak olurdu ve CLS riski açardı.
 *
 * ⚠️ İSKELET, YERİNE GEÇTİĞİ ŞEYLE AYNI YÜKSEKLİKTE (`h-80`, grafikle birebir).
 * T-032'de veri tablosu iskeleti için ölçülen CLS dersi: iskelet daha kısaysa
 * yığın indiğinde kutu büyür ve altındaki her şey kayar.
 */
const YillikGrafikDinamik = dynamic(() => import('./yillik-grafik'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full flex-col justify-end gap-2" aria-busy="true">
      <div className="flex items-end gap-2">
        {[48, 72, 36, 88, 60, 80, 44, 68, 52, 76, 40, 64].map((y, i) => (
          <div key={i} className="flex flex-1 items-end gap-0.5">
            <Skeleton className="w-full rounded-t" style={{ height: `${y}%` }} />
            <Skeleton className="w-full rounded-t" style={{ height: `${y * 0.6}%` }} />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  ),
});

export { YillikGrafikDinamik };
