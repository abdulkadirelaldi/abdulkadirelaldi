import { randomBytes } from 'node:crypto';

import { ALANLAR } from '@/lib/gorev/bicim';
import { db } from '@/server/db';
import { decryptSecret, encryptSecret } from '@/server/auth/totp';
import type { IsAlani } from '@/types';

import { addAppDays, appWallClockInstant, dateToAppDay, type AppDay } from './_shared';

/**
 * GOOGLE TAKVİM (ADR-051) — İşler'in tarihli görevleri sahibinin Google Takvim'ine (birincil
 * takvim) etkinlik olarak yazılır; alarmlar Google'dan çalar.
 *
 * TEK YÖN: panel → Google. Google'da etkinliği elle değiştirmek görevi değiştirmez; görev bir
 * sonraki değişikliğinde etkinliği yeniden yazar. Tek doğruluk kaynağı görev.
 *
 * KUYRUK: her görev yazımı `googleBekliyor = true` yapar; eşitleme isteğin ardından (`after`) ve
 * 5 dakikada bir zamanlayıcıda koşar. Google erişilemezse görev bekler, veri kaybolmaz. Bağlantı
 * yoksa hiçbir şey gönderilmez; bağlanınca tarihli bütün görevler bir kez yazılır.
 *
 * JETON: yenileme jetonu şifreli (`encryptSecret`, TOTP ile aynı anahtar). Erişim jetonu yalnızca
 * bellekte, süresinden 60 sn önce yenilenir.
 *
 * Bağımlılık yok: OAuth ve Calendar REST uçları `fetch` ile.
 */

const YETKI_ADRESI = 'https://accounts.google.com/o/oauth2/v2/auth';
const JETON_ADRESI = 'https://oauth2.googleapis.com/token';
const IPTAL_ADRESI = 'https://oauth2.googleapis.com/revoke';
const TAKVIM_ADRESI = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const GOOGLE_KAPSAMI = 'https://www.googleapis.com/auth/calendar.events';
const ZAMAN_ASIMI_MS = 10_000;
/** Saatli görevin takvimdeki kutusu. */
const SAATLI_SURE_DK = 30;

export class GoogleHatasi extends Error {
  constructor(
    message: string,
    /** Yenileme jetonu geçersiz — yeniden bağlanmak gerekir. */
    readonly baglantiGecersiz = false,
  ) {
    super(message);
    this.name = 'GoogleHatasi';
  }
}

/* ===========================================================================
 * AYAR
 * ======================================================================== */

