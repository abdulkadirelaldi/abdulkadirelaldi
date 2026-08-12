import type { AttachmentRefDto } from '../content-dto';

/**
 * Public içerik sorgu yardımcıları — ADR-019.
 */

/** ADR-019 — public varsayılan dili. */
export const DEFAULT_LOCALE = 'tr';

/**
 * "Yayında" koşulu — İKİ KOŞUL BİRDEN.
 *
 * `status === 'PUBLISHED'` TEK BAŞINA YETMEZ: `SCHEDULED` bir kayıt yayın
 * saatinde `PUBLISHED`'a çevrilmiyor (ADR-019 cron istemiyor, "sorgu anında
 * çözmek tercih edilir" diyor). Ayrıca ileri tarihli `publishedAt` taşıyan bir
 * `PUBLISHED` kayıt da erken sızmamalı. Bu yüzden zaman karşılaştırması
 * sorgunun kendisinde.
 */
export function publishedWhere(now: Date): {
  status: 'PUBLISHED';
  publishedAt: { lte: Date };
} {
  return { status: 'PUBLISHED', publishedAt: { lte: now } };
}

/** Prisma'dan okunan `Attachment` satırının DTO karşılığı — `url` YOK (ADR-018). */
export interface AttachmentRow {
  id: string;
  key: string;
  mime: string;
  width: number | null;
  height: number | null;
}

export function toAttachmentRef(row: AttachmentRow | null | undefined): AttachmentRefDto | null {
  if (!row) return null;
  return { id: row.id, key: row.key, mime: row.mime, width: row.width, height: row.height };
}

/** Prisma `select` bloğu — her yerde aynı alanlar okunsun diye tek yerde. */
export const ATTACHMENT_SELECT = {
  id: true,
  key: true,
  mime: true,
  width: true,
  height: true,
} as const;
