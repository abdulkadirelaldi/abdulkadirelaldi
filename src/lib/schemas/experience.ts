import * as z from 'zod';

import { ExperienceType } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  localeSchema,
  mediumTextSchema,
  orderSchema,
  paginationSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/** `Experience` — deneyim/eğitim zaman çizelgesi (§4.1 /hakkimda). */
const experienceBase = z.object({
  locale: localeSchema,
  organization: shortTextSchema.min(1, { error: 'Kurum adı zorunludur.' }),
  role: shortTextSchema.min(1, { error: 'Ünvan zorunludur.' }),
  type: z.enum(ExperienceType, { error: 'Geçersiz deneyim türü.' }),
  startDate: dayDateSchema,
  endDate: dayDateSchema.optional(),
  current: z.boolean().default(false),
  description: mediumTextSchema.optional(),
  order: orderSchema,
});

/**
 * İki çapraz kural:
 *  - Bitiş, başlangıçtan önce olamaz.
 *  - "Hâlâ devam ediyor" işaretliyken bitiş tarihi olamaz — ikisi çelişir.
 *
 * Refine'lar her iki şemaya AYRI AYRI uygulanır. Ortak bir jenerik yardımcıya
 * çıkarmak alan tiplerini kaybettiriyor (`output<T>` üzerinde alan bilinmiyor),
 * bu da `any`ye zorlardı — §2 yasağı.
 */
const endAfterStart = {
  error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
  path: ['endDate'],
};
const currentHasNoEnd = {
  error: 'Devam eden bir kayda bitiş tarihi girilemez.',
  path: ['endDate'],
};

export const createExperienceSchema = experienceBase
  .refine((value) => !value.endDate || value.startDate <= value.endDate, endAfterStart)
  .refine((value) => !(value.current && value.endDate), currentHasNoEnd);

export const updateExperienceSchema = partialWithoutDefaults(experienceBase)
  .extend({ id: cuidSchema })
  .refine(
    (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
    endAfterStart,
  )
  .refine((value) => !(value.current && value.endDate), currentHasNoEnd);

export const experienceFilterSchema = paginationSchema.extend({
  type: z.enum(ExperienceType).optional(),
  locale: z.string().optional(),
});

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
export type ExperienceFilterInput = z.infer<typeof experienceFilterSchema>;
