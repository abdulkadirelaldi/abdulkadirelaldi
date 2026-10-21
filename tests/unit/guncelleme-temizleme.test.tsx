import { describe, expect, it, vi } from 'vitest';

import { bosaltilanlariNullYap } from '@/components/panel/alan';
import {
  updateGoalSchema,
  updateHabitSchema,
  updateHealthLogSchema,
  updateJournalEntrySchema,
  updateServiceSchema,
  updateSkillSchema,
  updateWorkoutSchema,
  updateWorkoutSetSchema,
} from '@/lib/schemas';
import { updateHabit, type HabitClient } from '@/server/services/habit';
import { updateHealthLog, type HealthLogClient } from '@/server/services/health-log';
import { updateService, type ServiceClient } from '@/server/services/service';
import { updateSkill, type SkillClient } from '@/server/services/skill';

/**
 * GÜNCELLEMEDE "BOŞALT" — `null` = temizle, `undefined` = dokunma (T-031).
 *
 * F5 formları "dolu bir alanı boşaltmak değeri silmez" diye UYARI yazıyordu:
 * kısmi şema "temizle" diyemiyordu ve boşaltılan değer sessizce kalıyordu.
 * Üç halka ayrı ölçülüyor — biri kopsa zincir yine sessizce eski hâline döner.
 */

const ID = 'ckabcdefghijklmnopqrstuv';

describe('1 · form yardımcısı — niyet `null`a çevriliyor', () => {
  it('kayıtta DOLU, formda BOŞ → null', () => {
    expect(
      bosaltilanlariNullYap({ weightKg: undefined }, { weightKg: '82.50' }, ['weightKg']),
    ).toEqual({ weightKg: null });
  });

  it('⚠️ kayıtta ZATEN BOŞ → gönderilmiyor (denetim kaydı yalan söylemesin)', () => {
    expect(
      bosaltilanlariNullYap({ weightKg: undefined }, { weightKg: null }, ['weightKg']),
    ).toEqual({
      weightKg: undefined,
    });
  });

  it('dolu değer ve listede OLMAYAN alan aynen kalıyor', () => {
    expect(
      bosaltilanlariNullYap({ weightKg: '80', note: undefined }, { weightKg: '82', note: 'x' }, [
        'weightKg',
      ]),
    ).toEqual({ weightKg: '80', note: undefined });
  });
});

describe('2 · şemalar — temizlenebilir sütunlar null kabul ediyor', () => {
  it.each([
    ['HealthLog.weightKg', updateHealthLogSchema, { weightKg: null }],
    ['HealthLog.mood', updateHealthLogSchema, { mood: null }],
    ['Workout.durationMin', updateWorkoutSchema, { durationMin: null }],
    ['WorkoutSet.weightKg', updateWorkoutSetSchema, { weightKg: null }],
    ['Habit.targetPerDay', updateHabitSchema, { targetPerDay: null }],
    ['Habit.color', updateHabitSchema, { color: null }],
    ['Goal.targetDate', updateGoalSchema, { targetDate: null }],
    ['JournalEntry.mood', updateJournalEntrySchema, { mood: null }],
    ['Skill.iconKey', updateSkillSchema, { iconKey: null }],
    ['Service.iconKey', updateServiceSchema, { iconKey: null }],
    ['Service.ctaUrl', updateServiceSchema, { ctaUrl: null }],
  ] as const)('%s', (_ad, sema, alan) => {
    const sonuc = sema.safeParse({ id: ID, ...alan });
    expect(sonuc.success).toBe(true);
    if (sonuc.success) expect(sonuc.data).toMatchObject(alan);
  });

  it('⚠️ ZORUNLU sütun null KABUL ETMİYOR — temizlemek kaydı bozardı', () => {
    expect(updateHealthLogSchema.safeParse({ id: ID, date: null }).success).toBe(false);
    expect(updateHabitSchema.safeParse({ id: ID, name: null }).success).toBe(false);
    expect(updateGoalSchema.safeParse({ id: ID, title: null }).success).toBe(false);
    expect(updateSkillSchema.safeParse({ id: ID, name: null }).success).toBe(false);
    expect(updateSkillSchema.safeParse({ id: ID, level: null }).success).toBe(false);
    expect(updateServiceSchema.safeParse({ id: ID, description: null }).success).toBe(false);
  });

  it('`undefined` hâlâ "dokunma" — alan çıktıya GİRMİYOR', () => {
    const sonuc = updateHealthLogSchema.parse({ id: ID });
    expect(sonuc).not.toHaveProperty('weightKg');
  });
});

describe('3 · servisler — null veritabanına iniyor', () => {
  const satir = {
    id: 'hl_1',
    date: new Date('2026-10-14T00:00:00.000Z'),
    weightKg: null,
    bodyFatPct: null,
    sleepHours: null,
    waterMl: null,
    restingHr: null,
    steps: null,
    mood: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('HealthLog — null ölçü ve null not `update`e null olarak gidiyor', async () => {
    const update = vi.fn().mockResolvedValue(satir);
    const client = { healthLog: { update } } as unknown as HealthLogClient;
    await updateHealthLog(
      updateHealthLogSchema.parse({ id: ID, weightKg: null, note: null }),
      client,
    );
    expect(update.mock.calls[0]?.[0].data).toEqual({ weightKg: null, note: null });
  });

  it('Habit — null simge ÇÖKMÜYOR (eski `.trim()` null`da patlardı)', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'h_1',
      name: 'Su',
      targetPerWeek: 7,
      targetPerDay: null,
      color: null,
      icon: null,
      isActive: true,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const client = { habit: { update } } as unknown as HabitClient;
    await updateHabit(
      updateHabitSchema.parse({ id: ID, icon: null, targetPerDay: null, color: null }),
      client,
    );
    expect(update.mock.calls[0]?.[0].data).toEqual({ icon: null, targetPerDay: null, color: null });
  });

  it('Skill — boşaltılan simge anahtarı `update`e null olarak gidiyor', async () => {
    const update = vi.fn().mockResolvedValue({
      id: ID,
      locale: 'tr',
      name: 'Go',
      category: 'BACKEND',
      level: 60,
      iconKey: null,
      order: 0,
    });
    const client = { skill: { update } } as unknown as SkillClient;
    await updateSkill(updateSkillSchema.parse({ id: ID, iconKey: null }), client);
    expect(update.mock.calls[0]?.[0].data).toEqual({ iconKey: null });
  });

  it('Service — boşaltılan CTA null olur, public satır Kıyı Medya’ya döner', async () => {
    const update = vi.fn().mockResolvedValue({
      id: ID,
      locale: 'tr',
      title: 'Web',
      description: 'Açıklama',
      iconKey: null,
      ctaUrl: null,
      order: 0,
    });
    const client = { service: { update } } as unknown as ServiceClient;
    await updateService(updateServiceSchema.parse({ id: ID, ctaUrl: null }), client);
    // `HizmetListesi` `ctaUrl ?? kiyiMedyaUrl` okuyor — `null` varsayılana düşürür.
    expect(update.mock.calls[0]?.[0].data).toEqual({ ctaUrl: null });
  });
});
