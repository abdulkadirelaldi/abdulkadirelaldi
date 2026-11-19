import * as z from 'zod';

import { IsAlani } from '@/types';

/**
 * DÜKKÂN KAYDI (ADR-058) — Drive klasörü, not, aylık paket hedefi; paket sayacı.
 * Anahtar sokaktakiyle aynı (`src/lib/gorev/sokak.ts` → `kapsamAnahtari`).
 */

export const DUKKAN_SINIRLARI = { not: 4000, url: 500, hedef: 99 } as const;
export const PAKET_TURLERI = ['reels', 'post', 'story'] as const;
export type PaketTuru = (typeof PAKET_TURLERI)[number];

export const dukkanAnahtariSchema = z
  .string()
  .regex(new RegExp(`^(d:\\S.{0,39}|b:(${Object.values(IsAlani).join('|')}))$`, 'u'), {
    error: 'Geçersiz dükkân.',
  });

/** Yalnızca Google Drive / Docs adresi — panelden başka siteye bağlantı açılmasın. */
const driveUrlSchema = z
  .string()
  .trim()
  .max(DUKKAN_SINIRLARI.url, { error: 'Adres çok uzun.' })
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return (
          u.protocol === 'https:' &&
          (u.hostname === 'drive.google.com' || u.hostname === 'docs.google.com')
        );
      } catch {
        return false;
      }
    },
    { error: 'Google Drive bağlantısı olmalı (https://drive.google.com/…).' },
  );

const hedef = z
  .number()
  .int()
  .min(0)
  .max(DUKKAN_SINIRLARI.hedef, { error: `En çok ${DUKKAN_SINIRLARI.hedef}.` });

export const dukkanSchema = z.object({
  anahtar: dukkanAnahtariSchema,
  driveUrl: z
    .preprocess((v) => (v === '' ? null : v), driveUrlSchema.nullish())
    .transform((v) => v ?? null),
  not: z
    .string()
    .trim()
    .max(DUKKAN_SINIRLARI.not, { error: `Not en çok ${DUKKAN_SINIRLARI.not} karakter.` })
    .nullish()
    .transform((v) => (v ? v : null)),
  /** `null`: aylık paket yok. */
  paket: z.object({ reels: hedef, post: hedef, story: hedef }).nullable(),
});
export type DukkanGirdisi = z.infer<typeof dukkanSchema>;

/** Sayaç: bir teslim ekle (+1) ya da yanlış sayımı geri al (−1). */
export const paketSaySchema = z.object({
  anahtar: dukkanAnahtariSchema,
  tur: z.enum(PAKET_TURLERI),
  fark: z.union([z.literal(1), z.literal(-1)]),
});
export type PaketSayGirdisi = z.infer<typeof paketSaySchema>;
