'use server';

import * as z from 'zod';

import { dayDateSchema, decimalSchema } from '@/lib/schemas/common';
import { hizliHarcamaSchema } from '@/lib/schemas/wallet';
import { db } from '@/server/db';
import {
  appToday,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import { birKez } from '@/server/services/islem-anahtari';
import { createWalletFlow, kuyrukGunu } from '@/server/services/cuzdan';
import { gununKaydinaEkle } from '@/server/services/health-log';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * HIZLI EKLEME (2026-10-30) — her ekrandaki "+" düğmesi. Üç sık iş tek
 * dokunuşta: harcama, kilo, su. Gün sunucuda İstanbul saatine göre
 * (`appToday`, ADR-016); bağlantı yokken kuyruğa alınan kayıt GİRİLDİĞİ günü
 * taşır (`kuyrukGunu` sınırlar). Denetim kaydına tutar/kilo YAZILMAZ (kişisel veri).
 */

const gunAlani = { gun: dayDateSchema.optional(), anahtar: z.uuid().optional() };
const kiloSchema = z.object({
  kg: decimalSchema(3, 2).refine((v) => Number(v) >= 30 && Number(v) <= 250, {
    error: 'Kilo 30–250 arasında olmalı.',
  }),
  ...gunAlani,
});
const suSchema = z.object({ ml: z.number().int().min(50).max(2000), ...gunAlani });
const harcamaSchema = hizliHarcamaSchema.extend(gunAlani);

export async function hizliHarcamaAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(harcamaSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      createWalletFlow(
        {
          kind: 'EXPENSE',
          name: parsed.data.ne,
          amount: parsed.data.tutar,
          unit: 'TRY',
          frequency: 'ONCE',
          date: kuyrukGunu(parsed.data.gun, appToday()),
          category: parsed.data.kategori,
        },
        tx,
      ),
    );
    if (sonuc === null) return ok({ id: '' });
    const { id } = sonuc;
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'WalletFlow',
        entityId: id,
        diff: { kaynak: 'hizli-ekle', kategori: parsed.data.kategori },
      },
      db,
    );
    return ok({ id });
  } catch (error) {
    return toFailure('hizli:harcama', error);
  }
}

export async function hizliKiloAction(
  raw: unknown,
): Promise<ApiResponse<{ weightKg: string | null }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(kiloSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      gununKaydinaEkle(kuyrukGunu(parsed.data.gun, appToday()), { weightKg: parsed.data.kg }, tx),
    );
    if (sonuc === null) return ok({ weightKg: parsed.data.kg });
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['weightKg'] },
      },
      db,
    );
    return ok({ weightKg: sonuc.weightKg });
  } catch (error) {
    return toFailure('hizli:kilo', error);
  }
}

export async function hizliSuAction(
  raw: unknown,
): Promise<ApiResponse<{ waterMl: number | null }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();
  const parsed = parseOrFail(suSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const sonuc = await birKez(parsed.data.anahtar, (tx) =>
      gununKaydinaEkle(kuyrukGunu(parsed.data.gun, appToday()), { suMl: parsed.data.ml }, tx),
    );
    if (sonuc === null) return ok({ waterMl: null });
    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'HealthLog',
        entityId: sonuc.id,
        diff: { alanlar: ['waterMl'] },
      },
      db,
    );
    return ok({ waterMl: sonuc.waterMl });
  } catch (error) {
    return toFailure('hizli:su', error);
  }
}
