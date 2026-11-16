import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { gorevSchema } from '@/lib/schemas/gorev';
import { db } from '@/server/db';
import {
  fetchBugunGorevleri,
  fetchIsListesi,
  gorevBitti,
  gorevGuncelle,
  gorevOlustur,
  gorevSil,
  GorevHatasi,
} from '@/server/services/gorev';

/**
 * İŞLER SERVİSİ — gerçek PostgreSQL (ADR-050). Öbekler tarihe göre kurulur; tik anı yazılır,
 * ikinci tik ilk anı korur, geri alınca silinir. İzler `zzit-gorev` önekiyle.
 */
const ONEK = 'zzit-gorev';
const BUGUN = '2020-04-15';
const SIMDI = new Date('2020-04-15T09:00:00Z');

const temizle = () => db.gorev.deleteMany({ where: { baslik: { startsWith: ONEK } } });
const gorev = (p: Record<string, unknown>) =>
  gorevSchema.parse({ baslik: `${ONEK} ${String(p.ad ?? 'görev')}`, ...p });
const benim = <T extends { baslik: string }>(l: readonly T[]) =>
  l.filter((g) => g.baslik.startsWith(ONEK)).map((g) => g.baslik.slice(ONEK.length + 1));

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('işler servisi', () => {
  it('açık görevleri tarih öbeklerine ayırır; saatlisi gün boyundan önce', async () => {
    await gorevOlustur(gorev({ ad: 'gecikmis', teslimGun: '2020-04-13' }));
    await gorevOlustur(gorev({ ad: 'bugun-gunboyu', teslimGun: BUGUN }));
    await gorevOlustur(gorev({ ad: 'bugun-0900', teslimGun: BUGUN, teslimSaat: '09:00' }));
    await gorevOlustur(gorev({ ad: 'hafta', teslimGun: '2020-04-22' }));
    await gorevOlustur(gorev({ ad: 'sonra', teslimGun: '2020-04-23' }));
    await gorevOlustur(gorev({ ad: 'tarihsiz', alan: 'OKUL', etiket: 'Veri Tabanı' }));

    const l = await fetchIsListesi(BUGUN, SIMDI);
    expect(benim(l.gecikmis)).toEqual(['gecikmis']);
    expect(benim(l.bugun)).toEqual(['bugun-0900', 'bugun-gunboyu']);
    expect(benim(l.buHafta)).toEqual(['hafta']);
    expect(benim(l.sonra)).toEqual(['sonra']);
    expect(benim(l.tarihsiz)).toEqual(['tarihsiz']);
    const t = l.tarihsiz.find((g) => g.baslik.endsWith('tarihsiz'))!;
    expect(t).toMatchObject({ alan: 'OKUL', etiket: 'Veri Tabanı', teslimGun: null });

    expect(benim(await fetchBugunGorevleri(BUGUN))).toEqual([
      'gecikmis',
      'bugun-0900',
      'bugun-gunboyu',
    ]);
  });

  it('tik anı yazar, ikinci tik ilk anı korur, geri alma siler; biten listede görünür', async () => {
    const g = await gorevOlustur(gorev({ ad: 'kurgu', alan: 'KIYI_MEDYA', teslimGun: BUGUN }));
    const ilk = await gorevBitti({ id: g.id, bitti: true }, SIMDI);
    expect(ilk.tamamlandiAt).toBe(SIMDI.toISOString());
    const ikinci = await gorevBitti({ id: g.id, bitti: true }, new Date('2020-04-15T10:00:00Z'));
    expect(ikinci.tamamlandiAt).toBe(SIMDI.toISOString());

    const l = await fetchIsListesi(BUGUN, SIMDI);
    expect(benim(l.bugun)).toEqual([]);
    expect(benim(l.bitenler)).toEqual(['kurgu']);
    // 7 günden eski biten listede değil.
    expect(benim((await fetchIsListesi(BUGUN, new Date('2020-04-23T09:00:00Z'))).bitenler)).toEqual(
      [],
    );

    const geri = await gorevBitti({ id: g.id, bitti: false }, SIMDI);
    expect(geri.tamamlandiAt).toBeNull();
  });

  it('günü kaldırılan görevin saati de düşer; olmayan görev NOT_FOUND', async () => {
    const g = await gorevOlustur(gorev({ ad: 'x', teslimGun: BUGUN, teslimSaat: '14:30' }));
    expect(g.teslimDakika).toBe(14 * 60 + 30);
    const u = await gorevGuncelle({ ...gorev({ ad: 'x' }), id: g.id });
    expect(u).toMatchObject({ teslimGun: null, teslimDakika: null });

    await gorevSil(g.id);
    await expect(gorevSil(g.id)).rejects.toBeInstanceOf(GorevHatasi);
  });

  it('şema: saat gün olmadan gelemez; boş etiket/not null olur', () => {
    expect(gorevSchema.safeParse({ baslik: 'a', teslimSaat: '10:00' }).success).toBe(false);
    expect(gorevSchema.parse({ baslik: ' a ', etiket: '  ', not: '' })).toMatchObject({
      baslik: 'a',
      alan: 'KISISEL',
      etiket: null,
      not: null,
    });
  });
});
