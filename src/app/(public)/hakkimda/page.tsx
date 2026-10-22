import type { Metadata } from 'next';

import { HakkimdaSayfasi, hakkimdaMetadata } from '@/components/sayfalar/hakkimda';

/** `/hakkimda` — Türkçe. Sayfa `components/sayfalar/hakkimda.tsx`te (ADR-046). */
export const metadata: Metadata = hakkimdaMetadata('tr');

export default function Page() {
  return <HakkimdaSayfasi dil="tr" />;
}
