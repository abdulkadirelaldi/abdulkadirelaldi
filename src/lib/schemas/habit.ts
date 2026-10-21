import * as z from 'zod';

import {
  booleanFilterSchema,
  cuidSchema,
  paginationSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/**
 * `Habit` (ADR-021).
 * `targetPerWeek` = haftada kaç GÜN, `targetPerDay` = gün içinde kaç KEZ
 * (örn. 8 bardak su). Referans veri: silinmez, arşivlenir (ADR-017).
 */
const habitBase = z.object({
  name: shortTextSchema.min(1, { error: 'Alışkanlık adı zorunludur.' }),
  targetPerWeek: z
    .number()
    .int()
    .min(1, { error: 'Haftalık hedef en az 1 gün olmalıdır.' })
    .max(7, { error: 'Haftalık hedef en fazla 7 gün olabilir.' })
    .default(7),
  targetPerDay: z
    .number()
    .int()
    .min(1, { error: 'Günlük hedef en az 1 olmalıdır.' })
    .max(100, { error: 'Günlük hedef geçersiz.' })
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Renk #RRGGBB biçiminde olmalıdır.' })
    .optional(),
  icon: shortTextSchema.optional(),
  isActive: z.boolean().default(true),
});

export const createHabitSchema = habitBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031
 * kuralı). `partialWithoutDefaults` alanı yalnızca VERİLMEYEBİLİR yapıyordu;
 * veritabanında boş olabilen bir sütunu temizlemenin yolu YOKTU ve dolu bir
 * alanı formda boşaltmak eski değeri sessizce koruyordu (F5 formları bunu
 * ekranda uyarı olarak yazıyordu). Kural taban şemadan türetiliyor — tek yer.
 */
export const updateHabitSchema = partialWithoutDefaults(habitBase).extend({
  id: cuidSchema,
  targetPerDay: habitBase.shape.targetPerDay.nullable(),
  color: habitBase.shape.color.nullable(),
  icon: habitBase.shape.icon.nullable(),
});

export const archiveHabitSchema = z.object({
  id: cuidSchema,
  isArchived: z.boolean(),
});

export const habitFilterSchema = paginationSchema.extend({
  isActive: booleanFilterSchema.optional(),
  isArchived: booleanFilterSchema.optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type ArchiveHabitInput = z.infer<typeof archiveHabitSchema>;
export type HabitFilterInput = z.infer<typeof habitFilterSchema>;
