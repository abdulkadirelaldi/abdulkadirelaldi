import type { Metadata } from 'next';

import { HizmetlerSayfasi, hizmetlerMetadata } from '@/components/sayfalar/hizmetler';

/** `/hizmetler` — Türkçe. Sayfa `components/sayfalar/hizmetler.tsx`te (ADR-046). */
export const metadata: Metadata = hizmetlerMetadata('tr');

export default function Page() {
  return <HizmetlerSayfasi dil="tr" />;
}
