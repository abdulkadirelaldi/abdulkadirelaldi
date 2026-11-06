import { describe, expect, it, vi } from 'vitest';

import {
  acikMi,
  dersKaydet,
  fetchIngilizceDurum,
  fetchTekrarSorulari,
  seriHesapla,
  xpHesapla,
  zayiflar,
} from '@/server/services/ingilizce';
import { dersBul } from '@/lib/ingilizce/mufredat';
import { planla, type PlanGirdisi } from '@/server/services/bildirim';

// Gerçek içerikten bağımsız küçük müfredat: iki ders, her biri iki soru.
vi.mock('@/lib/ingilizce/gunluk', () => {
  const soru = (id: string) => ({
    tur: 'bosluk',
    id,
    soru: 'I ___ fine.',
    secenekler: ['am', 'is', 'are'],
    dogru: 0,
    aciklama: 'I ile am kullanılır.',
  });
  return {
    GUNLUK: {
      id: 'gunluk',
      ad: 'Günlük İngilizce',
      aciklama: '',
      uniteler: [
        {
          id: 'gunluk-u1',
          seviye: 'A1',
          baslik: 'Tanışma',
          ozet: 'Selamlaşma',
          dersler: [
            {
              id: 'gunluk-u1-d1',
              baslik: 'Merhaba',
              not: '',
              alistirmalar: [
                soru('gunluk-u1-d1-a1'),
                soru('gunluk-u1-d1-a2'),
                { tur: 'konus', id: 'gunluk-u1-d1-a3', cumle: 'Hello there', anlam: 'Merhaba' },
              ],
            },
            {
              id: 'gunluk-u1-d2',
              baslik: 'To be',
              not: '',
              alistirmalar: [soru('gunluk-u1-d2-a1')],
            },
          ],
        },
      ],
    },
  };
});
vi.mock('@/lib/ingilizce/yazilim', () => ({
  YAZILIM: { id: 'yazilim', ad: 'Yazılım İngilizcesi', aciklama: '', uniteler: [] },
}));
vi.mock('@/lib/ingilizce/sinav', () => ({
  SINAV: { id: 'sinav', ad: 'Sınav İngilizcesi', aciklama: '', uniteler: [] },
}));

const tarih = (g: string) => new Date(`${g}T00:00:00Z`);

describe('xpHesapla', () => {
  it('ilk kez 10, hatasız +5, tekrar 5', () => {
    expect(xpHesapla(true, 0)).toBe(15);
    expect(xpHesapla(true, 2)).toBe(10);
    expect(xpHesapla(false, 0)).toBe(5);
  });
});

describe('seriHesapla', () => {
  it('bugün dahil art arda günler', () => {
    expect(seriHesapla(['2026-11-04', '2026-11-05', '2026-11-06'], '2026-11-06')).toEqual({
      seri: 3,
      bugunYapildi: true,
    });
  });
  it('⚠️ bugün henüz ders yoksa seri dünden sayılır, kırılmaz', () => {
    expect(seriHesapla(['2026-11-04', '2026-11-05'], '2026-11-06')).toEqual({
      seri: 2,
      bugunYapildi: false,
    });
  });
  it('bir gün atlanınca sıfırlanır; tekrarlar sayılmaz', () => {
    expect(seriHesapla(['2026-11-03', '2026-11-04'], '2026-11-06').seri).toBe(0);
    expect(seriHesapla(['2026-11-06', '2026-11-06'], '2026-11-06').seri).toBe(1);
    expect(seriHesapla([], '2026-11-06').seri).toBe(0);
  });
});

describe('zayiflar', () => {
  it('son olayı yanlış olanlar', () => {
    expect(
      zayiflar([
        { hatalar: ['a'], dogrular: [] },
        { hatalar: [], dogrular: ['a'] },
      ]),
    ).toEqual([]);
    expect(
      zayiflar([
        { hatalar: ['a', 'b'], dogrular: ['c'] },
        { hatalar: ['c'], dogrular: ['a'] },
      ]),
    ).toEqual(expect.arrayContaining(['b', 'c']));
  });
});

describe('acikMi', () => {
  it('ilk ders açık, sonraki bir öncekine bağlı', () => {
    expect(acikMi(dersBul('gunluk-u1-d1')!, new Set())).toBe(true);
    expect(acikMi(dersBul('gunluk-u1-d2')!, new Set())).toBe(false);
    expect(acikMi(dersBul('gunluk-u1-d2')!, new Set(['gunluk-u1-d1']))).toBe(true);
  });
});

function sahte(
  satirlar: { dersId: string; gun: Date; xp: number; hatalar: string[]; dogrular: string[] }[],
) {
  return {
    ingilizceDers: {
      findMany: vi.fn(async (args?: { distinct?: string[] }) =>
        args?.distinct ? [...new Map(satirlar.map((s) => [s.dersId, s])).values()] : satirlar,
      ),
      create: vi.fn(async ({ data }: { data: (typeof satirlar)[number] }) => {
        satirlar.push(data);
        return data;
      }),
    },
    ingilizceAyar: { findUnique: vi.fn().mockResolvedValue({ gunlukHedefXp: 30 }) },
  } as never;
}

