import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MusteriFormu } from '@/components/panel/musteri-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchClientForPanel } from '@/server/services/client';

export const metadata: Metadata = {
  title: 'Müşteriyi düzenle',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/musteriler/[id]` — düzenleme.
 *
 * `fetchClientForPanel` TEK KAYIT okuması ve `notes` yalnızca burada geliyor;
 * liste DTO'su onu taşımıyor. Formu listeden beslemek, kaydetmenin `notes`u
 * silmesi anlamına gelirdi (T-043f'te proje MDX'inde ölçülen kusur).
 */
export default async function MusteriDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const musteri = await fetchClientForPanel(id);

  if (!musteri) notFound();

  return (
    <>
      <Topbar title={musteri.name} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <MusteriFormu musteri={musteri} />
        </div>
      </main>
    </>
  );
}
