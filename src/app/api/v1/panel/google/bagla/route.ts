import { NextResponse } from 'next/server';

import { currentActorId } from '@/server/actions/_shared';
import { googleAyarli, yeniDurum, yetkiAdresi } from '@/server/services/google-takvim';

import { CEREZ_YOLU, DURUM_CEREZI, oturumYok } from '../_ortak';

/** `GET /api/v1/panel/google/bagla` — Google izin ekranına yönlendirir (ADR-051). */
export async function GET(): Promise<Response> {
  const actorId = await currentActorId();
  if (!actorId) return oturumYok();
  if (!googleAyarli()) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Google istemci anahtarları tanımlı değil.' },
      },
      { status: 400 },
    );
  }
  const durum = yeniDurum();
  const yanit = NextResponse.redirect(yetkiAdresi(durum), 303);
  yanit.cookies.set(DURUM_CEREZI, durum, {
    path: CEREZ_YOLU,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });
  yanit.headers.set('Cache-Control', 'no-store');
  return yanit;
}
