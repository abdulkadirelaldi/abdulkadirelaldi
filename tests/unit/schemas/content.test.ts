import { describe, expect, it } from 'vitest';

import {
  createExperienceSchema,
  createPostSchema,
  createProfileSchema,
  createProjectSchema,
  createServiceSchema,
  createSkillSchema,
  postFilterSchema,
  projectFilterSchema,
  socialsSchema,
  updateExperienceSchema,
  updatePostSchema,
  updateProfileSchema,
  updateProjectSchema,
  updateServiceSchema,
  updateSkillSchema,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';

describe('createProjectSchema', () => {
  const valid = {
    slug: 'kiyi-medya-sitesi',
    title: 'Kıyı Medya',
    summary: 'Özet',
    content: '# MDX',
  };

  it('geçerli proje kabul eder, locale varsayılanı tr', () => {
    const parsed = createProjectSchema.parse(valid);
    expect(parsed.locale).toBe('tr');
    expect(parsed.status).toBe('DRAFT');
  });

  it('Türkçe karakterli slug reddeder', () => {
    expect(createProjectSchema.safeParse({ ...valid, slug: 'kıyı-medya' }).success).toBe(false);
  });

  it('SCHEDULED yayın tarihi olmadan reddedilir (ADR-019)', () => {
    const result = createProjectSchema.safeParse({ ...valid, status: 'SCHEDULED' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['publishedAt']);
  });

  it('SCHEDULED + tarih geçerli', () => {
    expect(
      createProjectSchema.safeParse({
        ...valid,
        status: 'SCHEDULED',
        publishedAt: '2026-12-01T09:00:00Z',
      }).success,
    ).toBe(true);
  });

  it('dört yayın durumunu da tanır', () => {
    for (const status of ['DRAFT', 'PUBLISHED', 'ARCHIVED']) {
      expect(createProjectSchema.safeParse({ ...valid, status }).success, status).toBe(true);
    }
  });
});

describe('updateProjectSchema', () => {
  it('kısmi güncelleme id ile', () => {
    expect(updateProjectSchema.safeParse({ id: ID, title: 'Yeni' }).success).toBe(true);
  });
  it('id olmadan reddeder', () => {
    expect(updateProjectSchema.safeParse({ title: 'Yeni' }).success).toBe(false);
  });
});

describe('createPostSchema', () => {
  const valid = { slug: 'ilk-yazi', title: 'İlk yazı', excerpt: 'Özet', content: 'Gövde' };

  it('geçerli yazı kabul eder', () => {
    expect(createPostSchema.safeParse(valid).success).toBe(true);
  });

  it('boş içerik reddeder', () => {
    expect(createPostSchema.safeParse({ ...valid, content: '' }).success).toBe(false);
  });

  it('viewCount ve readingMinutes istemciden alınmaz (ADR-019)', () => {
    const parsed = createPostSchema.parse({ ...valid, viewCount: 9999, readingMinutes: 99 });
    expect(parsed).not.toHaveProperty('viewCount');
    expect(parsed).not.toHaveProperty('readingMinutes');
  });
});

describe('updatePostSchema', () => {
  it('geçerli kısmi güncelleme', () => {
    expect(updatePostSchema.safeParse({ id: ID, status: 'PUBLISHED' }).success).toBe(true);
  });
  it('geçersiz durum reddeder', () => {
    expect(updatePostSchema.safeParse({ id: ID, status: 'TASLAK' }).success).toBe(false);
  });
});

describe('socialsSchema — serbest Json değil', () => {
  it('bilinen anahtarları kabul eder', () => {
    expect(socialsSchema.safeParse({ github: 'https://github.com/x' }).success).toBe(true);
  });

  it('BİLİNMEYEN anahtarı reddeder — yazım hatası sessizce düşmesin', () => {
    expect(socialsSchema.safeParse({ githbu: 'https://github.com/x' }).success).toBe(false);
  });

  it('geçersiz URL reddeder', () => {
    expect(socialsSchema.safeParse({ github: 'github.com/x' }).success).toBe(false);
  });
});

describe('Profile', () => {
  const valid = { headline: 'Full Stack Developer', bio: 'Biyografi' };
  it('geçerli profil', () => {
    expect(createProfileSchema.safeParse(valid).success).toBe(true);
  });
  it('başlıksız reddeder', () => {
    expect(createProfileSchema.safeParse({ bio: 'x' }).success).toBe(false);
  });
  it('kısmi güncelleme', () => {
    expect(updateProfileSchema.safeParse({ location: 'İstanbul' }).success).toBe(true);
  });
});

describe('Skill', () => {
  const valid = { name: 'TypeScript', category: 'FRONTEND', level: 90 };
  it('geçerli yetenek', () => {
    expect(createSkillSchema.safeParse(valid).success).toBe(true);
  });
  it('level 100 üstü reddeder', () => {
    expect(createSkillSchema.safeParse({ ...valid, level: 101 }).success).toBe(false);
  });
  it('geçersiz kategori reddeder', () => {
    expect(createSkillSchema.safeParse({ ...valid, category: 'FULLSTACK' }).success).toBe(false);
  });
  it('kısmi güncelleme', () => {
    expect(updateSkillSchema.safeParse({ id: ID, level: 50 }).success).toBe(true);
  });
});

describe('Service', () => {
  it('geçerli hizmet', () => {
    expect(createServiceSchema.safeParse({ title: 'Web', description: 'Açıklama' }).success).toBe(
      true,
    );
  });
  it('açıklamasız reddeder', () => {
    expect(createServiceSchema.safeParse({ title: 'Web' }).success).toBe(false);
  });
  it('geçersiz ctaUrl reddeder', () => {
    expect(
      createServiceSchema.safeParse({ title: 'W', description: 'A', ctaUrl: 'kiyimedya' }).success,
    ).toBe(false);
  });
  it('kısmi güncelleme', () => {
    expect(updateServiceSchema.safeParse({ id: ID, order: 3 }).success).toBe(true);
  });
});

describe('Experience', () => {
  const valid = {
    organization: 'Kıyı Medya',
    role: 'Developer',
    type: 'WORK',
    startDate: '2024-01-01',
  };

  it('geçerli deneyim', () => {
    expect(createExperienceSchema.safeParse(valid).success).toBe(true);
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    const r = createExperienceSchema.safeParse({ ...valid, endDate: '2023-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['endDate']);
  });

  it('devam eden kayda bitiş tarihi girilemez', () => {
    expect(
      createExperienceSchema.safeParse({ ...valid, current: true, endDate: '2026-01-01' }).success,
    ).toBe(false);
  });

  it('kısmi güncelleme', () => {
    expect(updateExperienceSchema.safeParse({ id: ID, role: 'Senior Developer' }).success).toBe(
      true,
    );
  });
});

describe('içerik filtreleri', () => {
  it('proje filtresi etiket ve durumu çözer', () => {
    const parsed = projectFilterSchema.parse({ status: 'PUBLISHED', tag: 'nextjs', page: '2' });
    expect(parsed.page).toBe(2);
    expect(parsed.tag).toBe('nextjs');
  });
  it('yazı filtresi geçersiz durumu reddeder', () => {
    expect(postFilterSchema.safeParse({ status: 'YAYINDA' }).success).toBe(false);
  });
});
