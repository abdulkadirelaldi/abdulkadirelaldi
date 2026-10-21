import { auth } from '@/server/auth';
import {
  PUBLIC_ATTACHMENT_ENTITIES,
  fetchAttachmentForServing,
} from '@/server/services/attachment';
import { isPublicClientLogo } from '@/server/services/client';
import { getObjectBytes } from '@/server/storage/r2';
import { guvenliHata } from '@/lib/security/guvenli-log';

/**
 * `GET /api/v1/dosya/[id]` — eklenti sunumu, ADR-044.
 *
 * Tarayıcı R2'ye hiç gitmiyor: HTML'de imzalı adres yok, yalnızca bu kalıcı
 * adres. ADR-018'in öngördüğü çatışma (15 dakikada bayatlayan imzalı adres ×
 * önbellekli sayfa) böylece hiç doğmuyor ve CSP `img-src 'self'` kalıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KİM GÖREBİLİR — VARSAYILAN REDDET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   PROJECT · POST · PROFILE → herkese açık, `public, immutable` (içerik
 *     DEĞİŞMEZ: yeni dosya yeni kimlik; önbellek asla bayatlamaz)
 *   diğerleri (makbuz, iş, müşteri) → YALNIZCA OTURUMLA, `private, no-store`
 *
 *   TEK İSTİSNA (T-117): `CLIENT` eklentisi, vitrindeki (`showOnSite`, arşivde
 *     değil) BİR MÜŞTERİNİN KENDİ LOGOSU ise herkese açık. Müşterinin başka bir
 *     eklentisi (sözleşme, fatura) bu sorudan geçemez — eşleşme logo alanı VE
 *     sahip kimliği üzerinden (`isPublicClientLogo`).
 *
 * ⚠️ Oturumsuz istek özel bir dosya için 404 alıyor, 401 DEĞİL: 401 dosyanın
 * VAR OLDUĞUNU söylerdi. Kimlik tahmin edilemez (cuid) ama ikinci bir kat.
 *
 * ⚠️ BU OKUMA ADR-035/B İPTALİNE TABİ DEĞİL (`auth()`, `currentActorId` değil):
 * iptal YAZMALAR içindi; okumalar F6/C'ye bırakıldı (`getTotpStatus` ile aynı).
 */

const BIR_YIL = 31_536_000;
const BIR_SAAT = 3_600;

/**
 * Kimlik karakter kümesi — DAR. `cuidSchema` bilerek gevşek (1–64 uzunluk;
 * tohum kimlikleri `seed_…` biçiminde). Burada yol kaçışı riski YOK — R2
 * anahtarı kimlikten değil SATIRDAN geliyor — ama `../etc` gibi çöp girdiyi
 * veritabanına hiç götürmemek ucuz bir ikinci kat.
 */
const KIMLIK = /^[A-Za-z0-9_-]{1,64}$/;

function bulunamadi(): Response {
  return new Response('Bulunamadı', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!KIMLIK.test(id)) return bulunamadi();

  try {
    const dosya = await fetchAttachmentForServing(id);
    if (!dosya) return bulunamadi();

    const icerikGorseli = PUBLIC_ATTACHMENT_ENTITIES.has(dosya.entity);
    const vitrinLogosu =
      !icerikGorseli && dosya.entity === 'CLIENT' && (await isPublicClientLogo(id, dosya.entityId));
    const herkeseAcik = icerikGorseli || vitrinLogosu;
    if (!herkeseAcik) {
      const oturum = await auth();
      if (!oturum?.user?.id) return bulunamadi();
    }

    /*
     * ⚠️ VİTRİN LOGOSU `immutable` DEĞİL (T-117): içerik değişmese de İZİN
     * değişebilir — "sitede göster" kapatılabilir. Bir yıllık önbellek, iznini
     * geri çeken bir müşterinin logosunu tarayıcılarda ve ara önbelleklerde
     * bir yıl daha yaşatırdı. Bir saat: şerit akıcı, geri çekme bir saatte iner.
     */
    const onbellek = icerikGorseli
      ? `public, max-age=${BIR_YIL}, immutable`
      : vitrinLogosu
        ? `public, max-age=${BIR_SAAT}`
        : 'private, no-store';
    const etag = `"${dosya.checksum}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': onbellek },
      });
    }

    const bytes = await getObjectBytes(dosya.key);
    if (!bytes) return bulunamadi();

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': dosya.mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': onbellek,
        ETag: etag,
        'Content-Disposition': 'inline',
        ...(herkeseAcik ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
      },
    });
  } catch (error) {
    guvenliHata('[dosya] sunulamadı:', error);
    return new Response('Dosya şu anda sunulamıyor', {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
