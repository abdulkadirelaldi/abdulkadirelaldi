import type { CreateExperienceInput, UpdateExperienceInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';
import type { ExperienceType } from '@/types';

import { appDayToDate, dateToAppDay, DEFAULT_LOCALE } from './_shared';
import type { ExperienceDto } from './content-dto';

/** `Experience` servisi — §4.1 /hakkimda zaman çizelgesi. */

interface ExperienceRow {
  id: string;
  locale: string;
  organization: string;
  role: string;
  type: ExperienceType;
  startDate: Date;
  endDate: Date | null;
  current: boolean;
  description: string | null;
  order: number;
}

export type ExperienceClient = Pick<PrismaClient, 'experience'>;

/** `@db.Date` → `AppDay` (ADR-016). Ham `Date` DTO'ya GEÇMEZ. */
function toDto(row: ExperienceRow): ExperienceDto {
  return {
    id: row.id,
    locale: row.locale,
    organization: row.organization,
    role: row.role,
    type: row.type,
    startDate: dateToAppDay(row.startDate),
    endDate: row.endDate ? dateToAppDay(row.endDate) : null,
    current: row.current,
    description: row.description,
    order: row.order,
  };
}

/**
 * Deneyim/eğitim kayıtları — EN YENİ ÖNCE.
 *
 * Sıralama `startDate desc`: zaman çizelgesi en güncel deneyimi en üstte
 * gösterir. `order` ikincil anahtar, aynı tarihli kayıtları elle sıralamak için.
 *
 * Boş durumda BOŞ DİZİ.
 */
export async function fetchExperience(
  params: { locale?: string; type?: ExperienceType } = {},
  client: ExperienceClient = db,
): Promise<ExperienceDto[]> {
  const rows = await client.experience.findMany({
    where: {
      locale: params.locale ?? DEFAULT_LOCALE,
      ...(params.type ? { type: params.type } : {}),
    },
    orderBy: [{ startDate: 'desc' }, { order: 'asc' }],
  });
  return rows.map(toDto);
}

/* ===========================================================================
 * YAZMA YOLU — T-031
 *
 * SİLME GERÇEK SİLMEDİR; gerekçe `skill.ts`'in yazma bölümünde.
 *
 * `startDate`/`endDate` `@db.Date` (ADR-016): DTO ve şema tarafında `AppDay`
 * (`YYYY-MM-DD`), veritabanında `Date`. Dönüşüm `appDayToDate` ile BURADA
 * yapılır — ham `Date` şemadan geçmez, ham `AppDay` de Prisma'ya gitmez.
 * ======================================================================== */

export async function findExperienceSnapshot(
  id: string,
  client: ExperienceClient = db,
): Promise<ExperienceDto | null> {
  const row = await client.experience.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function createExperience(
  input: CreateExperienceInput,
  client: ExperienceClient = db,
): Promise<ExperienceDto> {
  const row = await client.experience.create({
    data: {
      locale: input.locale,
      organization: input.organization,
      role: input.role,
      type: input.type,
      startDate: appDayToDate(input.startDate),
      endDate: input.endDate ? appDayToDate(input.endDate) : null,
      current: input.current,
      description: input.description ?? null,
      order: input.order,
    },
  });
  return toDto(row);
}

/** KISMİ güncelleme — gönderilmeyen alana dokunulmaz. */
export async function updateExperience(
  input: UpdateExperienceInput,
  client: ExperienceClient = db,
): Promise<ExperienceDto> {
  const { id, ...fields } = input;

  const row = await client.experience.update({
    where: { id },
    data: {
      ...(fields.locale !== undefined ? { locale: fields.locale } : {}),
      ...(fields.organization !== undefined ? { organization: fields.organization } : {}),
      ...(fields.role !== undefined ? { role: fields.role } : {}),
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.startDate !== undefined ? { startDate: appDayToDate(fields.startDate) } : {}),
      ...(fields.endDate !== undefined
        ? { endDate: fields.endDate ? appDayToDate(fields.endDate) : null }
        : {}),
      ...(fields.current !== undefined ? { current: fields.current } : {}),
      ...(fields.description !== undefined ? { description: fields.description ?? null } : {}),
      ...(fields.order !== undefined ? { order: fields.order } : {}),
    },
  });
  return toDto(row);
}

/** Siler ve SİLİNEN KAYDI döndürür. */
export async function deleteExperience(
  id: string,
  client: ExperienceClient = db,
): Promise<ExperienceDto> {
  return toDto(await client.experience.delete({ where: { id } }));
}
