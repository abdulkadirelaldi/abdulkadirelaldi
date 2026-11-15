import * as z from 'zod';

import { gecerliGun } from '@/lib/takvim/bicim';
import { GorevDurumu, GorevOnceligi, TakvimKatman } from '@/types';

import { MASA_EN_BUYUK_BAYT } from '@/lib/masa/dosya-sinirlari';

import { cuidSchema, dayDateSchema } from './common';

/**
 * MASA (ADR-049 M2) — dolap, raf, görev girdileri. Sunucu ve form AYNI şemayı kullanır.
 *
 * Görev teslimi: gün (`YYYY-MM-DD`) + isteğe bağlı saat (`SS:DD`, İstanbul). Saat gün olmadan
 * gelemez; gün olmadan görev "teslimsiz" kalır ve takvime düşmez.
 */

const ad = (en: number, alan: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${alan} gerekli.` })
    .max(en, { error: `${alan} en çok ${en} karakter.` });

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

/** Tek bir emoji ya da kısa simge — serbest metin alanı değil. */
const emojiSchema = z
  .string()
  .trim()
  .min(1, { error: 'Simge gerekli.' })
  .max(8, { error: 'Simge en çok 8 karakter.' });

export const DOLAP_SINIRLARI = { ad: 60, raf: 60, rafDerinligi: 3 } as const;

export const dolapSchema = z.object({
  ad: ad(DOLAP_SINIRLARI.ad, 'Dolap adı'),
  emoji: emojiSchema,
  katman: z.enum(TakvimKatman),
});
export type DolapGirdisi = z.infer<typeof dolapSchema>;

export const dolapGuncelleSchema = dolapSchema.partial().extend({
  id: cuidSchema,
  arsivlendi: z.boolean().optional(),
});
export type DolapGuncelleGirdisi = z.infer<typeof dolapGuncelleSchema>;

export const rafSchema = z.object({
  dolapId: cuidSchema,
  ustRafId: cuidSchema.nullish().transform((v) => v ?? null),
  ad: ad(DOLAP_SINIRLARI.raf, 'Raf adı'),
});
export type RafGirdisi = z.infer<typeof rafSchema>;

export const rafGuncelleSchema = z.object({
  id: cuidSchema,
  ad: ad(DOLAP_SINIRLARI.raf, 'Raf adı'),
});
export type RafGuncelleGirdisi = z.infer<typeof rafGuncelleSchema>;

const gorevNesnesi = z.object({
  baslik: ad(160, 'Başlık'),
  aciklama: bosMetin(4000, 'Açıklama en çok 4000 karakter.'),
  dolapId: cuidSchema.nullish().transform((v) => v ?? null),
  rafId: cuidSchema.nullish().transform((v) => v ?? null),
  teslimGun: gunSchema.nullish().transform((v) => v ?? null),
  teslimSaat: saatSchema.nullish().transform((v) => v ?? null),
  oncelik: z.enum(GorevOnceligi).default('NORMAL'),
});

const saatGunsuzOlmaz = (v: { teslimGun: string | null; teslimSaat: string | null }) =>
  v.teslimSaat === null || v.teslimGun !== null;
const SAAT_HATASI = { error: 'Saat için önce teslim günü seç.', path: ['teslimSaat'] };

export const gorevSchema = gorevNesnesi.refine(saatGunsuzOlmaz, SAAT_HATASI);
export type GorevGirdisi = z.infer<typeof gorevSchema>;

export const gorevGuncelleSchema = gorevNesnesi
  .extend({ id: cuidSchema })
  .refine(saatGunsuzOlmaz, SAAT_HATASI);
export type GorevGuncelleGirdisi = z.infer<typeof gorevGuncelleSchema>;

export const gorevDurumuSchema = z.object({ id: cuidSchema, durum: z.enum(GorevDurumu) });
export type GorevDurumuGirdisi = z.infer<typeof gorevDurumuSchema>;

/* ── Öğeler (M2b) ─────────────────────────────────────────────────────── */

export const notSchema = z.object({
  dolapId: cuidSchema,
  rafId: cuidSchema.nullish().transform((v) => v ?? null),
  baslik: ad(160, 'Başlık'),
  metin: bosMetin(50_000, 'Not en çok 50.000 karakter.'),
});
export type NotGirdisi = z.infer<typeof notSchema>;

export const notGuncelleSchema = z.object({
  id: cuidSchema,
  baslik: ad(160, 'Başlık'),
  metin: bosMetin(50_000, 'Not en çok 50.000 karakter.'),
});
export type NotGuncelleGirdisi = z.infer<typeof notGuncelleSchema>;

export const ogeAdiSchema = z.object({ id: cuidSchema, baslik: ad(160, 'Başlık') });
export type OgeAdiGirdisi = z.infer<typeof ogeAdiSchema>;

/** Parçalı yüklemenin başlangıcı — tür ilk parçanın baytlarından belirlenir, burada değil. */
export const yuklemeBaslatSchema = z.object({
  dolapId: cuidSchema,
  rafId: cuidSchema.nullish().transform((v) => v ?? null),
  dosyaAdi: ad(255, 'Dosya adı'),
  boyut: z
    .number()
    .int()
    .min(1, { error: 'Dosya boş.' })
    .max(MASA_EN_BUYUK_BAYT, { error: 'Dosya en fazla 300 MB olabilir.' }),
});
export type YuklemeBaslatGirdisi = z.infer<typeof yuklemeBaslatSchema>;
