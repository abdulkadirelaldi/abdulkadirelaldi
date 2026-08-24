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
 *   T-025 → `/blog` + yazı akışı  ✅ AÇILDI (T-028d)
 *   T-026 → `/iletisim`            ⛔ HÂLÂ KAPALI — rota yazılmadı
 */
/**
 * İSTEK ZAMANINDA ÜRETİLİR — DERLEMEDE DEĞİL (BULGU-017).
 *
 * Bu satır olmadan Next bu rotayı ön-render eder ve `getProjectSitemapEntries`
 * DERLEME SIRASINDA veritabanına gider. Sonuç ölçüldü: `pnpm build` yalnızca
 * `DATABASE_URL` değil, ERİŞİLEBİLİR BİR VERİTABANI istiyordu — DB kapalıyken
 * `Can't reach database server` ile kırılıyordu. Derlemeyi çalışan bir altyapıya
 * bağlamak BULGU-002'nin nöbet tuttuğu tam durumdur.
 *
 * İkinci ve daha sinsi sorun: ön-render, içeriğin DERLEME ANINDAKİ hâlini
 * dondurur. Panelden yeni bir proje yayımlandığında sitemap yeniden dağıtım
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts] = await Promise.all([
    getProjectSitemapEntries(),
    getPostSitemapEntries(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/hakkimda'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/projeler'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/cv'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.9 },
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
    ...posts.map((entry) => ({
      url: absoluteUrl(`/blog/${entry.slug}`),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
