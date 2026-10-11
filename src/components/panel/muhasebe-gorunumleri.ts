import { PaymentMethod, TransactionType } from '@/types';

/**
 * MUHASEBE GÖRÜNÜMLERİ — §4.2 `/panel/muhasebe`.
 *
 * Kalıbın beşinci görünüm tablosu (mesaj · içerik · denetim · müşteri · muhasebe).
 * Etiket, ürettiği filtre ve adres anahtarı TEK YERDE.
 *
 * "HEPSİ" `type` ve `isPaid` alanlarını HİÇ VERMİYOR — `transactionFilterSchema`da
 * ikisi de opsiyonel ve verilmediğinde süzmüyor. Buraya `'ALL'` gibi bir değer
 * uydurmak şemada olmayan bir tür icat etmek olurdu.
 */

export const ISLEM_TURU_ETIKET: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Gelir',
  [TransactionType.EXPENSE]: 'Gider',
};

export const ISLEM_TURU_VARYANT: Record<TransactionType, 'success' | 'danger'> = {
  [TransactionType.INCOME]: 'success',
  [TransactionType.EXPENSE]: 'danger',
};

export const ODEME_YONTEMI_ETIKET: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.BANK_TRANSFER]: 'Havale/EFT',
  [PaymentMethod.CREDIT_CARD]: 'Kredi kartı',
  [PaymentMethod.OTHER]: 'Diğer',
};

export type MuhasebeGorunumu = {
  anahtar: string;
  etiket: string;
  type?: TransactionType;
  isPaid?: boolean;
};

export const MUHASEBE_GORUNUMLERI: readonly MuhasebeGorunumu[] = [
  { anahtar: 'hepsi', etiket: 'Hepsi' },
  { anahtar: 'gelir', etiket: 'Gelir', type: TransactionType.INCOME },
  { anahtar: 'gider', etiket: 'Gider', type: TransactionType.EXPENSE },
  /*
    "BEKLEYEN" = kesildi ama gelmedi. `isPaid: false` tek başına gideri de
    kapsar; bu görünüm GELİR ∧ ¬ödenmiş demek — `JobFinancialsDto.pending`in
    tanımıyla birebir aynı, yani iki yüzey aynı soruyu aynı şekilde soruyor.
  */
  { anahtar: 'bekleyen', etiket: 'Bekleyen tahsilat', type: TransactionType.INCOME, isPaid: false },
  {
    anahtar: 'odenmemis-gider',
    etiket: 'Ödenmemiş gider',
    type: TransactionType.EXPENSE,
    isPaid: false,
  },
];

export function muhasebeGorunumuBul(anahtar: string | undefined): MuhasebeGorunumu {
  return (
    MUHASEBE_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? {
      anahtar: 'hepsi',
      etiket: 'Hepsi',
    }
  );
}

/** Liste adresi — bağlantılar tek yerden kuruluyor. */
export function muhasebeYolu({
  gorunum,
  from,
  to,
  kategori,
  sayfa,
}: {
  gorunum?: string;
  from?: string;
  to?: string;
  kategori?: string;
  sayfa?: number;
}): string {
  const p = new URLSearchParams();
  if (gorunum && gorunum !== 'hepsi') p.set('gorunum', gorunum);
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  if (kategori) p.set('kategori', kategori);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const sorgu = p.toString();
  return sorgu ? `/panel/muhasebe?${sorgu}` : '/panel/muhasebe';
}
