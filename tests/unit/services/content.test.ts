import { describe, expect, it, vi } from 'vitest';

import {
  entityTag,
  fetchExperience,
  fetchPostBySlug,
  fetchProfile,
  fetchProjectBySlug,
  fetchProjectGallery,
  fetchPublishedPosts,
  fetchPublishedProjects,
  fetchServices,
  fetchSkills,
  localeTag,
  slugTag,
  type ExperienceClient,
  type PostClient,
  type ProfileClient,
  type ProjectClient,
  type ServiceClient,
  type SkillClient,
} from '@/server/services';

/**
 * İçerik servisleri — ADR-019 yayın durumu ayrımı ve ADR-011 etiketleri.
 * VERİTABANI GEREKTİRMEZ: Prisma istemcisi enjekte ediliyor.
 */

const NOW = new Date('2026-08-10T12:00:00Z');
const PAST = new Date('2026-01-01T00:00:00Z');
const FUTURE = new Date('2099-01-01T00:00:00Z');

const attachment = {
  id: 'att_1',
  key: 'projects/a.webp',
  mime: 'image/webp',
  width: 1200,
  height: 630,
};

/** Altı istemciyi de karşılar; her test yalnızca kullandığı modeli tanımlar. */
type AnyContentClient = ProjectClient &
  PostClient &
  ProfileClient &
  SkillClient &
  ServiceClient &
  ExperienceClient;

function clientWith(overrides: Record<string, unknown>): AnyContentClient {
  return overrides as unknown as AnyContentClient;
}

/* ============================ ÖNBELLEK ETİKETLERİ ======================== */

describe('önbellek etiketi adlandırma — ADR-011 (F3 bunları geçersizleştirecek)', () => {
  it('üç seviye', () => {
    expect(entityTag('project')).toBe('content:project');
    expect(localeTag('project', 'tr')).toBe('content:project:tr');
    expect(slugTag('project', 'tr', 'kiyi-medya')).toBe('content:project:tr:kiyi-medya');
  });

  it('varlık etiketi liste etiketinin ÖNEKİ — hiyerarşi okunabilir', () => {
    expect(localeTag('post', 'tr').startsWith(entityTag('post'))).toBe(true);
    expect(slugTag('post', 'tr', 'x').startsWith(localeTag('post', 'tr'))).toBe(true);
  });
});

/* ============================ PROJECT ==================================== */

