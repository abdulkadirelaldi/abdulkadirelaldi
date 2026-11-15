import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod';

import { currentActorId } from '@/server/actions/_shared';
import { db } from '@/server/db';
import { sohbet, type SohbetOlayi } from '@/server/services/masa-sohbet';
import {
  appToday,
  fail,
  parseOrFail,
  unauthorized,
  writeAuditLog,
} from '@/server/services/_shared';

import { basarisiz, json } from '../yukle/_yanit';

/**
 * `POST /api/v1/panel/masa/sohbet` — Claude paneli (ADR-049 M4). Gövde JSON:
 * `{ soru, dolapId?, gecmis }`. Yanıt NDJSON akışı: `metin` · `oneri` · `bitti` · `hata` olayları.
 *
 * - Kimlik iki katman (ara katman + `currentActorId`).
 * - Her gönderim istekten ÖNCE denetim kaydına `EXPORT` (hedef Anthropic) — sağlık modülüyle
 *   aynı kural; soru ve yanıt YAZILMAZ, yalnızca hangi dolap ve geçmiş uzunluğu.
 * - Hız: dakikada en çok 10 soru (denetim kaydından sayılır).
 * - Geçmiş istemciden gelir (sunucu sohbet saklamaz); boyut ve şekil sınırlı.
 */
export const dynamic = 'force-dynamic';

const DAKIKADA = 10;
const EN_BUYUK_GOVDE = 512 * 1024;

const icerik = z.union([
  z.string().max(20_000),
  z.array(z.record(z.string(), z.unknown())).max(50),
]);
const sohbetSchema = z.object({
  soru: z
    .string()
    .trim()
    .min(1, { error: 'Soru boş.' })
    .max(4000, { error: 'Soru en çok 4000 karakter.' }),
  dolapId: z
    .string()
    .max(64)
    .nullish()
    .transform((v) => v ?? null),
  gecmis: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: icerik }))
    .max(80, { error: 'Sohbet çok uzadı; yeni bir sohbet başlat.' }),
});

export async function POST(request: Request) {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);

  if (Number(request.headers.get('content-length') ?? '0') > EN_BUYUK_GOVDE) {
    return json(fail('VALIDATION_ERROR', 'Sohbet çok uzadı; yeni bir sohbet başlat.'), 413);
  }
  let govde: unknown;
  try {
    govde = await request.json();
  } catch {
    return json(fail('VALIDATION_ERROR', 'Gövde JSON değil.'), 400);
  }
  const parsed = parseOrFail(sohbetSchema, govde);
  if (!parsed.ok) return basarisiz(parsed.failure);
  const { soru, dolapId, gecmis } = parsed.data;

  const sayi = await db.auditLog.count({
    where: { actorId, entity: 'ClaudePaneli', createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (sayi >= DAKIKADA) {
    return json(fail('RATE_LIMITED', `Dakikada en çok ${DAKIKADA} soru; biraz bekle.`), 429);
  }
  await writeAuditLog(
    {
      actorId,
      action: 'EXPORT',
      entity: 'ClaudePaneli',
      diff: { context: 'anthropic', dolapId, gecmis: gecmis.length },
    },
    db,
  );

  const kodla = new TextEncoder();
  const govdeAkisi = new ReadableStream<Uint8Array>({
    async start(denetleyici) {
      const yaz = (o: SohbetOlayi) => denetleyici.enqueue(kodla.encode(`${JSON.stringify(o)}\n`));
      try {
        for await (const olay of sohbet({
          soru,
          dolapId,
          gecmis: gecmis as Anthropic.Beta.Messages.BetaMessageParam[],
          bugun: appToday(),
        })) {
          yaz(olay);
        }
      } catch {
        yaz({ tur: 'hata', mesaj: 'Sohbet beklenmedik biçimde durdu.' });
      } finally {
        denetleyici.close();
      }
    },
  });

  return new Response(govdeAkisi, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Accel-Buffering': 'no',
    },
  });
}
