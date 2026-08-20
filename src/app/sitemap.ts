import type { MetadataRoute } from 'next';

import { absoluteUrl, getProjectSitemapEntries } from '@/server/services';

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
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KURAL (§4.1) — BİR ROTA, YAYINA GİRDİĞİ TURDA EKLENİR. ÖNCEDEN DEĞİL.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BULGU-016: bu liste `/blog` ve `/iletisim` bildiriyordu, ama o rotalar henüz
 * yazılmamıştı (T-025/T-026). Var olmayan adres bildirmek arama motoruna KIRIK
 * BAĞLANTI sinyali verir ve tarama bütçesi harcar — sitemap kamuya yapılan bir
 * beyandır, niyet listesi değil. Aynı dürüstlük kuralı `NavItem.hazir` ve
 * "Yakında" kartlarında da geçerli.
 *
 * Bu, `ARCHIVED` içeriği dışarıda tutma gerekçesinin aynısı: orada sunucu 410
 * derken sitemap "tara" diyordu, burada sunucu 404 derken sitemap "tara" diyor.
 * İki yönlü tek kural: SİTEMAP YALNIZCA 200 DÖNEN ADRESLERİ BİLDİRİR.
 *
 * EKLEME SIRASI — rota yayına girdiğinde:
 *   T-025 → `/blog` statik listeye + yazı akışı (aşağıdaki yorumlu blok)
 *   T-026 → `/iletisim` statik listeye
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjectSitemapEntries();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/hakkimda'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/projeler'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/cv'), changeFrequency: 'monthly', priority: 0.6 },
    // T-025: { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.9 },
    // T-026: { url: absoluteUrl('/iletisim'), changeFrequency: 'yearly', priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...projects.map((entry) => ({
      url: absoluteUrl(`/projeler/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    /**
     * YAZI AKIŞI T-025'TE AÇILACAK. `/blog/[slug]` rotası henüz yok; yayınlanmış
     * yazıları bildirmek 404 üretiyordu (BULGU-016). Okuma servisi
     * (`getPostSitemapEntries`) YERİNDE BIRAKILDI ve testleri duruyor —
     * T-025'te tek satırla geri açılacak:
     *
     *   ...posts.map((entry) => ({
     *     url: absoluteUrl(`/blog/${entry.slug}`),
     *     lastModified: new Date(entry.updatedAt),
     *     changeFrequency: 'monthly' as const,
     *     priority: 0.7,
     *   })),
     */
  ];
}
