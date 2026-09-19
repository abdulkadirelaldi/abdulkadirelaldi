import type { Metadata } from 'next';

import { DeneyimEkrani } from '@/components/panel/deneyim-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { experienceFilterSchema } from '@/lib/schemas/experience';
import { fetchExperienceForPanel } from '@/server/services/experience';

export const metadata: Metadata = {
  title: 'Deneyim',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
const TABAN = '/panel/icerik/deneyim';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(Array.isArray(ham) ? ham[0] : ham);
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/icerik/deneyim` — §4.2.
 *
 * ⚠️ DURUM SÜZGECİ YOK ve olmayacak: `Experience` modelinde `status` kolonu yok.
 * Projeler ekranıyla simetri kurmak için bir sekme çubuğu eklemek, olmayan bir
 * kavramı arayüzde varmış gibi göstermek olurdu (Backend T-040 açıkça uyardı).
 *
 * SIRALAMA `startDate desc` — public tarafla AYNI. Projelerde `updatedAt desc`
 * seçilmesinin sebebi taslakların `publishedAt`inin `null` olmasıydı; burada
 * `startDate` her kayıtta dolu, yani o sorun yok.
 */
export default async function DeneyimYonetimiPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = experienceFilterSchema.safeParse({ page: sayfa, perPage: SAYFA_BOYUTU });

  const liste = await fetchExperienceForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Deneyim" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <DeneyimEkrani kayitlar={liste.items} toplam={liste.total} />

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
