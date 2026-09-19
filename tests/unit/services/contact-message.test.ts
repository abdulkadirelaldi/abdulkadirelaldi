import { describe, expect, it, vi } from 'vitest';

import type { CreateContactMessageInput } from '@/lib/schemas';
import {
  countRecentContactMessagesByIp,
  createContactMessage,
  type ContactMessageClient,
  type ContactMessageServerFields,
} from '@/server/services/contact-message';

/**
 * `ContactMessage` servisi — §7.4, ADR-020/C11.
 *
 * İSTEMCİ ENJEKTE EDİLİYOR (servis konvansiyonu kuralı 1): `pnpm test` DB'siz
 * koşar. Taklit `ContactMessageClient` olarak TİPLENİYOR — gerçek Prisma
 * yüzeyi değişirse bu dosya derlenmez, sessizce yanlış şeyi doğrulamaz.
 */

const AN = new Date('2026-08-24T12:00:00.000Z');

const GIRDI: CreateContactMessageInput = {
  name: 'Ada Lovelace',
  email: 'ada@ornek.com',
  message: 'Bir kurumsal site yaptırmak istiyorum.',
  website: '',
};

const SUNUCU: ContactMessageServerFields = {
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0 (test)',
  isSpam: false,
  honeypotHit: false,
  spamScore: 0,
};

function istemci(): {
  client: ContactMessageClient;
  create: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({ id: 'msj_1', createdAt: AN });
  const count = vi.fn().mockResolvedValue(2);
  const findMany = vi.fn().mockResolvedValue([]);
  const findUnique = vi.fn().mockResolvedValue(null);
  const update = vi.fn().mockResolvedValue(null);
  /*
   * Cast YOK: `ContactMessageClient` dar bir arayüz olduğu için taklit ona
   * doğrudan oturuyor. Servis yeni bir Prisma metodu kullanmaya başlarsa bu
   * satır derlenmez — test sessizce eski yüzeyi doğrulamaya devam edemez.
   *
   * T-038'de KAPI ÇALIŞTI: mesaj kutusu `findMany`/`findUnique`/`update`
   * eklediğinde burası derlenmedi ve üç metodu eklemek zorunda kaldım.
   */
  const client: ContactMessageClient = {
    contactMessage: { create, count, findMany, findUnique, update },
  };
  return { client, create, count, findMany, findUnique, update };
}

/* ============================== SAYAÇ — §8.15 =========================== */

describe('countRecentContactMessagesByIp — §8.15 sayacı', () => {
  it('IP ve pencere başlangıcıyla sayar', async () => {
    const { client, count } = istemci();
    await expect(countRecentContactMessagesByIp('203.0.113.7', AN, client)).resolves.toBe(2);

    expect(count).toHaveBeenCalledWith({
      where: {
        ip: '203.0.113.7',
        // §8.15 penceresi bir saat: 12:00 → 11:00.
        createdAt: { gte: new Date('2026-08-24T11:00:00.000Z') },
      },
    });
  });

  it('ip YOKSA sorgu HİÇ atılmaz ve 0 döner', async () => {
    const { client, count } = istemci();
    // `ip IS NULL` sayılsaydı, vekil başlığı düşen bir kurulumda bütün
    // ziyaretçiler tek sayacı paylaşır ve birbirinin kotasını yerdi.
    await expect(countRecentContactMessagesByIp(null, AN, client)).resolves.toBe(0);
    expect(count).not.toHaveBeenCalled();
  });
});

/* ================================ YAZMA ================================= */

describe('createContactMessage', () => {
  it('mesajı ve sunucu alanlarını yazar, makbuz döner', async () => {
    const { client, create } = istemci();

    await expect(createContactMessage(GIRDI, SUNUCU, client)).resolves.toEqual({
      id: 'msj_1',
      createdAt: '2026-08-24T12:00:00.000Z',
    });

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@ornek.com',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (test)',
      isSpam: false,
      honeypotHit: false,
      spamScore: 0,
    });
  });

  it('SPAM MESAJ DA YAZILIR — silinmez, ayrılır (ADR-020/C11)', async () => {
    const { client, create } = istemci();
    await createContactMessage(
      GIRDI,
      { ...SUNUCU, isSpam: true, honeypotHit: true, spamScore: 60 },
      client,
    );

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      isSpam: true,
      honeypotHit: true,
      spamScore: 60,
    });
  });

  it('boş isteğe bağlı alanlar null yazılır — "girilmedi" ile "boş" aynı şey', async () => {
    const { client, create } = istemci();
    await createContactMessage(
      { ...GIRDI, phone: '  ', subject: '', sourcePage: '' },
      SUNUCU,
      client,
    );

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      phone: null,
      subject: null,
      sourcePage: null,
    });
  });

  it('dolu isteğe bağlı alanlar korunur', async () => {
    const { client, create } = istemci();
    await createContactMessage(
      { ...GIRDI, phone: '+90 555 000 00 00', subject: 'Teklif', sourcePage: '/hizmetler' },
      SUNUCU,
      client,
    );

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      phone: '+90 555 000 00 00',
      subject: 'Teklif',
      sourcePage: '/hizmetler',
    });
  });

  it('yalnızca makbuz alanları seçilir — mesaj gövdesi geri okunmaz', async () => {
    const { client, create } = istemci();
    await createContactMessage(GIRDI, SUNUCU, client);
    expect(create.mock.calls[0]?.[0].select).toEqual({ id: true, createdAt: true });
  });
});
