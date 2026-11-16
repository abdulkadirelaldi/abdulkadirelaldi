'use server';

import { db } from '@/server/db';
import { ok, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  baglantiKes,
  bekleyenleriEsitle,
  fetchGoogleDurumu,
  type GoogleDurumu,
} from '@/server/services/google-takvim';

import { currentActorId, toFailure, unauthorized } from './_shared';

/** Google Takvim bağlantısını keser (ADR-051). Takvimdeki etkinlikler yerinde kalır. */
export async function googleBaglantiKesAction(): Promise<ApiResponse<GoogleDurumu>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    await baglantiKes();
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'GoogleBaglantisi', entityId: actorId, diff: {} },
      db,
    );
    return ok(await fetchGoogleDurumu());
  } catch (error) {
    return toFailure('google:kes', error);
  }
}

/** Bekleyen görevleri şimdi yazar ve güncel durumu döner. */
export async function googleSimdiEsitleAction(): Promise<ApiResponse<GoogleDurumu>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    const { yazilan, hata } = await bekleyenleriEsitle(200);
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'GoogleBaglantisi',
        entityId: actorId,
        diff: { context: 'simdi-esitle', yazilan, hatali: hata !== null },
      },
      db,
    );
    return ok(await fetchGoogleDurumu());
  } catch (error) {
    return toFailure('google:esitle', error);
  }
}
