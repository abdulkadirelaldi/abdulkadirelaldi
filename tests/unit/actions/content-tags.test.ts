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

    // NE ÖLÇÜYOR: DAVRANIŞI DEĞİL, HESABI. Eski slug'ın etiketi üretiliyor mu?
    // Bu etiketin bugün bir etkisi YOK — aynı girdiler `localeTag` ile de
    // düşüyor (aşağıdaki "gereksizlik" bloğu bunu ölçüyor). Test, hesabın
    // sessizce değişmesini yakalamak için var; "eski slug olmasa sayfa bayat
    // kalırdı" iddiası T-039'da ÇÜRÜTÜLDÜ.
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
 * ikisi de `localeTag` taşır ve `slugTag` TAŞIMAZ — yani onlara ulaşan tek
 * etiket `localeTag`. Bu madde ayakta; çürütülen, tersi yöndeki iddiaydı.
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

/* ===========================================================================
 * `slugTag` GEREKSİZLİĞİ — AÇIK DEĞİŞMEZLİK (T-040)
 *
 * T-039'un 2 numaralı mutasyonu `slugTag` üretimini tamamen kaldırdı ve E2E
 * yeşil kaldı. ADR-029'un "ekleme de slugTag düşürmeli" genişletmesi böylece
 * çürütüldü; `tags.ts`'teki yanlış gerekçe metni T-040'ta silindi.
 *
 * BU BLOK GEREKSİZLİĞİ SABİTLİYOR. Sebebi: gereksizlik ÖLÇÜLMÜŞ BİR OLGU ama
 * kodda görünmüyor — iki dosya arasındaki bir eşleşmeden doğuyor. Yazılı
 * olmadığı için bir kez YANLIŞ BİR MEKANİZMA ANLATISINA dönüştü zaten. Burada
 * assert olarak durursa bir daha dönüşemez.
 *
 * Bu testlerin kırılması bir HATA DEĞİL, bir HABER olabilir: eşleşme değişmiş
 * ve `slugTag` yük taşımaya başlamış olabilir. O durumda `tags.ts`'teki gerekçe
 * güncellenmeli.
 * ======================================================================== */

