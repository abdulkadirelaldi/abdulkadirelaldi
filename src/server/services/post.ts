import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import {
  ATTACHMENT_SELECT,
  calculateReadingMinutes,
  DEFAULT_LOCALE,
  publishedWhere,
  toAttachmentRef,
  type AttachmentRow} from './_shared';
import type { ContentLookup, PostDto, PostListItemDto } from './content-dto';

/** `Post` servisi — §4.1 /blog, ADR-019. */

export type PostClient = Pick<PrismaClient, 'post'>;

interface PostListRow {
  id: string;
  locale: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: AttachmentRow | null;
  tags: string[];
  readingMinutes: number;
  publishedAt: Date | null;
}

/** LİSTE seçimi — `content` YOK. */
const LIST_SELECT = {
  id: true,
  locale: true,
  slug: true,
  title: true,
  excerpt: true,
  tags: true,
  readingMinutes: true,
  publishedAt: true,
  cover: { select: ATTACHMENT_SELECT },
} as const;

const DETAIL_SELECT = { ...LIST_SELECT, status: true, content: true } as const;

function toListDto(row: PostListRow): PostListItemDto {
  return {
    id: row.id,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover: toAttachmentRef(row.cover),
    tags: row.tags,
    /**
     * Saklanan değer sıfır veya bozuksa T-015'in hesaplayıcısı devreye giremez
     * (liste `content` çekmiyor); en az 1 garanti edilir — "0 dakika okuma"
     * anlamsız bir etikettir (ADR-019).
     */
    readingMinutes: Math.max(1, row.readingMinutes),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

export interface PostListParams {
  locale?: string;
  tag?: string;
  now?: Date;
}

/**
 * YAYINDAKİ yazılar — en yeni önce.
 *
 * `publishedWhere` `SCHEDULED` ve ileri tarihli kayıtları eler (ADR-019).
 * Boş durumda BOŞ DİZİ.
 */
export async function fetchPublishedPosts(
  params: PostListParams = {},
  client: PostClient = db,
): Promise<PostListItemDto[]> {
  const now = params.now ?? new Date();

  const rows = await client.post.findMany({
    where: {
      locale: params.locale ?? DEFAULT_LOCALE,
      ...publishedWhere(now),
      ...(params.tag ? { tags: { has: params.tag } } : {}),
    },
    select: LIST_SELECT,
    orderBy: [{ publishedAt: 'desc' }],
  });

  return rows.map(toListDto);
}

/**
 * Slug ile tek yazı — 404 / 410 ayrımı (ADR-019).
 *
 * `readingMinutes` BURADA YENİDEN HESAPLANIR: detayda `content` zaten elimizde
 * ve saklanan değer bayat olabilir (içerik panelden düzenlenip alan
 * güncellenmemiş olabilir). Hesaplayıcı T-015'in fonksiyonu — seed'deki geçici
 * tahmin oraya devredilmişti; burada da aynı kaynak kullanılıyor.
 */
export async function fetchPostBySlug(
  slug: string,
  params: { locale?: string; now?: Date } = {},
  client: PostClient = db,
): Promise<ContentLookup<PostDto>> {
  const locale = params.locale ?? DEFAULT_LOCALE;
  const now = params.now ?? new Date();

  const row = await client.post.findUnique({
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
      readingMinutes: calculateReadingMinutes(row.content),
      content: row.content,
    },
  };
}
