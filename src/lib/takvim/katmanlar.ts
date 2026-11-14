import type { TakvimKatman } from '@/types';

/**
 * TAKVİM KATMANLARI (ADR-049, 2026-11-14) — etkinliğin KİME ait olduğu. Kategori (Spor, Toplantı…)
 * türü söyler ve rengi o belirler; katman takvimde açılıp kapanır.
 *
 * Seçim cihazda bir ÇEREZDE tutulur: sayfa sunucuda doğru süzgeçle basılır (ilk karede tüm
 * etkinlikler görünüp sonra kaybolmaz). Çerez yoksa ya da bozuksa HEPSİ açık — sessizce bir
 * katmanı gizlemek, etkinliği "yok" sanmaktan daha kötüdür.
 */
export interface KatmanBilgisi {
  ad: string;
  emoji: string;
}

export const TAKVIM_KATMANLARI: Readonly<Record<TakvimKatman, KatmanBilgisi>> = {
  KISISEL: { ad: 'Kişisel', emoji: '🙂' },
  OKUL: { ad: 'Okul', emoji: '🎓' },
  KIYI_MEDYA: { ad: 'Kıyı Medya', emoji: '🎬' },
  SPECTRALOOP: { ad: 'Spectraloop', emoji: '🚄' },
};

export const KATMAN_SIRASI: readonly TakvimKatman[] = [
  'KISISEL',
  'OKUL',
  'KIYI_MEDYA',
  'SPECTRALOOP',
];

/** Tek dokunuşluk iki grup. */
export const KATMAN_GRUPLARI = {
  kisisel: { ad: 'Kişisel', katmanlar: ['KISISEL', 'OKUL'] },
  is: { ad: 'İş', katmanlar: ['KIYI_MEDYA', 'SPECTRALOOP'] },
} as const satisfies Record<string, { ad: string; katmanlar: readonly TakvimKatman[] }>;

export type KatmanGrubu = keyof typeof KATMAN_GRUPLARI;

export const KATMAN_COOKIE = 'ae-takvim-katman';
export const KATMAN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function katmanMi(v: string): v is TakvimKatman {
  return (KATMAN_SIRASI as readonly string[]).includes(v);
}

/**
 * Çerez değeri → açık katmanlar (sıralı, tekrarsız). `undefined`/bozuk → hepsi. Bilerek boş
 * bırakılmış seçim (`-`) boş döner: kullanıcı hepsini kapattıysa ekran bunu söyler.
 */
export function katmanlariCoz(deger: string | undefined): TakvimKatman[] {
  if (deger === undefined) return [...KATMAN_SIRASI];
  if (deger === '-') return [];
  const parcalar = deger.split(',');
  if (parcalar.length === 0 || !parcalar.every(katmanMi)) return [...KATMAN_SIRASI];
  return KATMAN_SIRASI.filter((k) => parcalar.includes(k));
}

export function katmanlariYaz(acik: readonly TakvimKatman[]): string {
  return acik.length === 0 ? '-' : KATMAN_SIRASI.filter((k) => acik.includes(k)).join(',');
}

/** Tek katmanı aç/kapat. */
export function katmanDegistir(acik: readonly TakvimKatman[], k: TakvimKatman): TakvimKatman[] {
  return acik.includes(k)
    ? acik.filter((x) => x !== k)
    : KATMAN_SIRASI.filter((x) => x === k || acik.includes(x));
}

export type GrupDurumu = 'acik' | 'kismen' | 'kapali';

export function grupDurumu(acik: readonly TakvimKatman[], grup: KatmanGrubu): GrupDurumu {
  const uyeler = KATMAN_GRUPLARI[grup].katmanlar;
  const sayi = uyeler.filter((k) => acik.includes(k)).length;
  return sayi === uyeler.length ? 'acik' : sayi === 0 ? 'kapali' : 'kismen';
}

/**
 * Grup düğmesi: tamamı açıksa grubu kapatır; kısmen ya da kapalıysa grubun tamamını açar.
 * Öbür grubun katmanlarına dokunmaz — "ikisini de açınca ikisi de görünür".
 */
export function grupDegistir(acik: readonly TakvimKatman[], grup: KatmanGrubu): TakvimKatman[] {
  const uyeler: readonly TakvimKatman[] = KATMAN_GRUPLARI[grup].katmanlar;
  if (grupDurumu(acik, grup) === 'acik') return acik.filter((k) => !uyeler.includes(k));
  return KATMAN_SIRASI.filter((k) => uyeler.includes(k) || acik.includes(k));
}

/**
 * Yeni etkinliğin varsayılan katmanı: tek katman açıksa o (yalnızca İş'e bakarken eklenen
 * etkinlik ekrandan kaybolmasın), değilse ilk açık olan, hiçbiri açık değilse Kişisel.
 */
export function varsayilanKatman(acik: readonly TakvimKatman[]): TakvimKatman {
  return acik[0] ?? 'KISISEL';
}
