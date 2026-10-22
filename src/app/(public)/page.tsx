import type { Metadata } from 'next';

import { AnaSayfa, anaSayfaMetadata } from '@/components/sayfalar/anasayfa';

/** `/` — Türkçe ana sayfa. Sayfanın kendisi `components/sayfalar/anasayfa.tsx`te (ADR-046). */
export const metadata: Metadata = anaSayfaMetadata('tr');

export default function Page() {
  return <AnaSayfa dil="tr" />;
}
