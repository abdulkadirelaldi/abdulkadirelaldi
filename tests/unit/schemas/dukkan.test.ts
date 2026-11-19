import { describe, expect, it } from 'vitest';

import { dukkanSchema, paketSaySchema } from '@/lib/schemas/dukkan';

/** DÜKKÂN ŞEMASI (ADR-058): anahtar biçimi, yalnızca Drive adresi, paket hedefi sınırı. */
describe('dukkanSchema', () => {
  const temel = { anahtar: 'd:garage', paket: null };

  it('anahtar: dükkân ya da bilinen bina', () => {
    expect(dukkanSchema.safeParse(temel).success).toBe(true);
    expect(dukkanSchema.safeParse({ ...temel, anahtar: 'b:OKUL' }).success).toBe(true);
    expect(dukkanSchema.safeParse({ ...temel, anahtar: 'b:YOK' }).success).toBe(false);
    expect(dukkanSchema.safeParse({ ...temel, anahtar: 'garage' }).success).toBe(false);
    expect(dukkanSchema.safeParse({ ...temel, anahtar: 'd: ' }).success).toBe(false);
  });

  it('Drive adresi: boş → null; yalnız https drive/docs', () => {
    expect(dukkanSchema.parse({ ...temel, driveUrl: '' }).driveUrl).toBeNull();
    expect(
      dukkanSchema.parse({ ...temel, driveUrl: ' https://drive.google.com/drive/folders/x ' })
        .driveUrl,
    ).toBe('https://drive.google.com/drive/folders/x');
    for (const kotu of [
      'http://drive.google.com/x',
      'https://evil.test/x',
      'javascript:alert(1)',
      'drive',
    ]) {
      expect(dukkanSchema.safeParse({ ...temel, driveUrl: kotu }).success).toBe(false);
    }
  });

  it('paket hedefi 0–99 tam sayı; not boşsa null', () => {
    const p = dukkanSchema.parse({ ...temel, not: '  ', paket: { reels: 4, post: 8, story: 8 } });
    expect(p).toMatchObject({ not: null, paket: { reels: 4 } });
    expect(
      dukkanSchema.safeParse({ ...temel, paket: { reels: 100, post: 8, story: 8 } }).success,
    ).toBe(false);
    expect(
      dukkanSchema.safeParse({ ...temel, paket: { reels: 1.5, post: 8, story: 8 } }).success,
    ).toBe(false);
  });

  it('sayaç yalnız ±1', () => {
    expect(paketSaySchema.safeParse({ anahtar: 'd:x', tur: 'reels', fark: 1 }).success).toBe(true);
    expect(paketSaySchema.safeParse({ anahtar: 'd:x', tur: 'reels', fark: 2 }).success).toBe(false);
    expect(paketSaySchema.safeParse({ anahtar: 'd:x', tur: 'tiktok', fark: 1 }).success).toBe(
      false,
    );
  });
});
