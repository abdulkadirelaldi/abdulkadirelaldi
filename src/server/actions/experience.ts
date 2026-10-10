'use server';

import { createExperienceSchema, entityIdSchema, updateExperienceSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  createExperience,
  deleteExperience,
  findExperienceSnapshot,
  updateExperience,
} from '@/server/services/experience';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import type { ExperienceDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent, tagTargetsFor } from './tags';

/**
 * `Experience` Server Action'ları — §7.1 sırası `project.ts`'te, silme gerekçesi
 * `skill.ts`'te.
 *
 * İKİ ÇAPRAZ KURAL ŞEMADA (T-011): bitiş başlangıçtan önce olamaz, ve "devam
 * ediyor" işaretliyken bitiş tarihi olamaz. Burada YENİDEN YAZILMIYOR (§7.3);
 * `parseOrFail` ikisini de uygular ve hata `error.fields.endDate` olarak döner.
 *
 * `getSiteStats` `Experience` etiketlerini de taşır (deneyim yılı ondan
 * türüyor), yani buradaki `localeTag` düşürmesi istatistiği de tazeler.
 */

export async function createExperienceAction(raw: unknown): Promise<ApiResponse<ExperienceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createExperienceSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createExperience(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Experience',
        entityId: dto.id,
        diff: buildDiff(null, {
          organization: dto.organization,
          role: dto.role,
          startDate: dto.startDate,
        }),
      },
      db,
    );

    revalidateContent('experience', tagTargetsFor(null, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('experience:create', error);
  }
}

export async function updateExperienceAction(raw: unknown): Promise<ApiResponse<ExperienceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateExperienceSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findExperienceSnapshot(parsed.data.id);
    if (!before) return notFound('Deneyim kaydı bulunamadı.');

    const dto = await updateExperience(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Experience',
        entityId: dto.id,
        diff: buildDiff(
          {
            organization: before.organization,
            role: before.role,
            startDate: before.startDate,
            endDate: before.endDate,
            current: before.current,
          },
          {
            organization: dto.organization,
            role: dto.role,
            startDate: dto.startDate,
            endDate: dto.endDate,
            current: dto.current,
          },
        ),
      },
      db,
    );

    revalidateContent('experience', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('experience:update', error);
  }
}

/** SİLER — `diff` silinen satırın tamamını taşır (bkz. `deleteSkillAction`). */
export async function deleteExperienceAction(raw: unknown): Promise<ApiResponse<ExperienceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findExperienceSnapshot(parsed.data.id);
    if (!before) return notFound('Deneyim kaydı bulunamadı.');

    const dto = await deleteExperience(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Experience',
        entityId: dto.id,
        /* BULGU-019 — alanlar tek tek sayılıyor; gerekçe `skill.ts`'te. */
        diff: {
          deleted: {
            organization: before.organization,
            role: before.role,
            type: before.type,
            startDate: before.startDate,
            endDate: before.endDate,
            current: before.current,
            locale: before.locale,
            order: before.order,
          },
        },
      },
      db,
    );

    revalidateContent('experience', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('experience:delete', error);
  }
}
