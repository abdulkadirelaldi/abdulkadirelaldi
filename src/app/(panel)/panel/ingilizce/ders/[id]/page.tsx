import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DersOynatici } from '@/components/panel/ingilizce/ders-oynatici';
import { dersBul, PARKURLAR } from '@/lib/ingilizce/mufredat';
import {
  acikMi,
  fetchIngilizceDurum,
  fetchTekrarSorulari,
  tekrarKimligi,
} from '@/server/services/ingilizce';

export const metadata: Metadata = {
  title: 'Ders',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/ingilizce/ders/[id]` — ders ya da `tekrar-<parkur>` (2026-11-06). Kilitli ders
 * ve boş tekrar parkura döner; bilinmeyen kimlik 404.
 */
export default async function DersPage({ params }: SayfaProps) {
  const { id } = await params;

  const tekrar = PARKURLAR.find((p) => tekrarKimligi(p.id) === id);
  if (tekrar) {
    const sorular = await fetchTekrarSorulari(tekrar.id);
    if (sorular.length === 0) redirect(`/panel/ingilizce?parkur=${tekrar.id}`);
    return (
      <main id="panel-icerik" className="flex-1 px-4 py-5 lg:p-6">
        <DersOynatici
          dersId={id}
          baslik="Tekrar"
          ust={tekrar.ad}
          gorsel="🔁"
          not={null}
          alistirmalar={sorular}
          geriHref={`/panel/ingilizce?parkur=${tekrar.id}`}
          sonrakiHref={null}
        />
      </main>
    );
  }

  const konum = dersBul(id);
  if (!konum) notFound();
  const { tamamlanan } = await fetchIngilizceDurum(null);
  const geriHref = `/panel/ingilizce?parkur=${konum.parkur.id}`;
  if (!acikMi(konum, new Set(tamamlanan))) redirect(geriHref);

  return (
    <main id="panel-icerik" className="flex-1 px-4 py-5 lg:p-6">
      <DersOynatici
        dersId={konum.ders.id}
        baslik={konum.ders.baslik}
        gorsel={konum.ders.gorsel}
        ust={`${konum.parkur.ad} · ${konum.unite.seviye} · ${konum.unite.baslik}`}
        not={konum.ders.not}
        alistirmalar={konum.ders.alistirmalar}
        geriHref={geriHref}
        sonrakiHref={konum.sonraki ? `/panel/ingilizce/ders/${konum.sonraki.id}` : null}
      />
    </main>
  );
}
