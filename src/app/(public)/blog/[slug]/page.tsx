import type { Metadata } from 'next';

import { YaziSayfasi, yaziDetayMetadata } from '@/components/sayfalar/yazi-detay';

type Props = { params: Promise<{ slug: string }> };

/** `/blog/[slug]` — Türkçe. Sayfa `components/sayfalar/yazi-detay.tsx`te (ADR-046). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return yaziDetayMetadata({ dil: 'tr', slug: (await params).slug });
}

export default async function Page({ params }: Props) {
  return <YaziSayfasi dil="tr" slug={(await params).slug} />;
}