describe('fetchPublishedProjects — ADR-019 yayın penceresi', () => {
  function harness(rows: unknown[] = []) {
    const findMany = vi.fn().mockResolvedValue(rows);
    return { findMany, client: clientWith({ project: { findMany } }) };
  }

  it('SADECE PUBLISHED ve publishedAt <= now sorgulanır', async () => {
    const h = harness();
    await fetchPublishedProjects({ now: NOW }, h.client);

    const where = h.findMany.mock.calls[0]?.[0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.publishedAt).toEqual({ lte: NOW });
  });

  it('SCHEDULED sızmasın diye zaman koşulu sorguda — sadece status yetmez', async () => {
    const h = harness();
    await fetchPublishedProjects({ now: NOW }, h.client);
    expect(h.findMany.mock.calls[0]?.[0].where).toHaveProperty('publishedAt');
  });

  it('varsayılan locale tr', async () => {
    const h = harness();
    await fetchPublishedProjects({}, h.client);
    expect(h.findMany.mock.calls[0]?.[0].where.locale).toBe('tr');
  });

  it('locale geçersiz kılınabilir', async () => {
    const h = harness();
    await fetchPublishedProjects({ locale: 'en' }, h.client);
    expect(h.findMany.mock.calls[0]?.[0].where.locale).toBe('en');
  });

  it('etiket ve teknoloji filtresi', async () => {
    const h = harness();
    await fetchPublishedProjects({ tag: 'cms', stack: 'Next.js' }, h.client);
    const where = h.findMany.mock.calls[0]?.[0].where;
    expect(where.tags).toEqual({ has: 'cms' });
    expect(where.stack).toEqual({ has: 'Next.js' });
  });

  it('featuredOnly ana sayfa bölümü için', async () => {
    const h = harness();
    await fetchPublishedProjects({ featuredOnly: true }, h.client);
    expect(h.findMany.mock.calls[0]?.[0].where.featured).toBe(true);
  });

  it('BOŞ DURUM: kayıt yoksa boş dizi (null değil)', async () => {
    expect(await fetchPublishedProjects({}, harness([]).client)).toEqual([]);
  });

  it('DTO şekli — content ve gallery LİSTEDE YOK', async () => {
    const h = harness([
      {
        id: 'p1',
        locale: 'tr',
        slug: 'a',
        title: 'A',
        summary: 'S',
        cover: attachment,
        tags: ['x'],
        stack: ['y'],
        featured: true,
        order: 1,
        publishedAt: PAST,
      },
    ]);
    const [item] = await fetchPublishedProjects({}, h.client);

    expect(item).toEqual({
      id: 'p1',
      locale: 'tr',
      slug: 'a',
      title: 'A',
      summary: 'S',
      cover: { id: 'att_1', key: 'projects/a.webp', mime: 'image/webp', width: 1200, height: 630 },
      tags: ['x'],
      stack: ['y'],
      featured: true,
      order: 1,
      publishedAt: PAST.toISOString(),
    });
    expect(item).not.toHaveProperty('content');
    expect(item).not.toHaveProperty('gallery');
  });

  it('kapak DTO’sunda url YOK (ADR-018)', async () => {
    const h = harness([
      {
        id: 'p1',
        locale: 'tr',
        slug: 'a',
        title: 'A',
        summary: 'S',
        cover: attachment,
        tags: [],
        stack: [],
        featured: false,
        order: 0,
        publishedAt: PAST,
      },
    ]);
    const [item] = await fetchPublishedProjects({}, h.client);
    expect(item?.cover).not.toHaveProperty('url');
    expect(item?.cover?.key).toBe('projects/a.webp');
  });

  it('kapaksız proje null döner', async () => {
    const h = harness([
      {
        id: 'p1',
        locale: 'tr',
        slug: 'a',
        title: 'A',
        summary: 'S',
        cover: null,
        tags: [],
        stack: [],
        featured: false,
        order: 0,
        publishedAt: PAST,
      },
    ]);
    expect((await fetchPublishedProjects({}, h.client))[0]?.cover).toBeNull();
  });
});

describe('fetchProjectBySlug — 404 / 410 ayrımı (ADR-019)', () => {
  const base = {
    id: 'p1',
    locale: 'tr',
    slug: 'a',
    title: 'A',
    summary: 'S',
    cover: null,
    tags: [],
    stack: [],
    featured: false,
    order: 0,
    content: '# MDX',
    liveUrl: null,
    repoUrl: null,
    clientName: null,
  };

  function harness(row: unknown, gallery: unknown[] = []) {
    return clientWith({
      project: { findUnique: vi.fn().mockResolvedValue(row) },
      attachment: { findMany: vi.fn().mockResolvedValue(gallery) },
    });
  }

  it('PUBLISHED + geçmiş tarih → FOUND', async () => {
    const result = await fetchProjectBySlug(
      'a',
      { now: NOW },
      harness({ ...base, status: 'PUBLISHED', publishedAt: PAST }),
    );
    expect(result.state).toBe('FOUND');
    if (result.state === 'FOUND') expect(result.data.content).toBe('# MDX');
  });

  it('ARCHIVED → GONE (410, slug korunur)', async () => {
    const result = await fetchProjectBySlug(
      'a',
      { now: NOW },
      harness({ ...base, status: 'ARCHIVED', publishedAt: PAST }),
    );
    expect(result.state).toBe('GONE');
  });

  it('DRAFT → NOT_FOUND (varlığı sızdırılmaz, GONE değil)', async () => {
    const result = await fetchProjectBySlug(
      'a',
      { now: NOW },
      harness({ ...base, status: 'DRAFT', publishedAt: null }),
    );
    expect(result.state).toBe('NOT_FOUND');
  });

  it('SCHEDULED → NOT_FOUND', async () => {
    const result = await fetchProjectBySlug(
      'a',
      { now: NOW },
      harness({ ...base, status: 'SCHEDULED', publishedAt: FUTURE }),
    );
    expect(result.state).toBe('NOT_FOUND');
  });

  it('PUBLISHED ama İLERİ TARİHLİ → NOT_FOUND (erken sızmaz)', async () => {
    const result = await fetchProjectBySlug(
      'a',
      { now: NOW },
      harness({ ...base, status: 'PUBLISHED', publishedAt: FUTURE }),
    );
    expect(result.state).toBe('NOT_FOUND');
  });

  it('kayıt yok → NOT_FOUND', async () => {
    expect((await fetchProjectBySlug('yok', {}, harness(null))).state).toBe('NOT_FOUND');
  });

  it('galeri order ile sıralı sorgulanır ve DTO’ya girer', async () => {
    const client = harness({ ...base, status: 'PUBLISHED', publishedAt: PAST }, [attachment]);
    const result = await fetchProjectBySlug('a', { now: NOW }, client);

    expect(result.state).toBe('FOUND');
    if (result.state !== 'FOUND') return;
    expect(result.data.gallery).toHaveLength(1);
    expect(result.data.gallery[0]).not.toHaveProperty('url');
  });
});

