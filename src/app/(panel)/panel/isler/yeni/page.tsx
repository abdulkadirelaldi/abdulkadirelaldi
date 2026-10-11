import type { Metadata } from 'next';

import { IsFormu } from '@/components/panel/is-formu';
import { Topbar } from '@/components/panel/topbar';
import { fetchClientsForPanel } from '@/server/services/client';

export const metadata: Metadata = {
  title: 'Yeni iş',
  robots: { index: false, follow: false, nocache: true },
};

/** Seçicide kaç müşteri listelenir — tek kullanıcılı panelde üst sınır. */
const SECICI_UST_SINIR = 100;

/**
 * `/panel/isler/yeni`.
 *
 * ⚠️ MÜŞTERİ SEÇİCİSİ `isArchived: false` GÖNDERİYOR — AÇIKÇA.
 *
 * Backend'in bağlayıcı uyarısı: müşteri LİSTESİNİN varsayılanı arşivi
 * gizlemiyor (T-038'in kararı), ama SEÇİCİ gizlemek zorunda — yoksa
 * arşivlenmiş müşteriler yeni iş için seçilebilir çıkar. Backend'in cümlesi:
 * "İki yüzeyin ihtiyacı zıt ve bunu çözen yer varsayılan değil ÇAĞIRAN."
 * Bu satır o çağrı; `isArchived` burada VERİLMEZSE sessizce arşiv dahil gelir.
 *
 * YENİ İŞTE arşivli müşteri hiç gösterilmiyor — korunacak bir bağ yok.
 * Düzenlemede durum farklı; bkz. `[id]/page.tsx`.
 */
export default async function YeniIsPage() {
  const musteriler = await fetchClientsForPanel({
    page: 1,
    perPage: SECICI_UST_SINIR,
    isArchived: false,
  });

  return (
    <>
      <Topbar title="Yeni iş" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <IsFormu
            musteriler={musteriler.items.map((m) => ({
              id: m.id,
              name: m.name,
              isArchived: m.isArchived,
            }))}
          />
        </div>
      </main>
    </>
  );
}
