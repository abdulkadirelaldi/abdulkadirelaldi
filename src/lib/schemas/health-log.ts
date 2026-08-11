import * as z from 'zod';

import {
  cuidSchema,
  dayDateSchema,
  decimalSchema,
  mediumTextSchema,
  moodSchema,
  paginationSchema,
  partialWithoutDefaults,
} from './common';

/**
 * `HealthLog` — günlük ölçüm (§4.2 /panel/saglik).
 * `date` günde TEK kayıt (@unique) ve `@db.Date` (ADR-016).
 */
const healthLogBase = z.object({
  date: dayDateSchema,
  weightKg: decimalSchema(3, 2).optional(),
  bodyFatPct: decimalSchema(3, 1).optional(),
  sleepHours: decimalSchema(2, 2).optional(),
  waterMl: z.number().int().min(0).max(20000, { error: 'Su miktarı geçersiz.' }).optional(),
  restingHr: z.number().int().min(20).max(250, { error: 'Nabız geçersiz.' }).optional(),
  steps: z.number().int().min(0).max(200000, { error: 'Adım sayısı geçersiz.' }).optional(),
  mood: moodSchema.optional(),
  note: mediumTextSchema.optional(),
});

export const createHealthLogSchema = healthLogBase;
export const updateHealthLogSchema = partialWithoutDefaults(healthLogBase).extend({
  id: cuidSchema,
});

export const healthLogFilterSchema = paginationSchema.extend({
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateHealthLogInput = z.infer<typeof createHealthLogSchema>;
export type UpdateHealthLogInput = z.infer<typeof updateHealthLogSchema>;
export type HealthLogFilterInput = z.infer<typeof healthLogFilterSchema>;
