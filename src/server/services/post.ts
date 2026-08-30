import type { CreatePostInput, UpdatePostInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';
import type { ContentStatus } from '@/types';

import {
  ATTACHMENT_SELECT,
  calculateReadingMinutes,
  DEFAULT_LOCALE,
  publishedWhere,
  toAttachmentRef,
  type AttachmentRow,
} from './_shared';
import type {
  ContentLookup,
  ContentWriteDto,
  PostDto,
  PostListItemDto,
  SitemapEntryDto,
} from './content-dto';

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
 * `readingMinutes` TEK KAYNAKTAN GELİR: `Post.readingMinutes` kolonu (T-025
 * bulgusu). Detay eskiden `calculateReadingMinutes(content)` ile YENİDEN
 * hesaplıyordu; liste ise kolonu okuyordu. İkisi ayrıştığında AYNI YAZI iki
 * sayfada iki farklı süre gösteriyordu — okuyucuya görünen, açıklanamayan bir
 * tutarsızlık. Seed'de değerler tutarlı olduğu için ölçülene kadar görünmedi.
 *
 * "Detayda içerik zaten elimizde, taze hesaplayalım" savunulabilir görünüyordu
 * ama YANLIŞ KATMANDI: bayat bir kolonu okuma tarafında maskelemek, kolonun
 * bayat kalmasını KALICI hâle getirir ve tutarsızlığı yalnızca bir sayfada
 * gizler. Doğru yer YAZMA yolu — kolon her kayıtta yeniden hesaplanmalı (F3 /
 * T-031). Okuma tarafı tek bir kaynağa bakar, düzeltmeye çalışmaz.
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
      content: row.content,
    },
  };
}

/**
 * Yayındaki yazı listesini BELLEKTE süzer — bkz. `filterProjectList`.
 */
export function filterPostList(
  items: PostListItemDto[],
  filters: { tag?: string } = {},
): PostListItemDto[] {
  return items.filter((item) => filters.tag === undefined || item.tags.includes(filters.tag));
}

/** Sitemap girdileri — bkz. `fetchProjectSitemapEntries`. */
export async function fetchPostSitemapEntries(
  params: { locale?: string; now?: Date } = {},
  client: PostClient = db,
): Promise<SitemapEntryDto[]> {
  const rows = await client.post.findMany({
    where: { locale: params.locale ?? DEFAULT_LOCALE, ...publishedWhere(params.now ?? new Date()) },
    select: { slug: true, updatedAt: true },
    orderBy: [{ updatedAt: 'desc' }],
  });
  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt.toISOString() }));
}

/* ===========================================================================
 * YAZMA YOLU — T-031
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `readingMinutes` HER YAZIMDA YENİDEN HESAPLANIR — F2 BORCU KAPANIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-025'te ölçülen kusur: liste `Post.readingMinutes` kolonunu okuyor, detay
 * ise `calculateReadingMinutes(content)` ile yeniden hesaplıyordu. İkisi
 * ayrıştığında AYNI YAZI iki sayfada iki farklı süre gösteriyordu.
 *
 * T-028d'de okuma tarafı tek kaynağa (kolon) indirildi ve doğru düzeltmenin
 * YAZMA yolunda olduğu not edildi: bayat bir kolonu okumada maskelemek,
 * kolonun bayat kalmasını KALICI hâle getirir. Borç burada kapanıyor.
 *
 * DEĞER İSTEMCİDEN ALINMAZ — ADR-014'ün `baseAmount` kuralının aynısı: türetilmiş
 * bir alan, onu türeten veriyle birlikte ve YALNIZCA sunucuda hesaplanır.
 * Yapısal güvence: `postBase` şemasında `readingMinutes` alanı HİÇ YOK, yani
 * istemci gönderse bile Zod onu düşürür (`tests/unit/services/content-write`
 * bunu ölçüyor).
 * ======================================================================== */

export interface PostSnapshot {
  id: string;
  locale: string;
  slug: string;
  title: string;
  status: ContentStatus;
  readingMinutes: number;
  publishedAt: Date | null;
}

const SNAPSHOT_SELECT = {
  id: true,
  locale: true,
  slug: true,
  title: true,
  status: true,
  readingMinutes: true,
  publishedAt: true,
} as const;

function toWriteDto(row: PostSnapshot): ContentWriteDto {
  return {
    id: row.id,
    locale: row.locale,
    slug: row.slug,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/** Bkz. `findProjectSnapshot` — ADR-029 etiketleri eski slug/locale'i ister. */
export async function findPostSnapshot(
  id: string,
  client: PostClient = db,
): Promise<PostSnapshot | null> {
  return client.post.findUnique({ where: { id }, select: SNAPSHOT_SELECT });
}

export async function createPost(
  input: CreatePostInput,
  client: PostClient = db,
): Promise<ContentWriteDto> {
  const row = await client.post.create({
    data: {
      locale: input.locale,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      coverAttachmentId: input.coverAttachmentId ?? null,
      tags: input.tags,
      status: input.status,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      // TÜRETİLMİŞ — girdiden değil içerikten.
      readingMinutes: calculateReadingMinutes(input.content),
    },
    select: SNAPSHOT_SELECT,
  });
  return toWriteDto(row);
}

/**
 * KISMİ güncelleme — bkz. `updateProject`.
 *
 * `readingMinutes` YALNIZCA `content` gönderildiğinde yeniden hesaplanır.
 * Gönderilmediğinde kolon zaten mevcut içeriğe karşılık geliyor; körü körüne
 * yeniden yazmak için içeriği ayrıca okumak gerekirdi ve sonuç aynı olurdu.
 * Yani "yalnızca başlığı düzelt" bir okuma sorgusu daha maliyeti getirmiyor.
 */
export async function updatePost(
  input: UpdatePostInput,
  client: PostClient = db,
): Promise<ContentWriteDto> {
  const { id, ...fields } = input;

  const row = await client.post.update({
    where: { id },
    data: {
      ...(fields.locale !== undefined ? { locale: fields.locale } : {}),
      ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.excerpt !== undefined ? { excerpt: fields.excerpt } : {}),
      ...(fields.coverAttachmentId !== undefined
        ? { coverAttachmentId: fields.coverAttachmentId }
        : {}),
      ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      ...(fields.publishedAt !== undefined
        ? { publishedAt: fields.publishedAt ? new Date(fields.publishedAt) : null }
        : {}),
      // İÇERİK VE SÜRE BİRLİKTE YAZILIR — ikisini ayırmak T-025'in kusurudur.
      ...(fields.content !== undefined
        ? { content: fields.content, readingMinutes: calculateReadingMinutes(fields.content) }
        : {}),
    },
    select: SNAPSHOT_SELECT,
  });
  return toWriteDto(row);
}

/** ARŞİVLER — SİLMEZ. Gerekçe `archiveProject` ile aynı (ADR-017/019). */
export async function archivePost(id: string, client: PostClient = db): Promise<ContentWriteDto> {
  const row = await client.post.update({
    where: { id },
    data: { status: 'ARCHIVED' },
    select: SNAPSHOT_SELECT,
  });
  return toWriteDto(row);
}
