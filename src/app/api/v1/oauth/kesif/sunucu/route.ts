import { KAPSAM, siteAdresi } from '@/lib/oauth/kurallar';

import { jsonYanit, secenekler } from '../../_ortak';

/** RFC 8414 — yetkilendirme sunucusu metadata'sı (`/.well-known/oauth-authorization-server`). */
export function GET(): Response {
  const s = siteAdresi();
  return jsonYanit({
    issuer: s,
    authorization_endpoint: `${s}/panel/oauth/yetki`,
    token_endpoint: `${s}/api/v1/oauth/token`,
    registration_endpoint: `${s}/api/v1/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [KAPSAM],
  });
}

export const OPTIONS = secenekler;
