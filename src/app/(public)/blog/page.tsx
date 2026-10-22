import type { Metadata } from 'next';

import { BlogSayfasi, blogMetadata } from '@/components/sayfalar/blog';

/** `/blog` — Türkçe. Sayfa `components/sayfalar/blog.tsx`te (ADR-046). */
export const metadata: Metadata = blogMetadata('tr');

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BlogSayfasi dil="tr" searchParams={searchParams} />;
}
