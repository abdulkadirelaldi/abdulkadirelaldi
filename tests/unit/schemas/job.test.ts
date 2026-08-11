import { describe, expect, it } from 'vitest';

import {
  changeJobStatusSchema,
  convertMessageToJobSchema,
  createJobSchema,
  jobFilterSchema,
  updateJobSchema,
} from '@/lib/schemas';

const valid = { title: 'Kurumsal site yenileme' };

describe('createJobSchema', () => {
  it('geçerli iş kabul eder ve varsayılanları uygular', () => {
    const parsed = createJobSchema.parse(valid);
    expect(parsed.status).toBe('LEAD');
    expect(parsed.currency).toBe('TRY');
  });

  it('başlıksız reddeder', () => {
    expect(createJobSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('çapraz kural: USD + kur 1.0 reddedilir', () => {
    expect(createJobSchema.safeParse({ ...valid, currency: 'USD', fxRate: '1' }).success).toBe(
      false,
    );
  });

  it('teslim tarihi başlangıçtan önce olamaz', () => {
    const result = createJobSchema.safeParse({
      ...valid,
      startDate: '2026-09-01',
      dueDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['dueDate']);
    }
  });

  it('paidAmount / remainingAmount kabul etmez — türetilmiş veri (ADR-014)', () => {
    const parsed = createJobSchema.parse({ ...valid, paidAmount: '500', remainingAmount: '500' });
    expect(parsed).not.toHaveProperty('paidAmount');
    expect(parsed).not.toHaveProperty('remainingAmount');
  });
});

describe('updateJobSchema', () => {
  it('id ile kısmi güncelleme', () => {
    expect(
      updateJobSchema.safeParse({ id: 'clx0000000000000000000001', status: 'ACTIVE' }).success,
    ).toBe(true);
  });

  it('geçersiz durum reddeder', () => {
    expect(
      updateJobSchema.safeParse({ id: 'clx0000000000000000000001', status: 'BEKLEMEDE' }).success,
    ).toBe(false);
  });
});

describe('changeJobStatusSchema — kanban sürükleme', () => {
  it('beş kolonun tamamını kabul eder (ADR-017)', () => {
    for (const status of ['LEAD', 'PROPOSAL', 'ACTIVE', 'DELIVERED', 'CANCELLED']) {
      expect(
        changeJobStatusSchema.safeParse({ id: 'clx0000000000000000000001', status }).success,
        status,
      ).toBe(true);
    }
  });

  it('bilinmeyen kolon reddeder', () => {
    expect(
      changeJobStatusSchema.safeParse({ id: 'clx0000000000000000000001', status: 'ARCHIVED' })
        .success,
    ).toBe(false);
  });
});

describe('convertMessageToJobSchema', () => {
  it('mesajdan iş dönüşümü', () => {
    expect(
      convertMessageToJobSchema.safeParse({
        contactMessageId: 'clx0000000000000000000001',
        title: 'Yeni iş',
      }).success,
    ).toBe(true);
  });

  it('başlık zorunlu', () => {
    expect(
      convertMessageToJobSchema.safeParse({ contactMessageId: 'clx0000000000000000000001' })
        .success,
    ).toBe(false);
  });
});

describe('jobFilterSchema', () => {
  it('durum filtresi', () => {
    expect(jobFilterSchema.parse({ status: 'ACTIVE' }).status).toBe('ACTIVE');
  });

  it('geçersiz durum reddeder', () => {
    expect(jobFilterSchema.safeParse({ status: 'X' }).success).toBe(false);
  });
});
