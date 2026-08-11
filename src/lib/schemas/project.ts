import * as z from 'zod';

import { ContentStatus } from '@/types';

import {
  cuidSchema,
  instantSchema,
  localeSchema,
  longTextSchema,
  mediumTextSchema,
  optionalUrlSchema,
  orderSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
  slugSchema,
  tagsSchema,
} from './common';

/**
 * `Project` — portföy projesi (§4.1 /projeler).
 *
 * `gallery` BU ŞEMADA YOKTUR (ADR-018): galeri, polimorfik `Attachment`
 * kayıtlarıyla (entity=PROJECT) yönetilir ve kendi uçları vardır. Kapak ise
 * gerçek FK'dir ve burada yer alır.
 */
const projectBase = z.object({
  locale: localeSchema,
  slug: slugSchema,
  title: shortTextSchema.min(1, { error: 'Başlık zorunludur.' }),
  summary: mediumTextSchema.min(1, { error: 'Özet zorunludur.' }),
  /** MDX. Çıktı `rehype-sanitize` ile temizlenir (§8.9) — sanitize RENDER anında. */
  content: longTextSchema.min(1, { error: 'İçerik zorunludur.' }),
  coverAttachmentId: cuidSchema.optional(),
  tags: tagsSchema,
  stack: tagsSchema,
  liveUrl: optionalUrlSchema.optional(),
  repoUrl: optionalUrlSchema.optional(),
  clientName: shortTextSchema.optional(),
  featured: z.boolean().default(false),
  order: orderSchema,
  status: z.enum(ContentStatus, { error: 'Geçersiz yayın durumu.' }).default('DRAFT'),
  publishedAt: instantSchema.optional(),
});

/**
 * ÇAPRAZ KURAL (ADR-019): `SCHEDULED` ileri tarihli yayın demektir; tarihi
 * olmayan bir zamanlama anlamsızdır ve içerik sessizce hiç yayınlanmaz.
 */
const scheduledNeedsDate = {
  error: 'İleri tarihli yayın için yayın tarihi zorunludur.',
  path: ['publishedAt'],
};

export const createProjectSchema = projectBase.refine(
  (value) => value.status !== 'SCHEDULED' || Boolean(value.publishedAt),
  scheduledNeedsDate,
);

export const updateProjectSchema = partialWithoutDefaults(projectBase)
  .extend({ id: cuidSchema })
  .refine(
    (value) => value.status !== 'SCHEDULED' || Boolean(value.publishedAt),
    scheduledNeedsDate,
  );

export const projectFilterSchema = paginationSchema.extend({
  status: z.enum(ContentStatus).optional(),
  tag: z.string().trim().max(32).optional(),
  stack: z.string().trim().max(32).optional(),
  featured: z.coerce.boolean().optional(),
  locale: z.string().optional(),
  q: searchSchema.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;
