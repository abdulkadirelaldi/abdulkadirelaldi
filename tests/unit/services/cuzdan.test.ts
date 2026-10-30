import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addDebtPayment,
  aylikTutar,
  butceOzeti,
  fetchButceLimitleri,
  fetchCuzdan,
  kalanAy,
  fetchWalletAccountById,
  fetchWalletDebtById,
  fetchWalletFlowById,
  odenenYuzde,
} from '@/server/services/cuzdan';
import { kaynagiCozumle, tlKarsiligi, type KurDurumu } from '@/server/services/kur';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const KAYNAK = {
  Update_Date: '2026-10-30 10:00:00',
  USD: { Buying: 49.83, Selling: 49.84, Type: 'Currency' },
  GRA: { Buying: 6452.33, Selling: 6453.15, Type: 'Gold' },
  CEYREKALTIN: { Buying: 10392.68, Selling: 10632.48, Type: 'Gold' },
  EUR: { Buying: 'bozuk', Selling: 55.6 },
};

describe('kaynagiCozumle', () => {
  it('birimleri eşler, bozuk satırı ATLAR (sıfır kur üretmez)', () => {
    const k = kaynagiCozumle(KAYNAK);
    expect(k.USD).toEqual({ buying: '49.8300', selling: '49.8400' });
    expect(k.GOLD_QUARTER).toEqual({ buying: '10392.6800', selling: '10632.4800' });
    expect(k.EUR).toBeUndefined();
    expect(kaynagiCozumle(null)).toEqual({});
  });
});

describe('tlKarsiligi — kayıpsız, varlık alış / borç satış', () => {
  const kurlar = kaynagiCozumle(KAYNAK);
  it('3 çeyrek: alış ve satış ayrı', () => {
    expect(tlKarsiligi('3.00', 'GOLD_QUARTER', kurlar, 'alis')).toBe('31178.04');
    expect(tlKarsiligi('3.00', 'GOLD_QUARTER', kurlar, 'satis')).toBe('31897.44');
  });
  it('TRY kendisi; kuru olmayan birim null (0 DEĞİL)', () => {
    expect(tlKarsiligi('1250.50', 'TRY', kurlar, 'alis')).toBe('1250.50');
    expect(tlKarsiligi('10.00', 'EUR', kurlar, 'alis')).toBeNull();
  });
});

