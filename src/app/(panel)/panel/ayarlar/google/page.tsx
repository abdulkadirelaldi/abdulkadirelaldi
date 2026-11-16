import type { Metadata } from 'next';

import { GoogleBaglanti } from '@/components/panel/google-baglanti';
import { Topbar } from '@/components/panel/topbar';
import { fetchGoogleDurumu } from '@/server/services/google-takvim';

export const metadata: Metadata = {
  title: 'Google Takvim',
  robots: { index: false, follow: false, nocache: true },
};

const DONUSLER = ['bagli', 'hata', 'iptal'] as const;

/** `/panel/ayarlar/google` — Google Takvim bağlantısı (ADR-051). */
export default async function GooglePage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [durum, { durum: ham }] = await Promise.all([fetchGoogleDurumu(), searchParams]);
  const donus = DONUSLER.find((d) => d === ham) ?? null;
  return (
    <>
      <Topbar title="Google Takvim" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto max-w-2xl">
          <GoogleBaglanti ilk={durum} donus={donus} />
        </div>
      </main>
    </>
  );
}
