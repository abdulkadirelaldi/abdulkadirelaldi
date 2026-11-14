import type { Metadata } from 'next';

import { MasaEkrani } from '@/components/panel/masa/masa-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchDolapSecenekleri, fetchMasaUstu } from '@/server/services/masa';

export const metadata: Metadata = {
  title: 'Masa',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/masa` — masanın üstü ve dolaplar (ADR-049 M2). */
export default async function MasaPage() {
  const bugun = appToday();
  const [ustu, secenekler] = await Promise.all([fetchMasaUstu(bugun), fetchDolapSecenekleri()]);
  return (
    <>
      <Topbar title="Masa" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <MasaEkrani ustu={ustu} secenekler={secenekler} bugun={bugun} />
      </main>
    </>
  );
}
