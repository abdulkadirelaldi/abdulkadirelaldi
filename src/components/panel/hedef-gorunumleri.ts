import type { GoalStatus } from '@/types';

/**
 * HEDEF GÖRÜNÜMLERİ — §4.2 `/panel/hayat/hedefler`, T-115.
 *
 * Sekmeler `GoalStatus`un dört değeri + "hepsi". Adres anahtarları Türkçe
 * (`?gorunum=ulasildi`); enum değeri adrese sızmıyor. Tanınmayan anahtar
 * "hepsi"ye düşüyor — adres çubuğu kullanıcı girdisidir (ADR-032).
 *
 * "HEPSİ" VARSAYILAN: servis durumu enum TANIM sırasıyla sıralıyor (ACTIVE,
 * PAUSED, ACHIEVED, ABANDONED), yani açık hedefler zaten üstte. Varsayılanı
 * "Aktif"e sabitlemek ulaşılmış hedefleri bir tık uzağa itmekten başka bir
 * şey kazandırmazdı.
 */

export type HedefGorunumu = {
  anahtar: string;
  etiket: string;
  status?: GoalStatus;
  bosBaslik: string;
  bosAciklama: string;
};

export const VARSAYILAN_HEDEF_GORUNUMU: HedefGorunumu = {
  anahtar: 'hepsi',
  etiket: 'Hepsi',
  bosBaslik: 'Henüz hedef yok',
  bosAciklama: 'Bir hedef tanımla; ilerlemesini ve hedef tarihe kalan günü burada izlersin.',
};

export const HEDEF_GORUNUMLERI: readonly HedefGorunumu[] = [
  VARSAYILAN_HEDEF_GORUNUMU,
  {
    anahtar: 'aktif',
    etiket: 'Aktif',
    status: 'ACTIVE',
    bosBaslik: 'Aktif hedef yok',
    bosAciklama: 'Üzerinde çalıştığın bir hedef eklediğinde burada görünür.',
  },
  {
    anahtar: 'duraklatildi',
    etiket: 'Duraklatıldı',
    status: 'PAUSED',
    bosBaslik: 'Duraklatılmış hedef yok',
    bosAciklama: 'Bir hedefi bırakmadan beklemeye almak için durumunu "Duraklatıldı" yap.',
  },
  {
    anahtar: 'ulasildi',
    etiket: 'Ulaşıldı',
    status: 'ACHIEVED',
    bosBaslik: 'Henüz ulaşılan hedef yok',
    bosAciklama: 'Ulaştığın hedefin durumunu "Ulaşıldı" yaptığında burada birikir.',
  },
  {
    anahtar: 'vazgecildi',
    etiket: 'Vazgeçildi',
    status: 'ABANDONED',
    bosBaslik: 'Vazgeçilen hedef yok',
    bosAciklama: 'Vazgeçtiğin hedefi silmek yerine bu durumda tutabilirsin.',
  },
];

export function hedefGorunumuBul(anahtar: string | undefined): HedefGorunumu {
  return HEDEF_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? VARSAYILAN_HEDEF_GORUNUMU;
}