export function googleAyarli(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function donusAdresi(): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${site}/api/v1/panel/google/donus`;
}

export function yeniDurum(): string {
  return randomBytes(24).toString('base64url');
}

/** Google'ın izin ekranı. `prompt=consent`: yenileme jetonu HER bağlanışta yeniden verilsin. */
export function yetkiAdresi(durum: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: donusAdresi(),
    response_type: 'code',
    scope: GOOGLE_KAPSAMI,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: durum,
  });
  return `${YETKI_ADRESI}?${q}`;
}

/* ===========================================================================
 * JETON
 * ======================================================================== */

let onbellek: { jeton: string; bitis: number } | null = null;

async function jetonIstegi(govde: Record<string, string>) {
  const yanit = await fetch(JETON_ADRESI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      ...govde,
    }),
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
  });
  const veri = (await yanit.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!yanit.ok || !veri.access_token) {
    throw new GoogleHatasi(
      veri.error === 'invalid_grant'
        ? 'Google bağlantısı geçersiz — yeniden bağlan.'
        : `Google jeton hatası (${yanit.status}${veri.error ? `: ${veri.error}` : ''}).`,
      veri.error === 'invalid_grant',
    );
  }
  onbellek = {
    jeton: veri.access_token,
    bitis: Date.now() + Math.max(0, (veri.expires_in ?? 3600) - 60) * 1000,
  };
  return veri;
}

/** İzin ekranından dönen kodu jetona çevirir ve bağlantıyı kaydeder. */
export async function baglantiKur(userId: string, kod: string, client = db): Promise<void> {
  const veri = await jetonIstegi({
    code: kod,
    grant_type: 'authorization_code',
    redirect_uri: donusAdresi(),
  });
  if (!veri.refresh_token) {
    throw new GoogleHatasi('Google yenileme jetonu vermedi. Yeniden bağlanmayı dene.');
  }
  const yenilemeJetonu = encryptSecret(veri.refresh_token);
  await client.googleBaglantisi.upsert({
    where: { userId },
    create: { userId, yenilemeJetonu },
    update: { yenilemeJetonu, sonHata: null },
  });
  // Bağlanınca tarihli bütün görevler (açık ya da bitmiş) bir kez yazılır.
  await client.gorev.updateMany({
    where: { teslimGun: { not: null } },
    data: { googleBekliyor: true },
  });
}

async function baglanti(client = db) {
  return client.googleBaglantisi.findFirst();
}

async function erisimJetonu(client = db): Promise<string> {
  if (onbellek && onbellek.bitis > Date.now()) return onbellek.jeton;
  const b = await baglanti(client);
  if (!b) throw new GoogleHatasi('Google Takvim bağlı değil.');
  const veri = await jetonIstegi({
    refresh_token: decryptSecret(b.yenilemeJetonu),
    grant_type: 'refresh_token',
  });
  return veri.access_token!;
}

/** Bağlantıyı keser: Google'daki izni iptal etmeyi dener, kaydı siler. Etkinlikler kalır. */
export async function baglantiKes(client = db): Promise<void> {
  const b = await baglanti(client);
  if (!b) return;
  try {
    await fetch(IPTAL_ADRESI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: decryptSecret(b.yenilemeJetonu) }),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
  } catch {
    // İptal edilemese de kayıt silinir; jeton artık hiçbir yerde kullanılmaz.
  }
  await client.googleBaglantisi.delete({ where: { userId: b.userId } });
  onbellek = null;
}

export interface GoogleDurumu {
  ayarli: boolean;
  bagli: boolean;
  sonEsitleme: string | null;
  sonHata: string | null;
  bekleyen: number;
}

export async function fetchGoogleDurumu(client = db): Promise<GoogleDurumu> {
  const [b, bekleyen] = await Promise.all([
    baglanti(client),
    client.gorev.count({ where: { googleBekliyor: true } }),
  ]);
  return {
    ayarli: googleAyarli(),
    bagli: b !== null,
    sonEsitleme: b?.sonEsitleme?.toISOString() ?? null,
    sonHata: b?.sonHata ?? null,
    bekleyen: b ? bekleyen : 0,
  };
}

/* ===========================================================================
 * ETKİNLİK
 * ======================================================================== */

/** Google'ın etkinlik renkleri (colorId) — alanın paneldeki rengine en yakını. */
const ALAN_RENGI: Record<IsAlani, string> = {
  KIYI_MEDYA: '7',
  OKUL: '3',
  SPECTRALOOP: '6',
  KISISEL: '2',
};

export interface EtkinlikKaynagi {
  id: string;
  baslik: string;
  not: string | null;
  alan: IsAlani;
  etiket: string | null;
  teslimGun: AppDay;
  teslimDakika: number | null;
  bitti: boolean;
}

/**
 * Görev → Google etkinliği (saf). Alarmlar: saatli 1 gün ve 2 saat önce; gün boyu bir önceki gün
 * 09:00 (gün başından 15 saat önce). Biten görev "✓" alır ve alarmları kalkar.
 */
export function etkinlikGovdesi(g: EtkinlikKaynagi) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const zaman =
    g.teslimDakika === null
      ? {
          start: { date: g.teslimGun },
          end: { date: addAppDays(g.teslimGun, 1) },
        }
      : (() => {
          const bas = appWallClockInstant(g.teslimGun, g.teslimDakika);
          return {
            start: { dateTime: bas.toISOString(), timeZone: 'Europe/Istanbul' },
            end: {
              dateTime: new Date(bas.getTime() + SAATLI_SURE_DK * 60_000).toISOString(),
              timeZone: 'Europe/Istanbul',
            },
          };
        })();
  const alarmlar = g.bitti
    ? []
    : g.teslimDakika === null
      ? [{ method: 'popup', minutes: 15 * 60 }]
      : [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 120 },
        ];
  return {
    summary: `${g.bitti ? '✓ ' : ''}${g.baslik}`,
    description: [
      `${ALANLAR[g.alan].ad}${g.etiket ? ` · ${g.etiket}` : ''}`,
      g.not,
      site ? `${site}/panel/isler` : null,
    ]
      .filter(Boolean)
      .join('\n\n'),
    colorId: ALAN_RENGI[g.alan],
    transparency: 'transparent',
    reminders: { useDefault: false, overrides: alarmlar },
    extendedProperties: { private: { aeGorevId: g.id } },
    ...zaman,
  };
}

async function takvimIstegi(
  yontem: 'POST' | 'PUT' | 'DELETE',
  yol: string,
  govde: unknown,
  client = db,
): Promise<{ durum: number; veri: { id?: string } }> {
  const jeton = await erisimJetonu(client);
  const yanit = await fetch(`${TAKVIM_ADRESI}${yol}`, {
    method: yontem,
    headers: {
      Authorization: `Bearer ${jeton}`,
      ...(govde ? { 'Content-Type': 'application/json' } : {}),
    },
    body: govde ? JSON.stringify(govde) : undefined,
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
  });
  if (yanit.status === 401) onbellek = null;
  const veri = (await yanit.json().catch(() => ({}))) as { id?: string };
  return { durum: yanit.status, veri };
}

/** Etkinliği siler; zaten yoksa (404/410) başarılı sayılır. */
export async function etkinlikSil(etkinlikId: string, client = db): Promise<void> {
  if (!(await baglanti(client))) return;
  const { durum } = await takvimIstegi(
    'DELETE',
    `/${encodeURIComponent(etkinlikId)}`,
    null,
    client,
  );
  if (durum >= 300 && durum !== 404 && durum !== 410) {
    throw new GoogleHatasi(`Google etkinliği silinemedi (${durum}).`);
  }
}

/**
 * Tek görevi Google'a yazar. Tarihsizse etkinliği kaldırır; etkinlik Google'da silinmişse
 * (404/410) yenisini açar.
 */
export async function gorevEsitle(id: string, client = db): Promise<void> {
  const g = await client.gorev.findUnique({ where: { id } });
  if (!g) return;
  if (!(await baglanti(client))) return;

  if (g.teslimGun === null) {
    if (g.googleEtkinlikId) await etkinlikSil(g.googleEtkinlikId, client);
    await client.gorev.update({
      where: { id },
      data: { googleEtkinlikId: null, googleBekliyor: false },
    });
    return;
  }

  const govde = etkinlikGovdesi({
    id: g.id,
    baslik: g.baslik,
    not: g.not,
    alan: g.alan,
    etiket: g.etiket,
    teslimGun: dateToAppDay(g.teslimGun),
    teslimDakika: g.teslimDakika,
    bitti: g.tamamlandiAt !== null,
  });

  let etkinlikId = g.googleEtkinlikId;
  if (etkinlikId) {
    const { durum } = await takvimIstegi(
      'PUT',
      `/${encodeURIComponent(etkinlikId)}`,
      govde,
      client,
    );
    if (durum === 404 || durum === 410) etkinlikId = null;
    else if (durum >= 300) throw new GoogleHatasi(`Google etkinliği güncellenemedi (${durum}).`);
  }
  if (!etkinlikId) {
    const { durum, veri } = await takvimIstegi('POST', '', govde, client);
    if (durum >= 300 || !veri.id) throw new GoogleHatasi(`Google etkinliği açılamadı (${durum}).`);
    etkinlikId = veri.id;
  }
  // Bekleme yalnızca okunan sürüm hâlâ güncelse düşer: arada yeni düzenleme geldiyse görev
  // beklemede kalır ve sonraki tur yeniden yazar. Etkinlik kimliği her durumda kaydedilir
  // (yoksa sonraki tur ikinci bir etkinlik açardı).
  const { count } = await client.gorev.updateMany({
    where: { id, updatedAt: g.updatedAt },
    data: { googleEtkinlikId: etkinlikId, googleBekliyor: false },
  });
  if (count === 0) {
    await client.gorev.updateMany({ where: { id }, data: { googleEtkinlikId: etkinlikId } });
  }
}

/** Bekleyen görevleri yazar (en çok `sinir`). Hatayı bağlantıya not eder; turu kesmez. */
export async function bekleyenleriEsitle(
  sinir = 50,
  simdi: Date = new Date(),
  client = db,
): Promise<{ yazilan: number; hata: string | null }> {
  const b = await baglanti(client);
  if (!b) return { yazilan: 0, hata: null };
  const bekleyenler = await client.gorev.findMany({
    where: { googleBekliyor: true },
    select: { id: true },
    orderBy: { updatedAt: 'asc' },
    take: sinir,
  });
  let yazilan = 0;
  let hata: string | null = null;
  for (const { id } of bekleyenler) {
    try {
      await gorevEsitle(id, client);
      yazilan++;
    } catch (e) {
      hata = e instanceof Error ? e.message : String(e);
      if (e instanceof GoogleHatasi && e.baglantiGecersiz) break;
    }
  }
  await client.googleBaglantisi.updateMany({
    where: { userId: b.userId },
    data: hata ? { sonHata: hata } : { sonHata: null, sonEsitleme: simdi },
  });
  return { yazilan, hata };
}
