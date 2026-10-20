import type { BadgeVariant } from '@/components/ui/badge';
import type { HabitStreak } from '@/server/services/habit';
import type { GoalStatus } from '@/types';

/**
 * HAYAT EKRANLARININ BİÇİMLEYİCİLERİ — §4.2 `/panel/hayat`, T-115.
 *
 * Alışkanlık panosu (istemci), hedef ve günlük listeleri (sunucu) aynı
 * metinleri üretiyor; tek yerde durmaları "12 gün kaldı" ile "12 gün kalan"
 * gibi iki yazımın ekranlara dağılmasını engelliyor.
 *
 * ⚠️ BU DOSYA SUNUCU SERVİSİNDEN YALNIZCA TİP alıyor (`import type`).
 * `services/habit.ts` veritabanı istemcisini içe aktarıyor; değer olarak
 * alınsaydı istemci paketine `db` sürüklenirdi.
 *
 * GÜN DİZESİ PARÇALANIYOR, `Date`e ÇEVRİLMİYOR — `gun-bicim.ts`teki gerekçe
 * (ADR-016): `new Date('2026-10-21')` UTC gece yarısıdır ve İstanbul dışında
 * biçimlenen bir ortamda bir gün kayabilir.
 */

/** Pazartesiden pazara (ADR-016 — hafta pazartesi başlar). */
export const HAFTA_GUNLERI_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

const AYLAR_UZUN = [
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
] as const;

/** `2026-10-21` → `21 Ekim`. Biçim bozuksa dizeyi olduğu gibi döndürür. */
export function gunAy(gun: string): string {
  const [, ay, gunSayisi] = gun.split('-');
  const ad = AYLAR_UZUN[Number(ay) - 1];
  return ad && gunSayisi ? `${Number(gunSayisi)} ${ad}` : gun;
}

/** `2026-10-21` → `21 Ekim 2026`. */
export function gunAyYil(gun: string): string {
  const yil = gun.slice(0, 4);
  const kisa = gunAy(gun);
  return kisa === gun ? gun : `${kisa} ${yil}`;
}

/**
 * Hafta aralığı — `20 – 26 Ekim 2026`; ay ya da yıl değişiyorsa iki uç da tam.
 */
export function haftaAraligi(bas: string, bit: string): string {
  if (bas.slice(0, 4) !== bit.slice(0, 4)) return `${gunAyYil(bas)} – ${gunAyYil(bit)}`;
  if (bas.slice(5, 7) !== bit.slice(5, 7)) return `${gunAy(bas)} – ${gunAyYil(bit)}`;
  return `${Number(bas.slice(8, 10))} – ${gunAyYil(bit)}`;
}

/**
 * Seri metni — `12 gün`, `3 hafta`, `400+ gün`.
 *
 * `atLeast` SESSİZCE DÜŞÜRÜLMÜYOR: servis seriyi 400 günlük pencereyle
 * sınırlıyor ve pencereye dayanan seri "en az" demek. Kesin sayı gibi
 * yazmak, gerçek değeri bilinmeyen bir sayıyı ölçülmüş gibi göstermek olurdu.
 * Ekran okuyucu için `aciklama` "en az" kelimesini açıkça söylüyor; "+"
 * işareti sesli okumada kayboluyor.
 */
export function seriMetni(seri: HabitStreak): { metin: string; aciklama: string } {
  const birim = seri.unit === 'day' ? 'gün' : 'hafta';
  const metin = `${seri.value}${seri.atLeast ? '+' : ''} ${birim}`;
  const aciklama =
    seri.value === 0
      ? 'Seri yok'
      : `Seri: ${seri.atLeast ? 'en az ' : ''}${seri.value} ${birim} üst üste`;
  return { metin, aciklama };
}

/**
 * Hedef tarihe kalan gün — `daysLeft` NEGATİFSE gecikmiş (servis sözleşmesi).
 * `ton` rozet rengi için: gecikme uyarı, bugün/yakın vurgu.
 */
export function kalanGunMetni(gunKaldi: number | null): {
  metin: string;
  ton: 'neutral' | 'warning' | 'danger';
} | null {
  if (gunKaldi === null) return null;
  if (gunKaldi === 0) return { metin: 'Bugün', ton: 'warning' };
  if (gunKaldi < 0) return { metin: `${-gunKaldi} gün gecikti`, ton: 'danger' };
  return { metin: `${gunKaldi} gün kaldı`, ton: gunKaldi <= 7 ? 'warning' : 'neutral' };
}

/** Hedef durumu rozet tonu — liste ve form aynı rengi kullansın. */
export const HEDEF_DURUM_ROZETI: Record<GoalStatus, BadgeVariant> = {
  ACTIVE: 'accent',
  PAUSED: 'neutral',
  ACHIEVED: 'success',
  ABANDONED: 'outline',
};

/**
 * Virgülle ayrılmış etiket metni → dizi.
 *
 * Boş parçalar ("a,,b", sondaki virgül) ATILIYOR — kullanıcı onları etiket
 * olarak yazmadı. Tekrarlar tek kalıyor. UZUNLUK ve SAYI burada KESİLMİYOR:
 * 33 karakterlik bir etiketi sessizce kırpmak kullanıcının yazdığını
 * değiştirmek olurdu; sınırı şema (`tagsSchema`, 20 × 32) söylüyor ve hata
 * alanın altına düşüyor.
 */
export function etiketleriAyir(metin: string): string[] {
  const parcalar = metin
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== '');
  return Array.from(new Set(parcalar));
}

/* ===========================================================================
 * ADRESLER — bağlantılar tek yerden kuruluyor (`musterilerYolu` kalıbı)
 * ======================================================================== */

function sorgulu(taban: string, p: URLSearchParams): string {
  const sorgu = p.toString();
  return sorgu ? `${taban}?${sorgu}` : taban;
}

export function hayatYolu(hafta?: string): string {
  const p = new URLSearchParams();
  if (hafta) p.set('hafta', hafta);
  return sorgulu('/panel/hayat', p);
}

export function aliskanliklarYolu({ gorunum, sayfa }: { gorunum: string; sayfa?: number }) {
  const p = new URLSearchParams();
  if (gorunum && gorunum !== 'hepsi') p.set('gorunum', gorunum);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  return sorgulu('/panel/hayat/aliskanliklar', p);
}

export function hedeflerYolu({
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
  return sorgulu('/panel/hayat/hedefler', p);
}

export function gunlukYolu({
  q,
  etiket,
  sayfa,
}: {
  q?: string;
  etiket?: string;
  sayfa?: number;
}): string {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (etiket) p.set('etiket', etiket);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  return sorgulu('/panel/hayat/gunluk', p);
}

/**
 * Simge metin olarak basılabilir mi.
 *
 * ⚠️ `Habit.icon` İKİ BİÇİMDE GELİYOR: tohum verisi Lucide ADI yazıyor
 * (`book-open`, `droplet` — `TransactionCategory.icon` ile aynı kural), form
 * ise emoji öneriyor. Adı düz metin olarak basmak ekranda "book-open Kitap
 * oku" üretiyordu (T-116 E2E ekran görüntüsünde görüldü). ASCII bir
 * tanımlayıcı GÖSTERİLMİYOR; emoji ya da başka bir simge gösteriliyor.
 * Lucide adını gerçek ikona çevirmek tüm ikon setini istemci paketine
 * sokardı — kategoriler de bu yüzden simgeyi hiç çizmiyor.
 */
export function simgeMetni(icon: string | null): string {
  if (!icon || /^[a-z0-9-]+$/i.test(icon)) return '';
  return `${icon} `;
}
