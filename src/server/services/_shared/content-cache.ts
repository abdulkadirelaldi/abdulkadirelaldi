import { unstable_cache } from 'next/cache';

/**
 * Public içerik önbellekleme — ADR-011'in karşılığı.
 *
 * ADR-011 dinamik render'ı kabul ederken ŞART KOŞTU: "F2'den itibaren public
 * sayfaların veri erişimi AÇIK ÖNBELLEKLEME ile yazılır". Unutulursa her ziyaret
 * veritabanına gider ve dinamik render'ın kabul edilme gerekçesi ortadan kalkar.
 * Bu yüzden önbellekleme servislerin İÇİNDE, sayfaların hatırlamasına bırakılmadan.
 *
 * ETİKET ADLANDIRMA KURALI — F3'ün Server Action'ları bunları geçersizleştirecek:
 *
 *   content:<entity>                    tüm varlık (liste + detay)   → 'content:project'
 *   content:<entity>:<locale>           dile göre liste              → 'content:project:tr'
 *   content:<entity>:<locale>:<slug>    tek kayıt                    → 'content:project:tr:kiyi-medya'
 *
 * Bir mutasyon EN GENİŞ etkilenen etiketi geçersizleştirir. Yeni proje eklemek
 * `content:project:tr`'yi düşürür (liste değişti); mevcut projeyi düzenlemek hem
 * onu hem kaydın kendi etiketini düşürür. Tekil varlıklarda (Profile) slug yok.
 *
 * ⚠️ HİYERARŞİ YALNIZCA OKUNABİLİRLİK İÇİN — EŞLEŞME TAM DİZEDİR.
 *
 * ÖLÇÜLDÜ (next 15.5.22, `incremental-cache/tags-manifest.external.js`):
 * `isStale` etiketleri `tagsManifest.get(tag)` ile, yani bir Map araması ile
 * karşılaştırır. ÖNEK EŞLEŞMESİ YOKTUR: `revalidateTag('content:project')`
 * SADECE `content:project` etiketini TAŞIYAN girdileri düşürür — yalnızca
 * `content:project:tr` taşıyan bir girdiye DOKUNMAZ.
 *
 * SONUÇ — her önbellek girdisi, kendisini düşürebilecek TÜM etiketleri
 * taşımalıdır (dar olandan geniş olana), yoksa geniş bir geçersizleştirme
 * sessizce hedefi ıskalar. Bu yüzden aşağıdaki servisler `entityTag` +
 * `localeTag` (+ varsa `slugTag`) etiketlerini BİRLİKTE verir.
 */

/** Önbellek etiketi öneki — tek yerde, elle dize yazılmaz. */
const TAG_PREFIX = 'content';

export type ContentEntity = 'profile' | 'project' | 'post' | 'experience' | 'skill' | 'service';

/** `content:project` — varlığın tamamı. */
export function entityTag(entity: ContentEntity): string {
  return `${TAG_PREFIX}:${entity}`;
}

/** `content:project:tr` — dile göre liste. */
export function localeTag(entity: ContentEntity, locale: string): string {
  return `${entityTag(entity)}:${locale}`;
}

/** `content:project:tr:kiyi-medya` — tek kayıt. */
export function slugTag(entity: ContentEntity, locale: string, slug: string): string {
  return `${localeTag(entity, locale)}:${slug}`;
}

/**
 * Yeniden doğrulama aralığı (saniye).
 *
 * Etiket tabanlı geçersizleştirme ASIL mekanizmadır; bu süre yalnızca emniyet
 * ağıdır — bir mutasyon etiketi düşürmeyi unutursa içerik en fazla bu kadar
 * bayat kalır. Sonsuz bırakmak, unutulmuş bir etiketi kalıcı hataya çevirirdi.
 */
export const CONTENT_REVALIDATE_SECONDS = 3600;

/** Bir okumanın önbellek kimliği: anahtar parçaları + geçersizleştirme etiketleri. */
export interface CacheDescriptor {
  /**
   * Önbellek anahtarının parçaları.
   *
   * `unstable_cache` argümanları anahtara KENDİ EKLER — ölçüldü (next 15.5.22,
   * `spec-extension/unstable-cache.js:82`):
   *
   *   invocationKey = `${cb.toString()}-${keyParts.join(',')}` + JSON.stringify(args)
   *
   * Yani argümanları buraya tekrar koymak ŞART DEĞİL; yine de koyuyoruz çünkü
   * anahtar böylece günlüklerde okunabilir oluyor ve `cb.toString()`e bağımlılık
   * azalıyor (iki farklı okumanın gövdesi birebir aynı yazılırsa `keyParts`
   * onları ayıran tek şeydir).
   */
  keyParts: string[];
  /**
   * Bu girdiyi düşürebilecek TÜM etiketler — dar olandan geniş olana.
   * Eşleşme tam dizedir (yukarıya bakınız), bu yüzden eksik bırakılan bir
   * etiket sessizce geçersizleştirilemez bir girdi bırakır.
   */
  tags: string[];
}

/**
 * Bir public okuma fonksiyonunu önbelleğe alır.
 *
 * ETİKETLER NEDEN FONKSİYONDAN GELİYOR: `unstable_cache`'in `tags` seçeneği
 * SARMALAMA ANINDA bir kez okunur, argümanlara göre değişmez. Sabit bir dizi
 * verilseydi — örneğin `tags: [localeTag('skill', 'tr')]` — `getSkills('en')`
 * çağrısı ayrı bir önbellek girdisine düşer (anahtar argümanı içeriyor) ama
 * `content:skill:tr` etiketiyle işaretlenirdi. Sonuç: `content:skill:en`
 * geçersizleştirmesi o girdiyi ASLA düşüremez; İngilizce içerik yalnızca
 * `CONTENT_REVALIDATE_SECONDS` dolunca tazelenirdi. SESSİZ BAYATLAMA.
 *
 * `describe` zorunlu tutularak bu hata yapısal olarak imkânsız kılındı:
 * etiketler her çağrıda o çağrının argümanlarından hesaplanır.
 *
 * NOT: `unstable_cache` Next'in deneysel API'sidir (ADR-011 "veya güncel
 * eşdeğeri" diyerek bunu öngördü). Tek yerde sarmalandığı için ileride
 * `use cache` direktifine geçiş tek dosyada yapılır.
 */
export function cachedRead<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  describe: (...args: Args) => CacheDescriptor,
): (...args: Args) => Promise<Result> {
  return (...args: Args): Promise<Result> => {
    const { keyParts, tags } = describe(...args);
    return unstable_cache(read, keyParts, {
      tags,
      revalidate: CONTENT_REVALIDATE_SECONDS,
    })(...args);
  };
}
