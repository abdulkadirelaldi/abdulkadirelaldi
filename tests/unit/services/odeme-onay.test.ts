import { describe, expect, it, vi } from 'vitest';

import { planla } from '@/server/services/bildirim';
import {
  bekleyenleriSec,
  fetchBekleyenOdemeler,
  odemeIsle,
  OdemeHatasi,
} from '@/server/services/odeme-onay';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

const CID = 'ckabcdefghijklmnopqrstuv';
const k = (gun: number, kaynakId = 'b1') => ({
  kaynakTur: 'BORC' as const,
  kaynakId,
  ad: 'Kredi',
  tutar: '1000.00',
  unit: 'TRY' as const,
  gun,
});

describe('bekleyenleriSec (2026-11-01)', () => {
  const bugun = '2026-10-30';

  it('bu ay geciken ve ay geçişi; en acil önce', () => {
    const s = bekleyenleriSec([k(25, 'gecikti'), k(29, 'dun')], new Set(), bugun);
    expect(s.map((x) => [x.kaynakId, x.donem, x.kala])).toEqual([
      ['gecikti', '2026-10', -5],
      ['dun', '2026-10', -1],
    ]);
  });

  it('⚠️ işlenmiş dönem listelenmez, gelecek ayınki ayrı', () => {
    const s = bekleyenleriSec([k(1)], new Set(['BORC:b1:2026-10']), bugun);
    expect(s).toEqual([expect.objectContaining({ donem: '2026-11', kala: 2 })]);
  });

  it("31'i kısa ayda son güne düşer", () => {
    const s = bekleyenleriSec([k(31)], new Set(), '2027-02-27');
    expect(s[0]).toMatchObject({ donem: '2027-02', kala: 1 });
  });

  it('eklenmeden önceki vade gecikmiş sayılmaz', () => {
    expect(bekleyenleriSec([{ ...k(1), olusturma: '2026-10-29' }], new Set(), bugun)).toEqual([
      expect.objectContaining({ donem: '2026-11' }),
    ]);
  });

  it('pencere dışı listelenmez', () => {
    expect(bekleyenleriSec([k(20)], new Set(), '2026-10-05')).toEqual([]);
  });
});

function sahte(s: { borc?: unknown; hesap?: unknown; cakisma?: boolean } = {}) {
  const tx = {
    walletDebt: {
      findUnique: vi
        .fn()
        .mockImplementation(({ select }) =>
          Promise.resolve(
            select.remainingAmount
              ? { remainingAmount: decimal('5000.00') }
              : (s.borc ?? { unit: 'TRY', monthlyPayment: decimal('1000.00') }),
          ),
        ),
      update: vi.fn(),
    },
    walletFlow: { findUnique: vi.fn() },
    walletDebtPayment: { create: vi.fn() },
    walletAccount: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          s.hesap ?? { unit: 'TRY', balance: decimal('3000.00'), isArchived: false },
        ),
      update: vi.fn(),
    },
    walletOdeme: {
      create: s.cakisma
        ? vi.fn().mockRejectedValue(Object.assign(new Error('x'), { code: 'P2002' }))
        : vi.fn(),
    },
  };
  return { tx, client: { $transaction: (f: (t: typeof tx) => unknown) => f(tx) } as never };
}
const girdi = {
  kaynakTur: 'BORC' as const,
  kaynakId: CID,
  donem: '2026-10',
  durum: 'ODENDI' as const,
  hesapId: CID,
};

describe('odemeIsle', () => {
  it('ödendi: hesaptan ve borçtan KAYNAĞIN tutarı düşer', async () => {
    const { tx, client } = sahte();
    expect(await odemeIsle(girdi, client, '2026-10-30')).toEqual({ yeni: true });
    expect(tx.walletAccount.update.mock.calls[0]?.[0].data).toEqual({ balance: '2000.00' });
    expect(tx.walletDebt.update.mock.calls[0]?.[0].data).toEqual({
      remainingAmount: '4000.00',
      isClosed: false,
    });
  });

  it('⚠️ ikinci dokunuş (P2002) hiçbir şeyi düşmez', async () => {
    const { tx, client } = sahte({ cakisma: true });
    expect(await odemeIsle(girdi, client, '2026-10-30')).toEqual({ yeni: false });
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).not.toHaveBeenCalled();
  });

  it('⚠️ yetersiz bakiye ve farklı birim reddedilir', async () => {
    const az = sahte({ hesap: { unit: 'TRY', balance: decimal('500.00'), isArchived: false } });
    await expect(odemeIsle(girdi, az.client, '2026-10-30')).rejects.toBeInstanceOf(OdemeHatasi);
    expect(az.tx.walletDebt.update).not.toHaveBeenCalled();
    const birim = sahte({ hesap: { unit: 'USD', balance: decimal('9000.00'), isArchived: false } });
    await expect(odemeIsle(girdi, birim.client, '2026-10-30')).rejects.toBeInstanceOf(OdemeHatasi);
  });

  it('atla: yalnızca kayıt, para hareketi yok', async () => {
    const { tx, client } = sahte();
    await odemeIsle({ ...girdi, durum: 'ATLANDI' }, client, '2026-10-30');
    expect(tx.walletOdeme.create).toHaveBeenCalled();
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).not.toHaveBeenCalled();
  });

  it('hesapsız ödendi: borç düşer, hesap dokunulmaz', async () => {
    const { tx, client } = sahte();
    await odemeIsle({ ...girdi, hesapId: undefined }, client, '2026-10-30');
    expect(tx.walletAccount.update).not.toHaveBeenCalled();
    expect(tx.walletDebt.update).toHaveBeenCalled();
  });
});

describe('fetchBekleyenOdemeler', () => {
  it('Decimal sızmaz; elle girilen ödeme de o ayı kapatır', async () => {
    const client = {
      walletDebt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'a',
            name: 'A',
            unit: 'TRY',
            monthlyPayment: decimal('10.00'),
            paymentDay: 30,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
          {
            id: 'b',
            name: 'B',
            unit: 'TRY',
            monthlyPayment: decimal('20.00'),
            paymentDay: 30,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      walletFlow: { findMany: vi.fn().mockResolvedValue([]) },
      walletOdeme: { findMany: vi.fn().mockResolvedValue([]) },
      walletDebtPayment: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ debtId: 'a', date: new Date('2026-10-12T00:00:00Z') }]),
      },
    } as never;
    const s = await fetchBekleyenOdemeler(client, '2026-10-30');
    expect(decimalKalanlar(s)).toEqual([]);
    expect(s.filter((x) => x.donem === '2026-10').map((x) => x.kaynakId)).toEqual(['b']);
  });
});

describe('bildirim: ödenmiş taksit hatırlatılmaz', () => {
  it('odenen kümesi', () => {
    const temel = {
      gun: '2026-10-30',
      saat: 10,
      tercih: { borc: true, aliskanlik: false, su: false },
      borclar: [{ id: 'b', ad: 'K', odemeGunu: 30, tutar: null }],
      kalanAliskanliklar: [],
      suMl: null,
    };
    expect(planla(temel)).toHaveLength(1);
    expect(planla({ ...temel, odenen: new Set(['b:2026-10']) })).toEqual([]);
  });
});
