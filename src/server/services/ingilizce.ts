import { alistirmaBul, dersBul, PARKURLAR, type DersKonumu } from '@/lib/ingilizce/mufredat';
import type { Alistirma, ParkurKimligi } from '@/lib/ingilizce/tipler';
import { db } from '@/server/db';

import { addAppDays, appDayToDate, appToday, dateToAppDay, type AppDay } from './_shared';

/**
 * İNGİLİZCE İLERLEMESİ (2026-11-06).
 *
 * XP sunucuda hesaplanır, istemci yalnızca hangi soruyu bildiğini söyler. Seri: art arda
 * en az bir ders bitirilen günler; bugün henüz ders yoksa dünden geriye sayılır (seri
 * gün sonuna kadar yaşar). Zayıf soru: SON olayı yanlış olan alıştırma — tekrar dersinde
 * ilk denemede bilinince listeden düşer.
 */

export const DERS_XP = 10;
export const KUSURSUZ_BONUS = 5;
export const TEKRAR_XP = 5;
export const TEKRAR_SORU = 10;
export const HEDEF_SECENEKLERI = [10, 20, 30, 50] as const;
export const VARSAYILAN_HEDEF = 20;

/** Kazanılan XP: ilk tamamlama 10 (+5 hatasız), tekrar oynama ve tekrar dersi 5. SAF. */
export function xpHesapla(ilkKez: boolean, hataSayisi: number): number {
  if (!ilkKez) return TEKRAR_XP;
  return DERS_XP + (hataSayisi === 0 ? KUSURSUZ_BONUS : 0);
}

/** Seri ve bugünün durumu. `gunler` sırasız ve tekrarlı olabilir. SAF. */
export function seriHesapla(
  gunler: readonly AppDay[],
  bugun: AppDay,
): { seri: number; bugunYapildi: boolean } {
  const kume = new Set(gunler);
  const bugunYapildi = kume.has(bugun);
  let gun = bugunYapildi ? bugun : addAppDays(bugun, -1);
  let seri = 0;
  while (kume.has(gun)) {
    seri += 1;
    gun = addAppDays(gun, -1);
  }
  return { seri, bugunYapildi };
}

/** Parkurun ilk dersi ve bir öncekisi bitmiş ders açıktır. SAF. */
export function acikMi(konum: DersKonumu, tamamlanan: ReadonlySet<string>): boolean {
  return konum.onceki === null || tamamlanan.has(konum.onceki.id) || tamamlanan.has(konum.ders.id);
}

/** Olaylar eskiden yeniye: son olayı yanlış olanlar. SAF. */
export function zayiflar(
  olaylar: readonly { hatalar: readonly string[]; dogrular: readonly string[] }[],
): string[] {
  const son = new Map<string, boolean>();
  for (const o of olaylar) {
    for (const id of o.dogrular) son.set(id, true);
    for (const id of o.hatalar) son.set(id, false);
  }
  return [...son.entries()].filter(([, dogru]) => !dogru).map(([id]) => id);
}

/** Alıştırmanın parkuru kimliğinin önekinden. SAF. */
export function parkuru(id: string): ParkurKimligi | null {
  const onek = id.split('-')[0];
  return PARKURLAR.some((p) => p.id === onek) ? (onek as ParkurKimligi) : null;
}

export const tekrarKimligi = (parkur: ParkurKimligi) => `tekrar-${parkur}`;

export interface IngilizceDurum {
  tamamlanan: string[];
  toplamXp: number;
  bugunXp: number;
  hedefXp: number;
  seri: number;
  bugunYapildi: boolean;
  /** Son 7 gün, eskiden yeniye. */
  hafta: { gun: AppDay; xp: number }[];
  /** Parkur başına zayıf soru sayısı. */
  zayif: Record<ParkurKimligi, number>;
}

type Client = Pick<typeof db, 'ingilizceDers' | 'ingilizceAyar'>;

