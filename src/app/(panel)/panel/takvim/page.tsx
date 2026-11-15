import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { TakvimEkrani } from '@/components/panel/takvim/takvim-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { gecerliGun } from '@/lib/takvim/bicim';
import { gorunumAraligi, gorunumMu } from '@/lib/takvim/gorunum';
import { KATMAN_COOKIE, katmanlariCoz } from '@/lib/takvim/katmanlar';
import { appToday } from '@/server/services/_shared';
import { fetchGorevOlusumlari } from '@/server/services/masa';
import { fetchTakvim } from '@/server/services/takvim';

export const metadata: Metadata = {
  title: 'Takvim',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/panel/takvim` — ay, hafta, gün ve ajanda (2026-11-10). `?gorunum=` bilinmiyorsa ay,
 * `?tarih=` bozuksa bugün. Aralığın oluşumları sunucuda açılır.
 */
export default async function TakvimPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = gorunumMu(parametreler.gorunum) ? parametreler.gorunum : 'ay';
  const bugun = appToday();
  const tarih = gecerliGun(parametreler.tarih) ?? bugun;
  const { bas, son } = gorunumAraligi(gorunum, tarih);
  const [{ etkinlikler, olusumlar: etkinlikOlusumlari }, gorevler] = await Promise.all([
    fetchTakvim(bas, son),
    fetchGorevOlusumlari(bas, son),
  ]);
  // Masa görevlerinin teslimleri (ADR-049) etkinliklerle aynı sırada.
  const olusumlar = [...etkinlikOlusumlari, ...gorevler].sort((a, b) =>
    a.baslangic.localeCompare(b.baslangic),
  );
  const katmanlar = katmanlariCoz((await cookies()).get(KATMAN_COOKIE)?.value);

  return (
    <>
      <Topbar title="Takvim" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <TakvimEkrani
          gorunum={gorunum}
          tarih={tarih}
          bugun={bugun}
          etkinlikler={etkinlikler}
          olusumlar={olusumlar}
          katmanlar={katmanlar}
        />
      </main>
    </>
  );
}
