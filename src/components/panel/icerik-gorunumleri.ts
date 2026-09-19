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

/** Liste adresi — bağlantılar tek yerden kuruluyor. */
export function icerikYolu(taban: string, { durum, sayfa }: { durum?: string; sayfa?: number }) {
  const p = new URLSearchParams();
  if (durum && durum !== 'hepsi') p.set('durum', durum);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `${taban}?${sorgu}` : taban;
}
