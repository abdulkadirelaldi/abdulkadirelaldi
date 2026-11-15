import type {
  NotGirdisi,
  NotGuncelleGirdisi,
  OgeAdiGirdisi,
  DolapGirdisi,
  DolapGuncelleGirdisi,
  GorevDurumuGirdisi,
  GorevGirdisi,
  GorevGuncelleGirdisi,
  RafGirdisi,
  RafGuncelleGirdisi,
} from '@/lib/schemas';
import { DOLAP_SINIRLARI } from '@/lib/schemas/masa';
import { gorevSirala } from '@/lib/masa/bicim';
import { rafYollari, type RafDto } from '@/lib/masa/raf';
import { saatDakika } from '@/lib/takvim/bicim';
import type { TakvimOlusumu } from '@/lib/takvim/gorunum';
import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';
import type {
  GorevDurumu,
  GorevKaynagi,
  GorevOnceligi,
  MasaOgeDurumu,
  MasaOgeTuru,
  SesYaziDurumu,
  TakvimKatman,
} from '@/types';

import {
  addAppDays,
  appDayStartInstant,
  appDayToDate,
  appWallClockInstant,
  dateToAppDay,
  type AppDay,
} from './_shared';

/**
 * MASA servisi (ADR-049 M2) — Dolap → Raf → Görev.
 *
 * KATMAN: görevin takvim katmanı DOLABININ katmanıdır; dolapsız görev Kişisel. Görev teslimi
 * takvimde görevin kendisinden üretilir (`fetchGorevOlusumlari`) — ayrı etkinlik satırı yok, tek
 * doğruluk kaynağı görev.
 *
 * SİLME: içi dolu dolap/raf silinmez (`MasaHatasi`, CONFLICT) — "önce boşalt ya da arşivle".
 * Şemadaki `Restrict` aynı kuralın son savunma hattı.
 *
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — kişisel veri, public tarafta okunmuyor.
 */

export class MasaHatasi extends Error {
  constructor(
    readonly kod: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR',
    message: string,
    readonly alan?: string,
  ) {
    super(message);
    this.name = 'MasaHatasi';
  }
}

/* ===========================================================================
 * DTO
 * ======================================================================== */

export interface GorevDto {
  id: string;
  baslik: string;
  aciklama: string | null;
  dolapId: string | null;
  rafId: string | null;
  /** Dolap/raf adları — listede "nereden" sorusunun cevabı. */
  dolap: { ad: string; emoji: string } | null;
  raf: string | null;
  katman: TakvimKatman;
  teslimGun: AppDay | null;
  /** İstanbul duvar saati, dakika. */
  teslimDakika: number | null;
  durum: GorevDurumu;
  oncelik: GorevOnceligi;
  kaynak: GorevKaynagi;
  tamamlandiAt: string | null;
}

export interface DolapOzeti {
  id: string;
  ad: string;
  emoji: string;
  katman: TakvimKatman;
  arsivlendi: boolean;
  rafSayisi: number;
  acikGorev: number;
}

const GOREV_ILISKILERI = {
  dolap: { select: { ad: true, emoji: true, katman: true } },
  raf: { select: { ad: true } },
} as const;

type GorevSatiri = Prisma.GorevGetPayload<{ include: typeof GOREV_ILISKILERI }>;

