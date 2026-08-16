import { describe, expect, it, vi } from 'vitest';

import {
  computeSiteStats,
  experienceYearsFrom,
  fullYearsBetween,
  type StatsSource,
} from '@/server/services';
import { fetchSiteStats, prismaStatsSource, type StatsClient } from '@/server/services/stats';

/**
 * ADR-027 — istatistikler TÜRETİLİR.
 * VERİTABANI GEREKTİRMEZ.
 */

/* ===================== YIL DÖNÜMÜ SINIRI ================================= */

describe('fullYearsBetween — yıl dönümü GEÇMEDEN artmaz', () => {
  it('yıl dönümünden bir gün ÖNCE henüz artmamış', () => {
    expect(fullYearsBetween('2020-08-15', '2026-08-14')).toBe(5);
  });

  it('yıl dönümü GÜNÜ artar', () => {
    expect(fullYearsBetween('2020-08-15', '2026-08-15')).toBe(6);
  });

  it('yıl dönümünden bir gün SONRA', () => {
    expect(fullYearsBetween('2020-08-15', '2026-08-16')).toBe(6);
  });

  it('aynı gün → 0', () => {
    expect(fullYearsBetween('2026-08-12', '2026-08-12')).toBe(0);
  });

  it('yıl sınırı: 31 Aralık → 1 Ocak henüz 1 yıl DEĞİL', () => {
    expect(fullYearsBetween('2025-12-31', '2026-01-01')).toBe(0);
  });

  it('ay sınırı: aynı yıl içinde ileri gün', () => {
    expect(fullYearsBetween('2026-01-31', '2026-12-01')).toBe(0);
  });

  it('365 GÜNE BÖLME HATASI: artık yıl içeren 4 yıllık aralık tam 4', () => {
    // 2020 artık yıl; gün farkı 1461, /365 = 4.003 — yuvarlama sınırda yanılırdı.
    expect(fullYearsBetween('2020-03-01', '2024-03-01')).toBe(4);
    // Bir gün öncesi hâlâ 3 olmalı — bölme yaklaşımı burada 4 verebilirdi.
    expect(fullYearsBetween('2020-03-01', '2024-02-29')).toBe(3);
  });

  it('29 Şubat başlangıcı: artık olmayan yılda 28 Şubat henüz yıl dönümü değil', () => {
    expect(fullYearsBetween('2020-02-29', '2026-02-28')).toBe(5);
    expect(fullYearsBetween('2020-02-29', '2026-03-01')).toBe(6);
  });

  it('GELECEK TARİH → negatif değil, 0', () => {
    expect(fullYearsBetween('2030-01-01', '2026-08-12')).toBe(0);
  });

  it('geçersiz gün FIRLATIR (ADR-016 takvim doğrulaması)', () => {
    expect(() => fullYearsBetween('2026-02-30', '2026-08-12')).toThrow(/Takvimde olmayan/);
    expect(() => fullYearsBetween('12.08.2026', '2026-08-12')).toThrow(/Geçersiz gün biçimi/);
  });
});

describe('experienceYearsFrom', () => {
  it('HİÇ EXPERIENCE YOK → 0, patlamaz', () => {
    expect(experienceYearsFrom(null, '2026-08-12')).toBe(0);
  });

  it('startDate BUGÜN → 0', () => {
    expect(experienceYearsFrom('2026-08-12', '2026-08-12')).toBe(0);
  });

  it('GELECEK TARİHLİ Experience → 0 (negatif deneyim yılı yok)', () => {
    expect(experienceYearsFrom('2027-01-01', '2026-08-12')).toBe(0);
  });
});

/* ===================== HESAPLAYICI ======================================= */

function source(earliest: Date | null, count: number): StatsSource {
  return {
    earliestExperienceStart: vi.fn().mockResolvedValue(earliest),
    publishedProjectCount: vi.fn().mockResolvedValue(count),
  };
}

