import * as z from 'zod';

import { GoalCategory, GoalStatus } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  mediumTextSchema,
  paginationSchema,
  partialWithoutDefaults,
  percentSchema,
  searchSchema,
  shortTextSchema,
} from './common';

/** `Goal` — hedef (§4.2 /panel/hayat). `progress` 0–100 (ADR-020). */
const goalBase = z.object({
  title: shortTextSchema.min(1, { error: 'Hedef başlığı zorunludur.' }),
  description: mediumTextSchema.optional(),
  category: z.enum(GoalCategory, { error: 'Geçersiz hedef kategorisi.' }).default('PERSONAL'),
  targetDate: dayDateSchema.optional(),
  progress: percentSchema.default(0),
  status: z.enum(GoalStatus, { error: 'Geçersiz hedef durumu.' }).default('ACTIVE'),
});

/**
 * ÇAPRAZ KURAL: "Ulaşıldı" işaretli bir hedefin ilerlemesi 100 olmalıdır.
 * Aksi hâlde panel kartı ile rozet birbirini yalanlar.
 */
const achievedIsComplete = {
  error: 'Ulaşıldı olarak işaretlenen hedefin ilerlemesi %100 olmalıdır.',
  path: ['progress'],
};

export const createGoalSchema = goalBase.refine(
  (value) => value.status !== 'ACHIEVED' || value.progress === 100,
  achievedIsComplete,
);

export const updateGoalSchema = partialWithoutDefaults(goalBase)
  .extend({ id: cuidSchema })
  .refine(
    (value) =>
      value.status !== 'ACHIEVED' || value.progress === undefined || value.progress === 100,
    achievedIsComplete,
  );

export const goalFilterSchema = paginationSchema.extend({
  status: z.enum(GoalStatus).optional(),
  category: z.enum(GoalCategory).optional(),
  q: searchSchema.optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type GoalFilterInput = z.infer<typeof goalFilterSchema>;
