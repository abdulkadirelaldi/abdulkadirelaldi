import type { Metadata } from 'next';

import { KategoriFormu } from '@/components/panel/kategori-formu';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni kategori',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/muhasebe/kategoriler/yeni` — statik segment `[id]`e tercih edilir. */
export default function YeniKategoriPage() {
  return (
    <>
      <Topbar title="Yeni kategori" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <KategoriFormu />
        </div>
      </main>
    </>
  );
}
