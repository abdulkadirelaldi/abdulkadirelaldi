'use server';

import { createSkillSchema, entityIdSchema, updateSkillSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { createSkill, deleteSkill, findSkillSnapshot, updateSkill } from '@/server/services/skill';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import type { SkillDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent, tagTargetsFor } from './tags';

/**
 * `Skill` Server Action'ları — §7.1 sırası `project.ts`'te.
 *
 * `Project`e göre İKİ BOYUT EKSİK ve bu, etiket hesabını sadeleştiriyor:
 *   - SLUG YOK  → `slugTag` hiç kullanılmaz; yalnızca `localeTag` düşer.
 *   - DURUM YOK → `ContentStatus` taşımaz, "yayınla/arşivle" diye bir geçiş yok.
 *
 * Bu yüzden SİLME GERÇEK SİLMEDİR — gerekçenin tamamı `services/skill.ts`'in
 * yazma bölümünde. Özet: FK bağımlısı yok, public adresi yok, `ARCHIVED`ın
 * koruduğu şey (slug + 410) burada mevcut değil. Kaybolan tarih `AuditLog`a
 * yazılıyor: aşağıdaki `diff` silinen satırın TAMAMINI taşır.
 */

export async function createSkillAction(raw: unknown): Promise<ApiResponse<SkillDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createSkillSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createSkill(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Skill',
        entityId: dto.id,
        diff: buildDiff(null, { name: dto.name, category: dto.category, level: dto.level }),
      },
      db,
    );

    revalidateContent('skill', tagTargetsFor(null, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('skill:create', error);
  }
}

export async function updateSkillAction(raw: unknown): Promise<ApiResponse<SkillDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateSkillSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    // Dil değişebilir; eski dilin listesi de düşürülmeli (ADR-029).
    const before = await findSkillSnapshot(parsed.data.id);
    if (!before) return notFound('Yetenek bulunamadı.');

    const dto = await updateSkill(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Skill',
        entityId: dto.id,
        diff: buildDiff(
          { name: before.name, category: before.category, level: before.level },
          { name: dto.name, category: dto.category, level: dto.level },
        ),
      },
      db,
    );

    revalidateContent('skill', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('skill:update', error);
  }
}

/**
 * Yeteneği SİLER — arşivlemez.
 *
 * `diff` SİLİNEN SATIRIN TAMAMINI taşır. `buildDiff(before, {})` boş bir fark
 * üretirdi; burada asıl saklanmak istenen "ne değişti" değil "ne kayboldu".
 * Denetim kaydı bu eylemde kaydın TEK kalan izidir.
 */
export async function deleteSkillAction(raw: unknown): Promise<ApiResponse<SkillDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findSkillSnapshot(parsed.data.id);
    if (!before) return notFound('Yetenek bulunamadı.');

    const dto = await deleteSkill(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Skill',
        entityId: dto.id,
        /*
         * BULGU-019 — ALANLAR TEK TEK SAYILIYOR, `{ deleted: before }` DEĞİL.
         *
         * Eski hâli satırın TAMAMINI yazıyordu ve bugün sızıntı üretmiyordu;
         * kusur gelecekteydi: kalıp ALAN SEÇİMİNİ MODELE DEVREDİYORDU. Yarın
         * eklenecek bir `apiAnahtari` sütunu `REDACTED_KEYS`te olmayacağı için
         * diff'e OTOMATİK girerdi — ve TİP SİSTEMİ DE GÖREMEZDİ, çünkü `before`
         * zaten o modelin tipinde. ADR-034'ün tam uyardığı sınıf: redaksiyon
         * bir emniyet ağı, alan seçiminin yerine geçmez.
         *
         * Şimdi seçim BURADA ve açık: yeni bir sütun eklendiğinde denetim
         * kaydına girmesi için birinin bu listeyi BİLEREK genişletmesi gerekiyor.
         * `create`/`update` zaten böyle yazılmıştı; silme de onlara uyduruldu.
         */
        diff: {
          deleted: {
            name: before.name,
            category: before.category,
            level: before.level,
            locale: before.locale,
            order: before.order,
          },
        },
      },
      db,
    );

    revalidateContent('skill', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('skill:delete', error);
  }
}
