import { cachedRead, entityTag, localeTag, slugTag } from './_shared/content-cache';
import { DEFAULT_LOCALE } from './_shared/content-query';
import { fetchExperience } from './experience';
import type { PostListItemDto, ProjectListItemDto, SitemapEntryDto } from './content-dto';
import {
  fetchPostBySlug,
  fetchPostSitemapEntries,
  fetchPublishedPosts,
  filterPostList,
} from './post';
import { fetchProfile } from './profile';
import {
  fetchProjectBySlug,
  fetchProjectSitemapEntries,
  fetchPublishedProjects,
  filterProjectList,
} from './project';
import { fetchServices } from './service';
import { fetchSkills } from './skill';
import { fetchSiteStats } from './stats';

/**
 * ÖNBELLEK KATMANI — public sayfaların çağırdığı okumalar (ADR-011).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA NEDEN AYRI — BULGU-012
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `next/cache` YALNIZCA Next çalışma zamanında çözülebilir. Düz Node ile koşan
 * bir betik (seed, §13.5 cron işleri) onu içe aktaran bir modüle DOLAYLI olarak
 * bile dokunursa `ERR_MODULE_NOT_FOUND` ile ölür — betiğin kendisi önbellekle
 * hiç ilgilenmiyor olsa bile.
 *
 * T-030'da `cachedRead` her servis dosyasının İÇİNDEYDİ. Sonuç: `project.ts`,
 * `post.ts`, `stats.ts` ve diğerleri Next'e bağlıydı; onları içe aktaran hiçbir
 * betik düz Node'da koşamazdı. §7.4 "tüm DB erişimi servislerde" kuralıyla
 * "cron düz Node'da koşar" gerçeği doğrudan çatışıyordu.
 *
 * ŞİMDİ: `services/**` altındaki HER modül çalışma zamanından bağımsız —
 * TEK İSTİSNA bu dosya ve `_shared/content-cache.ts`. Bir cron betiği
 * `fetchPublishedProjects`'i güvenle içe aktarır; `getPublishedProjects`'i
 * içe aktaramaz, ki zaten istemez (cron'un önbelleği yoktur).
 *
 * Kural `tests/unit/services/runtime-bagimsizligi.test.ts` ile ZORLANIYOR:
 * saf tarafa `next/*` bağımlılığı sızarsa test kırılır. Yorum değil, kapı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ETİKETLER: her okuma, kendisini düşürebilecek TÜM etiketleri taşır. Eşleşme
 * tam dizedir (ADR-029), önek değil — eksik bırakılan etiket, geçersizleştirmesi
 * imkânsız bir önbellek girdisi bırakır.
 */

/* ===========================================================================
 * PROFILE / SKILL / SERVICE / EXPERIENCE
 * ======================================================================== */

export const getProfile = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchProfile(locale),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['profile', locale],
    tags: [entityTag('profile'), localeTag('profile', locale)],
  }),
);

export const getSkills = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchSkills(locale),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['skills', locale],
    tags: [entityTag('skill'), localeTag('skill', locale)],
  }),
);

export const getServices = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchServices(locale),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['services', locale],
    tags: [entityTag('service'), localeTag('service', locale)],
  }),
);

export const getExperience = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchExperience({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['experience', locale],
    tags: [entityTag('experience'), localeTag('experience', locale)],
  }),
);

/* ===========================================================================
 * PROJECT
 * ======================================================================== */

export const getPublishedProjects = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchPublishedProjects({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['projects', locale],
    tags: [entityTag('project'), localeTag('project', locale)],
  }),
);

/** Ana sayfa bölümü — `featured` işaretli projeler. */
export const getFeaturedProjects = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchPublishedProjects({ locale, featuredOnly: true }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['projects', 'featured', locale],
    tags: [entityTag('project'), localeTag('project', locale)],
  }),
);

/**
 * Slug bazlı önbellek.
 *
 * Etiketlere `slugTag` de eklenir: F3'te tek bir projenin düzenlenmesi yalnızca
 * o kaydın girdisini düşürebilsin diye. Liste etiketi de taşınır, çünkü etiket
 * eşleşmesi tam dizedir (ADR-029).
 */
export const getProjectBySlug = cachedRead(
  (slug: string, locale: string = DEFAULT_LOCALE) => fetchProjectBySlug(slug, { locale }),
  (slug, locale = DEFAULT_LOCALE) => ({
    keyParts: ['project', locale, slug],
    tags: [entityTag('project'), localeTag('project', locale), slugTag('project', locale, slug)],
  }),
);

