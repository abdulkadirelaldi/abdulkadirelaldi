import { gorevSirala } from '@/lib/gorev/bicim';
import { addAppDays, type AppDay } from '@/server/services/_shared/app-date';
import type { IsAlani } from '@/types';

/**
 * SOKAK (ADR-057) — işlerin dükkân görünümü. Saf; sunucu ve istemci aynı sonucu üretir.
 *
 * Dükkân ayrı bir kayıt DEĞİL: Kıyı Medya işlerinin etiketinden (müşteri adı) türetilir. Etiketsiz
 * ya da "Kıyı Medya" etiketli Kıyı işleri ajansın OFİS binasına, diğer alanların işleri kendi
 * binasına (Okul, Spectraloop, Ev) düşer. Böylece Claude'un `is_ekle` aracı ve mevcut form
 * değişmeden çalışır; yeni müşteri, etiketli ilk işiyle sokağa kendiliğinden eklenir.
 *
 * Etiket eşleşmesi büyük/küçük harf ve boşluk duyarsız ("garage" = "Garage "); dükkânın adı ilk
 * görülen yazımdır.
 */

export type Kapsam = { tur: 'dukkan'; etiket: string } | { tur: 'bina'; alan: IsAlani };

export type DikkatDurumu = 'gecikmis' | 'bugun' | 'yakin';

type SokakGorevi = {
  id: string;
  baslik: string;
  alan: IsAlani;
  etiket: string | null;
  teslimGun: AppDay | null;
  teslimDakika: number | null;
};

export interface PanoIsi {
  id: string;
  anahtar: string;
  baslik: string;
  teslimGun: AppDay;
  teslimDakika: number | null;
  yer: string;
  renk: string;
  href: string;
}

export interface Dukkan {
  anahtar: string;
  ad: string;
  tur: string;
  href: string;
  renk: string;
  acik: number;
  sayi: Record<DikkatDurumu, number>;
  /** En acil durum; yoksa `null` (dükkân sakin). */
  durum: DikkatDurumu | null;
  /** Vitrinde görünen ilk iki açık iş, teslim sırasıyla. */
  vitrin: SokakGorevi[];
  /** Son günlerde biten iş sayısı. */
  biten: number;
}

export interface Sokak {
  cadde: Dukkan[];
  arka: Dukkan[];
  pano: Record<DikkatDurumu, PanoIsi[]>;
  toplamAcik: number;
}

/** Ajansın kendi etiketi — bu etiketli Kıyı işleri dükkân değil, ofis. */
const OFIS_ETIKETI = 'kıyı medya';

/** Arka sokaktaki binalar: sabit sıra, sabit renk. */
const BINALAR: readonly { alan: IsAlani; ad: string; tur: string; renk: string }[] = [
  { alan: 'KIYI_MEDYA', ad: 'Kıyı Medya', tur: 'Ofis', renk: '#7756ff' },
  { alan: 'OKUL', ad: 'Okul', tur: 'Samsun Üni', renk: '#5cc8b8' },
  { alan: 'SPECTRALOOP', ad: 'Spectraloop', tur: 'TEKNOFEST', renk: '#f09a62' },
  { alan: 'KISISEL', ad: 'Ev', tur: 'Kişisel', renk: '#a3a3b8' },
];

/** Dükkân tenteleri: koyu ve açık temada okunan, birbirinden ayrışan sakin tonlar. */
const TENTELER = [
  '#e0a458',
  '#6fbf73',
  '#5aa9d6',
  '#d9798a',
  '#b98ee0',
  '#d4b44a',
  '#7f98b3',
  '#8f7dff',
  '#d98f5a',
  '#4fb3a3',
] as const;

const bicimle = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');

/** Sokakta yeri olmayan dükkânın (adresle doğrudan açılan) rengi: addan, kararlı. */
export function tenteRengi(ad: string): string {
  let h = 0;
  for (const c of bicimle(ad)) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return TENTELER[h % TENTELER.length]!;
}

export function gorevKapsami(g: Pick<SokakGorevi, 'alan' | 'etiket'>): Kapsam {
  const etiket = g.etiket?.trim();
  if (g.alan === 'KIYI_MEDYA' && etiket && bicimle(etiket) !== OFIS_ETIKETI) {
    return { tur: 'dukkan', etiket };
  }
  return { tur: 'bina', alan: g.alan };
}

export function kapsamaUyar(g: Pick<SokakGorevi, 'alan' | 'etiket'>, k: Kapsam): boolean {
  const gk = gorevKapsami(g);
  if (k.tur === 'bina') return gk.tur === 'bina' && gk.alan === k.alan;
  return gk.tur === 'dukkan' && bicimle(gk.etiket) === bicimle(k.etiket);
}

export function kapsamAdresi(k: Kapsam): string {
  return k.tur === 'dukkan'
    ? `/panel/isler?dukkan=${encodeURIComponent(k.etiket)}`
    : `/panel/isler?bina=${k.alan}`;
}

