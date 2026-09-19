import { describe, expect, it, vi } from 'vitest';

import { contactMessageFilterSchema } from '@/lib/schemas';
import {
  buildContactMessageWhere,
  fetchContactMessageById,
  fetchContactMessages,
  updateContactMessageStatus,
  type ContactMessageClient,
} from '@/server/services/contact-message';

/**
 * MESAJ KUTUSU OKUMA VE DURUM YAZMA — §4.2, T-038.
 *
 * İstemci enjekte ediliyor (servis konvansiyonu kuralı 1): `pnpm test` DB'siz
 * koşar. Sınanan şey Prisma'nın davranışı değil, SERVİSİN ONA NE GÖNDERDİĞİ.
 */

const ID = 'clx0000000000000000000001';
const AN = new Date('2026-09-09T12:00:00.000Z');

const SATIR = {
  id: ID,
  name: 'Ayşe Yılmaz',
  email: 'ayse@ornek.com',
  phone: null,
  subject: 'Teklif',
  message: 'Merhaba, bir kurumsal site yaptırmak istiyorum ve detayları konuşmak isterim.',
  sourcePage: '/iletisim',
  isRead: false,
  isSpam: false,
  honeypotHit: false,
  spamScore: 0,
  repliedAt: null,
  archivedAt: null,
  createdAt: AN,
  convertedJob: null as { id: string } | null,
};

function istemci(satirlar = [SATIR], sayilar = [1, 1]) {
  const findMany = vi.fn().mockResolvedValue(satirlar);
  const count = vi.fn().mockResolvedValueOnce(sayilar[0]).mockResolvedValueOnce(sayilar[1]);
  const findUnique = vi.fn().mockResolvedValue({ ...SATIR, ip: '203.0.113.7', userAgent: 'UA' });
  const update = vi.fn().mockResolvedValue(SATIR);
  const create = vi.fn();
  const client: ContactMessageClient = {
    contactMessage: { create, count, findMany, findUnique, update },
  };
  return { client, findMany, count, findUnique, update };
}

/** Şemadan geçmiş filtre — varsayılanlar (page/perPage) dolsun diye. */
function filtre(ham: Record<string, unknown> = {}) {
  return contactMessageFilterSchema.parse(ham);
}

/* ===========================================================================
 * ⚠️ URL BOOLE FİLTRESİ — T-038'de ÖLÇÜLEN KUSUR
 * ======================================================================== */

describe('boole filtresi — `z.coerce.boolean()` kusuru', () => {
  /**
   * ÖLÇÜLDÜ (zod 4.4.3): `z.coerce.boolean()` `Boolean(value)`dır ve BOŞ OLMAYAN
   * HER DİZE `true`dur — `"false"` dahil.
   *
   * Filtreler URL arama parametrelerinden gelir (şemanın kendi notu: "değerler
   * DAİMA string'tir"), yani `?isRead=false` "okunmamışları getir" derken TAM
   * TERSİNİ yapıyordu ve hiçbir hata vermiyordu. Sessiz olduğu için en kötü
   * sınıftan: filtre ÇALIŞIYOR görünür, yalnızca yanlış kümeyi döndürür.
   */
  it('"false" DİZESİ artık false — kusurun kendisi', () => {
    expect(filtre({ isRead: 'false' }).isRead).toBe(false);
    expect(filtre({ isSpam: 'false' }).isSpam).toBe(false);
    expect(filtre({ archived: 'false' }).archived).toBe(false);
    expect(filtre({ honeypotHit: 'false' }).honeypotHit).toBe(false);
  });

  it('"true" ve "1" true; "0" false', () => {
    expect(filtre({ isRead: 'true' }).isRead).toBe(true);
    expect(filtre({ isRead: '1' }).isRead).toBe(true);
    expect(filtre({ isRead: '0' }).isRead).toBe(false);
  });

  it('gerçek boole de kabul ediliyor — Server Action JSON gönderir, URL değil', () => {
    expect(filtre({ isRead: true }).isRead).toBe(true);
    expect(filtre({ isRead: false }).isRead).toBe(false);
  });

  it('TANINMAYAN değer sessizce `true`ya düşmüyor, HATA veriyor', () => {
    // Gürültülü başarısızlık: yazım hatası fark edilsin.
    expect(contactMessageFilterSchema.safeParse({ isRead: 'evet' }).success).toBe(false);
    expect(contactMessageFilterSchema.safeParse({ isRead: 'yes' }).success).toBe(false);
  });

  it('verilmeyen filtre `undefined` kalır — "hepsi" demek', () => {
    expect(filtre().isRead).toBeUndefined();
  });
});

