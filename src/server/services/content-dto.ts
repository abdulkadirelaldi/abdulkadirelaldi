import type { Socials } from '@/lib/schemas';
import type { ContentStatus, ExperienceType, SkillCategory } from '@/types';

import type { AppDay } from './_shared';

/**
 * İçerik DTO sözleşmesi — ADR-026 "sözleşme-önce".
 *
 * BU DOSYA FRONTEND'İN TEK KAYNAĞI. T-021'in fixture'ı BU TİPLERDEN TÜRETİLİR;
 * elle yazılmış bir kopya olamaz (ADR-026'nın tek kırılgan noktası bu — fixture
 * tipten saparsa servisler gelince değişim mekanik olmaz).
 *
 * Frontend `import type` kullanmalı: tipler derlemede silinir, sunucu modülleri
 * istemci paketine sızmaz.
 *
 * TASARIM KURALLARI (T-015 konvansiyonu):
 *   - `Decimal` YOK. Bu modellerde para alanı da yok; yine de Prisma satırı
 *     dışarı ham çıkmaz, her servis `toDto()` yazar.
 *   - `@db.Date` alanları `AppDay` (`'YYYY-MM-DD'`) olarak çıkar (ADR-016).
 *   - An bildiren alanlar (`publishedAt`) ISO 8601 dize.
 *   - Kapak/galeri görselleri `AttachmentRefDto` — **`url` YOK** (ADR-018).
 */

/* ===========================================================================
 * ORTAK
 * ======================================================================== */

/**
 * Bir R2 nesnesine referans — ADR-018.
 *
 * `url` ALANI YOKTUR ve gelmeyecektir. §8.11 private bucket + 15 dk imzalı URL
 * istiyor; kalıcı URL ya bayat olurdu ya da bucket'ın public olduğu anlamına
 * gelirdi. İmzalı URL **istek anında** `key`den üretilir — üretici T-037'de gelecek.
 *
 * `width`/`height` DTO'da BİLEREK var: Frontend `next/image` ile CLS'i ancak
 * boyutu bilerek önleyebilir (§5.2.3, K1 hedefi CLS < 0.05).
 */
export interface AttachmentRefDto {
  id: string;
  /** R2 nesne anahtarı. İmzalı URL bundan üretilir (T-037). */
  key: string;
  mime: string;
  /** Görsel değilse (örn. PDF) `null`. */
  width: number | null;
  height: number | null;
}

/**
 * Slug ile tekil içerik araması — ADR-019'un 404/410 ayrımı.
 *
 * `ARCHIVED` içerik listelerde YOKTUR ama slug'ı KORUNUR ve **410 Gone** döner;
 * hiç var olmamış bir slug **404** döner. İkisini `null` ile temsil etmek bu
 * ayrımı imkânsız kılardı — SEO açısından "kalıcı olarak kaldırıldı" ile
 * "bulunamadı, belki gelir" farklı şeyler.
 */
export type ContentLookup<T> =
  | { state: 'FOUND'; data: T }
  /** `ARCHIVED` — sayfa 410 döndürmeli. */
  | { state: 'GONE' }
  /** Kayıt yok, ya da `DRAFT`/`SCHEDULED` (public'e görünmez) — 404. */
  | { state: 'NOT_FOUND' };

/** Sayfalanmış liste sonucu. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

/* ===========================================================================
 * PROFILE — tekil (ADR-017)
 * ======================================================================== */

export interface ProfileDto {
  id: string;
  locale: string;
  headline: string;
  subtitle: string | null;
  bio: string;
  location: string | null;
  availability: string | null;
  /** T-011'deki `socialsSchema` şekli. Doğrulanmamışsa `null`. */
  socials: Socials | null;
  avatar: AttachmentRefDto | null;
  cv: AttachmentRefDto | null;
}

/* ===========================================================================
 * SKILL
 * ======================================================================== */

export interface SkillDto {
  id: string;
  locale: string;
  name: string;
  category: SkillCategory;
  /** 0–100. */
  level: number;
  iconKey: string | null;
  order: number;
}

