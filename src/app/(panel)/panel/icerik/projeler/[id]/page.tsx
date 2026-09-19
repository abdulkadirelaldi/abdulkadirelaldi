import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProjeFormu } from '@/components/panel/proje-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchProjectForPanel } from '@/server/services/project';

export const metadata: Metadata = {
  title: 'Projeyi düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/icerik/projeler/[id]` — düzenleme.
 *
 * `id` İLE OKUNUYOR, slug ile değil: form slug'ı değiştirebilir, yani slug
 * kararlı bir adres değil. Kaydettikten sonra adres hâlâ doğru kaydı gösteriyor.
 *
 * `ContentLookup` zarfı (FOUND/GONE/NOT_FOUND) burada YOK: arşivlenmiş kayıt
 * panelde 410 değil, DÜZENLENEBİLİR bir kayıttır — arşivden geri almanın yolu
 * tam olarak bu sayfa.
 */
export default async function ProjeDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const proje = await fetchProjectForPanel(id);

  if (!proje) notFound();

  return (
    <>
      <Topbar title={proje.title} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <ProjeFormu proje={proje} />
        </div>
      </main>
    </>
  );
}
