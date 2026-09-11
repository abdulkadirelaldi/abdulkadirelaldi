import type { Metadata } from 'next';

import { DeneyimEkrani } from '@/components/panel/deneyim-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { getExperience } from '@/server/services';

export const metadata: Metadata = {
  title: 'Deneyim',
  /* §8.7 — panel dizine girmez; middleware başlığına ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/icerik/deneyim` — §4.2.
 *
 * SUNUCU BİLEŞENİ: okuma önbelleklenebilir sınırın içinde (ADR-011), yazma
 * Server Action'larla istemci yaprağından yapılıyor.
 *
 * `getExperience()` TÜM kayıtları döndürüyor — `Experience`in yayın durumu yok,
 * yani panelde ayrı bir okumaya gerek kalmıyor. (Projelerde durum farklı;
 * gerekçe o sayfada.)
 */
export default async function DeneyimYonetimiPage() {
  const kayitlar = await getExperience();

  return (
    <>
      <Topbar title="Deneyim" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-4xl flex-col gap-6">
          <p className="text-muted max-w-2xl text-sm">
            Bu kayıtlar <span className="text-body">/hakkimda</span> sayfasındaki zaman çizelgesini
            ve <span className="text-body">/cv</span> sayfasını besliyor. Silme kalıcıdır; kaydın
            anlık görüntüsü denetim kaydında kalır.
          </p>

          <DeneyimEkrani kayitlar={kayitlar} />
        </div>
      </main>
    </>
  );
}
