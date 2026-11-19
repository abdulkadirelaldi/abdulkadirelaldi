import * as z from 'zod';

import { gecerliGun } from '@/lib/takvim/bicim';
import { IsAlani } from '@/types';

import { cuidSchema, dayDateSchema } from './common';

/**
 * İŞLER (ADR-050) — görev girdileri. Sunucu, form ve asistan ucu AYNI şemayı kullanır.
 *
 * Teslim: gün (`YYYY-MM-DD`) + isteğe bağlı saat (`SS:DD`, İstanbul). Saat gün olmadan gelemez;
 * günsüz görev "tarihsiz" öbeğinde durur.
 */

export const GOREV_SINIRLARI = { baslik: 160, etiket: 40, not: 4000 } as const;

const bosMetin = (en: number, mesaj: string) =>
  z
    .string()
    .trim()
    .max(en, { error: mesaj })
    .nullish()
    .transform((v) => (v ? v : null));

const gunSchema = dayDateSchema.refine((g) => gecerliGun(g) !== null, {
  error: 'Takvimde olmayan bir gün.',
});

const saatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Saat SS:DD biçiminde olmalı.' });

const gorevNesnesi = z.object({
  baslik: z
    .string()
    .trim()
    .min(1, { error: 'Başlık gerekli.' })
    .max(GOREV_SINIRLARI.baslik, { error: `Başlık en çok ${GOREV_SINIRLARI.baslik} karakter.` }),
  alan: z.enum(IsAlani, { error: 'Geçersiz alan.' }).default('KISISEL'),
  etiket: bosMetin(GOREV_SINIRLARI.etiket, `Etiket en çok ${GOREV_SINIRLARI.etiket} karakter.`),
  not: bosMetin(GOREV_SINIRLARI.not, `Not en çok ${GOREV_SINIRLARI.not} karakter.`),
  teslimGun: gunSchema.nullish().transform((v) => v ?? null),
  teslimSaat: saatSchema.nullish().transform((v) => v ?? null),
  /** ADR-058 — verilmezse DOKUNULMAZ (güncellemede eski değer kalır, yenide `false`). */
  acil: z.boolean().optional(),
});

const saatGunsuzOlmaz = (v: { teslimGun: string | null; teslimSaat: string | null }) =>
  v.teslimSaat === null || v.teslimGun !== null;
const SAAT_HATASI = { error: 'Saat için önce gün seç.', path: ['teslimSaat'] };

export const gorevSchema = gorevNesnesi.refine(saatGunsuzOlmaz, SAAT_HATASI);
export type GorevGirdisi = z.infer<typeof gorevSchema>;

export const gorevGuncelleSchema = gorevNesnesi
  .extend({ id: cuidSchema })
  .refine(saatGunsuzOlmaz, SAAT_HATASI);
export type GorevGuncelleGirdisi = z.infer<typeof gorevGuncelleSchema>;

/** Tik: `bitti: true` tamamlar, `false` geri alır. */
export const gorevBittiSchema = z.object({ id: cuidSchema, bitti: z.boolean() });
export type GorevBittiGirdisi = z.infer<typeof gorevBittiSchema>;
