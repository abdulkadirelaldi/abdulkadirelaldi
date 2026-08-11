import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { createTransactionSchema, createProjectSchema } from '@/lib/schemas';
import {
  buildPeriodKey,
  calculateReadingMinutes,
  countWords,
  fail,
  internalError,
  isValidPeriodKey,
  notFound,
  ok,
  parseOrFail,
  periodKeyForInstant,
  toMeasureString,
  toMoneyString,
  toRateString,
  toValidationFailure,
  unauthorized,
  WORDS_PER_MINUTE,
} from '@/server/services/_shared';

/* ============================ periodKey — ADR-015 ======================== */

describe('buildPeriodKey — dört biçim', () => {
  it('DAILY → YYYY-MM-DD', () => {
    expect(buildPeriodKey('DAILY', '2026-08-05')).toBe('2026-08-05');
  });
  it('WEEKLY → YYYY-Www', () => {
    expect(buildPeriodKey('WEEKLY', '2026-08-05')).toBe('2026-W32');
  });
  it('MONTHLY → YYYY-MM', () => {
    expect(buildPeriodKey('MONTHLY', '2026-08-05')).toBe('2026-08');
  });
  it('YEARLY → YYYY', () => {
    expect(buildPeriodKey('YEARLY', '2026-08-05')).toBe('2026');
  });

  it('hafta numarası tek haneliyse sıfırla doldurulur', () => {
    expect(buildPeriodKey('WEEKLY', '2026-01-05')).toMatch(/^\d{4}-W0\d$/);
  });

  it('YIL SINIRI: haftalık anahtar ISO yılını kullanır', () => {
    // 1 Ocak 2027 → ISO haftası 2026-W53; takvim yılı yazılsaydı 2027-W53 olurdu
    // ve aynı hafta iki farklı anahtar üretirdi.
    expect(buildPeriodKey('WEEKLY', '2027-01-01')).toBe('2026-W53');
  });

  it('üretilen dört anahtar da geçerli biçimde', () => {
    for (const freq of ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const) {
      expect(isValidPeriodKey(buildPeriodKey(freq, '2026-08-05')), freq).toBe(true);
    }
  });

  it('DETERMİNİSTİK — aynı gün daima aynı anahtar', () => {
    expect(buildPeriodKey('MONTHLY', '2026-08-05')).toBe(buildPeriodKey('MONTHLY', '2026-08-05'));
  });
});

describe('periodKeyForInstant — ADR-016 zaman dilimi yardımcısını kullanır', () => {
  it('UTC 21:00’de ERTESİ günün anahtarını üretir', () => {
    // Cron UTC'de koşuyor. Yerel saat kullanılsaydı 31 Temmuz 21:00'de
    // "2026-07" üretilir ve ağustos kaydı temmuza yazılırdı.
    expect(periodKeyForInstant('MONTHLY', new Date('2026-07-31T21:00:00Z'))).toBe('2026-08');
    expect(periodKeyForInstant('DAILY', new Date('2026-07-31T21:00:00Z'))).toBe('2026-08-01');
  });

  it('YIL SINIRI: 31 Aralık 21:00 UTC → sonraki yıl', () => {
    expect(periodKeyForInstant('YEARLY', new Date('2026-12-31T21:00:00Z'))).toBe('2027');
  });
});

describe('isValidPeriodKey', () => {
  it('geçerli biçimler', () => {
    for (const key of ['2026', '2026-08', '2026-W32', '2026-08-05']) {
      expect(isValidPeriodKey(key), key).toBe(true);
    }
  });
  it('geçersiz biçimler', () => {
    for (const key of ['2026-13', '2026-W54', '26-08', '2026-8', '2026-08-32']) {
      expect(isValidPeriodKey(key), key).toBe(false);
    }
  });
});

/* ========================= readingMinutes — ADR-019 ====================== */

describe('calculateReadingMinutes', () => {
  it('en az 1 dakika döner — "0 dakika" anlamsız', () => {
    expect(calculateReadingMinutes('')).toBe(1);
    expect(calculateReadingMinutes('tek kelime')).toBe(1);
  });

  it(`${WORDS_PER_MINUTE} kelime = 1 dakika`, () => {
    expect(calculateReadingMinutes('kelime '.repeat(WORDS_PER_MINUTE))).toBe(1);
  });

  it('yukarı yuvarlar — yarım dakika da okunuyor', () => {
    expect(calculateReadingMinutes('kelime '.repeat(WORDS_PER_MINUTE + 1))).toBe(2);
    expect(calculateReadingMinutes('kelime '.repeat(WORDS_PER_MINUTE * 3))).toBe(3);
  });

  it('KOD BLOKLARI sayılmaz — teknik yazıda süreyi şişirirdi', () => {
    const withCode = `Giriş metni.\n\n\`\`\`ts\n${'const x = 1;\n'.repeat(200)}\`\`\`\n\nSon.`;
    expect(calculateReadingMinutes(withCode)).toBe(1);
  });

  it('bağlantı hedefi sayılmaz, bağlantı metni sayılır', () => {
    expect(countWords('[Kıyı Medya](https://kiyimedya.com/cok/uzun/bir/yol)')).toBe(2);
  });

  it('görsel yolu sayılmaz, alt metni sayılır', () => {
    expect(countWords('![kapak gorseli](/images/a/b/c.png)')).toBe(2);
  });

  it('markdown işaretleri kelime saymaz', () => {
    expect(countWords('## Başlık\n\n- madde bir\n- madde iki')).toBe(5);
  });

  it('HTML/JSX etiketleri sayılmaz', () => {
    expect(countWords('<Callout type="info">Uyarı metni</Callout>')).toBe(2);
  });
});