describe('dersKaydet', () => {
  it('ilk tamamlama XP verir, seri ve bugünün toplamını döner', async () => {
    const satirlar = [
      { dersId: 'gunluk-u1-d1', gun: tarih('2026-11-05'), xp: 15, hatalar: [], dogrular: [] },
    ];
    const s = await dersKaydet(
      { dersId: 'gunluk-u1-d2', hatalar: [], dogrular: ['gunluk-u1-d2-a1'] },
      sahte(satirlar),
      '2026-11-06',
    );
    expect(s).toMatchObject({ xp: 15, bugunXp: 15, seri: 2 });
    expect(satirlar.at(-1)).toMatchObject({
      dersId: 'gunluk-u1-d2',
      dogrular: ['gunluk-u1-d2-a1'],
    });
  });

  it('tekrar oynanan ders 5 XP', async () => {
    const satirlar = [
      { dersId: 'gunluk-u1-d1', gun: tarih('2026-11-06'), xp: 15, hatalar: [], dogrular: [] },
    ];
    const s = await dersKaydet(
      { dersId: 'gunluk-u1-d1', hatalar: [], dogrular: [] },
      sahte(satirlar),
      '2026-11-06',
    );
    expect(s).toMatchObject({ xp: 5, bugunXp: 20 });
  });

  it('⚠️ kilitli, bilinmeyen ya da başka dersin sorusu kaydedilmez', async () => {
    const bos = () => sahte([]);
    expect(
      await dersKaydet({ dersId: 'gunluk-u1-d2', hatalar: [], dogrular: [] }, bos()),
    ).toBeNull();
    expect(await dersKaydet({ dersId: 'yok-u1-d1', hatalar: [], dogrular: [] }, bos())).toBeNull();
    expect(
      await dersKaydet(
        { dersId: 'gunluk-u1-d1', hatalar: ['gunluk-u1-d2-a1'], dogrular: [] },
        bos(),
      ),
    ).toBeNull();
  });

  it('tekrar dersi yalnızca kendi parkurunun sorularını kabul eder', async () => {
    expect(
      await dersKaydet(
        { dersId: 'tekrar-gunluk', hatalar: [], dogrular: ['gunluk-u1-d2-a1'] },
        sahte([]),
      ),
    ).toMatchObject({ xp: 5 });
    expect(
      await dersKaydet(
        { dersId: 'tekrar-yazilim', hatalar: [], dogrular: ['gunluk-u1-d2-a1'] },
        sahte([]),
      ),
    ).toBeNull();
  });
});

describe('fetchIngilizceDurum ve tekrar', () => {
  const satirlar = [
    {
      dersId: 'gunluk-u1-d1',
      gun: tarih('2026-11-05'),
      xp: 10,
      hatalar: ['gunluk-u1-d1-a1', 'gunluk-u1-d1-a3'],
      dogrular: ['gunluk-u1-d1-a2'],
    },
    {
      dersId: 'gunluk-u1-d2',
      gun: tarih('2026-11-06'),
      xp: 15,
      hatalar: [],
      dogrular: ['gunluk-u1-d2-a1'],
    },
  ];

  it('toplam, bugün, hedef, hafta ve zayıf soru', async () => {
    const d = await fetchIngilizceDurum('kisi', sahte([...satirlar]), '2026-11-06');
    expect(d).toMatchObject({
      tamamlanan: ['gunluk-u1-d1', 'gunluk-u1-d2'],
      toplamXp: 25,
      bugunXp: 15,
      hedefXp: 30,
      seri: 2,
      bugunYapildi: true,
      zayif: { gunluk: 2, yazilim: 0, sinav: 0 },
    });
    expect(d.hafta).toHaveLength(7);
    expect(d.hafta.at(-1)).toEqual({ gun: '2026-11-06', xp: 15 });
  });

  it('⚠️ tekrar dersinde konuşma sorusu yok', async () => {
    const sorular = await fetchTekrarSorulari('gunluk', sahte([...satirlar]));
    expect(sorular.map((s) => s.id)).toEqual(['gunluk-u1-d1-a1']);
  });
});

describe('planla · İngilizce serisi', () => {
  const temel = {
    gun: '2026-11-06',
    saat: 20,
    tercih: { borc: false, aliskanlik: false, su: false, haftalik: false },
    borclar: [],
    kalanAliskanliklar: [],
    suMl: 4000,
    ingilizceSeri: 4,
  } satisfies PlanGirdisi;
  it('20–22 arası, seri varsa hatırlatır', () => {
    expect(planla(temel)).toEqual([
      expect.objectContaining({ tur: 'ingilizce', anahtar: 'seri', url: '/panel/ingilizce' }),
    ]);
    expect(planla(temel)[0]?.baslik).toContain('4 günlük');
    expect(planla({ ...temel, saat: 19 })).toEqual([]);
    expect(planla({ ...temel, saat: 22 })).toEqual([]);
  });
  it('seri yoksa, bugün yapıldıysa (0) ya da tercih kapalıysa gitmez', () => {
    expect(planla({ ...temel, ingilizceSeri: 0 })).toEqual([]);
    expect(planla({ ...temel, tercih: { ...temel.tercih, ingilizce: false } })).toEqual([]);
  });
});
