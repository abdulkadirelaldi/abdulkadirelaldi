import { guvenliHata } from '@/lib/security/guvenli-log';
import { isAl } from '@/server/services/masa-koprusu';

import { hata, kopruKimligi, yanit } from '../_ortak';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** `POST /api/v1/kopru/mac/is` — sıradaki ses kaydını ALIR (yoksa `data: null`). */
export async function POST(request: Request): Promise<Response> {
  const kimlik = await kopruKimligi(request);
  if ('yanit' in kimlik) return kimlik.yanit;
  try {
    const is = await isAl();
    return yanit(200, {
      ok: true,
      data: is && {
        ...is,
        indir: `/api/v1/kopru/mac/is/${is.id}/ses`,
        bitir: `/api/v1/kopru/mac/is/${is.id}`,
      },
    });
  } catch (error) {
    guvenliHata('[mac-koprusu] iş alınamadı:', error);
    return hata(500, 'INTERNAL_ERROR', 'İş alınamadı.');
  }
}
