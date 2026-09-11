import type { Metadata } from 'next';

import { ProjelerEkrani } from '@/components/panel/projeler-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { getPublishedProjects } from '@/server/services';

export const metadata: Metadata = {
  title: 'Projeler',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/icerik/projeler` — §4.2.
 *
 * ⚠️ LİSTE ŞU AN YALNIZCA YAYINDAKİ PROJELERİ GÖSTERİYOR (ENGEL-1).
 *
 * Panelin TÜM durumları (taslak, zamanlanmış, arşiv) görmesi gerekiyor ama
 * servis katmanında böyle bir okuma yok: `getPublishedProjects` adı gereği
 * `PUBLISHED` + `publishedAt <= now` süzüyor, `getProjectBySlug` tekil.
 * Eksik olan Backend'in işi (§10.1), bu yüzden uydurma bir okuma yazmadım.
 *
 * SINIR KULLANICIYA DA SÖYLENİYOR: sayfa başındaki not, eklenen bir taslağın
 * neden listede görünmediğini açıklıyor. Sessizce eksik liste göstermek,
 * "kaydettim ama kayboldu" sanısına yol açardı — kaçındığımız hata sınıfı.
 */
export default async function ProjelerYonetimiPage() {
  const projeler = await getPublishedProjects();

  return (
    <>
      <Topbar title="Projeler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <div className="border-warning/40 bg-warning/8 rounded-card border p-4">
            <p className="text-warning text-sm">
              Bu liste şimdilik <span className="font-medium">yalnızca yayındaki</span> projeleri
              gösteriyor. Taslak ve zamanlanmış kayıtlar panelde henüz listelenemiyor — tüm
              durumları okuyan bir servis eklenmesi gerekiyor. Eklediğin taslak kaydedilir, ama
              aşağıda görünmez.
            </p>
          </div>

          <ProjelerEkrani projeler={projeler} />
        </div>
      </main>
    </>
  );
}
