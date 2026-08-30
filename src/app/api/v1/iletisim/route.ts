import { NextResponse } from 'next/server';

import { contactMessageFormSchema } from '@/lib/schemas';
import { extractClientIp } from '@/server/auth/credentials';
import {
  CONTACT_TIME_TRAP,
  assessContactSpam,
  fail,
  internalError,
  isContactRateExceeded,
  issueFormToken,
  notifyContactMessage,
  ok,
  resolveContactNotifier,
  toValidationFailure,
  verifyFormToken,
} from '@/server/services/_shared';
import {
  countRecentContactMessagesByIp,
  createContactMessage,
  type ContactMessageReceiptDto,
} from '@/server/services/contact-message';
import type { ApiResponse } from '@/types';

/**
 * `/api/v1/iletisim` — §4.1 iletişim formu ucu.
 *
 * §7.1: "Public form → Route Handler". Server Action DEĞİL, çünkü form
 * oturumsuz bir ziyaretçiden geliyor ve §8.15'in hız sınırı istek başlıklarına
 * (IP) ihtiyaç duyuyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DIŞARIYA SÖZLEŞME (T-026 Frontend bunu bağlayacak)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * GET  /api/v1/iletisim
 *   → 200 { ok: true, data: { formToken: string, minFillSeconds: number } }
 *   Form ÇİZİLDİĞİNDE bir kez çağrılır. `formToken` POST gövdesine konur.
 *
 * POST /api/v1/iletisim
 *   Gövde (JSON) = `createContactMessageSchema` alanları + `formToken`:
 *     { name, email, phone?, subject?, message, sourcePage?, website?, formToken? }
 *     `website` HONEYPOT'tur; gerçek kullanıcı boş bırakır.
 *   → 201 { ok: true, data: { id: string, createdAt: string } }
 *   → 400 { ok: false, error: { code: 'VALIDATION_ERROR', message, fields } }
 *          `fields` anahtarları FORM ALAN ADLARIYLA BİREBİR — `setError` ile basılabilir.
 *   → 429 { ok: false, error: { code: 'RATE_LIMITED', message } } + `Retry-After`
 *   → 500 { ok: false, error: { code: 'INTERNAL_ERROR', message } }
 *
 * `formToken` GÖNDERİLMEZSE istek REDDEDİLMEZ — mesaj kaydedilir, yalnızca
 * spam puanına katkı yazılır. Jetonu getiren isteğin ağ hatasıyla düşmesi
 * gerçek bir müşteriyi susturmamalı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ZAMAN HATA DÖNER, NE ZAMAN DÖNMEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hata DÖNEN üç durum var: bozuk gövde, geçersiz alan, hız sınırı. Bunların
 * hepsi kullanıcının DÜZELTEBİLECEĞİ ya da bilmesi GEREKEN şeyler.
 *
 * Hata DÖNMEYEN iki durum: honeypot ve zaman tuzağı. Her ikisinde de mesaj
 * kaydedilir (ADR-020/C11 — spam silinmez, ayrılır) ve ziyaretçiye BAŞARI
 * döner. Gerekçe: bota "yakalandın" demek sonraki denemeyi bilgilendirir —
 * hangi alanın tuzak olduğunu deneme yanılmayla bulur. Ve daha önemlisi, yanlış
 * pozitifte (tarayıcı otomatik doldurması, çok hızlı yapıştıran gerçek bir
 * kullanıcı) mesaj YİNE panele düşer; yalnızca işaretli olarak.
 */

// Her istekte gerçek IP ve gerçek zaman okunmalı; önbelleklenirse ikisi de donar.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** `User-Agent` bu uzunluktan sonra kırpılır — başlık istemci tarafından belirlenir ve sınırsızdır. */
const USER_AGENT_MAX_LENGTH = 512;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  // §8.7 mantığı: API uçları arama motorunda görünmez.
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

function json<T>(
  body: ApiResponse<T>,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...extraHeaders },
  });
}

/**
 * Zaman tuzağı jetonunu verir.
 *
 * Sır YOKSA FIRLATMAZ, jeton VERMEZ (500). Sessizce sabit bir anahtara düşmek
 * imzayı tahmin edilebilir kılar; jetonsuz devam etmek ise zaman tuzağını
 * fark edilmeden kapatırdı — ikisi de sessiz güvenlik kaybı.
 */
