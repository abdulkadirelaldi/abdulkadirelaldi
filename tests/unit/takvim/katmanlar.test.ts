import { describe, expect, it } from 'vitest';

import { takvimEtkinligiSchema } from '@/lib/schemas/takvim';
import {
  grupDegistir,
  grupDurumu,
  KATMAN_SIRASI,
  katmanDegistir,
  katmanlariCoz,
  katmanlariYaz,
  varsayilanKatman,
} from '@/lib/takvim/katmanlar';

describe('takvim katmanları (ADR-049)', () => {
  it('çerez yoksa ya da bozuksa hepsi açık — sessizce gizleme yok', () => {
    expect(katmanlariCoz(undefined)).toEqual(KATMAN_SIRASI);
    expect(katmanlariCoz('')).toEqual(KATMAN_SIRASI);
    expect(katmanlariCoz('OKUL,TATIL')).toEqual(KATMAN_SIRASI);
    expect(katmanlariCoz('<script>')).toEqual(KATMAN_SIRASI);
  });

  it('bilerek boş seçim korunur', () => {
    expect(katmanlariYaz([])).toBe('-');
    expect(katmanlariCoz('-')).toEqual([]);
  });

  it('yaz → çöz gidiş-dönüşü sıralı ve tekrarsız', () => {
    expect(katmanlariYaz(['SPECTRALOOP', 'KISISEL'])).toBe('KISISEL,SPECTRALOOP');
    expect(katmanlariCoz('SPECTRALOOP,KISISEL,KISISEL')).toEqual(['KISISEL', 'SPECTRALOOP']);
  });

  it('tek katman aç/kapat sırayı korur', () => {
    expect(katmanDegistir(['KISISEL', 'SPECTRALOOP'], 'OKUL')).toEqual([
      'KISISEL',
      'OKUL',
      'SPECTRALOOP',
    ]);
    expect(katmanDegistir(['KISISEL', 'OKUL'], 'KISISEL')).toEqual(['OKUL']);
  });

  it('grup: yalnızca Kişisel, yalnızca İş, ikisi birden', () => {
    const hepsi = [...KATMAN_SIRASI];
    // Hepsi açıkken "İş"e dokunmak İş'i kapatır → yalnızca Kişisel kalır.
    const yalnizKisisel = grupDegistir(hepsi, 'is');
    expect(yalnizKisisel).toEqual(['KISISEL', 'OKUL']);
    expect(grupDurumu(yalnizKisisel, 'kisisel')).toBe('acik');
    expect(grupDurumu(yalnizKisisel, 'is')).toBe('kapali');
    // Tekrar "İş" → ikisi birden.
    expect(grupDegistir(yalnizKisisel, 'is')).toEqual(hepsi);
    // Kısmen açık grup dokununca TAMAMEN açılır.
    expect(grupDurumu(['KIYI_MEDYA'], 'is')).toBe('kismen');
    expect(grupDegistir(['KIYI_MEDYA'], 'is')).toEqual(['KIYI_MEDYA', 'SPECTRALOOP']);
  });

  it('yeni etkinliğin katmanı ilk açık katman, hiçbiri yoksa Kişisel', () => {
    expect(varsayilanKatman(['KIYI_MEDYA', 'SPECTRALOOP'])).toBe('KIYI_MEDYA');
    expect(varsayilanKatman([])).toBe('KISISEL');
  });
});

describe('takvimEtkinligiSchema — katman', () => {
  const etkinlik = {
    baslik: 'Fizik vizesi',
    aciklama: '',
    konum: '',
    kategori: 'HATIRLATICI',
    tumGun: true,
    baslangicGun: '2026-11-20',
    baslangicSaat: '09:00',
    bitisGun: '2026-11-20',
    bitisSaat: '10:00',
    tekrar: { tur: 'YOK', aralik: 1, gunler: [], bitisGun: null, sayi: null },
    hatirlatmalar: [],
  };

  it('katman verilmezse Kişisel (katmandan habersiz çağıranlar bozulmaz)', () => {
    expect(takvimEtkinligiSchema.parse(etkinlik).katman).toBe('KISISEL');
  });

  it('verilen katman korunur, bilinmeyen reddedilir', () => {
    expect(takvimEtkinligiSchema.parse({ ...etkinlik, katman: 'OKUL' }).katman).toBe('OKUL');
    expect(takvimEtkinligiSchema.safeParse({ ...etkinlik, katman: 'TATIL' }).success).toBe(false);
  });
});
