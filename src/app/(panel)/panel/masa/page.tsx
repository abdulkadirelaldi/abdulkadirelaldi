import type { Metadata } from 'next';

import { MacKopruKarti } from '@/components/panel/masa/mac-kopru-karti';
import { MasaEkrani } from '@/components/panel/masa/masa-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchDolapSecenekleri, fetchMasaUstu } from '@/server/services/masa';
import { fetchKopruDurumu } from '@/server/services/masa-koprusu';

export const metadata: Metadata = {
  title: 'Masa',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/masa` — masanın üstü ve dolaplar (ADR-049 M2). */
export default async function MasaPage() {
  const bugun = appToday();
  const [ustu, secenekler, kopru] = await Promise.all([
    fetchMasaUstu(bugun),
    fetchDolapSecenekleri(),
    fetchKopruDurumu(),
  ]);
  return (
    <>
      <Topbar title="Masa" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <MasaEkrani ustu={ustu} secenekler={secenekler} bugun={bugun} />
        <div className="mx-auto mt-6 max-w-4xl pb-20 lg:pb-0">
          <MacKopruKarti durum={kopru} />
        </div>
      </main>
    </>
  );
}
