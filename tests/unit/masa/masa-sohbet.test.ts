import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ db: {} }));

import { oneriyiDogrula, sohbet, type SohbetOlayi } from '@/server/services/masa-sohbet';

/**
 * CLAUDE PANELİ (ADR-049 M4) — sohbet döngüsü SAHTE istemciyle (gerçek API çağrılmaz). Ölçülen:
 * öneri yalnızca doğrulanınca ekrana gider, geçersiz kimlik Claude'a hata olarak döner, ret ve
 * sınırda kesilme geçmişi kirletmez, önbellek işareti bağlam bloğunda.
 */
const BILINEN = { dolaplar: new Set(['d1']), raflar: new Set(['r1']) };
const baglam = { metin: 'Bugün: 2026-11-15', bilinen: BILINEN };

type Yanit = { content: unknown[]; stop_reason: string };
function sahteIstemci(yanitlar: Yanit[]) {
  const istekler: Record<string, unknown>[] = [];
  const stream = vi.fn((istek: Record<string, unknown>) => {
    istekler.push(structuredClone(istek));
    const y = yanitlar.shift()!;
    const metinler = y.content.filter((b) => (b as { type: string }).type === 'text') as {
      text: string;
    }[];
    return {
      async *[Symbol.asyncIterator]() {
        for (const m of metinler)
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: m.text } };
      },
      finalMessage: async () => y,
    };
  });
  return { client: { beta: { messages: { stream } } } as never, istekler, stream };
}

async function topla(it: AsyncGenerator<SohbetOlayi>) {
  const l: SohbetOlayi[] = [];
  for await (const o of it) l.push(o);
  return l;
}

const girdi = {
  gecmis: [],
  soru: 'Fizik ödevini ekle',
  dolapId: 'd1',
  bugun: '2026-11-15' as const,
};
const gorevAraci = (input: Record<string, unknown>) => ({
  type: 'tool_use',
  id: 'tu1',
  name: 'gorev_oner',
  input: {
    aciklama: null,
    dolapId: 'd1',
    rafId: 'r1',
    teslimGun: '2026-11-20',
    teslimSaat: null,
    oncelik: 'NORMAL',
    ...input,
  },
});

