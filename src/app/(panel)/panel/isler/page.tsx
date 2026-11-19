import type { Metadata } from 'next';

import { IslerEkrani } from '@/components/panel/isler/isler-ekrani';
import { DukkanPaneli } from '@/components/panel/isler/dukkan-paneli';
import { SokakEkrani } from '@/components/panel/isler/sokak-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { kapsamAnahtari, kapsamCoz, kapsamTabelasi, sokakKur } from '@/lib/gorev/sokak';
import { appToday } from '@/server/services/_shared';
import { fetchDukkanKayitlari } from '@/server/services/dukkan';
import { fetchIsListesi } from '@/server/services/gorev';

const AYLAR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const metadata: Metadata = {
  title: 'İşler',
  robots: { index: false, follow: false, nocache: true },
};

type Parametreler = { dukkan?: string | string[]; bina?: string | string[]; gorunum?: string };

/**
 * `/panel/isler` — işlerin sokağı (ADR-057). Aynı adres üç görünüm verir; ayrı rota açılmaz:
 * - parametresiz: sokak (dikkat panosu + dükkânlar)
 * - `?dukkan=Garage` / `?bina=OKUL`: o dükkânın içi — düz liste (ADR-050), yalnız onun işleri
 * - `?gorunum=liste`: bütün işlerin düz listesi
 */
export default async function IslerPage({ searchParams }: { searchParams: Promise<Parametreler> }) {
  const p = await searchParams;
  const bugun = appToday();
  const ay = bugun.slice(0, 7);
  const [liste, kayitlar] = await Promise.all([fetchIsListesi(bugun), fetchDukkanKayitlari(ay)]);
  const kapsam = kapsamCoz(p);

  const acik = [
    ...liste.gecikmis,
    ...liste.bugun,
    ...liste.buHafta,
    ...liste.sonra,
    ...liste.tarihsiz,
  ];
  const sokak = sokakKur(acik, liste.bitenler, bugun, kayitlar);

  let icerik;
  if (kapsam) {
    const tabela = kapsamTabelasi(kapsam);
    const anahtar = kapsamAnahtari(kapsam);
    // Sokaktaki tente rengiyle aynı olsun.
    const yerinde = [...sokak.cadde, ...sokak.arka].find((d) => d.anahtar === anahtar);
    icerik = (
      <div className="space-y-5">
        <DukkanPaneli
          key={anahtar}
          {...tabela}
          renk={yerinde?.renk ?? tabela.renk}
          ayAdi={AYLAR[Number(ay.slice(5)) - 1]!}
          kayit={kayitlar[anahtar] ?? { anahtar, driveUrl: null, not: null, paket: null }}
        />
        <IslerEkrani liste={liste} bugun={bugun} kapsam={kapsam} />
      </div>
    );
  } else if (p.gorunum === 'liste') {
    icerik = <IslerEkrani liste={liste} bugun={bugun} />;
  } else {
    icerik = <SokakEkrani sokak={sokak} bugun={bugun} />;
  }

  return (
    <>
      <Topbar title="İşler" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        {icerik}
      </main>
    </>
  );
}
