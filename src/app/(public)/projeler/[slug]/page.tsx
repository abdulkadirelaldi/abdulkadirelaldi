import type { Metadata } from 'next';

import { ProjeDetaySayfasi, projeDetayMetadata } from '@/components/sayfalar/proje-detay';

type Props = { params: Promise<{ slug: string }> };

/** `/projeler/[slug]` — Türkçe. Sayfa `components/sayfalar/proje-detay.tsx`te (ADR-046). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return projeDetayMetadata({ dil: 'tr', slug: (await params).slug });
}

export default async function Page({ params }: Props) {
  return <ProjeDetaySayfasi dil="tr" slug={(await params).slug} />;
}
