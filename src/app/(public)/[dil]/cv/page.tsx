import type { Metadata } from 'next';

import { CvSayfasi, cvMetadata } from '@/components/sayfalar/cv';

import { dilParametresi } from '../dil-param';

type Props = { params: Promise<{ dil: string }> };

/** `/[dil]/cv` — önekli diller (ADR-046). Sayfa `components/sayfalar/cv.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return cvMetadata(await dilParametresi(params));
}

export default async function Page({ params }: Props) {
  return <CvSayfasi dil={await dilParametresi(params)} />;
}
