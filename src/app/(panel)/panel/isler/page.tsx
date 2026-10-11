import { LayoutGrid, List } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { IS_GORUNUMLERI, isGorunumuBul, islerYolu } from '@/components/panel/is-gorunumleri';
import { IsKanban, KanbanBosDurum } from '@/components/panel/is-kanban';
import { IslerEkrani } from '@/components/panel/isler-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { jobFilterSchema } from '@/lib/schemas/job';
import { cn } from '@/lib/utils/cn';
import { fetchJobBoard, fetchJobsForPanel } from '@/server/services/job';

export const metadata: Metadata = {
  title: 'İşler',
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
 * `/panel/isler` — §4.2 kanban, `?gorunum=liste` ile tablo.
 *
 * İKİ GÖRÜNÜM, İKİ İŞ. Kanban TARAMA yüzeyi: beş kolon, kolon başına üst sınır
 * 50 ve gerçek toplam. Liste ERİŞİM yüzeyi: sayfalanmış, kesme yok. Kanban'daki
 * `truncated` uyarısı "tamamını listede gör" diye buraya bağlıyor — yani ikinci
 * görünüm bir süs değil, kesmenin zorunlu kıldığı kaçış.
 *
 * Kanban okuması SAYFALANMIYOR ve bu Backend'in ANLAM gerekçeli kararı: dolu
 * kolona kart taşımak görünen sayfadan bir kartı düşürür ve kullanıcı taşımanın
 * başarısız olduğunu sanar.
 */
export default async function IslerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const listeGorunumu = tek(parametreler.gorunum) === 'liste';

  if (!listeGorunumu) {
    const pano = await fetchJobBoard();
    const hicIsVar = pano.columns.some((k) => k.total > 0);

    return (
      <>
        <Topbar title="İşler" />

        <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
          <div className="flex flex-col gap-6">
            <GorunumSekmeleri aktif="kanban" />

            {hicIsVar ? <IsKanban pano={pano} /> : <KanbanBosDurum />}
          </div>
        </main>
      </>
    );
  }

  const gorunum = isGorunumuBul(tek(parametreler.durum) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = jobFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(gorunum.durum ? { status: gorunum.durum } : {}),
  });

  const liste = await fetchJobsForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="İşler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <GorunumSekmeleri aktif="liste" />

          <nav aria-label="Durum süzgeci" className="relative -mx-1 overflow-x-auto px-1 pb-1">
            <ul className="flex min-w-max gap-1.5">
              {IS_GORUNUMLERI.map((g) => {
                const secili = g.anahtar === gorunum.anahtar;
                return (
                  <li key={g.anahtar}>
                    <Link
                      href={islerYolu({ gorunum: 'liste', durum: g.anahtar })}
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

          <IslerEkrani
            isler={liste.items}
            toplam={liste.total}
            bosBaslik={gorunum.durum ? `${gorunum.etiket} durumunda iş yok` : 'Henüz iş yok'}
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => islerYolu({ gorunum: 'liste', durum: gorunum.anahtar, sayfa: s })}
          />
        </div>
      </main>
    </>
  );
}

/** Kanban ↔ liste geçişi. Her görünüm bir ADRES, o yüzden `Link`. */
function GorunumSekmeleri({ aktif }: { aktif: 'kanban' | 'liste' }) {
  const secenekler = [
    { anahtar: 'kanban' as const, etiket: 'Pano', ikon: LayoutGrid, href: islerYolu({}) },
    {
      anahtar: 'liste' as const,
      etiket: 'Liste',
      ikon: List,
      href: islerYolu({ gorunum: 'liste' }),
    },
  ];

  return (
    <nav aria-label="İş görünümü" className="flex gap-1.5">
      {secenekler.map(({ anahtar, etiket, ikon: Ikon, href }) => {
        const secili = anahtar === aktif;
        return (
          <Link
            key={anahtar}
            href={href}
            aria-current={secili ? 'page' : undefined}
            className={cn(
              'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center gap-1.5 border px-3 py-2 text-sm transition-colors',
              secili
                ? 'border-accent/40 bg-accent/12 text-accent-soft'
                : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
            )}
          >
            <Ikon className="size-4" aria-hidden="true" />
            {etiket}
          </Link>
        );
      })}
    </nav>
  );
}
