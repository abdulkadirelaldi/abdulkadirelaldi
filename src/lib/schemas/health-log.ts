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
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateHealthLogSchema = partialWithoutDefaults(healthLogBase).extend({
  id: cuidSchema,
  weightKg: healthLogBase.shape.weightKg.nullable(),
  bodyFatPct: healthLogBase.shape.bodyFatPct.nullable(),
  sleepHours: healthLogBase.shape.sleepHours.nullable(),
  waterMl: healthLogBase.shape.waterMl.nullable(),
  restingHr: healthLogBase.shape.restingHr.nullable(),
  steps: healthLogBase.shape.steps.nullable(),
  mood: healthLogBase.shape.mood.nullable(),
  note: healthLogBase.shape.note.nullable(),
});

export const healthLogFilterSchema = paginationSchema.extend({
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
});

export type CreateHealthLogInput = z.infer<typeof createHealthLogSchema>;
export type UpdateHealthLogInput = z.infer<typeof updateHealthLogSchema>;
export type HealthLogFilterInput = z.infer<typeof healthLogFilterSchema>;
