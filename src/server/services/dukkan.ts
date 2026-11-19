import type { DukkanGirdisi, PaketSayGirdisi, PaketTuru } from '@/lib/schemas/dukkan';
import { PAKET_TURLERI } from '@/lib/schemas/dukkan';
import { db } from '@/server/db';

/**
 * DÜKKÂN KAYDI servisi (ADR-058). Dükkân işlerin etiketinden türer (ADR-057); burada yalnızca ek
 * bilgisi durur: Drive klasörü, not, aylık paket hedefi ve o ayın sayacı.
 *
 * Ay `YYYY-AA` (İstanbul) çağırandan gelir — servis saat okumaz.
 * ÖNBELLEKLENMEZ — kişisel veri, public tarafta okunmuyor.
 */

export class DukkanHatasi extends Error {
  constructor(
    readonly kod: 'NOT_FOUND' | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'DukkanHatasi';
  }
}

export interface PaketDurumu {
  tur: PaketTuru;
  n: number;
  hedef: number;
}

export interface DukkanKaydiDto {
  anahtar: string;
  driveUrl: string | null;
  not: string | null;
  /** `null`: bu dükkânın aylık paketi yok. */
  paket: PaketDurumu[] | null;
}

type Satir = {
  anahtar: string;
  driveUrl: string | null;
  not: string | null;
  paketReels: number | null;
  paketPost: number | null;
  paketStory: number | null;
  sayaclar: { reels: number; post: number; story: number }[];
};

const HEDEF_ALANI = { reels: 'paketReels', post: 'paketPost', story: 'paketStory' } as const;

function dto(s: Satir): DukkanKaydiDto {
  const sayac = s.sayaclar[0];
  const paketVar = PAKET_TURLERI.some((t) => s[HEDEF_ALANI[t]] !== null);
  return {
    anahtar: s.anahtar,
    driveUrl: s.driveUrl,
    not: s.not,
    paket: paketVar
      ? PAKET_TURLERI.map((tur) => ({ tur, n: sayac?.[tur] ?? 0, hedef: s[HEDEF_ALANI[tur]] ?? 0 }))
      : null,
  };
}

const secim = (ay: string) => ({ sayaclar: { where: { ay } } }) as const;

/** Bütün kayıtlar, anahtara göre — sokak tek sorguyla kurulsun. */
export async function fetchDukkanKayitlari(
  ay: string,
  client = db,
): Promise<Record<string, DukkanKaydiDto>> {
  const satirlar = await client.dukkan.findMany({ include: secim(ay) });
  return Object.fromEntries(satirlar.map((s) => [s.anahtar, dto(s)]));
}

export async function dukkanKaydet(
  g: DukkanGirdisi,
  ay: string,
  client = db,
): Promise<DukkanKaydiDto> {
  const alanlar = {
    driveUrl: g.driveUrl,
    not: g.not,
    paketReels: g.paket?.reels ?? null,
    paketPost: g.paket?.post ?? null,
    paketStory: g.paket?.story ?? null,
  };
  return dto(
    await client.dukkan.upsert({
      where: { anahtar: g.anahtar },
      create: { anahtar: g.anahtar, ...alanlar },
      update: alanlar,
      include: secim(ay),
    }),
  );
}

/** Bu ayın sayacını bir artırır ya da azaltır; sıfırın altına inmez. Paketi olmayan dükkân sayılmaz. */
export async function paketSay(
  g: PaketSayGirdisi,
  ay: string,
  client = db,
): Promise<DukkanKaydiDto> {
  return client.$transaction(async (tx) => {
    const d = await tx.dukkan.findUnique({ where: { anahtar: g.anahtar } });
    if (!d || PAKET_TURLERI.every((t) => d[HEDEF_ALANI[t]] === null)) {
      throw new DukkanHatasi('NOT_FOUND', 'Bu dükkânın aylık paketi yok. Önce paketi tanımla.');
    }
    const anahtar = { dukkanAnahtar_ay: { dukkanAnahtar: g.anahtar, ay } };
    const once = await tx.paketSayac.findUnique({ where: anahtar });
    const yeni = Math.max(0, (once?.[g.tur] ?? 0) + g.fark);
    await tx.paketSayac.upsert({
      where: anahtar,
      create: { dukkanAnahtar: g.anahtar, ay, [g.tur]: yeni },
      update: { [g.tur]: yeni },
    });
    return dto(
      (await tx.dukkan.findUnique({ where: { anahtar: g.anahtar }, include: secim(ay) }))!,
    );
  });
}
