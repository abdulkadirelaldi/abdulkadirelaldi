import type { Metadata } from 'next';

import { Topbar } from '@/components/panel/topbar';
import { YaziFormu } from '@/components/panel/yazi-formu';

export const metadata: Metadata = {
  title: 'Yeni yazı',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/icerik/blog/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniYaziPage() {
  return (
    <>
      <Topbar title="Yeni yazı" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <YaziFormu />
        </div>
      </main>
    </>
  );
}
