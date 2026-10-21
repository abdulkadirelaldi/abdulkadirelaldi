import type { Dil } from './diller';

/**
 * ADR-046 — tarih metinleri, dile göre. Sözlükten AYRI ve küçük: panelin
 * istemci bileşenleri de tarih biçimliyor (`gun-bicim.ts`) ve üç sözlüğün
 * tamamını panel paketine çekmemeli.
 *
 * `Intl.DateTimeFormat` DEĞİL: sunucu ve tarayıcıdaki ICU sürümleri farklı
 * kısaltmalar üretebiliyor (ör. Almanca "Sep." / "Sept.") → hidrasyon farkı.
 * Elle yazılmış tablo her ortamda aynı metni verir.
 */
export const AYLAR_KISA: Record<Dil, readonly string[]> = {
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  // Duden kısaltmaları: dört harfe kadar olanlar kısaltılmaz.
  de: [
    'Jan.',
    'Feb.',
    'März',
    'Apr.',
    'Mai',
    'Juni',
    'Juli',
    'Aug.',
    'Sept.',
    'Okt.',
    'Nov.',
    'Dez.',
  ],
};

export const AYLAR_UZUN: Record<Dil, readonly string[]> = {
  tr: [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
};

/** Devam eden aralığın ucu: "Kas 2023 — Devam" / "Nov 2023 — Present" / "Nov. 2023 – heute". */
export const DEVAM: Record<Dil, string> = { tr: 'Devam', en: 'Present', de: 'heute' };

/** Aralık ayracı — Almancada boşluklu halbgeviertstrich. */
export const ARALIK_AYRACI: Record<Dil, string> = { tr: ' — ', en: ' — ', de: ' – ' };

/** Tam gün: "5 Haziran 2026" / "June 5, 2026" / "5. Juni 2026". */
export function tamGunMetni(dil: Dil, gun: number, ay: string, yil: string): string {
  if (dil === 'en') return `${ay} ${gun}, ${yil}`;
  if (dil === 'de') return `${gun}. ${ay} ${yil}`;
  return `${gun} ${ay} ${yil}`;
}
