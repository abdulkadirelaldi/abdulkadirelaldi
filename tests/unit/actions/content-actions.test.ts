import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { localeTag, slugTag } from '@/server/services/_shared/content-cache';
import type { ApiResponse } from '@/types';

/**
 * İÇERİK SERVER ACTION'LARI — T-031, §7.1 / §8.6 / §8.8 / §8.19 / ADR-029.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE TAKLİT EDİLİYOR VE NEDEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   `@/server/auth`    → `next-auth` Vitest'in `node` ortamında YÜKLENEMİYOR
 *                        (`next/server` çözülmüyor). Ayrıca sınanan şey
 *                        oturumun nasıl çözüldüğü değil, VARLIĞINA göre
 *                        action'ın ne yaptığı.
 *   `next/cache`       → `revalidateTag` çağrılarını YAKALAMAK için. ADR-029
 *                        ihlalleri tam olarak "etiket düşürülmedi" biçiminde
 *                        ortaya çıkıyor; başka türlü gözlenemez.
 *   servis modülleri   → `pnpm test` DB'siz koşar (vitest.config.ts).
 *   `@/server/db`      → `writeAuditLog`'a geçirilen istemci.
 *
 * `writeAuditLog` TAKLİT EDİLMİYOR: §8.19 "denetim kaydı yazılıyor mu" sorusu
 * onun gerçek davranışıyla — redaksiyon dahil — sınanmalı. Onun yerine
 * `db.auditLog.create` taklit ediliyor, yani yazılan SATIR gözleniyor.
 */

const auth = vi.hoisted(() => vi.fn());
const revalidateTag = vi.hoisted(() => vi.fn());
const auditCreate = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth', () => ({ auth }));
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: vi.fn() }));
const userFindUnique = vi.hoisted(() => vi.fn());
vi.mock('@/server/db', () => ({
  db: { auditLog: { create: auditCreate }, user: { findUnique: userFindUnique } },
}));
/*
 * ADR-035/B — YAZMA KAPISI (T-046).
 *
 * `currentActorId()` artık `writesRevoked()` çağırıyor, yani her Server Action
 * `user.findUnique` ile `writesValidFrom` okuyor. İki şey taklide eklendi:
 *
 *   - `db.user.findUnique` → `{ writesValidFrom: null }` ("hiç geçersizleştirilmedi")
 *   - oturuma `tokenIssuedAt` → kapı FAIL-CLOSED; `iat` taşımayan bir oturum
 *     yazma yetkisiz sayılıyor. Bu kasıtlı ve `yazma-kapisi.test.ts` ölçüyor.
 */

const svc = vi.hoisted(() => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  findProjectSnapshot: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  archivePost: vi.fn(),
  findPostSnapshot: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  findSkillSnapshot: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
  findServiceSnapshot: vi.fn(),
  createExperience: vi.fn(),
  updateExperience: vi.fn(),
  deleteExperience: vi.fn(),
  findExperienceSnapshot: vi.fn(),
  upsertProfile: vi.fn(),
  findProfileSnapshot: vi.fn(),
}));

vi.mock('@/server/services/project', () => svc);
vi.mock('@/server/services/post', () => svc);
vi.mock('@/server/services/skill', () => svc);
vi.mock('@/server/services/service', () => svc);
vi.mock('@/server/services/experience', () => svc);
vi.mock('@/server/services/profile', () => svc);

const ID = 'clx0000000000000000000001';

/** Oturum var. */
function oturumVar(): void {
  auth.mockResolvedValue({ user: { id: 'kullanici-1' }, tokenIssuedAt: OTURUM_IAT });
}

/** Düşürülen etiketler — çağrı sırası önemsiz, KÜME karşılaştırılıyor. */
function dusenEtiketler(): string[] {
  return revalidateTag.mock.calls.map((c) => c[0] as string).sort();
}

