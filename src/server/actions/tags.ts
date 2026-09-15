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
   * ⚠️ BU ALAN BUGÜN SONUCU DEĞİŞTİRMİYOR: ürettiği her `slugTag`in dili zaten
   * `locales`te olduğu için aynı girdiler `localeTag` ile de düşüyor. Ölçüm ve
   * neden yine de durduğu `contentTagsToDrop`un başında.
   *
   * Eski slug'ın burada olması gerektiği inancı doğru sezgiydi ama yanlış
   * mekanizmaya dayanıyordu; sezgi `localeTag` tarafından zaten karşılanıyor.
   */
  slugs?: readonly { locale: string; slug: string }[];
}

/**
 * Düşürülecek etiketleri hesaplar. SAF — bu yüzden ayrı ayrı sınanabiliyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `slugTag` BUGÜN GEREKSİZ — ÖLÇÜLDÜ (T-039 mutasyonu, T-040'ta doğrulandı)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BURADA ESKİDEN YANLIŞ BİR GEREKÇE YAZIYORDU: "yalnızca `localeTag` düşürmek
 * yeni kaydı listede gösterir ama kendi sayfasında bir saat 404 bırakır."
 * Bu YANLIŞ ve T-039'un 2 numaralı mutasyonu kanıtladı: `slugTag` üretimi
 * TAMAMEN kaldırıldı ve E2E yeşil kaldı. ADR-029'un o genişletmesi çürütüldü.
 *
 * SEBEBİ ÜÇ PARÇALI ve üçü de kodda ölçülebilir:
 *
 *  1. `content-cache.ts`'in KENDİ KURALI gereği her önbellek girdisi kendisini
 *     düşürebilecek TÜM etiketleri taşır. Slug'lı iki girdi
 *     (`getProjectBySlug`, `getPostBySlug`) `entityTag + localeTag + slugTag`
 *     üçünü BİRDEN taşıyor — yani `localeTag` onlara da ulaşıyor.
 *  2. `contentTagsToDrop` HER çağrıda `localeTag` üretiyor (aşağıda, koşulsuz).
 *  3. `tagTargetsFor` slug'ları yalnızca `locales`'e ZATEN eklenmiş dillerden
 *     topluyor — yani "slug'ı düşen ama dili düşmeyen" bir hedef kümesi
 *     kurulamıyor.
 *
 * Bunun bir sonucu da ölçüldü: `localeTag('project','tr')` düşürmek o dildeki
 * HER projenin detay girdisini düşürüyor — A projesini düzenlemek B'nin
 * sayfasını da geçersizleştiriyor. Yani bugünkü geçersizleştirme dil
 * granülasyonunda; slug granülasyonu KULLANILMIYOR.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NEDEN YİNE DE KALDI — "gereksiz" ile "ölü" farkı
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ÖLÜ kod hiç çalışmaz ya da hiçbir bağlamda etkisi yoktur. `slugTag` çalışıyor
 * ve girdilerin GERÇEKTEN taşıdığı bir etiketi düşürüyor; GEREKSİZ olmasının
 * sebebi BAŞKA BİR DOSYADAKİ bir tercih — detay girdilerinin `localeTag`i de
 * taşıması. Yani gereksizlik burada değil, o eşleşmede yaşıyor.
 *
 * Kaldırsaydım: (1) ölçülmüş tek fayda 1–2 `revalidateTag` çağrısı; (2) buna
 * karşılık, detay girdileri bir gün DARALTILIRSA (yukarıdaki aşırı
 * geçersizleştirmeyi düzeltmek için — gerçek ve değerli bir iyileştirme)
 * geçersizleştirme SESSİZCE kırılır ve hiçbir test kırmızıya dönmez. ADR-029'un
 * var olma sebebi tam olarak bu hata sınıfı.
 *
 * Kalmasının bedeli, gerekçe doğru yazıldığı sürece sıfır: mutasyon başına
 * bir-iki fazladan çağrı. `tests/unit/actions/content-tags.test.ts` bu
 * gereksizliği AÇIK BİR DEĞİŞMEZLİK olarak sabitliyor, böylece bir daha yanlış
 * bir mekanizma anlatısına dönüşemez.
 *
 * SLUG GRANÜLASYONUNU GERÇEKTEN İSTEYEN DEĞİŞİKLİK: `cached.ts`'te detay
 * girdilerinden `localeTag`i çıkarmak. O ayrı bir ölçüm görevi — burada
 * yapılmadı, çünkü public önbellek davranışını değiştirir.
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
