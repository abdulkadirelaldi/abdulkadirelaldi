import { describe, expect, it, vi } from 'vitest';

import {
  istanbulGunu,
  kuyruguIsle,
  type GonderimSonucu,
  type KuyrukKaydi,
} from '@/components/panel/hizli-kuyruk';
import { kuyrukGunu } from '@/server/services/cuzdan';

const kayit = (id: string): KuyrukKaydi => ({ id, tur: 'su', girdi: { ml: 250 } });
const sirali = (...sonuclar: GonderimSonucu[]) => {
  const fn = vi.fn<(k: KuyrukKaydi) => Promise<GonderimSonucu>>();
  for (const s of sonuclar) fn.mockResolvedValueOnce(s);
  return fn;
};

describe('kuyruguIsle — çevrimdışı kuyruk (2026-10-31)', () => {
  it('hepsi giderse kuyruk boşalır', async () => {
    const s = await kuyruguIsle([kayit('a'), kayit('b')], sirali('tamam', 'tamam'));
    expect(s).toEqual({ kalan: [], gonderilen: 2, reddedilen: 0 });
  });

  it('⚠️ ağ yine yoksa durur, kalanlar SIRAYLA korunur', async () => {
    const g = sirali('tamam', 'bekle');
    const s = await kuyruguIsle([kayit('a'), kayit('b'), kayit('c')], g);
    expect(s.kalan.map((k) => k.id)).toEqual(['b', 'c']);
    expect(s.gonderilen).toBe(1);
    expect(g).toHaveBeenCalledTimes(2);
  });

  it('fırlatan gönderici kaydı KAYBETMEZ', async () => {
    const s = await kuyruguIsle([kayit('a')], vi.fn().mockRejectedValue(new TypeError('ağ')));
    expect(s.kalan.map((k) => k.id)).toEqual(['a']);
  });

  it('reddedilen kayıt kuyruğu tıkamaz', async () => {
    const s = await kuyruguIsle([kayit('a'), kayit('b')], sirali('red', 'tamam'));
    expect(s).toEqual({ kalan: [], gonderilen: 1, reddedilen: 1 });
  });
});

describe('günler', () => {
  it('İstanbul günü: UTC 22:00 ertesi gündür', () => {
    expect(istanbulGunu(new Date('2026-10-30T22:00:00Z'))).toBe('2026-10-31');
  });

  it('kuyruk günü: geçmiş korunur, gelecek ve 30 günden eskisi bugün olur', () => {
    const bugun = '2026-10-31';
    expect(kuyrukGunu('2026-10-29', bugun)).toBe('2026-10-29');
    expect(kuyrukGunu('2026-11-01', bugun)).toBe(bugun);
    expect(kuyrukGunu('2026-09-01', bugun)).toBe(bugun);
    expect(kuyrukGunu(undefined, bugun)).toBe(bugun);
  });
});
