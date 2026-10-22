import { DIL_BASLIGI, dilMi, ONEKLI_DILLER, VARSAYILAN_DIL, type Dil } from './diller';

/**
 * ADR-046 — YERELLEŞTİRİLMİŞ ADRESLER. Saf modül: middleware, dil seçici,
 * hreflang ve site haritası AYNI tabloyu okur; bir adres iki yerde
 * tanımlanmaz.
 *
 * İÇ YAPI: sayfalar `app/(public)/…` altında TÜRKÇE adlarla bir kez yazılı.
 * Önekli diller `app/(public)/[dil]/…` altındaki ince sarmalayıcılara düşer;
 * middleware `/en/projects` adresini içeride `/en/projeler`e YENİDEN YAZAR
 * (rewrite — ziyaretçinin adres çubuğu değişmez).
 */

export const SAYFALAR = [
  'anasayfa',
  'hakkimda',
  'projeler',
  'blog',
  'hizmetler',
  'iletisim',
  'cv',
] as const;
export type Sayfa = (typeof SAYFALAR)[number];

/** Sayfa → dile göre adres parçası. Türkçe parça aynı zamanda İÇ rota adıdır. */
export const PARCA: Record<Sayfa, Record<Dil, string>> = {
  anasayfa: { tr: '', en: '', de: '' },
  hakkimda: { tr: 'hakkimda', en: 'about', de: 'ueber-mich' },
  projeler: { tr: 'projeler', en: 'projects', de: 'projekte' },
  blog: { tr: 'blog', en: 'blog', de: 'blog' },
  hizmetler: { tr: 'hizmetler', en: 'services', de: 'leistungen' },
  iletisim: { tr: 'iletisim', en: 'contact', de: 'kontakt' },
  cv: { tr: 'cv', en: 'cv', de: 'lebenslauf' },
};

/** Ziyaretçiye görünen adres: `yol('de', 'projeler', 'x')` → `/de/projekte/x`. */
export function yol(dil: Dil, sayfa: Sayfa, slug?: string): string {
  const parcalar = [dil === VARSAYILAN_DIL ? '' : dil, PARCA[sayfa][dil], slug ?? ''].filter(
    Boolean,
  );
  return `/${parcalar.join('/')}`;
}

/** Sorgu dizesiyle birlikte (süzgeç bağlantıları için). */
export function yolSorgulu(
  dil: Dil,
  sayfa: Sayfa,
  sorgu: Record<string, string | undefined>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sorgu)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${yol(dil, sayfa)}?${s}` : yol(dil, sayfa);
}

export type Cozum =
  /** Public sayfa: hangi dil, hangi sayfa; `icYol` önekli dillerde rewrite hedefi. */
  | { tur: 'sayfa'; dil: Dil; sayfa: Sayfa; slug?: string; icYol: string }
  /** Kalıcı yönlendirme (308): kanonik olmayan bir yazım. */
  | { tur: 'yonlendir'; hedef: string }
  /** Public yerelleştirilmiş bir adres değil — dokunma. */
  | { tur: 'disarida' };

function sayfaBul(dil: Dil, parca: string): Sayfa | undefined {
  return SAYFALAR.find((s) => s !== 'anasayfa' && PARCA[s][dil] === parca);
}

/**
 * Adres çözümleme — middleware her public istekte çağırır.
 *
 * KANONİK TEK ADRES: aynı içeriğe giden ikinci bir yazım yönlendirilir —
 * `/tr/projeler` → `/projeler`, `/en/projeler` → `/en/projects`. Yinelenen
 * adresler arama motorunda içeriği böler.
 */
export function cozumle(pathname: string): Cozum {
  const parcalar = pathname.split('/').filter(Boolean);
  const [ilk, ikinci, ...kalan] = parcalar;

  if (ilk === VARSAYILAN_DIL) {
    // `/tr/...` → öneksiz Türkçe karşılık.
    return { tur: 'yonlendir', hedef: `/${[ikinci, ...kalan].filter(Boolean).join('/')}` };
  }

  if (dilMi(ilk)) {
    const dil = ilk;
    if (!ikinci) return { tur: 'sayfa', dil, sayfa: 'anasayfa', icYol: `/${dil}` };

    const sayfa = sayfaBul(dil, ikinci);
    if (sayfa) {
      const slug = kalan[0];
      if (kalan.length > 1) return { tur: 'disarida' };
      return {
        tur: 'sayfa',
        dil,
        sayfa,
        ...(slug ? { slug } : {}),
        icYol: `/${[dil, PARCA[sayfa][VARSAYILAN_DIL], ...kalan].join('/')}`,
      };
    }

    // İç (Türkçe) adla gelinmişse yerelleştirilmiş kanonik adrese.
    const icAdla = sayfaBul(VARSAYILAN_DIL, ikinci);
    if (icAdla && PARCA[icAdla][dil] !== ikinci) {
      return { tur: 'yonlendir', hedef: `/${[dil, PARCA[icAdla][dil], ...kalan].join('/')}` };
    }
    return { tur: 'disarida' };
  }

  // Öneksiz: Türkçe.
  if (!ilk) return { tur: 'sayfa', dil: VARSAYILAN_DIL, sayfa: 'anasayfa', icYol: '/' };
  const sayfa = sayfaBul(VARSAYILAN_DIL, ilk);
  if (!sayfa || parcalar.length > 2) return { tur: 'disarida' };
  return {
    tur: 'sayfa',
    dil: VARSAYILAN_DIL,
    sayfa,
    ...(ikinci ? { slug: ikinci } : {}),
    icYol: pathname,
  };
}

/** Önekli dillerin listesi — `[dil]` sarmalayıcılarının doğrulaması için. */
export function onekliDilMi(deger: string): deger is Exclude<Dil, 'tr'> {
  return (ONEKLI_DILLER as string[]).includes(deger);
}

export { DIL_BASLIGI };
