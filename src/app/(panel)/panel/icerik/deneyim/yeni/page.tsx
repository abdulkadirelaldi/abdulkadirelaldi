import type { Metadata } from 'next';

import { DeneyimFormu } from '@/components/panel/deneyim-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni deneyim kaydı',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/icerik/deneyim/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniDeneyimPage() {
  return (
    <>
      <Topbar title="Yeni deneyim kaydı" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <DeneyimFormu />
        </div>
      </main>
    </>
  );
}
