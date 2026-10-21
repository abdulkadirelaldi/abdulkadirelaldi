import type { Metadata } from 'next';

import { ProjelerSayfasi, projelerMetadata } from '@/components/sayfalar/projeler';

import { dilParametresi } from '../dil-param';

type Props = {
  params: Promise<{ dil: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `/[dil]/projeler` — önekli diller (ADR-046). Sayfa `components/sayfalar/projeler.tsx`te. */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return projelerMetadata(await dilParametresi(params));
}

export default async function Page({ params, searchParams }: Props) {
  return <ProjelerSayfasi dil={await dilParametresi(params)} searchParams={searchParams} />;
}