describe('sohbet döngüsü', () => {
  it('öneri doğrulanır, ekrana gider, araç sonucu "kaydedilmedi" der; ikinci turda biter', async () => {
    const { client, istekler } = sahteIstemci([
      {
        content: [{ type: 'text', text: 'Ekliyorum.' }, gorevAraci({ baslik: 'Fizik ödevi 3' })],
        stop_reason: 'tool_use',
      },
      { content: [{ type: 'text', text: 'Kartı onaylarsan eklenecek.' }], stop_reason: 'end_turn' },
    ]);
    const olaylar = await topla(sohbet(girdi, { client, baglam }));
    expect(
      olaylar
        .filter((o) => o.tur === 'metin')
        .map((o) => (o as { metin: string }).metin)
        .join(''),
    ).toBe('Ekliyorum.Kartı onaylarsan eklenecek.');
    const oneri = olaylar.find((o) => o.tur === 'oneri');
    expect(oneri).toMatchObject({
      oneri: { id: 'tu1', tur: 'gorev', veri: { baslik: 'Fizik ödevi 3', rafId: 'r1' } },
    });
    const bitti = olaylar.at(-1) as Extract<SohbetOlayi, { tur: 'bitti' }>;
    expect(bitti.tur).toBe('bitti');
    expect(bitti.yeniMesajlar.map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);
    const sonuc = (bitti.yeniMesajlar[2]!.content as { is_error?: boolean; content: string }[])[0]!;
    expect(sonuc.is_error).toBeUndefined();
    expect(sonuc.content).toMatch('SAYMA');
    // Önbellek işareti bağlam bloğunda; model, araçlar ve yedek ayarı.
    const ilk = istekler[0]!;
    expect(ilk).toMatchObject({
      model: 'claude-opus-5-5',
      fallbacks: 'default',
      output_config: { effort: 'medium' },
    });
    expect((ilk.system as { cache_control?: unknown }[])[1]!.cache_control).toEqual({
      type: 'ephemeral',
    });
    expect(
      (ilk.tools as { name: string; strict: boolean }[]).map((t) => [t.name, t.strict]),
    ).toEqual([
      ['gorev_oner', true],
      ['etkinlik_oner', true],
    ]);
  });

  it("⚠️ uydurma dolap kimliği ÖNERİ OLMAZ, Claude'a hata döner", async () => {
    const { client } = sahteIstemci([
      { content: [gorevAraci({ baslik: 'X', dolapId: 'uydurma' })], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: 'Düzelttim.' }], stop_reason: 'end_turn' },
    ]);
    const olaylar = await topla(sohbet(girdi, { client, baglam }));
    expect(olaylar.some((o) => o.tur === 'oneri')).toBe(false);
    const bitti = olaylar.at(-1) as Extract<SohbetOlayi, { tur: 'bitti' }>;
    const sonuc = (bitti.yeniMesajlar[2]!.content as { is_error?: boolean; content: string }[])[0]!;
    expect(sonuc).toMatchObject({ is_error: true });
    expect(sonuc.content).toMatch('dolapId');
  });

  it('ret ve sınırda kesilme: hata, `bitti` YOK (geçmiş kirlenmez)', async () => {
    for (const stop_reason of ['refusal', 'max_tokens']) {
      const { client } = sahteIstemci([{ content: [gorevAraci({ baslik: 'Y' })], stop_reason }]);
      const olaylar = await topla(sohbet(girdi, { client, baglam }));
      expect(olaylar.map((o) => o.tur)).toEqual(['hata']);
    }
  });

  it('istemci yoksa (anahtar tanımsız) istek atılmaz, ekran söyler', async () => {
    const olaylar = await topla(sohbet(girdi, { client: null, baglam }));
    expect(olaylar).toEqual([{ tur: 'hata', mesaj: expect.stringContaining('ANTHROPIC_API_KEY') }]);
  });

  it('akış düşerse anlaşılır hata', async () => {
    const client = {
      beta: {
        messages: {
          stream: () => ({
            async *[Symbol.asyncIterator]() {
              throw new Error('ağ');
            },
            finalMessage: async () => ({}),
          }),
        },
      },
    } as never;
    expect((await topla(sohbet(girdi, { client, baglam }))).map((o) => o.tur)).toEqual(['hata']);
  });
});

describe('oneriyiDogrula', () => {
  it('etkinlik önerisi takvim şemasından geçer; ters saat reddedilir', () => {
    const etkinlik = (bas: string, son: string) =>
      oneriyiDogrula(
        {
          id: 'e1',
          name: 'etkinlik_oner',
          input: {
            baslik: 'Proje toplantısı',
            aciklama: null,
            konum: null,
            katman: 'SPECTRALOOP',
            tumGun: false,
            gun: '2026-11-20',
            baslangicSaat: bas,
            bitisSaat: son,
          },
        },
        BILINEN,
      );
    expect(etkinlik('14:00', '15:00')).toMatchObject({
      ok: true,
      oneri: { tur: 'etkinlik', veri: { katman: 'SPECTRALOOP', baslangicGun: '2026-11-20' } },
    });
    expect(etkinlik('15:00', '14:00')).toMatchObject({ ok: false });
  });

  it('görev kuralları: saat gün olmadan gelemez; bilinmeyen araç reddedilir', () => {
    expect(
      oneriyiDogrula(
        {
          id: 'g',
          name: 'gorev_oner',
          input: {
            baslik: 'a',
            aciklama: null,
            dolapId: null,
            rafId: null,
            teslimGun: null,
            teslimSaat: '10:00',
            oncelik: 'NORMAL',
          },
        },
        BILINEN,
      ),
    ).toMatchObject({ ok: false, hata: expect.stringContaining('teslimSaat') });
    expect(oneriyiDogrula({ id: 'x', name: 'sil', input: {} }, BILINEN)).toMatchObject({
      ok: false,
    });
  });
});
