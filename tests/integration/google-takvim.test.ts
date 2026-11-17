import { randomBytes } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { gorevSchema } from '@/lib/schemas/gorev';
import { takvimEtkinligiSchema } from '@/lib/schemas/takvim';
import { db } from '@/server/db';
import { gorevBitti, gorevGuncelle, gorevOlustur } from '@/server/services/gorev';
import {
  baglantiKes,
  baglantiKur,
  bekleyenleriEsitle,
  etkinlikGovdesi,
  fetchGoogleEtkinlikleri,
  panelEtkinligiGovdesi,
  fetchGoogleDurumu,
  gorevEsitle,
} from '@/server/services/google-takvim';

/**
 * GOOGLE TAKVİM EŞİTLEMESİ — gerçek PostgreSQL + sahte Google (ADR-051). Google uçları `fetch`
 * taklidiyle; gerçek ağ YOK. Sınanan: bağlanınca jeton ŞİFRELİ saklanır ve tarihli görevler
 * kuyruğa girer; ilk yazım POST, sonrakiler PUT; Google'da silinmiş etkinlik yeniden açılır;
 * tarih kaldırılınca etkinlik silinir; hata kuyruğu korur ve ekrana not düşer; arada gelen
 * düzenleme beklemeyi düşürmez.
 */
const ONEK = 'zzit-google';
const KULLANICI = 'zzit-google-kullanici';

type Istek = { yontem: string; adres: string; govde: unknown };
let istekler: Istek[] = [];
let siradakiId = 0;
/** Bir sonraki takvim isteğine verilecek durum (yoksa 200). */
let zorla: number[] = [];

function sahteGoogle(adres: string, init?: RequestInit): Response {
  const yontem = init?.method ?? 'GET';
  const govde =
    typeof init?.body === 'string' && init.body.startsWith('{')
      ? JSON.parse(init.body)
      : init?.body;
  istekler.push({ yontem, adres, govde });
  const json = (veri: unknown, status = 200) =>
    new Response(JSON.stringify(veri), { status, headers: { 'Content-Type': 'application/json' } });

  if (adres.includes('oauth2.googleapis.com/token')) {
    return json({ access_token: 'erisim', refresh_token: 'yenileme-gizli', expires_in: 3600 });
  }
  if (adres.includes('oauth2.googleapis.com/revoke')) return json({});
  const durum = zorla.shift() ?? 200;
  if (durum >= 300) return json({ error: { code: durum } }, durum);
  if (yontem === 'DELETE') return new Response(null, { status: 204 });
  if (yontem === 'POST') return json({ id: `etk${++siradakiId}` });
  return json({ id: decodeURIComponent(adres.split('/').pop()!) });
}

const takvimIstekleri = () => istekler.filter((i) => i.adres.includes('/calendar/v3/'));
const gorev = (p: Record<string, unknown>) =>
  gorevSchema.parse({ baslik: `${ONEK} ${String(p.ad ?? 'görev')}`, ...p });

const temizle = async () => {
  await db.gorev.deleteMany({ where: { baslik: { startsWith: ONEK } } });
  await db.googleBaglantisi.deleteMany({});
};

