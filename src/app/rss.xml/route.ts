import { absoluteUrl, buildRssFeed, getProfile, getPublishedPosts } from '@/server/services';

/**
 * /rss.xml — §4.1.
 *
 * Node runtime (Next 15 varsayılanı): servisler Prisma kullanıyor ve Prisma
 * Edge'de yüklenemez (T-014/K1). Bu rota veri okuduğu için Edge'e ALINMAMALI.
 *
 * Yalnızca yayınlanmış yazılar: `getPublishedPosts` yayın penceresini uygular.
 */
/**
 * İSTEK ZAMANINDA ÜRETİLİR — DERLEMEDE DEĞİL (BULGU-017).
 *
 * Bu satır olmadan Next bu rotayı ön-render eder ve `getPublishedPosts`
 * DERLEME SIRASINDA veritabanına gider. Sonuç ölçüldü: `pnpm build` yalnızca
 * `DATABASE_URL` değil, ERİŞİLEBİLİR BİR VERİTABANI istiyordu — DB kapalıyken
 * `Can't reach database server` ile kırılıyordu. Derlemeyi çalışan bir altyapıya
 * bağlamak BULGU-002'nin nöbet tuttuğu tam durumdur.
 *
 * İkinci ve daha sinsi sorun: ön-render, içeriğin DERLEME ANINDAKİ hâlini
 * dondurur. Panelden yeni bir proje yayımlandığında besleme yeniden dağıtım
 * yapılana kadar eski kalırdı — üstelik sessizce.
 *
 * ISR (`export const revalidate`) BU SORUNU ÇÖZMEZ: ÖLÇÜLDÜ — `revalidate = 3600`
 * ile de ilk sürüm derlemede üretiliyor ve build aynı hatayla kırılıyor.
 *
 * MALİYET DÜŞÜK: veri okuması `unstable_cache` ile önbellekli (ADR-011), yani
 * "her istekte üretilir" DEMEK "her istekte veritabanına gidilir" DEMEK DEĞİL.
 * İstek başına yapılan iş, önbellekten okunan listeyi XML'e çevirmektir.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const [posts, profile] = await Promise.all([getPublishedPosts(), getProfile()]);

  const body = buildRssFeed(
    {
      title: profile.headline,
      description: profile.subtitle ?? profile.headline,
      link: absoluteUrl('/'),
      feedUrl: absoluteUrl('/rss.xml'),
      language: 'tr',
    },
    posts.map((post) => ({
      title: post.title,
      link: absoluteUrl(`/blog/${post.slug}`),
      guid: absoluteUrl(`/blog/${post.slug}`),
      description: post.excerpt,
      publishedAt: post.publishedAt,
    })),
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Okuyucular sık yoklar; besleme içeriği zaten önbellekli servislerden.
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
