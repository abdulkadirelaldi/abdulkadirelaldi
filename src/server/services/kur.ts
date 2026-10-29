import type { WalletUnit } from '@/types';
import { db } from '@/server/db';

import { computeBaseAmount, toMeasureString } from './_shared';

/**
 * CÜZDAN · CANLI KUR (2026-10-30).
 *
 * KAYNAK: Truncgil Finans (`finans.truncgil.com/v4/today.json`) — anahtarsız,
 * döviz VE altın (gram, has, çeyrek, yarım, tam, Cumhuriyet, Ata, 22 ayar
 * bilezik, gümüş) tek yanıtta. TCMB yalnızca döviz verdiği için seçilmedi.
 *
 * DEĞERLEME KURALI (ihtiyatlı):
 *   varlık → ALIŞ  (bozdurursan eline geçen)
 *   borç   → SATIŞ (kapatmak için ödeyeceğin)
 *
 * DAYANIKLILIK: yanıt 10 dk bellekte; her başarılı çekiş `PriceQuote`a yazılır.
 * Kaynak 5 sn'de yanıt vermez ya da bozuk dönerse SON BİLİNEN kur gösterilir
 * ve ekranda "bayat" diye söylenir — uydurma ya da sıfır kur yok.
 */

export const KUR_KAYNAGI = 'Truncgil';
const ADRES = 'https://finans.truncgil.com/v4/today.json';
const ONBELLEK_MS = 10 * 60_000;
const ZAMAN_ASIMI_MS = 5_000;

/** Birim → kaynaktaki anahtar. TRY kaynakta yok (her zaman 1). */
export const KAYNAK_ANAHTARI: Record<Exclude<WalletUnit, 'TRY'>, string> = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  GOLD_GRAM: 'GRA',
  GOLD_HAS: 'HAS',
  GOLD_QUARTER: 'CEYREKALTIN',
  GOLD_HALF: 'YARIMALTIN',
  GOLD_FULL: 'TAMALTIN',
  GOLD_REPUBLIC: 'CUMHURIYETALTINI',
  GOLD_ATA: 'ATAALTIN',
  GOLD_BANGLE_22: 'YIA',
  SILVER_GRAM: 'GUMUS',
};

export interface Kur {
  /** Alış — `"6452.3300"` (en fazla 4 ondalık, metin). */
  buying: string;
  selling: string;
}

export interface KurDurumu {
  kurlar: Partial<Record<WalletUnit, Kur>>;
  /** Kurların alındığı an (ISO). Hiç kur yoksa `null`. */
  guncellendi: string | null;
  /** Canlı kaynak bu istekte okunamadı; gösterilen son bilinen. */
  bayat: boolean;
}

/** Kaynaktaki sayıyı 4 ondalıklı metne çevirir; geçersizse `null`. SAF. */
function kurMetni(deger: unknown): string | null {
  const sayi = typeof deger === 'number' ? deger : Number(deger);
  if (!Number.isFinite(sayi) || sayi <= 0) return null;
  return sayi.toFixed(4);
}

/** Kaynak yanıtını birim → kur haritasına çevirir; eksik/bozuk birim atlanır. SAF. */
export function kaynagiCozumle(json: unknown): Partial<Record<WalletUnit, Kur>> {
  const sonuc: Partial<Record<WalletUnit, Kur>> = {};
  if (!json || typeof json !== 'object') return sonuc;
  const kayit = json as Record<string, { Buying?: unknown; Selling?: unknown } | undefined>;
  for (const [birim, anahtar] of Object.entries(KAYNAK_ANAHTARI) as [WalletUnit, string][]) {
    const satir = kayit[anahtar];
    const buying = kurMetni(satir?.Buying);
    const selling = kurMetni(satir?.Selling);
    if (buying && selling) sonuc[birim] = { buying, selling };
  }
  return sonuc;
}

let bellek: { durum: KurDurumu; zaman: number } | null = null;

type KurClient = Pick<typeof db, 'priceQuote' | '$transaction'>;

/** Güncel kurlar — bellek → canlı kaynak → son bilinen (veritabanı). */
export async function fetchKurlar(
  client: KurClient = db,
  getir: typeof fetch = fetch,
  simdi: Date = new Date(),
): Promise<KurDurumu> {
  const yas = bellek ? simdi.getTime() - bellek.zaman : Infinity;
  if (bellek && yas >= 0 && yas < ONBELLEK_MS) return bellek.durum;

  try {
    const yanit = await getir(ADRES, {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: 'no-store',
    });
    if (!yanit.ok) throw new Error(`kur kaynağı ${yanit.status}`);
    const kurlar = kaynagiCozumle(await yanit.json());
    if (Object.keys(kurlar).length === 0) throw new Error('kur kaynağı boş');

    await client.$transaction(
      (Object.entries(kurlar) as [WalletUnit, Kur][]).map(([unit, k]) =>
        client.priceQuote.upsert({
          where: { unit },
          create: {
            unit,
            buying: k.buying,
            selling: k.selling,
            source: KUR_KAYNAGI,
            fetchedAt: simdi,
          },
          update: { buying: k.buying, selling: k.selling, source: KUR_KAYNAGI, fetchedAt: simdi },
        }),
      ),
    );
    const durum: KurDurumu = { kurlar, guncellendi: simdi.toISOString(), bayat: false };
    bellek = { durum, zaman: simdi.getTime() };
    return durum;
  } catch {
    // Canlı kaynak yok — son bilinen. Bellekte TUTULMUYOR: bir sonraki istek yeniden dener.
    const satirlar = await client.priceQuote.findMany();
    const kurlar: Partial<Record<WalletUnit, Kur>> = {};
    let enYeni: Date | null = null;
    for (const s of satirlar) {
      kurlar[s.unit as WalletUnit] = {
        buying: toMeasureString(s.buying, 4) ?? '0',
        selling: toMeasureString(s.selling, 4) ?? '0',
      };
      if (!enYeni || s.fetchedAt > enYeni) enYeni = s.fetchedAt;
    }
    return { kurlar, guncellendi: enYeni?.toISOString() ?? null, bayat: true };
  }
}

/**
 * Bir miktarın TL karşılığı — kayıpsız (`computeBaseAmount`, kuruşa yarım
 * yukarı). TRY ise miktarın kendisi. Kur yoksa `null` ("bilinmiyor", 0 DEĞİL).
 */
export function tlKarsiligi(
  miktar: string,
  birim: WalletUnit,
  kurlar: KurDurumu['kurlar'],
  yon: 'alis' | 'satis',
): string | null {
  if (birim === 'TRY') return miktar;
  const kur = kurlar[birim];
  if (!kur) return null;
  return computeBaseAmount(miktar, yon === 'alis' ? kur.buying : kur.selling);
}
