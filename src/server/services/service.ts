import type { CreateServiceInput, ServiceFilterInput, UpdateServiceInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import { DEFAULT_LOCALE, panelSkipTake, toPagedResult } from './_shared';
import type { PagedResult, ServiceDto } from './content-dto';

/** `Service` servisi — §4.1 hizmetler, K4 CTA'ları. */

interface ServiceRow {
  id: string;
  locale: string;
  title: string;
  description: string;
  iconKey: string | null;
  ctaUrl: string | null;
  order: number;
}

export type ServiceClient = Pick<PrismaClient, 'service'>;

function toDto(row: ServiceRow): ServiceDto {
  return {
    id: row.id,
    locale: row.locale,
    title: row.title,
    description: row.description,
    iconKey: row.iconKey,
    ctaUrl: row.ctaUrl,
    order: row.order,
  };
}

/** Boş durumda BOŞ DİZİ döner. */
export async function fetchServices(
  locale: string = DEFAULT_LOCALE,
  client: ServiceClient = db,
): Promise<ServiceDto[]> {
  const rows = await client.service.findMany({
    where: { locale },
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });
  return rows.map(toDto);
}

/* ===========================================================================
 * PANEL OKUMA YOLU — gerekçe `skill.ts`'teki aynı bölümde (sayfalı liste +
 * `id` ile tek kayıt, ayrı panel DTO'su yok, önbellek yok).
 * ======================================================================== */

/** TÜM hizmetler — panel listesi, sayfalı. Sıra public tarafla AYNI. */
export async function fetchServicesForPanel(
  filter: ServiceFilterInput,
  client: ServiceClient = db,
): Promise<PagedResult<ServiceDto>> {
  const where: Record<string, unknown> = {};
  if (filter.locale) where.locale = filter.locale;

  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.service.findMany({
      where,
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
      skip,
      take,
    }),
    client.service.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toDto);
}

/** Panel TEK KAYIT — `id` ile. Yoksa `null` (bkz. `fetchSkillForPanelById`). */
export async function fetchServiceForPanelById(
  id: string,
  client: ServiceClient = db,
): Promise<ServiceDto | null> {
  return findServiceSnapshot(id, client);
}

/* ===========================================================================
 * YAZMA YOLU — T-031
 *
 * SİLME GERÇEK SİLMEDİR; gerekçenin tamamı `skill.ts`'in yazma bölümünde
 * (aynı sınıf: FK bağımlısı yok, `ContentStatus` yok, public adresi yok).
 * ======================================================================== */

export async function findServiceSnapshot(
  id: string,
  client: ServiceClient = db,
): Promise<ServiceDto | null> {
  const row = await client.service.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function createService(
  input: CreateServiceInput,
  client: ServiceClient = db,
): Promise<ServiceDto> {
  const row = await client.service.create({
    data: {
      locale: input.locale,
      title: input.title,
      description: input.description,
      iconKey: input.iconKey ?? null,
      ctaUrl: input.ctaUrl ?? null,
      order: input.order,
    },
  });
  return toDto(row);
}

/** KISMİ güncelleme — gönderilmeyen alana dokunulmaz. */
export async function updateService(
  input: UpdateServiceInput,
  client: ServiceClient = db,
): Promise<ServiceDto> {
  const { id, ...fields } = input;

  const row = await client.service.update({
    where: { id },
    data: {
      ...(fields.locale !== undefined ? { locale: fields.locale } : {}),
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(fields.iconKey !== undefined ? { iconKey: fields.iconKey ?? null } : {}),
      ...(fields.ctaUrl !== undefined ? { ctaUrl: fields.ctaUrl ?? null } : {}),
      ...(fields.order !== undefined ? { order: fields.order } : {}),
    },
  });
  return toDto(row);
}

/** Siler ve SİLİNEN KAYDI döndürür — `AuditLog` tarihi tutsun diye. */
export async function deleteService(id: string, client: ServiceClient = db): Promise<ServiceDto> {
  return toDto(await client.service.delete({ where: { id } }));
}
