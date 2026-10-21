import type { Metadata } from 'next';

import { IletisimSayfasi, iletisimMetadata } from '@/components/sayfalar/iletisim';

import { dilParametresi } from '../dil-param';

type Props = { params: Promise<{ dil: string }> };

/** `/[dil]/iletisim` — önekli diller (ADR-046). Sayfa `components/sayfalar/iletisim.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return iletisimMetadata(await dilParametresi(params));
}

export default async function Page({ params }: Props) {
  return <IletisimSayfasi dil={await dilParametresi(params)} />;
}
