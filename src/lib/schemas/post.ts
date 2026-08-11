import * as z from 'zod';

import { ContentStatus } from '@/types';

import {
  cuidSchema,
  instantSchema,
  localeSchema,
  longTextSchema,
  mediumTextSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
  slugSchema,
  tagsSchema,
} from './common';

/**
 * `Post` — blog yazısı (§4.1 /blog).
 *
 * `viewCount` BU ŞEMADA YOKTUR (ADR-019): sütun olarak tutulmuyor, sayaç F3'te
 * ayrı bir modele taşınacak. `readingMinutes` de istemciden ALINMAZ — içerikten
 * hesaplanır (T-015, §9 gereği birim testi yazılacak fonksiyonlardan biri).
 */
const postBase = z.object({
  locale: localeSchema,
  slug: slugSchema,
  title: shortTextSchema.min(1, { error: 'Başlık zorunludur.' }),
  excerpt: mediumTextSchema.min(1, { error: 'Özet zorunludur.' }),
  content: longTextSchema.min(1, { error: 'İçerik zorunludur.' }),
  coverAttachmentId: cuidSchema.optional(),
  tags: tagsSchema,
  status: z.enum(ContentStatus, { error: 'Geçersiz yayın durumu.' }).default('DRAFT'),
  publishedAt: instantSchema.optional(),
});

const scheduledNeedsDate = {
  error: 'İleri tarihli yayın için yayın tarihi zorunludur.',
  path: ['publishedAt'],
};

export const createPostSchema = postBase.refine(
  (value) => value.status !== 'SCHEDULED' || Boolean(value.publishedAt),
  scheduledNeedsDate,
);

export const updatePostSchema = partialWithoutDefaults(postBase)
  .extend({ id: cuidSchema })
  .refine(
    (value) => value.status !== 'SCHEDULED' || Boolean(value.publishedAt),
    scheduledNeedsDate,
  );

export const postFilterSchema = paginationSchema.extend({
  status: z.enum(ContentStatus).optional(),
  tag: z.string().trim().max(32).optional(),
  locale: z.string().optional(),
  q: searchSchema.optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostFilterInput = z.infer<typeof postFilterSchema>;
