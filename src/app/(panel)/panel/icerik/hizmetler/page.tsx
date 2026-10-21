import type { Metadata } from 'next';

import { HizmetEkrani } from '@/components/panel/hizmet-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { serviceFilterSchema } from '@/lib/schemas/service';
import { fetchServicesForPanel } from '@/server/services/service';

export const metadata: Metadata = {
  title: 'Hizmetler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
const TABAN = '/panel/icerik/hizmetler';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(Array.isArray(ham) ? ham[0] : ham);
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/icerik/hizmetler` — deneyim listesinin kalıbı. Durum süzgeci yok
 * (`Service`te `status` kolonu yok); sıra public tarafla aynı (`order asc`).
 */
export default async function HizmetYonetimiPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = serviceFilterSchema.safeParse({ page: sayfa, perPage: SAYFA_BOYUTU });

  const liste = await fetchServicesForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Hizmetler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <HizmetEkrani kayitlar={liste.items} toplam={liste.total} />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => (s > 1 ? `${TABAN}?sayfa=${s}` : TABAN)}
          />
        </div>
      </main>
    </>
  );
}
