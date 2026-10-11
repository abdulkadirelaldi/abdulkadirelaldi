import type { Metadata } from 'next';

import { MusteriFormu } from '@/components/panel/musteri-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni müşteri',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/musteriler/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniMusteriPage() {
  return (
    <>
      <Topbar title="Yeni müşteri" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <MusteriFormu />
        </div>
      </main>
    </>
  );
}
