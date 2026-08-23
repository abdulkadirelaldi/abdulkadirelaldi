import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import type { SiteStatsDto, StatsSource } from './_shared';
import { computeSiteStats, DEFAULT_LOCALE, publishedWhere } from './_shared';

/**
 * Site istatistikleri servisi — ADR-027.
 *
 * Hesap mantığı `_shared/stats.ts` içindedir; burada yalnızca Prisma bağlaması
 * ve önbellekleme var. Ayrım bilinçli: yıl dönümü sınırı gibi ince kurallar
 * veritabanı olmadan sınanabilsin.
 */

export type StatsClient = Pick<PrismaClient, 'experience' | 'project'>;

/**
 * LOCALE FİLTRESİ ŞART — sayısı ikiye katlar.
 *
 * `Project` çok dilli: aynı proje `tr` ve `en` satırları olarak iki kez durur
 * (ADR-019). Filtre olmasaydı "9 proje" iki dil eklendiği gün sessizce 18
 * olurdu. Tam da ADR-027'nin önlemek istediği sessiz yalan — bu kez elle
 * girilmiş değil, türetilmiş bir sayıda.
 *
 * `Experience`'ta filtre sayıyı değil, hangi kaydın "en erken" olduğunu
 * etkiler; yine de tutarlılık için aynı dil kullanılır.
 */
export function prismaStatsSource(
  locale: string,
  now: Date,
  client: StatsClient = db,
): StatsSource {
  return {
    async earliestExperienceStart(): Promise<Date | null> {
      const row = await client.experience.findFirst({
        where: { locale },
        orderBy: { startDate: 'asc' },
        select: { startDate: true },
      });
      return row?.startDate ?? null;
    },

    publishedProjectCount(): Promise<number> {
      return client.project.count({
        where: { locale, ...publishedWhere(now) },
      });
    },
  };
}

/**
 * İstatistikleri okur (önbelleksiz).
 *
 * BOŞ VERİTABANI: hiç `Experience` yoksa `experienceYears: 0`, hiç yayınlanmış
 * proje yoksa `publishedProjects: 0` döner — FIRLATMAZ. `getProfile`'ın aksine
 * burada boşluk bir kurulum hatası değil, sitenin ilk günündeki doğal durum.
 */
export function fetchSiteStats(
  params: { locale?: string; now?: Date } = {},
  client: StatsClient = db,
): Promise<SiteStatsDto> {
  const { locale = DEFAULT_LOCALE, now = new Date() } = params;
  return computeSiteStats(prismaStatsSource(locale, now, client), now);
}
