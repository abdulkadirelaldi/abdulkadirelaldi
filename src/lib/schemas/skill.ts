import * as z from 'zod';

import { SkillCategory } from '@/types';

import {
  cuidSchema,
  localeSchema,
  orderSchema,
  paginationSchema,
  partialWithoutDefaults,
  percentSchema,
  shortTextSchema,
} from './common';

/** `Skill` — §6, yetenek kartları. `level` 0–100 (ADR-020). */
const skillBase = z.object({
  locale: localeSchema,
  name: shortTextSchema.min(1, { error: 'Yetenek adı zorunludur.' }),
  category: z.enum(SkillCategory, { error: 'Geçersiz yetenek kategorisi.' }),
  level: percentSchema,
  iconKey: shortTextSchema.optional(),
  order: orderSchema,
});

export const createSkillSchema = skillBase;
/*
 * TEMİZLENEBİLİR ALAN — `null` = "boşalt", `undefined` = "dokunma" (T-031).
 * `iconKey` panelde boşaltılabilmeli; yalnızca kısmi şema bunu ifade
 * edemiyordu ve dolu simge anahtarı sessizce kalırdı (bkz. `habit.ts`).
 */
export const updateSkillSchema = partialWithoutDefaults(skillBase).extend({
  id: cuidSchema,
  iconKey: skillBase.shape.iconKey.nullable(),
});

export const skillFilterSchema = paginationSchema.extend({
  category: z.enum(SkillCategory).optional(),
  locale: z.string().optional(),
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type SkillFilterInput = z.infer<typeof skillFilterSchema>;
