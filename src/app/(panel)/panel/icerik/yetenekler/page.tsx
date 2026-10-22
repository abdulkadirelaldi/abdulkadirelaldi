import type { Metadata } from 'next';

import { DilSekmeleri } from '@/components/panel/dil-sekmeleri';
import { icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { YetenekEkrani } from '@/components/panel/yetenek-ekrani';
import { skillFilterSchema } from '@/lib/schemas/skill';
import { fetchSkillsForPanel } from '@/server/services/skill';

export const metadata: Metadata = {
  title: 'Yetenekler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
const TABAN = '/panel/icerik/yetenekler';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(Array.isArray(ham) ? ham[0] : ham);
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/icerik/yetenekler` — deneyim listesinin kalıbı.
 *
 * DURUM SÜZGECİ YOK: `Skill` modelinde `status` kolonu yok (deneyimdeki aynı
 * gerekçe). SIRALAMA public tarafla aynı (`order asc`), bkz. `fetchSkillsForPanel`.
 */
export default async function YetenekYonetimiPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const sayfa = sayfaNumarasi(parametreler.sayfa);
  const dil = panelDili(parametreler.dil);

  const cozum = skillFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    locale: dil,
  });

  const liste = await fetchSkillsForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU, locale: dil },
  );

  return (
    <>
      <Topbar title="Yetenekler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <DilSekmeleri taban={TABAN} aktif={dil} />

          <YetenekEkrani kayitlar={liste.items} toplam={liste.total} dil={dil} />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => icerikYolu(TABAN, { sayfa: s, dil })}
          />
        </div>
      </main>
    </>
  );
}
