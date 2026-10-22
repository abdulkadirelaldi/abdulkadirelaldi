import type { Metadata } from 'next';

import { HakkimdaSayfasi, hakkimdaMetadata } from '@/components/sayfalar/hakkimda';

import { dilParametresi } from '../dil-param';

type Props = { params: Promise<{ dil: string }> };

/** `/[dil]/hakkimda` — önekli diller (ADR-046). Sayfa `components/sayfalar/hakkimda.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return hakkimdaMetadata(await dilParametresi(params));
}

export default async function Page({ params }: Props) {
  return <HakkimdaSayfasi dil={await dilParametresi(params)} />;
}
