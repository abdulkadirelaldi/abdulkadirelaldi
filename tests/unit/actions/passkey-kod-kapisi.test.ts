import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, dogrulaMock, seceneklerMock } = vi.hoisted(() => ({
  dbMock: { user: { findUniqueOrThrow: vi.fn() } },
  dogrulaMock: vi.fn(),
  seceneklerMock: vi.fn().mockResolvedValue({ challenge: 'c' }),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://abdulkadirelaldi.com' }),
}));
vi.mock('@/server/db', () => ({ db: dbMock }));
vi.mock('@/server/auth/credentials', () => ({ verifyTotpWithRecovery: dogrulaMock }));
vi.mock('@/server/auth/passkey', () => ({
  rpCoz: () => ({ id: 'abdulkadirelaldi.com', origin: 'https://abdulkadirelaldi.com' }),
  kayitSecenekleri: seceneklerMock,
  PasskeyHatasi: class extends Error {},
}));
vi.mock('@/server/actions/_shared', () => ({
  currentActorId: async () => 'u1',
  toFailure: (_: string, e: unknown) => {
    throw e;
  },
  unauthorized: () => ({ ok: false }),
}));

import { passkeyKayitSecenekleriAction } from '@/server/actions/passkey';

const kullanici = (totpConfirmedAt: Date | null) => ({
  id: 'u1',
  email: 'a@b.c',
  name: 'A',
  totpSecret: 's',
  totpBackupCodes: [],
  totpConfirmedAt,
});

beforeEach(() => {
  dogrulaMock.mockReset();
  seceneklerMock.mockClear();
});

describe('⚠️ Face ID eklemek doğrulama kodu ister', () => {
  it('2FA kuruluyken kodsuz meydan okuma verilmez', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    const r = await passkeyKayitSecenekleriAction({});
    expect(r.ok).toBe(false);
    expect(seceneklerMock).not.toHaveBeenCalled();
  });

  it('yanlış kodla meydan okuma verilmez', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    dogrulaMock.mockResolvedValue(false);
    const r = await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(r.ok).toBe(false);
    expect(seceneklerMock).not.toHaveBeenCalled();
  });

  it('doğru kodla verilir', async () => {
    dbMock.user.findUniqueOrThrow.mockResolvedValue(kullanici(new Date()));
    dogrulaMock.mockResolvedValue(true);
    const r = await passkeyKayitSecenekleriAction({ totpKodu: '123456' });
    expect(r.ok).toBe(true);
    expect(seceneklerMock).toHaveBeenCalledTimes(1);
  });
});
