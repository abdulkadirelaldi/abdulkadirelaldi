import { describe, expect, it, vi } from 'vitest';

import { kiyiAraligi, kiyiOlusumu } from '@/lib/takvim/kiyi';
import {
  fetchKiyiOzet,
  fetchKiyiTakvim,
  kiyiAyari,
  kiyiPanelAdresi,
  KIYI_MEDYA_VARSAYILAN_URL,
} from '@/server/services/kiyi-medya';

/** KIYI MEDYA KÖPRÜSÜ (ADR-049 M3) — panel tarafı; Kıyı Medya sahte `fetch` ile. */
const ANAHTAR = 'x'.repeat(48);
const env = { KIYI_MEDYA_KOPRU_TOKEN: ANAHTAR };

function sahte(yanit: () => Response | Promise<Response>) {
  const cagrilar: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    cagrilar.push({ url, init });
    return yanit();
  });
  return { cagrilar, fetchImpl };
}
const tamam = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });

describe('kiyiAyari', () => {
  it('anahtar yoksa KAPALI; URL varsayılanı ve sondaki eğik çizgi', () => {
    expect(kiyiAyari({})).toBeNull();
    expect(kiyiAyari({ KIYI_MEDYA_KOPRU_TOKEN: '  ' })).toBeNull();
    expect(kiyiAyari(env)).toEqual({ url: KIYI_MEDYA_VARSAYILAN_URL, anahtar: ANAHTAR });
    expect(kiyiAyari({ ...env, KIYI_MEDYA_KOPRU_URL: 'http://yerel:5002/api/kopru/' })?.url).toBe(
      'http://yerel:5002/api/kopru',
    );
  });

  it('panel adresi Kıyı Medya yönetim paneli', () => {
    expect(kiyiPanelAdresi({})).toBe('https://kiyimedya.com/admin/dashboard');
  });
});

describe('köprü okuması', () => {
  it('kapalıyken HİÇ istek atılmaz', async () => {
    const { fetchImpl } = sahte(() => tamam([]));
    expect(await fetchKiyiOzet({ env: {}, fetchImpl, onbellek: new Map() })).toEqual({
      durum: 'kapali',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('anahtar başlıkta gider (adreste değil); aralık İstanbul gününden', async () => {
    const { cagrilar, fetchImpl } = sahte(() => tamam([]));
    await fetchKiyiTakvim('2026-11-01', '2026-11-30', { env, fetchImpl, onbellek: new Map() });
    const { url, init } = cagrilar[0]!;
    expect((init?.headers as Record<string, string>)['X-Kopru-Token']).toBe(ANAHTAR);
    expect(url).not.toContain(ANAHTAR);
    const q = new URL(url).searchParams;
    expect(q.get('from')).toBe('2026-10-31T21:00:00.000Z');
    expect(q.get('to')).toBe('2026-11-30T21:00:00.000Z');
    expect(kiyiAraligi('2026-11-01', '2026-11-30')).toEqual({
      from: q.get('from'),
      to: q.get('to'),
    });
  });

  it('⚠️ ulaşılamazsa ya da reddedilirse HATA (boş liste değil)', async () => {
    const ag = sahte(() => Promise.reject(new DOMException('zaman aşımı', 'TimeoutError')));
    expect(
      await fetchKiyiOzet({ env, fetchImpl: ag.fetchImpl, onbellek: new Map() }),
    ).toMatchObject({
      durum: 'hata',
      mesaj: 'Kıyı Medya’ya ulaşılamadı.',
    });
    const red = sahte(() => new Response('{}', { status: 401 }));
    expect(
      await fetchKiyiOzet({ env, fetchImpl: red.fetchImpl, onbellek: new Map() }),
    ).toMatchObject({
      durum: 'hata',
      mesaj: 'Kıyı Medya köprü anahtarını kabul etmedi.',
    });
    const bozuk = sahte(() => new Response(JSON.stringify({ success: false }), { status: 200 }));
    expect(
      (await fetchKiyiOzet({ env, fetchImpl: bozuk.fetchImpl, onbellek: new Map() })).durum,
    ).toBe('hata');
  });

  it('2 dakika önbellek; sonra yeniden okur', async () => {
    const onbellek = new Map();
    const { fetchImpl } = sahte(() => tamam({ acikGorev: 3 }));
    const t0 = new Date('2026-11-15T10:00:00Z');
    await fetchKiyiOzet({ env, fetchImpl, onbellek, simdi: t0 });
    await fetchKiyiOzet({ env, fetchImpl, onbellek, simdi: new Date(t0.getTime() + 119_000) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await fetchKiyiOzet({ env, fetchImpl, onbellek, simdi: new Date(t0.getTime() + 121_000) });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('kiyiOlusumu', () => {
  const B = 'https://kiyimedya.com/admin/dashboard';

  it('çekim: İstanbul duvar saatiyle, Kıyı Medya katmanı, dışarıya bağlantı', () => {
    const o = kiyiOlusumu(
      {
        kaynak: 'cekim',
        id: 'c1',
        baslik: 'Ürün',
        gun: '2026-11-20T00:00:00.000Z',
        baslangicSaat: '10:00',
        bitisSaat: '12:30',
        musteri: 'Kafe X',
      },
      B,
    );
    expect(o).toMatchObject({
      katman: 'KIYI_MEDYA',
      kategori: 'IS',
      tumGun: false,
      gun: '2026-11-20',
      baslangic: '2026-11-20T07:00:00.000Z',
      bitis: '2026-11-20T09:30:00.000Z',
      baslik: '🎬 Ürün · Kafe X',
      baglanti: B,
    });
  });

  it('saatsiz ya da bozuk saatli görev gün boyu; tarihsiz öğe takvime düşmez', () => {
    const g = kiyiOlusumu(
      {
        kaynak: 'gorev',
        id: 'g',
        baslik: 'Kurgu',
        gun: '2026-11-22T00:00:00.000Z',
        saat: '25:99',
        musteri: null,
      },
      B,
    );
    expect(g).toMatchObject({
      tumGun: true,
      gun: '2026-11-22',
      sonGun: '2026-11-22',
      kategori: 'HATIRLATICI',
    });
    expect(
      kiyiOlusumu(
        { kaynak: 'gorev', id: 'g2', baslik: 'x', gun: null, saat: null, musteri: null },
        B,
      ),
    ).toBeNull();
  });

  it('etkinlik: anlar aynen, çok günlü son gün dahil', () => {
    const e = kiyiOlusumu(
      {
        kaynak: 'etkinlik',
        id: 'e',
        baslik: 'Fuar',
        baslangic: '2026-11-20T06:00:00.000Z',
        bitis: '2026-11-22T15:00:00.000Z',
        tumGun: false,
        musteri: null,
      },
      B,
    );
    expect(e).toMatchObject({ gun: '2026-11-20', sonGun: '2026-11-22', kategori: 'TOPLANTI' });
  });
});
