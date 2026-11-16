import { gunAyMetni, GUN_KISA, saatMetni } from '@/lib/takvim/bicim';
import { haftaninGunu } from '@/lib/takvim/tekrar';
import { differenceInAppDays, type AppDay } from '@/server/services/_shared/app-date';
import type { IsAlani } from '@/types';

/**
 * İŞLER BİÇİMLERİ (ADR-050) — saf; sunucu ve istemci aynı metni üretir.
 */

/** Alanların adı ve rengi. Renk yalnızca küçük bir nokta — satır sakin kalır. */
export const ALANLAR: Readonly<Record<IsAlani, { ad: string; kisa: string; nokta: string }>> = {
  KIYI_MEDYA: { ad: 'Kıyı Medya', kisa: 'Kıyı', nokta: 'bg-sky-500' },
  OKUL: { ad: 'Okul', kisa: 'Okul', nokta: 'bg-violet-500' },
  SPECTRALOOP: { ad: 'Spectraloop', kisa: 'Spectra', nokta: 'bg-amber-500' },
  KISISEL: { ad: 'Kişisel', kisa: 'Kişisel', nokta: 'bg-emerald-500' },
};

export const ALAN_SIRASI: readonly IsAlani[] = ['KIYI_MEDYA', 'OKUL', 'SPECTRALOOP', 'KISISEL'];

export type TeslimDurumu = 'gecikti' | 'bugun' | 'yakin' | 'ileri' | 'yok';

/** "Bugün 14:00" · "Yarın" · "2 gün gecikti" · "Cum, 20 Kasım". */
export function teslimMetni(
  g: { teslimGun: AppDay | null; teslimDakika: number | null },
  bugun: AppDay,
): { metin: string; durum: TeslimDurumu } {
  if (g.teslimGun === null) return { metin: '', durum: 'yok' };
  const fark = differenceInAppDays(bugun, g.teslimGun);
  const saat = g.teslimDakika !== null ? ` ${saatMetni(g.teslimDakika)}` : '';
  if (fark < 0) return { metin: fark === -1 ? 'Dün' : `${-fark} gün gecikti`, durum: 'gecikti' };
  if (fark === 0) return { metin: `Bugün${saat}`, durum: 'bugun' };
  if (fark === 1) return { metin: `Yarın${saat}`, durum: 'yakin' };
  const gun = `${GUN_KISA[haftaninGunu(g.teslimGun) - 1]}, ${gunAyMetni(g.teslimGun)}${saat}`;
  return { metin: gun, durum: fark <= 3 ? 'yakin' : 'ileri' };
}

type SiralanabilirGorev = { teslimGun: AppDay | null; teslimDakika: number | null };

/** Açık görev sırası: teslimi yakın olan önce, saatlisi gün boyundan önce, tarihsizler sonda. */
export function gorevSirala(a: SiralanabilirGorev, b: SiralanabilirGorev): number {
  if (a.teslimGun !== b.teslimGun) {
    if (a.teslimGun === null) return 1;
    if (b.teslimGun === null) return -1;
    return a.teslimGun.localeCompare(b.teslimGun);
  }
  return (a.teslimDakika ?? 24 * 60) - (b.teslimDakika ?? 24 * 60);
}
