import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { gorevSchema } from '@/lib/schemas/masa';
import { db } from '@/server/db';
import {
  dolapOlustur,
  dolapSil,
  fetchBugunGorevleri,
  fetchDolap,
  fetchGorevOlusumlari,
  fetchMasaUstu,
  gorevDurumuDegistir,
  gorevGuncelle,
  gorevOlustur,
  gorevSil,
  MasaHatasi,
  ONERILEN_DOLAPLAR,
  onerilenDolaplariKur,
  rafOlustur,
  rafSil,
} from '@/server/services/masa';

/**
 * MASA SERVİSİ — gerçek PostgreSQL (ADR-049 M2). Kurallar şemada değil serviste ve
 * veritabanının `Restrict`inde: içi dolu dolap/raf silinmez, raf dolabı belirler, raf derinliği
 * sınırlı, görevin katmanı dolabın katmanı, tamamlanma anı yazılır/silinir.
 * İzler `zzit-masa` önekiyle; önerilen dolaplar YALNIZCA bu testin kurduklarıyla silinir.
 */
const ONEK = 'zzit-masa';
const GUN = '2020-04-15';

const temizle = async () => {
  const dolaplar = await db.dolap.findMany({
    where: { ad: { startsWith: ONEK } },
    select: { id: true },
  });
  const idler = dolaplar.map((d) => d.id);
  await db.gorev.deleteMany({
    where: { OR: [{ baslik: { startsWith: ONEK } }, { dolapId: { in: idler } }] },
  });
  // Alt raflar önce (Restrict).
  for (let i = 0; i < 4; i++) {
    await db.raf.deleteMany({ where: { dolapId: { in: idler }, altRaflar: { none: {} } } });
  }
  await db.dolap.deleteMany({ where: { id: { in: idler } } });
};

