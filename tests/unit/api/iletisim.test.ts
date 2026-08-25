import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTACT_RATE_LIMIT, CONTACT_TIME_TRAP, issueFormToken } from '@/server/services/_shared';
import type { ApiResponse } from '@/types';

/**
 * `POST/GET /api/v1/iletisim` — T-027, §7.2 zarfı ve §8.15.
 *
 * SERVİS TAKLİT EDİLİYOR, veritabanı DEĞİL: `pnpm test` DB'siz koşar
 * (vitest.config.ts'in pazarlık dışı kuralı). Taklit edilen yüzey, servisin
 * gerçek imzasıyla `satisfies` üzerinden bağlı — imza değişirse test derlenmez,
 * sessizce yanlış şeyi doğrulamaz.
 */

const createContactMessage = vi.hoisted(() => vi.fn());
const countRecentContactMessagesByIp = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/contact-message', () => ({
  createContactMessage,
  countRecentContactMessagesByIp,
}));

const SIR = 'test-secret-abcdefghijklmnopqrstuvwxyz';

const GECERLI_GOVDE = {
  name: 'Ada Lovelace',
  email: 'ada@ornek.com',
  message: 'Bir kurumsal site yaptırmak istiyorum, detayları konuşalım.',
  sourcePage: '/iletisim',
  website: '',
};

/** Zaman tuzağını geçen bir jeton — form yeterince önce çizilmiş. */
function bekleyenJeton(): string {
  return issueFormToken(new Date(Date.now() - (CONTACT_TIME_TRAP.minFillSeconds + 5) * 1000), SIR);
}

function istek(govde: unknown, basliklar: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/v1/iletisim', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'Mozilla/5.0 (test)',
      ...basliklar,
    },
    body: typeof govde === 'string' ? govde : JSON.stringify(govde),
  });
}

async function gonder(
  govde: unknown,
  basliklar?: Record<string, string>,
): Promise<{ status: number; body: ApiResponse<{ id: string; createdAt: string }> }> {
  const { POST } = await import('@/app/api/v1/iletisim/route');
  const yanit = await POST(istek(govde, basliklar));
  return {
    status: yanit.status,
    body: (await yanit.json()) as ApiResponse<{ id: string; createdAt: string }>,
  };
}