/* ======================= Decimal → string — ADR-014 ====================== */

/** Prisma `Decimal`'in test karşılığı — tek ihtiyacımız `toFixed`. */
const decimal = (value: string) => ({ toFixed: (dp = 0) => Number(value).toFixed(dp) });

describe('Decimal dönüştürücüleri', () => {
  it('toMoneyString 2 ondalık verir', () => {
    expect(toMoneyString(decimal('1250'))).toBe('1250.00');
    expect(toMoneyString(decimal('1250.5'))).toBe('1250.50');
  });

  it('toRateString 8 ondalık verir', () => {
    expect(toRateString(decimal('34.25'))).toBe('34.25000000');
  });

  it('toMeasureString verilen ölçeği kullanır', () => {
    expect(toMeasureString(decimal('82.4'), 2)).toBe('82.40');
    expect(toMeasureString(decimal('18.5'), 1)).toBe('18.5');
  });

  it('null geçirilirse null döner (opsiyonel alanlar)', () => {
    expect(toMoneyString(null)).toBeNull();
    expect(toRateString(undefined)).toBeNull();
  });

  it('Decimal olmayan değer TİP HATASI verir — sessizce geçmez', () => {
    expect(() => toMoneyString('1250.00' as unknown as { toFixed(): string })).toThrow(TypeError);
  });

  it('ÇIKTI DAİMA string — hiçbir servis Decimal döndürmemeli', () => {
    expect(typeof toMoneyString(decimal('1'))).toBe('string');
    expect(typeof toRateString(decimal('1'))).toBe('string');
  });
});

/* ========================= §7.2 yanıt zarfı ============================== */

describe('ok / fail / kısayollar', () => {
  it('ok zarfı', () => {
    expect(ok({ id: '1' })).toEqual({ ok: true, data: { id: '1' } });
  });

  it('fail zarfı, fields opsiyonel', () => {
    expect(fail('NOT_FOUND', 'yok')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'yok' },
    });
  });

  it('unauthorized / notFound kısayolları', () => {
    expect(unauthorized().error.code).toBe('UNAUTHORIZED');
    expect(notFound().error.code).toBe('NOT_FOUND');
  });

  it('internalError §8.20 — mesaj GENEL, ayrıntı sızmaz', () => {
    const result = internalError('test', new Error('veritabani baglantisi koptu: 10.0.0.5:5432'));
    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).toBe('İşlem tamamlanamadı. Lütfen tekrar deneyin.');
    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });
});

describe('toValidationFailure — §7.2 fields eşlemesi', () => {
  it('VALIDATION_ERROR kodu ve alan sözlüğü', () => {
    const result = createProjectSchema.safeParse({
      slug: 'İŞIK',
      title: '',
      summary: '',
      content: '',
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const failure = toValidationFailure(result.error);
    expect(failure.ok).toBe(false);
    expect(failure.error.code).toBe('VALIDATION_ERROR');
    expect(failure.error.fields?.slug).toBeDefined();
    expect(failure.error.fields?.title).toBeDefined();
  });

  it('fields ANAHTARLARI form alan adlarıyla birebir aynı', () => {
    const result = createTransactionSchema.safeParse({
      type: 'INCOME',
      amount: '100.00',
      currency: 'USD',
      fxRate: '1', // çapraz kural ihlali → path: ['fxRate']
      date: '2026-08-05',
      categoryId: 'clx0000000000000000000001',
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const failure = toValidationFailure(result.error);
    expect(Object.keys(failure.error.fields ?? {})).toContain('fxRate');
    expect(failure.error.fields?.fxRate).toContain('Kur');
  });

  it('alan başına YALNIZCA İLK mesaj taşınır', () => {
    // Tek alanda iki kural birden ihlal ediliyor; kullanıcıya tek satır gösterilecek.
    const schema = z.object({
      ad: z
        .string()
        .min(5, { error: 'en az 5 karakter' })
        .regex(/^\d+$/, { error: 'sadece rakam' }),
    });
    const result = schema.safeParse({ ad: 'ab' });
    if (result.success) return;
    const failure = toValidationFailure(result.error);
    expect(failure.error.fields?.ad).toBe('en az 5 karakter');
  });

  it('İÇ İÇE alanlar nokta ile düzleştirilir', () => {
    const schema = z.object({
      socials: z.object({ github: z.url({ error: 'geçersiz bağlantı' }) }),
    });
    const result = schema.safeParse({ socials: { github: 'degil' } });
    if (result.success) return;
    expect(toValidationFailure(result.error).error.fields?.['socials.github']).toBe(
      'geçersiz bağlantı',
    );
  });

  it('alan adı olmayan (form düzeyi) hata message’a düşer', () => {
    const schema = z.object({ a: z.string() }).refine(() => false, { error: 'form düzeyi hata' });
    const result = schema.safeParse({ a: 'x' });
    if (result.success) return;
    expect(toValidationFailure(result.error).error.message).toBe('form düzeyi hata');
  });
});

describe('parseOrFail — Server Action akışı (§7.1)', () => {
  it('geçerli girdide veriyi döner', () => {
    const result = parseOrFail(z.object({ a: z.string() }), { a: 'x' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ a: 'x' });
  });

  it('geçersiz girdide §7.2 zarfı döner', () => {
    const result = parseOrFail(z.object({ a: z.string() }), { a: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.error.code).toBe('VALIDATION_ERROR');
  });
});