/** Adres parametrelerinden kapsam — tanınmayan değer `null` (sokak gösterilir). */
export function kapsamCoz(p: {
  dukkan?: string | string[];
  bina?: string | string[];
}): Kapsam | null {
  const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const dukkan = tek(p.dukkan)?.trim();
  if (dukkan && dukkan.length <= 40) {
    return bicimle(dukkan) === OFIS_ETIKETI
      ? { tur: 'bina', alan: 'KIYI_MEDYA' }
      : { tur: 'dukkan', etiket: dukkan };
  }
  const bina = BINALAR.find((b) => b.alan === tek(p.bina));
  return bina ? { tur: 'bina', alan: bina.alan } : null;
}

/** Kapsamın tabelası: ad, tür, renk. Dükkân adı işlerdeki yazımla gelir. */
export function kapsamTabelasi(k: Kapsam): { ad: string; tur: string; renk: string } {
  if (k.tur === 'dukkan')
    return { ad: k.etiket, tur: 'Kıyı müşterisi', renk: tenteRengi(k.etiket) };
  const b = BINALAR.find((x) => x.alan === k.alan)!;
  return { ad: b.ad, tur: b.tur, renk: b.renk };
}

function dikkat(g: SokakGorevi, bugun: AppDay): DikkatDurumu | null {
  if (g.teslimGun === null) return null;
  if (g.teslimGun < bugun) return 'gecikmis';
  if (g.teslimGun === bugun) return 'bugun';
  return g.teslimGun <= addAppDays(bugun, 2) ? 'yakin' : null;
}

/**
 * Açık ve son biten işlerden sokağı kurar. Caddede dükkânlar ada göre (yerleri değişmesin diye
 * durumlarına göre değil); arka sokakta dört bina hep durur.
 */
export function sokakKur(
  acik: readonly SokakGorevi[],
  bitenler: readonly Pick<SokakGorevi, 'alan' | 'etiket'>[],
  bugun: AppDay,
): Sokak {
  const dukkanlar = new Map<string, Dukkan & { isler: SokakGorevi[] }>();
  const pano: Sokak['pano'] = { gecikmis: [], bugun: [], yakin: [] };

  const yer = (g: Pick<SokakGorevi, 'alan' | 'etiket'>) => {
    const k = gorevKapsami(g);
    const anahtar = k.tur === 'dukkan' ? `d:${bicimle(k.etiket)}` : `b:${k.alan}`;
    let d = dukkanlar.get(anahtar);
    if (!d) {
      const t = kapsamTabelasi(k);
      d = {
        anahtar,
        ...t,
        href: kapsamAdresi(k),
        acik: 0,
        sayi: { gecikmis: 0, bugun: 0, yakin: 0 },
        durum: null,
        vitrin: [],
        biten: 0,
        isler: [],
      };
      dukkanlar.set(anahtar, d);
    }
    return d;
  };

  for (const b of BINALAR) yer({ alan: b.alan, etiket: null });
  for (const g of bitenler) yer(g).biten++;
  for (const g of acik) {
    const d = yer(g);
    d.acik++;
    d.isler.push(g);
    const durum = dikkat(g, bugun);
    if (durum && g.teslimGun) {
      d.sayi[durum]++;
      pano[durum].push({
        id: g.id,
        baslik: g.baslik,
        teslimGun: g.teslimGun,
        teslimDakika: g.teslimDakika,
        anahtar: d.anahtar,
        yer: d.ad,
        renk: d.renk,
        href: d.href,
      });
    }
  }

  const bitir = ({ isler, ...d }: Dukkan & { isler: SokakGorevi[] }): Dukkan => ({
    ...d,
    durum: d.sayi.gecikmis ? 'gecikmis' : d.sayi.bugun ? 'bugun' : d.sayi.yakin ? 'yakin' : null,
    vitrin: [...isler].sort(gorevSirala).slice(0, 2),
  });
  const hepsi = [...dukkanlar.values()].map(bitir);
  // Tente rengi caddedeki sıradan: on dükkâna kadar hepsi ayrı renk (addan türetmek çakışıyordu).
  const cadde = hepsi
    .filter((d) => d.anahtar.startsWith('d:'))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    .map((d, i) => ({ ...d, renk: TENTELER[i % TENTELER.length]! }));
  const renkler = new Map(cadde.map((d) => [d.anahtar, d.renk]));
  for (const liste of Object.values(pano)) {
    liste.sort(gorevSirala);
    for (const p of liste) p.renk = renkler.get(p.anahtar) ?? p.renk;
  }

  return {
    cadde,
    arka: BINALAR.map((b) => hepsi.find((d) => d.anahtar === `b:${b.alan}`)!),
    pano,
    toplamAcik: acik.length,
  };
}
