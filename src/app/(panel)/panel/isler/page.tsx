import type { Metadata } from 'next';

import { IslerEkrani } from '@/components/panel/isler/isler-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchIsListesi } from '@/server/services/gorev';

export const metadata: Metadata = {
  title: 'İşler',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/isler` — düz görev listesi (ADR-050). */
export default async function IslerPage() {
  const bugun = appToday();
  const liste = await fetchIsListesi(bugun);
  return (
    <>
      <Topbar title="İşler" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <IslerEkrani liste={liste} bugun={bugun} />
      </main>
    </>
  );
}