describe('fetchProjectGallery — polimorfik ilişki (ADR-018)', () => {
  it('entity=PROJECT ve order asc ile sorgular', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await fetchProjectGallery('p1', clientWith({ attachment: { findMany } }));

    const args = findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ entity: 'PROJECT', entityId: 'p1' });
    expect(args.orderBy).toEqual([{ order: 'asc' }]);
  });

  it('galeri yoksa boş dizi', async () => {
    const client = clientWith({ attachment: { findMany: vi.fn().mockResolvedValue([]) } });
    expect(await fetchProjectGallery('p1', client)).toEqual([]);
  });
});

/* ============================ POST ======================================= */

describe('fetchPublishedPosts', () => {
  it('yayın penceresi uygulanır, en yeni önce', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await fetchPublishedPosts({ now: NOW }, clientWith({ post: { findMany } }));

    const args = findMany.mock.calls[0]?.[0];
    expect(args.where.status).toBe('PUBLISHED');
    expect(args.where.publishedAt).toEqual({ lte: NOW });
    expect(args.orderBy).toEqual([{ publishedAt: 'desc' }]);
  });

  it('content LİSTEDE YOK', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'x',
        locale: 'tr',
        slug: 's',
        title: 'T',
        excerpt: 'E',
        cover: null,
        tags: [],
        readingMinutes: 4,
        publishedAt: PAST,
      },
    ]);
    const [item] = await fetchPublishedPosts({}, clientWith({ post: { findMany } }));
    expect(item).not.toHaveProperty('content');
    expect(item?.readingMinutes).toBe(4);
  });

  it('readingMinutes en az 1 — "0 dakika" gösterilmez', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'x',
        locale: 'tr',
        slug: 's',
        title: 'T',
        excerpt: 'E',
        cover: null,
        tags: [],
        readingMinutes: 0,
        publishedAt: PAST,
      },
    ]);
    const [item] = await fetchPublishedPosts({}, clientWith({ post: { findMany } }));
    expect(item?.readingMinutes).toBe(1);
  });

  it('BOŞ DURUM: boş dizi', async () => {
    const client = clientWith({ post: { findMany: vi.fn().mockResolvedValue([]) } });
    expect(await fetchPublishedPosts({}, client)).toEqual([]);
  });
});

describe('fetchPostBySlug — durum ayrımı ve readingMinutes', () => {
  const base = {
    id: 'x',
    locale: 'tr',
    slug: 's',
    title: 'T',
    excerpt: 'E',
    cover: null,
    tags: [],
    readingMinutes: 99,
  };
  const harness = (row: unknown) =>
    clientWith({ post: { findUnique: vi.fn().mockResolvedValue(row) } });

  it('ARCHIVED → GONE', async () => {
    const r = await fetchPostBySlug(
      's',
      { now: NOW },
      harness({ ...base, status: 'ARCHIVED', publishedAt: PAST, content: 'x' }),
    );
    expect(r.state).toBe('GONE');
  });

  it('DRAFT → NOT_FOUND', async () => {
    const r = await fetchPostBySlug(
      's',
      { now: NOW },
      harness({ ...base, status: 'DRAFT', publishedAt: null, content: 'x' }),
    );
    expect(r.state).toBe('NOT_FOUND');
  });

  it('SCHEDULED → NOT_FOUND', async () => {
    const r = await fetchPostBySlug(
      's',
      { now: NOW },
      harness({ ...base, status: 'SCHEDULED', publishedAt: FUTURE, content: 'x' }),
    );
    expect(r.state).toBe('NOT_FOUND');
  });

  it('readingMinutes DETAYDA yeniden hesaplanır — bayat sütuna güvenilmez', async () => {
    // Saklanan değer 99; içerik ~200 kelime → 1 dakika olmalı.
    const content = 'kelime '.repeat(200);
    const r = await fetchPostBySlug(
      's',
      { now: NOW },
      harness({ ...base, status: 'PUBLISHED', publishedAt: PAST, content }),
    );

    expect(r.state).toBe('FOUND');
    if (r.state !== 'FOUND') return;
    expect(r.data.readingMinutes).toBe(1);
    expect(r.data.readingMinutes).not.toBe(99);
  });
});

