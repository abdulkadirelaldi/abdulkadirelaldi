import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import {
  ATTACHMENT_SELECT,
  DEFAULT_LOCALE,
  publishedWhere,
  toAttachmentRef,
  type AttachmentRow,
} from './_shared';
import type { ContentLookup, ProjectDto, ProjectListItemDto, SitemapEntryDto } from './content-dto';

/** `Project` servisi — §4.1 /projeler, ADR-018/019. */

interface ProjectListRow {
  id: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  cover: AttachmentRow | null;
  tags: string[];
  stack: string[];
  featured: boolean;
  order: number;
  publishedAt: Date | null;
}

export type ProjectClient = Pick<PrismaClient, 'project' | 'attachment'>;

/** LİSTE seçimi — `content` ve galeri YOK (K1/LCP: 20 proje 20 MDX taşımasın). */
const LIST_SELECT = {
  id: true,
  locale: true,
  slug: true,
  title: true,
  summary: true,
  tags: true,
  stack: true,
  featured: true,
  order: true,
  publishedAt: true,
  cover: { select: ATTACHMENT_SELECT },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  status: true,
  content: true,
  liveUrl: true,
  repoUrl: true,
  clientName: true,
} as const;

function toListDto(row: ProjectListRow): ProjectListItemDto {
  return {
    id: row.id,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    cover: toAttachmentRef(row.cover),
    tags: row.tags,
    stack: row.stack,
    featured: row.featured,
    order: row.order,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export interface ProjectListParams {
  locale?: string;
  /** Tek etikete göre süz (§4.1 filtre). */
  tag?: string;
  /** Tek teknolojiye göre süz. */
  stack?: string;
  /** Yalnızca öne çıkanlar — ana sayfa bölümü. */
  featuredOnly?: boolean;
  now?: Date;
}

/**
 * YAYINDAKİ projeler.
 *
 * `publishedWhere` iki koşulu birden uygular: `PUBLISHED` **ve**
 * `publishedAt <= now`. `SCHEDULED` ve ileri tarihli kayıtlar SIZMAZ (ADR-019).
 * `ARCHIVED` de doğal olarak dışarıda kalır — listelerde görünmemeli.
 *
 * Boş durumda BOŞ DİZİ.
 */
export async function fetchPublishedProjects(
  params: ProjectListParams = {},
  client: ProjectClient = db,
): Promise<ProjectListItemDto[]> {
  const now = params.now ?? new Date();

  const rows = await client.project.findMany({
    where: {
      locale: params.locale ?? DEFAULT_LOCALE,
      ...publishedWhere(now),
      ...(params.tag ? { tags: { has: params.tag } } : {}),
      ...(params.stack ? { stack: { has: params.stack } } : {}),
      ...(params.featuredOnly ? { featured: true } : {}),
    },
    select: LIST_SELECT,
    orderBy: [{ featured: 'desc' }, { order: 'asc' }, { publishedAt: 'desc' }],
  });

  return rows.map(toListDto);
}

/** Bir projenin galerisi — polimorfik `Attachment`, `order` ile sıralı (ADR-018). */
export async function fetchProjectGallery(
  projectId: string,
  client: ProjectClient = db,
): Promise<ProjectDto['gallery']> {
  const rows = await client.attachment.findMany({
    where: { entity: 'PROJECT', entityId: projectId },
    select: ATTACHMENT_SELECT,
    orderBy: [{ order: 'asc' }],
  });

  return rows
    .map((row) => toAttachmentRef(row))
    .filter((ref): ref is NonNullable<typeof ref> => ref !== null);
}

/**
 * Slug ile tek proje — 404 / 410 ayrımı yapar (ADR-019).
 *
 * `ARCHIVED` kayıt `GONE` döner: slug korunur ve sayfa **410** verir. Hiç var
 * olmamış bir slug `NOT_FOUND` → **404**. `DRAFT`/`SCHEDULED` de `NOT_FOUND` —
 * yayınlanmamış içeriğin varlığını sızdırmamak için "gone" DEĞİL.
 */
export async function fetchProjectBySlug(
  slug: string,
  params: { locale?: string; now?: Date } = {},
  client: ProjectClient = db,
): Promise<ContentLookup<ProjectDto>> {
  const locale = params.locale ?? DEFAULT_LOCALE;
  const now = params.now ?? new Date();

  const row = await client.project.findUnique({
    where: { slug_locale: { slug, locale } },
    select: DETAIL_SELECT,
  });

  if (!row) return { state: 'NOT_FOUND' };
  if (row.status === 'ARCHIVED') return { state: 'GONE' };

  const isPublished =
    row.status === 'PUBLISHED' && row.publishedAt !== null && row.publishedAt <= now;
  if (!isPublished) return { state: 'NOT_FOUND' };

  return {
    state: 'FOUND',
    data: {
      ...toListDto(row),
      content: row.content,
      liveUrl: row.liveUrl,
      repoUrl: row.repoUrl,
      clientName: row.clientName,
      gallery: await fetchProjectGallery(row.id, client),
    },
  };
}

/**
 * Yayındaki proje listesini BELLEKTE süzer — T-030d/K2.
 *
 * Sorguyu tekrar çalıştırmak yerine ZATEN ÖNBELLEKTEKİ tam listeyi süzüyoruz.
 * Gerekçe `cached.ts`'teki `getFilteredProjects` yorumunda; özeti: `tag` URL'den
 * gelir, yani kullanıcı kontrollüdür ve her kombinasyonu ayrı bir önbellek
 * girdisine yazmak SINIRSIZ anahtar uzayı yaratır.
 *
 * `tags`/`stack` karşılaştırması Prisma'nın `has` semantiğiyle aynı: TAM eşleşme,
 * büyük/küçük harf duyarlı. Farklı davransaydı önbellekli ve önbelleksiz yollar
 * farklı sonuç verirdi — sessiz tutarsızlık.
 */
export function filterProjectList(
  items: ProjectListItemDto[],
  filters: { tag?: string; stack?: string; featuredOnly?: boolean } = {},
): ProjectListItemDto[] {
  return items.filter(
    (item) =>
      (filters.tag === undefined || item.tags.includes(filters.tag)) &&
      (filters.stack === undefined || item.stack.includes(filters.stack)) &&
      (filters.featuredOnly !== true || item.featured),
  );
}

/**
 * Sitemap girdileri — yalnızca `slug` + `updatedAt`.
 *
 * `publishedWhere` aynı iki koşulu uygular, bu yüzden `SCHEDULED`, ileri
 * tarihli `PUBLISHED` ve `ARCHIVED` kayıtlar SIZMAZ. `ARCHIVED`'ın dışarıda
 * kalması özellikle önemli: slug'ı korunuyor ve 410 dönüyor (ADR-019); 410
 * dönen bir URL'yi sitemap'e koymak arama motoruna "bunu tara" derken sunucunun
 * "kalıcı olarak gitti" demesi anlamına gelir — çelişkili sinyal.
 */
export async function fetchProjectSitemapEntries(
  params: { locale?: string; now?: Date } = {},
  client: ProjectClient = db,
): Promise<SitemapEntryDto[]> {
  const rows = await client.project.findMany({
    where: { locale: params.locale ?? DEFAULT_LOCALE, ...publishedWhere(params.now ?? new Date()) },
    select: { slug: true, updatedAt: true },
    orderBy: [{ updatedAt: 'desc' }],
  });
  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() }));
}
