import { describe, expect, it } from 'vitest';

import {
  archiveClientSchema,
  archiveTransactionCategorySchema,
  clientFilterSchema,
  createClientSchema,
  createRecurringTransactionSchema,
  createTransactionCategorySchema,
  recurringTransactionFilterSchema,
  transactionCategoryFilterSchema,
  updateClientSchema,
  updateRecurringTransactionSchema,
  updateTransactionCategorySchema,
} from '@/lib/schemas';

const ID = 'clx0000000000000000000001';

describe('Client — ADR-017', () => {
  it('geçerli müşteri, e-posta normalize edilir', () => {
    const parsed = createClientSchema.parse({ name: 'Ayşe Yılmaz', email: 'Ayse@Example.com' });
    expect(parsed.email).toBe('ayse@example.com');
  });

  it('adsız reddeder', () => {
    expect(createClientSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('geçersiz telefon reddeder', () => {
    expect(createClientSchema.safeParse({ name: 'A', phone: 'beş yüz' }).success).toBe(false);
  });

  it('kısmi güncelleme', () => {
    expect(updateClientSchema.safeParse({ id: ID, company: 'Kıyı Medya' }).success).toBe(true);
  });

  it('arşivleme şeması — silme yerine bu kullanılır', () => {
    expect(archiveClientSchema.safeParse({ id: ID, isArchived: true }).success).toBe(true);
    expect(archiveClientSchema.safeParse({ id: ID }).success).toBe(false);
  });

  it('filtre boolean parametreyi çözer', () => {
    expect(clientFilterSchema.parse({ isArchived: 'true' }).isArchived).toBe(true);
  });
});

describe('TransactionCategory — ADR-017', () => {
  const valid = { name: 'Danışmanlık', type: 'INCOME' };

  it('geçerli kategori', () => {
    expect(createTransactionCategorySchema.safeParse(valid).success).toBe(true);
  });

  it('geçersiz tür reddeder', () => {
    expect(createTransactionCategorySchema.safeParse({ ...valid, type: 'GELIR' }).success).toBe(
      false,
    );
  });

  it('geçersiz renk biçimi reddeder', () => {
    expect(createTransactionCategorySchema.safeParse({ ...valid, color: 'mavi' }).success).toBe(
      false,
    );
    expect(createTransactionCategorySchema.safeParse({ ...valid, color: '#1c6aff' }).success).toBe(
      true,
    );
  });

  it('kısmi güncelleme ve arşivleme', () => {
    expect(updateTransactionCategorySchema.safeParse({ id: ID, name: 'Yeni ad' }).success).toBe(
      true,
    );
    expect(archiveTransactionCategorySchema.safeParse({ id: ID, isArchived: true }).success).toBe(
      true,
    );
  });

  it('filtre', () => {
    expect(transactionCategoryFilterSchema.safeParse({ type: 'EXPENSE' }).success).toBe(true);
  });
});

describe('RecurringTransaction — ADR-015', () => {
  const valid = {
    type: 'EXPENSE',
    amount: '4500.00',
    categoryId: ID,
    recurrenceRule: 'MONTHLY',
    startDate: '2026-01-01',
  };

  it('geçerli şablon, varsayılanlar uygulanır', () => {
    const parsed = createRecurringTransactionSchema.parse(valid);
    expect(parsed.isActive).toBe(true);
    expect(parsed.currency).toBe('TRY');
  });

  it('fxRate / baseAmount TAŞIMAZ — kur üretim anına aittir', () => {
    const parsed = createRecurringTransactionSchema.parse({
      ...valid,
      fxRate: '34.5',
      baseAmount: '1',
    });
    expect(parsed).not.toHaveProperty('fxRate');
    expect(parsed).not.toHaveProperty('baseAmount');
  });

  it('nextRunAt / lastGeneratedAt istemciden alınmaz', () => {
    const parsed = createRecurringTransactionSchema.parse({
      ...valid,
      nextRunAt: '2026-09-01T00:00:00Z',
      lastGeneratedAt: '2026-08-01T00:00:00Z',
    });
    expect(parsed).not.toHaveProperty('nextRunAt');
    expect(parsed).not.toHaveProperty('lastGeneratedAt');
  });

  it('geçersiz tekrar sıklığı reddeder', () => {
    expect(
      createRecurringTransactionSchema.safeParse({ ...valid, recurrenceRule: 'AYLIK' }).success,
    ).toBe(false);
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    const r = createRecurringTransactionSchema.safeParse({ ...valid, endDate: '2025-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['endDate']);
  });

  it('kısmi güncelleme ve filtre', () => {
    expect(updateRecurringTransactionSchema.safeParse({ id: ID, isActive: false }).success).toBe(
      true,
    );
    expect(recurringTransactionFilterSchema.parse({ isActive: 'true' }).isActive).toBe(true);
  });
});