/**
 * Etiket / teknoloji ile süzülmüş proje listesi — T-030d/K2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI ÖNBELLEK GİRDİSİ DEĞİL — SINIRSIZ ANAHTAR UZAYI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-030'un K4'ü filtreli okumaları önbelleğe almamıştı, gerekçe yanlıştı ve
 * T-030b'de düzeltildi (anahtar argümanları İÇERİYOR). Ama doğru gerekçe
 * ölçümle ortaya çıktı: `tag` ve `stack` URL parametresinden gelir, yani
 * KULLANICI KONTROLLÜDÜR. Her filtre değerini `cachedRead`'e vermek, ziyaretçinin
 * `?tag=<rastgele>` ile istediği kadar önbellek girdisi ÜRETTİREBİLMESİ demekti —
 * disk dolar, girdilerin çoğu bir kez okunup bir daha kullanılmaz.
 *
 * Bunun yerine ZATEN ÖNBELLEKTEKİ tam liste süzülüyor:
 *   - Yeni önbellek girdisi YOK, dolayısıyla sınırsız anahtar uzayı da yok.
 *   - Yeni ETİKET de yok: girdi `getPublishedProjects`'in girdisi, F3'ün
 *     `revalidateTag(localeTag('project', locale))` çağrısı zaten düşürüyor.
 *   - Filtreli görünüm artık veritabanına HİÇ GİTMİYOR (önceden her filtre bir
 *     sorguydu) — yani asıl kazanç, girdi başına önbellekten daha büyük.
 *
 * ÖLÇÜLDÜ (seed, ADR-030): 11 farklı etiket, 5 teknoloji, 6 proje. Liste DTO'su
 * MDX içermiyor (T-030/K3), bu yüzden tam listeyi bellekte tutmak ucuz.
 * Katalog büyürse (birkaç yüz kayıt) bu tercih yeniden değerlendirilmeli —
 * eşik, tam listenin tek istekte taşınmasının pahalılaştığı noktadır.
 *
 * Süzme mantığı `project.ts`'te SAF fonksiyon olarak duruyor: Next'e bağlı
 * olmadığı için kapı testinin saf tarafında kalıyor ve DB'siz sınanabiliyor.
 */
export async function getFilteredProjects(
  filters: { tag?: string; stack?: string; featuredOnly?: boolean } = {},
  locale: string = DEFAULT_LOCALE,
): Promise<ProjectListItemDto[]> {
  return filterProjectList(await getPublishedProjects(locale), filters);
}

/* ===========================================================================
 * POST
 * ======================================================================== */

export const getPublishedPosts = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchPublishedPosts({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['posts', locale],
    tags: [entityTag('post'), localeTag('post', locale)],
  }),
);

/** `slug` anahtara açıkça konur — bkz. `getProjectBySlug`. */
export const getPostBySlug = cachedRead(
  (slug: string, locale: string = DEFAULT_LOCALE) => fetchPostBySlug(slug, { locale }),
  (slug, locale = DEFAULT_LOCALE) => ({
    keyParts: ['post', locale, slug],
    tags: [entityTag('post'), localeTag('post', locale), slugTag('post', locale, slug)],
  }),
);

/** Etiketle süzülmüş yazı listesi — gerekçe `getFilteredProjects`'te. */
export async function getFilteredPosts(
  filters: { tag?: string } = {},
  locale: string = DEFAULT_LOCALE,
): Promise<PostListItemDto[]> {
  return filterPostList(await getPublishedPosts(locale), filters);
}

/* ===========================================================================
 * İSTATİSTİK — ADR-027
 * ======================================================================== */

/**
 * ETİKETLER: istatistik İKİ varlıktan türüyor, bu yüzden her ikisinin de
 * etiketlerini taşır. Yalnızca proje etiketlerini taşısaydı yeni bir
 * `Experience` eklendiğinde deneyim yılı bir saat boyunca eski kalırdı.
 *
 * F3 İÇİN KRİTİK: bir projenin DURUMU değiştiğinde (DRAFT → PUBLISHED veya
 * → ARCHIVED) sayı değişir. Durum değişikliği zaten listeyi de değiştirdiği
 * için `localeTag('project', locale)` düşürülmelidir — yalnızca `slugTag`
 * düşürmek istatistiği BAYAT BIRAKIR.
 *
 * `now` ÖNBELLEK ANAHTARINA GİRMEZ: her istekte farklı olurdu ve önbellek hiç
 * tutmazdı. Bu, ileri tarihli bir projenin yayına girmesinin en fazla
 * `CONTENT_REVALIDATE_SECONDS` gecikmesi demek — ADR-019'un `SCHEDULED` için
 * kabul ettiği gecikmenin aynısı.
 */
export const getSiteStats = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchSiteStats({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['site-stats', locale],
    tags: [
      entityTag('project'),
      localeTag('project', locale),
      entityTag('experience'),
      localeTag('experience', locale),
    ],
  }),
);

/* ===========================================================================
 * SITEMAP — T-028
 * ======================================================================== */

/**
 * Sitemap girdileri.
 *
 * YENİ ETİKET YOK: sitemap `Project` verisinden türüyor, dolayısıyla o varlığın
 * mevcut etiketlerini taşır. F3'ün bir proje eklediğinde/düzenlediğinde zaten
 * düşürdüğü `content:project:<locale>` bu girdiyi de düşürür — Server
 * Action'larda hiçbir değişiklik gerekmiyor.
 *
 * Ayrı `keyParts` kullanılıyor çünkü projeksiyon farklı (slug + updatedAt),
 * liste girdisiyle aynı anahtarı paylaşamaz.
 */
export const getProjectSitemapEntries: (locale?: string) => Promise<SitemapEntryDto[]> = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchProjectSitemapEntries({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['sitemap', 'projects', locale],
    tags: [entityTag('project'), localeTag('project', locale)],
  }),
);

/** Bkz. `getProjectSitemapEntries` — yeni etiket yok. */
export const getPostSitemapEntries: (locale?: string) => Promise<SitemapEntryDto[]> = cachedRead(
  (locale: string = DEFAULT_LOCALE) => fetchPostSitemapEntries({ locale }),
  (locale = DEFAULT_LOCALE) => ({
    keyParts: ['sitemap', 'posts', locale],
    tags: [entityTag('post'), localeTag('post', locale)],
  }),
);