describe('fetchKurlar — sayfayı bekletmez (2026-10-30)', () => {
  /** Modül durumu (bellek, son hata) her testte sıfır: taze yükleme. */
  let fetchKurlar: typeof import('@/server/services/kur').fetchKurlar;
  beforeEach(async () => {
    vi.resetModules();
    ({ fetchKurlar } = await import('@/server/services/kur'));
  });

  const SIMDI = new Date('2026-10-30T07:00:00Z');
  const satir = (fetchedAt: string) => ({
    unit: 'USD',
    buying: decimal('49.0000'),
    selling: decimal('49.1000'),
    fetchedAt: new Date(fetchedAt),
  });
  const istemci = (satirlar: unknown[]) => {
    const upsert = vi.fn().mockReturnValue('islem');
    return {
      upsert,
      client: {
        priceQuote: { upsert, findMany: vi.fn().mockResolvedValue(satirlar) },
        $transaction: vi.fn().mockResolvedValue([]),
      } as never,
    };
  };
  const basarili = () => vi.fn().mockResolvedValue({ ok: true, json: async () => KAYNAK });

  it('⚠️ kaynak ASILI kalsa da kayıtlı kur HEMEN döner', async () => {
    const { client } = istemci([satir('2026-10-30T06:30:00Z')]);
    const asili = vi.fn(() => new Promise<never>(() => undefined));
    const d = await fetchKurlar(client, asili as never, SIMDI);
    expect(d).toMatchObject({ bayat: false, guncellendi: '2026-10-30T06:30:00.000Z' });
    expect(d.kurlar.USD).toEqual({ buying: '49.0000', selling: '49.1000' });
    expect(asili).toHaveBeenCalledTimes(1); // yenileme arka planda başladı
  });

  it('1 saatten eski kur "bayat" olarak gösterilir', async () => {
    const { client } = istemci([satir('2026-10-29T08:00:00Z')]);
    const d = await fetchKurlar(
      client,
      vi.fn().mockRejectedValue(new Error('ağ yok')) as never,
      SIMDI,
    );
    expect(d.bayat).toBe(true);
  });

  it('arka plan yenilemesi belleği doldurur, sonraki istek veritabanına gitmez', async () => {
    const { client, upsert } = istemci([satir('2026-10-30T06:30:00Z')]);
    await fetchKurlar(client, basarili() as never, SIMDI);
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledTimes(3));
    const sonraki = await fetchKurlar(
      client,
      basarili() as never,
      new Date('2026-10-30T07:01:00Z'),
    );
    expect(sonraki).toMatchObject({ bayat: false, guncellendi: SIMDI.toISOString() });
    expect(Object.keys(sonraki.kurlar)).toContain('GOLD_GRAM');
  });

  it('kaynak düşükken 1 dakika yeniden denenmez', async () => {
    const { client } = istemci([satir('2026-10-30T06:30:00Z')]);
    const hatali = vi.fn().mockRejectedValue(new Error('ağ yok'));
    await fetchKurlar(client, hatali as never, SIMDI);
    await vi.waitFor(() => expect(hatali).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    await fetchKurlar(client, hatali as never, new Date('2026-10-30T07:00:30Z'));
    expect(hatali).toHaveBeenCalledTimes(1);
    await fetchKurlar(client, hatali as never, new Date('2026-10-30T07:01:01Z'));
    expect(hatali).toHaveBeenCalledTimes(2);
  });

  it('hiç kur yoksa kaynak BEKLENİR; o da düşükse boş ve bayat (uydurma yok)', async () => {
    const a = istemci([]);
    const d = await fetchKurlar(a.client, basarili() as never, SIMDI);
    expect(d.bayat).toBe(false);
    expect(a.upsert).toHaveBeenCalledTimes(3);

    vi.resetModules();
    ({ fetchKurlar } = await import('@/server/services/kur'));
    const b = istemci([]);
    const bos = await fetchKurlar(
      b.client,
      vi.fn().mockRejectedValue(new Error('x')) as never,
      SIMDI,
    );
    expect(bos).toEqual({ kurlar: {}, guncellendi: null, bayat: true });
  });
});

describe('saf hesaplar', () => {
  it('aylığa çevirme: haftalık ×52/12, yıllık ÷12, tek sefer aylığa girmez', () => {
    expect(aylikTutar('1000.00', 'MONTHLY')).toBe('1000.00');
    expect(aylikTutar('1000.00', 'WEEKLY')).toBe('4333.33');
    expect(aylikTutar('12000.00', 'YEARLY')).toBe('1000.00');
    expect(aylikTutar('500.00', 'ONCE')).toBeNull();
  });

  it('kalan ay: bitiş tarihi varsa ondan, yoksa kalan/taksit', () => {
    expect(kalanAy('12000.00', '1000.00', null, '2026-10-30')).toBe(12);
    expect(kalanAy('12000.00', null, '2027-10-30', '2026-10-30')).toBe(12);
    expect(kalanAy('12000.00', null, null, '2026-10-30')).toBeNull();
  });

  it('ödenen yüzde 0–100', () => {
    expect(odenenYuzde('10000.00', '2500.00')).toBe(75);
    expect(odenenYuzde('0.00', '0.00')).toBe(0);
  });
});

