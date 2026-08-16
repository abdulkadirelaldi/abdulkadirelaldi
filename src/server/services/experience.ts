import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';
import type { ExperienceType } from '@/types';

import { dateToAppDay, DEFAULT_LOCALE} from './_shared';
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
