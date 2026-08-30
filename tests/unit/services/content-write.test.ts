import { describe, expect, it, vi } from 'vitest';

import { createPostSchema, updatePostSchema } from '@/lib/schemas';
import { calculateReadingMinutes } from '@/server/services/_shared';
import {
  createExperience,
  deleteExperience,
  findExperienceSnapshot,
  updateExperience,
} from '@/server/services/experience';
import { archivePost, createPost, findPostSnapshot, updatePost } from '@/server/services/post';
import {
  archiveProject,
  createProject,
  findProjectSnapshot,
  updateProject,
} from '@/server/services/project';
import { findProfileSnapshot, upsertProfile } from '@/server/services/profile';
import { createSkill, deleteSkill, findSkillSnapshot, updateSkill } from '@/server/services/skill';
import {
  createService,
  deleteService,
  findServiceSnapshot,
  updateService,
} from '@/server/services/service';

/**
 * İÇERİK YAZMA SERVİSLERİ — T-031, §7.4.
 *
 * İSTEMCİ ENJEKTE EDİLİYOR (servis konvansiyonu kuralı 1): `pnpm test` DB'siz
 * koşar. Sınanan şey Prisma'nın davranışı değil, SERVİSİN ONA NE GÖNDERDİĞİ —
 * özellikle "hangi alanlar `data`ya giriyor" sorusu, çünkü kısmi güncellemede
 * fazladan bir alan sessiz veri kaybı demektir.
 */

const ID = 'clx0000000000000000000001';

function sahteIstemci(donen: Record<string, unknown>) {
  const create = vi.fn().mockResolvedValue(donen);
  const update = vi.fn().mockResolvedValue(donen);
  const upsert = vi.fn().mockResolvedValue(donen);
  const findUnique = vi.fn().mockResolvedValue(donen);
  const del = vi.fn().mockResolvedValue(donen);
  return { create, update, upsert, findUnique, delete: del };
}

const PROJE_SATIRI = {
  id: ID,
  locale: 'tr',
  slug: 'proje',
  title: 'Proje',
  status: 'DRAFT' as const,
  featured: false,
  order: 0,
  publishedAt: null,
};

const YAZI_SATIRI = {
  id: ID,
  locale: 'tr',
  slug: 'yazi',
  title: 'Yazı',
  status: 'DRAFT' as const,
  readingMinutes: 3,
  publishedAt: null,
};

/* ===========================================================================
 * KISMİ GÜNCELLEME — gönderilmeyen alana DOKUNULMAZ
 * ======================================================================== */

describe('kısmi güncelleme — sessiz veri kaybı yok', () => {
  it('yalnızca başlık gönderilince `data` YALNIZCA başlık taşır', async () => {
    const p = sahteIstemci(PROJE_SATIRI);
    await updateProject({ id: ID, title: 'Yeni Başlık' }, { project: p } as never);

    const data = p.update.mock.calls[0]?.[0].data as Record<string, unknown>;

    // `partialWithoutDefaults` olmasaydı burada `status: 'DRAFT'`, `tags: []`,
    // `featured: false` da olurdu — yayındaki bir projeyi taslağa düşürüp
    // etiketlerini silerdi. Kural şemada; burada SONUCU sınıyoruz.
    expect(Object.keys(data)).toEqual(['title']);
  });

  it('`null` ile `undefined` karıştırılmıyor — null TEMİZLER, undefined dokunmaz', async () => {
    const p = sahteIstemci(PROJE_SATIRI);
    await updateProject({ id: ID, clientName: undefined }, { project: p } as never);
    expect(p.update.mock.calls[0]?.[0].data).toEqual({});
  });

  it('skill kısmi güncellemesi de yalnızca gönderileni yazıyor', async () => {
    const s = sahteIstemci({
      id: ID,
      locale: 'tr',
      name: 'X',
      category: 'BACKEND',
      level: 50,
      iconKey: null,
      order: 0,
    });
    await updateSkill({ id: ID, level: 75 }, { skill: s } as never);

    expect(Object.keys(s.update.mock.calls[0]?.[0].data as object)).toEqual(['level']);
  });
});

/* ===========================================================================
 * readingMinutes — F2 BORCU (T-025 → T-028d → T-031)
 * ======================================================================== */

