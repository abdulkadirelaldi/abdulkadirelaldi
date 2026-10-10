import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Topbar } from '@/components/panel/topbar';
import { YaziFormu } from '@/components/panel/yazi-formu';
import { fetchPostForPanel } from '@/server/services/post';

export const metadata: Metadata = {
  title: 'Yazıyı düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/icerik/blog/[id]` — düzenleme.
 *
 * `id` ile okunuyor, slug ile değil: form slug'ı değiştirebilir. `ContentLookup`
 * zarfı burada yok — arşivlenmiş yazı panelde 410 değil, düzenlenebilir bir
 * kayıttır ve arşivden geri almanın yolu bu sayfa.
 */
export default async function YaziDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const yazi = await fetchPostForPanel(id);

  if (!yazi) notFound();

  return (
    <>
      <Topbar title={yazi.title} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <YaziFormu yazi={yazi} />
        </div>
      </main>
    </>
  );
}
