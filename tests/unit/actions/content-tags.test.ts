import { describe, expect, it } from 'vitest';

import { contentTagsToDrop, tagTargetsFor } from '@/server/actions/tags';
import { entityTag, localeTag, slugTag } from '@/server/services/_shared/content-cache';

/**
 * ADR-029 ETİKET HESABI — T-031.
 *
 * ⚠️ `revalidateTag` TAM DİZE eşleşir, ÖNEK DEĞİL. `content:project` düşürmek
 * `content:project:tr` etiketli girdilere DOKUNMAZ. Unutulan bir seviye BAYAT
 * İÇERİK bırakır ve emniyet ağı (bir saat) dolunca kendiliğinden düzelir —
 * "bazen çalışan" bir hata, teşhisi en zor sınıf.
 *
 * Bu dosya SAF tarafı sınar. Action'ların gerçekten bu etiketleri düşürdüğü
 * `content-actions.test.ts` içinde, `revalidateTag` taklit edilerek ölçülüyor.
 */

describe('contentTagsToDrop — seviyeler', () => {
  it('tek dil, slug yok → yalnızca localeTag', () => {
    expect(contentTagsToDrop('skill', { locales: ['tr'] })).toEqual([localeTag('skill', 'tr')]);
  });

  it('slug verilince İKİ seviye birden düşer', () => {
    expect(
      contentTagsToDrop('project', {
        locales: ['tr'],
        slugs: [{ locale: 'tr', slug: 'kiyi-medya' }],
      }),
    ).toEqual([localeTag('project', 'tr'), slugTag('project', 'tr', 'kiyi-medya')]);
  });

  it('entityTag DÜŞÜRÜLMEZ — diller birbirini geçersizleştirmesin', () => {
    const tags = contentTagsToDrop('project', {
      locales: ['tr'],
      slugs: [{ locale: 'tr', slug: 'x' }],
    });
    // `entityTag` her girdide var; düşürmek "her şeyi temizle" olurdu ve
    // Türkçe bir düzenleme İngilizce listeyi de bayatlatırdı.
    expect(tags).not.toContain(entityTag('project'));
  });

  it('yinelenen etiket üretmez', () => {
    const tags = contentTagsToDrop('post', {
      locales: ['tr', 'tr'],
      slugs: [
        { locale: 'tr', slug: 'ayni' },
        { locale: 'tr', slug: 'ayni' },
      ],
    });
    expect(tags).toEqual([...new Set(tags)]);
    expect(tags).toHaveLength(2);
  });

  it('üretilen etiketler önbellek katmanının YAZDIĞI dizelerle birebir', () => {
    // Elle dize yazılsaydı ("content:project:tr") burada sapma görülmezdi;
    // bu yüzden karşılaştırma `content-cache`'in KENDİ fonksiyonlarıyla.
    expect(contentTagsToDrop('project', { locales: ['tr'] })[0]).toBe('content:project:tr');
  });
});

describe('tagTargetsFor — ESKİ durum da düşer', () => {
  it('ekleme (before yok): yeni dil + yeni slug', () => {
    expect(tagTargetsFor(null, { locale: 'tr', slug: 'yeni' })).toEqual({
      locales: ['tr'],
      slugs: [{ locale: 'tr', slug: 'yeni' }],
    });
  });

  it('SLUG DEĞİŞTİ: eski slug da düşer', () => {
    const targets = tagTargetsFor(
      { locale: 'tr', slug: 'eski-ad' },
      { locale: 'tr', slug: 'yeni-ad' },
    );
    const tags = contentTagsToDrop('project', targets);

    // Eski slug düşürülmezse o adres, artık var olmayan bir sayfayı bir saat
    // boyunca 200 ile sunmaya devam eder.
    expect(tags).toContain(slugTag('project', 'tr', 'eski-ad'));
    expect(tags).toContain(slugTag('project', 'tr', 'yeni-ad'));
  });

  it('DİL DEĞİŞTİ: eski dilin listesi de düşer', () => {
    const tags = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'en', slug: 'a' }, { locale: 'tr', slug: 'a' }),
    );

    // Eski dil düşürülmezse o listede hayalet bir kayıt kalır.
    expect(tags).toContain(localeTag('project', 'en'));
    expect(tags).toContain(localeTag('project', 'tr'));
    expect(tags).toContain(slugTag('project', 'en', 'a'));
    expect(tags).toContain(slugTag('project', 'tr', 'a'));
  });

  it('hiçbir şey değişmediyse etiketler yine de düşer — tekrar zararsız', () => {
    const tags = contentTagsToDrop(
      'post',
      tagTargetsFor({ locale: 'tr', slug: 'a' }, { locale: 'tr', slug: 'a' }),
    );
    expect(tags).toEqual([localeTag('post', 'tr'), slugTag('post', 'tr', 'a')]);
  });

  it('slug’sız varlıkta slug etiketi ÜRETİLMEZ', () => {
    const targets = tagTargetsFor({ locale: 'tr' }, { locale: 'tr' });
    expect(targets.slugs).toEqual([]);
    expect(contentTagsToDrop('skill', targets)).toEqual([localeTag('skill', 'tr')]);
  });
});

/**
 * ADR-029'un en pahalı maddesi: DURUM DEĞİŞİKLİĞİNDE `localeTag` MUTLAKA.
 *
 * `DRAFT→PUBLISHED` ve `→ARCHIVED` hem listeyi hem `getSiteStats`i değiştirir;
 * ikisi de `localeTag` taşır. Yalnızca `slugTag` düşürmek `publishedProjects`i
 * VE istatistiği bayat bırakırdı.
 */
describe('durum değişikliği — localeTag MUTLAKA', () => {
  const gecisler = [
    ['DRAFT', 'PUBLISHED'],
    ['PUBLISHED', 'ARCHIVED'],
    ['SCHEDULED', 'PUBLISHED'],
    ['PUBLISHED', 'DRAFT'],
  ] as const;

  it.each(gecisler)('%s → %s geçişinde localeTag düşüyor', () => {
    // Durum, etiket hesabının GİRDİSİ DEĞİL: `tagTargetsFor` her hâlükârda
    // `localeTag` üretiyor. Bu kasıtlı — "durum değişti mi" diye ayrı bir dal
    // yazmak, o dalı unutma ihtimalini yaratırdı.
    const tags = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'x' }, { locale: 'tr', slug: 'x' }),
    );
    expect(tags).toContain(localeTag('project', 'tr'));
  });
});
