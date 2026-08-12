import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';
import type { SkillCategory } from '@/types';

import { cachedRead, DEFAULT_LOCALE, entityTag, localeTag } from './_shared';
import type { SkillDto } from './content-dto';

/** `Skill` servisi — T-015 konvansiyonu. */

interface SkillRow {
  id: string;
  locale: string;
  name: string;
  category: SkillCategory;
  level: number;
  iconKey: string | null;
  order: number;
}

export type SkillClient = Pick<PrismaClient, 'skill'>;

function toDto(row: SkillRow): SkillDto {
  return {
    id: row.id,
    locale: row.locale,
    name: row.name,
    category: row.category,
    level: row.level,
    iconKey: row.iconKey,
    order: row.order,
  };
}

/**
 * Yetenekleri okur. Yayın durumu YOKTUR — `Skill` bir içerik değil, profil
 * bileşenidir; seed'de veya panelde ne varsa görünür.
 *
 * BOŞ DURUM: kayıt yoksa BOŞ DİZİ döner. Liste okumalarında `null` dönmek
 * çağıranı gereksiz bir kontrole zorlar; boş dizi doğal "hiç yok" ifadesidir.
 */
export async function fetchSkills(
  locale: string = DEFAULT_LOCALE,
  client: SkillClient = db,
): Promise<SkillDto[]> {
  const rows = await client.skill.findMany({
    where: { locale },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toDto);
}

export const getSkills = cachedRead((locale: string = DEFAULT_LOCALE) => fetchSkills(locale), {
  keyParts: ['skills'],
  tags: [entityTag('skill'), localeTag('skill', DEFAULT_LOCALE)],
});
