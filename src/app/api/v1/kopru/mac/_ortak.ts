import { NextResponse } from 'next/server';

import { extractClientIp } from '@/server/auth/credentials';
import { kopruAnahtariDogrula } from '@/server/services/masa-koprusu';

/**
 * MAC KÖPRÜSÜ UÇLARI (ADR-049 M6) — ortak: `Authorization: Bearer aemk_…` (oturum değil, cihaz
 * anahtarı; `/api/v1/saglik/olcum` ile aynı kalıp) + IP başına dakikada 60 istek.
 */
const istekler = new Map<string, { sayi: number; bas: number }>();
const DAKIKA_TAVANI = 60;

export const BASLIKLAR = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

export const yanit = (durum: number, govde: unknown) =>
  NextResponse.json(govde, { status: durum, headers: BASLIKLAR });
export const hata = (durum: number, code: string, message: string) =>
  yanit(durum, { ok: false, error: { code, message } });

/** Kimlik: sahibin kullanıcı kimliği ya da hazır hata yanıtı. */
export async function kopruKimligi(
  request: Request,
): Promise<{ userId: string } | { yanit: Response }> {
  const ip = extractClientIp(request);
  const simdi = Date.now();
  if (istekler.size > 1_000) istekler.clear();
  const k = istekler.get(ip);
  if (!k || simdi - k.bas > 60_000) istekler.set(ip, { sayi: 1, bas: simdi });
  else if (++k.sayi > DAKIKA_TAVANI)
    return { yanit: hata(429, 'RATE_LIMITED', 'Çok fazla istek.') };

  const anahtar = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const userId = anahtar ? await kopruAnahtariDogrula(anahtar) : null;
  if (!userId) return { yanit: hata(401, 'UNAUTHORIZED', 'Anahtar geçersiz.') };
  return { userId };
}

export const KIMLIK = /^[A-Za-z0-9_-]{1,64}$/;
