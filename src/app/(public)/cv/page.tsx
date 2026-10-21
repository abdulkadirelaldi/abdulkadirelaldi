import type { Metadata } from 'next';

import { CvSayfasi, cvMetadata } from '@/components/sayfalar/cv';

/** `/cv` — Türkçe. Sayfa `components/sayfalar/cv.tsx`te (ADR-046). */
export const metadata: Metadata = cvMetadata('tr');

export default function Page() {
  return <CvSayfasi dil="tr" />;
}
