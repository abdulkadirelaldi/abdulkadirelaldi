import { describe, expect, it } from 'vitest';

import { gorevGuncelleSchema, gorevSchema, rafSchema } from '@/lib/schemas/masa';
import { gorevSirala, teslimMetni } from '@/lib/masa/bicim';
import { rafYollari } from '@/lib/masa/raf';

const BUGUN = '2026-11-14'; // cumartesi

describe('teslimMetni', () => {
  const t = (teslimGun: string | null, teslimDakika: number | null = null) =>
    teslimMetni({ teslimGun, teslimDakika }, BUGUN);

  it('gecikmiş, bugün, yarın, yakın, ileri, yok', () => {
    expect(t('2026-11-12')).toEqual({ metin: '2 gün gecikti', durum: 'gecikti' });
    expect(t(BUGUN, 14 * 60)).toEqual({ metin: 'Bugün 14:00', durum: 'bugun' });
    expect(t('2026-11-15')).toEqual({ metin: 'Yarın', durum: 'yakin' });
    expect(t('2026-11-17', 9 * 60 + 5)).toEqual({ metin: 'Sal, 17 Kasım 09:05', durum: 'yakin' });
    expect(t('2026-11-20').durum).toBe('ileri');
    expect(t(null)).toEqual({ metin: 'Teslim tarihi yok', durum: 'yok' });
  });
});

describe('gorevSirala', () => {
  it('yakın teslim önce, saatli günün içinde saatine göre, teslimsiz sonda, eşitlikte öncelik', () => {
    const g = (
      ad: string,
      teslimGun: string | null,
      teslimDakika: number | null,
      oncelik = 'NORMAL',
    ) => ({
      ad,
      teslimGun,
      teslimDakika,
      oncelik: oncelik as 'DUSUK' | 'NORMAL' | 'YUKSEK',
    });
    const liste = [
      g('teslimsiz', null, null, 'YUKSEK'),
      g('yarın', '2026-11-15', null),
      g('bugün gün boyu', BUGUN, null),
      g('bugün 09:00', BUGUN, 540),
      g('yarın acil', '2026-11-15', null, 'YUKSEK'),
    ];
    expect([...liste].sort(gorevSirala).map((x) => x.ad)).toEqual([
      'bugün 09:00',
      'bugün gün boyu',
      'yarın acil',
      'yarın',
      'teslimsiz',
    ]);
  });
});

describe('rafYollari', () => {
  it('ağacı sırayla ve yol adlarıyla açar', () => {
    const r = (id: string, ad: string, ustRafId: string | null, sira = 0) => ({
      id,
      ad,
      ustRafId,
      sira,
    });
    expect(
      rafYollari([
        r('a', 'Derslerim', null),
        r('b', 'Fizik', 'a'),
        r('c', 'Duyurular', null, 1),
        r('d', 'Lab', 'b'),
      ]),
    ).toEqual([
      { id: 'a', yol: 'Derslerim', ad: 'Derslerim', derinlik: 0 },
      { id: 'b', yol: 'Derslerim › Fizik', ad: 'Fizik', derinlik: 1 },
      { id: 'd', yol: 'Derslerim › Fizik › Lab', ad: 'Lab', derinlik: 2 },
      { id: 'c', yol: 'Duyurular', ad: 'Duyurular', derinlik: 0 },
    ]);
  });
});

describe('masa şemaları', () => {
  it('boş alanlar null, öncelik varsayılanı Normal', () => {
    expect(gorevSchema.parse({ baslik: ' Ödev ', aciklama: '', teslimGun: null })).toEqual({
      baslik: 'Ödev',
      aciklama: null,
      dolapId: null,
      rafId: null,
      teslimGun: null,
      teslimSaat: null,
      oncelik: 'NORMAL',
    });
  });

  it('saat gün olmadan gelemez; bozuk gün ve saat reddedilir', () => {
    const r = gorevSchema.safeParse({ baslik: 'x', teslimSaat: '10:00' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['teslimSaat']);
    expect(gorevSchema.safeParse({ baslik: 'x', teslimGun: '2026-02-30' }).success).toBe(false);
    expect(
      gorevSchema.safeParse({ baslik: 'x', teslimGun: '2026-02-03', teslimSaat: '25:00' }).success,
    ).toBe(false);
    expect(
      gorevGuncelleSchema.safeParse({ baslik: 'x', teslimSaat: '10:00', id: 'c1' }).success,
    ).toBe(false);
  });

  it('başlık zorunlu ve sınırlı; raf adı zorunlu', () => {
    expect(gorevSchema.safeParse({ baslik: '   ' }).success).toBe(false);
    expect(gorevSchema.safeParse({ baslik: 'x'.repeat(161) }).success).toBe(false);
    expect(rafSchema.safeParse({ dolapId: 'd1', ad: '' }).success).toBe(false);
    expect(rafSchema.parse({ dolapId: 'd1', ad: 'Fizik' }).ustRafId).toBeNull();
  });
});
