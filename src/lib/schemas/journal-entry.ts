import * as z from 'zod';

import {
  cuidSchema,
  dayDateSchema,
  longTextSchema,
  moodSchema,
  paginationSchema,
  partialWithoutDefaults,
  searchSchema,
  shortTextSchema,
  tagsSchema,
} from './common';

/** `JournalEntry` — günlük (§4.2 /panel/hayat). `mood` 1–5 ölçek (ADR-020). */
const journalEntryBase = z.object({
  date: dayDateSchema,
  title: shortTextSchema.optional(),
  content: longTextSchema.min(1, { error: 'Günlük içeriği boş olamaz.' }),
  mood: moodSchema.optional(),
  tags: tagsSchema,
});

export const createJournalEntrySchema = journalEntryBase;
export const updateJournalEntrySchema = partialWithoutDefaults(journalEntryBase).extend({
  id: cuidSchema,
});

export const journalEntryFilterSchema = paginationSchema.extend({
  from: dayDateSchema.optional(),
  to: dayDateSchema.optional(),
  tag: z.string().trim().max(32).optional(),
  q: searchSchema.optional(),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type JournalEntryFilterInput = z.infer<typeof journalEntryFilterSchema>;
