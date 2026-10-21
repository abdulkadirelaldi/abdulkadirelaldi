import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HizmetFormu } from '@/components/panel/hizmet-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchServiceForPanelById } from '@/server/services/service';

export const metadata: Metadata = {
  title: 'Hizmeti düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/icerik/hizmetler/[id]` — `id` ile tek kayıt okuma (deneyim kalıbı). */
export default async function HizmetDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchServiceForPanelById(id);

  if (!kayit) notFound();

  return (
    <>
      <Topbar title={kayit.title} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HizmetFormu kayit={kayit} />
        </div>
      </main>
    </>
  );
}
