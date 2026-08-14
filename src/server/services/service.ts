import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import { DEFAULT_LOCALE} from './_shared';
import type { ServiceDto } from './content-dto';

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