describe('readingMinutes — her yazımda YENİDEN hesaplanıyor', () => {
  /** ~600 kelime → 3 dakika (200 kelime/dk). */
  const UZUN_ICERIK = 'kelime '.repeat(600);

  it('ekleme: değer içerikten türüyor', async () => {
    const p = sahteIstemci(YAZI_SATIRI);
    await createPost(
      {
        locale: 'tr',
        slug: 'y',
        title: 'T',
        excerpt: 'E',
        content: UZUN_ICERIK,
        tags: [],
        status: 'DRAFT',
      },
      { post: p } as never,
    );

    const data = p.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.readingMinutes).toBe(calculateReadingMinutes(UZUN_ICERIK));
    expect(data.readingMinutes).toBe(3);
  });

  /**
   * ⚠️ KOLON İLE İÇERİK KASTEN AYRIŞTIRILMIŞ KAYIT.
   *
   * T-025'in kusuru tam olarak buydu: kolon bayatlıyor, okuma tarafı bunu
   * maskeliyordu. Burada kayıt `readingMinutes: 999` taşıyor ama içeriği 3
   * dakikalık. Güncelleme kolonu DÜZELTMELİ — 999'u korumamalı.
   */
  it('güncelleme: BAYAT kolon düzeltiliyor (999 → gerçek değer)', async () => {
    const p = sahteIstemci({ ...YAZI_SATIRI, readingMinutes: 999 });
    await updatePost({ id: ID, content: UZUN_ICERIK }, { post: p } as never);

    const data = p.update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.readingMinutes).toBe(3);
    expect(data.readingMinutes).not.toBe(999);
    // İçerik ve süre BİRLİKTE yazılıyor; ayrılmaları T-025'in kusuruydu.
    expect(data.content).toBe(UZUN_ICERIK);
  });

  it('içerik gönderilmediyse kolona DOKUNULMUYOR', async () => {
    const p = sahteIstemci(YAZI_SATIRI);
    await updatePost({ id: ID, title: 'Yalnızca başlık' }, { post: p } as never);

    const data = p.update.mock.calls[0]?.[0].data as Record<string, unknown>;
    // Kolon zaten mevcut içeriğe karşılık geliyor; körü körüne yazmak için
    // içeriği ayrıca okumak gerekirdi ve sonuç aynı olurdu.
    expect(data).not.toHaveProperty('readingMinutes');
  });

  /**
   * İSTEMCİDEN ALINMIYOR — YAPISAL GÜVENCE.
   *
   * `postBase` şemasında `readingMinutes` alanı HİÇ YOK, yani Zod onu bilinmeyen
   * anahtar olarak düşürüyor. Bu, ADR-014'ün `baseAmount` kuralının aynısı:
   * türetilmiş alan yalnızca sunucuda türetilir.
   */
  it('şema istemcinin gönderdiği readingMinutes’ı DÜŞÜRÜYOR', () => {
    const parsed = createPostSchema.parse({
      locale: 'tr',
      slug: 'y',
      title: 'T',
      excerpt: 'E',
      content: 'içerik',
      readingMinutes: 999,
    });
    expect(parsed).not.toHaveProperty('readingMinutes');

    const guncel = updatePostSchema.parse({ id: ID, readingMinutes: 999 });
    expect(guncel).not.toHaveProperty('readingMinutes');
  });

  it('istemci 999 göndermeye çalışsa bile servise ULAŞMIYOR', async () => {
    const p = sahteIstemci(YAZI_SATIRI);
    const parsed = createPostSchema.parse({
      locale: 'tr',
      slug: 'y',
      title: 'T',
      excerpt: 'E',
      content: UZUN_ICERIK,
      readingMinutes: 999,
    });
    await createPost(parsed, { post: p } as never);

    expect((p.create.mock.calls[0]?.[0].data as Record<string, unknown>).readingMinutes).toBe(3);
  });
});

/* ===========================================================================
 * ARŞİVLEME / SİLME
 * ======================================================================== */

describe('arşivleme — ADR-017/019', () => {
  it('archiveProject SİLMİYOR, durumu ARCHIVED yapıyor', async () => {
    const p = sahteIstemci({ ...PROJE_SATIRI, status: 'ARCHIVED' });
    await archiveProject(ID, { project: p } as never);

    expect(p.delete).not.toHaveBeenCalled();
    expect(p.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ID }, data: { status: 'ARCHIVED' } }),
    );
  });

  it('archivePost de aynı — slug korunuyor (410, 404 değil)', async () => {
    const p = sahteIstemci({ ...YAZI_SATIRI, status: 'ARCHIVED' });
    await archivePost(ID, { post: p } as never);

    expect(p.delete).not.toHaveBeenCalled();
    expect(p.update.mock.calls[0]?.[0].data).toEqual({ status: 'ARCHIVED' });
  });

  it('deleteSkill GERÇEKTEN siliyor ve silinen kaydı döndürüyor', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      name: 'Silinecek',
      category: 'BACKEND',
      level: 1,
      iconKey: null,
      order: 0,
    };
    const s = sahteIstemci(kayit);
    const sonuc = await deleteSkill(ID, { skill: s } as never);

    expect(s.delete).toHaveBeenCalledWith({ where: { id: ID } });
    // Dönen kayıt `AuditLog`a yazılıyor — silinen satırın TEK kalan izi.
    expect(sonuc).toMatchObject({ name: 'Silinecek' });
  });
});

