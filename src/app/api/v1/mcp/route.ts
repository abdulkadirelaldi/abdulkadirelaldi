import { after, NextResponse } from 'next/server';

import { guvenliHata } from '@/lib/security/guvenli-log';
import { siteAdresi } from '@/lib/oauth/kurallar';
import { aracCalistir, aracListesi } from '@/server/services/mcp-araclar';
import { etkinlikSil, gorevEsitle } from '@/server/services/google-takvim';
import { erisimDogrula } from '@/server/services/oauth';

/**
 * `/api/v1/mcp` — Claude bağlayıcısı MCP sunucusu (ADR-056), Streamable HTTP. Durumsuz: oturum
 * kimliği yok, her POST tek JSON yanıt (SSE yok). Kimlik: OAuth erişim jetonu (yalnızca bu kaynağa
 * verilmiş). Jetonsuz/geçersiz → 401 + `WWW-Authenticate` (Claude girişi bununla başlatır).
 */

const SURUMLER = ['2025-11-25', '2025-06-18', '2025-03-26'];
const IZINLI_KOKENLER = () => [siteAdresi(), 'https://claude.ai', 'https://claude.com'];

type Rpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

function yetkisiz(gecersiz: boolean): NextResponse {
  const meta = `${siteAdresi()}/.well-known/oauth-protected-resource`;
  return NextResponse.json(
    { error: gecersiz ? 'invalid_token' : 'unauthorized' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${meta}"${gecersiz ? ', error="invalid_token"' : ''}`,
        'Cache-Control': 'no-store',
      },
    },
  );
}

const sonuc = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const hata = (id: Rpc['id'], code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

export async function POST(request: Request): Promise<Response> {
  // DNS yeniden bağlama koruması (MCP Streamable HTTP §Security): tarayıcı kökeni varsa izinli olmalı.
  const koken = request.headers.get('origin');
  if (koken && !IZINLI_KOKENLER().includes(koken)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const baslik = request.headers.get('authorization') ?? '';
  const jeton = /^Bearer\s+(.+)$/i.exec(baslik)?.[1]?.trim();
  if (!jeton) return yetkisiz(false);
  const kimlik = await erisimDogrula(jeton);
  if (!kimlik) return yetkisiz(true);

  const metin = await request.text();
  if (metin.length > 256 * 1024) {
    return NextResponse.json(hata(null, -32600, 'İstek çok büyük.'), { status: 413 });
  }
  let govde: Rpc | Rpc[];
  try {
    govde = JSON.parse(metin) as Rpc | Rpc[];
  } catch {
    return NextResponse.json(hata(null, -32700, 'JSON ayrıştırılamadı.'), { status: 400 });
  }

  const sonraIsleri: (() => Promise<void>)[] = [];
  const baglam = {
    userId: kimlik.userId,
    sonra: (gorevId: string, silinenEtkinlik?: string | null) => {
      sonraIsleri.push(() =>
        (silinenEtkinlik ? etkinlikSil(silinenEtkinlik) : gorevEsitle(gorevId)).catch((e) =>
          guvenliHata('[mcp] google:', String(e)),
        ),
      );
    },
  };

  const isle = async (m: Rpc): Promise<object | null> => {
    if (m.id === undefined) return null; // bildirim (ör. notifications/initialized) — yanıtsız
    switch (m.method) {
      case 'initialize': {
        const istenen =
          typeof m.params?.protocolVersion === 'string' ? m.params.protocolVersion : '';
        return sonuc(m.id, {
          protocolVersion: SURUMLER.includes(istenen) ? istenen : SURUMLER[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'abdulkadirelaldi-panel',
            title: 'Abdulkadir Elaldı — Panel',
            version: '1.0.0',
          },
          instructions:
            'Sahibinin kişisel panelindeki İşler. Türkçe yanıt ver. Tik atmadan önce eşleşme belirsizse sor; silmeden önce onay al. Tarihler İstanbul saatiyle; göreli günleri bugun_ozeti’ndeki tarihten hesapla.',
        });
      }
      case 'ping':
        return sonuc(m.id, {});
      case 'tools/list':
        return sonuc(m.id, { tools: aracListesi() });
      case 'tools/call': {
        const ad = typeof m.params?.name === 'string' ? m.params.name : '';
        return sonuc(m.id, await aracCalistir(ad, m.params?.arguments, baglam));
      }
      default:
        return hata(m.id, -32601, `Desteklenmeyen yöntem: ${m.method ?? '?'}`);
    }
  };

  const yanit = Array.isArray(govde)
    ? (await Promise.all(govde.map(isle))).filter((x): x is object => x !== null)
    : await isle(govde);

  if (sonraIsleri.length > 0)
    after(async () => {
      for (const is of sonraIsleri) await is();
    });

  if (yanit === null || (Array.isArray(yanit) && yanit.length === 0)) {
    return new Response(null, { status: 202 });
  }
  return NextResponse.json(yanit, { headers: { 'Cache-Control': 'no-store' } });
}

/** SSE akışı sunulmuyor (durumsuz sunucu) — spec: GET'e 405. */
export function GET(): Response {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

export function DELETE(): Response {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
