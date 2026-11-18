import { db } from '@/server/db';
import { writeAuditLog } from '@/server/services/_shared';
import { istemciKaydet } from '@/server/services/oauth';

import { jsonYanit, oauthHata, secenekler } from '../_ortak';

/**
 * RFC 7591 — dinamik istemci kaydı. Herkese açık uç ama yalnızca Claude'un geri dönüş adreslerine
 * kayıt açar (`yonlendirmeKaydaUygun`). Gövde en çok 8 KB.
 */
export async function POST(request: Request): Promise<Response> {
  const metin = await request.text();
  if (metin.length > 8192) {
    return jsonYanit(
      { error: 'invalid_client_metadata', error_description: 'Gövde çok büyük.' },
      400,
    );
  }
  let govde: Record<string, unknown>;
  try {
    govde = JSON.parse(metin) as Record<string, unknown>;
  } catch {
    return jsonYanit({ error: 'invalid_client_metadata', error_description: 'JSON değil.' }, 400);
  }
  // Açık uç: saatte en çok 20 kayıt (tek kullanıcılı panel; Claude her bağlanışta bir kez kaydolur).
  const sonSaat = await db.oAuthIstemci.count({
    where: { createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
  });
  if (sonSaat >= 20) {
    return jsonYanit({ error: 'too_many_requests', error_description: 'Daha sonra deneyin.' }, 429);
  }
  try {
    const i = await istemciKaydet({
      ad: govde.client_name,
      yonlendirmeler: govde.redirect_uris,
      yetkilendirme: govde.token_endpoint_auth_method,
    });
    await writeAuditLog(
      {
        actorId: null,
        action: 'CREATE',
        entity: 'OAuthIstemci',
        entityId: i.id,
        diff: { ad: i.ad },
      },
      db,
    );
    return jsonYanit(
      {
        client_id: i.id,
        client_name: i.ad,
        redirect_uris: i.yonlendirmeler,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_id_issued_at: Math.floor(Date.now() / 1000),
      },
      201,
    );
  } catch (e) {
    return oauthHata(e);
  }
}

export const OPTIONS = secenekler;
