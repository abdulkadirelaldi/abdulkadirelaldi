import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Topbar } from '@/components/panel/topbar';
import { YetenekFormu } from '@/components/panel/yetenek-formu';
import { fetchSkillForPanelById } from '@/server/services/skill';

export const metadata: Metadata = {
  title: 'Yeteneği düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/icerik/yetenekler/[id]` — `id` ile tek kayıt okuma (deneyim kalıbı). */
export default async function YetenekDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchSkillForPanelById(id);

  if (!kayit) notFound();

  return (
    <>
      <Topbar title={kayit.name} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <YetenekFormu kayit={kayit} />
        </div>
      </main>
    </>
  );
}
