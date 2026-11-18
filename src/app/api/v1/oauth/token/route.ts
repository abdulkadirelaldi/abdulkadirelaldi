import { jetonYenile, kodTakasEt } from '@/server/services/oauth';

import { jsonYanit, oauthHata, secenekler } from '../_ortak';

/** OAuth 2.1 jeton ucu (`application/x-www-form-urlencoded`): yetki kodu takası ve yenileme. */
export async function POST(request: Request): Promise<Response> {
  const tur = request.headers.get('content-type') ?? '';
  if (!tur.includes('application/x-www-form-urlencoded')) {
    return jsonYanit(
      { error: 'invalid_request', error_description: 'Form gövdesi bekleniyor.' },
      400,
    );
  }
  const f = new URLSearchParams(await request.text());
  const al = (k: string) => f.get(k) ?? '';
  try {
    switch (al('grant_type')) {
      case 'authorization_code':
        return jsonYanit(
          await kodTakasEt({
            kod: al('code'),
            istemciId: al('client_id'),
            yonlendirme: al('redirect_uri'),
            dogrulayici: al('code_verifier'),
            kaynak: f.get('resource'),
          }),
        );
      case 'refresh_token':
        return jsonYanit(
          await jetonYenile({
            yenileme: al('refresh_token'),
            istemciId: al('client_id'),
            kaynak: f.get('resource'),
          }),
        );
      default:
        return jsonYanit(
          { error: 'unsupported_grant_type', error_description: 'Desteklenmeyen grant_type.' },
          400,
        );
    }
  } catch (e) {
    return oauthHata(e);
  }
}

export const OPTIONS = secenekler;