/* ===========================================================================
 * WHERE KURULUMU
 * ======================================================================== */

describe('buildContactMessageWhere', () => {
  it('filtresiz → boş where (arşiv dahil HEPSİ)', () => {
    // Varsayılanın arşivi gizlemesi "mesajım kayboldu" sorusunu üretirdi.
    expect(buildContactMessageWhere(filtre())).toEqual({});
  });

  it('okunmamışlar', () => {
    expect(buildContactMessageWhere(filtre({ isRead: 'false' }))).toEqual({ isRead: false });
  });

  it('archived ÜÇ DURUMLU ve `archivedAt` üzerinden çözülüyor', () => {
    expect(buildContactMessageWhere(filtre({ archived: 'true' }))).toEqual({
      archivedAt: { not: null },
    });
    expect(buildContactMessageWhere(filtre({ archived: 'false' }))).toEqual({ archivedAt: null });
    expect(buildContactMessageWhere(filtre())).not.toHaveProperty('archivedAt');
  });

  it('T-027 alanları filtreye giriyor: honeypotHit ve minSpamScore', () => {
    expect(buildContactMessageWhere(filtre({ honeypotHit: 'true' }))).toEqual({
      honeypotHit: true,
    });
    expect(buildContactMessageWhere(filtre({ minSpamScore: '30' }))).toEqual({
      spamScore: { gte: 30 },
    });
  });

  it('minSpamScore isSpam’ten AYRI — eşiğin ALTINDA kalan sinyaller görülebilsin', () => {
    // Yanlış pozitif avı tam olarak burada yapılır (ADR-020/C11).
    const where = buildContactMessageWhere(filtre({ isSpam: 'false', minSpamScore: '20' }));
    expect(where).toEqual({ isSpam: false, spamScore: { gte: 20 } });
  });

  it('arama dört alanda ve büyük/küçük harf duyarsız', () => {
    const where = buildContactMessageWhere(filtre({ q: 'ayşe' })) as {
      OR: { [k: string]: { contains: string; mode: string } }[];
    };
    expect(where.OR).toHaveLength(4);
    for (const kosul of where.OR) {
      // Türkçe adlarda harf farkı aramayı sessizce boş bırakırdı.
      expect(Object.values(kosul)[0]?.mode).toBe('insensitive');
    }
  });
});

/* ===========================================================================
 * LİSTE
 * ======================================================================== */

