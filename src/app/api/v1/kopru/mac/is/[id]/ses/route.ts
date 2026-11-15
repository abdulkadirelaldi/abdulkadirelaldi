import { guvenliHata } from '@/lib/security/guvenli-log';
import { isSesi } from '@/server/services/masa-koprusu';
import { getObjectResponse } from '@/server/storage/r2';

import { BASLIKLAR, hata, KIMLIK, kopruKimligi } from '../../../_ortak';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** `GET /api/v1/kopru/mac/is/[id]/ses` — işteki ses kaydının baytları (akışla). Yalnızca İŞLENEN iş. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const kimlik = await kopruKimligi(request);
  if ('yanit' in kimlik) return kimlik.yanit;
  const { id } = await params;
  if (!KIMLIK.test(id)) return hata(404, 'NOT_FOUND', 'İş bulunamadı.');
  try {
    const ses = await isSesi(id);
    if (!ses) return hata(404, 'NOT_FOUND', 'İş bulunamadı.');
    const r2 = await getObjectResponse(ses.key, null);
    if (!r2?.body) return hata(404, 'NOT_FOUND', 'Dosya bulunamadı.');
    const basliklar = new Headers({ ...BASLIKLAR, 'Content-Type': ses.mime });
    const uzunluk = r2.headers.get('content-length');
    if (uzunluk) basliklar.set('Content-Length', uzunluk);
    return new Response(r2.body, { status: 200, headers: basliklar });
  } catch (error) {
    guvenliHata('[mac-koprusu] ses sunulamadı:', error);
    return hata(502, 'INTERNAL_ERROR', 'Ses sunulamadı.');
  }
}
