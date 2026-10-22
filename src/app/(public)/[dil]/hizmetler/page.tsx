import type { Metadata } from 'next';

import { HizmetlerSayfasi, hizmetlerMetadata } from '@/components/sayfalar/hizmetler';

import { dilParametresi } from '../dil-param';

type Props = { params: Promise<{ dil: string }> };

/** `/[dil]/hizmetler` — önekli diller (ADR-046). Sayfa `components/sayfalar/hizmetler.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return hizmetlerMetadata(await dilParametresi(params));
}

export default async function Page({ params }: Props) {
  return <HizmetlerSayfasi dil={await dilParametresi(params)} />;
}
