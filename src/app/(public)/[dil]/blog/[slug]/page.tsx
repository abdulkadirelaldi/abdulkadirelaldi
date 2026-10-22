import type { Metadata } from 'next';

import { YaziSayfasi, yaziDetayMetadata } from '@/components/sayfalar/yazi-detay';

import { dilParametresi } from '../../dil-param';

type Props = { params: Promise<{ dil: string; slug: string }> };

/** `/[dil]/blog/[slug]` — önekli diller (ADR-046). Sayfa `components/sayfalar/yazi-detay.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [dil, { slug }] = await Promise.all([dilParametresi(params), params]);
  return yaziDetayMetadata({ dil, slug });
}

export default async function Page({ params }: Props) {
  const [dil, { slug }] = await Promise.all([dilParametresi(params), params]);
  return <YaziSayfasi dil={dil} slug={slug} />;
}
