import type { Metadata } from 'next';

import { Bulunamadi } from '@/components/public/bulunamadi';

export const metadata: Metadata = {
  title: 'Sayfa bulunamadı',
  robots: { index: false },
};

/** Public sayfaların içinden çağrılan `notFound()` — ör. bilinmeyen proje slug'ı. */
export default function PublicBulunamadi() {
  return <Bulunamadi />;
}
