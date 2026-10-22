import type { Metadata } from 'next';

import { absoluteUrl } from '@/server/services/_shared/site-url';

import { DILLER, OG_BOLGE, VARSAYILAN_DIL, type Dil } from './diller';
import { yol, type Sayfa } from './rotalar';

/**
 * ADR-046 — her sayfanın dil alternatifleri (hreflang) ve kanonik adresi.
 *
 * `sluglar`: detay sayfalarında her dildeki slug (çeviri anahtarıyla bulunur).
 * Karşılığı OLMAYAN dil listeye girmez — olmayan bir sayfaya hreflang vermek
 * arama motoruna 404 göstermek olurdu. `x-default` Türkçe (varsayılan dil).
 */
export function dilAlternatifleri(
  dil: Dil,
  sayfa: Sayfa,
  sluglar?: Partial<Record<Dil, string>>,
): Pick<Metadata, 'alternates' | 'openGraph'> {
  const adres = (d: Dil) => {
    if (!sluglar) return absoluteUrl(yol(d, sayfa));
    const slug = sluglar[d];
    return slug ? absoluteUrl(yol(d, sayfa, slug)) : null;
  };

  const languages: Record<string, string> = {};
  for (const d of DILLER) {
    const a = adres(d);
    if (a) languages[d] = a;
  }
  const varsayilan = adres(VARSAYILAN_DIL);
  if (varsayilan) languages['x-default'] = varsayilan;

  return {
    alternates: { canonical: adres(dil) ?? undefined, languages },
    openGraph: {
      locale: OG_BOLGE[dil],
      alternateLocale: DILLER.filter((d) => d !== dil && languages[d]).map((d) => OG_BOLGE[d]),
    },
  };
}
