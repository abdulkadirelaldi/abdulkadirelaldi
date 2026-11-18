import { KAPSAM, mcpKaynagi, siteAdresi } from '@/lib/oauth/kurallar';

import { jsonYanit, secenekler } from '../../_ortak';

/** RFC 9728 — korunan kaynak metadata'sı (`/.well-known/oauth-protected-resource`). */
export function GET(): Response {
  return jsonYanit({
    resource: mcpKaynagi(),
    authorization_servers: [siteAdresi()],
    scopes_supported: [KAPSAM],
    bearer_methods_supported: ['header'],
    resource_name: 'Abdulkadir Elaldı — Panel',
  });
}

export const OPTIONS = secenekler;
