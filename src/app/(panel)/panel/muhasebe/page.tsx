import { ChartColumn, Tags } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CsvIndir } from '@/components/panel/csv-indir';
import { IslemlerEkrani } from '@/components/panel/islemler-ekrani';
import {
  MUHASEBE_GORUNUMLERI,
  muhasebeGorunumuBul,
  muhasebeYolu,
} from '@/components/panel/muhasebe-gorunumleri';
import { MuhasebeSuzgeci } from '@/components/panel/muhasebe-suzgeci';
import { Sayfalama } from '@/components/panel/sayfalama';
import { TekrarlayanKalemler } from '@/components/panel/tekrarlayan-kalemler';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { transactionFilterSchema } from '@/lib/schemas/transaction';
import { cn } from '@/lib/utils/cn';
import { EXPORT_PAGE_SIZE } from '@/server/services/export';
import { fetchDueRecurringSummary } from '@/server/services/recurring-transaction';
import { fetchTransactionsForPanel } from '@/server/services/transaction';
import { fetchTransactionCategoriesForPanel } from '@/server/services/transaction-category';

export const metadata: Metadata = {
  title: 'Muhasebe',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
/** Süzgeç açılır listesi için üst sınır. */
const KATEGORI_UST_SINIR = 100;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/muhasebe` — §4.2 işlem listesi, filtre, hızlı ekleme.
 *
 * SIRALAMA SUNUCUDA: `date desc, createdAt desc`. İkincil anahtar ZORUNLU
 * çünkü `date` bir GÜN — aynı güne düşen işlemlerde tek anahtarla sayfalama
 * kararsız olurdu ve aynı kayıt iki sayfada görünebilirdi. Bu yüzden istemci
 * sıralaması HİÇ YOK (`islemler-ekrani.tsx`te hiçbir sütun `siralamaDegeri`
 * vermiyor) ve `sort` parametresi de arayüzden açılmıyor.
 *
 * SÜZGEÇ KATEGORİLERİ ARŞİV DAHİL geliyor: süzgecin işi GEÇMİŞİ okumak ve
 * arşivli kategoriye bağlı eski işlemler duruyor. Seçicinin (form) ihtiyacı
 * bunun tersi ve o `/yeni` ile `/[id]` sayfalarında ayrıca yazılı.
 */
export default async function MuhasebePage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = muhasebeGorunumuBul(tek(parametreler.gorunum) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);
  const from = tek(parametreler.from);
  const to = tek(parametreler.to);
  const kategori = tek(parametreler.kategori);

  const cozum = transactionFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    sort: 'desc',
    ...(gorunum.type ? { type: gorunum.type } : {}),
    ...(gorunum.isPaid !== undefined ? { isPaid: gorunum.isPaid } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(kategori ? { categoryId: kategori } : {}),
  });

  /* Süzgecin GEÇERLİ hâli — CSV de TAM BUNU indirmeli, yoksa ekranda görünen
     ile dosyadaki ayrışır ve kullanıcı hangisine güveneceğini bilemez. */
  const suzgec = cozum.success
    ? cozum.data
    : { page: 1, perPage: SAYFA_BOYUTU, sort: 'desc' as const };

  const [liste, kategoriler, tekrarlayan] = await Promise.all([
    fetchTransactionsForPanel(suzgec),
    /* Süzgeç için — arşiv DAHİL, `isArchived` verilmiyor. */
    fetchTransactionCategoriesForPanel({ page: 1, perPage: KATEGORI_UST_SINIR }),
    /* ADR-040 — "3 kalem bekliyor" EKRANDA görünmek zorunda. */
    fetchDueRecurringSummary(),
  ]);

  return (
    <>
      <Topbar title="Muhasebe" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="İşlem görünümleri"
              className="relative -mx-1 overflow-x-auto px-1 pb-1"
            >
              <ul className="flex min-w-max gap-1.5">
                {MUHASEBE_GORUNUMLERI.map((g) => {
                  const secili = g.anahtar === gorunum.anahtar;
                  return (
                    <li key={g.anahtar}>
                      <Link
                        href={muhasebeYolu({
                          gorunum: g.anahtar,
                          from: from || undefined,
                          to: to || undefined,
                          kategori: kategori || undefined,
                        })}
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

            <div className="flex flex-wrap gap-2">
              <Link
                href="/panel/muhasebe/raporlar"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <ChartColumn className="size-4" aria-hidden="true" />
                Raporlar
              </Link>

              <Link
                href="/panel/muhasebe/kategoriler"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <Tags className="size-4" aria-hidden="true" />
                Kategoriler
              </Link>
            </div>
          </div>

          {/*
            ⚠️ TEKRARLAYAN KALEMLER LİSTEDEN ÖNCE. ADR-040 üretimi ELLE
            tetikliyor; kullanıcı basmayı unutursa defter EKSİK kalır. Sayıyı
            listenin altına koymak, defterine bakmaya gelen birine eksikliği
            kaydırdıktan sonra söylemek olurdu.
          */}
          <TekrarlayanKalemler ozet={tekrarlayan} />

          {!cozum.success && (
            <p
              role="alert"
              className="rounded-input border-danger/40 bg-danger/8 text-danger border px-3 py-2.5 text-sm"
            >
              Süzgeç geçersizdi (muhtemelen bitiş tarihi başlangıçtan önce) — süzgeçsiz ilk sayfa
              gösteriliyor.
            </p>
          )}

          <MuhasebeSuzgeci
            gorunum={gorunum.anahtar}
            from={from}
            to={to}
            kategori={kategori}
            kategoriler={kategoriler.items}
          />

          <IslemlerEkrani
            islemler={liste.items}
            toplam={liste.total}
            bosBaslik={
              gorunum.anahtar === 'hepsi' && !from && !to && !kategori
                ? 'Henüz işlem yok'
                : 'Bu süzgeçte işlem yok'
            }
          />

          {/*
            CSV SAYFALAMANIN YANINDA DEĞİL LİSTENİN ALTINDA VE GÖRÜNEN SÜZGEÇLE:
            `suzgec` ekranı dolduran filtrenin TA KENDİSİ. Dosyada ekranda
            olmayan satır çıkmaz, ekranda olan satır eksilmez.

            ⚠️ SAYFA NUMARASI DOSYAYA GEÇMİYOR ve geçmemeli: `perPage` burada 25,
            dışa aktarımda 10.000 (`EXPORT_PAGE_SIZE`). Kullanıcı "bu süzgecin
            TAMAMINI" indiriyor, "25 satırlık üçüncü sayfayı" değil.
          */}
          <CsvIndir
            istek={{ dataset: 'transactions', filter: suzgec }}
            etiket="İşlemleri CSV indir"
            aciklama={
              liste.total > EXPORT_PAGE_SIZE
                ? 'Bu süzgeçteki işlemler — ekranda gördüğün sayfa değil.'
                : `Bu süzgeçteki işlemlerin tamamı (${liste.total} satır) — ekranda gördüğün sayfa değil.`
            }
            /*
              ⚠️ "TAMAMI" SÖZÜ YALNIZCA TUTULABİLİYORSA VERİLİYOR — T-109h'de
              ölçülen kusur buydu: 10.405 satırlık bir süzgeçte panel "tamamı
              (10405 satır)" diyordu ve dosyaya 10.000 satır giriyordu.

              `EXPORT_PAGE_SIZE` SUNUCU MODÜLÜNDEN burada okunuyor ve istemci
              bileşenine PROP olarak geçiyor; `csv-indir.tsx` onu kendisi içe
              aktarsaydı Prisma'ya bağlı servis modülü istemci paketine girerdi.
            */
            kesilme={{ toplam: liste.total, ustSinir: EXPORT_PAGE_SIZE }}
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              muhasebeYolu({
                gorunum: gorunum.anahtar,
                from: from || undefined,
                to: to || undefined,
                kategori: kategori || undefined,
                sayfa: s,
              })
            }
          />
        </div>
      </main>
    </>
  );
}
