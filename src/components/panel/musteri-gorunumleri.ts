import type { ClientFilterInput } from '@/lib/schemas/client';

/**
 * MÜŞTERİ GÖRÜNÜMLERİ — §4.2 `/panel/musteriler`.
 *
 * Kalıbın dördüncü görünüm tablosu (mesaj · içerik · denetim · müşteri).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ "HEPSİ" ARŞİVİ GİZLEMİYOR — T-038'in kararı, Backend T-100'de KORUDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Varsayılan görünüm `isArchived` alanını HİÇ VERMİYOR, yani arşiv DAHİL her şey
 * geliyor. Varsayılanın gizlemesi "müşterim kayboldu" sorusunu üretirdi.
 *
 * Bu, iş formundaki müşteri seçicisinin ihtiyacının TERSİ — orası
 * `isArchived: false` göndermek zorunda. Backend'in cümlesi: "İki yüzeyin
 * ihtiyacı zıt ve bunu çözen yer varsayılan değil ÇAĞIRAN." Bu dosya liste
 * yüzeyinin çağrısı; seçicinin çağrısı `is-formu.tsx`te ve orada ayrıca yazılı.
 */

export type MusteriGorunumu = {
  /** `?gorunum=…`; "hepsi" için boş. */
  anahtar: string;
  etiket: string;
  /** Sayfalama ve arama ayrıca eklenir. */
  filtre: Omit<ClientFilterInput, 'page' | 'perPage' | 'q'>;
  bosBaslik: string;
  bosAciklama: string;
};

export const VARSAYILAN_MUSTERI_GORUNUMU: MusteriGorunumu = {
  anahtar: 'hepsi',
  etiket: 'Hepsi',
  /* `isArchived` VERİLMİYOR — yukarıdaki nota bakınız. */
  filtre: {},
  bosBaslik: 'Henüz müşteri yok',
  bosAciklama: 'İlk müşteriyi ekleyebilir ya da bir mesajı işe dönüştürerek otomatik açabilirsin.',
};

export const MUSTERI_GORUNUMLERI: readonly MusteriGorunumu[] = [
  VARSAYILAN_MUSTERI_GORUNUMU,
  {
    anahtar: 'aktif',
    etiket: 'Aktif',
    filtre: { isArchived: false },
    bosBaslik: 'Aktif müşteri yok',
    bosAciklama: 'Tüm müşteriler arşivlenmiş. Arşiv sekmesine bakabilirsin.',
  },
  {
    anahtar: 'arsiv',
    etiket: 'Arşiv',
    filtre: { isArchived: true },
    bosBaslik: 'Arşiv boş',
    bosAciklama: 'Henüz hiçbir müşteriyi arşivlemedin.',
  },
  {
    anahtar: 'kiyi-medya',
    etiket: 'Kıyı Medya',
    filtre: { isKiyiMedya: true },
    bosBaslik: 'Kıyı Medya işaretli müşteri yok',
    bosAciklama: 'Ajans üzerinden gelen müşteriler bu işaretle ayrılıyor.',
  },
];

export function musteriGorunumuBul(anahtar: string | undefined): MusteriGorunumu {
  return MUSTERI_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? VARSAYILAN_MUSTERI_GORUNUMU;
}

/** Liste adresi — bağlantılar tek yerden kuruluyor. */
export function musterilerYolu({
  gorunum,
  q,
  sayfa,
}: {
  gorunum: string;
  q?: string;
  sayfa?: number;
}): string {
  const p = new URLSearchParams();
  if (gorunum && gorunum !== 'hepsi') p.set('gorunum', gorunum);
  if (q) p.set('q', q);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `/panel/musteriler?${sorgu}` : '/panel/musteriler';
}
