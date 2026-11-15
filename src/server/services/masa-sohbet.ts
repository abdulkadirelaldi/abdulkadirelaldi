import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod';

import { gorevSchema } from '@/lib/schemas/masa';
import { guvenliHata } from '@/lib/security/guvenli-log';
import { takvimEtkinligiSchema } from '@/lib/schemas/takvim';
import { KATMAN_SIRASI, TAKVIM_KATMANLARI } from '@/lib/takvim/katmanlar';
import { gunBasligi } from '@/lib/takvim/bicim';

import type { AppDay } from './_shared';
import { fetchDolap, fetchDolapSecenekleri, type DolapAyrintisi } from './masa';
import { aiIstemcisi, SAGLIK_MODELI, type AiClient } from './saglik-ai';

/**
 * CLAUDE PANELİ (ADR-049 M4) — Masa'nın içinden sohbet.
 *
 * - BAĞLAM: bugün, dolaplar (ad, katman, raf yolları) ve AÇIK dolabın görevleri ve notları
 *   sistem isteminde; sabit yönerge + bağlam önbelleğe alınır (her mesajda yeniden faturalanmaz).
 * - ARAÇLAR YALNIZCA ÖNERİR: `gorev_oner`, `etkinlik_oner` hiçbir şey yazmaz. Öneri gerçek kayıt
 *   şemasından (`gorevSchema` / `takvimEtkinligiSchema`) geçer; geçmezse hata Claude'a döner,
 *   geçerse ekrana kart olarak gider ve sahibi "Ekle"ye basarsa MEVCUT, denetimli eylemle yazılır.
 * - GEÇMİŞ istemcide: her yanıt bu turun mesajlarını (`yeniMesajlar`) döner, istemci bir sonraki
 *   soruda geçmişe ekleyip gönderir. Sunucu sohbet SAKLAMAZ.
 * - Model, yedek ve ret: sağlık modülüyle aynı (`claude-opus-5-5`, sunucu tarafı yedek,
 *   `refusal` ayrıca ele alınır).
 */

export const SOHBET_MODELI = SAGLIK_MODELI;
const EN_COK_TUR = 4;
/** Bağlama eklenen not metinlerinin toplam tavanı (karakter); fazlası söylenir, gizlice kesilmez. */
const NOT_TAVANI = 40_000;

export type SohbetOlayi =
  | { tur: 'metin'; metin: string }
  | { tur: 'oneri'; oneri: SohbetOnerisi }
  | { tur: 'bitti'; yeniMesajlar: Anthropic.Beta.Messages.BetaMessageParam[] }
  | { tur: 'hata'; mesaj: string };

export type SohbetOnerisi =
  | { id: string; tur: 'gorev'; veri: z.input<typeof gorevSchema> }
  | { id: string; tur: 'etkinlik'; veri: z.input<typeof takvimEtkinligiSchema> };

/* ===========================================================================
 * ARAÇLAR — yalnızca öneri
 * ======================================================================== */

const metinYaDaBos = { type: ['string', 'null'] } as const;

export const SOHBET_ARACLARI: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: 'gorev_oner',
    description:
      "Sahibine Masa'ya eklenecek bir GÖREV önerir. Hiçbir şey kaydetmez: öneri ekranda kart olarak " +
      'görünür, sahibi onaylarsa eklenir. Ödev, teslim, iş gibi yapılacaklar için kullan. ' +
      'dolapId ve rafId yalnızca bağlamdaki kimliklerden biri olabilir; emin değilsen null bırak.',
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        baslik: { type: 'string', description: 'Kısa görev başlığı.' },
        aciklama: metinYaDaBos,
        dolapId: metinYaDaBos,
        rafId: metinYaDaBos,
        teslimGun: { type: ['string', 'null'], description: 'YYYY-MM-DD, yoksa null.' },
        teslimSaat: { type: ['string', 'null'], description: 'SS:DD (İstanbul), yoksa null.' },
        oncelik: { type: 'string', enum: ['DUSUK', 'NORMAL', 'YUKSEK'] },
      },
      required: ['baslik', 'aciklama', 'dolapId', 'rafId', 'teslimGun', 'teslimSaat', 'oncelik'],
    },
  },
  {
    name: 'etkinlik_oner',
    description:
      'Sahibine takvime eklenecek bir ETKİNLİK önerir (toplantı, sınav, randevu). Hiçbir şey ' +
      'kaydetmez; sahibi onaylarsa eklenir. Saat yoksa tumGun true.',
    strict: true,
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        baslik: { type: 'string' },
        aciklama: metinYaDaBos,
        konum: metinYaDaBos,
        katman: { type: 'string', enum: [...KATMAN_SIRASI] },
        tumGun: { type: 'boolean' },
        gun: { type: 'string', description: 'YYYY-MM-DD' },
        baslangicSaat: { type: 'string', description: 'SS:DD; tumGun ise "09:00".' },
        bitisSaat: { type: 'string', description: 'SS:DD; tumGun ise "10:00".' },
      },
      required: [
        'baslik',
        'aciklama',
        'konum',
        'katman',
        'tumGun',
        'gun',
        'baslangicSaat',
        'bitisSaat',
      ],
    },
  },
];

