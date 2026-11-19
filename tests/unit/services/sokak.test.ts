import { describe, expect, it } from 'vitest';

import {
  gorevKapsami,
  kapsamaUyar,
  kapsamAdresi,
  kapsamAnahtari,
  kapsamCoz,
  kapsamTabelasi,
  sokakKur,
  tenteRengi,
} from '@/lib/gorev/sokak';
import type { IsAlani } from '@/types';

/** SOKAK (ADR-057) — saf: dükkân türetme, kapsam eşleşmesi, adres, pano ve rozetler. */

const BUGUN = '2026-11-19';
let n = 0;
const g = (
  alan: IsAlani,
  etiket: string | null,
  teslimGun: string | null = null,
  baslik = 'iş',
) => ({
  id: `g${++n}`,
  baslik,
  alan,
  etiket,
  teslimGun,
  teslimDakika: null,
});

describe('kapsam', () => {
  it('Kıyı + etiket dükkân; ofis etiketi, etiketsiz ve diğer alanlar bina', () => {
    expect(gorevKapsami(g('KIYI_MEDYA', ' Garage '))).toEqual({ tur: 'dukkan', etiket: 'Garage' });
    expect(gorevKapsami(g('KIYI_MEDYA', 'KIYI MEDYA'))).toEqual({
      tur: 'bina',
      alan: 'KIYI_MEDYA',
    });
    expect(gorevKapsami(g('KIYI_MEDYA', null))).toEqual({ tur: 'bina', alan: 'KIYI_MEDYA' });
    expect(gorevKapsami(g('OKUL', 'Bitirme'))).toEqual({ tur: 'bina', alan: 'OKUL' });
  });

  it('eşleşme büyük/küçük harf duyarsız; dükkân binaya, bina dükkâna uymaz', () => {
    const d = { tur: 'dukkan', etiket: 'garage' } as const;
    expect(kapsamaUyar(g('KIYI_MEDYA', 'Garage'), d)).toBe(true);
    expect(kapsamaUyar(g('KIYI_MEDYA', null), d)).toBe(false);
    expect(kapsamaUyar(g('OKUL', null), { tur: 'bina', alan: 'OKUL' })).toBe(true);
    expect(kapsamaUyar(g('KIYI_MEDYA', 'Garage'), { tur: 'bina', alan: 'KIYI_MEDYA' })).toBe(false);
  });

  it('adres gidiş-dönüş; tanınmayan parametre sokak', () => {
    const d = { tur: 'dukkan', etiket: 'Panayır' } as const;
    const adres = new URL(kapsamAdresi(d), 'https://x.test');
    expect(kapsamCoz({ dukkan: adres.searchParams.get('dukkan')! })).toEqual(d);
    expect(kapsamCoz({ bina: ['SPECTRALOOP'] })).toEqual({ tur: 'bina', alan: 'SPECTRALOOP' });
    expect(kapsamCoz({ dukkan: 'Kıyı Medya' })).toEqual({ tur: 'bina', alan: 'KIYI_MEDYA' });
    expect(kapsamCoz({ bina: 'YOK' })).toBeNull();
    expect(kapsamCoz({ dukkan: 'x'.repeat(41) })).toBeNull();
    expect(kapsamCoz({})).toBeNull();
  });

  it('tabela ve renk kararlı', () => {
    expect(tenteRengi('Garage')).toBe(tenteRengi(' garage '));
    expect(kapsamTabelasi({ tur: 'bina', alan: 'KISISEL' }).ad).toBe('Ev');
    expect(kapsamTabelasi({ tur: 'dukkan', etiket: 'Goril' })).toMatchObject({
      ad: 'Goril',
      tur: 'Kıyı müşterisi',
    });
  });
});

describe('sokakKur', () => {
  it('dükkânlar ada göre, binalar hep dört; pano ve rozetler tarihe göre', () => {
    const s = sokakKur(
      [
        g('KIYI_MEDYA', 'Panayır', '2026-11-18', 'onay'),
        g('KIYI_MEDYA', 'panayır', '2026-11-28', 'reels'),
        g('KIYI_MEDYA', 'Goril', BUGUN, 'post'),
        g('KIYI_MEDYA', 'Garage', '2026-11-21', 'story'),
        g('KIYI_MEDYA', 'Garage', '2026-11-25'),
        g('KIYI_MEDYA', 'Garage', null),
        g('OKUL', 'Bitirme', null),
      ],
      [g('KIYI_MEDYA', 'Kozmos'), g('KISISEL', null)],
      BUGUN,
    );
    expect(s.cadde.map((d) => d.ad)).toEqual(['Garage', 'Goril', 'Kozmos', 'Panayır']);
    expect(s.arka.map((d) => d.ad)).toEqual(['Kıyı Medya', 'Okul', 'Spectraloop', 'Ev']);
    expect(s.toplamAcik).toBe(7);

    const [garage, goril, kozmos, panayir] = s.cadde;
    expect(panayir).toMatchObject({
      acik: 2,
      durum: 'gecikmis',
      href: '/panel/isler?dukkan=Panay%C4%B1r',
    });
    expect(goril!.durum).toBe('bugun');
    expect(garage).toMatchObject({ acik: 3, durum: 'yakin' });
    expect(garage!.vitrin.map((v) => v.teslimGun)).toEqual(['2026-11-21', '2026-11-25']);
    expect(kozmos).toMatchObject({ acik: 0, biten: 1, durum: null });
    expect(s.arka[3]!.biten).toBe(1);
    expect(s.arka[1]!.acik).toBe(1);

    expect(s.pano.gecikmis.map((p) => p.baslik)).toEqual(['onay']);
    expect(new Set(s.cadde.map((d) => d.renk)).size).toBe(4);
    expect(s.pano.gecikmis[0]!.renk).toBe(panayir!.renk);
    expect(s.pano.bugun[0]).toMatchObject({ baslik: 'post', yer: 'Goril' });
    expect(s.pano.yakin.map((p) => p.baslik)).toEqual(['story']);
  });
});

describe('acil ve dükkân eki (ADR-058)', () => {
  it('elle acil işaretli iş tarihsiz de olsa acil sütununa düşer; rozet "acil"; ek taşınır', () => {
    const acil = { ...g('KIYI_MEDYA', 'Goril', null, 'kampanya'), acil: true };
    const gec = { ...g('KIYI_MEDYA', 'Goril', '2026-11-01', 'eski'), acil: true };
    const paket = [{ tur: 'reels' as const, n: 1, hedef: 4 }];
    const s = sokakKur([acil, gec], [], BUGUN, {
      'd:goril': { driveUrl: 'https://drive.google.com/x', paket },
    });
    expect(s.pano.yakin.map((p) => p.baslik)).toEqual(['kampanya']);
    expect(s.pano.yakin[0]).toMatchObject({ acil: true, teslimGun: null });
    expect(s.pano.gecikmis.map((p) => p.baslik)).toEqual(['eski']);
    const goril = s.cadde[0]!;
    expect(goril).toMatchObject({ acilVar: true, durum: 'gecikmis', paket });
    expect(goril.driveUrl).toBe('https://drive.google.com/x');
    expect(s.arka[0]!.paket).toBeNull();
  });

  it('kapsam anahtarı sokaktakiyle aynı', () => {
    expect(kapsamAnahtari({ tur: 'dukkan', etiket: ' Panayır ' })).toBe('d:panayır');
    expect(kapsamAnahtari({ tur: 'bina', alan: 'OKUL' })).toBe('b:OKUL');
  });
});
