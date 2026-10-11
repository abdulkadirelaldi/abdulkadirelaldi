import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { KategoriEkrani } from '@/components/panel/kategori-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { transactionCategoryFilterSchema } from '@/lib/schemas/transaction-category';
import { fetchTransactionCategoriesForPanel } from '@/server/services/transaction-category';

export const metadata: Metadata = {
  title: 'Kategoriler',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 50;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(Array.isArray(ham) ? ham[0] : ham);
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/muhasebe/kategoriler` — §4.2 kategori yönetimi.
 *
 * ⚠️ ARŞİV DAHİL (varsayılan, `isArchived` verilmiyor): T-038'in kararı. Bu
 * ekranın işi kategorileri YÖNETMEK — arşivlenmiş olanı göremezse kullanıcı
 * geri de alamaz. Form seçicisinin ihtiyacı bunun tersi ve o `/muhasebe/yeni`
 * ile `/muhasebe/[id]`de ayrıca yazılı.
 *
 * Sıralama Backend'de `type asc, name asc` — gelir ve gider kategorileri
 * gruplanmış geliyor. İstemcide sıralama `VeriTablosu` üzerinden MÜMKÜN ve
 * burada sorun değil: liste sayfalanmış ama bir sayfada 50 kayıt var ve kesme
 * yok, yani elimizdekiler o sayfanın tamamı.
 */
export default async function KategorilerPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = transactionCategoryFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
  });

  const liste = await fetchTransactionCategoriesForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Kategoriler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <Link
            href="/panel/muhasebe"
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'self-start' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Muhasebeye dön
          </Link>

          <p className="text-muted max-w-2xl text-sm">
            Kategoriler <span className="text-body">silinmiyor, arşivleniyor</span> — bağlı işlemler
            ve tekrarlayan şablonlar FK ile tutuluyor. Arşivlenmiş kategori yeni işlemlerde
            seçilemez ama eski kayıtlarda görünmeye devam eder.
          </p>

          <KategoriEkrani kategoriler={liste.items} toplam={liste.total} />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) =>
              s > 1 ? `/panel/muhasebe/kategoriler?sayfa=${s}` : '/panel/muhasebe/kategoriler'
            }
          />
        </div>
      </main>
    </>
  );
}
