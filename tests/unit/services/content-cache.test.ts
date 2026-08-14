import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ADR-011 önbellek etiketleri — F3'ün `revalidateTag` çağrıları buna dayanacak.
 *
 * `unstable_cache` SAHTELENİYOR: amaç okumanın sonucunu değil, Next'e HANGİ
 * ETİKETLERİN verildiğini ölçmek. Gerçek uygulama çağrılsaydı veritabanına
 * giderdi; burada okuma gövdesi hiç çalıştırılmıyor.
 */

const { unstableCache, calls } = vi.hoisted(() => {
  const calls: Array<{ keyParts: string[]; tags: string[] }> = [];
  return {
    calls,
    unstableCache: vi.fn(
      (_read: unknown, keyParts: string[], options: { tags: string[]; revalidate?: number }) => {
        calls.push({ keyParts, tags: options.tags });
        return async (): Promise<null> => null;
      },
    ),
  };
});

vi.mock('next/cache', () => ({ unstable_cache: unstableCache }));

const { CONTENT_REVALIDATE_SECONDS, entityTag, localeTag, slugTag } = await import(
  '@/server/services/_shared/content-cache'
);
const { getProjectBySlug, getPublishedProjects, getSiteStats, getSkills } = await import(
  '@/server/services/cached'
);

beforeEach(() => {
  calls.length = 0;
});

function lastCall(): { keyParts: string[]; tags: string[] } {
  const call = calls.at(-1);
  if (!call) throw new Error('unstable_cache hiç çağrılmadı');
  return call;
}

describe('etiket adlandırma kuralı', () => {
  it('üç seviye', () => {
    expect(entityTag('project')).toBe('content:project');
    expect(localeTag('project', 'tr')).toBe('content:project:tr');
    expect(slugTag('project', 'tr', 'kiyi-medya')).toBe('content:project:tr:kiyi-medya');
  });

  it('emniyet ağı süresi sonsuz DEĞİL', () => {
    expect(CONTENT_REVALIDATE_SECONDS).toBeGreaterThan(0);
    expect(Number.isFinite(CONTENT_REVALIDATE_SECONDS)).toBe(true);
  });
});

describe('etiketler ARGÜMANDAN türüyor — sarmalama anında sabitlenmiyor', () => {
  it('REGRESYON: getSkills("en") tr DEĞİL en etiketi taşır', async () => {
    // Etiketler sabit dizi olsaydı bu girdi 'content:skill:tr' ile işaretlenir,
    // revalidateTag('content:skill:en') onu ASLA düşüremezdi (sessiz bayatlama).
    await getSkills('en');

    expect(lastCall().tags).toContain('content:skill:en');
    expect(lastCall().tags).not.toContain('content:skill:tr');
  });

  it('varsayılan çağrı tr etiketi taşır', async () => {
    await getSkills();
    expect(lastCall().tags).toContain('content:skill:tr');
  });

  it('locale ANAHTARA da giriyor — diller girdi paylaşmaz', async () => {
    await getSkills('tr');
    const tr = lastCall().keyParts;
    await getSkills('en');
    expect(lastCall().keyParts).not.toEqual(tr);
  });

  it('her girdi kendini düşürebilecek TÜM etiketleri taşır (tam eşleşme)', async () => {
    // Eşleşme önek değil tam dizedir: 'content:project' etiketi taşınmazsa
    // geniş bir geçersizleştirme bu girdiyi ıskalardı.
    await getPublishedProjects('tr');
    expect(lastCall().tags).toEqual(
      expect.arrayContaining(['content:project', 'content:project:tr']),
    );
  });

  it('slug okuması slug etiketini de taşır', async () => {
    await getProjectBySlug('kiyi-medya', 'tr');
    expect(lastCall().tags).toEqual(
      expect.arrayContaining([
        'content:project',
        'content:project:tr',
        'content:project:tr:kiyi-medya',
      ]),
    );
    expect(lastCall().keyParts).toContain('kiyi-medya');
  });

  it('farklı slug farklı anahtar — ziyaretçi başkasının içeriğini görmez', async () => {
    await getProjectBySlug('a', 'tr');
    const first = lastCall().keyParts;
    await getProjectBySlug('b', 'tr');
    expect(lastCall().keyParts).not.toEqual(first);
  });
});

describe('getSiteStats önbelleği — ADR-027', () => {
  it('İKİ varlığın da etiketlerini taşır', async () => {
    // Yeni bir Experience eklendiğinde deneyim yılı bayat kalmasın diye.
    await getSiteStats('tr');
    expect(lastCall().tags).toEqual(
      expect.arrayContaining([
        'content:project',
        'content:project:tr',
        'content:experience',
        'content:experience:tr',
      ]),
    );
  });

  it('locale etiketlere yansır', async () => {
    await getSiteStats('en');
    expect(lastCall().tags).toContain('content:experience:en');
    expect(lastCall().tags).not.toContain('content:experience:tr');
  });
});