beforeAll(() => {
  process.env.TOTP_ENCRYPTION_KEY ??= randomBytes(32).toString('base64');
  process.env.GOOGLE_CLIENT_ID = 'istemci';
  process.env.GOOGLE_CLIENT_SECRET = 'gizli';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ornek.test';
});
beforeEach(async () => {
  await temizle();
  istekler = [];
  zorla = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (a: string, i?: RequestInit) => sahteGoogle(a, i)),
  );
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('etkinlik gövdesi (saf)', () => {
  const temel = {
    id: 'g1',
    baslik: 'Kozmos — 4 reels',
    not: null,
    alan: 'KIYI_MEDYA' as const,
    etiket: 'Kozmos',
    teslimGun: '2026-11-28',
    bitti: false,
  };

  it('gün boyu: tarih aralığı dışlayıcı, alarm bir önceki gün 09:00', () => {
    const e = etkinlikGovdesi({ ...temel, teslimDakika: null });
    expect(e.start).toEqual({ date: '2026-11-28' });
    expect(e.end).toEqual({ date: '2026-11-29' });
    expect(e.reminders).toEqual({
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 900 }],
    });
    expect(e.description).toContain('Kıyı Medya · Kozmos');
    expect(e.description).toContain('https://ornek.test/panel/isler');
    expect(e.extendedProperties.private.aeGorevId).toBe('g1');
  });

  it('saatli: İstanbul duvar saati, 30 dk, alarmlar 1 gün ve 2 saat önce', () => {
    const e = etkinlikGovdesi({ ...temel, teslimDakika: 21 * 60 });
    expect(e.start).toEqual({ dateTime: '2026-11-28T18:00:00.000Z', timeZone: 'Europe/Istanbul' });
    expect(e.end).toEqual({ dateTime: '2026-11-28T18:30:00.000Z', timeZone: 'Europe/Istanbul' });
    expect(e.reminders.overrides.map((r) => r.minutes)).toEqual([1440, 120]);
  });

  it('biten: ✓ alır, alarmı kalkar', () => {
    const e = etkinlikGovdesi({ ...temel, teslimDakika: null, bitti: true });
    expect(e.summary).toBe('✓ Kozmos — 4 reels');
    expect(e.reminders.overrides).toEqual([]);
  });
});

