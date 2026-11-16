import type { GorevBittiGirdisi, GorevGirdisi, GorevGuncelleGirdisi } from '@/lib/schemas';
import { gorevSirala } from '@/lib/gorev/bicim';
import { saatDakika } from '@/lib/takvim/bicim';
import { db } from '@/server/db';
import type { IsAlani } from '@/types';

import { addAppDays, appDayToDate, dateToAppDay, type AppDay } from './_shared';

/**
 * İŞLER servisi (ADR-050) — düz görev listesi.
 *
 * Bütün açık görevler TEK sorguda okunur ve öbekler (gecikmiş, bugün, bu hafta, sonra, tarihsiz)
 * bellekte kurulur: kişisel ölçek, yüzlerce satır. Alan süzgeci istemcide — dokunuşta sunucuya
 * gidilmez.
 *
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — kişisel veri, public tarafta okunmuyor.
 */

export class GorevHatasi extends Error {
  constructor(
    readonly kod: 'NOT_FOUND' | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'GorevHatasi';
  }
}

export interface GorevDto {
  id: string;
  baslik: string;
  not: string | null;
  alan: IsAlani;
  etiket: string | null;
  teslimGun: AppDay | null;
  /** İstanbul duvar saati, dakika. */
  teslimDakika: number | null;
  tamamlandiAt: string | null;
}

type GorevSatiri = {
  id: string;
  baslik: string;
  not: string | null;
  alan: IsAlani;
  etiket: string | null;
  teslimGun: Date | null;
  teslimDakika: number | null;
  tamamlandiAt: Date | null;
};

function gorevDto(s: GorevSatiri): GorevDto {
  return {
    id: s.id,
    baslik: s.baslik,
    not: s.not,
    alan: s.alan,
    etiket: s.etiket,
    teslimGun: s.teslimGun ? dateToAppDay(s.teslimGun) : null,
    teslimDakika: s.teslimDakika,
    tamamlandiAt: s.tamamlandiAt?.toISOString() ?? null,
  };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/** Kaç günlük "bitenler" geçmişi gösterilir. */
export const BITEN_GUN = 7;

export interface IsListesi {
  gecikmis: GorevDto[];
  bugun: GorevDto[];
  /** Yarından itibaren 7 gün. */
  buHafta: GorevDto[];
  sonra: GorevDto[];
  tarihsiz: GorevDto[];
  /** Son `BITEN_GUN` günde bitenler, en yenisi önce. */
  bitenler: GorevDto[];
}

/** Açık görevleri öbeklere ayırır — saf; testte doğrudan sınanır. */
export function obeklereAyir(acik: readonly GorevDto[], bugun: AppDay) {
  const haftaSonu = addAppDays(bugun, 7);
  const sirali = [...acik].sort(gorevSirala);
  return {
    gecikmis: sirali.filter((g) => g.teslimGun !== null && g.teslimGun < bugun),
    bugun: sirali.filter((g) => g.teslimGun === bugun),
    buHafta: sirali.filter(
      (g) => g.teslimGun !== null && g.teslimGun > bugun && g.teslimGun <= haftaSonu,
    ),
    sonra: sirali.filter((g) => g.teslimGun !== null && g.teslimGun > haftaSonu),
    tarihsiz: sirali.filter((g) => g.teslimGun === null),
  };
}

export async function fetchIsListesi(
  bugun: AppDay,
  simdi: Date = new Date(),
  client = db,
): Promise<IsListesi> {
  const [acik, biten] = await Promise.all([
    client.gorev.findMany({ where: { tamamlandiAt: null } }),
    client.gorev.findMany({
      where: { tamamlandiAt: { gte: new Date(simdi.getTime() - BITEN_GUN * 86_400_000) } },
      orderBy: { tamamlandiAt: 'desc' },
    }),
  ]);
  return { ...obeklereAyir(acik.map(gorevDto), bugun), bitenler: biten.map(gorevDto) };
}

/** Bugün panosu: teslimi bugün ya da geçmiş açık görevler, gecikmiş önce. */
export async function fetchBugunGorevleri(bugun: AppDay, client = db): Promise<GorevDto[]> {
  const satirlar = await client.gorev.findMany({
    where: { tamamlandiAt: null, teslimGun: { lte: appDayToDate(bugun) } },
  });
  return satirlar.map(gorevDto).sort(gorevSirala);
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

function gorevAlanlari(g: GorevGirdisi) {
  return {
    baslik: g.baslik,
    not: g.not,
    alan: g.alan,
    etiket: g.etiket,
    teslimGun: g.teslimGun ? appDayToDate(g.teslimGun) : null,
    teslimDakika: g.teslimGun && g.teslimSaat ? saatDakika(g.teslimSaat) : null,
    // ADR-051 — her yazım Google kuyruğuna girer (bağlantı yoksa bekler).
    googleBekliyor: true,
  };
}

async function varMi(id: string, client: typeof db) {
  const s = await client.gorev.findUnique({
    where: { id },
    select: { tamamlandiAt: true, googleEtkinlikId: true },
  });
  if (!s) throw new GorevHatasi('NOT_FOUND', 'Görev bulunamadı. Başka yerden silinmiş olabilir.');
  return s;
}

export async function gorevOlustur(g: GorevGirdisi, client = db): Promise<GorevDto> {
  return gorevDto(await client.gorev.create({ data: gorevAlanlari(g) }));
}

export async function gorevGuncelle(g: GorevGuncelleGirdisi, client = db): Promise<GorevDto> {
  await varMi(g.id, client);
  return gorevDto(await client.gorev.update({ where: { id: g.id }, data: gorevAlanlari(g) }));
}

/** Tamamlanınca an yazılır (zaten bittiyse ilk an korunur); geri alınınca silinir. */
export async function gorevBitti(
  g: GorevBittiGirdisi,
  simdi: Date = new Date(),
  client = db,
): Promise<GorevDto> {
  const once = await varMi(g.id, client);
  const tamamlandiAt = g.bitti ? (once.tamamlandiAt ?? simdi) : null;
  return gorevDto(
    await client.gorev.update({
      where: { id: g.id },
      data: { tamamlandiAt, googleBekliyor: true },
    }),
  );
}

/** Silinen görevin Google etkinliği (varsa) döner — eylem onu da kaldırır (ADR-051). */
export async function gorevSil(
  id: string,
  client = db,
): Promise<{ id: string; googleEtkinlikId: string | null }> {
  const once = await varMi(id, client);
  await client.gorev.delete({ where: { id } });
  return { id, googleEtkinlikId: once.googleEtkinlikId };
}
