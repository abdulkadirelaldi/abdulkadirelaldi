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
 * `slugTag` ARTIK YÜK TAŞIYOR — T-045 (ADR-029 güncellendi)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU BLOK T-040'TA "GEREKSİZLİK" OLARAK YAZILMIŞTI VE TERSİNE DÖNDÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-039 `slugTag` üretimini kaldırıp E2E'yi yeşil bırakmıştı; T-040 bunu
 * doğruladı ve sebebini buldu — detay girdileri `localeTag` DE taşıyordu, yani
 * `slugTag` hiçbir zaman tek başına yük taşımıyordu. T-040 o gereksizliği bir
 * değişmezlik olarak sabitledi ve kökünün bir KUSUR olduğunu yazdı (A'yı
 * düzenlemek B'nin sayfasını düşürüyordu).
 *
 * T-045 o kusuru giderdi: detay girdilerinden `localeTag` çıkarıldı. Artık
 * `slugTag` yük taşıyor ve gereksizlik değişmezliği GEÇERSİZ.
 *
 * ⚠️ T-040'IN TESTİNİN ZAYIFLIĞI: girdi etiketlerini ELLE MODELLİYORDU
 * (`const girdiEtiketleri = [entityTag(…), localeTag(…), slugTag(…)]`), yani
 * `cached.ts`i okumuyordu. Bu yüzden T-045 değişikliğinde KIRILMADI — oysa
 * kırılması gerekiyordu. Bir değişmezlik testi izlediği şeyi okumuyorsa onu
 * korumaz.
 *
 * Ölçüm artık `tests/unit/services/onbellek-granulasyonu.test.ts` içinde ve
 * `unstable_cache`e GEÇİRİLEN etiketleri yakalıyor. Aşağıda yalnızca HESAP
 * tarafı kalıyor (bu dosyanın konusu o); girdi tarafı orada ölçülüyor.
 * ======================================================================== */

describe('slugTag hesabı — girdi tarafı ayrı dosyada ÖLÇÜLÜYOR', () => {
  it('hesap etkilenen slug’ı üretmeye devam ediyor', () => {
    const tags = contentTagsToDrop(
      'project',
      tagTargetsFor({ locale: 'tr', slug: 'a' }, { locale: 'tr', slug: 'b' }),
    );

    // Hesap T-045'te DEĞİŞMEDİ; değişen şey girdilerin taşıdığı etiketler.
    expect(tags).toContain(slugTag('project', 'tr', 'a'));
    expect(tags).toContain(slugTag('project', 'tr', 'b'));
    expect(tags).toContain(localeTag('project', 'tr'));
  });

  it('DEĞİŞMEZLİK: üretilen her slugTag’in dili locales’te — hâlâ geçerli', () => {
    // Bu değişmezlik T-045'ten bağımsız: `tagTargetsFor`un yapısal özelliği.
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
      for (const sl of hedef.slugs ?? []) {
        expect(hedef.locales).toContain(sl.locale);
      }
    }
  });

  it('entityTag hâlâ DÜŞÜRÜLMÜYOR', () => {
    const tags = contentTagsToDrop('project', {
      locales: ['tr'],
      slugs: [{ locale: 'tr', slug: 'a' }],
    });
    expect(tags).not.toContain(entityTag('project'));
  });
});
