import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';
import { isBitir, isSonucuSchema } from '@/server/services/masa-koprusu';
import { writeAuditLog } from '@/server/services/_shared';

import { hata, KIMLIK, kopruKimligi, yanit } from '../../_ortak';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Özet Claude'da birkaç dakika sürebilir. */
export const maxDuration = 300;

const GOVDE_TAVANI = 2 * 1024 * 1024;

/**
 * `POST /api/v1/kopru/mac/is/[id]` — iş sonucu: `{ metin }` ya da `{ hata }`. Yazı kaydedilir;
 * Claude anahtarı varsa özet çıkarılır (öncesinde denetim kaydına `EXPORT`).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const kimlik = await kopruKimligi(request);
  if ('yanit' in kimlik) return kimlik.yanit;
  const { id } = await params;
  if (!KIMLIK.test(id)) return hata(404, 'NOT_FOUND', 'İş bulunamadı.');

  const ham = await request.text();
  if (ham.length > GOVDE_TAVANI) return hata(413, 'VALIDATION_ERROR', 'Yazı çok uzun.');
  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return hata(400, 'VALIDATION_ERROR', 'JSON okunamadı.');
  }
  const sonuc = isSonucuSchema.safeParse(json);
  if (!sonuc.success) return hata(422, 'VALIDATION_ERROR', 'Sonuç biçimi geçersiz.');

  try {
    const bitti = await isBitir(id, sonuc.data, {
      denetle: () =>
        writeAuditLog(
          {
            actorId: kimlik.userId,
            action: 'EXPORT',
            entity: 'MasaOgesi',
            entityId: id,
            diff: { context: 'ders-ozeti-anthropic' },
          },
          db,
        ),
    });
    if (!bitti) return hata(409, 'CONFLICT', 'Bu iş artık işlenmiyor.');
    await writeAuditLog(
      {
        actorId: kimlik.userId,
        action: 'UPDATE',
        entity: 'MasaOgesi',
        entityId: id,
        diff: { context: 'mac-yazi', durum: bitti.durum, ozet: bitti.ozet },
      },
      db,
    );
    return yanit(200, { ok: true, data: bitti });
  } catch (error) {
    guvenliHata('[mac-koprusu] iş bitirilemedi:', error);
    return hata(500, 'INTERNAL_ERROR', 'İş bitirilemedi.');
  }
}
