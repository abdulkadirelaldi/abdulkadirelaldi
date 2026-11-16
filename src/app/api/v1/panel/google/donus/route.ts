import { timingSafeEqual } from 'node:crypto';

import { after } from 'next/server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { currentActorId } from '@/server/actions/_shared';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/services/_shared';
import { baglantiKur, bekleyenleriEsitle, googleAyarli } from '@/server/services/google-takvim';

import { ayarlaraDon, DURUM_CEREZI, oturumYok } from '../_ortak';

function esit(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * `GET /api/v1/panel/google/donus` — Google izin ekranının dönüşü (ADR-051). Durum çerezi
 * eşleşmeli; kod jetona çevrilir, şifreli saklanır, tarihli görevler arka planda yazılır.
 */
export async function GET(request: Request): Promise<Response> {
  const actorId = await currentActorId();
  if (!actorId) return oturumYok();
  if (!googleAyarli()) return ayarlaraDon(request, 'hata');

  const q = new URL(request.url).searchParams;
  if (q.get('error')) return ayarlaraDon(request, 'iptal');

  const kod = q.get('code');
  const durum = q.get('state') ?? '';
  const cerez = request.headers
    .get('cookie')
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${DURUM_CEREZI}=`))
    ?.slice(DURUM_CEREZI.length + 1);
  if (!kod || !cerez || !esit(decodeURIComponent(cerez), durum)) {
    return ayarlaraDon(request, 'hata');
  }

  try {
    await baglantiKur(actorId, kod);
  } catch (e) {
    guvenliHata('[google] bağlanma:', e instanceof Error ? e.message : String(e));
    return ayarlaraDon(request, 'hata');
  }
  await writeAuditLog(
    { actorId, action: 'CREATE', entity: 'GoogleBaglantisi', entityId: actorId, diff: {} },
    db,
  );
  after(() =>
    bekleyenleriEsitle(500).catch((e) => guvenliHata('[google] ilk eşitleme:', String(e))),
  );
  return ayarlaraDon(request, 'bagli');
}
