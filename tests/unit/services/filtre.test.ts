import { describe, expect, it } from 'vitest';

import type { PostListItemDto, ProjectListItemDto, SiteStatsDto } from '@/server/services';
import { filterPostList } from '@/server/services/post';
import { filterProjectList } from '@/server/services/project';

/**
 * T-030d — filtreli liste okumaları (K2) ve DTO sözleşmesi (K1).
 */

function project(over: Partial<ProjectListItemDto>): ProjectListItemDto {
  return {
    id: 'p',
    locale: 'tr',
    slug: 's',
    title: 'T',
    summary: 'S',
    cover: null,
    tags: [],
    stack: [],
    featured: false,
    order: 0,
    publishedAt: null,
    ...over,
  };
}

const CATALOG = [
  project({ id: '1', tags: ['cms', 'kurumsal'], stack: ['Next.js'], featured: true }),
  project({ id: '2', tags: ['saas'], stack: ['Next.js', 'Prisma'] }),
  project({ id: '3', tags: ['cms'], stack: ['TypeScript'] }),
];

/* ===================== KALEM 1 — DTO SÖZLEŞMESİ ========================== */

describe('SiteStatsDto content-dto üzerinden erişilebilir — T-023 talebi', () => {
  it('tek kaynaktan içe aktarılıyor ve şekli doğru', () => {
    // Derlenmesi yeterli kanıt: tip @/server/services'ten çözülüyor.
    const stats: SiteStatsDto = { experienceYears: 6, publishedProjects: 9 };
    expect(Object.keys(stats).sort()).toEqual(['experienceYears', 'publishedProjects']);
  });
});

/* ===================== KALEM 2 — SÜZME ================================== */

describe('filterProjectList', () => {
  it('filtresiz çağrı listeyi AYNEN döner', () => {
    expect(filterProjectList(CATALOG)).toHaveLength(3);
    expect(filterProjectList(CATALOG, {})).toEqual(CATALOG);
  });

  it('etikete göre süzer', () => {
    expect(filterProjectList(CATALOG, { tag: 'cms' }).map((p) => p.id)).toEqual(['1', '3']);
  });

  it('teknolojiye göre süzer', () => {
    expect(filterProjectList(CATALOG, { stack: 'Next.js' }).map((p) => p.id)).toEqual(['1', '2']);
  });

  it('etiket VE teknoloji birlikte — VE mantığı', () => {
    expect(filterProjectList(CATALOG, { tag: 'cms', stack: 'Next.js' }).map((p) => p.id)).toEqual([
      '1',
    ]);
    expect(filterProjectList(CATALOG, { tag: 'saas', stack: 'TypeScript' })).toEqual([]);
  });

  it('featuredOnly', () => {
    expect(filterProjectList(CATALOG, { featuredOnly: true }).map((p) => p.id)).toEqual(['1']);
    // featuredOnly:false SÜZMEZ — "öne çıkmayanlar" demek değil.
    expect(filterProjectList(CATALOG, { featuredOnly: false })).toHaveLength(3);
  });

  it('BİLİNMEYEN etiket → boş dizi, patlamaz (kullanıcı URL yazabilir)', () => {
    expect(filterProjectList(CATALOG, { tag: 'yok-boyle-bir-etiket' })).toEqual([]);
  });

  it('TAM eşleşme — Prisma `has` semantiğiyle aynı', () => {
    // Farklı davransaydı önbellekli ve önbelleksiz yollar farklı sonuç verirdi.
    expect(filterProjectList(CATALOG, { tag: 'CMS' })).toEqual([]);
    expect(filterProjectList(CATALOG, { tag: 'cm' })).toEqual([]);
  });

  it('boş girdi listesi → boş dizi', () => {
    expect(filterProjectList([], { tag: 'cms' })).toEqual([]);
  });

  it('girdi listesini DEĞİŞTİRMEZ — önbellekteki dizi paylaşılıyor', () => {
    // Aynı önbellek girdisi birden çok istek tarafından okunuyor; süzme onu
    // bozarsa sonraki istek eksik liste görür.
    const snapshot = JSON.parse(JSON.stringify(CATALOG)) as ProjectListItemDto[];
    filterProjectList(CATALOG, { tag: 'cms' });
    expect(CATALOG).toEqual(snapshot);
  });

  it('sıralamayı korur', () => {
    expect(filterProjectList(CATALOG, { stack: 'Next.js' }).map((p) => p.id)).toEqual(['1', '2']);
  });
});

describe('filterPostList', () => {
  const posts: PostListItemDto[] = [
    {
      id: '1',
      locale: 'tr',
      slug: 'a',
      title: 'A',
      excerpt: 'E',
      cover: null,
      tags: ['nextjs'],
      readingMinutes: 3,
      publishedAt: null,
    },
    {
      id: '2',
      locale: 'tr',
      slug: 'b',
      title: 'B',
      excerpt: 'E',
      cover: null,
      tags: ['react', 'nextjs'],
      readingMinutes: 5,
      publishedAt: null,
    },
  ];

  it('etikete göre süzer', () => {
    expect(filterPostList(posts, { tag: 'react' }).map((p) => p.id)).toEqual(['2']);
    expect(filterPostList(posts, { tag: 'nextjs' })).toHaveLength(2);
  });

  it('filtresiz aynen döner, bilinmeyen etiket boş', () => {
    expect(filterPostList(posts)).toEqual(posts);
    expect(filterPostList(posts, { tag: 'yok' })).toEqual([]);
  });
});
