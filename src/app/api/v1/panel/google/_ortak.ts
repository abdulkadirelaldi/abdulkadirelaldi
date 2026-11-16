import { NextResponse } from 'next/server';

/**
 * Google Takvim OAuth uçlarının ortak parçaları (ADR-051).
 *
 * DURUM ÇEREZİ: izin ekranına giderken rastgele `state` hem adrese hem httpOnly çereze yazılır;
 * dönüşte ikisi eşleşmezse istek reddedilir (CSRF — başkasının kodu bu hesaba bağlanamaz).
 * Yol `/api/v1/panel/google` ile sınırlı, 10 dakika ömürlü, `SameSite=Lax` (Google'dan dönüş
 * üst düzey GET gezinmesi — Lax çerezi taşır).
 */
export const DURUM_CEREZI = 'ae_google_durum';
export const CEREZ_YOLU = '/api/v1/panel/google';

export function ayarlaraDon(request: Request, durum: 'bagli' | 'hata' | 'iptal'): NextResponse {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const yanit = NextResponse.redirect(new URL(`/panel/ayarlar/google?durum=${durum}`, site), 303);
  yanit.cookies.set(DURUM_CEREZI, '', { path: CEREZ_YOLU, maxAge: 0 });
  return yanit;
}

export const oturumYok = () =>
  NextResponse.json(
    { ok: false, error: { code: 'UNAUTHORIZED', message: 'Oturum gerekli.' } },
    { status: 401 },
  );
