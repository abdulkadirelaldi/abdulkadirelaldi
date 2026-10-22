import type { Metadata } from 'next';

import { AnaSayfa, anaSayfaMetadata } from '@/components/sayfalar/anasayfa';

import { dilParametresi } from './dil-param';

type Props = { params: Promise<{ dil: string }> };

/** `/[dil]` — önekli diller (ADR-046). Sayfa `components/sayfalar/anasayfa.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return anaSayfaMetadata(await dilParametresi(params));
}

export default async function Page({ params }: Props) {
  return <AnaSayfa dil={await dilParametresi(params)} />;
}
