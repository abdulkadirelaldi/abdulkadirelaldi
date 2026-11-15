'use server';

import { entityIdSchema } from '@/lib/schemas/common';
import {
  dolapGuncelleSchema,
  dolapSchema,
  gorevDurumuSchema,
  gorevGuncelleSchema,
  gorevSchema,
  notGuncelleSchema,
  notSchema,
  ogeAdiSchema,
  rafGuncelleSchema,
  rafSchema,
} from '@/lib/schemas/masa';
import { db } from '@/server/db';
import { fail, ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';
import {
  dolapGuncelle,
  dolapOlustur,
  dolapSil,
  gorevDurumuDegistir,
  gorevGuncelle,
  gorevOlustur,
  gorevSil,
  MasaHatasi,
  notGuncelle,
  notOlustur,
  ogeAdiDegistir,
  onerilenDolaplariKur,
  rafGuncelle,
  rafOlustur,
  rafSil,
} from '@/server/services/masa';
import {
  kopruAnahtariSil,
  kopruAnahtariUret,
  yaziyiYenidenSirala,
} from '@/server/services/masa-koprusu';
import { ogeSil } from '@/server/services/masa-yukleme';
import type { AuditAction } from '@/types';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * MASA EYLEMLERİ (ADR-049 M2). Kalıp Takvim'le aynı: kimlik + yazma kapısı ve Zod her eylemin
 * ilk satırlarında, sonra servis + DENETİM KAYDI.
 *
 * ⚠️ Denetim farkına görev BAŞLIĞI ve AÇIKLAMASI yazılmıyor (ödev/iş içeriği; mailden gelecek
 * görevlerde okulun yazdığı metin). Yalnızca yapı: durum, öncelik, teslimli mi, hangi dolap.
 * Dolap ve raf ADI yazılır — kullanıcının koyduğu kısa düzen etiketi, "hangi dolap" sorusunun
 * tek okunur cevabı (`Exercise.name` ile aynı sınıf).
 */

async function kaydet<T extends { id: string }>(
  actorId: string,
  action: AuditAction,
  entity: 'Dolap' | 'Raf' | 'Gorev' | 'MasaOgesi',
  diff: Record<string, unknown>,
  is: () => Promise<T>,
  etiket: string,
): Promise<ApiResponse<T>> {
  try {
    const sonuc = await is();
    await writeAuditLog({ actorId, action, entity, entityId: sonuc.id, diff }, db);
    return ok(sonuc);
  } catch (error) {
    if (error instanceof MasaHatasi) {
      return fail(
        error.kod,
        error.message,
        error.alan ? { [error.alan]: error.message } : undefined,
      );
    }
    return toFailure(etiket, error);
  }
}

/* ── Dolap ─────────────────────────────────────────────────────────────── */

export async function dolapOlusturAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(dolapSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    'Dolap',
    { ad: v.ad, katman: v.katman },
    () => dolapOlustur(v),
    'masa:dolap-olustur',
  );
}

export async function dolapGuncelleAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(dolapGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  const { id: _id, ...alanlar } = v;
  return kaydet(actorId, 'UPDATE', 'Dolap', alanlar, () => dolapGuncelle(v), 'masa:dolap-guncelle');
}

export async function dolapSilAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(actorId, 'DELETE', 'Dolap', {}, () => dolapSil(parsed.data.id), 'masa:dolap-sil');
}

/** "Önerilen dolapları kur" — girdisi yok; her kurulan dolap ayrı denetim satırı değil, tek özet. */
export async function onerilenDolaplariKurAction(): Promise<ApiResponse<{ kurulan: string[] }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    const sonuc = await onerilenDolaplariKur();
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Dolap',
        diff: { context: 'onerilen-dolaplar', kurulan: sonuc.kurulan.length },
      },
      db,
    );
    return ok(sonuc);
  } catch (error) {
    return toFailure('masa:onerilen', error);
  }
}

/* ── Raf ───────────────────────────────────────────────────────────────── */

export async function rafOlusturAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(rafSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    'Raf',
    { ad: v.ad, dolapId: v.dolapId, altRaf: v.ustRafId !== null },
    () => rafOlustur(v),
    'masa:raf-olustur',
  );
}

