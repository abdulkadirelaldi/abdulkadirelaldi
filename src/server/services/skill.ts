import type { CreateSkillInput, UpdateSkillInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';
import type { SkillCategory } from '@/types';

import { DEFAULT_LOCALE } from './_shared';
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

/* ===========================================================================
 * YAZMA YOLU — T-031
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN GERÇEK SİLME — ADR-017 BURADA GEÇERLİ DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-017 "muhasebede hard delete yok" der ve §6.1 `isArchived`ı REFERANS
 * VERİLERLE sınırlar: `TransactionCategory`, `Exercise`, `Client`, `Habit`.
 * Yasağın gerekçesi bunlara BAĞLI FK'ler olmasıdır — silinen bir kategori,
 * geçmiş işlemleri okunamaz hâle getirir.
 *
 * `Skill` (ve `Service`, `Experience`) o sınıfa GİRMEZ, üç sebeple:
 *   1. Hiçbir model bunlara FK ile bağlı değil (şema tarandı) — silinen bir
 *      kayıt hiçbir geçmişi kırmaz.
 *   2. İçerik değiller: `ContentStatus` taşımazlar, slug'ları yoktur, public
 *      adresleri yoktur. `ARCHIVED`ın koruduğu şey (slug + 410) burada YOK.
 *   3. Şemada saklanacak bir yer de yok: `isArchived` eklemek migration ister
 *      ve §6.1'in kapsam çizgisini genişletirdi.
 *
 * KAYBOLAN TARİH NEREYE GİDİYOR: `AuditLog`a. Silme eylemi, silinen satırın
 * TAM anlık görüntüsünü `diff` içinde taşır (bkz. `src/server/actions/skill.ts`).
 * Yani kayıt kaybolmuyor, yeri değişiyor — ve denetim kaydı zaten §8.19'un
 * korumak zorunda olduğu yer.
 * ======================================================================== */

/** Mutasyon öncesi anlık görüntü — `AuditLog` farkı ve silme kaydı için. */
export async function findSkillSnapshot(
  id: string,
  client: SkillClient = db,
): Promise<SkillDto | null> {
  const row = await client.skill.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function createSkill(
  input: CreateSkillInput,
  client: SkillClient = db,
): Promise<SkillDto> {
  const row = await client.skill.create({
    data: {
      locale: input.locale,
      name: input.name,
      category: input.category,
      level: input.level,
      iconKey: input.iconKey ?? null,
      order: input.order,
    },
  });
  return toDto(row);
}

/** KISMİ güncelleme — gönderilmeyen alana dokunulmaz (bkz. `updateProject`). */
export async function updateSkill(
  input: UpdateSkillInput,
  client: SkillClient = db,
): Promise<SkillDto> {
  const { id, ...fields } = input;

  const row = await client.skill.update({
    where: { id },
    data: {
      ...(fields.locale !== undefined ? { locale: fields.locale } : {}),
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.category !== undefined ? { category: fields.category } : {}),
      ...(fields.level !== undefined ? { level: fields.level } : {}),
      ...(fields.iconKey !== undefined ? { iconKey: fields.iconKey ?? null } : {}),
      ...(fields.order !== undefined ? { order: fields.order } : {}),
    },
  });
  return toDto(row);
}

/** Siler ve SİLİNEN KAYDI döndürür — çağıran onu `AuditLog`a yazsın diye. */
export async function deleteSkill(id: string, client: SkillClient = db): Promise<SkillDto> {
  return toDto(await client.skill.delete({ where: { id } }));
}