/* ===========================================================================
 * PROFILE — tekil kayıt
 * ======================================================================== */

describe('upsertProfile — tekil kayıt (ADR-017)', () => {
  const PROFIL = {
    id: 'singleton',
    locale: 'tr',
    headline: 'Başlık',
    subtitle: null,
    bio: 'Bio',
    location: null,
    availability: null,
    socials: null,
    avatar: null,
    cv: null,
  };

  it('locale `where` anahtarı; kısmi alanlar `update` tarafına gidiyor', async () => {
    const p = sahteIstemci(PROFIL);
    await upsertProfile('tr', { headline: 'Yeni' }, { profile: p } as never);

    const args = p.upsert.mock.calls[0]?.[0] as Record<string, Record<string, unknown>>;
    expect(args.where).toEqual({ locale: 'tr' });
    expect(args.update).toEqual({ headline: 'Yeni' });
  });

  it('kayıt yoksa `create` zorunlu alanları taşıyor', async () => {
    const p = sahteIstemci(PROFIL);
    await upsertProfile('en', { headline: 'H', bio: 'B' }, { profile: p } as never);

    const args = p.upsert.mock.calls[0]?.[0] as Record<string, Record<string, unknown>>;
    expect(args.create).toMatchObject({ locale: 'en', headline: 'H', bio: 'B' });
  });
});

/* ===========================================================================
 * EXPERIENCE — ADR-016 gün dönüşümü
 * ======================================================================== */

