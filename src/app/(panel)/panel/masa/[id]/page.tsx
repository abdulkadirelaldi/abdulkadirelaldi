import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DolapEkrani } from '@/components/panel/masa/dolap-ekrani';
import { KiyiOzetKarti } from '@/components/panel/masa/kiyi-ozet-karti';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchKiyiOzet, kiyiPanelAdresi } from '@/server/services/kiyi-medya';
import { fetchDolap, fetchDolapSecenekleri } from '@/server/services/masa';

export const metadata: Metadata = {
  title: 'Dolap',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/masa/[id]` — dolabın rafları ve görevleri (ADR-049 M2). */
export default async function DolapPage({ params }: SayfaProps) {
  const { id } = await params;
  const [dolap, secenekler] = await Promise.all([fetchDolap(id), fetchDolapSecenekleri()]);
  if (!dolap) notFound();
  // Kıyı Medya katmanındaki dolap, Kıyı Medya'nın kendi özetini başında gösterir (M3).
  const kiyi = dolap.katman === 'KIYI_MEDYA' ? await fetchKiyiOzet() : null;
  return (
    <>
      <Topbar title={dolap.ad} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        {kiyi && (
          <div className="mx-auto mb-5 max-w-4xl">
            <KiyiOzetKarti sonuc={kiyi} panelAdresi={kiyiPanelAdresi()} />
          </div>
        )}
        <DolapEkrani dolap={dolap} secenekler={secenekler} bugun={appToday()} />
      </main>
    </>
  );
}