/** `AuditLog`a yazılan tek satır. */
function denetimKaydi(): Record<string, unknown> {
  expect(auditCreate).toHaveBeenCalledOnce();
  return (auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
}

/** Jetonun verildiği an — yazma kapısının eşiği (ADR-035/B). */
const OTURUM_IAT = Math.floor(Date.parse('2026-09-20T12:00:00.000Z') / 1000);

beforeEach(() => {
  userFindUnique.mockResolvedValue({ writesValidFrom: null });
  oturumVar();
  auditCreate.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/* ===========================================================================
 * §8.6 — HER ACTION KENDİ auth() KONTROLÜNÜ YAPAR
 * ======================================================================== */

describe('§8.6 — yetkisiz erişim', () => {
  /**
   * On altı eylemin HEPSİ tek tek sınanıyor.
   *
   * Tek bir örnek eylemi sınamak yetmez: §8.6'nın ihlali tam olarak "bir
   * action'da `auth()` yazılmayı unuttu" biçiminde ortaya çıkar ve o action
   * örneklenen olmayabilir. Liste, eylem dosyalarının ihracatından TÜRETİLİYOR
   * (aşağıdaki "eksiksizlik" testi), yani yeni bir eylem eklendiğinde burası
   * kendiliğinden kapsıyor.
   */
  const eylemler = async () => {
    const [project, post, skill, service, experience, profile] = await Promise.all([
      import('@/server/actions/project'),
      import('@/server/actions/post'),
      import('@/server/actions/skill'),
      import('@/server/actions/service'),
      import('@/server/actions/experience'),
      import('@/server/actions/profile'),
    ]);
    return { ...project, ...post, ...skill, ...service, ...experience, ...profile };
  };

  it('oturum YOKSA hepsi UNAUTHORIZED döner ve servise HİÇ gitmez', async () => {
    auth.mockResolvedValue(null);
    const hepsi = await eylemler();

    for (const [ad, eylem] of Object.entries(hepsi)) {
      const sonuc = (await (eylem as (raw: unknown) => Promise<ApiResponse<unknown>>)({})) as {
        ok: boolean;
        error?: { code: string };
      };
      expect(sonuc.ok, `${ad} oturumsuz geçirdi`).toBe(false);
      expect(sonuc.error?.code, `${ad} yanlış kod döndü`).toBe('UNAUTHORIZED');
    }

    // Yetki kapısı Zod'DAN ÖNCE: hiçbir servis ve denetim kaydı çalışmadı.
    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('oturum var ama `user.id` yoksa yine UNAUTHORIZED', async () => {
    // Jeton bozuksa veya `id` claim'i düşmüşse "oturum var" saymak, kimliksiz
    // bir mutasyonu `actorId: undefined` ile denetim kaydına yazardı.
    auth.mockResolvedValue({ user: {}, tokenIssuedAt: OTURUM_IAT });
    const { createSkillAction } = await import('@/server/actions/skill');
    expect((await createSkillAction({})).ok).toBe(false);
  });

  it('on altı eylemin tamamı listede — kapsam eksiksiz', async () => {
    // 5 varlık × 3 (ekle/güncelle/arşivle|sil) + `Profile`ın tek eylemi.
    // Sayı sabit yazılıyor ki yeni bir eylem eklendiğinde bu test kırılsın ve
    // yazan kişi §8.6 kapsamını genişletmeyi UNUTAMASIN.
    expect(Object.keys(await eylemler())).toHaveLength(16);
  });
});

/* ===========================================================================
 * PROJECT — referans uygulama, üç boyut birden
 * ======================================================================== */

describe('createProjectAction', () => {
  const govde = {
    locale: 'tr',
    slug: 'yeni-proje',
    title: 'Yeni Proje',
    summary: 'Özet',
    content: 'MDX içerik',
  };

  it('geçersiz girdi → VALIDATION_ERROR, servise gitmez (§8.8)', async () => {
    const { createProjectAction } = await import('@/server/actions/project');
    const sonuc = await createProjectAction({ ...govde, slug: 'Geçersiz Slug!' });

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.error.fields?.slug).toBeTruthy();
    expect(svc.createProject).not.toHaveBeenCalled();
  });

  it('başarı → ok(dto), AuditLog CREATE, doğru etiketler', async () => {
    svc.createProject.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'yeni-proje',
      status: 'DRAFT',
      publishedAt: null,
    });

    const { createProjectAction } = await import('@/server/actions/project');
    const sonuc = await createProjectAction(govde);

    expect(sonuc.ok).toBe(true);

    const kayit = denetimKaydi();
    expect(kayit).toMatchObject({
      actorId: 'kullanici-1',
      action: 'CREATE',
      entity: 'Project',
      entityId: ID,
    });

    /*
     * EKLEMEDE SLUG ETİKETİ DE DÜŞÜYOR.
     * `getProjectBySlug` olumsuz sonucu (404) ÖNBELLEKLER; slug daha önce
     * ziyaret edildiyse yalnızca `localeTag` düşürmek "listede var, tıklayınca
     * yok" üretirdi.
     */
    expect(dusenEtiketler()).toEqual(
      [localeTag('project', 'tr'), slugTag('project', 'tr', 'yeni-proje')].sort(),
    );
  });

  it('MDX içerik denetim kaydına GİRMİYOR — log şişmesin', async () => {
    svc.createProject.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 's',
      status: 'DRAFT',
      publishedAt: null,
    });
    const { createProjectAction } = await import('@/server/actions/project');
    await createProjectAction({ ...govde, content: 'ÇOK-UZUN-MDX-GÖVDESİ' });

    expect(JSON.stringify(denetimKaydi())).not.toContain('ÇOK-UZUN-MDX-GÖVDESİ');
  });

  it('slug çakışması → CONFLICT (INTERNAL_ERROR değil)', async () => {
    // Kullanıcının DÜZELTEBİLECEĞİ bir hata; "bir şeyler ters gitti" demek onu gizlerdi.
    svc.createProject.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

    const { createProjectAction } = await import('@/server/actions/project');
    const sonuc = await createProjectAction(govde);

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.error.fields?.slug).toBeTruthy();
  });

  it('beklenmeyen hata → INTERNAL_ERROR, ayrıntı SIZMIYOR (§8.20)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    svc.createProject.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5433'));

    const { createProjectAction } = await import('@/server/actions/project');
    const sonuc = await createProjectAction(govde);

    expect(JSON.stringify(sonuc)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(sonuc)).not.toContain('5433');
  });
});