/* ===========================================================================
 * SERVICE
 * ======================================================================== */

export interface ServiceDto {
  id: string;
  locale: string;
  title: string;
  description: string;
  iconKey: string | null;
  /** §1.A / K4 — Kıyı Medya'ya yönlendiren CTA. */
  ctaUrl: string | null;
  order: number;
}

/* ===========================================================================
 * EXPERIENCE
 * ======================================================================== */

export interface ExperienceDto {
  id: string;
  locale: string;
  organization: string;
  role: string;
  type: ExperienceType;
  /** `@db.Date` → gün dizesi (ADR-016). */
  startDate: AppDay;
  endDate: AppDay | null;
  current: boolean;
  description: string | null;
  order: number;
}

/* ===========================================================================
 * PROJECT
 *
 * LİSTE ve DETAY ayrı: liste MDX içeriğini ve galeriyi ÇEKMEZ. Tek DTO
 * olsaydı 20 projelik bir ızgara 20 MDX gövdesi taşırdı — K1'in LCP hedefine
 * doğrudan çarpar.
 * ======================================================================== */

export interface ProjectListItemDto {
  id: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  cover: AttachmentRefDto | null;
  tags: string[];
  stack: string[];
  featured: boolean;
  order: number;
  /** ISO 8601. `PUBLISHED` içerikte daima dolu. */
  publishedAt: string | null;
}

export interface ProjectDto extends ProjectListItemDto {
  /** MDX kaynağı. Render sırasında `rehype-sanitize`'dan geçer (§8.9). */
  content: string;
  liveUrl: string | null;
  repoUrl: string | null;
  clientName: string | null;
  /** Polimorfik `Attachment` ilişkisi, `order` ile sıralı (ADR-018). */
  gallery: AttachmentRefDto[];
}

/* ===========================================================================
 * POST
 * ======================================================================== */

export interface PostListItemDto {
  id: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: AttachmentRefDto | null;
  tags: string[];
  /** T-015'in hesaplayıcısından; en az 1 (ADR-019). */
  readingMinutes: number;
  publishedAt: string | null;
}

export interface PostDto extends PostListItemDto {
  /** MDX kaynağı (§8.9 sanitize render'da). */
  content: string;
}

/* ===========================================================================
 * SITEMAP
 * ======================================================================== */

/**
 * Sitemap girdisi — T-028.
 *
 * Liste DTO'larından AYRI tutuldu: sitemap'in `lastModified` için `updatedAt`'e
 * ihtiyacı var, ama `updatedAt` public liste DTO'larında YOK ve olmamalı
 * (sayfada gösterilmiyor, DTO'yu şişirir). Tersine sitemap'in başlığa,
 * özete, kapağa ihtiyacı yok. İki ayrı projeksiyon, iki ayrı sorgu.
 */
export interface SitemapEntryDto {
  slug: string;
  /** `Project.updatedAt` / `Post.updatedAt` — ISO 8601. */
  updatedAt: string;
}

/* ===========================================================================
 * ORTAK FİLTRE
 * ======================================================================== */

/** Public okumaların ortak parametreleri. */
export interface PublicQuery {
  /** ADR-019 — varsayılan `'tr'`. */
  locale?: string;
  /** Yayın penceresi karşılaştırması için "şimdi". Test edilebilirlik amacıyla. */
  now?: Date;
}

/** İçerik durumu — yalnızca panel tarafı görür; public DTO'larda YER ALMAZ. */
export type { ContentStatus };

/**
 * Türetilmiş site istatistikleri — ADR-027.
 *
 * Tanım `_shared/stats.ts` içinde (hesap mantığıyla birlikte durması için) ama
 * Frontend'in TEK KAYNAĞI bu dosyadır — T-023 haklı olarak buradan ihraç
 * edilmediğini bildirdi. `import type` derlemede silindiği için sızıntı yoktu,
 * ama iki farklı import yolu olması sözleşmenin tek kaynak olma niteliğini
 * bozuyordu.
 */
export type { SiteStatsDto } from './_shared/stats';
