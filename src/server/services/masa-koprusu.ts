import { createHash, randomBytes } from 'node:crypto';

import * as z from 'zod';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { db } from '@/server/db';

import { aiIstemcisi, SAGLIK_MODELI, type AiClient } from './saglik-ai';

/**
 * MAC KÖPRÜSÜ (ADR-049 M6) — ders kayıtları sahibinin Mac'inde (whisper.cpp) yazıya dökülür;
 * ses dışarı çıkmaz, ücretsiz. Sunucu yalnızca iş sırası tutar.
 *
 * - ANAHTAR: `aemk_…`, panelden üretilir, bir kez gösterilir; yalnızca SHA-256 özeti saklanır
 *   (`SaglikBaglantisi` kalıbı). Sunucu `.env`'ine dokunmak gerekmez.
 * - SIRA: yüklemesi biten ses kaydı `SIRADA`. Mac işi alınca `ISLENIYOR` (+ başlangıç anı);
 *   2 saatte bitmeyen iş yeniden alınabilir (Mac uyudu, kapandı). Alım TEK GÜNCELLEMEYLE yapılır:
 *   iki istek aynı işi alamaz.
 * - BİTİŞ: yazı `metin`e; Claude anahtarı varsa ders özeti `ozet`e (yoksa özet boş, yazı yine
 *   kaydedilir). Özet isteği öncesi denetim kaydına `EXPORT`.
 */

const ONEK = 'aemk_';
export const IS_OMRU_MS = 2 * 60 * 60 * 1000;
const anahtarOzeti = (anahtar: string): string =>
  createHash('sha256').update(anahtar, 'utf8').digest('hex');

export async function kopruAnahtariUret(userId: string): Promise<string> {
  const anahtar = ONEK + randomBytes(32).toString('base64url');
  const ozet = anahtarOzeti(anahtar);
  await db.masaKoprusu.upsert({
    where: { userId },
    create: { userId, anahtarOzeti: ozet },
    update: { anahtarOzeti: ozet, createdAt: new Date(), sonKullanim: null },
  });
  return anahtar;
}

export async function kopruAnahtariSil(userId: string): Promise<void> {
  await db.masaKoprusu.deleteMany({ where: { userId } });
}

/** Geçerliyse sahibin kimliği (denetim kaydı için); son kullanım anı güncellenir. */
export async function kopruAnahtariDogrula(
  anahtar: string,
  simdi = new Date(),
): Promise<string | null> {
  if (!anahtar.startsWith(ONEK) || anahtar.length > 200) return null;
  const k = await db.masaKoprusu.findUnique({ where: { anahtarOzeti: anahtarOzeti(anahtar) } });
  if (!k) return null;
  await db.masaKoprusu.update({ where: { userId: k.userId }, data: { sonKullanim: simdi } });
  return k.userId;
}

export interface KopruDurumu {
  kurulu: boolean;
  sonKullanim: string | null;
  sirada: number;
  isleniyor: number;
}

export async function fetchKopruDurumu(): Promise<KopruDurumu> {
  const [k, sirada, isleniyor] = await Promise.all([
    db.masaKoprusu.findFirst({ select: { sonKullanim: true } }),
    db.masaOgesi.count({ where: { tur: 'SES', yaziDurumu: 'SIRADA' } }),
    db.masaOgesi.count({ where: { tur: 'SES', yaziDurumu: 'ISLENIYOR' } }),
  ]);
  return {
    kurulu: k !== null,
    sonKullanim: k?.sonKullanim?.toISOString() ?? null,
    sirada,
    isleniyor,
  };
}

export interface KopruIsi {
  id: string;
  baslik: string;
  mime: string;
  boyut: number;
}

/**
 * Sıradaki işi ALIR: en eski `SIRADA` ya da süresi geçmiş `ISLENIYOR`. Seçim + koşullu tek
 * güncelleme: araya giren başka bir alım `count === 0` görür ve bir sonrakine geçer.
 */
export async function isAl(simdi = new Date()): Promise<KopruIsi | null> {
  const esik = new Date(simdi.getTime() - IS_OMRU_MS);
  const uygun = {
    tur: 'SES' as const,
    durum: 'HAZIR' as const,
    OR: [
      { yaziDurumu: 'SIRADA' as const },
      { yaziDurumu: 'ISLENIYOR' as const, yaziBaslangic: { lt: esik } },
    ],
  };
  for (let deneme = 0; deneme < 3; deneme++) {
    const aday = await db.masaOgesi.findFirst({
      where: uygun,
      orderBy: { createdAt: 'asc' },
      select: { id: true, baslik: true, mime: true, boyut: true },
    });
    if (!aday || !aday.mime || aday.boyut === null) return null;
    const { count } = await db.masaOgesi.updateMany({
      where: { id: aday.id, ...uygun },
      data: { yaziDurumu: 'ISLENIYOR', yaziBaslangic: simdi, yaziHata: null },
    });
    if (count === 1)
      return { id: aday.id, baslik: aday.baslik, mime: aday.mime, boyut: aday.boyut };
  }
  return null;
}

