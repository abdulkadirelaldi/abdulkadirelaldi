import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contentTagsToDrop, tagTargetsFor } from '@/server/actions/tags';
import { entityTag, localeTag, slugTag } from '@/server/services/_shared/content-cache';

/**
 * ÖNBELLEK GRANÜLASYONU — T-045 (ADR-029 güncellemesi).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BU DOSYA MODELLEMİYOR, ÖLÇÜYOR — T-040'IN TESTİNİN ZAYIFLIĞI BUYDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-040'ta "slugTag gereksiz" değişmezliğini yazarken girdi etiketlerini
 * TESTİN İÇİNDE ELLE MODELLEMİŞTİM:
 *
 *     const girdiEtiketleri = [entityTag(…), localeTag(…), slugTag(…)];
 *
 * O model `cached.ts`i OKUMUYORDU. Sonuç: T-045 `localeTag`i detay
 * girdilerinden çıkardığında o testler KIRILMADI — kırılmaları beklenmişti ve
 * haklı olarak beklenmişti, ama elle yazılmış model gerçeği izlemediği için
 * sessiz kaldılar. Bir değişmezlik testi, izlediği şeyi OKUMUYORSA onu
 * korumuyor.
 *
 * Burada `next/cache` taklit edilip `unstable_cache`e GEÇİRİLEN `tags` dizisi
 * yakalanıyor — yani ölçülen şey, önbellek girdisinin GERÇEKTEN taşıdığı
 * etiketler. `read` geri çağrısı hiç çalıştırılmadığı için veritabanına
 * gidilmiyor.
 */

const unstableCache = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({
  // Sarmalayıcı `read`i ÇAĞIRMIYOR: amaç etiketleri yakalamak, veri okumak değil.
  unstable_cache: (read: unknown, keyParts: string[], options: { tags: string[] }) => {
    unstableCache(keyParts, options);
    return async () => undefined;
  },
  revalidateTag: vi.fn(),
}));

/** Bir okumanın önbellek girdisinin taşıdığı etiketler — ÖLÇÜLEN değer. */
async function girdiEtiketleri(cagri: () => Promise<unknown>): Promise<string[]> {
  unstableCache.mockClear();
  await cagri();
  expect(
    unstableCache,
    'sarmalayıcı hiç çağrılmadı — okuma önbellekli değil mi?',
  ).toHaveBeenCalled();
  return (unstableCache.mock.calls[0]?.[1] as { tags: string[] }).tags;
}

beforeEach(() => {
  unstableCache.mockClear();
});

/* ===========================================================================
 * DETAY GİRDİLERİ — `localeTag` TAŞIMIYOR
 * ======================================================================== */

describe('detay girdileri yalnızca entityTag + slugTag taşıyor', () => {
  it('getProjectBySlug', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const etiketler = await girdiEtiketleri(() => getProjectBySlug('kiyi-medya', 'tr'));

    expect(etiketler).toEqual([entityTag('project'), slugTag('project', 'tr', 'kiyi-medya')]);
    // ⚠️ T-045'in kalbi: dil etiketi YOK.
    expect(etiketler).not.toContain(localeTag('project', 'tr'));
  });

  it('getPostBySlug', async () => {
    const { getPostBySlug } = await import('@/server/services/cached');
    const etiketler = await girdiEtiketleri(() => getPostBySlug('bir-yazi', 'tr'));

    expect(etiketler).toEqual([entityTag('post'), slugTag('post', 'tr', 'bir-yazi')]);
    expect(etiketler).not.toContain(localeTag('post', 'tr'));
  });
});

/* ===========================================================================
 * LİSTE / İSTATİSTİK / SITEMAP — `localeTag` TAŞIMAYA DEVAM EDİYOR
 * ======================================================================== */

describe('liste tarafı localeTag taşımaya DEVAM ediyor', () => {
  it.each([
    ['getPublishedProjects', 'project'],
    ['getFeaturedProjects', 'project'],
    ['getPublishedPosts', 'post'],
    ['getProjectSitemapEntries', 'project'],
    ['getPostSitemapEntries', 'post'],
  ] as const)('%s', async (ad, varlik) => {
    const modul = (await import('@/server/services/cached')) as unknown as Record<
      string,
      (locale?: string) => Promise<unknown>
    >;
    const etiketler = await girdiEtiketleri(() => modul[ad]!('tr'));

    // Bunlar çok kayıttan türüyor; dil çapında düşmek ZORUNDA.
    expect(etiketler).toContain(localeTag(varlik, 'tr'));
  });

  it('getSiteStats iki varlığın da dil etiketini taşıyor', async () => {
    const { getSiteStats } = await import('@/server/services/cached');
    const etiketler = await girdiEtiketleri(() => getSiteStats('tr'));

    expect(etiketler).toContain(localeTag('project', 'tr'));
    expect(etiketler).toContain(localeTag('experience', 'tr'));
  });

  it('tekil okumalar (profile/skill/service/experience) dokunulmadı', async () => {
    const { getProfile } = await import('@/server/services/cached');
    expect(await girdiEtiketleri(() => getProfile('tr'))).toEqual([
      entityTag('profile'),
      localeTag('profile', 'tr'),
    ]);
  });
});

