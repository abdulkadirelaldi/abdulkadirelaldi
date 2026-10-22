import type { Metadata } from 'next';

import { ProjelerSayfasi, projelerMetadata } from '@/components/sayfalar/projeler';

/** `/projeler` — Türkçe. Sayfa `components/sayfalar/projeler.tsx`te (ADR-046). */
export const metadata: Metadata = projelerMetadata('tr');

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProjelerSayfasi dil="tr" searchParams={searchParams} />;
}
