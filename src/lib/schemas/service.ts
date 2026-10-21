import * as z from 'zod';

import {
  cuidSchema,
  localeSchema,
  mediumTextSchema,
  optionalUrlSchema,
  orderSchema,
  paginationSchema,
  partialWithoutDefaults,
  shortTextSchema,
} from './common';

/** `Service` — §4.1 hizmetler; her biri Kıyı Medya'ya yönlendirir (K4). */
const serviceBase = z.object({
  locale: localeSchema,
  title: shortTextSchema.min(1, { error: 'Hizmet başlığı zorunludur.' }),
  description: mediumTextSchema.min(1, { error: 'Açıklama zorunludur.' }),
  iconKey: shortTextSchema.optional(),
  ctaUrl: optionalUrlSchema.optional(),
  order: orderSchema,
});

export const createServiceSchema = serviceBase;
/*
 * TEMİZLENEBİLİR ALANLAR — `null` = "boşalt", `undefined` = "dokunma" (T-031).
 * `ctaUrl` boşaltılınca public CTA Kıyı Medya'ya geri düşer; bu ancak
 * sütun `null`a çekilebilirse mümkün (bkz. `habit.ts`).
 */
export const updateServiceSchema = partialWithoutDefaults(serviceBase).extend({
  id: cuidSchema,
  iconKey: serviceBase.shape.iconKey.nullable(),
  ctaUrl: serviceBase.shape.ctaUrl.nullable(),
});

export const serviceFilterSchema = paginationSchema.extend({
  locale: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceFilterInput = z.infer<typeof serviceFilterSchema>;
