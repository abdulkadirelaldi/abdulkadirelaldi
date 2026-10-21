import type { Metadata } from 'next';

import { IletisimSayfasi, iletisimMetadata } from '@/components/sayfalar/iletisim';

/** `/iletisim` — Türkçe. Sayfa `components/sayfalar/iletisim.tsx`te (ADR-046). */
export const metadata: Metadata = iletisimMetadata('tr');

export default function Page() {
  return <IletisimSayfasi dil="tr" />;
}
