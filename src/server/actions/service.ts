'use server';

import { createServiceSchema, entityIdSchema, updateServiceSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  createService,
  deleteService,
  findServiceSnapshot,
  updateService,
} from '@/server/services/service';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import type { ServiceDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent, tagTargetsFor } from './tags';

/**
 * `Service` Server Action'ları — §7.1 sırası `project.ts`'te, silme gerekçesi
 * `skill.ts`'te (aynı sınıf: slug yok, durum yok, FK bağımlısı yok).
 *
 * `ctaUrl` §1.A/K4'ün ticari yönlendirmesidir; şema `optionalUrlSchema` ile
 * bağlar, burada ayrıca kural koşulmaz (§7.3 — kural iki yerde yazılmaz).
 */

export async function createServiceAction(raw: unknown): Promise<ApiResponse<ServiceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createServiceSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createService(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Service',
        entityId: dto.id,
        diff: buildDiff(null, { title: dto.title, ctaUrl: dto.ctaUrl, order: dto.order }),
      },
      db,
    );

    revalidateContent('service', tagTargetsFor(null, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('service:create', error);
  }
}

export async function updateServiceAction(raw: unknown): Promise<ApiResponse<ServiceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateServiceSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findServiceSnapshot(parsed.data.id);
    if (!before) return notFound('Hizmet bulunamadı.');

    const dto = await updateService(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Service',
        entityId: dto.id,
        diff: buildDiff(
          { title: before.title, ctaUrl: before.ctaUrl, order: before.order },
          { title: dto.title, ctaUrl: dto.ctaUrl, order: dto.order },
        ),
      },
      db,
    );

    revalidateContent('service', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('service:update', error);
  }
}

/** SİLER — `diff` silinen satırın tamamını taşır (bkz. `deleteSkillAction`). */
export async function deleteServiceAction(raw: unknown): Promise<ApiResponse<ServiceDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findServiceSnapshot(parsed.data.id);
    if (!before) return notFound('Hizmet bulunamadı.');

    const dto = await deleteService(parsed.data.id);

    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'Service', entityId: dto.id, diff: { deleted: before } },
      db,
    );

    revalidateContent('service', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('service:delete', error);
  }
}
