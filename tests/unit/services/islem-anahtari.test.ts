import { describe, expect, it, vi } from 'vitest';

import { birKez } from '@/server/services/islem-anahtari';

/** Gerçek davranışı taklit eder: anahtar kümesi, başarısız işlemde geri alma. */
function sahte() {
  const anahtarlar = new Set<string>();
  const client = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const eklenen: string[] = [];
      const tx = {
        islemAnahtari: {
          create: async ({ data }: { data: { anahtar: string } }) => {
            if (anahtarlar.has(data.anahtar)) {
              throw Object.assign(new Error('benzersiz'), { code: 'P2002' });
            }
            anahtarlar.add(data.anahtar);
            eklenen.push(data.anahtar);
          },
        },
      };
      try {
        return await fn(tx);
      } catch (e) {
        eklenen.forEach((a) => anahtarlar.delete(a)); // geri alma
        throw e;
      }
    },
  } as never;
  return client;
}

describe('birKez — yanıtı kaybolan istek iki kez yazmaz (2026-10-31)', () => {
  it('⚠️ aynı anahtarla ikinci çağrı işi ÇALIŞTIRMAZ', async () => {
    const client = sahte();
    const is = vi.fn().mockResolvedValue('kayit');
    expect(await birKez('a', is, client)).toBe('kayit');
    expect(await birKez('a', is, client)).toBeNull();
    expect(is).toHaveBeenCalledTimes(1);
  });

  it('iş başarısızsa anahtar kalmaz, yeniden deneme çalışır', async () => {
    const client = sahte();
    const is = vi.fn().mockRejectedValueOnce(new Error('db')).mockResolvedValue('kayit');
    await expect(birKez('a', is, client)).rejects.toThrow('db');
    expect(await birKez('a', is, client)).toBe('kayit');
  });

  it('anahtarsız çağrı her seferinde çalışır; başka hata yutulmaz', async () => {
    const client = sahte();
    const is = vi.fn().mockResolvedValue(1);
    await birKez(undefined, is, client);
    await birKez(undefined, is, client);
    expect(is).toHaveBeenCalledTimes(2);
    const hata = Object.assign(new Error('x'), { code: 'P2025' });
    await expect(birKez('b', vi.fn().mockRejectedValue(hata), client)).rejects.toBe(hata);
  });
});
