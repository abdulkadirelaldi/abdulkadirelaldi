import { notFound } from 'next/navigation';

import { onekliDilMi } from '@/i18n/rotalar';

/**
 * ADR-046 — `[dil]` parametresinin doğrulaması. Middleware `/en/projects`i
 * içeride `/en/projeler`e yeniden yazar; ama `[dil]` segmenti doğrudan da
 * çağrılabilir (`/xx/projeler`). Bilinen önekli bir dil değilse 404 —
 * `tr` de dahil: Türkçe öneksiz yaşar, `/tr/...` middleware'de yönlendirilir.
 */
export async function dilParametresi(params: Promise<{ dil: string }>) {
  const { dil } = await params;
  if (!onekliDilMi(dil)) notFound();
  return dil;
}