export function GET(): NextResponse<ApiResponse<{ formToken: string; minFillSeconds: number }>> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return json(internalError('iletisim:get', new Error('AUTH_SECRET tanımlı değil')), 500);
  }

  return json(
    ok({
      formToken: issueFormToken(new Date(), secret),
      // Frontend gönder düğmesini bu süre dolana dek bekletebilir — zorunlu değil.
      minFillSeconds: CONTACT_TIME_TRAP.minFillSeconds,
    }),
    200,
  );
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse<unknown>>> {
  const now = new Date();
  const ip = extractClientIp(request);
  // `extractClientIp` başlık yoksa 'unknown' döner. Bunu IP gibi saklamak,
  // vekil başlığı düşen bir kurulumda TÜM ziyaretçileri tek sayaca toplardı.
  const storedIp = ip === 'unknown' ? null : ip;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(fail('VALIDATION_ERROR', 'Gönderilen veri okunamadı.'), 400);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json(fail('VALIDATION_ERROR', 'Gönderilen veri okunamadı.'), 400);
  }
  const raw = body as Record<string, unknown>;

  /*
   * HONEYPOT VE JETON ŞEMADAN ÖNCE AYRILIR.
   *
   * `website` alanı `serverInterpreted` ile işaretli (T-031 konvansiyonu):
   * kuralını Zod değil BURASI koyar, çünkü doğru kural "reddet" değil
   * "işaretle ve yine kabul et" ve Zod'un elindeki tek sonuç reddetmektir.
   *
   * Şemadan çıkarma İŞARETTEN TÜRETİLİYOR (`toFormSchema`), elle `omit({
   * website: true })` yazılmıyor. Elle yazılsaydı yeni bir işaretli alan
   * eklendiğinde burası sessizce eski listeyle çalışmaya devam ederdi.
   */
  const honeypotFilled = typeof raw.website === 'string' && raw.website.trim().length > 0;
  const formToken = typeof raw.formToken === 'string' ? raw.formToken : undefined;

  const parsed = contactMessageFormSchema.safeParse(raw);
  if (!parsed.success) {
    // Honeypot dolu OLSA BİLE önce alan hataları döner: `name` boşken
    // kaydedilecek bir mesaj yok. Bot buradan honeypot hakkında bilgi almaz.
    return json(toValidationFailure(parsed.error), 400);
  }

  /* §8.15 — IP başına saatte 3. Eşik ve pencere `CONTACT_RATE_LIMIT`'te. */
  let acceptedInWindow: number;
  try {
    acceptedInWindow = await countRecentContactMessagesByIp(storedIp, now);
  } catch (error) {
    return json(internalError('iletisim:rate', error), 500);
  }

  if (isContactRateExceeded(acceptedInWindow)) {
    return json(
      fail(
        'RATE_LIMITED',
        'Kısa sürede çok fazla mesaj gönderildi. Lütfen bir saat sonra tekrar deneyin.',
      ),
      429,
      // Sayaç kayan pencere olduğu için kesin bekleme süresi kayıt zamanlarına
      // bağlı; en kötü durum penceresinin tamamıdır ve onu bildirmek dürüsttür.
      { 'Retry-After': String(60 * 60) },
    );
  }

  const tokenVerdict = verifyFormToken(formToken, now, process.env.AUTH_SECRET ?? '');
  const assessment = assessContactSpam({ honeypotFilled, tokenVerdict });

  const userAgent = request.headers.get('user-agent')?.slice(0, USER_AGENT_MAX_LENGTH) ?? null;

  let receipt: ContactMessageReceiptDto;
  try {
    receipt = await createContactMessage(parsed.data, {
      ip: storedIp,
      userAgent,
      isSpam: assessment.isSpam,
      honeypotHit: assessment.honeypotHit,
      spamScore: assessment.spamScore,
    });
  } catch (error) {
    // BURASI hata döndüren tek yazma hatası: mesaj KAYDEDİLEMEDİ, yani
    // ziyaretçiye başarı demek yalan olurdu ve mesajı kaybederdik.
    return json(internalError('iletisim:create', error), 500);
  }

  if (assessment.signals.length > 0) {
    // §8.20 — ham e-posta, ad veya mesaj metni YOK; yalnızca kayıt kimliği,
    // tetiklenen sinyaller ve puan.
    console.warn(
      `[iletisim] spam sinyali (mesaj=${receipt.id}, puan=${assessment.spamScore}, sinyaller=${assessment.signals.join(',')})`,
    );
  }

  /*
   * BİLDİRİM — ADAPTÖR ARKASINDA, AKIŞI DURDURMAZ.
   *
   * `await` ediliyor ama sonucu YANITI ETKİLEMİYOR: `notifyContactMessage`
   * fırlatmaz, `delivered: false` döner ve loga yazar. Beklemek bilinçli —
   * `void` ile bırakmak, sunucusuz/ölçeklenen bir ortamda isteğin bitmesiyle
   * gönderimi yarıda kesebilir; en pahalı hâli bugün zaten `noop`.
   *
   * Spam işaretli mesaj için de gönderiliyor: kararı okuyan insan versin.
   */
  await notifyContactMessage(
    {
      messageId: receipt.id,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? null,
      message: parsed.data.message,
      sourcePage: parsed.data.sourcePage ?? null,
      receivedAt: now,
      isSpam: assessment.isSpam,
    },
    resolveContactNotifier(),
  );

  return json(ok(receipt), 201);
}
