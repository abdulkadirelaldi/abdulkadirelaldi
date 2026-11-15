import { saatDakika } from '@/lib/takvim/bicim';
import type { TakvimOlusumu } from '@/lib/takvim/gorunum';
import {
  addAppDays,
  appDayStartInstant,
  appWallClockInstant,
  toAppDay,
  type AppDay,
} from '@/server/services/_shared/app-date';

/**
 * KIYI MEDYA → TAKVİM (ADR-049 M3) — saf: köprünün JSON'u takvim oluşumuna çevrilir. Veritabanı
 * sütunu yok (tarih kapısının konusu değil); zaman İstanbul duvar saatiyle kurulur.
 */

/** Köprü sorgusunun anları: ilk günün 00:00'ı → son günün ertesi 00:00 (İstanbul). */
export function kiyiAraligi(bas: AppDay, son: AppDay): { from: string; to: string } {
  return {
    from: appDayStartInstant(bas).toISOString(),
    to: appDayStartInstant(addAppDays(son, 1)).toISOString(),
  };
}

export type KopruOgesi =
  | {
      kaynak: 'etkinlik';
      id: string;
      baslik: string;
      baslangic: string;
      bitis: string;
      tumGun: boolean;
      musteri: string | null;
    }
  | {
      kaynak: 'cekim';
      id: string;
      baslik: string;
      gun: string | null;
      baslangicSaat: string | null;
      bitisSaat: string | null;
      musteri: string | null;
    }
  | {
      kaynak: 'gorev';
      id: string;
      baslik: string;
      gun: string | null;
      saat: string | null;
      musteri: string | null;
    };

const SAAT = /^([01]\d|2[0-3]):[0-5]\d$/;
const saat = (s: string | null) => (s && SAAT.test(s) ? saatDakika(s) : null);

/** Kıyı Medya öğesi → takvim oluşumu (saf). Tarihsiz öğe takvime düşmez (`null`). */
export function kiyiOlusumu(o: KopruOgesi, baglanti: string): TakvimOlusumu | null {
  const ortak = {
    anahtar: `kiyi:${o.kaynak}:${o.id}`,
    etkinlikId: `kiyi:${o.kaynak}:${o.id}`,
    konum: null,
    katman: 'KIYI_MEDYA' as const,
    tekrarli: false,
    baglanti,
  };
  const musteri = o.musteri ? ` · ${o.musteri}` : '';

  if (o.kaynak === 'etkinlik') {
    const bas = new Date(o.baslangic);
    const son = new Date(o.bitis);
    if (Number.isNaN(bas.getTime()) || Number.isNaN(son.getTime())) return null;
    const gun = toAppDay(bas);
    const sonAn = son > bas ? new Date(son.getTime() - 1) : bas;
    return {
      ...ortak,
      baslik: `${o.baslik}${musteri}`,
      kategori: 'TOPLANTI',
      tumGun: o.tumGun,
      baslangic: bas.toISOString(),
      bitis: (son > bas ? son : bas).toISOString(),
      gun,
      sonGun: toAppDay(sonAn) < gun ? gun : toAppDay(sonAn),
    };
  }

  if (!o.gun) return null;
  const an = new Date(o.gun);
  if (Number.isNaN(an.getTime())) return null;
  const gun = toAppDay(an);
  const basDk = saat(o.kaynak === 'cekim' ? o.baslangicSaat : o.saat);
  const sonDk = o.kaynak === 'cekim' ? saat(o.bitisSaat) : null;
  const tumGun = basDk === null;
  const baslangic = tumGun ? appDayStartInstant(gun) : appWallClockInstant(gun, basDk);
  const bitis = tumGun
    ? appDayStartInstant(addAppDays(gun, 1))
    : appWallClockInstant(
        gun,
        sonDk !== null && sonDk > basDk ? sonDk : basDk + (o.kaynak === 'cekim' ? 60 : 30),
      );
  return {
    ...ortak,
    baslik: `${o.kaynak === 'cekim' ? '🎬' : '☑️'} ${o.baslik}${musteri}`,
    kategori: o.kaynak === 'cekim' ? 'IS' : 'HATIRLATICI',
    tumGun,
    baslangic: baslangic.toISOString(),
    bitis: bitis.toISOString(),
    gun,
    sonGun: gun,
  };
}