/** İşteki ses kaydının R2 anahtarı — yalnızca `ISLENIYOR` iş indirilebilir. */
export async function isSesi(id: string): Promise<{ key: string; mime: string } | null> {
  const o = await db.masaOgesi.findUnique({
    where: { id },
    select: { yaziDurumu: true, tur: true },
  });
  if (!o || o.tur !== 'SES' || o.yaziDurumu !== 'ISLENIYOR') return null;
  return db.attachment.findFirst({
    where: { entity: 'MASA_OGESI', entityId: id },
    select: { key: true, mime: true },
  });
}

export const isSonucuSchema = z.union([
  z.object({ metin: z.string().trim().min(1, { error: 'Yazı boş.' }).max(400_000) }),
  z.object({ hata: z.string().trim().min(1).max(500) }),
]);
export type IsSonucu = z.infer<typeof isSonucuSchema>;

const OZET_YONERGESI = `Bir üniversite öğrencisinin ders kaydının otomatik yazıya dökülmüş metnini alacaksın. Türkçe, Markdown ile şu başlıklarla yaz:
## Özet (5-8 cümle)
## Önemli noktalar (madde madde)
## Sınavda çıkabilecekler
## Belirsiz kalan yerler (yazıya dökme hatası olabilecek ya da anlaşılmayan kısımlar)
Metinde olmayan bilgiyi ekleme. Yazıya dökme hatası olduğu belli olan kelimeleri bağlamdan düzelt ama emin değilsen "Belirsiz kalan yerler"e yaz.`;

/** Claude anahtarı yoksa ya da reddederse `null` — yazı yine kaydedilir. */
async function dersOzeti(
  baslik: string,
  metin: string,
  client: AiClient | null = aiIstemcisi(),
): Promise<string | null> {
  if (!client) return null;
  try {
    const yanit = await client.beta.messages
      .stream({
        model: SAGLIK_MODELI,
        max_tokens: 16_000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: OZET_YONERGESI,
        messages: [{ role: 'user', content: `Kayıt: ${baslik}\n\n${metin}` }],
      })
      .finalMessage();
    if (yanit.stop_reason === 'refusal') return null;
    const yazi = yanit.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return yazi || null;
  } catch (error) {
    guvenliHata('[masa-koprusu] özet çıkarılamadı:', error instanceof Error ? error.name : error);
    return null;
  }
}

export async function isBitir(
  id: string,
  sonuc: IsSonucu,
  deps: { ozetle?: typeof dersOzeti; denetle?: () => Promise<void> } = {},
): Promise<{ durum: 'TAMAM' | 'HATA'; ozet: boolean } | null> {
  const o = await db.masaOgesi.findUnique({
    where: { id },
    select: { yaziDurumu: true, baslik: true },
  });
  if (!o || o.yaziDurumu !== 'ISLENIYOR') return null;
  if ('hata' in sonuc) {
    await db.masaOgesi.update({
      where: { id },
      data: { yaziDurumu: 'HATA', yaziHata: sonuc.hata, yaziBaslangic: null },
    });
    return { durum: 'HATA', ozet: false };
  }
  // Önce yazı kaydedilir: özet uzun sürse ya da düşse de iş kaybolmaz.
  await db.masaOgesi.update({
    where: { id },
    data: { yaziDurumu: 'TAMAM', metin: sonuc.metin, yaziHata: null, yaziBaslangic: null },
  });
  await deps.denetle?.();
  const ozet = await (deps.ozetle ?? dersOzeti)(o.baslik, sonuc.metin);
  if (ozet) await db.masaOgesi.update({ where: { id }, data: { ozet } });
  return { durum: 'TAMAM', ozet: ozet !== null };
}

/** Sahibi ekrandan "yeniden dene" der: HATA → SIRADA. */
export async function yaziyiYenidenSirala(id: string): Promise<{ id: string }> {
  await db.masaOgesi.updateMany({
    where: { id, tur: 'SES', yaziDurumu: { in: ['HATA', 'TAMAM'] } },
    data: { yaziDurumu: 'SIRADA', yaziHata: null, yaziBaslangic: null },
  });
  return { id };
}
