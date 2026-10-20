import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HayatAltMenu, HayatGorunumSekmeleri } from '@/components/panel/hayat-alt-menu';
import { hedeflerYolu } from '@/components/panel/hayat-bicim';
import { HEDEF_GORUNUMLERI, hedefGorunumuBul } from '@/components/panel/hedef-gorunumleri';
import { HedefListesi } from '@/components/panel/hedef-listesi';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { goalFilterSchema } from '@/lib/schemas/goal';
import { fetchGoals } from '@/server/services/goal';

export const metadata: Metadata = {
  title: 'Hedefler',
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
 * `/panel/hayat/hedefler` — §4.2 hedef listesi.
 *
 * ARAMA BİR GET FORMU, İSTEMCİ BİLEŞENİ DEĞİL: `?q=` zaten adresin parçası ve
 * sunucu süzüyor; düz `<form method="get">` JS yüklenmeden de çalışıyor.
 * Görünüm anahtarı formda GİZLİ alanla taşınıyor — aramak sekmeyi sıfırlamasın.
 *
 * ⚠️ `goalFilterSchema` 120 karakterden uzun aramayı REDDEDİYOR; o durumda
 * aramasız görünüme düşülüyor ve kullanıcıya bu SÖYLENİYOR — sessizce
 * süzülmemiş liste göstermek "arama sonuç verdi" yalanı olurdu.
 */
export default async function HedeflerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = hedefGorunumuBul(tek(parametreler.gorunum) || 'hepsi');
  const arama = tek(parametreler.q).trim();
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = goalFilterSchema.safeParse({
    ...(gorunum.status ? { status: gorunum.status } : {}),
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(arama ? { q: arama } : {}),
  });

  const liste = await fetchGoals(
    cozum.success
      ? cozum.data
      : {
          ...(gorunum.status ? { status: gorunum.status } : {}),
          page: 1,
          perPage: SAYFA_BOYUTU,
        },
  );
  const etkinArama = cozum.success ? (cozum.data.q ?? '') : '';

  return (
    <>
      <Topbar title="Hedefler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl min-w-0 flex-col gap-6">
          <HayatAltMenu aktif="hedefler" />

          <HayatGorunumSekmeleri
            etiket="Hedef durumları"
            gorunumler={HEDEF_GORUNUMLERI}
            aktif={gorunum.anahtar}
            yol={(anahtar) => hedeflerYolu({ gorunum: anahtar, q: etkinArama || undefined })}
          />

          <form
            role="search"
            method="get"
            action="/panel/hayat/hedefler"
            className="flex flex-wrap items-center gap-2"
          >
            {gorunum.anahtar !== 'hepsi' && (
              <input type="hidden" name="gorunum" value={gorunum.anahtar} />
            )}
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                defaultValue={arama}
                maxLength={120}
                placeholder="Başlık veya açıklamada ara"
                aria-label="Hedeflerde ara"
                className="pl-9"
              />
            </div>
            <button type="submit" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Ara
            </button>
            {arama && (
              <Link
                href={hedeflerYolu({ gorunum: gorunum.anahtar })}
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
              >
                Aramayı temizle
              </Link>
            )}
          </form>

          {arama && !cozum.success && (
            <p role="status" className="text-warning text-sm">
              Arama terimi geçersiz (en fazla 120 karakter) — aramasız liste gösteriliyor.
            </p>
          )}

          <HedefListesi
            hedefler={liste.items}
            toplam={liste.total}
            bosBaslik={etkinArama ? 'Arama sonuç vermedi' : gorunum.bosBaslik}
            bosAciklama={
              etkinArama
                ? `“${etkinArama}” için bu görünümde eşleşen hedef yok.`
                : gorunum.bosAciklama
            }
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              hedeflerYolu({ gorunum: gorunum.anahtar, q: etkinArama || undefined, sayfa: s })
            }
          />
        </div>
      </main>
    </>
  );
}