export async function rafGuncelleAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(rafGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(actorId, 'UPDATE', 'Raf', { ad: v.ad }, () => rafGuncelle(v), 'masa:raf-guncelle');
}

export async function rafSilAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(actorId, 'DELETE', 'Raf', {}, () => rafSil(parsed.data.id), 'masa:raf-sil');
}

/* ── Görev ─────────────────────────────────────────────────────────────── */

const gorevFarki = (v: {
  dolapId: string | null;
  rafId: string | null;
  teslimGun: string | null;
  teslimSaat: string | null;
  oncelik: string;
  aciklama: string | null;
}) => ({
  dolapId: v.dolapId,
  rafId: v.rafId,
  teslimli: v.teslimGun !== null,
  saatli: v.teslimSaat !== null,
  oncelik: v.oncelik,
  changed: v.aciklama ? 'baslik,aciklama' : 'baslik',
});

export async function gorevOlusturAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    'Gorev',
    gorevFarki(v),
    () => gorevOlustur(v),
    'masa:gorev-olustur',
  );
}

export async function gorevGuncelleAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    'Gorev',
    gorevFarki(v),
    () => gorevGuncelle(v),
    'masa:gorev-guncelle',
  );
}

export async function gorevDurumuAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(gorevDurumuSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    'Gorev',
    { durum: v.durum },
    () => gorevDurumuDegistir(v),
    'masa:gorev-durumu',
  );
}

export async function gorevSilAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(actorId, 'DELETE', 'Gorev', {}, () => gorevSil(parsed.data.id), 'masa:gorev-sil');
}

/* ── Öğeler (M2b) — dosya/ses YÜKLEMESİ route handler'da (`/api/v1/panel/masa/yukle`) ── */

export async function notOlusturAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(notSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'CREATE',
    'MasaOgesi',
    { tur: 'NOT', dolapId: v.dolapId, rafId: v.rafId, changed: 'baslik,metin' },
    () => notOlustur(v),
    'masa:not-olustur',
  );
}

export async function notGuncelleAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(notGuncelleSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    'MasaOgesi',
    { tur: 'NOT', changed: 'baslik,metin' },
    () => notGuncelle(v),
    'masa:not-guncelle',
  );
}

export async function ogeAdiAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(ogeAdiSchema, raw);
  if (!parsed.ok) return parsed.failure;
  const v = parsed.data;
  return kaydet(
    actorId,
    'UPDATE',
    'MasaOgesi',
    { changed: 'baslik' },
    () => ogeAdiDegistir(v),
    'masa:oge-adi',
  );
}

/** Not, dosya ya da ses kaydı — dosyalıysa R2 nesnesi de gider. */
export async function ogeSilAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(actorId, 'DELETE', 'MasaOgesi', {}, () => ogeSil(parsed.data.id), 'masa:oge-sil');
}

/* ── Mac köprüsü (M6) ──────────────────────────────────────────────────── */

/** Anahtar bir kez döner; yeniden üretmek eskisini geçersiz kılar. */
export async function macAnahtariUretAction(): Promise<ApiResponse<{ anahtar: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    const anahtar = await kopruAnahtariUret(actorId);
    await writeAuditLog(
      { actorId, action: 'CREATE', entity: 'MasaKoprusu', entityId: actorId },
      db,
    );
    return ok({ anahtar });
  } catch (error) {
    return toFailure('masa:mac-anahtar-uret', error);
  }
}

export async function macAnahtariSilAction(): Promise<ApiResponse<{ ok: true }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  try {
    await kopruAnahtariSil(actorId);
    await writeAuditLog(
      { actorId, action: 'DELETE', entity: 'MasaKoprusu', entityId: actorId },
      db,
    );
    return ok({ ok: true });
  } catch (error) {
    return toFailure('masa:mac-anahtar-sil', error);
  }
}

/** Hata almış (ya da beğenilmemiş) bir yazıyı yeniden sıraya koyar. */
export async function yaziYenidenAction(raw: unknown) {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;
  return kaydet(
    actorId,
    'UPDATE',
    'MasaOgesi',
    { context: 'yazi-yeniden' },
    () => yaziyiYenidenSirala(parsed.data.id),
    'masa:yazi-yeniden',
  );
}