describe('fetchContactMessages', () => {
  it('sayfalama `skip`/`take`e çevriliyor, en yeni önce', async () => {
    const { client, findMany } = istemci();
    await fetchContactMessages(filtre({ page: '3', perPage: '10' }), client);

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      skip: 20,
      take: 10,
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  it('gövde YERİNE önizleme dönüyor, uzun metin kısaltılıyor', async () => {
    const uzun = 'a'.repeat(300);
    const { client } = istemci([{ ...SATIR, message: uzun }]);
    const sayfa = await fetchContactMessages(filtre(), client);

    const item = sayfa.items[0]!;
    expect(item).not.toHaveProperty('message');
    expect(item.preview.length).toBeLessThan(uzun.length);
    expect(item.preview.endsWith('…')).toBe(true);
  });

  it('kısa mesaj kısaltılmıyor, satır sonları tek boşluğa iniyor', async () => {
    const { client } = istemci([{ ...SATIR, message: 'Kısa\n\nmesaj' }]);
    const sayfa = await fetchContactMessages(filtre(), client);
    expect(sayfa.items[0]?.preview).toBe('Kısa mesaj');
  });

  it('convertedJob ilişkisi DÜZLEŞTİRİLİYOR — Frontend iki seviye kontrol etmesin', async () => {
    const { client } = istemci([{ ...SATIR, convertedJob: { id: 'is_1' } }]);
    const sayfa = await fetchContactMessages(filtre(), client);

    expect(sayfa.items[0]?.convertedJobId).toBe('is_1');
    expect(sayfa.items[0]).not.toHaveProperty('convertedJob');
  });

  it('dönüştürülmemiş mesajda convertedJobId null', async () => {
    const { client } = istemci();
    const sayfa = await fetchContactMessages(filtre(), client);
    expect(sayfa.items[0]?.convertedJobId).toBeNull();
  });

  it('unreadCount FİLTREDEN BAĞIMSIZ hesaplanıyor', async () => {
    const { client, count } = istemci([SATIR], [1, 7]);
    const sayfa = await fetchContactMessages(filtre({ isSpam: 'true' }), client);

    // İkinci `count` çağrısı filtreyi DEĞİL, sabit rozet koşulunu kullanır:
    // kullanıcı spam sekmesine geçince rozetin değişmesi anlamsız olurdu.
    expect(count.mock.calls[1]?.[0]).toEqual({
      where: { isRead: false, isSpam: false, archivedAt: null },
    });
    expect(sayfa.unreadCount).toBe(7);
  });

  it('liste seçiminde ip/userAgent YOK — KVKK alanları listede taşınmaz', async () => {
    const { client, findMany } = istemci();
    await fetchContactMessages(filtre(), client);

    const select = findMany.mock.calls[0]?.[0].select as Record<string, unknown>;
    expect(select).not.toHaveProperty('ip');
    expect(select).not.toHaveProperty('userAgent');
  });
});

/* ===========================================================================
 * TEKİL MESAJ
 * ======================================================================== */

describe('fetchContactMessageById', () => {
  it('tam gövde + KVKK alanları dönüyor', async () => {
    const { client } = istemci();
    const dto = await fetchContactMessageById(ID, client);

    expect(dto?.message).toBe(SATIR.message);
    expect(dto?.ip).toBe('203.0.113.7');
    expect(dto?.userAgent).toBe('UA');
  });

  it('yoksa null — fırlatmıyor', async () => {
    const { client, findUnique } = istemci();
    findUnique.mockResolvedValue(null);
    expect(await fetchContactMessageById(ID, client)).toBeNull();
  });
});

/* ===========================================================================
 * DURUM YAZMA — okundu işaretleme diğer alanları BOZMUYOR
 * ======================================================================== */

describe('updateContactMessageStatus — kısmi', () => {
  /**
   * ⚠️ KABUL KRİTERİ: "Okundu işaretleme repliedAt/archivedAt'i BOZMUYOR."
   *
   * Tam kaydı geri yazan bir uygulama, bir mesajı okundu işaretlerken
   * yanıtlanma ve arşivlenme bilgisini sessizce silerdi.
   */
  it('yalnızca isRead gönderilince `data` SADECE isRead taşıyor', async () => {
    const { client, update } = istemci();
    await updateContactMessageStatus({ id: ID, isRead: true }, client);

    expect(Object.keys(update.mock.calls[0]?.[0].data as object)).toEqual(['isRead']);
  });

  it('repliedAt/archivedAt DOLU bir kayıtta okundu işaretleme onlara dokunmuyor', async () => {
    const { client, update } = istemci();
    await updateContactMessageStatus({ id: ID, isRead: true }, client);

    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty('repliedAt');
    expect(data).not.toHaveProperty('archivedAt');
  });

  it('`null` AÇIKÇA gönderilirse temizliyor — undefined ile karışmıyor', async () => {
    const { client, update } = istemci();
    await updateContactMessageStatus({ id: ID, archivedAt: null }, client);

    expect(update.mock.calls[0]?.[0].data).toEqual({ archivedAt: null });
  });

  it('ISO dize `Date`e çevriliyor', async () => {
    const { client, update } = istemci();
    await updateContactMessageStatus({ id: ID, archivedAt: AN.toISOString() }, client);

    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.archivedAt).toBeInstanceOf(Date);
    expect((data.archivedAt as Date).toISOString()).toBe(AN.toISOString());
  });

  it('şema mesaj GÖVDESİNİ taşımıyor — panelden içerik düzenlenemez', async () => {
    const { client, update } = istemci();
    await updateContactMessageStatus({ id: ID, isRead: true }, client);
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('message');
  });
});