describe('updateProjectAction — ADR-029 eski/yeni', () => {
  beforeEach(() => {
    svc.findProjectSnapshot.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'eski-slug',
      title: 'Eski',
      status: 'DRAFT',
      featured: false,
      order: 0,
      publishedAt: null,
    });
  });

  it('kayıt yoksa NOT_FOUND — güncelleme denenmez', async () => {
    svc.findProjectSnapshot.mockResolvedValue(null);
    const { updateProjectAction } = await import('@/server/actions/project');
    const sonuc = await updateProjectAction({ id: ID, title: 'X' });

    expect(sonuc.ok).toBe(false);
    expect(svc.updateProject).not.toHaveBeenCalled();
  });

  it('SLUG DEĞİŞTİ → ESKİ slug etiketi de düşüyor', async () => {
    svc.updateProject.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'yeni-slug',
      status: 'DRAFT',
      publishedAt: null,
    });

    const { updateProjectAction } = await import('@/server/actions/project');
    await updateProjectAction({ id: ID, slug: 'yeni-slug' });

    expect(dusenEtiketler()).toEqual(
      [
        localeTag('project', 'tr'),
        slugTag('project', 'tr', 'eski-slug'),
        slugTag('project', 'tr', 'yeni-slug'),
      ].sort(),
    );
  });

  it('DİL DEĞİŞTİ → ESKİ dilin listesi de düşüyor', async () => {
    svc.updateProject.mockResolvedValue({
      id: ID,
      locale: 'en',
      slug: 'eski-slug',
      status: 'DRAFT',
      publishedAt: null,
    });

    const { updateProjectAction } = await import('@/server/actions/project');
    await updateProjectAction({ id: ID, locale: 'en' });

    const tags = dusenEtiketler();
    expect(tags).toContain(localeTag('project', 'tr'));
    expect(tags).toContain(localeTag('project', 'en'));
  });

  /**
   * ⚠️ ADR-029'UN EN PAHALI MADDESİ.
   *
   * `DRAFT→PUBLISHED` hem listeyi hem `getSiteStats`i değiştirir; ikisi de
   * `localeTag` taşır. Yalnızca `slugTag` düşürmek `publishedProjects`i VE
   * istatistiği bir saat bayat bırakırdı — "bazen çalışan" hata.
   */
  it('DURUM DEĞİŞTİ (DRAFT→PUBLISHED) → localeTag MUTLAKA düşüyor', async () => {
    svc.updateProject.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'eski-slug',
      status: 'PUBLISHED',
      publishedAt: '2026-01-01T00:00:00.000Z',
    });

    const { updateProjectAction } = await import('@/server/actions/project');
    await updateProjectAction({ id: ID, status: 'PUBLISHED' });

    expect(dusenEtiketler()).toContain(localeTag('project', 'tr'));
    expect(denetimKaydi()).toMatchObject({ action: 'UPDATE' });
  });
});

describe('archiveProjectAction — SİLME YOK (ADR-017/019)', () => {
  it('ARCHIVE eylemi yazılıyor ve durum ARCHIVED', async () => {
    svc.findProjectSnapshot.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'proje',
      title: 'P',
      status: 'PUBLISHED',
      featured: false,
      order: 0,
      publishedAt: null,
    });
    svc.archiveProject.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'proje',
      status: 'ARCHIVED',
      publishedAt: null,
    });

    const { archiveProjectAction } = await import('@/server/actions/project');
    const sonuc = await archiveProjectAction({ id: ID });

    expect(sonuc.ok).toBe(true);
    // `UPDATE` değil `ARCHIVE`: kullanıcı için bu "sil" düğmesidir ve denetim
    // kaydında öyle görünmelidir.
    expect(denetimKaydi()).toMatchObject({ action: 'ARCHIVE', entity: 'Project' });

    // Durum değişikliği → liste, istatistik ve kaydın kendi sayfası (200→410).
    expect(dusenEtiketler()).toEqual(
      [localeTag('project', 'tr'), slugTag('project', 'tr', 'proje')].sort(),
    );
  });

  it('geçersiz id → VALIDATION_ERROR (§8.8 action parametreleri dahil)', async () => {
    const { archiveProjectAction } = await import('@/server/actions/project');
    const sonuc = await archiveProjectAction({ id: '' });

    expect(sonuc.ok).toBe(false);
    expect(svc.archiveProject).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * POST
 * ======================================================================== */

describe('post action’ları', () => {
  it('ekleme başarılı, etiketler post uzayında', async () => {
    svc.createPost.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'yazi',
      status: 'DRAFT',
      publishedAt: null,
    });

    const { createPostAction } = await import('@/server/actions/post');
    const sonuc = await createPostAction({
      locale: 'tr',
      slug: 'yazi',
      title: 'Yazı',
      excerpt: 'Özet',
      content: 'İçerik',
    });

    expect(sonuc.ok).toBe(true);
    expect(dusenEtiketler()).toEqual(
      [localeTag('post', 'tr'), slugTag('post', 'tr', 'yazi')].sort(),
    );
    expect(denetimKaydi()).toMatchObject({ entity: 'Post', action: 'CREATE' });
  });

  it('readingMinutes İSTEMCİDEN GEÇMİYOR — şema onu düşürüyor', async () => {
    svc.createPost.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'y',
      status: 'DRAFT',
      publishedAt: null,
    });

    const { createPostAction } = await import('@/server/actions/post');
    await createPostAction({
      locale: 'tr',
      slug: 'y',
      title: 'T',
      excerpt: 'E',
      content: 'İçerik',
      readingMinutes: 999,
    });

    // Servise geçen girdide böyle bir alan YOK; olsaydı istemci okuma süresini
    // dilediği gibi belirlerdi (ADR-014'ün `baseAmount` kuralının ihlali).
    expect(svc.createPost.mock.calls[0]?.[0]).not.toHaveProperty('readingMinutes');
  });

  it('arşivleme ARCHIVE yazıyor', async () => {
    svc.findPostSnapshot.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'y',
      title: 'T',
      status: 'PUBLISHED',
      readingMinutes: 3,
      publishedAt: null,
    });
    svc.archivePost.mockResolvedValue({
      id: ID,
      locale: 'tr',
      slug: 'y',
      status: 'ARCHIVED',
      publishedAt: null,
    });

    const { archivePostAction } = await import('@/server/actions/post');
    expect((await archivePostAction({ id: ID })).ok).toBe(true);
    expect(denetimKaydi()).toMatchObject({ action: 'ARCHIVE', entity: 'Post' });
  });
});

