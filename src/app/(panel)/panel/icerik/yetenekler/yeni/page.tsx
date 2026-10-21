import type { Metadata } from 'next';

import { Topbar } from '@/components/panel/topbar';
import { YetenekFormu } from '@/components/panel/yetenek-formu';

export const metadata: Metadata = {
  title: 'Yeni yetenek',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/icerik/yetenekler/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniYetenekPage() {
  return (
    <>
      <Topbar title="Yeni yetenek" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <YetenekFormu />
        </div>
      </main>
    </>
  );
}