/** Servise geçirilen sunucu-tarafı alanlar (`ip`, `spamScore`, …). */
function kaydedilenSunucuAlanlari(): Record<string, unknown> {
  return createContactMessage.mock.calls[0]?.[1] as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', SIR);
  countRecentContactMessagesByIp.mockResolvedValue(0);
  createContactMessage.mockResolvedValue({ id: 'msj_1', createdAt: '2026-08-24T12:00:00.000Z' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/* ============================ GEÇERLİ GÖNDERİM ========================== */

describe('geçerli gönderim', () => {
  it('201 ve §7.2 başarı zarfı döner', async () => {
    const { status, body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    expect(status).toBe(201);
    expect(body).toEqual({
      ok: true,
      data: { id: 'msj_1', createdAt: '2026-08-24T12:00:00.000Z' },
    });
  });

  it('mesaj DB servisine YAZILIYOR; ip ve userAgent kaydediliyor', async () => {
    await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    expect(createContactMessage).toHaveBeenCalledOnce();
    expect(createContactMessage.mock.calls[0]?.[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@ornek.com',
    });
    expect(kaydedilenSunucuAlanlari()).toMatchObject({
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (test)',
      isSpam: false,
      honeypotHit: false,
      spamScore: 0,
    });
  });

  it('yanıt gövdesi mesajı GERİ YANSITMIYOR — yalnızca makbuz', async () => {
    const { body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });
    const ham = JSON.stringify(body);

    expect(ham).not.toContain('ada@ornek.com');
    expect(ham).not.toContain('kurumsal site');
    // Bota puanını söylemek sonraki denemeyi bilgilendirirdi.
    expect(ham).not.toContain('spamScore');
  });

  it('vekil başlığı yoksa ip null yazılır — hepsi tek sayaca toplanmaz', async () => {
    const govde = { ...GECERLI_GOVDE, formToken: bekleyenJeton() };
    const yanit = await (
      await import('@/app/api/v1/iletisim/route')
    ).POST(
      new Request('http://localhost:3000/api/v1/iletisim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(govde),
      }),
    );

    expect(yanit.status).toBe(201);
    expect(kaydedilenSunucuAlanlari()).toMatchObject({ ip: null });
  });
});

/* ============================= GEÇERSİZ ALAN =========================== */

describe('geçersiz alan — §7.2 VALIDATION_ERROR', () => {
  it('bozuk e-posta 400 döner ve alan anahtarı form adıyla birebir', async () => {
    const { status, body } = await gonder({
      ...GECERLI_GOVDE,
      email: 'eposta-degil',
      formToken: bekleyenJeton(),
    });

    expect(status).toBe(400);
    expect(body.ok).toBe(false);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.code).toBe('VALIDATION_ERROR');
    // Frontend `setError('email', …)` ile doğrudan basacak.
    expect(body.error.fields?.email).toBeTruthy();
    expect(createContactMessage).not.toHaveBeenCalled();
  });

  it('çok kısa mesaj T-011 kuralına takılır — kural burada YENİDEN YAZILMADI', async () => {
    const { status, body } = await gonder({ ...GECERLI_GOVDE, message: 'kısa' });
    expect(status).toBe(400);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.fields?.message).toContain('10 karakter');
  });

  it('JSON olmayan gövde 400 — 500 DEĞİL', async () => {
    const { status, body } = await gonder('bu json değil{');
    expect(status).toBe(400);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('dizi gövde 400 — Zod öncesi şekil kontrolü', async () => {
    const { status } = await gonder([1, 2, 3]);
    expect(status).toBe(400);
  });

  it('honeypot DOLU ama alanlar geçersizse yine 400 — bot honeypot bilgisi almaz', async () => {
    const { status, body } = await gonder({
      ...GECERLI_GOVDE,
      email: 'yok',
      website: 'http://bot',
    });
    expect(status).toBe(400);
    if (body.ok) throw new Error('beklenmedik başarı');
    // Tuzağın adı hata gövdesinde GEÇMEZ.
    expect(body.error.fields?.website).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('website');
  });
});

/* ================================ HONEYPOT ============================== */

describe('honeypot — ADR-020/C11', () => {
  it('dolu honeypot: mesaj SAKLANIR, honeypotHit true, isSpam true', async () => {
    const { status } = await gonder({
      ...GECERLI_GOVDE,
      website: 'http://spam.example',
      formToken: bekleyenJeton(),
    });

    expect(status).toBe(201);
    expect(createContactMessage).toHaveBeenCalledOnce();
    expect(kaydedilenSunucuAlanlari()).toMatchObject({ honeypotHit: true, isSpam: true });
  });

  it('kullanıcıya BAŞARI döner — bota "yakalandın" denmiyor', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const temiz = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });
    createContactMessage.mockClear();
    const tuzakli = await gonder({
      ...GECERLI_GOVDE,
      website: 'x',
      formToken: bekleyenJeton(),
    });

    // İki yanıt AYIRT EDİLEMEZ olmalı: durum kodu da gövde de aynı.
    expect(tuzakli.status).toBe(temiz.status);
    expect(tuzakli.body).toEqual(temiz.body);
  });

  it('sadece BOŞLUK içeren honeypot tuzak saymaz', async () => {
    await gonder({ ...GECERLI_GOVDE, website: '   ', formToken: bekleyenJeton() });
    expect(kaydedilenSunucuAlanlari()).toMatchObject({ honeypotHit: false, isSpam: false });
  });
});

/* ============================== ZAMAN TUZAĞI ============================ */

describe('zaman tuzağı — §8.15', () => {
  it('anında gönderim işaretlenir ama REDDEDİLMEZ', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { status } = await gonder({
      ...GECERLI_GOVDE,
      formToken: issueFormToken(new Date(), SIR),
    });

    expect(status).toBe(201);
    const alanlar = kaydedilenSunucuAlanlari();
    expect(alanlar.spamScore).toBeGreaterThan(0);
    // Tek başına eşiği aşmaz — hızlı yapıştıran gerçek kullanıcı spam olmaz.
    expect(alanlar.isSpam).toBe(false);
  });

  it('jeton hiç yoksa istek REDDEDİLMEZ — ağ hatası müşteriyi susturmasın', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { status } = await gonder(GECERLI_GOVDE);

    expect(status).toBe(201);
    expect(kaydedilenSunucuAlanlari()).toMatchObject({ isSpam: false });
  });

  it('honeypot + anında gönderim: iki sinyal toplanır', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await gonder({
      ...GECERLI_GOVDE,
      website: 'bot',
      formToken: issueFormToken(new Date(), SIR),
    });

    const alanlar = kaydedilenSunucuAlanlari();
    expect(alanlar.isSpam).toBe(true);
    expect(alanlar.spamScore).toBeGreaterThan(60);
  });

  it('GET imzalı jeton ve asgari süreyi yayınlar', async () => {
    const { GET } = await import('@/app/api/v1/iletisim/route');
    const yanit = GET();
    const govde = (await yanit.json()) as ApiResponse<{
      formToken: string;
      minFillSeconds: number;
    }>;

    expect(yanit.status).toBe(200);
    if (!govde.ok) throw new Error('beklenmedik hata');
    expect(govde.data.minFillSeconds).toBe(CONTACT_TIME_TRAP.minFillSeconds);
    expect(govde.data.formToken).toMatch(/^v1\.\d+\.[0-9a-f]{64}$/);
    // Jeton ÖNBELLEKLENİRSE her ziyaretçi aynı damgayı alır ve tuzak ölür.
    expect(yanit.headers.get('cache-control')).toContain('no-store');
  });

  it('AUTH_SECRET yoksa GET jeton VERMEZ — sessiz sabit anahtara düşmez', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('@/app/api/v1/iletisim/route');
    const yanit = GET();

    expect(yanit.status).toBe(500);
    expect(JSON.stringify(await yanit.json())).not.toContain('AUTH_SECRET');
  });
});