/* ===========================================================================
 * SKILL / SERVICE / EXPERIENCE — slug yok, durum yok, GERÇEK SİLME
 * ======================================================================== */

describe('slug’sız varlıklar — yalnızca localeTag', () => {
  it('createSkillAction slug etiketi ÜRETMİYOR', async () => {
    svc.createSkill.mockResolvedValue({
      id: ID,
      locale: 'tr',
      name: 'TypeScript',
      category: 'BACKEND',
      level: 90,
      iconKey: null,
      order: 0,
    });

    const { createSkillAction } = await import('@/server/actions/skill');
    const sonuc = await createSkillAction({
      locale: 'tr',
      name: 'TypeScript',
      category: 'BACKEND',
      level: 90,
    });

    expect(sonuc.ok).toBe(true);
    expect(dusenEtiketler()).toEqual([localeTag('skill', 'tr')]);
  });

  it('geçersiz level (0–100 dışı) → VALIDATION_ERROR', async () => {
    const { createSkillAction } = await import('@/server/actions/skill');
    const sonuc = await createSkillAction({
      locale: 'tr',
      name: 'X',
      category: 'BACKEND',
      level: 150,
    });

    expect(sonuc.ok).toBe(false);
    expect(svc.createSkill).not.toHaveBeenCalled();
  });

  /**
   * SİLME GERÇEK SİLMEDİR ve tarih `AuditLog`a taşınır.
   *
   * ADR-017'nin yasağı REFERANS VERİLER içindir (§6.1: `TransactionCategory`,
   * `Exercise`, `Client`, `Habit`) ve gerekçesi bağlı FK'lerdir. `Skill`e
   * hiçbir model FK ile bağlı değil, public adresi yok, `ContentStatus` yok.
   */
  /**
   * DEĞİŞTİ (T-046/BULGU-019) — eskiden "SİLİNEN SATIRIN TAMAMINI saklıyor"
   * diyordu ve `diff` tam olarak `{ deleted: <satırın tamamı> }`a eşitleniyordu.
   * O assert, alan seçimini modele devreden kalıbı SABİTLİYORDU. Artık alanlar
   * tek tek sayılıyor; "ne kayboldu" sorusu hâlâ cevaplanıyor ama seçim AÇIK.
   */
  it('deleteSkillAction DELETE yazıyor ve silinen kaydı SAYILAN ALANLARLA saklıyor', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      name: 'Silinecek',
      category: 'BACKEND',
      level: 42,
      iconKey: 'ts',
      order: 3,
    };
    svc.findSkillSnapshot.mockResolvedValue(kayit);
    svc.deleteSkill.mockResolvedValue(kayit);

    const { deleteSkillAction } = await import('@/server/actions/skill');
    expect((await deleteSkillAction({ id: ID })).ok).toBe(true);

    const log = denetimKaydi();
    expect(log).toMatchObject({ action: 'DELETE', entity: 'Skill' });
    // `buildDiff(before, {})` boş fark üretirdi; burada saklanmak istenen
    // "ne değişti" değil "NE KAYBOLDU" — denetim kaydı tek kalan izdir.
    expect(log.diff).toEqual({
      deleted: {
        name: kayit.name,
        category: kayit.category,
        level: kayit.level,
        locale: kayit.locale,
        order: kayit.order,
      },
    });
  });

  it('deleteServiceAction DELETE yazıyor', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      title: 'Hizmet',
      description: 'D',
      iconKey: null,
      ctaUrl: null,
      order: 0,
    };
    svc.findServiceSnapshot.mockResolvedValue(kayit);
    svc.deleteService.mockResolvedValue(kayit);

    const { deleteServiceAction } = await import('@/server/actions/service');
    expect((await deleteServiceAction({ id: ID })).ok).toBe(true);
    expect(denetimKaydi()).toMatchObject({ action: 'DELETE', entity: 'Service' });
    expect(dusenEtiketler()).toEqual([localeTag('service', 'tr')]);
  });

  it('deleteExperienceAction DELETE yazıyor', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      organization: 'Kurum',
      role: 'Rol',
      type: 'WORK',
      startDate: '2020-01-01',
      endDate: null,
      current: true,
      description: null,
      order: 0,
    };
    svc.findExperienceSnapshot.mockResolvedValue(kayit);
    svc.deleteExperience.mockResolvedValue(kayit);

    const { deleteExperienceAction } = await import('@/server/actions/experience');
    expect((await deleteExperienceAction({ id: ID })).ok).toBe(true);
    expect(denetimKaydi()).toMatchObject({ action: 'DELETE', entity: 'Experience' });
  });

  it('experience çapraz kuralı şemadan geliyor — burada YENİDEN YAZILMADI', async () => {
    const { createExperienceAction } = await import('@/server/actions/experience');
    // "Devam ediyor" işaretliyken bitiş tarihi olamaz (T-011).
    const sonuc = await createExperienceAction({
      locale: 'tr',
      organization: 'K',
      role: 'R',
      type: 'WORK',
      startDate: '2020-01-01',
      endDate: '2021-01-01',
      current: true,
    });

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.fields?.endDate).toBeTruthy();
    expect(svc.createExperience).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * PROFILE — tekil kayıt, §8.20 redaksiyon
 * ======================================================================== */

describe('saveProfileAction', () => {
  const dto = {
    id: 'singleton',
    locale: 'tr',
    headline: 'Yeni Başlık',
    subtitle: null,
    bio: 'Bio',
    location: 'İstanbul',
    availability: null,
    socials: { email: 'gizli@ornek.com', github: 'https://github.com/x' },
    avatar: null,
    cv: null,
  };

  it('mevcut kayıt varsa UPDATE, yoksa CREATE yazılıyor', async () => {
    svc.upsertProfile.mockResolvedValue(dto);

    const { saveProfileAction } = await import('@/server/actions/profile');

    svc.findProfileSnapshot.mockResolvedValue(null);
    await saveProfileAction({ headline: 'Yeni Başlık' });
    expect(denetimKaydi()).toMatchObject({ action: 'CREATE', entity: 'Profile' });

    auditCreate.mockClear();
    svc.findProfileSnapshot.mockResolvedValue({ ...dto, headline: 'Eski' });
    await saveProfileAction({ headline: 'Yeni Başlık' });
    expect(denetimKaydi()).toMatchObject({ action: 'UPDATE' });
  });

  /**
   * DEĞİŞTİ (T-046/BULGU-019, ADR-034).
   *
   * Bu test eskiden `socials.email`in `[REDACTED]` ile MASKELENDİĞİNİ ve
   * e-posta dışı bağlantıların DEĞERİYLE kaldığını doğruluyordu. Yani korumayı
   * `redactAuditDiff`e bağlıyordu — ADR-034'ün "emniyet ağı, korumanın kendisi
   * değil" dersinin tam tersi.
   *
   * Artık `socials` DEĞERLERİ diff'e hiç girmiyor, dolayısıyla maskelenecek bir
   * şey de yok. Güvence redaksiyondan değil ALAN SEÇİMİNDEN geliyor ve bu daha
   * güçlü: yarın eklenecek bilinmeyen bir anahtarın değeri de sızmaz.
   */
  it('socials DEĞERLERİ denetim kaydına HİÇ girmiyor (§8.20, ADR-034)', async () => {
    svc.findProfileSnapshot.mockResolvedValue(null);
    svc.upsertProfile.mockResolvedValue(dto);

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ headline: 'Yeni Başlık' });

    const yazilan = JSON.stringify(denetimKaydi());
    expect(yazilan).not.toContain('gizli@ornek.com');
    expect(yazilan).not.toContain('github.com/x');
  });

  it('yalnızca localeTag düşüyor — profilin slug’ı yok', async () => {
    svc.findProfileSnapshot.mockResolvedValue(null);
    svc.upsertProfile.mockResolvedValue(dto);

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ headline: 'X' });

    expect(dusenEtiketler()).toEqual([localeTag('profile', 'tr')]);
  });

  it('locale ADRES olarak kullanılıyor, güncellenen alan olarak değil', async () => {
    svc.findProfileSnapshot.mockResolvedValue(null);
    svc.upsertProfile.mockResolvedValue({ ...dto, locale: 'en' });

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ locale: 'en', headline: 'X' });

    // İlk argüman `where` anahtarı; tekil kayıtta `locale` "hangi satır"dır.
    expect(svc.upsertProfile.mock.calls[0]?.[0]).toBe('en');
    expect(dusenEtiketler()).toEqual([localeTag('profile', 'en')]);
  });

  it('geçersiz sosyal bağlantı → VALIDATION_ERROR', async () => {
    const { saveProfileAction } = await import('@/server/actions/profile');
    const sonuc = await saveProfileAction({ socials: { github: 'url-degil' } });

    expect(sonuc.ok).toBe(false);
    expect(svc.upsertProfile).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * §7.1 SIRASI
 * ======================================================================== */

describe('§7.1 sırası — mutasyon ÖNCE, geçersizleştirme SONRA', () => {
  it('revalidateTag mutasyondan SONRA çağrılıyor', async () => {
    const sira: string[] = [];
    svc.createSkill.mockImplementation(async () => {
      sira.push('servis');
      return {
        id: ID,
        locale: 'tr',
        name: 'X',
        category: 'BACKEND',
        level: 1,
        iconKey: null,
        order: 0,
      };
    });
    auditCreate.mockImplementation(async () => {
      sira.push('audit');
      return {};
    });
    revalidateTag.mockImplementation(() => {
      sira.push('revalidate');
    });

    const { createSkillAction } = await import('@/server/actions/skill');
    await createSkillAction({ locale: 'tr', name: 'X', category: 'BACKEND', level: 1 });

    // Önce çağrılsaydı önbellek ESKİ veriyle yeniden dolar ve geçersizleştirme
    // hiçbir işe yaramazdı.
    expect(sira).toEqual(['servis', 'audit', 'revalidate']);
  });
});

/* ===========================================================================
 * KALIP ALTI VARLIKTA DA AYNI MI — tablo sürücülü
 *
 * §7.1 sırasının altı kez KOPYALANDIĞI bir tasarımda, kopyalardan birinde
 * atlanan bir adım (denetim kaydı yazılmadı, etiket düşürülmedi) yalnızca o
 * varlık sınandığında görünür. Aşağıdaki tablo hepsini aynı ölçüye sokuyor.
 * ======================================================================== */

interface KalipVakasi {
  ad: string;
  modul: string;
  eylem: string;
  servis: keyof typeof svc;
  govde: Record<string, unknown>;
  donen: Record<string, unknown>;
  entity: string;
  action: string;
  etiketler: string[];
}

const KALIP: KalipVakasi[] = [
  {
    ad: 'post güncelleme',
    modul: '@/server/actions/post',
    eylem: 'updatePostAction',
    servis: 'updatePost',
    govde: { id: ID, title: 'Yeni' },
    donen: { id: ID, locale: 'tr', slug: 'y', status: 'DRAFT', publishedAt: null },
    entity: 'Post',
    action: 'UPDATE',
    etiketler: [localeTag('post', 'tr'), slugTag('post', 'tr', 'y')],
  },
  {
    ad: 'skill güncelleme',
    modul: '@/server/actions/skill',
    eylem: 'updateSkillAction',
    servis: 'updateSkill',
    govde: { id: ID, level: 80 },
    donen: {
      id: ID,
      locale: 'tr',
      name: 'X',
      category: 'BACKEND',
      level: 80,
      iconKey: null,
      order: 0,
    },
    entity: 'Skill',
    action: 'UPDATE',
    etiketler: [localeTag('skill', 'tr')],
  },
  {
    ad: 'service ekleme',
    modul: '@/server/actions/service',
    eylem: 'createServiceAction',
    servis: 'createService',
    govde: { locale: 'tr', title: 'Hizmet', description: 'Açıklama' },
    donen: {
      id: ID,
      locale: 'tr',
      title: 'Hizmet',
      description: 'Açıklama',
      iconKey: null,
      ctaUrl: null,
      order: 0,
    },
    entity: 'Service',
    action: 'CREATE',
    etiketler: [localeTag('service', 'tr')],
  },
  {
    ad: 'service güncelleme',
    modul: '@/server/actions/service',
    eylem: 'updateServiceAction',
    servis: 'updateService',
    govde: { id: ID, order: 2 },
    donen: {
      id: ID,
      locale: 'tr',
      title: 'H',
      description: 'D',
      iconKey: null,
      ctaUrl: null,
      order: 2,
    },
    entity: 'Service',
    action: 'UPDATE',
    etiketler: [localeTag('service', 'tr')],
  },
  {
    ad: 'experience ekleme',
    modul: '@/server/actions/experience',
    eylem: 'createExperienceAction',
    servis: 'createExperience',
    govde: {
      locale: 'tr',
      organization: 'Kurum',
      role: 'Rol',
      type: 'WORK',
      startDate: '2020-01-01',
    },
    donen: {
      id: ID,
      locale: 'tr',
      organization: 'Kurum',
      role: 'Rol',
      type: 'WORK',
      startDate: '2020-01-01',
      endDate: null,
      current: false,
      description: null,
      order: 0,
    },
    entity: 'Experience',
    action: 'CREATE',
    etiketler: [localeTag('experience', 'tr')],
  },
  {
    ad: 'experience güncelleme',
    modul: '@/server/actions/experience',
    eylem: 'updateExperienceAction',
    servis: 'updateExperience',
    govde: { id: ID, role: 'Yeni Rol' },
    donen: {
      id: ID,
      locale: 'tr',
      organization: 'Kurum',
      role: 'Yeni Rol',
      type: 'WORK',
      startDate: '2020-01-01',
      endDate: null,
      current: false,
      description: null,
      order: 0,
    },
    entity: 'Experience',
    action: 'UPDATE',
    etiketler: [localeTag('experience', 'tr')],
  },
];

describe.each(KALIP)('§7.1 kalıbı — $ad', (vaka) => {
  it('servis çağrılıyor, AuditLog yazılıyor, doğru etiketler düşüyor', async () => {
    // Güncelleme eylemleri önce anlık görüntü okur; hepsine aynı satırı veriyoruz.
    for (const bul of [
      'findPostSnapshot',
      'findSkillSnapshot',
      'findServiceSnapshot',
      'findExperienceSnapshot',
    ] as const) {
      // Anlık görüntü GERÇEK şekliyle veriliyor: `slug` yalnızca `donen`da
      // varsa var. Zorla `slug` eklemek slug'sız varlıklarda olmayan bir
      // `slugTag` ürettiriyordu — kodun değil, kurgunun hatasıydı.
      svc[bul].mockResolvedValue({ ...vaka.donen, title: 'Eski' });
    }
    svc[vaka.servis].mockResolvedValue(vaka.donen);

    const modul = (await import(/* @vite-ignore */ vaka.modul)) as Record<
      string,
      (raw: unknown) => Promise<ApiResponse<unknown>>
    >;
    const sonuc = await modul[vaka.eylem]!(vaka.govde);

    expect(sonuc.ok, JSON.stringify(sonuc)).toBe(true);
    expect(svc[vaka.servis]).toHaveBeenCalledOnce();
    expect(denetimKaydi()).toMatchObject({
      actorId: 'kullanici-1',
      action: vaka.action,
      entity: vaka.entity,
      entityId: ID,
    });
    expect(dusenEtiketler()).toEqual([...vaka.etiketler].sort());
  });

  it('kayıt yoksa NOT_FOUND (güncellemede)', async () => {
    if (vaka.action !== 'UPDATE') return;
    for (const bul of [
      'findPostSnapshot',
      'findSkillSnapshot',
      'findServiceSnapshot',
      'findExperienceSnapshot',
    ] as const) {
      svc[bul].mockResolvedValue(null);
    }

    const modul = (await import(/* @vite-ignore */ vaka.modul)) as Record<
      string,
      (raw: unknown) => Promise<ApiResponse<unknown>>
    >;
    const sonuc = (await modul[vaka.eylem]!(vaka.govde)) as {
      ok: boolean;
      error?: { code: string };
    };

    expect(sonuc.ok).toBe(false);
    expect(sonuc.error?.code).toBe('NOT_FOUND');
    expect(svc[vaka.servis]).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * BULGU-019 — SİLME DIFF'İ ALANLARI TEK TEK SAYIYOR
 *
 * Eski kalıp `diff: { deleted: before }` ile satırın TAMAMINI yazıyordu. Bugün
 * sızıntı üretmiyordu; kusur gelecekteydi: ALAN SEÇİMİ MODELE DEVREDİLMİŞTİ.
 * Yarın eklenecek bir `apiAnahtari` sütunu `REDACTED_KEYS`te olmayacağı için
 * diff'e OTOMATİK girerdi ve TİP SİSTEMİ DE GÖREMEZDİ (`before` zaten o modelin
 * tipinde). ADR-034: redaksiyon bir emniyet ağı, alan seçiminin yerine geçmez.
 *
 * Aşağıdaki testler TAM O SENARYOYU kuruyor: anlık görüntüye bugün var olmayan
 * bir sır alanı konuyor ve diff'e sızmadığı ölçülüyor.
 * ======================================================================== */

describe('BULGU-019 — silme diff’i modele devretmiyor', () => {
  /** Yarın eklenecek, `REDACTED_KEYS`te OLMAYAN bir sütun. */
  const GELECEK_SIR = 'sk_live_gizli_anahtar_2027';

  it('skill silme: beklenmeyen alan diff’e SIZMIYOR', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      name: 'Silinecek',
      category: 'BACKEND',
      level: 42,
      iconKey: 'ts',
      order: 3,
      apiAnahtari: GELECEK_SIR,
    };
    svc.findSkillSnapshot.mockResolvedValue(kayit);
    svc.deleteSkill.mockResolvedValue(kayit);

    const { deleteSkillAction } = await import('@/server/actions/skill');
    await deleteSkillAction({ id: ID });

    const log = denetimKaydi();
    expect(JSON.stringify(log)).not.toContain(GELECEK_SIR);
    // Seçim AÇIK: yalnızca bilerek sayılan alanlar.
    expect(Object.keys(log.diff as Record<string, unknown>)).toEqual(['deleted']);
    expect(Object.keys((log.diff as { deleted: object }).deleted).sort()).toEqual([
      'category',
      'level',
      'locale',
      'name',
      'order',
    ]);
  });

  it('service silme: beklenmeyen alan diff’e SIZMIYOR', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      title: 'Hizmet',
      description: 'D',
      iconKey: null,
      ctaUrl: null,
      order: 0,
      apiAnahtari: GELECEK_SIR,
    };
    svc.findServiceSnapshot.mockResolvedValue(kayit);
    svc.deleteService.mockResolvedValue(kayit);

    const { deleteServiceAction } = await import('@/server/actions/service');
    await deleteServiceAction({ id: ID });

    expect(JSON.stringify(denetimKaydi())).not.toContain(GELECEK_SIR);
  });

  it('experience silme: beklenmeyen alan diff’e SIZMIYOR', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      organization: 'Kurum',
      role: 'Rol',
      type: 'WORK',
      startDate: '2020-01-01',
      endDate: null,
      current: true,
      description: null,
      order: 0,
      apiAnahtari: GELECEK_SIR,
    };
    svc.findExperienceSnapshot.mockResolvedValue(kayit);
    svc.deleteExperience.mockResolvedValue(kayit);

    const { deleteExperienceAction } = await import('@/server/actions/experience');
    await deleteExperienceAction({ id: ID });

    expect(JSON.stringify(denetimKaydi())).not.toContain(GELECEK_SIR);
  });

  it('silinen kaydın ANLAMLI alanları hâlâ saklanıyor — koruma bilgiyi yok etmedi', async () => {
    const kayit = {
      id: ID,
      locale: 'tr',
      name: 'Silinecek',
      category: 'BACKEND',
      level: 42,
      iconKey: 'ts',
      order: 3,
    };
    svc.findSkillSnapshot.mockResolvedValue(kayit);
    svc.deleteSkill.mockResolvedValue(kayit);

    const { deleteSkillAction } = await import('@/server/actions/skill');
    await deleteSkillAction({ id: ID });

    // "Ne kayboldu" sorusu hâlâ cevaplanabiliyor (T-031'in gerekçesi ayakta).
    expect((denetimKaydi().diff as { deleted: Record<string, unknown> }).deleted).toMatchObject({
      name: 'Silinecek',
      category: 'BACKEND',
      level: 42,
    });
  });
});

