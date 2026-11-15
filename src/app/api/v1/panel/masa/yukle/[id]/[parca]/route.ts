import { MASA_PARCA_BAYT } from '@/lib/masa/dosya-sinirlari';
import { currentActorId } from '@/server/actions/_shared';
import { parcaYukle } from '@/server/services/masa-yukleme';
import { fail, ok, unauthorized } from '@/server/services/_shared';

import { hataYaniti, json, KIMLIK } from '../../_yanit';

type Baglam = { params: Promise<{ id: string; parca: string }> };

/**
 * `PUT /api/v1/panel/masa/yukle/[id]/[parca]` — bir parçanın HAM baytları
 * (`application/octet-stream`). Parça boyutu `MASA_PARCA_BAYT`ı aşamaz; gövde okunmadan önce
 * `Content-Length` ile ucuz bir ret, sonra baytlarda kesin kontrol (beyan yalan olabilir).
 *
 * Denetim kaydı PARÇA başına YAZILMAZ: bir saatlik kayıt ~8 parça, beş saatlik ~38 — kayıt
 * gürültüsü olurdu. Başlangıç ve bitiş yazılıyor; parça yalnızca o yüklemenin içinde anlamlı.
 */
export async function PUT(request: Request, { params }: Baglam) {
  const actorId = await currentActorId();
  if (!actorId) return json(unauthorized(), 401);
  const { id, parca } = await params;
  const n = Number(parca);
  if (!KIMLIK.test(id) || !/^\d{1,3}$/.test(parca)) {
    return json(fail('NOT_FOUND', 'Yükleme bulunamadı.'), 404);
  }

  const uzunluk = Number(request.headers.get('content-length') ?? '0');
  if (uzunluk > MASA_PARCA_BAYT) {
    return json(fail('VALIDATION_ERROR', 'Parça çok büyük.'), 413);
  }

  try {
    const govde = new Uint8Array(await request.arrayBuffer());
    if (govde.byteLength > MASA_PARCA_BAYT) {
      return json(fail('VALIDATION_ERROR', 'Parça çok büyük.'), 413);
    }
    return json(ok(await parcaYukle(id, n, govde)), 200);
  } catch (error) {
    return hataYaniti('masa:yukleme-parca', error);
  }
}
