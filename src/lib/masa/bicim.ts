import { gunAyMetni, GUN_KISA, saatMetni } from '@/lib/takvim/bicim';
import { haftaninGunu } from '@/lib/takvim/tekrar';
import { differenceInAppDays, type AppDay } from '@/server/services/_shared/app-date';
import type { GorevOnceligi } from '@/types';

/**
 * MASA BİÇİMLERİ (ADR-049 M2) — saf; sunucu ve istemci aynı metni üretir.
 */

export type TeslimDurumu = 'gecikti' | 'bugun' | 'yakin' | 'ileri' | 'yok';

/** "Bugün 14:00" · "Yarın" · "2 gün gecikti" · "Cum, 20 Kasım". */
export function teslimMetni(
  g: { teslimGun: AppDay | null; teslimDakika: number | null },
  bugun: AppDay,
): { metin: string; durum: TeslimDurumu } {
  if (g.teslimGun === null) return { metin: 'Teslim tarihi yok', durum: 'yok' };
  const fark = differenceInAppDays(bugun, g.teslimGun);
  const saat = g.teslimDakika !== null ? ` ${saatMetni(g.teslimDakika)}` : '';
  if (fark < 0) {
    return { metin: `${-fark} gün gecikti`, durum: 'gecikti' };
  }
  if (fark === 0) return { metin: `Bugün${saat}`, durum: 'bugun' };
  if (fark === 1) return { metin: `Yarın${saat}`, durum: 'yakin' };
  const gun = `${GUN_KISA[haftaninGunu(g.teslimGun) - 1]}, ${gunAyMetni(g.teslimGun)}${saat}`;
  return { metin: gun, durum: fark <= 3 ? 'yakin' : 'ileri' };
}

export const ONCELIK_ADLARI: Readonly<Record<GorevOnceligi, string>> = {
  YUKSEK: 'Yüksek',
  NORMAL: 'Normal',
  DUSUK: 'Düşük',
};

export const ONCELIK_SECENEKLERI: readonly GorevOnceligi[] = ['DUSUK', 'NORMAL', 'YUKSEK'];

type SiralanabilirGorev = {
  teslimGun: AppDay | null;
  teslimDakika: number | null;
  oncelik: GorevOnceligi;
};

const ONCELIK_SIRASI: Record<GorevOnceligi, number> = { YUKSEK: 0, NORMAL: 1, DUSUK: 2 };

/** Açık görev sırası: teslimi yakın olan önce, teslimsizler sonda; eşitlikte öncelik. */
export function gorevSirala(a: SiralanabilirGorev, b: SiralanabilirGorev): number {
  if (a.teslimGun !== b.teslimGun) {
    if (a.teslimGun === null) return 1;
    if (b.teslimGun === null) return -1;
    return a.teslimGun.localeCompare(b.teslimGun);
  }
  const da = a.teslimDakika ?? 24 * 60;
  const dbk = b.teslimDakika ?? 24 * 60;
  if (da !== dbk) return da - dbk;
  return ONCELIK_SIRASI[a.oncelik] - ONCELIK_SIRASI[b.oncelik];
}
