import type { Metadata } from 'next';

import { ProjeDetaySayfasi, projeDetayMetadata } from '@/components/sayfalar/proje-detay';

import { dilParametresi } from '../../dil-param';

type Props = { params: Promise<{ dil: string; slug: string }> };

/** `/[dil]/projeler/[slug]` — önekli diller (ADR-046). Sayfa `components/sayfalar/proje-detay.tsx`te. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [dil, { slug }] = await Promise.all([dilParametresi(params), params]);
  return projeDetayMetadata({ dil, slug });
}

export default async function Page({ params }: Props) {
  const [dil, { slug }] = await Promise.all([dilParametresi(params), params]);
  return <ProjeDetaySayfasi dil={dil} slug={slug} />;
}
