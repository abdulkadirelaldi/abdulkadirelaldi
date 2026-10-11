import type { Metadata } from 'next';
import Link from 'next/link';

import {
  MUSTERI_GORUNUMLERI,
  musteriGorunumuBul,
  musterilerYolu,
} from '@/components/panel/musteri-gorunumleri';
import { MusterilerEkrani } from '@/components/panel/musteriler-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { clientFilterSchema } from '@/lib/schemas/client';
import { cn } from '@/lib/utils/cn';
import { fetchClientsForPanel } from '@/server/services/client';

export const metadata: Metadata = {
  title: 'Müşteriler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/musteriler` — §4.2.
 *
 * ⚠️ VARSAYILAN GÖRÜNÜM ARŞİVİ GİZLEMİYOR (Backend T-100, T-038'in kararı
 * korundu): `isArchived` alanı hiç verilmiyor, arşiv dahil hepsi geliyor ve
 * sekmelerle ayrılabiliyor. Gerekçe `musteri-gorunumleri.ts`te.
 *
 * Bu, iş formundaki müşteri seçicisinin ihtiyacının TERSİ — orası
 * `isArchived: false` göndermek zorunda. İki yüzeyin zıt ihtiyacını çözen yer
 * varsayılan değil çağıran.
 */
export default async function MusterilerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = musteriGorunumuBul(tek(parametreler.gorunum) || 'hepsi');
  const arama = tek(parametreler.q).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = clientFilterSchema.safeParse({
    ...gorunum.filtre,
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(arama ? { q: arama } : {}),
  });

  const liste = await fetchClientsForPanel(
    cozum.success ? cozum.data : { ...gorunum.filtre, page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Müşteriler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <nav aria-label="Müşteri görünümleri" className="-mx-1 overflow-x-auto px-1 pb-1">
            <ul className="flex min-w-max gap-1.5">
              {MUSTERI_GORUNUMLERI.map((g) => {
                const secili = g.anahtar === gorunum.anahtar;
                return (
                  <li key={g.anahtar}>
                    <Link
                      href={musterilerYolu({ gorunum: g.anahtar, q: arama || undefined })}
                      aria-current={secili ? 'page' : undefined}
                      className={cn(
                        'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
                        secili
                          ? 'border-accent/40 bg-accent/12 text-accent-soft'
                          : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                      )}
                    >
                      {g.etiket}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="text-muted max-w-2xl text-sm">
            Varsayılan görünüm <span className="text-body">arşivi de gösteriyor</span> — bir
            müşterinin kaybolduğunu sanmamak için. Arşivlenmiş kayıt silinmez; bağlı işleri olduğu
            gibi durur.
          </p>

          <MusterilerEkrani
            musteriler={liste.items}
            toplam={liste.total}
            bosBaslik={arama ? 'Arama sonuç vermedi' : gorunum.bosBaslik}
            bosAciklama={
              arama ? `“${arama}” için bu görünümde eşleşen müşteri yok.` : gorunum.bosAciklama
            }
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              musterilerYolu({ gorunum: gorunum.anahtar, q: arama || undefined, sayfa: s })
            }
          />
        </div>
      </main>
    </>
  );
}
