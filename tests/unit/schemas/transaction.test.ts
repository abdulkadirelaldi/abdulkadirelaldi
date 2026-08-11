import { describe, expect, it } from 'vitest';

import {
  createGeneratedTransactionSchema,
  createTransactionSchema,
  transactionFilterSchema,
  updateTransactionSchema,
} from '@/lib/schemas';

const valid = {
  type: 'INCOME',
  amount: '1250.00',
  currency: 'TRY',
  fxRate: '1',
  date: '2026-08-05',
  categoryId: 'clx0000000000000000000001',
};

describe('createTransactionSchema', () => {
  it('geçerli TRY işlemi kabul eder', () => {
    expect(createTransactionSchema.safeParse(valid).success).toBe(true);
  });

  it('geçersiz: kategori olmadan kabul etmez', () => {
    const { categoryId: _omit, ...withoutCategory } = valid;
    expect(createTransactionSchema.safeParse(withoutCategory).success).toBe(false);
  });

  it('saat içeren tarihi reddeder (ADR-016)', () => {
    expect(
      createTransactionSchema.safeParse({ ...valid, date: '2026-08-05T12:00:00Z' }).success,
    ).toBe(false);
  });

  it('baseAmount İSTEMCİDEN ALINMAZ — gönderilse bile çıktıya girmez', () => {
    // Sunucu bunu amount × fxRate ile hesaplar. İstemciden gelen toplam
    // kabul edilseydi tarayıcı konsolundan gelir tablosu değiştirilebilirdi.
    const parsed = createTransactionSchema.parse({ ...valid, baseAmount: '999999.00' });
    expect(parsed).not.toHaveProperty('baseAmount');
  });

  it('varsayılanları uygular', () => {
    const parsed = createTransactionSchema.parse({
      type: 'EXPENSE',
      amount: '10.00',
      date: '2026-08-05',
      categoryId: 'clx0000000000000000000001',
    });
    expect(parsed.currency).toBe('TRY');
    expect(parsed.fxRate).toBe('1');
    expect(parsed.method).toBe('BANK_TRANSFER');
    expect(parsed.isPaid).toBe(true);
  });
});

describe('ÇAPRAZ DOĞRULAMA — currency ↔ fxRate (ADR-014)', () => {
  it('TRY + kur 1.0 → geçerli', () => {
    expect(
      createTransactionSchema.safeParse({ ...valid, currency: 'TRY', fxRate: '1' }).success,
    ).toBe(true);
  });

  it('TRY + kur ≠ 1.0 → GEÇERSİZ (baseAmount sessizce bozulurdu)', () => {
    const result = createTransactionSchema.safeParse({
      ...valid,
      currency: 'TRY',
      fxRate: '34.50',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['fxRate']);
    }
  });

  it('USD + kur ≠ 1.0 → geçerli', () => {
    expect(
      createTransactionSchema.safeParse({ ...valid, currency: 'USD', fxRate: '34.12345678' })
        .success,
    ).toBe(true);
  });

  it('USD + kur 1.0 → GEÇERSİZ (yabancı para TRY sanılırdı)', () => {
    const result = createTransactionSchema.safeParse({ ...valid, currency: 'USD', fxRate: '1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Kur');
    }
  });

  it('EUR + kur 1.00000000 → GEÇERSİZ (yazım farkı kuralı atlatamaz)', () => {
    expect(
      createTransactionSchema.safeParse({ ...valid, currency: 'EUR', fxRate: '1.00000000' })
        .success,
    ).toBe(false);
  });
});

describe('updateTransactionSchema', () => {
  it('kısmi güncelleme kabul eder', () => {
    expect(
      updateTransactionSchema.safeParse({
        id: 'clx0000000000000000000001',
        description: 'düzeltme',
      }).success,
    ).toBe(true);
  });

  it('id olmadan reddeder', () => {
    expect(updateTransactionSchema.safeParse({ description: 'x' }).success).toBe(false);
  });

  it('kısmi güncellemede de çapraz kural işler', () => {
    expect(
      updateTransactionSchema.safeParse({
        id: 'clx0000000000000000000001',
        currency: 'USD',
        fxRate: '1',
      }).success,
    ).toBe(false);
  });
});

describe('createGeneratedTransactionSchema — ADR-015', () => {
  it('sourceRecurringId + periodKey ile geçerli', () => {
    expect(
      createGeneratedTransactionSchema.safeParse({
        ...valid,
        sourceRecurringId: 'clx0000000000000000000002',
        periodKey: '2026-08',
      }).success,
    ).toBe(true);
  });

  it('geçersiz periodKey reddeder', () => {
    expect(
      createGeneratedTransactionSchema.safeParse({
        ...valid,
        sourceRecurringId: 'clx0000000000000000000002',
        periodKey: '2026-8',
      }).success,
    ).toBe(false);
  });
});

describe('transactionFilterSchema', () => {
  it('URL parametrelerini çözer', () => {
    const parsed = transactionFilterSchema.parse({ page: '2', type: 'INCOME', isPaid: 'true' });
    expect(parsed.page).toBe(2);
    expect(parsed.type).toBe('INCOME');
  });

  it('geçersiz enum reddeder', () => {
    expect(transactionFilterSchema.safeParse({ type: 'GELIR' }).success).toBe(false);
  });
});
