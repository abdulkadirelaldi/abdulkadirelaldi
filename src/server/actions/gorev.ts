'use server';

import { after } from 'next/server';

import { entityIdSchema } from '@/lib/schemas/common';
import { gorevBittiSchema, gorevGuncelleSchema, gorevSchema } from '@/lib/schemas/gorev';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  GorevHatasi,
  gorevBitti,
  gorevGuncelle,
  gorevOlustur,
  gorevSil,
  type GorevDto,
} from '@/server/services/gorev';
import { etkinlikSil, gorevEsitle } from '@/server/services/google-takvim';
import { guvenliHata } from '@/lib/security/guvenli-log';
import type { AuditAction } from '@/types';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * İŞLER EYLEMLERİ (ADR-050). Kalıp Takvim/Masa ile aynı: kimlik + yazma kapısı ve Zod her eylemin
 * ilk satırlarında, sonra servis + DENETİM KAYDI.
 *
 * ⚠️ Denetim farkına görev BAŞLIĞI, ETİKETİ ve NOTU yazılmıyor (ödev/müşteri içeriği). Yalnızca
 * yapı: alan, teslimli mi, bitti mi.
 */

async function kaydet<T extends { id: string }>(
  actorId: string,
  action: AuditAction,
  diff: Record<string, unknown>,
  is: () => Promise<T>,
  etiket: string,
): Promise<ApiResponse<T>> {
  try {
    const sonuc = await is();
    await writeAuditLog({ actorId, action, entity: 'Gorev', entityId: sonuc.id, diff }, db);
    // ADR-051 — Google'a yanıttan SONRA yazılır: tik beklemez. Başarısızsa görev kuyrukta kalır,
    // zamanlayıcı yeniden dener.
    if (action !== 'DELETE') {
      after(() => gorevEsitle(sonuc.id).catch((e) => guvenliHata('[google] eşitleme:', String(e))));
    }
    return ok(sonuc);
  } catch (error) {
    if (error instanceof GorevHatasi) return fail(error.kod, error.message);
    return toFailure(etiket, error);
  }
}

export async function gorevOlusturAction(raw: unknown): Promise<ApiResponse<GorevDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    { alan: v.alan, teslimli: v.teslimGun !== null },
    () => gorevOlustur(v),
    'gorev:olustur',
  );
}

export async function gorevGuncelleAction(raw: unknown): Promise<ApiResponse<GorevDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    { alan: v.alan, teslimli: v.teslimGun !== null },
    () => gorevGuncelle(v),
    'gorev:guncelle',
  );
}

export async function gorevBittiAction(raw: unknown): Promise<ApiResponse<GorevDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevBittiSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(actorId, 'UPDATE', { bitti: v.bitti }, () => gorevBitti(v), 'gorev:bitti');
}

export async function gorevSilAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const sonuc = await kaydet(actorId, 'DELETE', {}, () => gorevSil(parsed.data.id), 'gorev:sil');
  if (sonuc.ok && sonuc.data.googleEtkinlikId) {
    const etkinlikId = sonuc.data.googleEtkinlikId;
    after(() => etkinlikSil(etkinlikId).catch((e) => guvenliHata('[google] silme:', String(e))));
  }
  return sonuc.ok ? ok({ id: sonuc.data.id }) : sonuc;
}
