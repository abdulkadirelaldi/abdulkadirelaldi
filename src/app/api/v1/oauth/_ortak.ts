import { NextResponse } from 'next/server';

import { OAuthHatasi } from '@/server/services/oauth';

/** OAuth uçlarının ortak yanıtları (ADR-056). Önbelleğe alınmaz; CORS açık (yalnız okuma/JSON). */
export const OAUTH_BASLIK = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
} as const;

export const jsonYanit = (veri: unknown, status = 200) =>
  NextResponse.json(veri, { status, headers: OAUTH_BASLIK });

export function oauthHata(e: unknown): NextResponse {
  if (e instanceof OAuthHatasi) {
    const status = e.kod === 'invalid_client' ? 401 : 400;
    return jsonYanit({ error: e.kod, error_description: e.message }, status);
  }
  throw e;
}

export const secenekler = () => new NextResponse(null, { status: 204, headers: OAUTH_BASLIK });