const gorevGirdisi = z.object({
  baslik: z.string(),
  aciklama: z.string().nullable(),
  dolapId: z.string().nullable(),
  rafId: z.string().nullable(),
  teslimGun: z.string().nullable(),
  teslimSaat: z.string().nullable(),
  oncelik: z.enum(['DUSUK', 'NORMAL', 'YUKSEK']),
});
const etkinlikGirdisi = z.object({
  baslik: z.string(),
  aciklama: z.string().nullable(),
  konum: z.string().nullable(),
  katman: z.enum(KATMAN_SIRASI as [string, ...string[]]),
  tumGun: z.boolean(),
  gun: z.string(),
  baslangicSaat: z.string(),
  bitisSaat: z.string(),
});

const TEKRAR_YOK = { tur: 'YOK', aralik: 1, gunler: [], bitisGun: null, sayi: null } as const;

/**
 * Aracın girdisini ÖNERİYE çevirir — ya da Claude'a dönecek hata metnini verir. İki kat: önce
 * aracın kendi şekli (akışta gelen girdi sunucuda doğrulanmaz), sonra GERÇEK kayıt şeması.
 * Bilinmeyen dolap/raf kimliği de burada reddedilir (Claude kimlik uyduramaz).
 */
export function oneriyiDogrula(
  blok: { id: string; name: string; input: unknown },
  bilinen: { dolaplar: ReadonlySet<string>; raflar: ReadonlySet<string> },
): { ok: true; oneri: SohbetOnerisi } | { ok: false; hata: string } {
  const sorunlar = (e: z.ZodError) =>
    e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  if (blok.name === 'gorev_oner') {
    const g = gorevGirdisi.safeParse(blok.input);
    if (!g.success) return { ok: false, hata: `Girdi biçimi geçersiz — ${sorunlar(g.error)}` };
    if (g.data.dolapId && !bilinen.dolaplar.has(g.data.dolapId)) {
      return {
        ok: false,
        hata: 'dolapId bağlamdaki dolaplardan biri değil; null bırak ya da doğrusunu seç.',
      };
    }
    if (g.data.rafId && !bilinen.raflar.has(g.data.rafId)) {
      return {
        ok: false,
        hata: 'rafId bağlamdaki raflardan biri değil; null bırak ya da doğrusunu seç.',
      };
    }
    const kayit = gorevSchema.safeParse(g.data);
    if (!kayit.success) return { ok: false, hata: `Görev kuralları — ${sorunlar(kayit.error)}` };
    return { ok: true, oneri: { id: blok.id, tur: 'gorev', veri: g.data } };
  }
  if (blok.name === 'etkinlik_oner') {
    const e = etkinlikGirdisi.safeParse(blok.input);
    if (!e.success) return { ok: false, hata: `Girdi biçimi geçersiz — ${sorunlar(e.error)}` };
    const veri = {
      baslik: e.data.baslik,
      aciklama: e.data.aciklama,
      konum: e.data.konum,
      kategori: 'KISISEL' as const,
      katman: e.data.katman as (typeof KATMAN_SIRASI)[number],
      tumGun: e.data.tumGun,
      baslangicGun: e.data.gun,
      baslangicSaat: e.data.tumGun ? '09:00' : e.data.baslangicSaat,
      bitisGun: e.data.gun,
      bitisSaat: e.data.tumGun ? '10:00' : e.data.bitisSaat,
      tekrar: { ...TEKRAR_YOK, gunler: [] as number[] },
      hatirlatmalar: e.data.tumGun ? [] : [30],
    };
    const kayit = takvimEtkinligiSchema.safeParse(veri);
    if (!kayit.success) return { ok: false, hata: `Etkinlik kuralları — ${sorunlar(kayit.error)}` };
    return { ok: true, oneri: { id: blok.id, tur: 'etkinlik', veri } };
  }
  return { ok: false, hata: `Bilinmeyen araç: ${blok.name}` };
}

