import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DeneyimFormu } from '@/components/panel/deneyim-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchExperienceForPanelById } from '@/server/services/experience';

export const metadata: Metadata = {
  title: 'Kaydı düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/icerik/deneyim/[id]` — `id` ile tek kayıt okuma (T-040 sözleşmesi). */
export default async function DeneyimDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchExperienceForPanelById(id);

  if (!kayit) notFound();

  return (
    <>
      <Topbar title={kayit.role} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <DeneyimFormu kayit={kayit} />
        </div>
      </main>
    </>
  );
}
