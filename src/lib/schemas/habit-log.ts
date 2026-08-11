import * as z from 'zod';

import { cuidSchema, dayDateSchema, paginationSchema, partialWithoutDefaults } from './common';

/**
 * `HabitLog` (ADR-021).
 *
 * `done Boolean` YOKTUR — yerine `count`. "Yapıldı" artık `count > 0` demektir;
 * böylece günde birden çok kez yapılan alışkanlıklar (su, kitap) modellenebilir.
 * `@@unique([habitId, date])` aynı güne çift kaydı engeller — ilk taslakta bu
 * kısıt eksikti.
 */
const habitLogBase = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
  count: z
    .number()
    .int({ error: 'Sayı tam sayı olmalıdır.' })
    .min(0, { error: 'Sayı negatif olamaz.' })
    .max(100, { error: 'Sayı geçersiz.' })
    .default(1),
});

export const createHabitLogSchema = habitLogBase;
export const updateHabitLogSchema = partialWithoutDefaults(habitLogBase).extend({ id: cuidSchema });

/** Panelde en sık kullanılan eylem: bir günü işaretle / sayacı artır. */
export const toggleHabitLogSchema = z.object({
  habitId: cuidSchema,
  date: dayDateSchema,
});

export const habitLogFilterSchema = paginationSchema.extend({
  habitId: cuidSchema.optional(),
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateHabitLogInput = z.infer<typeof createHabitLogSchema>;
export type UpdateHabitLogInput = z.infer<typeof updateHabitLogSchema>;
export type ToggleHabitLogInput = z.infer<typeof toggleHabitLogSchema>;
export type HabitLogFilterInput = z.infer<typeof habitLogFilterSchema>;
