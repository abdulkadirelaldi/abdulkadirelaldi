import { VARSAYILAN_DIL, dilMi, type Dil } from '@/i18n/diller';
import { ContentStatus } from '@/types';

/**
 * İÇERİK DURUM SÜZGEÇLERİ — §4.2 `/panel/icerik/**`.
 *
 * T-041f'in `mesaj-gorunumleri.ts` kalıbının ikinci uygulaması: etiket, ürettiği
 * filtre ve adres anahtarı TEK YERDE. Orada işe yaradı, burada da aynı sebeple
 * duruyor — sekme "Taslak" derken filtrenin başka bir şey süzmesi, kullanıcının
 * göremeyeceği bir ayrışma olurdu.
 *
 * "HEPSİ" `status` ALANINI HİÇ VERMİYOR. `fetchProjectsForPanel` filtreyi
 * verilmediğinde tüm durumları döndürüyor; buraya bir "hepsi" değeri uydurmak
 * (ör. `status: 'ALL'`) şemada olmayan bir durum icat etmek olurdu.
 */

export const DURUM_ETIKET: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'Taslak',
  [ContentStatus.PUBLISHED]: 'Yayında',
  [ContentStatus.SCHEDULED]: 'Zamanlanmış',
  [ContentStatus.ARCHIVED]: 'Arşiv',
};

/** Rozet rengi — durum tek bakışta ayırt edilebilmeli. */
export const DURUM_VARYANT: Record<ContentStatus, 'neutral' | 'success' | 'warning' | 'info'> = {
  [ContentStatus.DRAFT]: 'neutral',
  [ContentStatus.PUBLISHED]: 'success',
  [ContentStatus.SCHEDULED]: 'info',
  [ContentStatus.ARCHIVED]: 'warning',
};

export type DurumGorunumu = {
  /** `?durum=…`; "hepsi" için boş. */
  anahtar: string;
  etiket: string;
  /** Verilmezse tüm durumlar gelir. */
  durum?: ContentStatus;
};

export const DURUM_GORUNUMLERI: readonly DurumGorunumu[] = [
  { anahtar: 'hepsi', etiket: 'Hepsi' },
  { anahtar: 'taslak', etiket: 'Taslak', durum: ContentStatus.DRAFT },
  { anahtar: 'yayinda', etiket: 'Yayında', durum: ContentStatus.PUBLISHED },
  { anahtar: 'zamanlanmis', etiket: 'Zamanlanmış', durum: ContentStatus.SCHEDULED },
  { anahtar: 'arsiv', etiket: 'Arşiv', durum: ContentStatus.ARCHIVED },
];

export function durumGorunumuBul(anahtar: string | undefined): DurumGorunumu {
  return (
    DURUM_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? {
      anahtar: 'hepsi',
      etiket: 'Hepsi',
    }
  );
}

/**
 * PANEL DİLİ — `?dil=tr|en|de` (ADR-046).
 *
 * Bilinmeyen, eksik ya da dizi hâlinde gelen değer VARSAYILAN dile düşer:
 * `?dil=fr` bir hata sayfası değil, Türkçe liste göstermeli — adres elle
 * yazıldığında kullanıcı boş bir ekranla karşılaşmasın.
 */
export function panelDili(ham: string | string[] | undefined): Dil {
  const deger = Array.isArray(ham) ? ham[0] : ham;
  return dilMi(deger) ? deger : VARSAYILAN_DIL;
}

/**
 * Liste adresi — bağlantılar tek yerden kuruluyor.
 *
 * Varsayılan değerler adrese YAZILMIYOR (`hepsi`, sayfa 1, `tr`): Türkçe
 * liste eski adresinde kalıyor, yer imleri ve testler kırılmıyor.
 */
export function icerikYolu(
  taban: string,
  { durum, sayfa, dil }: { durum?: string; sayfa?: number; dil?: Dil },
) {
  const p = new URLSearchParams();
  if (dil && dil !== VARSAYILAN_DIL) p.set('dil', dil);
  if (durum && durum !== 'hepsi') p.set('durum', durum);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `${taban}?${sorgu}` : taban;
}
