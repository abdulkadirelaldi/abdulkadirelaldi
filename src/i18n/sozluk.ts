import type { Dil } from './diller';
import { de } from './sozluk/de';
import { en } from './sozluk/en';
import { tr, type Sozluk } from './sozluk/tr';

/**
 * ADR-046 — dilin arayüz sözlüğü. SUNUCU tarafında çağrılır: üç sözlük birlikte
 * içe aktarılıyor, istemci bileşenlerine bu modül değil, ihtiyaç duydukları
 * metin parçası prop olarak geçer (paket şişmesin).
 */
const SOZLUKLER: Record<Dil, Sozluk> = { tr, en, de };

export function sozluk(dil: Dil): Sozluk {
  return SOZLUKLER[dil];
}

export type { Sozluk };