/* ===========================================================================
 * BAĞLAM
 * ======================================================================== */

const YONERGE = `Sen Abdulkadir'in kişisel panelindeki "Masa" asistanısın. Masa; dolaplardan (Samsun Üniversitesi, Kıyı Medya, Spectraloop gibi), dolapların içindeki raflardan, raflardaki görevlerden ve notlardan oluşur. Türkçe, kısa ve doğrudan yaz.

Görev ya da takvim etkinliği eklenmesi gerektiğinde gorev_oner / etkinlik_oner araçlarıyla ÖNER; hiçbir şeyi kendin kaydedemezsin, sahibi kartı görüp onaylar. Öneriden sonra ne önerdiğini bir cümleyle söyle. Tarihleri bağlamdaki "bugün"e göre hesapla (İstanbul saati). Dolap ve raf kimliklerini YALNIZCA aşağıdaki bağlamdan al; uydurma.

Notları özetlerken notta yazmayanı ekleme; bilmediğini söyle.`;

function dolapBaglami(d: DolapAyrintisi): string {
  const satirlar: string[] = [
    `## Açık dolap: ${d.emoji} ${d.ad} (id: ${d.id}, katman: ${TAKVIM_KATMANLARI[d.katman].ad})`,
  ];
  satirlar.push('### Açık görevler');
  if (d.acik.length === 0) satirlar.push('(yok)');
  for (const g of d.acik) {
    satirlar.push(
      `- ${g.baslik}${g.raf ? ` [raf: ${g.raf}]` : ''}${g.teslimGun ? ` — teslim ${g.teslimGun}` : ''}${g.oncelik === 'YUKSEK' ? ' (yüksek öncelik)' : ''}`,
    );
  }
  const notlar = d.ogeler.filter((o) => o.tur === 'NOT');
  const dosyalar = d.ogeler.filter((o) => o.tur !== 'NOT');
  satirlar.push('### Notlar (en yeni önce)');
  let kalan = NOT_TAVANI;
  let eklenmeyen = 0;
  for (const n of notlar) {
    const metin = n.metin ?? '';
    if (metin.length > kalan) {
      eklenmeyen++;
      continue;
    }
    kalan -= metin.length;
    satirlar.push(`#### ${n.baslik}\n${metin || '(boş)'}`);
  }
  if (notlar.length === 0) satirlar.push('(yok)');
  if (eklenmeyen > 0) {
    satirlar.push(
      `(${eklenmeyen} notun metni bağlam sınırı yüzünden eklenmedi; sorulursa bunu söyle.)`,
    );
  }
  if (dosyalar.length > 0) {
    satirlar.push('### Dosyalar ve ses kayıtları (yalnızca adları — içerikleri sende yok)');
    for (const o of dosyalar) {
      satirlar.push(`- ${o.tur === 'SES' ? '🎙️' : '📄'} ${o.baslik}`);
      // Ders kaydının özeti (M6) bağlama girer; tam yazı girmez (uzun).
      if (o.tur === 'SES' && o.ozet) satirlar.push(`  Özet:\n${o.ozet.replace(/^/gm, '  ')}`);
    }
  }
  return satirlar.join('\n');
}

export async function sohbetBaglami(
  bugun: AppDay,
  dolapId: string | null,
): Promise<{ metin: string; bilinen: { dolaplar: Set<string>; raflar: Set<string> } }> {
  const [secenekler, dolap] = await Promise.all([
    fetchDolapSecenekleri(),
    dolapId ? fetchDolap(dolapId) : Promise.resolve(null),
  ]);
  const bilinen = {
    dolaplar: new Set(secenekler.map((d) => d.id)),
    raflar: new Set(secenekler.flatMap((d) => d.raflar.map((r) => r.id))),
  };
  const parcalar = [
    `Bugün: ${gunBasligi(bugun)} (${bugun}).`,
    '## Dolaplar',
    ...secenekler.map(
      (d) =>
        `- ${d.emoji} ${d.ad} (id: ${d.id})` +
        (d.raflar.length
          ? `\n${d.raflar.map((r) => `  - raf: ${r.yol} (id: ${r.id})`).join('\n')}`
          : ''),
    ),
  ];
  if (dolap) parcalar.push(dolapBaglami(dolap));
  return { metin: parcalar.join('\n'), bilinen };
}