/* ===========================================================================
 * BULGU-019 / profile.socials — DEĞERLER DEĞİL, DEĞİŞEN ANAHTARLAR
 * ======================================================================== */

describe('profile.socials — değerler diff’e girmiyor', () => {
  const dto = {
    id: 'singleton',
    locale: 'tr',
    headline: 'Başlık',
    subtitle: null,
    bio: 'Bio',
    location: 'İstanbul',
    availability: null,
    socials: { email: 'gizli@ornek.com', github: 'https://github.com/x' },
    avatar: null,
    cv: null,
  };

  it('sosyal bağlantı DEĞERLERİ yazılmıyor, yalnızca değişen ANAHTARLAR', async () => {
    svc.findProfileSnapshot.mockResolvedValue({ ...dto, socials: { github: 'https://eski/x' } });
    svc.upsertProfile.mockResolvedValue(dto);

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ headline: 'Başlık' });

    const yazilan = JSON.stringify(denetimKaydi());
    // Ne e-posta ne de URL — hiçbir DEĞER yok.
    expect(yazilan).not.toContain('gizli@ornek.com');
    expect(yazilan).not.toContain('github.com/x');
    expect(yazilan).not.toContain('https://eski/x');
    // Ama NE DEĞİŞTİĞİ okunabiliyor.
    expect(yazilan).toContain('socialsChanged');
    expect(yazilan).toContain('email');
    expect(yazilan).toContain('github');
  });

  it('BEKLENMEYEN bir sosyal anahtarın DEĞERİ de sızmıyor', async () => {
    // Sütun serbest `Json`; seed/migration/elle yazma buraya her şeyi koyabilir
    // ve `REDACTED_KEYS` onu tanımaz. Anahtar ADI zararsız, DEĞER değil.
    const sir = 'sk_live_gizli_2027';
    svc.findProfileSnapshot.mockResolvedValue({ ...dto, socials: {} });
    svc.upsertProfile.mockResolvedValue({ ...dto, socials: { apiAnahtari: sir } });

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ headline: 'Başlık' });

    const yazilan = JSON.stringify(denetimKaydi());
    expect(yazilan).not.toContain(sir);
    expect(yazilan).toContain('apiAnahtari');
  });

  it('sosyal değişmediyse liste BOŞ', async () => {
    svc.findProfileSnapshot.mockResolvedValue(dto);
    svc.upsertProfile.mockResolvedValue(dto);

    const { saveProfileAction } = await import('@/server/actions/profile');
    await saveProfileAction({ headline: 'Başlık' });

    // `buildDiff` yalnızca DEĞİŞENİ taşır; boş liste = değişiklik yok demek.
    expect(JSON.stringify(denetimKaydi())).not.toContain('socialsChanged');
  });
});