describe('google takvim eşitlemesi', () => {
  it('bağlantı yokken hiçbir şey gönderilmez; görev kuyrukta bekler', async () => {
    const g = await gorevOlustur(gorev({ ad: 'a', teslimGun: '2026-11-28' }));
    await gorevEsitle(g.id);
    expect(await bekleyenleriEsitle()).toEqual({ yazilan: 0, hata: null });
    expect(takvimIstekleri()).toHaveLength(0);
    expect((await db.gorev.findUnique({ where: { id: g.id } }))!.googleBekliyor).toBe(true);
  });

  it('bağlanınca jeton ŞİFRELİ saklanır, tarihli görevler bir kez yazılır, tarihsiz yazılmaz', async () => {
    await gorevOlustur(gorev({ ad: 'tarihli', teslimGun: '2026-11-28' }));
    const tarihsiz = await gorevOlustur(gorev({ ad: 'tarihsiz' }));
    await db.gorev.update({ where: { id: tarihsiz.id }, data: { googleBekliyor: false } });

    await baglantiKur(KULLANICI, 'kod');
    const b = await db.googleBaglantisi.findUniqueOrThrow({ where: { userId: KULLANICI } });
    expect(b.yenilemeJetonu).not.toContain('yenileme-gizli');
    expect(b.yenilemeJetonu.startsWith('v1.')).toBe(true);

    const sonuc = await bekleyenleriEsitle(50, new Date('2026-11-16T10:00:00Z'));
    expect(sonuc.hata).toBeNull();
    const yazilan = takvimIstekleri();
    expect(yazilan.map((i) => i.yontem)).toEqual(['POST']);
    expect((yazilan[0]!.govde as { summary: string }).summary).toBe(`${ONEK} tarihli`);

    const d = await fetchGoogleDurumu();
    expect(d).toMatchObject({ bagli: true, bekleyen: 0, sonHata: null });
    expect(d.sonEsitleme).toBe('2026-11-16T10:00:00.000Z');
  });

  it('sonraki yazımlar PUT; Google’da silinmişse yeniden açılır; tarih kalkınca silinir', async () => {
    await baglantiKur(KULLANICI, 'kod');
    const g = await gorevOlustur(gorev({ ad: 'x', teslimGun: '2026-11-28' }));
    await gorevEsitle(g.id);
    const ilkId = (await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).googleEtkinlikId;
    expect(ilkId).toMatch(/^etk/);

    await gorevBitti({ id: g.id, bitti: true });
    await gorevEsitle(g.id);
    const put = takvimIstekleri().at(-1)!;
    expect(put.yontem).toBe('PUT');
    expect((put.govde as { summary: string }).summary.startsWith('✓ ')).toBe(true);

    zorla = [404];
    await gorevGuncelle({ ...gorev({ ad: 'x', teslimGun: '2026-11-29' }), id: g.id });
    await gorevEsitle(g.id);
    const yeni = await db.gorev.findUniqueOrThrow({ where: { id: g.id } });
    expect(yeni.googleEtkinlikId).not.toBe(ilkId);
    expect(yeni.googleBekliyor).toBe(false);

    await gorevGuncelle({ ...gorev({ ad: 'x' }), id: g.id });
    await gorevEsitle(g.id);
    expect(takvimIstekleri().at(-1)!.yontem).toBe('DELETE');
    expect(await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).toMatchObject({
      googleEtkinlikId: null,
      googleBekliyor: false,
    });
  });

  it('Google hata verirse görev kuyrukta kalır ve hata ekrana not düşer; sonra düzelir', async () => {
    await baglantiKur(KULLANICI, 'kod');
    const g = await gorevOlustur(gorev({ ad: 'h', teslimGun: '2026-11-28' }));
    zorla = [500];
    const s = await bekleyenleriEsitle();
    expect(s.hata).toMatch(/açılamadı \(500\)/);
    expect((await db.gorev.findUniqueOrThrow({ where: { id: g.id } })).googleBekliyor).toBe(true);
    expect((await fetchGoogleDurumu()).sonHata).toMatch(/500/);

    expect((await bekleyenleriEsitle()).hata).toBeNull();
    expect((await fetchGoogleDurumu()).sonHata).toBeNull();
  });

  it('eşitleme sırasında gelen düzenleme beklemeyi düşürmez', async () => {
    await baglantiKur(KULLANICI, 'kod');
    const g = await gorevOlustur(gorev({ ad: 'yaris', teslimGun: '2026-11-28' }));
    // Google yanıt verirken görev değişiyor.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (a: string, i?: RequestInit) => {
        if (a.includes('/calendar/v3/')) {
          await db.gorev.update({ where: { id: g.id }, data: { baslik: `${ONEK} yaris2` } });
        }
        return sahteGoogle(a, i);
      }),
    );
    await gorevEsitle(g.id);
    const s = await db.gorev.findUniqueOrThrow({ where: { id: g.id } });
    expect(s.googleEtkinlikId).toMatch(/^etk/);
    expect(s.googleBekliyor).toBe(true);
  });

  it('bağlantıyı kesmek izni iptal eder ve kaydı siler', async () => {
    await baglantiKur(KULLANICI, 'kod');
    await baglantiKes();
    expect(istekler.some((i) => i.adres.includes('/revoke'))).toBe(true);
    expect(await db.googleBaglantisi.count()).toBe(0);
  });

  it('aynı anda başlayan iki eşitleme aynı görevi İKİ KEZ açmaz (2026-11-17 kopya hatası)', async () => {
    await baglantiKur(KULLANICI, 'kod');
    const g = await gorevOlustur(gorev({ ad: 'kopya', teslimGun: '2026-11-28' }));
    // Bağlanınca başlayan tur + "Şimdi eşitle" + işin kendi eşitlemesi — üçü birden.
    await Promise.all([bekleyenleriEsitle(), bekleyenleriEsitle(), gorevEsitle(g.id)]);
    const postlar = takvimIstekleri().filter((i) => i.yontem === 'POST');
    expect(postlar).toHaveLength(1);
    const s = await db.gorev.findUniqueOrThrow({ where: { id: g.id } });
    expect(s.googleEtkinlikId).toMatch(/^etk/);
    expect(s.googleBekliyor).toBe(false);
  });

  it('panel takvimi Google etkinliklerini okur; bağlı değilken boş ve "bağlı değil" der (ADR-053)', async () => {
    const bas = new Date('2026-11-18T00:00:00Z');
    const son = new Date('2026-11-19T00:00:00Z');
    expect(await fetchGoogleEtkinlikleri(bas, son)).toEqual({
      bagli: false,
      liste: [],
      hata: null,
    });

    await baglantiKur(KULLANICI, 'kod');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (a: string, i?: RequestInit) => {
        if (a.includes('/calendar/v3/') && (i?.method ?? 'GET') === 'GET') {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'ders',
                  summary: 'Veri Tabanı',
                  htmlLink: 'https://calendar.google.com/e/ders',
                  start: { dateTime: '2026-11-18T13:30:00+03:00' },
                  end: { dateTime: '2026-11-18T16:30:00+03:00' },
                },
                {
                  id: 'is',
                  summary: 'Garage — 4 reels',
                  start: { date: '2026-11-18' },
                  end: { date: '2026-11-19' },
                  extendedProperties: { private: { aeGorevId: 'g1' } },
                },
                { id: 'iptal', status: 'cancelled' },
              ],
            }),
            { status: 200 },
          );
        }
        return sahteGoogle(a, i);
      }),
    );
    const g = await fetchGoogleEtkinlikleri(bas, son);
    expect(g.bagli).toBe(true);
    expect(g.hata).toBeNull();
    expect(g.liste).toEqual([
      expect.objectContaining({
        id: 'ders',
        tumGun: false,
        baslangic: '2026-11-18T10:30:00.000Z',
        baglanti: 'https://calendar.google.com/e/ders',
        gorevId: null,
      }),
      expect.objectContaining({
        id: 'is',
        tumGun: true,
        baslangic: '2026-11-17T21:00:00.000Z',
        bitis: '2026-11-18T21:00:00.000Z',
        gorevId: 'g1',
      }),
    ]);
  });

  it('panel formu → Google: özel, tekrar kuralı, gün boyu hatırlatma kaydırması (ADR-053)', () => {
    const girdi = takvimEtkinligiSchema.parse({
      baslik: 'Proje toplantısı',
      aciklama: null,
      konum: null,
      kategori: 'TOPLANTI',
      tumGun: false,
      baslangicGun: '2026-11-20',
      baslangicSaat: '17:00',
      bitisGun: '2026-11-20',
      bitisSaat: '18:00',
      tekrar: { tur: 'HAFTALIK', aralik: 1, gunler: [1, 5], bitisGun: '2026-12-31', sayi: null },
      hatirlatmalar: [30],
    });
    const e = panelEtkinligiGovdesi(girdi);
    expect(e.visibility).toBe('private');
    expect(e.start).toEqual({ dateTime: '2026-11-20T14:00:00.000Z', timeZone: 'Europe/Istanbul' });
    expect(e.recurrence).toEqual([
      'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,FR;UNTIL=20261231T205959Z',
    ]);
    expect(e.reminders.overrides).toEqual([{ method: 'popup', minutes: 30 }]);

    const tumGun = panelEtkinligiGovdesi({
      ...girdi,
      tumGun: true,
      bitisGun: '2026-11-21',
      tekrar: { ...girdi.tekrar, tur: 'YOK' },
      hatirlatmalar: [0, 600],
    });
    expect(tumGun.start).toEqual({ date: '2026-11-20' });
    expect(tumGun.end).toEqual({ date: '2026-11-22' });
    expect(tumGun.recurrence).toBeUndefined();
    // Panel: 09:00'dan önce dakika; Google: 00:00'dan önce — 600 → 60, 0 (09:00) → 00:00'a yuvarlanır.
    expect(tumGun.reminders.overrides.map((r) => r.minutes)).toEqual([0, 60]);
  });
});