describe('fetchCuzdan', () => {
  const kur: KurDurumu = { kurlar: kaynagiCozumle(KAYNAK), guncellendi: null, bayat: false };
  const istemci = () =>
    ({
      walletAccount: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'a', name: 'Ziraat', kind: 'BANK', unit: 'TRY', balance: decimal('10000.00') },
          {
            id: 'b',
            name: 'Altın',
            kind: 'INVESTMENT',
            unit: 'GOLD_QUARTER',
            balance: decimal('2.00'),
          },
          { id: 'c', name: 'Euro', kind: 'CASH', unit: 'EUR', balance: decimal('100.00') },
        ]),
      },
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'd',
            name: 'Altın borcu',
            lender: 'Ahmet',
            unit: 'GOLD_GRAM',
            totalAmount: decimal('10.00'),
            remainingAmount: decimal('5.00'),
            monthlyPayment: decimal('1.00'),
            paymentDay: 15,
            endDate: null,
            note: null,
            isClosed: false,
          },
        ]),
      },
      walletFlow: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'f1',
            kind: 'INCOME',
            name: 'Maaş',
            counterparty: 'Adapha',
            unit: 'TRY',
            amount: decimal('30000.00'),
            frequency: 'MONTHLY',
            day: 1,
            date: null,
            category: null,
            note: null,
            isActive: true,
          },
          {
            id: 'f2',
            kind: 'EXPENSE',
            name: 'Kira',
            counterparty: null,
            unit: 'TRY',
            amount: decimal('8000.00'),
            frequency: 'MONTHLY',
            day: 5,
            date: null,
            category: null,
            note: null,
            isActive: true,
          },
        ]),
      },
    }) as never;

  it('⚠️ kuru olmayan kalem toplama GİRMEZ ve sayılır; Decimal sızmaz', async () => {
    const c = await fetchCuzdan(istemci(), '2026-10-30', kur);
    expect(decimalKalanlar(c)).toEqual([]);
    // 10000 + 2 × 10392.68 = 30785.36 (EUR kuru yok → dışarıda)
    expect(c.ozet.varlikTl).toBe('30785.36');
    expect(c.ozet.kursuzKalem).toBe(1);
    // Altın borcu SATIŞ kuruyla: 5 × 6453.15
    expect(c.ozet.borcTl).toBe('32265.75');
    expect(c.ozet.netTl).toBe('-1480.39');
    // 30000 − 8000 − 6453.15
    expect(c.ozet.aylikKalanTl).toBe('15546.85');
    expect(c.borclar[0]).toMatchObject({ odenenYuzde: 50, kalanAy: 5 });
  });
});

describe('addDebtPayment', () => {
  const istemci = (kalan: string) => {
    const update = vi.fn();
    const tx = {
      walletDebt: {
        findUnique: vi.fn().mockResolvedValue({ remainingAmount: decimal(kalan) }),
        update,
      },
      walletDebtPayment: { create: vi.fn() },
    };
    return { client: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as never, update };
  };

  it('ödeme kalanı düşürür', async () => {
    const { client, update } = istemci('1000.00');
    expect(
      await addDebtPayment(
        { debtId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-30', amount: '250.00' },
        client,
      ),
    ).toEqual({ remainingAmount: '750.00', isClosed: false });
    expect(update.mock.calls[0]?.[0].data).toEqual({ remainingAmount: '750.00', isClosed: false });
  });

  it('kalandan büyük ödeme sıfırlar ve borcu KAPATIR (eksi borç yok)', async () => {
    const { client } = istemci('100.00');
    expect(
      await addDebtPayment(
        { debtId: 'ckabcdefghijklmnopqrstuv', date: '2026-10-30', amount: '150.00' },
        client,
      ),
    ).toEqual({ remainingAmount: '0.00', isClosed: true });
  });
});

describe('tekil okumalar — Decimal sızmaz', () => {
  const hesap = {
    id: 'a',
    name: 'Ziraat',
    kind: 'BANK',
    unit: 'TRY',
    balance: decimal('10.00'),
    note: null,
    isArchived: false,
  };
  const borc = {
    id: 'd',
    name: 'Kredi',
    lender: null,
    unit: 'TRY',
    totalAmount: decimal('100.00'),
    remainingAmount: decimal('40.00'),
    monthlyPayment: decimal('10.00'),
    paymentDay: 1,
    endDate: null,
    note: null,
    isClosed: false,
  };
  const akis = {
    id: 'f',
    kind: 'INCOME',
    name: 'Maaş',
    counterparty: null,
    unit: 'TRY',
    amount: decimal('5.00'),
    frequency: 'MONTHLY',
    day: 1,
    date: null,
    category: null,
    note: null,
    isActive: true,
  };
  const client = {
    walletAccount: { findUnique: vi.fn().mockResolvedValue(hesap) },
    walletDebt: { findUnique: vi.fn().mockResolvedValue(borc) },
    walletFlow: { findUnique: vi.fn().mockResolvedValue(akis) },
  } as never;

  it('hesap, borç, akış', async () => {
    expect(decimalKalanlar(await fetchWalletAccountById('a', client))).toEqual([]);
    expect(decimalKalanlar(await fetchWalletDebtById('d', client))).toEqual([]);
    expect(decimalKalanlar(await fetchWalletFlowById('f', client))).toEqual([]);
  });
});

describe('tek seferlik kalemler — yalnızca KENDİ aylarında (2026-10-30)', () => {
  const kur: KurDurumu = { kurlar: {}, guncellendi: null, bayat: false };
  const akis = (
    id: string,
    kind: string,
    frequency: string,
    amount: string,
    date: Date | null,
  ) => ({
    id,
    kind,
    name: id,
    counterparty: null,
    unit: 'TRY',
    amount: decimal(amount),
    frequency,
    day: null,
    date,
    category: 'Market',
    note: null,
    isActive: true,
  });
  const istemci = () =>
    ({
      walletAccount: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebt: { findMany: vi.fn().mockResolvedValue([]) },
      walletFlow: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            akis('maas', 'INCOME', 'MONTHLY', '30000.00', null),
            akis('kira', 'EXPENSE', 'MONTHLY', '8000.00', null),
            akis('market', 'EXPENSE', 'ONCE', '450.50', new Date('2026-10-12T00:00:00Z')),
            akis('kahve', 'EXPENSE', 'ONCE', '90.00', new Date('2026-10-28T00:00:00Z')),
            akis('eski', 'EXPENSE', 'ONCE', '999.00', new Date('2026-09-30T00:00:00Z')),
            akis('ikramiye', 'INCOME', 'ONCE', '5000.00', new Date('2026-10-01T00:00:00Z')),
          ]),
      },
    }) as never;

  it('bu ayın tek seferlikleri hesaba girer, geçen ayınki girmez', async () => {
    const c = await fetchCuzdan(istemci(), '2026-10-30', kur);
    expect(c.ozet.aylikGelirTl).toBe('35000.00');
    // 8000 + 450.50 + 90 — eylül harcaması (999) yok
    expect(c.ozet.aylikGiderTl).toBe('8540.50');
    expect(c.giderler.map((g) => g.id)).toEqual(['kira']);
    // yeniden eskiye
    expect(c.harcamalar.map((h) => h.id)).toEqual(['kahve', 'market']);
    expect(c.gelirler.map((g) => g.id)).toEqual(['maas', 'ikramiye']);
  });
});

