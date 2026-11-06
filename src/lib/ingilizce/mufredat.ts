import { GUNLUK } from './gunluk';
import { SINAV } from './sinav';
import type { Alistirma, Ders, Parkur, ParkurKimligi, Unite } from './tipler';
import { YAZILIM } from './yazilim';

/** Üç parkur, menüdeki sırayla. */
export const PARKURLAR: readonly Parkur[] = [GUNLUK, YAZILIM, SINAV];

export interface DersKonumu {
  parkur: Parkur;
  unite: Unite;
  ders: Ders;
  /** Parkurdaki sıra (0'dan); kilit bir öncekine bakar. */
  sira: number;
  onceki: Ders | null;
  sonraki: Ders | null;
}

const DERSLER = new Map<string, DersKonumu>();
const ALISTIRMALAR = new Map<string, Alistirma>();
for (const parkur of PARKURLAR) {
  const sirali = parkur.uniteler.flatMap((unite) => unite.dersler.map((ders) => ({ unite, ders })));
  sirali.forEach(({ unite, ders }, sira) => {
    DERSLER.set(ders.id, {
      parkur,
      unite,
      ders,
      sira,
      onceki: sirali[sira - 1]?.ders ?? null,
      sonraki: sirali[sira + 1]?.ders ?? null,
    });
    for (const a of ders.alistirmalar) ALISTIRMALAR.set(a.id, a);
  });
}

export function parkurBul(id: string): Parkur | null {
  return PARKURLAR.find((p) => p.id === id) ?? null;
}

export function dersBul(id: string): DersKonumu | null {
  return DERSLER.get(id) ?? null;
}

export function alistirmaBul(id: string): Alistirma | null {
  return ALISTIRMALAR.get(id) ?? null;
}

export function parkurDersleri(id: ParkurKimligi): Ders[] {
  return parkurBul(id)?.uniteler.flatMap((u) => [...u.dersler]) ?? [];
}
