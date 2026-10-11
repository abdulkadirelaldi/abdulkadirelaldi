import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { KategoriFormu } from '@/components/panel/kategori-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchTransactionCategoryForPanel } from '@/server/services/transaction-category';

export const metadata: Metadata = {
  title: 'Kategoriyi düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/** `/panel/muhasebe/kategoriler/[id]` — düzenleme. Arşivleme listeden, iki yönlü. */
export default async function KategoriDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kategori = await fetchTransactionCategoryForPanel(id);

  if (!kategori) notFound();

  return (
    <>
      <Topbar title={kategori.name} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <KategoriFormu kategori={kategori} />
        </div>
      </main>
    </>
  );
}
