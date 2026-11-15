import { yuklemeBaslatSchema } from '@/lib/schemas/masa';
import { currentActorId } from '@/server/actions/_shared';
import { db } from '@/server/db';
import { uploadRateGate } from '@/server/services/attachment';
import { yuklemeBaslat, type YuklemePlani } from '@/server/services/masa-yukleme';
import { fail, ok, parseOrFail, unauthorized, writeAuditLog } from '@/server/services/_shared';

import { basarisiz, hataYaniti, json } from './_yanit';

/**
 * `POST /api/v1/panel/masa/yukle` — parçalı yüklemeyi başlatır (ADR-049 M2b). Gövde JSON:
 * `{ dolapId, rafId?, dosyaAdi, boyut }`. Yanıt parça planı: `{ id, parcaBoyutu, parcaSayisi }`.
 *
 * Kimlik iki katman (ara katman `/api/v1/panel/*` + `currentActorId`, ADR-044 ile aynı). Hız
 * sınırı DOSYA başına burada (§8.16) — parçalar sayılmaz, yoksa tek bir ders kaydı sınırı
 * doldururdu.
 */
export async function POST(request: Request) {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);

  let govde: unknown;
  try {
    govde = await request.json();
  } catch {
    return json(fail('VALIDATION_ERROR', 'Gövde JSON değil.'), 400);
  }
  const parsed = parseOrFail(yuklemeBaslatSchema, govde);
  if (!parsed.ok) return basarisiz(parsed.failure);

  try {
    const sinir = await uploadRateGate(actorId);
    if (sinir) return basarisiz(sinir);
    const plan = await yuklemeBaslat(parsed.data);
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'MasaOgesi',
        entityId: plan.id,
        diff: {
          context: 'masa-yukleme-basladi',
          boyut: parsed.data.boyut,
          parca: plan.parcaSayisi,
        },
      },
      db,
    );
    return json<YuklemePlani>(ok(plan), 201);
  } catch (error) {
    return hataYaniti('masa:yukleme-baslat', error);
  }
}