/* ===========================================================================
 * SOHBET DÖNGÜSÜ
 * ======================================================================== */

export interface SohbetGirdisi {
  gecmis: Anthropic.Beta.Messages.BetaMessageParam[];
  soru: string;
  dolapId: string | null;
  bugun: AppDay;
}

/**
 * Bir soruyu yanıtlar; olayları sırayla verir. Araç turları sunucuda kapanır (öneriler yalnızca
 * doğrulanıp ekrana gönderilir), en çok `EN_COK_TUR` model çağrısı.
 */
export async function* sohbet(
  g: SohbetGirdisi,
  deps: { client?: AiClient | null; baglam?: Awaited<ReturnType<typeof sohbetBaglami>> } = {},
): AsyncGenerator<SohbetOlayi> {
  const client = deps.client === undefined ? aiIstemcisi() : deps.client;
  if (!client) {
    yield { tur: 'hata', mesaj: 'Claude bağlı değil: sunucuda ANTHROPIC_API_KEY tanımlı değil.' };
    return;
  }
  const baglam = deps.baglam ?? (await sohbetBaglami(g.bugun, g.dolapId));
  const yeni: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: 'user', content: g.soru }];

  for (let tur = 0; tur < EN_COK_TUR; tur++) {
    const akis = client.beta.messages.stream({
      model: SOHBET_MODELI,
      max_tokens: 32_000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Sabit yönerge + bağlam önbellekte; soru ve geçmiş sonrasında.
      system: [
        { type: 'text', text: YONERGE },
        { type: 'text', text: baglam.metin, cache_control: { type: 'ephemeral' } },
      ],
      tools: SOHBET_ARACLARI,
      messages: [...g.gecmis, ...yeni],
    });

    let mesaj: Anthropic.Beta.Messages.BetaMessage;
    try {
      for await (const olay of akis) {
        if (olay.type === 'content_block_delta' && olay.delta.type === 'text_delta') {
          yield { tur: 'metin', metin: olay.delta.text };
        }
      }
      mesaj = await akis.finalMessage();
    } catch (error) {
      guvenliHata('[masa-sohbet] akış düştü:', error instanceof Error ? error.name : error);
      yield { tur: 'hata', mesaj: 'Claude’a ulaşılamadı; biraz sonra yeniden dene.' };
      return;
    }

    if (mesaj.stop_reason === 'refusal') {
      yield { tur: 'hata', mesaj: 'Claude bu isteği yanıtlamadı.' };
      return;
    }
    // Sınırda kesilen yanıt yarım bir araç çağrısı taşıyabilir; geçmişe girerse sonraki istek
    // (sonuçsuz `tool_use`) reddedilir. Bu tur geçmişe EKLENMEZ.
    if (mesaj.stop_reason === 'max_tokens') {
      yield { tur: 'hata', mesaj: 'Yanıt sınırda kesildi; soruyu daralt.' };
      return;
    }
    yeni.push({ role: 'assistant', content: mesaj.content });

    const araclar = mesaj.content.filter(
      (b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === 'tool_use',
    );
    if (araclar.length === 0) {
      yield { tur: 'bitti', yeniMesajlar: yeni };
      return;
    }

    const sonuclar: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const a of araclar) {
      const d = oneriyiDogrula(a, baglam.bilinen);
      if (d.ok) {
        yield { tur: 'oneri', oneri: d.oneri };
        sonuclar.push({
          type: 'tool_result',
          tool_use_id: a.id,
          content: 'Öneri sahibine kart olarak gösterildi; onaylarsa eklenecek. Kaydedilmiş SAYMA.',
        });
      } else {
        sonuclar.push({ type: 'tool_result', tool_use_id: a.id, is_error: true, content: d.hata });
      }
    }
    yeni.push({ role: 'user', content: sonuclar });
  }
  yield { tur: 'hata', mesaj: 'Yanıt çok uzadı; soruyu daralt.' };
}