describe('computeSiteStats', () => {
  const NOW = new Date('2026-08-12T09:00:00Z');

  it('normal durum', async () => {
    const stats = await computeSiteStats(source(new Date('2020-08-15T00:00:00Z'), 9), NOW);
    expect(stats).toEqual({ experienceYears: 5, publishedProjects: 9 });
  });

  it('BOŞ VERİTABANI → her ikisi 0, FIRLATMAZ', async () => {
    expect(await computeSiteStats(source(null, 0), NOW)).toEqual({
      experienceYears: 0,
      publishedProjects: 0,
    });
  });

  it('deneyim var, yayınlanmış proje YOK', async () => {
    const stats = await computeSiteStats(source(new Date('2018-01-01T00:00:00Z'), 0), NOW);
    expect(stats).toEqual({ experienceYears: 8, publishedProjects: 0 });
  });

  it('ADR-027: müşteri/iş alanı DÖNMÜYOR (F4)', async () => {
    const stats = await computeSiteStats(source(null, 0), NOW);
    expect(Object.keys(stats).sort()).toEqual(['experienceYears', 'publishedProjects']);
    expect(stats).not.toHaveProperty('clients');
  });

  it('iki sorgu PARALEL — biri diğerini beklemiyor', async () => {
    const order: string[] = [];
    const slow: StatsSource = {
      earliestExperienceStart: async () => {
        order.push('exp:start');
        await Promise.resolve();
        order.push('exp:end');
        return null;
      },
      publishedProjectCount: async () => {
        order.push('proj:start');
        return 0;
      },
    };
    await computeSiteStats(slow, NOW);
    // Sıralı olsaydı 'proj:start' ancak 'exp:end'ten sonra gelirdi.
    expect(order.indexOf('proj:start')).toBeLessThan(order.indexOf('exp:end'));
  });

  it('gün hesabı Europe/Istanbul — UTC gecesi bir gün geri kaymıyor (ADR-016)', async () => {
    // 12 Ağustos 00:30 Istanbul = 11 Ağustos 21:30 UTC.
    // Yıl dönümü 12 Ağustos ise UTC'ye göre hesaplansaydı henüz gelmemiş sayılırdı.
    const istanbulMidnight = new Date('2026-08-11T21:30:00Z');
    const stats = await computeSiteStats(
      source(new Date('2020-08-12T00:00:00Z'), 0),
      istanbulMidnight,
    );
    expect(stats.experienceYears).toBe(6);
  });
});

/* ===================== PRISMA BAĞLAMASI ================================== */

describe('prismaStatsSource / fetchSiteStats', () => {
  const NOW = new Date('2026-08-12T09:00:00Z');

  function client(earliest: unknown, count: number) {
    const findFirst = vi.fn().mockResolvedValue(earliest);
    const countFn = vi.fn().mockResolvedValue(count);
    return {
      findFirst,
      countFn,
      client: { experience: { findFirst }, project: { count: countFn } } as unknown as StatsClient,
    };
  }

  it('en erken Experience startDate ASC ile tek satır çeker', async () => {
    const h = client({ startDate: new Date('2019-05-01T00:00:00Z') }, 3);
    await fetchSiteStats({ now: NOW }, h.client);

    const args = h.findFirst.mock.calls[0]?.[0];
    expect(args.orderBy).toEqual({ startDate: 'asc' });
    expect(args.select).toEqual({ startDate: true });
  });

  it('proje sayımı YAYIN PENCERESİNİ uygular — taslak/zamanlanmış sayılmaz', async () => {
    const h = client(null, 0);
    await fetchSiteStats({ now: NOW }, h.client);

    const where = h.countFn.mock.calls[0]?.[0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.publishedAt).toEqual({ lte: NOW });
  });

  it('LOCALE FİLTRESİ İKİ SORGUDA DA VAR — iki dil sayıyı ikiye katlamasın', async () => {
    const h = client(null, 0);
    await fetchSiteStats({ locale: 'en', now: NOW }, h.client);

    expect(h.findFirst.mock.calls[0]?.[0].where).toEqual({ locale: 'en' });
    expect(h.countFn.mock.calls[0]?.[0].where.locale).toBe('en');
  });

  it('varsayılan locale tr', async () => {
    const h = client(null, 0);
    await fetchSiteStats({ now: NOW }, h.client);
    expect(h.countFn.mock.calls[0]?.[0].where.locale).toBe('tr');
  });

  it('boş veritabanında uçtan uca 0/0', async () => {
    const h = client(null, 0);
    expect(await fetchSiteStats({ now: NOW }, h.client)).toEqual({
      experienceYears: 0,
      publishedProjects: 0,
    });
  });

  it('prismaStatsSource kayıt yoksa null döner (undefined değil)', async () => {
    const h = client(null, 0);
    expect(await prismaStatsSource('tr', NOW, h.client).earliestExperienceStart()).toBeNull();
  });
});
