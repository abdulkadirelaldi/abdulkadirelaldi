import { VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { ARALIK_AYRACI, AYLAR_KISA, AYLAR_UZUN, DEVAM, tamGunMetni } from '@/i18n/tarih';
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

/** `2024-06-01` → `Haz 2024`. Biçim bozuksa dizeyi olduğu gibi döndürür. */
export function ayYil(gun: AppDay, dil: Dil = VARSAYILAN_DIL): string {
  const [yil, ay] = gun.split('-');
  const ad = AYLAR_KISA[dil][Number(ay) - 1];
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
export function aralik(
  baslangic: AppDay,
  bitis: AppDay | null,
  suregelen: boolean,
  dil: Dil = VARSAYILAN_DIL,
): string {
  const bas = ayYil(baslangic, dil);
  const ayrac = ARALIK_AYRACI[dil];
  if (suregelen) return `${bas}${ayrac}${DEVAM[dil]}`;
  if (!bitis) return bas;
  return `${bas}${ayrac}${ayYil(bitis, dil)}`;
}

/** Uzun ay adları — kısa liste kart/etiket için, bu liste tam tarih için. */

/**
 * `2026-06-01` → `1 Haziran 2026`. Blog yazılarının yayın tarihi.
 *
 * ISO ZAMAN DAMGASI VERİLİRSE gün kısmı alınır (`slice(0, 10)`); saat bilerek
 * yok sayılır. Yayın tarihi bir GÜN bilgisidir ve `new Date(...)` üzerinden
 * yerel saate çevrilirse gece yarısına yakın kayıtlarda bir gün kayabilir —
 * `ayYil` ile aynı gerekçe.
 */
export function tamGun(gunVeyaIso: string, dil: Dil = VARSAYILAN_DIL): string {
  const gun = gunVeyaIso.slice(0, 10);
  const [yil, ay, gunSayisi] = gun.split('-');
  const ad = AYLAR_UZUN[dil][Number(ay) - 1];
  if (!yil || !ad || !gunSayisi) return gun;
  return tamGunMetni(dil, Number(gunSayisi), ad, yil);
}
