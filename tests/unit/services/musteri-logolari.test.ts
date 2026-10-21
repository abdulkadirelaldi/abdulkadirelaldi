import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T-117 — MÜŞTERİ LOGO ŞERİDİ: müşterinin public'e çıkan TEK yüzeyi.
 *
 * ⚠️ EN ÖNEMLİ İDDİA: sorgu e-posta/telefon/not/şirket SEÇMİYOR. DTO'dan
 * sonra süzmek değil SEÇMEMEK — bir gün DTO'ya alan eklenirse sızıntı tip
 * değişikliği ister, sessizce olmaz.
 */

const { dbMock } = vi.hoisted(() => ({
  dbMock: { client: { findMany: vi.fn(), count: vi.fn() } },
}));
vi.mock('@/server/db', () => ({ db: dbMock }));

const { fetchSiteClientLogos, isPublicClientLogo } = await import('@/server/services/client');

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.client.findMany.mockResolvedValue([
    {
      id: 'c1',
      name: 'Kıyı Medya',
      logo: { id: 'a1', key: 'client/c1/x.png', mime: 'image/png', width: 120, height: 40 },
    },
    // Logo satırı ilişkiden boş dönerse (yarış) şeritte boş kutu ÇİZİLMEZ.
    { id: 'c2', name: 'Logosuz', logo: null },
  ]);
});

describe('fetchSiteClientLogos', () => {
  it('⚠️ YALNIZCA id, ad ve logo SEÇİLİYOR — kişisel alanlar sorguya girmiyor', async () => {
    await fetchSiteClientLogos();
    const select = dbMock.client.findMany.mock.calls[0]?.[0].select;

    expect(Object.keys(select).sort()).toEqual(['id', 'logo', 'name']);
    for (const alan of ['email', 'phone', 'notes', 'company'])
      expect(select).not.toHaveProperty(alan);
  });

  it('⚠️ üç koşul da şart: işaretli, arşivde değil, logosu var', async () => {
    await fetchSiteClientLogos();
    expect(dbMock.client.findMany.mock.calls[0]?.[0].where).toEqual({
      showOnSite: true,
      isArchived: false,
      logoAttachmentId: { not: null },
    });
  });

  it('logosu çözülemeyen satır şeride girmiyor', async () => {
    expect((await fetchSiteClientLogos()).map((l) => l.name)).toEqual(['Kıyı Medya']);
  });
});

describe('isPublicClientLogo', () => {
  it('⚠️ sorgu SAHİBİ de soruyor — yabancı eklenti logo alanından geçemez', async () => {
    dbMock.client.count.mockResolvedValue(0);
    expect(await isPublicClientLogo('a1', 'c1')).toBe(false);
    expect(dbMock.client.count.mock.calls[0]?.[0].where).toEqual({
      showOnSite: true,
      isArchived: false,
      logoAttachmentId: 'a1',
      id: 'c1',
    });
  });
});