describe('slugTag gereksizliği — ölçülmüş değişmezlik', () => {
  /** `content-cache.ts`'ten OKUNAN gerçek girdi etiketleri (slug taşıyan ikisi). */
  const SLUG_TASIYAN_GIRDILER = [
    { ad: 'getProjectBySlug', entity: 'project' as const, locale: 'tr', slug: 'a' },
    { ad: 'getPostBySlug', entity: 'post' as const, locale: 'tr', slug: 'a' },
  ];

  it('DEĞİŞMEZLİK 1: slug taşıyan her girdi localeTag DE taşıyor', () => {
    // `cached.ts`'in kuralı: her girdi kendisini düşürebilecek TÜM etiketleri
    // taşır. `slugTag`in gereksiz olmasının BİRİNCİ sebebi bu.
    for (const g of SLUG_TASIYAN_GIRDILER) {
      const girdiEtiketleri = [
        entityTag(g.entity),
        localeTag(g.entity, g.locale),
        slugTag(g.entity, g.locale, g.slug),
      ];
      expect(girdiEtiketleri, `${g.ad} localeTag taşımıyor`).toContain(
        localeTag(g.entity, g.locale),
      );
    }
  });

  it('DEĞİŞMEZLİK 2: üretilen her slugTag’in dili locales’te ZATEN var', () => {
    // İKİNCİ sebep: `tagTargetsFor` "slug'ı düşen ama dili düşmeyen" bir hedef
    // kümesi KURAMIYOR. Bu yüzden slugTag hiçbir zaman tek başına yük taşımıyor.
    const senaryolar: [
      { locale: string; slug?: string } | null,
      { locale: string; slug?: string },
    ][] = [
      [null, { locale: 'tr', slug: 'a' }],
      [
        { locale: 'tr', slug: 'a' },
        { locale: 'tr', slug: 'b' },
      ],
      [
        { locale: 'en', slug: 'a' },
        { locale: 'tr', slug: 'a' },
      ],
      [{ locale: 'tr' }, { locale: 'tr' }],
    ];

    for (const [before, after] of senaryolar) {
      const hedef = tagTargetsFor(before, after);
      for (const s of hedef.slugs ?? []) {
        expect(hedef.locales, `slug ${s.slug} dili ${s.locale} locales'te yok`).toContain(s.locale);
      }
    }
  });

  it('DEĞİŞMEZLİK 3: contentTagsToDrop KOŞULSUZ localeTag üretiyor', () => {
    // ÜÇÜNCÜ sebep. `locales` boş verilse bile slug'a bakıp etiket üretmiyor;
    // yani "yalnızca slug düşür" diye bir çağrı biçimi yok.
    const yalnizSlug = contentTagsToDrop('project', {
      locales: [],
      slugs: [{ locale: 'tr', slug: 'a' }],
    });
    // Böyle bir çağrı YAPILMIYOR (tagTargetsFor üretemiyor) ama yapılabilseydi
    // localeTag'siz kalırdı — değişmezliğin nereden geldiğini gösteriyor.
    expect(yalnizSlug).toEqual([slugTag('project', 'tr', 'a')]);
    expect(yalnizSlug).not.toContain(localeTag('project', 'tr'));
  });

  it('SONUÇ: slugTag çıkarılsa DÜŞEN GİRDİ KÜMESİ değişmiyor', () => {
    /*
     * Ölçümün özü. Girdi tarafını modelleyip iki hesabı karşılaştırıyoruz:
     * `slugTag` ile ve `slugTag` olmadan hangi önbellek girdileri düşüyor?
     */
    const girdiler = [
      { ad: 'detay(a,tr)', tags: [localeTag('project', 'tr'), slugTag('project', 'tr', 'a')] },
      { ad: 'detay(b,tr)', tags: [localeTag('project', 'tr'), slugTag('project', 'tr', 'b')] },
      { ad: 'detay(a,en)', tags: [localeTag('project', 'en'), slugTag('project', 'en', 'a')] },
      { ad: 'liste(tr)', tags: [localeTag('project', 'tr')] },
    ];
    const dusenler = (etiketler: string[]) =>
      girdiler
        .filter((g) => g.tags.some((t) => etiketler.includes(t)))
        .map((g) => g.ad)
        .sort();

    const senaryolar: [
      string,
      { locale: string; slug?: string } | null,
      { locale: string; slug?: string },
    ][] = [
      ['ekleme', null, { locale: 'tr', slug: 'a' }],
      ['slug değişti', { locale: 'tr', slug: 'a' }, { locale: 'tr', slug: 'b' }],
      ['dil değişti', { locale: 'en', slug: 'a' }, { locale: 'tr', slug: 'a' }],
      ['durum değişti', { locale: 'tr', slug: 'a' }, { locale: 'tr', slug: 'a' }],
    ];

    for (const [ad, before, after] of senaryolar) {
      const hedef = tagTargetsFor(before, after);
      const ile = contentTagsToDrop('project', hedef);
      const siz = contentTagsToDrop('project', { locales: hedef.locales });

      expect(dusenler(siz), `${ad}: slugTag'siz farklı girdi kümesi düşüyor`).toEqual(
        dusenler(ile),
      );
    }
  });

  it('AŞIRI GEÇERSİZLEŞTİRME: A’yı düzenlemek B’nin detayını da düşürüyor', () => {
    /*
     * Gereksizliğin KÖKÜ bu: detay girdileri `localeTag` de taşıdığı için
     * geçersizleştirme dil granülasyonunda kalıyor, slug granülasyonu
     * kullanılmıyor. Bunu düzeltmek (detay girdilerinden `localeTag`i çıkarmak)
     * `slugTag`i yük taşıyan hâle getirirdi — ayrı bir ölçüm görevi.
     */
    const etiketler = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'a' }, { locale: 'tr', slug: 'a' }),
    );
    const bDetayEtiketleri = [localeTag('project', 'tr'), slugTag('project', 'tr', 'b')];

    expect(bDetayEtiketleri.some((t) => etiketler.includes(t))).toBe(true);
  });
});
