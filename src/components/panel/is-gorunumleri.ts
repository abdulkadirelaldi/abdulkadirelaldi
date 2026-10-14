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

/**
 * Bağlı ödeme listesinin üst sınırı — İŞ DETAYINDA KULLANILIYOR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ NEDEN BU DOSYADA, `is-odemeleri.tsx`TE DEĞİL — ÖLÇÜLDÜ, 500 ALINDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sabit ilk olarak `is-odemeleri.tsx` içinde tanımlanmıştı; kullandığı
 * bileşenin yanında durması okunurluk için doğru görünüyordu. `pnpm lint` ve
 * `tsc --noEmit` TEMİZ geçti. Sayfa yine de 500 verdi:
 *
 *   Invalid value for argument `take`: We could not serialize
 *   [object Function] value.          (skip: NaN, take: [object Function])
 *
 * SEBEP: `is-odemeleri.tsx` bir `'use client'` modülü. Sunucu bileşeni böyle
 * bir modülden içe aktarım yaptığında paketleyici O MODÜLÜN TÜM DIŞA
 * AKTARIMLARINI istemci başvuru vekiliyle değiştiriyor — yalnızca bileşeni
 * değil, yanındaki `const`u da. Sunucuda `ODEME_UST_SINIR` artık 500 değil,
 * bir FONKSİYON; `(1 - 1) * fn` → `NaN` ve `take: fn` → Prisma patlıyor.
 *
 * ⚠️ TİP SİSTEMİ BUNU GÖRMÜYOR: TypeScript için dışa aktarımın tipi hâlâ
 * `number`. Yani bu sınıf hata derleme kapılarının HİÇBİRİNDE yakalanmıyor,
 * yalnızca çalıştırmada görünüyor — T-108f'te tam olarak böyle yakalandı.
 *
 * Bu dosya `'use client'` TAŞIMIYOR, o yüzden değer sunucuda gerçek sayı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NEDEN 500 VE NEDEN SAYFALAMA YOK
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Liste `IsBakiye`nin dört toplamıyla TUTMAK zorunda ve o toplamlar
 * `fetchJobFinancials`ın `groupBy`ından, yani TÜM satırlardan geliyor.
 * Kesilmiş bir liste, toplamları tutmayan bir liste olurdu.
 *
 * 500: tek bir işe bağlı yüzlerce hareket gerçekçi değil (T-100'ün hacim
 * ölçümü yılda birkaç yüz hareketin TAMAMI). Aşılırsa `IsOdemeleri` satır
 * sayısını `transactionCount` ile karşılaştırıp ayrışmayı EKRANDA söylüyor.
 */
export const ODEME_UST_SINIR = 500;

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
