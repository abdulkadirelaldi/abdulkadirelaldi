import type { AppDay } from './app-date';
import { appDayToDate, appToday, dateToAppDay } from './app-date';

/**
 * Site istatistikleri — ADR-027 "istatistikler TÜRETİLİR".
 *
 * `Profile.stats` diye bir alan YOK ve eklenmeyecek. Elle girilen bir sayı
 * kaçınılmaz olarak gerçekten sapar: panele "12 proje" yazılır, sonra iki proje
 * arşivlenir, sayfa hâlâ 12 der. Hata SESSİZDİR — kimse fark etmez çünkü
 * ekranda geçerli görünen bir sayı vardır. Türetilmiş sayı yanlış olamaz;
 * en fazla "0" olur ki bu doğrudur.
 *
 * KURAL: türetilemeyen istatistik DÖNMEZ. Bu modül `clients` gibi bir alanı
 * "şimdilik 0" diye uydurmaz — alan F4'te gerçek veri gelene kadar YOKTUR
 * (bkz. `SiteStatsDto`).
 *
 * Tüm zaman hesabı ADR-016'nın gün yardımcılarından geçer: yıl dönümü sınırı
 * bir GÜN meselesidir, an meselesi değil. `Date` aritmetiğiyle yapılsaydı
 * sunucu UTC'deyken Europe/Istanbul'da 00:00–03:00 arasında yıl dönümü bir gün
 * geç kutlanırdı.
 */

/* ===========================================================================
 * DTO
 * ======================================================================== */

/**
 * Ana sayfanın istatistik kartları.
 *
 * F4 GENİŞLETMESİ: müşteri/iş sayısı buraya `clients?: number` olarak
 * eklenecek — OPSİYONEL alan olarak. Böylece (a) bugünkü Frontend kodu
 * derlenmeye devam eder, (b) alan yokken kart RENDER EDİLMEZ, yani ADR-027'nin
 * "türetilemeyen istatistik sayfada yer almaz" kuralı tip düzeyinde korunur.
 * `clients: number | null` seçilmedi: `null` bir kartın "0 müşteri" diye
 * render edilmesine davetiye çıkarır.
 */
export interface SiteStatsDto {
  /**
   * En erken `Experience.startDate`'ten bugüne TAM yıl.
   *
   * Yıl dönümü GEÇMEDEN artmaz: 2020-08-15 başlangıç, bugün 2026-08-12 ise 5
   * (6 değil). Kayıt yoksa 0.
   */
  experienceYears: number;

  /** `PUBLISHED` ve `publishedAt <= now` olan proje sayısı. Yoksa 0. */
  publishedProjects: number;
}

/* ===========================================================================
 * YIL HESABI
 * ======================================================================== */

/**
 * İki gün arasındaki TAM yıl sayısı — yıl dönümü geçmemişse aşağı yuvarlar.
 *
 * NEDEN gün farkını 365'e bölmüyoruz: artık yıllar birikir. 4 yıllık bir
 * deneyimde 1 fazladan gün, 100 yılda 24 gün eder — ama asıl sorun sınırda:
 * `Math.floor(days / 365)` yıl dönümünden BİR GÜN ÖNCE zaten yeni yılı
 * gösterebilir. Takvim karşılaştırması bu sınıf hatayı tamamen kapatır.
 *
 * `to < from` ise 0 döner (negatif "deneyim yılı" anlamsız) — bkz. gelecek
 * tarihli `Experience` kaydı.
 */
export function fullYearsBetween(from: AppDay, to: AppDay): number {
  // Biçim ve takvim doğrulaması (ADR-016) — "2026-02-30" burada patlar.
  appDayToDate(from);
  appDayToDate(to);

  const yearDelta = Number(to.slice(0, 4)) - Number(from.slice(0, 4));

  /**
   * `MM-DD` dizeleri sabit genişlikte olduğu için sözlük sırası takvim
   * sırasıyla AYNIDIR — ayrıca sayıya çevirmeye gerek yok.
   *
   * 29 Şubat başlangıcı: artık olmayan yılda yıl dönümü 1 Mart sayılır
   * ('02-28' < '02-29'). Bir günlük bu fark yılda bir kez ve yalnızca kozmetik;
   * önemli olan sayının bir yerde deterministik olması.
   */
  const anniversaryPassed = to.slice(5) >= from.slice(5);

  return Math.max(0, anniversaryPassed ? yearDelta : yearDelta - 1);
}

/**
 * En erken başlangıç gününden bugüne deneyim yılı.
 *
 * `earliestStart` `null` ise (hiç `Experience` kaydı yok) 0 döner — patlamaz.
 * Boş veritabanı geçerli bir durumdur: site kurulduğu gün içerik yoktur.
 */
export function experienceYearsFrom(earliestStart: AppDay | null, today: AppDay): number {
  if (earliestStart === null) {
    return 0;
  }
  return fullYearsBetween(earliestStart, today);
}

/* ===========================================================================
 * SERVİS
 * ======================================================================== */

/** Prisma satırından okunan en erken başlangıç. */
export interface EarliestExperienceRow {
  startDate: Date;
}

/**
 * `getSiteStats`'ın veri ihtiyacı — istemciden bağımsız.
 *
 * Servis dosyası bu arayüzü Prisma ile karşılar; test sahte bir uygulama verir.
 * Böylece hesap mantığı veritabanı olmadan sınanır.
 */
export interface StatsSource {
  /** Kayıt yoksa `null`. */
  earliestExperienceStart(): Promise<Date | null>;
  publishedProjectCount(): Promise<number>;
}

/**
 * İstatistikleri hesaplar.
 *
 * İki sorgu BİRBİRİNDEN BAĞIMSIZ, bu yüzden paralel — sıralı olsalardı ana
 * sayfa gereksiz yere iki gidiş-dönüş beklerdi (K1, LCP).
 */
export async function computeSiteStats(
  source: StatsSource,
  now: Date = new Date(),
): Promise<SiteStatsDto> {
  const [earliest, publishedProjects] = await Promise.all([
    source.earliestExperienceStart(),
    source.publishedProjectCount(),
  ]);

  return {
    experienceYears: experienceYearsFrom(
      earliest === null ? null : dateToAppDay(earliest),
      appToday(now),
    ),
    publishedProjects,
  };
}
