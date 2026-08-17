import { absoluteUrl, buildRssFeed, getProfile, getPublishedPosts } from '@/server/services';

/**
 * /rss.xml — §4.1.
 *
 * Node runtime (Next 15 varsayılanı): servisler Prisma kullanıyor ve Prisma
 * Edge'de yüklenemez (T-014/K1). Bu rota veri okuduğu için Edge'e ALINMAMALI.
 *
 * Yalnızca yayınlanmış yazılar: `getPublishedPosts` yayın penceresini uygular.
 */
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
