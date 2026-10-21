import type { Metadata } from 'next';

import { BlogSayfasi, blogMetadata } from '@/components/sayfalar/blog';

import { dilParametresi } from '../dil-param';

type Props = {
  params: Promise<{ dil: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `/[dil]/blog` — önekli diller (ADR-046). Sayfa `components/sayfalar/blog.tsx`te. */
export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return blogMetadata(await dilParametresi(params));
}

export default async function Page({ params, searchParams }: Props) {
  return <BlogSayfasi dil={await dilParametresi(params)} searchParams={searchParams} />;
}
