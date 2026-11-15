import { currentActorId } from '@/server/actions/_shared';
import { db } from '@/server/db';
import { ogeSil, yuklemeBitir } from '@/server/services/masa-yukleme';
import { fail, ok, unauthorized, writeAuditLog } from '@/server/services/_shared';

import { hataYaniti, json, KIMLIK } from '../_yanit';

type Baglam = { params: Promise<{ id: string }> };

/**
 * `POST /api/v1/panel/masa/yukle/[id]` — yüklemeyi bitirir: R2 birleştirir, nesne baştan sona
 * okunup boyutu ve SHA-256'sı doğrulanır, öğe HAZIR olur. (ADR-049 M2b)
 */
export async function POST(_request: Request, { params }: Baglam) {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);
  const { id } = await params;
  if (!KIMLIK.test(id)) return json(fail('NOT_FOUND', 'Yükleme bulunamadı.'), 404);

  try {
    const sonuc = await yuklemeBitir(id, actorId);
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'MasaOgesi',
        entityId: id,
        diff: { context: 'masa-yukleme-bitti', dosyaId: sonuc.dosyaId },
      },
      db,
    );
    return json(ok(sonuc), 200);
  } catch (error) {
    return hataYaniti('masa:yukleme-bitir', error);
  }
}

/**
 * `DELETE /api/v1/panel/masa/yukle/[id]` — yarım yüklemeyi iptal eder (ya da öğeyi siler):
 * R2 parçaları ve satır gider.
 */
export async function DELETE(_request: Request, { params }: Baglam) {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);
  const { id } = await params;
  if (!KIMLIK.test(id)) return json(fail('NOT_FOUND', 'Yükleme bulunamadı.'), 404);

  try {
    const sonuc = await ogeSil(id);
    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'MasaOgesi',
        entityId: id,
        diff: { context: 'masa-yukleme-iptal' },
      },
      db,
    );
    return json(ok(sonuc), 200);
  } catch (error) {
    return hataYaniti('masa:yukleme-iptal', error);
  }
}
