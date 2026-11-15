import { guvenliHata } from '@/lib/security/guvenli-log';
import type { TakvimOlusumu } from '@/lib/takvim/gorunum';
import { kiyiAraligi, kiyiOlusumu, type KopruOgesi } from '@/lib/takvim/kiyi';

import type { AppDay } from './_shared';

/**
 * KIYI MEDYA KÖPRÜSÜ (ADR-049 M3) — Kıyı Medya'nın takvimi ve özeti, SALT-OKUR. Kayıt ve
 * düzenleme Kıyı Medya'da kalır (ekip, roller); panel kopyalamaz, gösterir.
 *
 * - Sunucudan sunucuya: `X-Kopru-Token` servis anahtarı (Kıyı Medya `/api/kopru`). Anahtar
 *   tarayıcıya hiç inmez.
 * - KAPALI BAŞLAR: `KIYI_MEDYA_KOPRU_TOKEN` yoksa hiçbir istek atılmaz, ekran "bağlı değil" der.
 * - ULAŞILAMAZSA SÖYLER: zaman aşımı (5 sn) ya da hata → `durum: 'hata'`. Boş liste "veri yok"
 *   diye GÖSTERİLMEZ (ADR-049/3) — iş takvimi sessizce boş görünürse randevu kaçar.
 * - 2 dakikalık bellek önbelleği: takvimde gezinmek her seferinde Kıyı Medya'ya gitmesin.
 */

export const KIYI_MEDYA_VARSAYILAN_URL = 'https://api.kiyimedya.com/api/kopru';
const ZAMAN_ASIMI_MS = 5_000;
const ONBELLEK_MS = 2 * 60_000;

export type KiyiSonuc<T> =
  { durum: 'kapali' } | { durum: 'hata'; mesaj: string } | { durum: 'tamam'; veri: T };

interface Ayar {
  url: string;
  anahtar: string;
}

export function kiyiAyari(env: Record<string, string | undefined> = process.env): Ayar | null {
  const anahtar = env.KIYI_MEDYA_KOPRU_TOKEN?.trim();
  if (!anahtar) return null;
  const url = (env.KIYI_MEDYA_KOPRU_URL?.trim() || KIYI_MEDYA_VARSAYILAN_URL).replace(/\/+$/, '');
  return { url, anahtar };
}

export interface KiyiDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  simdi?: Date;
  /** Testte taze bir kap verilir; uygulamada süreç boyu tek kap. */
  onbellek?: Onbellek;
}

type Onbellek = Map<string, { zaman: number; veri: unknown }>;
const ONBELLEK: Onbellek = new Map();

async function getir<T>(yol: string, deps: KiyiDeps): Promise<KiyiSonuc<T>> {
  const ayar = kiyiAyari(deps.env);
  if (!ayar) return { durum: 'kapali' };
  const simdi = (deps.simdi ?? new Date()).getTime();
  const onbellek = deps.onbellek ?? ONBELLEK;
  const kayit = onbellek.get(yol);
  if (kayit && simdi - kayit.zaman < ONBELLEK_MS) return { durum: 'tamam', veri: kayit.veri as T };

  try {
    const istek = deps.fetchImpl ?? fetch;
    const yanit = await istek(`${ayar.url}${yol}`, {
      headers: { 'X-Kopru-Token': ayar.anahtar, Accept: 'application/json' },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: 'no-store',
    });
    if (!yanit.ok) {
      return {
        durum: 'hata',
        mesaj:
          yanit.status === 401 || yanit.status === 503
            ? 'Kıyı Medya köprü anahtarını kabul etmedi.'
            : `Kıyı Medya yanıt vermedi (${yanit.status}).`,
      };
    }
    const govde = (await yanit.json()) as { success?: boolean; data?: T };
    if (!govde.success || govde.data === undefined) {
      return { durum: 'hata', mesaj: 'Kıyı Medya beklenmeyen bir yanıt döndü.' };
    }
    onbellek.set(yol, { zaman: simdi, veri: govde.data });
    return { durum: 'tamam', veri: govde.data };
  } catch (error) {
    guvenliHata('[kiyi-medya] köprü okunamadı:', error instanceof Error ? error.name : error);
    return { durum: 'hata', mesaj: 'Kıyı Medya’ya ulaşılamadı.' };
  }
}

/* ===========================================================================
 * TAKVİM
 * ======================================================================== */

/** Kıyı Medya yönetim paneli — takvimde öğeye dokununca açılır. */
export function kiyiPanelAdresi(env: Record<string, string | undefined> = process.env): string {
  const site = (env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com').replace(/\/+$/, '');
  return `${site}/admin/dashboard`;
}

export async function fetchKiyiTakvim(
  bas: AppDay,
  son: AppDay,
  deps: KiyiDeps = {},
): Promise<KiyiSonuc<TakvimOlusumu[]>> {
  const { from, to } = kiyiAraligi(bas, son);
  const sonuc = await getir<KopruOgesi[]>(
    `/takvim?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    deps,
  );
  if (sonuc.durum !== 'tamam') return sonuc;
  const baglanti = kiyiPanelAdresi(deps.env);
  return {
    durum: 'tamam',
    veri: sonuc.veri
      .map((o) => kiyiOlusumu(o, baglanti))
      .filter((o): o is TakvimOlusumu => o !== null),
  };
}

/* ===========================================================================
 * ÖZET
 * ======================================================================== */

export interface KiyiOzet {
  muhasebe: {
    buAy: { gelir: number; gider: number; net: number };
    alacak: { bekleyen: number; geciken: number; gecikenSayi: number };
    borc: { bekleyen: number; geciken: number; gecikenSayi: number };
    paraBirimi: 'TRY';
  };
  acikGorev: number;
  yaklasanCekimler: {
    id: string;
    baslik: string;
    gun: string | null;
    baslangicSaat: string | null;
    musteri: string | null;
  }[];
}

export async function fetchKiyiOzet(deps: KiyiDeps = {}): Promise<KiyiSonuc<KiyiOzet>> {
  return getir<KiyiOzet>('/ozet', deps);
}
