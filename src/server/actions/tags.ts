import { revalidateTag } from 'next/cache';

import { localeTag, slugTag, type ContentEntity } from '@/server/services/_shared/content-cache';

/**
 * ADR-029 etiket hesabı — T-031.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN `_shared.ts`'TEN AYRI DOSYA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `_shared.ts` `auth()` çağırdığı için `next-auth` içe aktarır ve `next-auth`
 * Vitest'in `node` ortamında YÜKLENEMİYOR (`next/server` çözülmüyor —
 * `credentials.ts`'te aynı duvara çarpılmıştı). Etiket hesabı orada kalsaydı
 * SAF olduğu hâlde tek başına sınanamazdı; yalnızca `auth`u taklit eden bir
 * testin içinden dolaylı olarak ölçülebilirdi.
 *
 * ADR-029 bu projede en pahalı hataların kaynağı; hesabının doğrudan ve
 * taklitsiz sınanabilmesi ayrı bir dosyaya değer.
 */

/* ===========================================================================
 * 3. ÖNBELLEK GEÇERSİZLEŞTİRME — ADR-029
 * ======================================================================== */

/**
 * ⚠️ ADR-029: `revalidateTag` TAM DİZE eşleşir, ÖNEK DEĞİL.
 *
 * `content:project` düşürmek `content:project:tr` etiketli girdilere DOKUNMAZ.
 * Hiyerarşi yalnızca bir isimlendirme kuralıdır; geçersizleştirme hiyerarşik
 * DEĞİLDİR. Unutulan bir seviye BAYAT İÇERİK bırakır ve emniyet ağı (bir saat)
 * dolunca kendiliğinden düzelir — yani "bazen çalışan" bir hata, teşhisi en zor
 * sınıf.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * `entityTag` BİLEREK DÜŞÜRÜLMÜYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Her önbellek girdisi `entityTag`i de taşıyor, yani onu düşürmek "her şeyi
 * temizle" olurdu ve HER ZAMAN doğru sonucu verirdi. Tam da bu yüzden tehlikeli:
 * Türkçe bir projeyi düzenlemek İngilizce listeyi de düşürürdü. Doğru olanı
 * yapmak yerine geniş olanı yapmak, önbelleğin var olma sebebini aşındırır.
 *
 * `entityTag` yalnızca gerçekten dilden bağımsız bir işlem çıkarsa düşürülür;
 * bugün öyle bir işlem yok.
 */
export interface ContentTagTargets {
  /**
   * Etkilenen diller — ESKİ VE YENİ.
   *
   * Bir kaydın `locale`u değişirse eski dilin listesi de değişmiştir. Yalnızca
   * yeni dili düşürmek, eski listede hayalet bir kayıt bırakır.
   */
  locales: readonly string[];
  /**
   * Etkilenen slug'lar — ESKİ VE YENİ.
   *
   * Slug değişince eski slug'ın önbellek girdisi, artık var olmayan bir sayfayı
   * sunmaya devam eder.
   */
  slugs?: readonly { locale: string; slug: string }[];
}

/**
 * Düşürülecek etiketleri hesaplar. SAF — bu yüzden ayrı ayrı sınanabiliyor.
 *
 * EKLEMEDE DE `slugTag` DÜŞÜRÜLÜR ve bu ADR-029'un tablosunu genişletir:
 * `getProjectBySlug` OLUMSUZ SONUCU DA ÖNBELLEKLER (`{ state: 'NOT_FOUND' }`).
 * Biri `/projeler/yeni-slug` adresini kayıt açılmadan önce ziyaret ettiyse,
 * 404 sonucu o slug'ın etiketiyle önbelleğe girmiştir. Yalnızca `localeTag`
 * düşürmek yeni kaydı listede gösterir ama KENDİ SAYFASINDA bir saat boyunca
 * 404 bırakır — "listede var, tıklayınca yok".
 */
export function contentTagsToDrop(entity: ContentEntity, targets: ContentTagTargets): string[] {
  const tags = new Set<string>();

  for (const locale of targets.locales) {
    tags.add(localeTag(entity, locale));
  }
  for (const { locale, slug } of targets.slugs ?? []) {
    tags.add(slugTag(entity, locale, slug));
  }

  return [...tags];
}

/**
 * Etiketleri düşürür ve DÜŞÜRÜLENLERİ döndürür.
 *
 * Dönüş değeri çağıran için değil, TEST için: action'ın hangi etiketleri
 * düşürdüğü yanıtından okunamaz, ve ADR-029 ihlalleri tam olarak "etiket
 * düşürülmedi" biçiminde ortaya çıkar.
 */
export function revalidateContent(entity: ContentEntity, targets: ContentTagTargets): string[] {
  const tags = contentTagsToDrop(entity, targets);
  for (const tag of tags) revalidateTag(tag);
  return tags;
}

/**
 * Bir güncellemenin etiket hedeflerini ESKİ ve YENİ durumdan kurar.
 *
 * Bu fonksiyon var çünkü "eskiyi de düşür" kuralını her action'da elle yazmak,
 * altı yerde altı kez unutulabilir bir adım demekti. Slug'ı olmayan varlıklar
 * (`Skill`, `Service`, `Experience`, `Profile`) `slug: undefined` geçer.
 */
export function tagTargetsFor(
  before: { locale: string; slug?: string } | null,
  after: { locale: string; slug?: string },
): ContentTagTargets {
  const locales = new Set<string>([after.locale]);
  const slugs: { locale: string; slug: string }[] = [];

  if (after.slug) slugs.push({ locale: after.locale, slug: after.slug });

  if (before) {
    locales.add(before.locale);
    if (before.slug) slugs.push({ locale: before.locale, slug: before.slug });
  }

  return { locales: [...locales], slugs };
}
