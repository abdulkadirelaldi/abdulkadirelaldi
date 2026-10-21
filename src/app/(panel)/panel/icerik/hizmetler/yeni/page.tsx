import type { Metadata } from 'next';

import { HizmetFormu } from '@/components/panel/hizmet-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni hizmet',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/icerik/hizmetler/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniHizmetPage() {
  return (
    <>
      <Topbar title="Yeni hizmet" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HizmetFormu />
        </div>
      </main>
    </>
  );
}
