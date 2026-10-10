import type { Metadata } from 'next';

import { BlogEkrani } from '@/components/panel/blog-ekrani';
import { DurumSekmeleri } from '@/components/panel/durum-sekmeleri';
import { durumGorunumuBul, icerikYolu } from '@/components/panel/icerik-gorunumleri';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { postFilterSchema } from '@/lib/schemas/post';
import { fetchPostsForPanel } from '@/server/services/post';

export const metadata: Metadata = {
  title: 'Blog',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;
const TABAN = '/panel/icerik/blog';

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tekDeger = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tekDeger(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/icerik/blog` — §4.2.
 *
 * `fetchPostsForPanel` (ham, önbeleksiz) okunuyor; `getPublishedPosts` public
 * tarafın önbellekli okuması ve panelde kullanılamaz — tüm durumlar gerekiyor.
 * Sıralama `updatedAt desc` (Backend kararı): taslakların `publishedAt`i `null`,
 * public anahtar panelde bütün taslakları bir uca yığardı.
 */
export default async function BlogYonetimiPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = durumGorunumuBul(tekDeger(parametreler.durum) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = postFilterSchema.safeParse({
    page: sayfa,
    perPage: SAYFA_BOYUTU,
    ...(gorunum.durum ? { status: gorunum.durum } : {}),
  });

  const liste = await fetchPostsForPanel(
    cozum.success ? cozum.data : { page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Blog" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <DurumSekmeleri taban={TABAN} aktif={gorunum.anahtar} />

          <BlogEkrani yazilar={liste.items} toplam={liste.total} />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => icerikYolu(TABAN, { durum: gorunum.anahtar, sayfa: s })}
          />
        </div>
      </main>
    </>
  );
}
