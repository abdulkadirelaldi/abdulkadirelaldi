/**
 * Gün semantiği yardımcısı — ADR-016.
 *
 * PROJEDEKİ TEK "BUGÜN" KAYNAĞI. Servislerde `new Date().getMonth()` gibi
 * yerel-saat hesapları YAPILMAZ; hepsi buradan geçer.
 *
 * NEDEN: `@db.Date` alanları kullanıcının yaşadığı TAKVİM GÜNÜNÜ tutar, bir anı
 * değil. Sunucu UTC'de çalışıyorsa (Docker varsayılanı) `new Date().getDate()`
 * Europe/Istanbul'da 00:00–03:00 arasında BİR ÖNCEKİ GÜNÜ verir. Sonuç: gece
 * girilen alışkanlık kaydı dünkü güne yazılır, streak sessizce kırılır ve ay
 * sınırındaki toplam yanlış çıkar. Bu hatalar gündüz test edildiğinde HİÇ
 * GÖRÜNMEZ — en pahalı hata sınıfı.
 *
 * Uygulama `Intl` ile yapılır; yaz saati geçişlerini işletim sisteminin IANA
 * veritabanı çözer. Elle UTC+3 eklemek 2016 öncesi tarihlerde yanlış olurdu.
 */

/** §1.2 — tek kullanıcı, sabit tek zaman dilimi. */
export const APP_TIME_ZONE = 'Europe/Istanbul' as const;

/** `YYYY-MM-DD` — `@db.Date` alanlarının dize karşılığı. */
export type AppDay = string;

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertAppDay(day: string): void {
  if (!DAY_PATTERN.test(day)) {
    throw new Error(`Geçersiz gün biçimi: "${day}". Beklenen: YYYY-AA-GG.`);
  }
}

/**
 * Bir anı, Europe/Istanbul'daki takvim gününe çevirir.
 *
 * `en-CA` yerel ayarı ISO sırasını (`YYYY-MM-DD`) verdiği için seçildi; dil
 * tercihiyle ilgisi yok, yalnızca biçim garantisi.
 */
export function toAppDay(instant: Date): AppDay {
  return DAY_FORMATTER.format(instant);
}

/** Europe/Istanbul'a göre bugün. */
export function appToday(now: Date = new Date()): AppDay {
  return toAppDay(now);
}

/**
 * `YYYY-MM-DD` → Prisma'ya verilecek `Date`.
 *
 * UTC gece yarısı kullanılır. Sütun `date` tipinde olduğu için saat zaten
 * saklanmaz; UTC seçmek, sunucunun yerel saatinden bağımsız ve deterministik
 * olmasını sağlar.
 */
export function appDayToDate(day: AppDay): Date {
  assertAppDay(day);
  const parsed = new Date(`${day}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Geçersiz gün: "${day}".`);
  }

  /**
   * TAKVİM DOĞRULAMASI — biçim kontrolü YETMEZ.
   *
   * `new Date('2026-02-30T00:00:00.000Z')` fırlatmaz, SESSİZCE `2026-03-02`
   * üretir (ölçüldü; `2026-04-31` de `2026-05-01` oluyor). Yani var olmayan bir
   * gün, geçerli ama YANLIŞ bir tarihe dönüşür ve kayıt sessizce başka güne
   * yazılır. Gidiş-dönüş karşılaştırması bu sınıf hatayı kapatır.
   */
  if (parsed.toISOString().slice(0, 10) !== day) {
    throw new Error(`Takvimde olmayan gün: "${day}".`);
  }

  return parsed;
}

/** Prisma'dan okunan `@db.Date` değerini gün dizesine çevirir. */
export function dateToAppDay(value: Date): AppDay {
  return value.toISOString().slice(0, 10);
}

/** Güne gün ekler/çıkarır (takvim aritmetiği, saat kayması yok). */
export function addAppDays(day: AppDay, amount: number): AppDay {
  const base = appDayToDate(day);
  base.setUTCDate(base.getUTCDate() + amount);
  return dateToAppDay(base);
}

/** İki gün arasındaki tam gün farkı (`to - from`). */
export function differenceInAppDays(from: AppDay, to: AppDay): number {
  const ms = appDayToDate(to).getTime() - appDayToDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/* ===========================================================================
 * ARALIKLAR — raporlama sorguları bunları kullanır
 * ======================================================================== */

export interface AppDayRange {
  /** Dahil. */
  from: AppDay;
  /** Dahil. */
  to: AppDay;
}

/** Ayın ilk ve son günü. `month` 1–12'dir (JS'in 0 tabanı DEĞİL). */
export function appMonthRange(year: number, month: number): AppDayRange {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Geçersiz ay: ${month}. 1–12 bekleniyor.`);
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  // Bir sonraki ayın 0. günü = bu ayın son günü. Artık yılı da doğru çözer.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

/** Yılın ilk ve son günü. */
export function appYearRange(year: number): AppDayRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/**
 * Haftanın başlangıcı — PAZARTESİ (ISO 8601).
 *
 * Türkiye'de hafta pazartesi başlar; `getUTCDay()` pazarı 0 sayar, bu yüzden
 * kaydırma gerekiyor. Alışkanlık streak'i ve haftalık hedef bunu kullanır.
 */
export function startOfAppWeek(day: AppDay): AppDay {
  const date = appDayToDate(day);
  const weekday = date.getUTCDay(); // 0 = Pazar
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addAppDays(day, -offset);
}

export function appWeekRange(day: AppDay): AppDayRange {
  const from = startOfAppWeek(day);
  return { from, to: addAppDays(from, 6) };
}

/**
 * ISO 8601 hafta numarası ve o haftanın ait olduğu yıl.
 *
 * `periodKey` (ADR-015) haftalık biçimi buna dayanır. ISO kuralı: haftanın
 * perşembesi hangi yıldaysa hafta o yıla aittir — bu yüzden 29 Aralık 2025
 * "2026-W01" olabilir. `getFullYear()` kullanmak yıl sınırında yanlış olurdu.
 */
export function appIsoWeek(day: AppDay): { year: number; week: number } {
  const date = appDayToDate(day);
  const weekday = date.getUTCDay() || 7; // Pazar 7
  // Haftanın perşembesine taşı
  date.setUTCDate(date.getUTCDate() + 4 - weekday);

  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekday = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstWeekday);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { year: isoYear, week };
}