describe('butceOzeti — aylık bütçe (2026-10-31)', () => {
  const h = (category: string | null, aylikTl: string | null) => ({ category, aylikTl });

  it('kategori toplamı kuruşu kuruşuna, en çok harcanan önce', () => {
    const s = butceOzeti(
      [h('Market', '450.50'), h('Market', '0.10'), h('Yemek', '900.00')],
      [{ kategori: 'Market', limitTl: '1000.00' }],
    );
    expect(s.map((x) => x.kategori)).toEqual(['Yemek', 'Market']);
    expect(s[1]).toEqual({
      kategori: 'Market',
      harcananTl: '450.60',
      limitTl: '1000.00',
      yuzde: 45,
      kalanTl: '549.40',
    });
    expect(s[0]).toMatchObject({ limitTl: null, yuzde: null, kalanTl: null });
  });

  it('aşım eksi kalan; harcaması olmayan limit de görünür', () => {
    const s = butceOzeti(
      [h('Yemek', '1500.00')],
      [
        { kategori: 'Yemek', limitTl: '1000.00' },
        { kategori: 'Ulaşım', limitTl: '500.00' },
      ],
    );
    expect(s[0]).toMatchObject({ yuzde: 150, kalanTl: '-500.00' });
    expect(s[1]).toMatchObject({ kategori: 'Ulaşım', harcananTl: '0.00', yuzde: 0 });
  });

  it('⚠️ kuru bilinmeyen kalem toplama girmez; kategorisiz "Diğer"', () => {
    const s = butceOzeti([h('Market', null), h(null, '10.00')], []);
    expect(s).toEqual([
      { kategori: 'Diğer', harcananTl: '10.00', limitTl: null, yuzde: null, kalanTl: null },
    ]);
  });

  it('limit okuması Decimal sızdırmaz', async () => {
    const client = {
      walletButce: {
        findMany: vi.fn().mockResolvedValue([{ kategori: 'Market', limitTl: decimal('5000.00') }]),
      },
    } as never;
    const l = await fetchButceLimitleri(client);
    expect(decimalKalanlar(l)).toEqual([]);
    expect(l).toEqual([{ kategori: 'Market', limitTl: '5000.00' }]);
  });
});