function gorevDto(s: GorevSatiri): GorevDto {
  return {
    id: s.id,
    baslik: s.baslik,
    aciklama: s.aciklama,
    dolapId: s.dolapId,
    rafId: s.rafId,
    dolap: s.dolap ? { ad: s.dolap.ad, emoji: s.dolap.emoji } : null,
    raf: s.raf?.ad ?? null,
    katman: s.dolap?.katman ?? 'KISISEL',
    teslimGun: s.teslimGun ? dateToAppDay(s.teslimGun) : null,
    teslimDakika: s.teslimDakika,
    durum: s.durum,
    oncelik: s.oncelik,
    kaynak: s.kaynak,
    tamamlandiAt: s.tamamlandiAt?.toISOString() ?? null,
  };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

export interface MasaUstu {
  gecikmis: GorevDto[];
  bugun: GorevDto[];
  /** Yarından itibaren 7 gün. */
  yaklasan: GorevDto[];
  teslimsiz: GorevDto[];
  /** Son 7 günde tamamlananlar, en yenisi önce. */
  tamamlanan: GorevDto[];
  dolaplar: DolapOzeti[];
}

const ACIK: Prisma.GorevWhereInput = { durum: { not: 'TAMAMLANDI' } };

async function dolapOzetleri(client: typeof db, arsiv: boolean): Promise<DolapOzeti[]> {
  const satirlar = await client.dolap.findMany({
    where: arsiv ? {} : { arsivlendi: false },
    orderBy: [{ arsivlendi: 'asc' }, { sira: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { raflar: true, gorevler: { where: ACIK } } } },
  });
  return satirlar.map((d) => ({
    id: d.id,
    ad: d.ad,
    emoji: d.emoji,
    katman: d.katman,
    arsivlendi: d.arsivlendi,
    rafSayisi: d._count.raflar,
    acikGorev: d._count.gorevler,
  }));
}

/** Masanın üstü: gecikmiş, bugün, yaklaşan, teslimsiz, son tamamlananlar ve dolaplar. */
export async function fetchMasaUstu(bugun: AppDay, client = db): Promise<MasaUstu> {
  const ufuk = addAppDays(bugun, 7);
  const [acik, tamamlanan, dolaplar] = await Promise.all([
    client.gorev.findMany({
      where: {
        ...ACIK,
        OR: [{ teslimGun: null }, { teslimGun: { lte: appDayToDate(ufuk) } }],
      },
      include: GOREV_ILISKILERI,
    }),
    client.gorev.findMany({
      where: {
        durum: 'TAMAMLANDI',
        tamamlandiAt: { gte: appDayStartInstant(addAppDays(bugun, -6)) },
      },
      orderBy: { tamamlandiAt: 'desc' },
      take: 20,
      include: GOREV_ILISKILERI,
    }),
    dolapOzetleri(client, false),
  ]);

  const liste = acik.map(gorevDto).sort(gorevSirala);
  return {
    gecikmis: liste.filter((g) => g.teslimGun !== null && g.teslimGun < bugun),
    bugun: liste.filter((g) => g.teslimGun === bugun),
    yaklasan: liste.filter((g) => g.teslimGun !== null && g.teslimGun > bugun),
    teslimsiz: liste.filter((g) => g.teslimGun === null),
    tamamlanan: tamamlanan.map(gorevDto),
    dolaplar,
  };
}

export type { RafDto };

/** Bugün panosu: teslimi bugün ya da geçmiş açık görevler, gecikmiş önce. */
export async function fetchBugunGorevleri(bugun: AppDay, client = db): Promise<GorevDto[]> {
  const satirlar = await client.gorev.findMany({
    where: { ...ACIK, teslimGun: { lte: appDayToDate(bugun) } },
    include: GOREV_ILISKILERI,
  });
  return satirlar.map(gorevDto).sort(gorevSirala);
}

export interface DolapAyrintisi extends DolapOzeti {
  raflar: RafDto[];
  /** Açıklar sıralı; tamamlananlar en yenisi önce (son 30). */
  acik: GorevDto[];
  tamamlanan: GorevDto[];
  /** Notlar, dosyalar, ses kayıtları — en yenisi önce (M2b). */
  ogeler: OgeDto[];
}

export interface OgeDto {
  id: string;
  rafId: string | null;
  tur: MasaOgeTuru;
  baslik: string;
  /** Not metni (M6'da ses kaydının yazısı). */
  metin: string | null;
  durum: MasaOgeDurumu;
  dosyaAdi: string | null;
  mime: string | null;
  boyut: number | null;
  /** Sunum kimliği — `/api/v1/dosya/<dosyaId>`; yükleme bitmediyse `null`. */
  dosyaId: string | null;
  /** Ses kaydının Mac'te yazıya dökülmesi (M6). */
  yaziDurumu: SesYaziDurumu | null;
  yaziHata: string | null;
  ozet: string | null;
  createdAt: string;
}

/** Dolabın öğeleri ve dosya kimlikleri (Attachment polimorfik: FK yok, ikinci sorgu). */
async function dolapOgeleri(dolapId: string, client: typeof db): Promise<OgeDto[]> {
  const ogeler = await client.masaOgesi.findMany({
    where: { dolapId },
    orderBy: { createdAt: 'desc' },
  });
  const dosyalar = await client.attachment.findMany({
    where: { entity: 'MASA_OGESI', entityId: { in: ogeler.map((o) => o.id) } },
    select: { id: true, entityId: true },
  });
  const dosyaKimligi = new Map(dosyalar.map((d) => [d.entityId, d.id]));
  return ogeler.map((o) => ({
    id: o.id,
    rafId: o.rafId,
    tur: o.tur,
    baslik: o.baslik,
    metin: o.metin,
    durum: o.durum,
    dosyaAdi: o.dosyaAdi,
    mime: o.mime,
    boyut: o.boyut,
    dosyaId: dosyaKimligi.get(o.id) ?? null,
    yaziDurumu: o.yaziDurumu,
    yaziHata: o.yaziHata,
    ozet: o.ozet,
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function fetchDolap(id: string, client = db): Promise<DolapAyrintisi | null> {
  const d = await client.dolap.findUnique({
    where: { id },
    include: {
      raflar: { orderBy: [{ sira: 'asc' }, { createdAt: 'asc' }] },
      _count: { select: { raflar: true, gorevler: { where: ACIK } } },
    },
  });
  if (!d) return null;
  const [acik, tamamlanan, ogeler] = await Promise.all([
    client.gorev.findMany({ where: { dolapId: id, ...ACIK }, include: GOREV_ILISKILERI }),
    client.gorev.findMany({
      where: { dolapId: id, durum: 'TAMAMLANDI' },
      orderBy: { tamamlandiAt: 'desc' },
      take: 30,
      include: GOREV_ILISKILERI,
    }),
    dolapOgeleri(id, client),
  ]);
  return {
    id: d.id,
    ad: d.ad,
    emoji: d.emoji,
    katman: d.katman,
    arsivlendi: d.arsivlendi,
    rafSayisi: d._count.raflar,
    acikGorev: d._count.gorevler,
    raflar: d.raflar.map((r) => ({ id: r.id, ad: r.ad, ustRafId: r.ustRafId, sira: r.sira })),
    acik: acik.map(gorevDto).sort(gorevSirala),
    tamamlanan: tamamlanan.map(gorevDto),
    ogeler,
  };
}

export interface DolapSecenegi {
  id: string;
  ad: string;
  emoji: string;
  /** Raf yolları: "Derslerim › Fizik". */
  raflar: { id: string; yol: string }[];
}

/**
 * Görev formunun dolap/raf seçicisi. Arşivdeki dolaplar da SONDA ve "(arşiv)" ekiyle var: yoksa
 * arşivdeki bir dolabın görevini düzenleyen form seçiciyi boş bulur ve görevi sessizce masanın
 * üstüne taşırdı.
 */
export async function fetchDolapSecenekleri(client = db): Promise<DolapSecenegi[]> {
  const satirlar = await client.dolap.findMany({
    orderBy: [{ arsivlendi: 'asc' }, { sira: 'asc' }, { createdAt: 'asc' }],
    include: { raflar: { orderBy: [{ sira: 'asc' }, { createdAt: 'asc' }] } },
  });
  return satirlar.map((d) => ({
    id: d.id,
    ad: d.arsivlendi ? `${d.ad} (arşiv)` : d.ad,
    emoji: d.emoji,
    raflar: rafYollari(
      d.raflar.map((r) => ({ id: r.id, ad: r.ad, ustRafId: r.ustRafId, sira: r.sira })),
    ).map(({ id, yol }) => ({ id, yol })),
  }));
}

/** Görev süresi takvimde: saatliyse 30 dk'lık kutu. */
const GOREV_KUTU_DK = 30;

/** Açık görevlerin `[bas, son]` aralığındaki teslimleri — takvim oluşumu olarak (saf dönüşüm). */
export function gorevOlusumu(g: GorevDto): TakvimOlusumu | null {
  if (g.teslimGun === null || g.durum === 'TAMAMLANDI') return null;
  const tumGun = g.teslimDakika === null;
  const baslangic = tumGun
    ? appDayStartInstant(g.teslimGun)
    : appWallClockInstant(g.teslimGun, g.teslimDakika!);
  const bitis = tumGun
    ? appDayStartInstant(addAppDays(g.teslimGun, 1))
    : new Date(baslangic.getTime() + GOREV_KUTU_DK * 60_000);
  return {
    anahtar: `gorev:${g.id}`,
    etkinlikId: `gorev:${g.id}`,
    baslik: `☑️ ${g.baslik}`,
    konum: null,
    kategori: 'HATIRLATICI',
    katman: g.katman,
    tumGun,
    baslangic: baslangic.toISOString(),
    bitis: bitis.toISOString(),
    gun: g.teslimGun,
    sonGun: g.teslimGun,
    tekrarli: false,
    baglanti: g.dolapId ? `/panel/masa/${g.dolapId}` : '/panel/masa',
  };
}

export async function fetchGorevOlusumlari(
  bas: AppDay,
  son: AppDay,
  client = db,
): Promise<TakvimOlusumu[]> {
  const satirlar = await client.gorev.findMany({
    where: { ...ACIK, teslimGun: { gte: appDayToDate(bas), lte: appDayToDate(son) } },
    include: GOREV_ILISKILERI,
  });
  return satirlar
    .map((s) => gorevOlusumu(gorevDto(s)))
    .filter((o): o is TakvimOlusumu => o !== null);
}

/* ===========================================================================
 * YAZMA — DOLAP
 * ======================================================================== */

export async function dolapOlustur(g: DolapGirdisi, client = db): Promise<{ id: string }> {
  const son = await client.dolap.aggregate({ _max: { sira: true } });
  return client.dolap.create({
    data: { ad: g.ad, emoji: g.emoji, katman: g.katman, sira: (son._max.sira ?? -1) + 1 },
    select: { id: true },
  });
}

export async function dolapGuncelle(g: DolapGuncelleGirdisi, client = db): Promise<{ id: string }> {
  const { id, ...alanlar } = g;
  const var_ = await client.dolap.findUnique({ where: { id }, select: { id: true } });
  if (!var_) throw new MasaHatasi('NOT_FOUND', 'Dolap bulunamadı.');
  return client.dolap.update({ where: { id }, data: alanlar, select: { id: true } });
}

export async function dolapSil(id: string, client = db): Promise<{ id: string }> {
  const d = await client.dolap.findUnique({
    where: { id },
    include: { _count: { select: { raflar: true, gorevler: true, ogeler: true } } },
  });
  if (!d) throw new MasaHatasi('NOT_FOUND', 'Dolap bulunamadı.');
  if (d._count.raflar > 0 || d._count.gorevler > 0 || d._count.ogeler > 0) {
    throw new MasaHatasi(
      'CONFLICT',
      'Dolapta raf, görev ya da dosya var — önce boşalt ya da dolabı arşivle.',
    );
  }
  await client.dolap.delete({ where: { id } });
  return { id };
}

/** "Önerilen dolapları kur" — ADR-049'daki üç dolap ve ilk rafları. Aynı adlı dolap varsa atlanır. */
export const ONERILEN_DOLAPLAR: readonly {
  ad: string;
  emoji: string;
  katman: TakvimKatman;
  raflar: readonly string[];
}[] = [
  { ad: 'Samsun Üniversitesi', emoji: '🎓', katman: 'OKUL', raflar: ['Derslerim', 'Duyurular'] },
  { ad: 'Kıyı Medya', emoji: '🎬', katman: 'KIYI_MEDYA', raflar: ['Projeler'] },
  { ad: 'Spectraloop', emoji: '🚄', katman: 'SPECTRALOOP', raflar: ['Takım işleri'] },
];

export async function onerilenDolaplariKur(client = db): Promise<{ kurulan: string[] }> {
  return client.$transaction(async (tx) => {
    const mevcut = new Set(
      (await tx.dolap.findMany({ select: { ad: true } })).map((d) => d.ad.toLocaleLowerCase('tr')),
    );
    const son = await tx.dolap.aggregate({ _max: { sira: true } });
    let sira = (son._max.sira ?? -1) + 1;
    const kurulan: string[] = [];
    for (const o of ONERILEN_DOLAPLAR) {
      if (mevcut.has(o.ad.toLocaleLowerCase('tr'))) continue;
      await tx.dolap.create({
        data: {
          ad: o.ad,
          emoji: o.emoji,
          katman: o.katman,
          sira: sira++,
          raflar: { create: o.raflar.map((ad, i) => ({ ad, sira: i })) },
        },
      });
      kurulan.push(o.ad);
    }
    return { kurulan };
  });
}

/* ===========================================================================
 * YAZMA — RAF
 * ======================================================================== */

export async function rafOlustur(g: RafGirdisi, client = db): Promise<{ id: string }> {
  const dolap = await client.dolap.findUnique({ where: { id: g.dolapId }, select: { id: true } });
  if (!dolap) throw new MasaHatasi('NOT_FOUND', 'Dolap bulunamadı.');
  if (g.ustRafId !== null) {
    const raflar = await client.raf.findMany({
      where: { dolapId: g.dolapId },
      select: { id: true, ustRafId: true },
    });
    const ust = new Map(raflar.map((r) => [r.id, r.ustRafId]));
    if (!ust.has(g.ustRafId)) {
      throw new MasaHatasi('VALIDATION_ERROR', 'Üst raf bu dolapta değil.', 'ustRafId');
    }
    let derinlik = 1;
    for (let r: string | null | undefined = ust.get(g.ustRafId); r; r = ust.get(r)) derinlik++;
    if (derinlik >= DOLAP_SINIRLARI.rafDerinligi) {
      throw new MasaHatasi(
        'VALIDATION_ERROR',
        `Raflar en çok ${DOLAP_SINIRLARI.rafDerinligi} kat iç içe olabilir.`,
        'ustRafId',
      );
    }
  }
  const son = await client.raf.aggregate({
    where: { dolapId: g.dolapId, ustRafId: g.ustRafId },
    _max: { sira: true },
  });
  return client.raf.create({
    data: { dolapId: g.dolapId, ustRafId: g.ustRafId, ad: g.ad, sira: (son._max.sira ?? -1) + 1 },
    select: { id: true },
  });
}

export async function rafGuncelle(g: RafGuncelleGirdisi, client = db): Promise<{ id: string }> {
  const r = await client.raf.findUnique({ where: { id: g.id }, select: { id: true } });
  if (!r) throw new MasaHatasi('NOT_FOUND', 'Raf bulunamadı.');
  return client.raf.update({ where: { id: g.id }, data: { ad: g.ad }, select: { id: true } });
}

export async function rafSil(id: string, client = db): Promise<{ id: string }> {
  const r = await client.raf.findUnique({
    where: { id },
    include: { _count: { select: { altRaflar: true, gorevler: true, ogeler: true } } },
  });
  if (!r) throw new MasaHatasi('NOT_FOUND', 'Raf bulunamadı.');
  if (r._count.altRaflar > 0 || r._count.gorevler > 0 || r._count.ogeler > 0) {
    throw new MasaHatasi('CONFLICT', 'Rafta alt raf, görev ya da dosya var — önce boşalt.');
  }
  await client.raf.delete({ where: { id } });
  return { id };
}

/* ===========================================================================
 * YAZMA — GÖREV
 * ======================================================================== */

/** Raf verildiyse dolap rafın dolabıdır; dolap verildiyse var olmalı. */
async function yeriCoz(
  dolapId: string | null,
  rafId: string | null,
  client: Prisma.TransactionClient | typeof db,
): Promise<{ dolapId: string | null; rafId: string | null }> {
  if (rafId !== null) {
    const raf = await client.raf.findUnique({ where: { id: rafId }, select: { dolapId: true } });
    if (!raf) throw new MasaHatasi('VALIDATION_ERROR', 'Raf bulunamadı.', 'rafId');
    return { dolapId: raf.dolapId, rafId };
  }
  if (dolapId !== null) {
    const d = await client.dolap.findUnique({ where: { id: dolapId }, select: { id: true } });
    if (!d) throw new MasaHatasi('VALIDATION_ERROR', 'Dolap bulunamadı.', 'dolapId');
  }
  return { dolapId, rafId: null };
}

function gorevAlanlari(g: GorevGirdisi) {
  return {
    baslik: g.baslik,
    aciklama: g.aciklama,
    teslimGun: g.teslimGun ? appDayToDate(g.teslimGun) : null,
    teslimDakika: g.teslimGun && g.teslimSaat ? saatDakika(g.teslimSaat) : null,
    oncelik: g.oncelik,
  };
}

export async function gorevOlustur(
  g: GorevGirdisi,
  kaynak: GorevKaynagi = 'ELLE',
  client = db,
): Promise<GorevDto> {
  const yer = await yeriCoz(g.dolapId, g.rafId, client);
  const s = await client.gorev.create({
    data: { ...gorevAlanlari(g), ...yer, kaynak },
    include: GOREV_ILISKILERI,
  });
  return gorevDto(s);
}

export async function gorevGuncelle(g: GorevGuncelleGirdisi, client = db): Promise<GorevDto> {
  const var_ = await client.gorev.findUnique({ where: { id: g.id }, select: { id: true } });
  if (!var_) throw new MasaHatasi('NOT_FOUND', 'Görev bulunamadı.');
  const yer = await yeriCoz(g.dolapId, g.rafId, client);
  const s = await client.gorev.update({
    where: { id: g.id },
    data: { ...gorevAlanlari(g), ...yer },
    include: GOREV_ILISKILERI,
  });
  return gorevDto(s);
}

/** Tamamlanınca an yazılır; geri alınınca silinir. */
export async function gorevDurumuDegistir(
  g: GorevDurumuGirdisi,
  simdi: Date = new Date(),
  client = db,
): Promise<GorevDto> {
  const var_ = await client.gorev.findUnique({ where: { id: g.id }, select: { durum: true } });
  if (!var_) throw new MasaHatasi('NOT_FOUND', 'Görev bulunamadı.');
  const s = await client.gorev.update({
    where: { id: g.id },
    data: {
      durum: g.durum,
      tamamlandiAt:
        g.durum === 'TAMAMLANDI' ? (var_.durum === 'TAMAMLANDI' ? undefined : simdi) : null,
    },
    include: GOREV_ILISKILERI,
  });
  return gorevDto(s);
}

export async function gorevSil(id: string, client = db): Promise<{ id: string }> {
  const var_ = await client.gorev.findUnique({ where: { id }, select: { id: true } });
  if (!var_) throw new MasaHatasi('NOT_FOUND', 'Görev bulunamadı.');
  await client.gorev.delete({ where: { id } });
  return { id };
}

/* ===========================================================================
 * YAZMA — NOT (M2b). Dosya ve ses kayıtları `masa-yukleme.ts`te (R2'ye dokunur).
 * ======================================================================== */

/** Öğenin yeri: raf verildiyse dolap rafın dolabıdır; ikisi uyuşmazsa raf kazanır. */
export async function ogeYeri(
  dolapId: string,
  rafId: string | null,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<{ dolapId: string; rafId: string | null }> {
  const yer = await yeriCoz(dolapId, rafId, client);
  if (yer.dolapId === null) throw new MasaHatasi('VALIDATION_ERROR', 'Dolap gerekli.', 'dolapId');
  return { dolapId: yer.dolapId, rafId: yer.rafId };
}

export async function notOlustur(g: NotGirdisi, client = db): Promise<{ id: string }> {
  const yer = await ogeYeri(g.dolapId, g.rafId, client);
  return client.masaOgesi.create({
    data: { ...yer, tur: 'NOT', baslik: g.baslik, metin: g.metin },
    select: { id: true },
  });
}

export async function notGuncelle(g: NotGuncelleGirdisi, client = db): Promise<{ id: string }> {
  const o = await client.masaOgesi.findUnique({ where: { id: g.id }, select: { tur: true } });
  if (!o) throw new MasaHatasi('NOT_FOUND', 'Not bulunamadı.');
  if (o.tur !== 'NOT') throw new MasaHatasi('VALIDATION_ERROR', 'Yalnızca notun metni düzenlenir.');
  return client.masaOgesi.update({
    where: { id: g.id },
    data: { baslik: g.baslik, metin: g.metin },
    select: { id: true },
  });
}

/** Dosya/ses öğesinin yalnızca ADI değişir (içerik değişmez — yeni dosya yeni öğe). */
export async function ogeAdiDegistir(g: OgeAdiGirdisi, client = db): Promise<{ id: string }> {
  const o = await client.masaOgesi.findUnique({ where: { id: g.id }, select: { id: true } });
  if (!o) throw new MasaHatasi('NOT_FOUND', 'Öğe bulunamadı.');
  return client.masaOgesi.update({
    where: { id: g.id },
    data: { baslik: g.baslik },
    select: { id: true },
  });
}
