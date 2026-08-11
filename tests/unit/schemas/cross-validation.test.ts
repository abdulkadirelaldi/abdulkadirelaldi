import { describe, expect, it } from 'vitest';

import {
  createProjectSchema,
  updateExperienceSchema,
  updateGoalSchema,
  updateJobSchema,
  updatePostSchema,
  updateProjectSchema,
  updateRecurringTransactionSchema,
} from '@/lib/schemas';

/**
 * Çapraz kurallar GÜNCELLEME yolunda da işlemeli.
 *
 * Bu ayrı bir dosya çünkü en olası regresyon burada: `.partial()` uygulanınca
 * alanlar `undefined` olabilir ve dikkatsiz yazılmış bir refine ya sessizce
 * atlanır ya da geçerli kısmi güncellemeyi yanlışlıkla reddeder. İki yönü de
 * ayrı ayrı doğrulanıyor.
 */

const ID = 'clx0000000000000000000001';

describe('updateJobSchema — kur ve tarih', () => {
  it('yalnızca para birimi gönderilirse kural ATLANIR (kur bilinmiyor)', () => {
    expect(updateJobSchema.safeParse({ id: ID, currency: 'USD' }).success).toBe(true);
  });

  it('yalnızca kur gönderilirse kural ATLANIR (para birimi bilinmiyor)', () => {
    expect(updateJobSchema.safeParse({ id: ID, fxRate: '34.5' }).success).toBe(true);
  });

  it('ikisi birlikte tutarsızsa REDDEDİLİR', () => {
    expect(updateJobSchema.safeParse({ id: ID, currency: 'TRY', fxRate: '34.5' }).success).toBe(
      false,
    );
  });

  it('yalnızca teslim tarihi gönderilirse kural atlanır', () => {
    expect(updateJobSchema.safeParse({ id: ID, dueDate: '2026-01-01' }).success).toBe(true);
  });

  it('iki tarih birlikte ters ise reddedilir', () => {
    expect(
      updateJobSchema.safeParse({ id: ID, startDate: '2026-09-01', dueDate: '2026-08-01' }).success,
    ).toBe(false);
  });
});

describe('updateProjectSchema / updatePostSchema — SCHEDULED', () => {
  it('SCHEDULED + tarih yok → reddedilir', () => {
    expect(updateProjectSchema.safeParse({ id: ID, status: 'SCHEDULED' }).success).toBe(false);
    expect(updatePostSchema.safeParse({ id: ID, status: 'SCHEDULED' }).success).toBe(false);
  });

  it('SCHEDULED + tarih → geçerli', () => {
    const payload = { id: ID, status: 'SCHEDULED', publishedAt: '2026-12-01T09:00:00Z' };
    expect(updateProjectSchema.safeParse(payload).success).toBe(true);
    expect(updatePostSchema.safeParse(payload).success).toBe(true);
  });

  it('durum hiç gönderilmezse kural atlanır', () => {
    expect(updateProjectSchema.safeParse({ id: ID, title: 'Yeni' }).success).toBe(true);
    expect(updatePostSchema.safeParse({ id: ID, title: 'Yeni' }).success).toBe(true);
  });

  it('PUBLISHED tarih olmadan geçerli — yalnızca SCHEDULED tarih ister', () => {
    expect(updateProjectSchema.safeParse({ id: ID, status: 'PUBLISHED' }).success).toBe(true);
  });
});

describe('updateExperienceSchema — tarih ve "devam ediyor"', () => {
  it('yalnızca bitiş gönderilirse sıra kuralı atlanır', () => {
    expect(updateExperienceSchema.safeParse({ id: ID, endDate: '2026-01-01' }).success).toBe(true);
  });

  it('ters tarih aralığı reddedilir', () => {
    expect(
      updateExperienceSchema.safeParse({ id: ID, startDate: '2026-09-01', endDate: '2026-01-01' })
        .success,
    ).toBe(false);
  });

  it('current: true + bitiş tarihi reddedilir', () => {
    expect(
      updateExperienceSchema.safeParse({ id: ID, current: true, endDate: '2026-01-01' }).success,
    ).toBe(false);
  });

  it('current: true tek başına geçerli', () => {
    expect(updateExperienceSchema.safeParse({ id: ID, current: true }).success).toBe(true);
  });
});

describe('updateGoalSchema — ACHIEVED ↔ progress', () => {
  it('ACHIEVED + progress 40 reddedilir', () => {
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED', progress: 40 }).success).toBe(
      false,
    );
  });

  it('ACHIEVED + progress 100 geçerli', () => {
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED', progress: 100 }).success).toBe(
      true,
    );
  });

  it('ACHIEVED tek başına geçerli — progress dokunulmamış sayılır', () => {
    // Kısmi güncellemede `progress` gönderilmediyse mevcut değer korunur;
    // şema burada karar veremez, servis katmanı bütünlüğü sağlar.
    expect(updateGoalSchema.safeParse({ id: ID, status: 'ACHIEVED' }).success).toBe(true);
  });

  it('progress tek başına geçerli', () => {
    expect(updateGoalSchema.safeParse({ id: ID, progress: 55 }).success).toBe(true);
  });
});

describe('updateRecurringTransactionSchema — tarih sırası', () => {
  it('yalnızca bitiş gönderilirse atlanır', () => {
    expect(
      updateRecurringTransactionSchema.safeParse({ id: ID, endDate: '2026-01-01' }).success,
    ).toBe(true);
  });

  it('ters aralık reddedilir', () => {
    expect(
      updateRecurringTransactionSchema.safeParse({
        id: ID,
        startDate: '2026-09-01',
        endDate: '2026-01-01',
      }).success,
    ).toBe(false);
  });
});

describe('REGRESYON: kısmi güncelleme varsayılan ENJEKTE ETMEZ', () => {
  it('updateProjectSchema yalnızca gönderilen alanları döndürür', () => {
    // Düzeltmeden önce bu çıktı `status: 'DRAFT'`, `tags: []`, `featured: false`,
    // `order: 0`, `locale: 'tr'` içeriyordu. Prisma update'ine verilseydi sadece
    // başlık düzenlemek yayındaki projeyi taslağa düşürürdü.
    const parsed = updateProjectSchema.parse({ id: ID, title: 'Yalnızca başlık' });
    expect(parsed).toEqual({ id: ID, title: 'Yalnızca başlık' });
  });

  it('updateGoalSchema yalnızca gönderilen alanları döndürür', () => {
    const parsed = updateGoalSchema.parse({ id: ID, title: 'Yeni hedef' });
    expect(parsed).toEqual({ id: ID, title: 'Yeni hedef' });
  });

  it('updateJobSchema yalnızca gönderilen alanları döndürür', () => {
    const parsed = updateJobSchema.parse({ id: ID, title: 'Yeni iş' });
    expect(parsed).toEqual({ id: ID, title: 'Yeni iş' });
  });

  it('create şemalarında varsayılanlar HÂLÂ uygulanır', () => {
    const parsed = createProjectSchema.parse({
      slug: 'x',
      title: 'X',
      summary: 'S',
      content: 'C',
    });
    expect(parsed.status).toBe('DRAFT');
    expect(parsed.locale).toBe('tr');
    expect(parsed.tags).toEqual([]);
  });
});
