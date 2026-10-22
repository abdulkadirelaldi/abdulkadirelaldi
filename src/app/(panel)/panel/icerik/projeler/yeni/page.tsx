import type { Metadata } from 'next';

import { ProjeFormu } from '@/components/panel/proje-formu';
import { panelDili } from '@/components/panel/icerik-gorunumleri';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Yeni proje',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * `/panel/icerik/projeler/yeni`.
 *
 * `[id]` ile ÇAKIŞMIYOR: Next statik segmenti dinamik olana tercih ediyor,
 * yani "yeni" hiçbir zaman kayıt kimliği olarak yorumlanmıyor. Ayrı bir rota
 * olmasının sebebi, düzenleme formuyla aynı bileşeni paylaşması — yeni kayıtta
 * okunacak bir şey yok, o yüzden burada sunucu okuması da yok.
 *
 * `?dil=` liste sekmesinden gelir; geçersiz ya da eksikse Türkçe (ADR-046).
 */
export default async function YeniProjePage({ searchParams }: SayfaProps) {
  const dil = panelDili((await searchParams).dil);

  return (
    <>
      <Topbar title="Yeni proje" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <ProjeFormu dil={dil} />
        </div>
      </main>
    </>
  );
}
