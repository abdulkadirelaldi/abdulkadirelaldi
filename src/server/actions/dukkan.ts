'use server';

import { dukkanSchema, paketSaySchema } from '@/lib/schemas/dukkan';
import { db } from '@/server/db';
import {
  appToday,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import {
  DukkanHatasi,
  dukkanKaydet,
  paketSay,
  type DukkanKaydiDto,
} from '@/server/services/dukkan';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * DÜKKÂN EYLEMLERİ (ADR-058). Kimlik + Zod ilk satırlarda, sonra servis + DENETİM KAYDI.
 * ⚠️ Denetime Drive adresi ve not yazılmaz (müşteri içeriği); yalnızca yapı.
 */

const buAy = () => appToday().slice(0, 7);

async function calistir(
  actorId: string,
  diff: Record<string, unknown>,
  is: () => Promise<DukkanKaydiDto>,
  etiket: string,
): Promise<ApiResponse<DukkanKaydiDto>> {
  try {
    const sonuc = await is();
    await writeAuditLog(
      { actorId, action: 'UPDATE', entity: 'Dukkan', entityId: sonuc.anahtar, diff },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    if (error instanceof DukkanHatasi) return fail(error.kod, error.message);
    return toFailure(etiket, error);
  }
}

export async function dukkanKaydetAction(raw: unknown): Promise<ApiResponse<DukkanKaydiDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(dukkanSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return calistir(
    actorId,
    { drive: v.driveUrl !== null, notlu: v.not !== null, paket: v.paket !== null },
    () => dukkanKaydet(v, buAy()),
    'dukkan:kaydet',
  );
}

export async function paketSayAction(raw: unknown): Promise<ApiResponse<DukkanKaydiDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(paketSaySchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return calistir(
    actorId,
    { paket: v.tur, fark: v.fark },
    () => paketSay(v, buAy()),
    'dukkan:paket',
  );
}
