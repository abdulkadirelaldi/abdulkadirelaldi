import type { ContactMessageFilterInput } from '@/lib/schemas/contact-message';

/**
 * MESAJ KUTUSU GÖRÜNÜMLERİ — §4.2 `/panel/mesajlar`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÖRÜNÜM = ADI OLAN BİR FİLTRE BİLEŞİMİ, TEK KAYNAKTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sekme etiketi, ürettiği filtre ve adres çubuğundaki anahtar BURADA duruyor.
 * Üçü ayrı yerlerde yazılsaydı bir gün ayrışırdı: sekme "Spam" derken filtre
 * arşivi de kapsar, kullanıcı da neden farklı sayı gördüğünü anlayamazdı.
 * T-032'de menü ve kırıntı yolu için verilen karar ile aynı.
 *
 * §9/2 İÇİN DE BURASI ADRES: Güvenlik'in bekleyen iddiası "panele düşen mesaj
 * görülebiliyor" — testin hangi adresi açacağı ve hangi satırı arayacağı bu
 * tablodan okunur (`?gorunum=gelen`, `[data-mesaj-satir]`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜÇ İNCELİK — ÜÇÜ DE BACKEND'İN SÖZLEŞMESİNDEN GELİYOR (T-038)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. `archived` ÜÇ DURUMLU. `hepsi` görünümü alanı HİÇ VERMİYOR (arşiv dahil
 *    her şey gelir) — `false` vermekle aynı şey değil. Varsayılanın arşivi
 *    gizlemesi "mesajım kayboldu" sorusunu üretirdi; o yüzden kaçış görünümü
 *    olarak duruyor.
 *
 * 2. `isSpam: false` + `minSpamScore` AYRI BİR SORU: "spam sanılmamış ama
 *    puanı yüksek olan ne var" — yani YANLIŞ POZİTİF DEĞİL, yanlış NEGATİF
 *    avı. `spam` görünümünün bir alt kümesi değil, onunla kesişmeyen bir
 *    küme. Ayrı sekme olmasının sebebi bu.
 *
 * 3. `unreadCount` filtreden BAĞIMSIZ gelir; hangi sekmede olursan ol aynı
 *    sayıdır. Arayüz bunu sekmenin yanında değil, sekmelerin DIŞINDA
 *    gösteriyor — sekmeye bitişik bir rozet "bu görünümün sayısı" diye
 *    okunurdu ve her sekmede aynı kalması hata gibi görünürdü.
 */

export type MesajGorunumu = {
  /** Adres çubuğundaki değer: `?gorunum=…`. */
  anahtar: string;
  etiket: string;
  /** Sekme altında görünen tek cümlelik açıklama. */
  aciklama: string;
  /** Bu görünümün ürettiği filtre — sayfalama ve arama ayrıca eklenir. */
  filtre: Omit<ContactMessageFilterInput, 'page' | 'perPage' | 'q'>;
  /** Boş durum metni — her görünümde farklı, çünkü "boş" farklı şey demek. */
  bosBaslik: string;
  bosAciklama: string;
};

/**
 * Yanlış negatif avının eşiği.
 *
 * Backend `spamScore`u ölçüm olarak yazıyor ama "yüksek" için bir sınır
 * tanımlamıyor — karar arayüzün. 20 seçildi çünkü `isSpam` kararı bunun
 * üzerinde veriliyor; eşiği daha aşağı çekmek her mesajı listeye doldurur,
 * daha yukarı çekmek avlanacak bir şey bırakmaz. Sayı burada, tek yerde.
 */
export const SUPHELI_PUAN_ESIGI = 20;

/**
 * Varsayılan görünüm AYRI bir sabit ve dizi ondan besleniyor — tersi değil.
 *
 * `MESAJ_GORUNUMLERI[0]` yazmak `noUncheckedIndexedAccess` altında
 * `undefined` verirdi ve bunu `!` ile bastırmak, diziyi boşaltan bir
 * düzenlemede hatayı çalışma zamanına ertelerdi.
 */
export const VARSAYILAN_GORUNUM: MesajGorunumu = {
  anahtar: 'gelen',
  etiket: 'Gelen kutusu',
  aciklama: 'Spam işaretlenmemiş, arşivlenmemiş mesajlar.',
  filtre: { isSpam: false, archived: false },
  bosBaslik: 'Gelen kutusu boş',
  bosAciklama: 'Yeni bir mesaj geldiğinde burada görünecek. Arşive de bakmak isteyebilirsin.',
};

export const MESAJ_GORUNUMLERI: readonly MesajGorunumu[] = [
  VARSAYILAN_GORUNUM,
  {
    anahtar: 'okunmamis',
    etiket: 'Okunmamış',
    aciklama: 'Henüz açılmamış mesajlar.',
    filtre: { isSpam: false, archived: false, isRead: false },
    bosBaslik: 'Okunmamış mesaj yok',
    bosAciklama: 'Gelen kutusundaki her mesajı açtın.',
  },
  {
    anahtar: 'spam',
    etiket: 'Spam',
    aciklama: 'Spam olarak işaretlenmiş mesajlar. İşaret bir KARAR — geri alınabilir.',
    filtre: { isSpam: true, archived: false },
    bosBaslik: 'Spam kutusu boş',
    bosAciklama: 'Hiçbir mesaj spam işaretlenmemiş.',
  },
  {
    anahtar: 'supheli',
    etiket: 'Yüksek puanlı',
    aciklama: `Spam işaretlenmemiş ama puanı ${SUPHELI_PUAN_ESIGI} ve üzerinde olan mesajlar — gözden kaçan spam burada aranır.`,
    filtre: { isSpam: false, minSpamScore: SUPHELI_PUAN_ESIGI },
    bosBaslik: 'Yüksek puanlı mesaj yok',
    bosAciklama: `Spam işaretlenmemiş mesajların hiçbirinin puanı ${SUPHELI_PUAN_ESIGI}'ye ulaşmıyor.`,
  },
  {
    anahtar: 'arsiv',
    etiket: 'Arşiv',
    aciklama: 'Arşivlenmiş mesajlar. Silinmediler — geri alınabilirler (ADR-020).',
    filtre: { archived: true },
    bosBaslik: 'Arşiv boş',
    bosAciklama: 'Henüz hiçbir mesajı arşivlemedin.',
  },
  {
    anahtar: 'hepsi',
    etiket: 'Hepsi',
    /* `archived` HİÇ VERİLMİYOR — bu görünümün tamamı o kararın üstünde duruyor. */
    aciklama: 'Arşiv ve spam dahil, hiçbir şey süzülmeden. Bir mesaj kaybolduysa burada.',
    filtre: {},
    bosBaslik: 'Hiç mesaj yok',
    bosAciklama: 'İletişim formundan henüz mesaj gelmedi.',
  },
];

export function gorunumBul(anahtar: string | undefined): MesajGorunumu {
  return MESAJ_GORUNUMLERI.find((g) => g.anahtar === anahtar) ?? VARSAYILAN_GORUNUM;
}

/** Görünüm + arama + sayfa → adres. Bağlantılar tek yerden kuruluyor. */
export function mesajlarYolu({
  gorunum,
  q,
  sayfa,
}: {
  gorunum: string;
  q?: string;
  sayfa?: number;
}): string {
  const parametreler = new URLSearchParams({ gorunum });
  if (q) parametreler.set('q', q);
  if (sayfa && sayfa > 1) parametreler.set('sayfa', String(sayfa));
  return `/panel/mesajlar?${parametreler.toString()}`;
}
