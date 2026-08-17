import type { AppDay } from '@/server/services/_shared/app-date';

/**
 * `AppDay` (YYYY-MM-DD) biçimleyicileri — §4.1 zaman çizelgesi ve /cv.
 *
 * NEDEN `Intl.DateTimeFormat` DEĞİL: `new Date('2024-06-01')` dizeyi UTC gece
 * yarısı sayar; Europe/Istanbul'da biçimlenirse gün kayabilir ve "Haz 2024"
 * bazı ortamlarda "May 2024" olur. ADR-016 zaten gün dizelerini gün olarak
 * tutuyor — dizeyi parçalamak hem doğru hem sunucu/istemci arasında
 * deterministik. Ay adları da böylece çalışma zamanı yereline bağlı kalmıyor.
 */

const AYLAR = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const;

/** `2024-06-01` → `Haz 2024`. Biçim bozuksa dizeyi olduğu gibi döndürür. */
export function ayYil(gun: AppDay): string {
  const [yil, ay] = gun.split('-');
  const ad = AYLAR[Number(ay) - 1];
  return yil && ad ? `${ad} ${yil}` : gun;
}

/** `2024-06-01` → `2024`. */
export function yil(gun: AppDay): string {
  return gun.slice(0, 4);
}

/**
 * Zaman aralığı metni.
 *
 * Süregelen kayıtta bitiş "Devam" olur — boş bırakmak "bitmiş ama tarihi yok"
 * ile karışırdı. `endDate` yoksa ve `current` de değilse tek tarih yazılır.
 */
export function aralik(baslangic: AppDay, bitis: AppDay | null, suregelen: boolean): string {
  const bas = ayYil(baslangic);
  if (suregelen) return `${bas} — Devam`;
  if (!bitis) return bas;
  return `${bas} — ${ayYil(bitis)}`;
}
