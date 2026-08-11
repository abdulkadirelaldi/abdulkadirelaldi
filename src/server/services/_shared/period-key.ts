import { appIsoWeek, toAppDay, type AppDay } from './app-date';

/**
 * `periodKey` üreticisi — ADR-015.
 *
 * `Transaction.@@unique([sourceRecurringId, periodKey])` ile birlikte cron'un
 * çift üretimini VERİTABANI DÜZEYİNDE engeller. Uygulama mantığına güvenilmez:
 * eşzamanlı iki çalıştırma "önce sorgula, yoksa ekle" desenini yarış koşuluyla
 * atlatabilir; unique kısıt atlatamaz.
 *
 * Anahtar DETERMİNİSTİK olmalıdır — aynı dönem için daima aynı dize. Bu yüzden
 * gün hesabı ADR-016'nın Europe/Istanbul yardımcısından geçer; sunucunun yerel
 * saatine göre hesaplansaydı UTC'de koşan cron ay sınırında farklı anahtar
 * üretir ve aynı ay iki kez işlenirdi.
 */

/** `RecurringTransaction.recurrenceRule` değerleriyle birebir aynı (T-011). */
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/**
 * Dönem anahtarını üretir.
 *
 * | Sıklık   | Biçim        | Örnek        |
 * | -------- | ------------ | ------------ |
 * | DAILY    | `YYYY-MM-DD` | `2026-08-05` |
 * | WEEKLY   | `YYYY-Www`   | `2026-W32`   |
 * | MONTHLY  | `YYYY-MM`    | `2026-08`    |
 * | YEARLY   | `YYYY`       | `2026`       |
 */
export function buildPeriodKey(frequency: RecurrenceFrequency, day: AppDay): string {
  switch (frequency) {
    case 'DAILY':
      return day;
    case 'WEEKLY': {
      const { year, week } = appIsoWeek(day);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    case 'MONTHLY':
      return day.slice(0, 7);
    case 'YEARLY':
      return day.slice(0, 4);
  }
}

/** Bir andan dönem anahtarı — cron doğrudan bunu çağırır. */
export function periodKeyForInstant(
  frequency: RecurrenceFrequency,
  instant: Date = new Date(),
): string {
  return buildPeriodKey(frequency, toAppDay(instant));
}

const PERIOD_KEY_PATTERN =
  /^(?:\d{4}|\d{4}-(?:0[1-9]|1[0-2])|\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])|\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))$/;

/** Üretilmiş anahtarın biçimini doğrular — T-011'deki Zod şemasıyla aynı desen. */
export function isValidPeriodKey(value: string): boolean {
  return PERIOD_KEY_PATTERN.test(value);
}
