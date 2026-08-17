import type { MetadataRoute } from 'next';

import { absoluteUrl, getPostSitemapEntries, getProjectSitemapEntries } from '@/server/services';

/**
 * sitemap.xml — §4.1.
 *
 * YALNIZCA YAYINDAKİ İÇERİK. `getXSitemapEntries` servisleri `publishedWhere`
 * kullanır, dolayısıyla `DRAFT`, `SCHEDULED` ve ileri tarihli `PUBLISHED`
 * kayıtlar sızmaz.
 *
 * `ARCHIVED` DE YOK ve bu bilinçli: slug'ı korunuyor ama sayfa 410 dönüyor
 * (ADR-019). Sitemap "bu URL'yi tara" demektir; sunucunun aynı URL'de "kalıcı
 * olarak gitti" demesi çelişkili bir sinyaldir ve tarama bütçesini boşa harcar.
 *
 * Statik rotalar ELLE listeleniyor. Dosya sistemini taramak daha "akıllı"
 * görünürdü ama `(public)` altındaki her yeni dosyayı — hata sayfası, yükleme
 * durumu, panel parçaları — otomatik olarak sitemap'e sokma riski taşırdı.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([
    getProjectSitemapEntries(),
    getPostSitemapEntries(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/hakkimda'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/projeler'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/iletisim'), changeFrequency: 'yearly', priority: 0.5 },
    { url: absoluteUrl('/cv'), changeFrequency: 'monthly', priority: 0.6 },
  ];

  return [
    ...staticRoutes,
    ...projects.map((entry) => ({
      url: absoluteUrl(`/projeler/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...posts.map((entry) => ({
      url: absoluteUrl(`/blog/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