/* ============================ DİĞER SERVİSLER ============================ */

describe('fetchProfile — tekil (ADR-017)', () => {
  it('locale ile sorgular ve DTO döner', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'singleton',
      locale: 'tr',
      headline: 'H',
      subtitle: null,
      bio: 'B',
      location: null,
      availability: null,
      socials: { github: 'https://g' },
      avatar: attachment,
      cv: null,
    });
    const dto = await fetchProfile('tr', clientWith({ profile: { findUnique } }));

    expect(findUnique.mock.calls[0]?.[0].where).toEqual({ locale: 'tr' });
    expect(dto.headline).toBe('H');
    expect(dto.avatar?.key).toBe('projects/a.webp');
    expect(dto.cv).toBeNull();
  });

  it('BULUNAMAZSA FIRLATIR — sessiz null değil', async () => {
    // Profile seed ile açılan tekil kayıttır; yokluğu boş durum değil kurulum hatası.
    const client = clientWith({ profile: { findUnique: vi.fn().mockResolvedValue(null) } });
    await expect(fetchProfile('tr', client)).rejects.toThrow(/Profil kaydı bulunamadı/);
  });
});

describe('fetchSkills / fetchServices', () => {
  it('skills: order sonra name ile sıralı, boş durumda boş dizi', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const result = await fetchSkills('tr', clientWith({ skill: { findMany } }));

    expect(result).toEqual([]);
    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ order: 'asc' }, { name: 'asc' }]);
  });

  it('services: locale varsayılanı tr', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await fetchServices(undefined, clientWith({ service: { findMany } }));
    expect(findMany.mock.calls[0]?.[0].where.locale).toBe('tr');
  });
});

describe('fetchExperience', () => {
  it('@db.Date alanları AppDay olarak döner — ham Date GEÇMEZ (ADR-016)', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'e1',
        locale: 'tr',
        organization: 'Kıyı',
        role: 'Dev',
        type: 'WORK',
        startDate: new Date('2024-06-01T00:00:00Z'),
        endDate: new Date('2025-01-31T00:00:00Z'),
        current: false,
        description: null,
        order: 1,
      },
    ]);
    const [item] = await fetchExperience({}, clientWith({ experience: { findMany } }));

    expect(item?.startDate).toBe('2024-06-01');
    expect(item?.endDate).toBe('2025-01-31');
    expect(typeof item?.startDate).toBe('string');
  });

  it('devam eden kayıtta endDate null', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'e1',
        locale: 'tr',
        organization: 'K',
        role: 'D',
        type: 'WORK',
        startDate: new Date('2024-06-01T00:00:00Z'),
        endDate: null,
        current: true,
        description: null,
        order: 1,
      },
    ]);
    const [item] = await fetchExperience({}, clientWith({ experience: { findMany } }));
    expect(item?.endDate).toBeNull();
    expect(item?.current).toBe(true);
  });

  it('type ile süzülebilir, en yeni önce sıralı', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await fetchExperience({ type: 'EDUCATION' }, clientWith({ experience: { findMany } }));

    const args = findMany.mock.calls[0]?.[0];
    expect(args.where.type).toBe('EDUCATION');
    expect(args.orderBy).toEqual([{ startDate: 'desc' }, { order: 'asc' }]);
  });
});