const gorev = (p: Record<string, unknown>) => gorevSchema.parse({ baslik: `${ONEK} görev`, ...p });

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('masa servisi', () => {
  it('raf dolabı belirler; görevin katmanı dolabın katmanı; takvime izdüşer', async () => {
    const okul = await dolapOlustur({ ad: `${ONEK} Okul`, emoji: '🎓', katman: 'OKUL' });
    const is = await dolapOlustur({ ad: `${ONEK} İş`, emoji: '🎬', katman: 'KIYI_MEDYA' });
    const fizik = await rafOlustur({ dolapId: okul.id, ustRafId: null, ad: 'Fizik' });

    // Yanlış dolap verildi ama raf okulun rafı → görev okul dolabına yazılır.
    const g = await gorevOlustur(
      gorev({ dolapId: is.id, rafId: fizik.id, teslimGun: GUN, teslimSaat: '14:30' }),
    );
    expect(g.dolapId).toBe(okul.id);
    expect(g.katman).toBe('OKUL');
    expect(g.raf).toBe('Fizik');
    expect(g.teslimGun).toBe(GUN);
    expect(g.teslimDakika).toBe(14 * 60 + 30);

    const olusumlar = await fetchGorevOlusumlari(GUN, GUN);
    const o = olusumlar.find((x) => x.etkinlikId === `gorev:${g.id}`);
    expect(o).toMatchObject({
      katman: 'OKUL',
      tumGun: false,
      gun: GUN,
      baglanti: `/panel/masa/${okul.id}`,
    });
    // İstanbul 14:30 = 11:30Z.
    expect(o?.baslangic).toBe('2020-04-15T11:30:00.000Z');

    // Dolapsız görev Kişisel ve gün boyu.
    const kisisel = await gorevOlustur(gorev({ teslimGun: GUN }));
    expect(kisisel.katman).toBe('KISISEL');
    const tumGun = (await fetchGorevOlusumlari(GUN, GUN)).find(
      (x) => x.etkinlikId === `gorev:${kisisel.id}`,
    );
    expect(tumGun).toMatchObject({ tumGun: true, baglanti: '/panel/masa' });
  });

  it('tamamlanınca an yazılır, takvimden düşer; geri alınınca an silinir', async () => {
    const g = await gorevOlustur(gorev({ teslimGun: GUN }));
    const simdi = new Date('2020-04-15T09:00:00Z');
    const bitti = await gorevDurumuDegistir({ id: g.id, durum: 'TAMAMLANDI' }, simdi);
    expect(bitti.tamamlandiAt).toBe(simdi.toISOString());
    // Tekrar "tamamlandı" demek anı ileri kaydırmaz.
    const tekrar = await gorevDurumuDegistir({ id: g.id, durum: 'TAMAMLANDI' }, new Date());
    expect(tekrar.tamamlandiAt).toBe(simdi.toISOString());
    expect(
      (await fetchGorevOlusumlari(GUN, GUN)).some((o) => o.etkinlikId === `gorev:${g.id}`),
    ).toBe(false);

    const geri = await gorevDurumuDegistir({ id: g.id, durum: 'YAPILACAK' });
    expect(geri.tamamlandiAt).toBeNull();
  });

  it('masa üstü öbekleri: gecikmiş, bugün, yaklaşan, teslimsiz', async () => {
    const d = await dolapOlustur({ ad: `${ONEK} D`, emoji: '📚', katman: 'OKUL' });
    const yap = (baslik: string, teslimGun: string | null) =>
      gorevOlustur(gorev({ baslik: `${ONEK} ${baslik}`, dolapId: d.id, teslimGun }));
    await yap('dün', '2020-04-14');
    await yap('bugün', GUN);
    await yap('3 gün sonra', '2020-04-18');
    await yap('8 gün sonra', '2020-04-23');
    await yap('teslimsiz', null);

    const ustu = await fetchMasaUstu(GUN);
    const benim = (l: { baslik: string }[]) =>
      l.map((g) => g.baslik).filter((b) => b.startsWith(ONEK));
    expect(benim(ustu.gecikmis)).toEqual([`${ONEK} dün`]);
    expect(benim(ustu.bugun)).toEqual([`${ONEK} bugün`]);
    // 7 günlük ufkun dışındaki görev masada görünmez (dolabında görünür).
    expect(benim(ustu.yaklasan)).toEqual([`${ONEK} 3 gün sonra`]);
    expect(benim(ustu.teslimsiz)).toEqual([`${ONEK} teslimsiz`]);
    expect(benim(await fetchBugunGorevleri(GUN))).toEqual([`${ONEK} dün`, `${ONEK} bugün`]);

    const dolap = await fetchDolap(d.id);
    expect(dolap?.acikGorev).toBe(5);
    expect(dolap?.acik).toHaveLength(5);
  });

  it('içi dolu raf ve dolap silinmez; boşalınca silinir', async () => {
    const d = await dolapOlustur({ ad: `${ONEK} Sil`, emoji: '🗄️', katman: 'KISISEL' });
    const ust = await rafOlustur({ dolapId: d.id, ustRafId: null, ad: 'Üst' });
    const alt = await rafOlustur({ dolapId: d.id, ustRafId: ust.id, ad: 'Alt' });
    const g = await gorevOlustur(gorev({ rafId: alt.id }));

    await expect(rafSil(ust.id)).rejects.toMatchObject({ kod: 'CONFLICT' });
    await expect(rafSil(alt.id)).rejects.toMatchObject({ kod: 'CONFLICT' });
    await expect(dolapSil(d.id)).rejects.toBeInstanceOf(MasaHatasi);

    await gorevSil(g.id);
    await rafSil(alt.id);
    await rafSil(ust.id);
    await expect(dolapSil(d.id)).resolves.toEqual({ id: d.id });
  });

  it('raflar en çok üç kat; üst raf başka dolapta olamaz', async () => {
    const d = await dolapOlustur({ ad: `${ONEK} Derin`, emoji: '🗄️', katman: 'KISISEL' });
    const baska = await dolapOlustur({ ad: `${ONEK} Başka`, emoji: '🗄️', katman: 'KISISEL' });
    const r1 = await rafOlustur({ dolapId: d.id, ustRafId: null, ad: '1' });
    const r2 = await rafOlustur({ dolapId: d.id, ustRafId: r1.id, ad: '2' });
    const r3 = await rafOlustur({ dolapId: d.id, ustRafId: r2.id, ad: '3' });
    await expect(rafOlustur({ dolapId: d.id, ustRafId: r3.id, ad: '4' })).rejects.toMatchObject({
      kod: 'VALIDATION_ERROR',
      alan: 'ustRafId',
    });
    await expect(rafOlustur({ dolapId: baska.id, ustRafId: r1.id, ad: 'x' })).rejects.toMatchObject(
      {
        kod: 'VALIDATION_ERROR',
      },
    );
  });

  it('güncellemede yer değişir; yok olan kayıt NOT_FOUND', async () => {
    const d = await dolapOlustur({ ad: `${ONEK} Yer`, emoji: '🗄️', katman: 'SPECTRALOOP' });
    const g = await gorevOlustur(gorev({}));
    const tasindi = await gorevGuncelle({ ...gorev({ dolapId: d.id }), id: g.id });
    expect(tasindi.katman).toBe('SPECTRALOOP');
    await expect(gorevSil('yok-boyle-bir-gorev')).rejects.toMatchObject({ kod: 'NOT_FOUND' });
  });

  it('önerilen dolaplar ikinci kez kurulmaz', async () => {
    const onceden = new Set(
      (await db.dolap.findMany({ where: { ad: { in: ONERILEN_DOLAPLAR.map((o) => o.ad) } } })).map(
        (d) => d.ad,
      ),
    );
    const { kurulan } = await onerilenDolaplariKur();
    try {
      expect(kurulan).toEqual(ONERILEN_DOLAPLAR.map((o) => o.ad).filter((a) => !onceden.has(a)));
      expect((await onerilenDolaplariKur()).kurulan).toEqual([]);
      if (kurulan.includes('Samsun Üniversitesi')) {
        const su = await db.dolap.findFirst({
          where: { ad: 'Samsun Üniversitesi' },
          include: { raflar: true },
        });
        expect(su?.katman).toBe('OKUL');
        expect(su?.raflar.map((r) => r.ad).sort()).toEqual(['Derslerim', 'Duyurular']);
      }
    } finally {
      // Yalnızca bu testin kurduklarını sil — geliştiricinin kendi dolaplarına dokunma.
      const benim = await db.dolap.findMany({
        where: { ad: { in: kurulan } },
        select: { id: true },
      });
      await db.raf.deleteMany({ where: { dolapId: { in: benim.map((d) => d.id) } } });
      await db.dolap.deleteMany({ where: { id: { in: benim.map((d) => d.id) } } });
    }
  });
});
