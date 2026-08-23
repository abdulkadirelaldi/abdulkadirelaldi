import { ImageResponse } from 'next/og';

import { getPostBySlug, getProfile, getProjectBySlug } from '@/server/services';

import { OG_FONT_NAME, ogFontData } from '../font';

/**
 * Dinamik OG görseli — §4.1.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RUNTIME KARARI: NODE — EDGE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-014/K1 Edge'de Prisma'nın yüklenemediğini saptamıştı ve bu rota veri
 * okuyor. ÖLÇÜLDÜ (next 15.5.22, `dist/server/og/image-response.js`):
 *
 *   import(process.env.NEXT_RUNTIME === 'edge'
 *     ? '.../index.edge.js' : '.../index.node.js')
 *
 * `ImageResponse` Edge'i ZORUNLU KILMIYOR; runtime'a göre uygun yapıyı
 * seçiyor ve Node yapısı pakette mevcut. Dolayısıyla çakışma yok: Node
 * runtime'da hem Prisma hem OG üretimi çalışıyor. Next 15'te App Router
 * varsayılanı zaten Node; yine de AÇIKÇA belirtiliyor ki ileride biri
 * "OG = Edge" alışkanlığıyla değiştirmeye kalktığında karar görünür olsun.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BAŞLIK SORGU PARAMETRESİNDEN ALINMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/og?title=<metin>` daha basit olurdu ve veritabanına hiç gitmezdi. Ama o
 * uç nokta HERKESE AÇIK bir metin oluşturucu olurdu: üçüncü bir kişi
 * `og?title=<istediği şey>` bağlantısını paylaştığında sosyal medya önizlemesi
 * BİZİM ALAN ADIMIZLA saldırganın seçtiği metni gösterirdi. Bu, ADR-032'nin
 * "kullanıcı girdisi sınırlı bir kümeye doğrulanmadan kullanılmaz" kuralının
 * aynısı — orada önbellek anahtarıydı, burada görsel içeriği.
 *
 * Bunun yerine yalnızca SLUG alınıyor ve metin veritabanından okunuyor.
 * Bilinmeyen slug uydurma metin üretmez, varsayılan görsele düşer.
 */

export const runtime = 'nodejs';

const SIZE = { width: 1200, height: 630 };

interface OgContent {
  title: string;
  subtitle: string | null;
}

/** Yayınlanmamış içerik OG üretmez — varsayılana düşer (bilgi sızdırmaz). */
async function resolveContent(parts: string[] | undefined): Promise<OgContent> {
  const [type, slug] = parts ?? [];

  if (type === 'proje' && slug !== undefined) {
    const found = await getProjectBySlug(slug);
    if (found.state === 'FOUND') {
      return { title: found.data.title, subtitle: found.data.summary };
    }
  }

  if (type === 'yazi' && slug !== undefined) {
    const found = await getPostBySlug(slug);
    if (found.state === 'FOUND') {
      return { title: found.data.title, subtitle: found.data.excerpt };
    }
  }

  const profile = await getProfile();
  return { title: profile.headline, subtitle: profile.subtitle };
}

/** Uzun özet görseli taşırır; satori kırpmaz, taşan metni çizer. */
function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ parts?: string[] }> },
): Promise<ImageResponse> {
  const { parts } = await context.params;
  const { title, subtitle } = await resolveContent(parts);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: OG_FONT_NAME,
      }}
    >
      <div style={{ display: 'flex', fontSize: 64, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {truncate(title, 70)}
      </div>
      {subtitle !== null && (
        <div style={{ display: 'flex', marginTop: 28, fontSize: 30, color: '#94a3b8' }}>
          {truncate(subtitle, 120)}
        </div>
      )}
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 26, color: '#38bdf8' }}>
        abdulkadirelaldi.com
      </div>
    </div>,
    {
      ...SIZE,
      fonts: [{ name: OG_FONT_NAME, data: ogFontData(), weight: 400, style: 'normal' }],
    },
  );
}
