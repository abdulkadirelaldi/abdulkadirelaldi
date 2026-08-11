import { describe, expect, it, vi } from 'vitest';

import {
  recalculatePersonalRecords,
  selectPersonalRecords,
  type PersonalRecordClient,
  type SetSnapshot,
} from '@/server/services/_shared';

const set = (
  id: string,
  reps: number,
  weightKg: string | null,
  day = '2026-08-01',
): SetSnapshot => ({ id, reps, weightKg, day });

describe('selectPersonalRecords — ADR-021 tekrar bazında', () => {
  it('her tekrar sayısı için AYRI rekor tutar', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '90.00'),
      set('s2', 8, '80.00'),
      set('s3', 1, '110.00'),
    ]);
    expect(records.map((r) => r.reps)).toEqual([1, 5, 8]);
  });

  it('aynı tekrarda en AĞIR seti seçer', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '80.00'),
      set('s2', 5, '90.00'),
      set('s3', 5, '85.00'),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.weightKg).toBe('90.00');
    expect(records[0]?.workoutSetId).toBe('s2');
  });

  it('TAHMİNİ 1RM kullanmaz — 80×10, 100×1’i geçmez', () => {
    // Epley ile 80×10 ≈ 106 kg 1RM olurdu ve 1RM rekorunu ezerdi.
    const records = selectPersonalRecords([set('s1', 1, '100.00'), set('s2', 10, '80.00')]);
    expect(records.find((r) => r.reps === 1)?.weightKg).toBe('100.00');
    expect(records.find((r) => r.reps === 10)?.weightKg).toBe('80.00');
  });

  it('eşit ağırlıkta ÖNCEKİ gün kazanır (rekor ne zaman kırıldı)', () => {
    const records = selectPersonalRecords([
      set('s1', 5, '90.00', '2026-08-05'),
      set('s2', 5, '90.00', '2026-07-01'),
    ]);
    expect(records[0]?.day).toBe('2026-07-01');
    expect(records[0]?.workoutSetId).toBe('s2');
  });

  it('ağırlıksız setler (vücut ağırlığı) rekora girmez', () => {
    expect(selectPersonalRecords([set('s1', 12, null)])).toEqual([]);
  });

  it('ondalık karşılaştırma kayan noktasız — 100.10 > 100.09', () => {
    const records = selectPersonalRecords([set('s1', 3, '100.09'), set('s2', 3, '100.10')]);
    expect(records[0]?.weightKg).toBe('100.10');
  });

  it('boş set listesi boş rekor', () => {
    expect(selectPersonalRecords([])).toEqual([]);
  });
});

/* ------------------------------------------------------------------------ */

interface Harness {
  client: PersonalRecordClient;
  upsert: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
}

function harness(
  sets: Array<{ id: string; reps: number; weightKg: string | null; date: string }>,
  existingReps: number[],
): Harness {
  const upsert = vi.fn().mockResolvedValue({});
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  return {
    upsert,
    deleteMany,
    client: {
      workoutSet: {
        findMany: vi.fn().mockResolvedValue(
          sets.map((s) => ({
            id: s.id,
            reps: s.reps,
            weightKg: s.weightKg,
            workout: { date: new Date(`${s.date}T00:00:00.000Z`) },
          })),
        ),
      },
      personalRecord: {
        findMany: vi
          .fn()
          .mockResolvedValue(existingReps.map((reps, i) => ({ id: `pr${i}`, reps }))),
        upsert,
        deleteMany,
      },
    } as PersonalRecordClient,
  };
}

const passthrough = (value: unknown): string | null => (value as string | null) ?? null;

describe('recalculatePersonalRecords — üç senaryo (ADR-021)', () => {
  it('EKLEME: yeni set rekor üretir', async () => {
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(result).toEqual({ upserted: 1, removed: 0 });
    expect(h.upsert).toHaveBeenCalledTimes(1);
    expect(h.upsert.mock.calls[0]?.[0].create.weightKg).toBe('90.00');
  });

  it('DÜZELTME: yanlış girilen ağırlık düzeltilince rekor DÜŞER', async () => {
    // Tek yönlü "daha ağırsa güncelle" mantığı bunu kaçırırdı: 120 kg yanlış
    // girilmiş, 90'a düzeltiliyor — rekor 120'de kalırsa veri tutarsızlaşır.
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], [5]);
    await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.upsert.mock.calls[0]?.[0].update.weightKg).toBe('90.00');
    expect(h.deleteMany).not.toHaveBeenCalled();
  });

  it('SİLME: son 5 tekrarlık set silinince 5RM rekoru KALDIRILIR', async () => {
    // ADR-021'in "F5'in en olası sessiz hatası" dediği durum.
    const h = harness([{ id: 's2', reps: 8, weightKg: '80.00', date: '2026-08-04' }], [5, 8]);
    h.deleteMany.mockResolvedValue({ count: 1 });

    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.deleteMany).toHaveBeenCalledWith({ where: { exerciseId: 'ex1', reps: { in: [5] } } });
    expect(result.removed).toBe(1);
  });

  it('TÜM setler silinince tüm rekorlar kaldırılır', async () => {
    const h = harness([], [1, 5, 8]);
    h.deleteMany.mockResolvedValue({ count: 3 });

    const result = await recalculatePersonalRecords('ex1', h.client, passthrough);

    expect(h.deleteMany).toHaveBeenCalledWith({
      where: { exerciseId: 'ex1', reps: { in: [1, 5, 8] } },
    });
    expect(result).toEqual({ upserted: 0, removed: 3 });
    expect(h.upsert).not.toHaveBeenCalled();
  });

  it('değişmeyen rekorlar silinmez', async () => {
    const h = harness(
      [
        { id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' },
        { id: 's2', reps: 8, weightKg: '80.00', date: '2026-08-04' },
      ],
      [5, 8],
    );
    await recalculatePersonalRecords('ex1', h.client, passthrough);
    expect(h.deleteMany).not.toHaveBeenCalled();
    expect(h.upsert).toHaveBeenCalledTimes(2);
  });

  it('Decimal dönüştürücüsü çağrılır — ham Decimal geçmez', async () => {
    const h = harness([{ id: 's1', reps: 5, weightKg: '90.00', date: '2026-08-04' }], []);
    const converter = vi.fn().mockReturnValue('90.00');
    await recalculatePersonalRecords('ex1', h.client, converter);
    expect(converter).toHaveBeenCalled();
  });
});