/* ===========================================================================
 * ⚠️ KAZANIM: A'YI DÜZENLEMEK B'NİN SAYFASINI DÜŞÜRMÜYOR
 * ======================================================================== */

describe('aşırı geçersizleştirme GİDERİLDİ', () => {
  /** Bir mutasyonun düşürdüğü etiketler, verilen girdiye ulaşıyor mu? */
  const ulasiyor = (dusen: string[], girdi: string[]) => girdi.some((t) => dusen.includes(t));

  it('A projesini düzenlemek B’nin DETAY girdisine DOKUNMUYOR', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const bDetay = await girdiEtiketleri(() => getProjectBySlug('proje-b', 'tr'));

    // A'nın düzenlenmesi: localeTag + slugTag(A)
    const dusen = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'proje-a' }, { locale: 'tr', slug: 'proje-a' }),
    );

    // T-045'ten ÖNCE bu `true` idi — B'nin sayfası bedavaya düşüyordu.
    expect(ulasiyor(dusen, bDetay)).toBe(false);
  });

  it('A’nın KENDİ detay girdisi hâlâ düşüyor', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const aDetay = await girdiEtiketleri(() => getProjectBySlug('proje-a', 'tr'));

    const dusen = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'proje-a' }, { locale: 'tr', slug: 'proje-a' }),
    );

    expect(ulasiyor(dusen, aDetay)).toBe(true);
  });

  it('LİSTE hâlâ düşüyor — daralma listeyi bayat bırakmadı', async () => {
    const { getPublishedProjects } = await import('@/server/services/cached');
    const liste = await girdiEtiketleri(() => getPublishedProjects('tr'));

    const dusen = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'proje-a' }, { locale: 'tr', slug: 'proje-a' }),
    );

    expect(ulasiyor(dusen, liste)).toBe(true);
  });

  it('başka DİLDEKİ detay girdisi de etkilenmiyor', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const enDetay = await girdiEtiketleri(() => getProjectBySlug('proje-a', 'en'));

    const dusen = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'proje-a' }, { locale: 'tr', slug: 'proje-a' }),
    );

    expect(ulasiyor(dusen, enDetay)).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️ `slugTag` ARTIK YÜK TAŞIYOR — ADR-029'un çürütülen gerekçesi doğrulandı
 * ======================================================================== */

describe('slugTag YÜK TAŞIYOR (T-039/T-040 çürütmesi artık geçersiz)', () => {
  /**
   * T-039'un 2 numaralı mutasyonu `slugTag` üretimini tamamen kaldırmış ve E2E
   * yeşil kalmıştı — çünkü detay girdileri `localeTag` de taşıyordu. T-045 o
   * eşleşmeyi kaldırdı; aynı mutasyon artık YAKALANIR.
   */
  it('slugTag üretimi kaldırılsa detay girdisi ULAŞILAMAZ olurdu', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const detay = await girdiEtiketleri(() => getProjectBySlug('proje-a', 'tr'));

    const hedef = tagTargetsFor(
      { locale: 'tr', slug: 'proje-a' },
      { locale: 'tr', slug: 'proje-a' },
    );
    const slugsuz = contentTagsToDrop('project', { locales: hedef.locales });

    // T-039 mutasyonunun tam karşılığı: slug etiketi üretilmiyor.
    expect(detay.some((t) => slugsuz.includes(t))).toBe(false);
  });

  it('her mutasyon yolu etkilenen slug’ı ÜRETİYOR — erişilebilirlik korundu', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');

    const yollar: [
      string,
      { locale: string; slug?: string } | null,
      { locale: string; slug?: string },
    ][] = [
      ['ekleme', null, { locale: 'tr', slug: 'yeni' }],
      ['düzenleme', { locale: 'tr', slug: 'ayni' }, { locale: 'tr', slug: 'ayni' }],
      ['slug değişimi (yeni)', { locale: 'tr', slug: 'eski' }, { locale: 'tr', slug: 'yeni' }],
      ['dil değişimi', { locale: 'en', slug: 'ayni' }, { locale: 'tr', slug: 'ayni' }],
    ];

    for (const [ad, before, after] of yollar) {
      const dusen = contentTagsToDrop('project', tagTargetsFor(before, after));
      const detay = await girdiEtiketleri(() => getProjectBySlug(after.slug!, after.locale));
      expect(
        detay.some((t) => dusen.includes(t)),
        `${ad}: yeni detay girdisi düşmüyor`,
      ).toBe(true);
    }
  });

  it('SLUG DEĞİŞİMİNDE eski slug’ın girdisi de düşüyor', async () => {
    const { getProjectBySlug } = await import('@/server/services/cached');
    const eskiDetay = await girdiEtiketleri(() => getProjectBySlug('eski', 'tr'));

    const dusen = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'eski' }, { locale: 'tr', slug: 'yeni' }),
    );

    // Eski slug artık 404 dönüyor; girdisi düşmezse bir saat 200 sunardı.
    expect(eskiDetay.some((t) => dusen.includes(t))).toBe(true);
  });
});
