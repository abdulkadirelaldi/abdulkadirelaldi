import type { Metadata } from 'next';

import { IslemFormu } from '@/components/panel/islem-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchJobsForPanel } from '@/server/services/job';
import { fetchTransactionCategoriesForPanel } from '@/server/services/transaction-category';

export const metadata: Metadata = {
  title: 'Yeni işlem',
  robots: { index: false, follow: false, nocache: true },
};

const SECICI_UST_SINIR = 100;

/**
 * `/panel/muhasebe/yeni` — hızlı ekleme.
 *
 * ⚠️ KATEGORİ SEÇİCİSİ `isArchived: false` GÖNDERİYOR — AÇIKÇA.
 *
 * Backend'in bağlayıcı notu: kategori LİSTESİNİN varsayılanı arşivi gizlemiyor
 * (T-038'in kararı), ama SEÇİCİ gizlemek ZORUNDA — yoksa arşivlenmiş
 * kategoriler seçilebilir çıkar ve arşivleme anlamını yitirir. `isArchived`
 * burada verilmezse sessizce arşiv dahil gelir.
 *
 * YENİ işlemde arşivli kategori hiç gösterilmiyor — korunacak bir bağ yok.
 * Düzenlemede durum farklı; bkz. `[id]/page.tsx`.
 */
export default async function YeniIslemPage() {
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
      <Topbar title="Yeni işlem" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <IslemFormu
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
