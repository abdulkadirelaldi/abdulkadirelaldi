import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IslemFormu } from '@/components/panel/islem-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchJobsForPanel } from '@/server/services/job';
import { fetchTransactionForPanel } from '@/server/services/transaction';
import { fetchTransactionCategoriesForPanel } from '@/server/services/transaction-category';

export const metadata: Metadata = {
  title: 'İşlemi düzenle',
  robots: { index: false, follow: false, nocache: true },
};

const SECICI_UST_SINIR = 100;

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/muhasebe/[id]` — düzenleme.
 *
 * ⚠️ SEÇİCİ YİNE `isArchived: false` ama bu TEK BAŞINA bir bağı koparırdı —
 * T-103'te müşteri seçicisinde ölçtüğüm ÜÇÜNCÜ DURUMUN aynısı: arşivli bir
 * kategoriye bağlı işlem düzenlenirken o kategori listede olmaz, `<select>`
 * değeri eşleşmeyince tarayıcı ilk seçeneğe düşer ve KAYDETMEK işlemi BAŞKA
 * BİR KATEGORİYE bağlar.
 *
 * Burada risk DAHA YÜKSEK: `Transaction.categoryId` ZORUNLU, yani "kategori
 * yok" diye bir seçenek bile yok ve ilk seçenek her zaman geçerli bir kategori.
 * Müşteride "Müşteri yok" seçeneği ilk sıradaydı; burada o tampon yok.
 *
 * Çözümün sunucu yarısı: bu sayfa yalnızca AKTİF listeyi veriyor. Birleştirme
 * `islem-formu.tsx`te — form, kaydın kategorisi aktif listede YOKSA onu
 * seçeneklere ekliyor ve "(arşivli)" işaretiyle çiziyor. Hangi kaydın
 * düzenlendiğini o biliyor.
 *
 * ⚠️ SİLME YOK: Backend eylemi yazmadı ("bir işlemi silmek defteri geriye
 * dönük değiştirmektir"). Ölü düğme konmadı; yanlış giriş bu formdan düzeltilir.
 */
export default async function IslemDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const islem = await fetchTransactionForPanel(id);

  if (!islem) notFound();

  const [kategoriler, isler] = await Promise.all([
    fetchTransactionCategoriesForPanel({
      page: 1,
      perPage: SECICI_UST_SINIR,
      isArchived: false,
    }),
    fetchJobsForPanel({ page: 1, perPage: SECICI_UST_SINIR }),
  ]);

  return (
    <>
      <Topbar title={islem.categoryName} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <IslemFormu
            islem={islem}
            kategoriler={kategoriler.items.map((k) => ({
              id: k.id,
              name: k.name,
              type: k.type,
              isArchived: k.isArchived,
            }))}
            isler={isler.items.map((i) => ({ id: i.id, title: i.title }))}
          />
        </div>
      </main>
    </>
  );
}