describe('experience — AppDay ↔ Date sınırı (ADR-016)', () => {
  const SATIR = {
    id: ID,
    locale: 'tr',
    organization: 'Kurum',
    role: 'Rol',
    type: 'WORK' as const,
    startDate: new Date('2020-01-01T00:00:00.000Z'),
    endDate: null,
    current: true,
    description: null,
    order: 0,
  };

  it('AppDay girdi Prisma’ya `Date` olarak gidiyor', async () => {
    const e = sahteIstemci(SATIR);
    await createExperience(
      {
        locale: 'tr',
        organization: 'Kurum',
        role: 'Rol',
        type: 'WORK',
        startDate: '2020-01-01',
        current: true,
        order: 0,
      },
      { experience: e } as never,
    );

    const data = e.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.startDate).toBeInstanceOf(Date);
    expect((data.startDate as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });

  it('DTO çıkışında ham `Date` YOK — AppDay dizesi', async () => {
    const e = sahteIstemci(SATIR);
    const dto = await updateExperience({ id: ID, role: 'Yeni' }, { experience: e } as never);

    expect(dto.startDate).toBe('2020-01-01');
    expect(dto.endDate).toBeNull();
  });

  it('endDate `null` gönderilince TEMİZLENİYOR', async () => {
    const e = sahteIstemci(SATIR);
    await updateExperience({ id: ID, endDate: undefined }, { experience: e } as never);
    expect(e.update.mock.calls[0]?.[0].data).toEqual({});
  });
});

/* ===========================================================================
 * PROJECT — ekleme alanları
 * ======================================================================== */

describe('createProject — girdi eşlemesi', () => {
  it('opsiyonel alanlar `null` yazılıyor, `undefined` değil', async () => {
    const p = sahteIstemci(PROJE_SATIRI);
    await createProject(
      {
        locale: 'tr',
        slug: 'proje',
        title: 'P',
        summary: 'S',
        content: 'C',
        tags: [],
        stack: [],
        featured: false,
        order: 0,
        status: 'DRAFT',
      },
      { project: p } as never,
    );

    const data = p.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    // Prisma `undefined`ı "alanı atla" diye yorumlar; `null` açıkça "boş".
    expect(data.liveUrl).toBeNull();
    expect(data.coverAttachmentId).toBeNull();
    expect(data.publishedAt).toBeNull();
  });

  it('publishedAt ISO dizesi `Date`e çevriliyor', async () => {
    const p = sahteIstemci(PROJE_SATIRI);
    await createProject(
      {
        locale: 'tr',
        slug: 'proje',
        title: 'P',
        summary: 'S',
        content: 'C',
        tags: [],
        stack: [],
        featured: false,
        order: 0,
        status: 'PUBLISHED',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
      { project: p } as never,
    );

    expect(
      (p.create.mock.calls[0]?.[0].data as Record<string, unknown>).publishedAt,
    ).toBeInstanceOf(Date);
  });
});

/* ===========================================================================
 * ALTI VARLIĞIN TAMAMI — kalıp gerçekten çoğaltıldı mı
 *
 * Bu blok "kapsam için kapsam" değil: T-031'in vaadi ALTI varlığın AYNI kalıbı
 * izlemesi. Yalnızca `Project`i sınamak, beş kopyadan birinde eşleme hatası
 * olmasını görünmez bırakırdı — ve kopyala-yapıştır tam olarak orada kayar.
 * ======================================================================== */

describe('service servisi — yazma eşlemesi', () => {
  const SATIR = {
    id: ID,
    locale: 'tr',
    title: 'Hizmet',
    description: 'Açıklama',
    iconKey: null,
    ctaUrl: null,
    order: 0,
  };

  it('ekleme: opsiyoneller `null`', async () => {
    const c = sahteIstemci(SATIR);
    await createService({ locale: 'tr', title: 'Hizmet', description: 'Açıklama', order: 0 }, {
      service: c,
    } as never);

    const data = c.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data).toMatchObject({ title: 'Hizmet', iconKey: null, ctaUrl: null });
  });

  it('güncelleme kısmi', async () => {
    const c = sahteIstemci(SATIR);
    await updateService({ id: ID, order: 5 }, { service: c } as never);
    expect(Object.keys(c.update.mock.calls[0]?.[0].data as object)).toEqual(['order']);
  });

  it('silme gerçek silme', async () => {
    const c = sahteIstemci(SATIR);
    await deleteService(ID, { service: c } as never);
    expect(c.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('anlık görüntü yoksa `null`', async () => {
    const c = sahteIstemci(SATIR);
    c.findUnique.mockResolvedValue(null);
    expect(await findServiceSnapshot(ID, { service: c } as never)).toBeNull();
  });
});

describe('skill / experience / profile — anlık görüntü ve ekleme', () => {
  it('createSkill alanları eşliyor', async () => {
    const s = sahteIstemci({
      id: ID,
      locale: 'tr',
      name: 'TS',
      category: 'BACKEND',
      level: 90,
      iconKey: null,
      order: 0,
    });
    await createSkill({ locale: 'tr', name: 'TS', category: 'BACKEND', level: 90, order: 0 }, {
      skill: s,
    } as never);
    expect(s.create.mock.calls[0]?.[0].data).toMatchObject({
      name: 'TS',
      level: 90,
      iconKey: null,
    });
  });

  it('findSkillSnapshot yoksa `null`', async () => {
    const s = sahteIstemci({});
    s.findUnique.mockResolvedValue(null);
    expect(await findSkillSnapshot(ID, { skill: s } as never)).toBeNull();
  });

  it('findExperienceSnapshot DTO döndürüyor (ham Date değil)', async () => {
    const e = sahteIstemci({
      id: ID,
      locale: 'tr',
      organization: 'K',
      role: 'R',
      type: 'WORK',
      startDate: new Date('2021-06-01T00:00:00.000Z'),
      endDate: new Date('2022-06-01T00:00:00.000Z'),
      current: false,
      description: null,
      order: 0,
    });
    const dto = await findExperienceSnapshot(ID, { experience: e } as never);
    expect(dto).toMatchObject({ startDate: '2021-06-01', endDate: '2022-06-01' });
  });

  it('deleteExperience gerçek silme', async () => {
    const e = sahteIstemci({
      id: ID,
      locale: 'tr',
      organization: 'K',
      role: 'R',
      type: 'WORK',
      startDate: new Date('2021-06-01T00:00:00.000Z'),
      endDate: null,
      current: true,
      description: null,
      order: 0,
    });
    await deleteExperience(ID, { experience: e } as never);
    expect(e.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('findProfileSnapshot yoksa `null` — `fetchProfile` gibi FIRLATMAZ', async () => {
    // Okuma tarafı yokluğu kurulum hatası sayar ve fırlatır; YAZMA tarafı
    // sayamaz, çünkü `upsert` zaten kaydı açacak. İki farklı soru.
    const p = sahteIstemci({});
    p.findUnique.mockResolvedValue(null);
    expect(await findProfileSnapshot('tr', { profile: p } as never)).toBeNull();
  });

  it('findProjectSnapshot / findPostSnapshot yoksa `null`', async () => {
    const p = sahteIstemci({});
    p.findUnique.mockResolvedValue(null);
    expect(await findProjectSnapshot(ID, { project: p } as never)).toBeNull();
    expect(await findPostSnapshot(ID, { post: p } as never)).toBeNull();
  });
});
