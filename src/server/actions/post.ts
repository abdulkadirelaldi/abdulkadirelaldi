'use server';

import { createPostSchema, entityIdSchema, updatePostSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { archivePost, createPost, findPostSnapshot, updatePost } from '@/server/services/post';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import type { ContentWriteDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent, tagTargetsFor } from './tags';

/**
 * `Post` Server Action'ları — §7.1 sırası `project.ts`'te ayrıntılı anlatıldı.
 *
 * TEK FARK: `readingMinutes`. İSTEMCİDEN ALINMIYOR ve bu eylemlerde HİÇ
 * GEÇMİYOR — `postBase` şemasında böyle bir alan YOK, dolayısıyla istemci
 * gönderse bile Zod onu düşürür. Değer `createPost`/`updatePost` servislerinde
 * `calculateReadingMinutes(content)` ile hesaplanır (ADR-014'ün `baseAmount`
 * kuralının aynısı: türetilmiş alan yalnızca sunucuda türetilir).
 */

export async function createPostAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createPostSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createPost(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Post',
        entityId: dto.id,
        diff: buildDiff(null, {
          slug: dto.slug,
          locale: dto.locale,
          title: parsed.data.title,
          status: dto.status,
        }),
      },
      db,
    );

    // Olumsuz önbellek yüzünden ekleme de `slugTag` düşürür — bkz. `project.ts`.
    revalidateContent('post', tagTargetsFor(null, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('post:create', error);
  }
}

export async function updatePostAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updatePostSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findPostSnapshot(parsed.data.id);
    if (!before) return notFound('Yazı bulunamadı.');

    const dto = await updatePost(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Post',
        entityId: dto.id,
        diff: buildDiff(
          { slug: before.slug, locale: before.locale, title: before.title, status: before.status },
          { slug: dto.slug, locale: dto.locale, title: parsed.data.title, status: dto.status },
        ),
      },
      db,
    );

    revalidateContent('post', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('post:update', error);
  }
}

/** Arşivler — silmez. Gerekçe `archiveProjectAction` ile aynı (ADR-017/019). */
export async function archivePostAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findPostSnapshot(parsed.data.id);
    if (!before) return notFound('Yazı bulunamadı.');

    const dto = await archivePost(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'ARCHIVE',
        entity: 'Post',
        entityId: dto.id,
        diff: buildDiff({ status: before.status }, { status: dto.status }),
      },
      db,
    );

    revalidateContent('post', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('post:archive', error);
  }
}