async function olaylariOku(client: Client) {
  return client.ingilizceDers.findMany({
    select: { dersId: true, gun: true, xp: true, hatalar: true, dogrular: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function fetchIngilizceDurum(
  userId: string | null,
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<IngilizceDurum> {
  const [olaylar, ayar] = await Promise.all([
    olaylariOku(client),
    userId ? client.ingilizceAyar.findUnique({ where: { userId } }) : null,
  ]);
  const gunler = olaylar.map((o) => dateToAppDay(o.gun));
  const xpGun = new Map<AppDay, number>();
  olaylar.forEach((o, i) => xpGun.set(gunler[i]!, (xpGun.get(gunler[i]!) ?? 0) + o.xp));

  const zayif: Record<ParkurKimligi, number> = { gunluk: 0, yazilim: 0, sinav: 0 };
  for (const id of zayiflar(olaylar)) {
    const p = parkuru(id);
    if (p && alistirmaBul(id)) zayif[p] += 1;
  }

  return {
    tamamlanan: [...new Set(olaylar.map((o) => o.dersId))],
    toplamXp: olaylar.reduce((t, o) => t + o.xp, 0),
    bugunXp: xpGun.get(bugun) ?? 0,
    hedefXp: ayar?.gunlukHedefXp ?? VARSAYILAN_HEDEF,
    ...seriHesapla(gunler, bugun),
    hafta: Array.from({ length: 7 }, (_, i) => {
      const gun = addAppDays(bugun, i - 6);
      return { gun, xp: xpGun.get(gun) ?? 0 };
    }),
    zayif,
  };
}

/** Tekrar dersinin soruları: parkurun zayıf soruları, en fazla 10. Konuşma hariç. */
export async function fetchTekrarSorulari(
  parkur: ParkurKimligi,
  client: Client = db,
): Promise<Alistirma[]> {
  return zayiflar(await olaylariOku(client))
    .filter((id) => parkuru(id) === parkur)
    .map((id) => alistirmaBul(id))
    .filter((a): a is Alistirma => a !== null && a.tur !== 'konus')
    .slice(-TEKRAR_SORU);
}

export interface DersSonucu {
  xp: number;
  bugunXp: number;
  hedefXp: number;
  seri: number;
}

/**
 * Dersi kaydeder. Kimlikler müfredatta olmalı ve dersin (tekrar dersinde parkurun)
 * alıştırmaları olmalı; kilitli ders kaydedilmez. Hata fırlatmaz: `null` → geçersiz istek.
 */
export async function dersKaydet(
  girdi: { dersId: string; hatalar: readonly string[]; dogrular: readonly string[] },
  client: Client = db,
  bugun: AppDay = appToday(),
): Promise<DersSonucu | null> {
  const tamamlanan = new Set(
    (await client.ingilizceDers.findMany({ select: { dersId: true }, distinct: ['dersId'] })).map(
      (d) => d.dersId,
    ),
  );

  let gecerli: (id: string) => boolean;
  let ilkKez = false;
  const tekrarParkuru = PARKURLAR.find((p) => tekrarKimligi(p.id) === girdi.dersId)?.id;
  if (tekrarParkuru) {
    gecerli = (id) => parkuru(id) === tekrarParkuru && alistirmaBul(id) !== null;
  } else {
    const konum = dersBul(girdi.dersId);
    if (!konum || !acikMi(konum, tamamlanan)) return null;
    const kimlikler = new Set(konum.ders.alistirmalar.map((a) => a.id));
    gecerli = (id) => kimlikler.has(id);
    ilkKez = !tamamlanan.has(girdi.dersId);
  }
  if (![...girdi.hatalar, ...girdi.dogrular].every(gecerli)) return null;

  const xp = xpHesapla(ilkKez, girdi.hatalar.length);
  await client.ingilizceDers.create({
    data: {
      dersId: girdi.dersId,
      gun: appDayToDate(bugun),
      xp,
      hatalar: [...new Set(girdi.hatalar)],
      dogrular: [...new Set(girdi.dogrular)],
    },
  });
  const sonra = await client.ingilizceDers.findMany({ select: { gun: true, xp: true } });
  const gunler = sonra.map((s) => dateToAppDay(s.gun));
  return {
    xp,
    bugunXp: sonra.reduce((t, s, i) => t + (gunler[i] === bugun ? s.xp : 0), 0),
    hedefXp: VARSAYILAN_HEDEF,
    seri: seriHesapla(gunler, bugun).seri,
  };
}
