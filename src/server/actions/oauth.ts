'use server';

import * as z from 'zod';

import { yonlendirmeEslesir } from '@/lib/oauth/kurallar';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import { baglantiyiKaldir, kodUret, OAuthHatasi } from '@/server/services/oauth';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * Claude bağlayıcısı izin eylemleri (ADR-056). Dönüş adresini HESAPLAR, gezinmeyi istemci yapar:
 * CSP `form-action 'self'` form gönderiminden sonraki dış yönlendirmeyi (claude.ai) engeller.
 * Asıl doğrulama serviste (`yetkiIsteginiDogrula`); buradaki şema yalnızca biçim.
 */

const metin = (en: number) => z.string().max(en);
const yetkiIstegiSchema = z.object({
  istemciId: metin(64),
  yonlendirme: metin(512),
  kodSinami: metin(128),
  sinamaYontemi: metin(16),
  kaynak: metin(512).nullable(),
  kapsam: metin(128).nullable(),
  durum: metin(512).nullable(),
});
const reddetSchema = z.object({
  istemciId: metin(64),
  yonlendirme: metin(512),
  durum: metin(512).nullable(),
});
const kaldirSchema = z.object({ istemciId: metin(64) });

function donusAdresi(yonlendirme: string, parametre: Record<string, string | null>): string {
  const u = new URL(yonlendirme);
  for (const [k, v] of Object.entries(parametre)) if (v !== null) u.searchParams.set(k, v);
  return u.toString();
}

export async function yetkiVerAction(raw: unknown): Promise<ApiResponse<{ adres: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(yetkiIstegiSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const i = parsed.data;
  try {
    const kod = await kodUret(i, actorId);
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'OAuthYetki',
        entityId: i.istemciId,
        diff: { context: 'claude-baglayici', karar: 'izin' },
      },
      db,
    );
    const iss = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? null;
    return ok({ adres: donusAdresi(i.yonlendirme, { code: kod, state: i.durum, iss }) });
  } catch (e) {
    if (e instanceof OAuthHatasi) return fail('VALIDATION_ERROR', e.message);
    return toFailure('oauth:yetki', e);
  }
}

/** Reddet: yalnızca KAYITLI yönlendirmeye `access_denied` döner (açık yönlendirme yok). */
export async function yetkiReddetAction(raw: unknown): Promise<ApiResponse<{ adres: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(reddetSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const r = parsed.data;
  const istemci = await db.oAuthIstemci.findUnique({ where: { id: r.istemciId } });
  if (!istemci || !yonlendirmeEslesir(istemci.yonlendirmeler, r.yonlendirme)) {
    return fail('VALIDATION_ERROR', 'Yönlendirme adresi kayıtlı değil.');
  }
  await writeAuditLog(
    {
      actorId,
      action: 'UPDATE',
      entity: 'OAuthYetki',
      entityId: r.istemciId,
      diff: { context: 'claude-baglayici', karar: 'red' },
    },
    db,
  );
  return ok({ adres: donusAdresi(r.yonlendirme, { error: 'access_denied', state: r.durum }) });
}

export async function baglantiKaldirAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(kaldirSchema, raw);
  if (!parsed.ok) return parsed.failure;
  try {
    const s = await baglantiyiKaldir(parsed.data.istemciId);
    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'OAuthYetki',
        entityId: s.id,
        diff: { iptal: s.iptal },
      },
      db,
    );
    return ok({ id: s.id });
  } catch (e) {
    return toFailure('oauth:kaldir', e);
  }
}
