import type { Metadata } from 'next';

import PublicLayout from '@/app/(public)/layout';
import { Bulunamadi } from '@/components/public/bulunamadi';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  robots: { index: false },
};

/**
 * Hiçbir rotaya uymayan adres. Kök seviyede yalnızca kök layout var; public
 * layout'u (gezinme, alt bilgi, koyu sahne, Archivo) burada AÇIKÇA sarıyoruz —
 * yoksa 404 sitenin geri kalanından kopuk, çıplak bir sayfa olurdu.
 */
export default function KokBulunamadi() {
  return (
    <PublicLayout>
      <Bulunamadi />
    </PublicLayout>
  );
}
