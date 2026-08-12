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

/**
 * Bir public okuma fonksiyonunu önbelleğe alır.
 *
 * `unstable_cache` ANAHTARI ARGÜMANLARDAN TÜRETMEZ — `keyParts` elle verilir.
 * Bu yüzden dinamik parametreler (locale, slug, sayfa) anahtara AÇIKÇA
 * konmalıdır; unutulursa iki farklı sorgu aynı önbellek girdisini paylaşır ve
 * kullanıcı başkasının sonucunu görür. Aşağıdaki sarmalayıcı bunu zorunlu kılar.
 *
 * NOT: `unstable_cache` Next'in deneysel API'sidir (ADR-011 "veya güncel
 * eşdeğeri" diyerek bunu öngördü). Tek yerde sarmalandığı için ileride
 * `use cache` direktifine geçiş tek dosyada yapılır.
 */
export function cachedRead<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  options: {
    /** Önbellek anahtarının sabit kısmı — fonksiyonu benzersiz kılar. */
    keyParts: string[];
    /** Geçersizleştirme etiketleri. */
    tags: string[];
  },
): (...args: Args) => Promise<Result> {
  return unstable_cache(read, options.keyParts, {
    tags: options.tags,
    revalidate: CONTENT_REVALIDATE_SECONDS,
  });
}