/* ============================== HIZ SINIRI ============================== */

describe('hız sınırı — §8.15 "IP başına saatte 3"', () => {
  it(`eşiğin altında (${CONTACT_RATE_LIMIT.maxPerWindow - 1}) geçer`, async () => {
    countRecentContactMessagesByIp.mockResolvedValue(CONTACT_RATE_LIMIT.maxPerWindow - 1);
    const { status } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });
    expect(status).toBe(201);
  });

  it(`eşiğe ulaşınca (${CONTACT_RATE_LIMIT.maxPerWindow}) 429 + RATE_LIMITED`, async () => {
    countRecentContactMessagesByIp.mockResolvedValue(CONTACT_RATE_LIMIT.maxPerWindow);
    const { status, body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    expect(status).toBe(429);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.code).toBe('RATE_LIMITED');
    // Aşımda mesaj KAYDEDİLMEZ — reddedilen istek pencereyi uzatmaz.
    expect(createContactMessage).not.toHaveBeenCalled();
  });

  it('429 Retry-After taşır', async () => {
    countRecentContactMessagesByIp.mockResolvedValue(5);
    const { POST } = await import('@/app/api/v1/iletisim/route');
    const yanit = await POST(istek({ ...GECERLI_GOVDE, formToken: bekleyenJeton() }));
    expect(yanit.headers.get('retry-after')).toBe('3600');
  });

  it('sayaç IP başına ve pencere içinde okunuyor', async () => {
    await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });
    expect(countRecentContactMessagesByIp).toHaveBeenCalledWith('203.0.113.7', expect.any(Date));
  });

  it('sayaç okunamazsa 500 — sınır sessizce ATLANMAZ', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    countRecentContactMessagesByIp.mockRejectedValue(new Error('DB kapalı'));
    const { status, body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    expect(status).toBe(500);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(createContactMessage).not.toHaveBeenCalled();
  });
});

/* ===================== BİLDİRİM HATASI AKIŞI DURDURMUYOR ================ */

describe('bildirim hatası akışı DURDURMUYOR', () => {
  it('adaptör fırlatsa bile 201 döner ve mesaj kaydedilmiş kalır', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => {});
    const paylasilan = await import('@/server/services/_shared');
    vi.spyOn(paylasilan, 'resolveContactNotifier').mockReturnValue({
      name: 'patlayan',
      send: () => Promise.reject(new Error('SMTP 500')),
    });

    const { status, body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    expect(status).toBe(201);
    expect(body.ok).toBe(true);
    expect(createContactMessage).toHaveBeenCalledOnce();
    expect(hata).toHaveBeenCalled();
  });

  it('DB yazması başarısızsa 500 — BU başarısızlık akışı durdurur', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createContactMessage.mockRejectedValue(new Error('bağlantı yok'));
    const { status, body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    // Mesaj kaydedilmediyse başarı demek yalan olurdu ve mesaj kaybolurdu.
    expect(status).toBe(500);
    if (body.ok) throw new Error('beklenmedik başarı');
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

/* ================================ §8.20 ================================ */

describe('§8.20 — loglarda ham e-posta YOK', () => {
  it('spam sinyali logu kimlik değil kayıt kimliği basar', async () => {
    const uyari = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await gonder({ ...GECERLI_GOVDE, website: 'bot', formToken: bekleyenJeton() });

    const satirlar = uyari.mock.calls.flat().map(String).join(' ');
    expect(satirlar).toContain('msj_1');
    expect(satirlar).not.toContain('ada@ornek.com');
    expect(satirlar).not.toContain('Ada Lovelace');
  });

  it('DB hatası kullanıcıya yığın izi veya hata metni sızdırmaz', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createContactMessage.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5433'));
    const { body } = await gonder({ ...GECERLI_GOVDE, formToken: bekleyenJeton() });

    const ham = JSON.stringify(body);
    expect(ham).not.toContain('ECONNREFUSED');
    expect(ham).not.toContain('5433');
  });
});
