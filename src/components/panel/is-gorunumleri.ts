import { JobStatus } from '@/types';

/**
 * İŞ DURUMLARI — §4.2 kanban, ADR-017'nin beş kolonu.
 *
 * Kolon SIRASI işin akışı: aday → teklif → aktif → teslim → iptal. Backend'in
 * `BOARD_COLUMNS` dizisi de aynı sırada; iki yerde yazılı olması bir ayrışma
 * riski ama tersi daha kötü olurdu — arayüzün kolon sırasını sunucudan alması,
 * sunucuyu bir sunum kararının sahibi yapardı. Sıra ayrışırsa kanban garip
 * görünür ama veri doğru kalır; `DURUM_ETIKET` eksik kalırsa tip hatası verir.
 */

export const IS_DURUM_ETIKET: Record<JobStatus, string> = {
  [JobStatus.LEAD]: 'Aday',
  [JobStatus.PROPOSAL]: 'Teklif',
  [JobStatus.ACTIVE]: 'Aktif',
  [JobStatus.DELIVERED]: 'Teslim',
  [JobStatus.CANCELLED]: 'İptal',
};

export const IS_DURUM_VARYANT: Record<
  JobStatus,
  'neutral' | 'info' | 'accent' | 'success' | 'warning'
> = {
  [JobStatus.LEAD]: 'neutral',
  [JobStatus.PROPOSAL]: 'info',
  [JobStatus.ACTIVE]: 'accent',
  [JobStatus.DELIVERED]: 'success',
  [JobStatus.CANCELLED]: 'warning',
};

/** Kanban kolon sırası — işin akışı. */
export const KANBAN_SIRASI: readonly JobStatus[] = [
  JobStatus.LEAD,
  JobStatus.PROPOSAL,
  JobStatus.ACTIVE,
  JobStatus.DELIVERED,
  JobStatus.CANCELLED,
];

export type IsGorunumu = { anahtar: string; etiket: string; durum?: JobStatus };

/** Liste görünümünün durum süzgeci — kanban DEĞİL, tablo görünümü için. */
export const IS_GORUNUMLERI: readonly IsGorunumu[] = [
  { anahtar: 'hepsi', etiket: 'Hepsi' },
  ...KANBAN_SIRASI.map((durum) => ({
    anahtar: durum.toLowerCase(),
    etiket: IS_DURUM_ETIKET[durum],
    durum,
  })),
];

export function isGorunumuBul(anahtar: string | undefined): IsGorunumu {
  return IS_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? { anahtar: 'hepsi', etiket: 'Hepsi' };
}

/** İş listesi adresi — `?gorunum=liste` tablo görünümünü açar. */
export function islerYolu({
  gorunum,
  durum,
  sayfa,
}: {
  /** `kanban` (varsayılan) ya da `liste`. */
  gorunum?: 'kanban' | 'liste';
  durum?: string;
  sayfa?: number;
}): string {
  const p = new URLSearchParams();
  if (gorunum === 'liste') p.set('gorunum', 'liste');
  if (durum && durum !== 'hepsi') p.set('durum', durum);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `/panel/isler?${sorgu}` : '/panel/isler';
}
