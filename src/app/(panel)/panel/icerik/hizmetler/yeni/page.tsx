import type { Metadata } from 'next';

import { HizmetFormu } from '@/components/panel/hizmet-formu';
import { panelDili } from '@/components/panel/icerik-gorunumleri';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni hizmet',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/panel/icerik/hizmetler/yeni` — statik segment `[id]`e tercih edilir.
 *
 * `?dil=` liste sekmesinden gelir; geçersiz ya da eksikse Türkçe (ADR-046).
 */
export default async function YeniHizmetPage({ searchParams }: SayfaProps) {
  const dil = panelDili((await searchParams).dil);

  return (
    <>
      <Topbar title="Yeni hizmet" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <HizmetFormu dil={dil} />
        </div>
      </main>
    </>
  );
}
