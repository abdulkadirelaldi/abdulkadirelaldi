import type { Metadata } from 'next';

import { DilSekmeleri } from '@/components/panel/dil-sekmeleri';
import { DurumSekmeleri } from '@/components/panel/durum-sekmeleri';
import { durumGorunumuBul, icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { ProjelerEkrani } from '@/components/panel/projeler-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { projectFilterSchema } from '@/lib/schemas/project';
import { fetchProjectsForPanel } from '@/server/services/project';

export const metadata: Metadata = {
  title: 'Projeler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
const TABAN = '/panel/icerik/projeler';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tekDeger = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tekDeger(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/icerik/projeler` — §4.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * T-034'ÜN ENGEL-1 UYARI BANDI KALDIRILDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O bant "bu liste yalnızca yayındaki projeleri gösteriyor" diyordu ve T-040
 * `fetchProjectsForPanel`i yazana kadar DOĞRUYDU. Artık liste tüm durumları
 * gösterdiği için bant YALAN SÖYLÜYOR — kaldırılması bu görevin bir parçası.
 *
 * `getPublishedProjects` (önbellekli, public) yerine `fetchProjectsForPanel`
 * (ham, önbeleksiz) okunuyor. Adlandırma kasıtlı: `fetchX` ham servis,
 * `getX` önbellekli. Panel okumaları önbeleksiz ve öyle kalmalı.
 */
export default async function ProjelerYonetimiPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = durumGorunumuBul(tekDeger(parametreler.durum) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);
  const dil = panelDili(parametreler.dil);

  const cozum = projectFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    locale: dil,
    ...(gorunum.durum ? { status: gorunum.durum } : {}),
  });

  const liste = await fetchProjectsForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU, locale: dil },
  );

  return (
    <>
      <Topbar title="Projeler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <DilSekmeleri taban={TABAN} aktif={dil} korunan={{ durum: gorunum.anahtar }} />
          <DurumSekmeleri taban={TABAN} aktif={gorunum.anahtar} dil={dil} />

          <ProjelerEkrani projeler={liste.items} toplam={liste.total} dil={dil} />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => icerikYolu(TABAN, { durum: gorunum.anahtar, sayfa: s, dil })}
          />
        </div>
      </main>
    </>
  );
}
