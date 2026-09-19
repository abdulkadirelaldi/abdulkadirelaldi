import { describe, expect, it, vi } from 'vitest';

import { findOrCreateClientForMessage } from '@/server/services/client';
import {
  convertMessageToJob,
  findJobByContactMessageId,
  type JobWriteClient,
  type RunInTransaction,
} from '@/server/services/job';

/**
 * MESAJ → İŞ DÖNÜŞÜMÜ — §6'NIN KRİTİK İLİŞKİSİ, T-038.
 *
 * §6: "ContactMessage → Job dönüşümü tek tıkla yapılır, gelen mesajdan iş kartı
 * oluşturulur, müşteri kaydı OTOMATİK AÇILIR."
 */

const MESAJ_ID = 'clx0000000000000000000001';

const GONDEREN = { name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', phone: '+90 555 000 00 00' };

const MUSTERI_SATIRI = {
  id: 'musteri_1',
  name: 'Ayşe Yılmaz',
  email: 'ayse@ornek.com',
  phone: null,
  isArchived: false,
};

const IS_SATIRI = {
  id: 'is_1',
  title: 'Kurumsal site',
  status: 'LEAD',
  clientId: 'musteri_1',
  contactMessageId: MESAJ_ID,
  createdAt: new Date('2026-09-09T12:00:00.000Z'),
};

function istemci(opts: { mevcutMusteri?: typeof MUSTERI_SATIRI | null } = {}) {
  const clientFindUnique = vi.fn().mockResolvedValue(opts.mevcutMusteri ?? null);
  const clientCreate = vi.fn().mockResolvedValue(MUSTERI_SATIRI);
  const jobFindUnique = vi.fn().mockResolvedValue(null);
  const jobCreate = vi.fn().mockResolvedValue(IS_SATIRI);

  const client: JobWriteClient = {
    client: { findUnique: clientFindUnique, create: clientCreate },
    job: { findUnique: jobFindUnique, create: jobCreate },
  };
  return { client, clientFindUnique, clientCreate, jobFindUnique, jobCreate };
}

/**
 * İşlem sarmalayıcısının testteki karşılığı — işi doğrudan koşturur.
 *
 * `db.$transaction`ı taklit etmek yerine sarmalayıcı ENJEKTE EDİLİYOR; gerçek
 * kod yolu değişmiyor, yalnızca "işlem" katmanı sadeleşiyor.
 */
const dogrudan: RunInTransaction = (client, work) => work(client);

/** Geri alma davranışını gözlemek için: iş patlarsa "rollback" işaretlenir. */
function geriAlinabilir(): { run: RunInTransaction; geriAlindi: () => boolean } {
  let geriAlindi = false;
  const run: RunInTransaction = async (client, work) => {
    try {
      return await work(client);
    } catch (error) {
      geriAlindi = true;
      throw error;
    }
  };
  return { run, geriAlindi: () => geriAlindi };
}

/* ===========================================================================
 * MÜŞTERİ — upsert davranışı (ADR-017, email @unique)
 * ======================================================================== */

describe('findOrCreateClientForMessage', () => {
  it('E-POSTA EŞLEŞİYORSA YENİ MÜŞTERİ AÇMIYOR — aynı kişi üç kez yazsa da tek kayıt', async () => {
    const { client, clientCreate, clientFindUnique } = istemci({ mevcutMusteri: MUSTERI_SATIRI });
    const sonuc = await findOrCreateClientForMessage(GONDEREN, client);

    expect(clientFindUnique).toHaveBeenCalledWith({ where: { email: 'ayse@ornek.com' } });
    expect(clientCreate).not.toHaveBeenCalled();
    expect(sonuc).toMatchObject({ id: 'musteri_1', created: false });
  });

  it('eşleşme yoksa açıyor ve `created: true` bildiriyor', async () => {
    const { client, clientCreate } = istemci();
    const sonuc = await findOrCreateClientForMessage(GONDEREN, client);

    expect(clientCreate).toHaveBeenCalledOnce();
    expect(clientCreate.mock.calls[0]?.[0].data).toMatchObject({
      name: 'Ayşe Yılmaz',
      email: 'ayse@ornek.com',
      phone: '+90 555 000 00 00',
    });
    expect(sonuc.created).toBe(true);
  });

  it('MEVCUT MÜŞTERİNİN ADINI EZMİYOR', async () => {
    // Panelde elle düzeltilmiş bir ad, gelen bir mesaj yüzünden geri alınmamalı.
    const { client, clientCreate } = istemci({
      mevcutMusteri: { ...MUSTERI_SATIRI, name: 'Ayşe Yılmaz (Kıyı Medya)' },
    });
    const sonuc = await findOrCreateClientForMessage(GONDEREN, client);

    expect(sonuc.name).toBe('Ayşe Yılmaz (Kıyı Medya)');
    expect(clientCreate).not.toHaveBeenCalled();
  });

  it('e-posta boşluklardan arındırılıyor — " a@b.com " ile "a@b.com" aynı kişi', async () => {
    const { client, clientFindUnique } = istemci();
    await findOrCreateClientForMessage({ ...GONDEREN, email: '  ayse@ornek.com  ' }, client);
    expect(clientFindUnique).toHaveBeenCalledWith({ where: { email: 'ayse@ornek.com' } });
  });

  it('ARŞİVLENMİŞ müşteriye bağlanıyor ama arşivden ÇIKARMIYOR', async () => {
    // Arşivleme bilinçli bir karardı; gelen bir mesaj onu sessizce geri almamalı.
    const { client, clientCreate } = istemci({
      mevcutMusteri: { ...MUSTERI_SATIRI, isArchived: true },
    });
    const sonuc = await findOrCreateClientForMessage(GONDEREN, client);

    expect(sonuc.isArchived).toBe(true);
    expect(sonuc.created).toBe(false);
    expect(clientCreate).not.toHaveBeenCalled();
  });

  /**
   * E-POSTASIZ MESAJ — şemada imkânsız (ContactMessage.email NOT NULL), yine de
   * ele alınıyor: doğrudan bir DB yazımı böyle bir satır bırakabilir.
   */
  it('E-POSTA BOŞSA tekilleştirme YAPMIYOR, `email: null` ile açıyor', async () => {
    const { client, clientCreate, clientFindUnique } = istemci();
    const sonuc = await findOrCreateClientForMessage({ ...GONDEREN, email: '   ' }, client);

    // `findUnique({ email: '' })` boş dizeyi KİMLİK gibi kullanırdı ve
    // e-postasız her gönderen aynı kayıtta birikirdi.
    expect(clientFindUnique).not.toHaveBeenCalled();
    expect(clientCreate.mock.calls[0]?.[0].data.email).toBeNull();
    expect(sonuc.created).toBe(true);
    expect(sonuc.email).toBeNull();
  });

  it('ADA GÖRE eşleştirme YAPILMIYOR — iki farklı "Ahmet Yılmaz" birleşmemeli', async () => {
    const { client, clientFindUnique } = istemci();
    await findOrCreateClientForMessage(
      { name: 'Ahmet Yılmaz', email: 'ahmet2@ornek.com', phone: null },
      client,
    );

    // Sorgu YALNIZCA e-posta üzerinden; `name` where'e hiç girmiyor.
    expect(clientFindUnique.mock.calls[0]?.[0]).toEqual({ where: { email: 'ahmet2@ornek.com' } });
  });
});

/* ===========================================================================
 * DÖNÜŞÜM
 * ======================================================================== */

describe('convertMessageToJob', () => {
  it('İŞ açılıyor, müşteriye ve MESAJA bağlanıyor, durum LEAD', async () => {
    const { client, jobCreate } = istemci();
    const sonuc = await convertMessageToJob(
      { contactMessageId: MESAJ_ID, title: 'Kurumsal site', contact: GONDEREN },
      client,
      dogrudan,
    );

    expect(jobCreate.mock.calls[0]?.[0].data).toEqual({
      title: 'Kurumsal site',
      // §4.2/ADR-017 beş kolonlu kanban: yeni gelen her şey ilk kolondan başlar.
      status: 'LEAD',
      clientId: 'musteri_1',
      contactMessageId: MESAJ_ID,
    });
    expect(sonuc.job).toMatchObject({ id: 'is_1', status: 'LEAD' });
    expect(sonuc.client).toMatchObject({ id: 'musteri_1', created: true });
  });

  it('mevcut müşteride `created: false` dönüyor — kullanıcı neye bağlandığını görsün', async () => {
    const { client, clientCreate } = istemci({ mevcutMusteri: MUSTERI_SATIRI });
    const sonuc = await convertMessageToJob(
      { contactMessageId: MESAJ_ID, title: 'İkinci iş', contact: GONDEREN },
      client,
      dogrudan,
    );

    expect(clientCreate).not.toHaveBeenCalled();
    expect(sonuc.client.created).toBe(false);
  });

  it('PARA ALANLARI HİÇ YAZILMIYOR — tutar dönüşüm anında bilinmiyor (F4)', async () => {
    const { client, jobCreate } = istemci();
    await convertMessageToJob(
      { contactMessageId: MESAJ_ID, title: 'X', contact: GONDEREN },
      client,
      dogrudan,
    );

    const data = jobCreate.mock.calls[0]?.[0].data as Record<string, unknown>;
    for (const alan of ['agreedAmount', 'fxRate', 'baseAmount', 'currency']) {
      expect(data, `${alan} bu turda yazılmamalı`).not.toHaveProperty(alan);
    }
  });

  /**
   * ⚠️ ATOMİKLİK — iki yazma birlikte ya da hiç.
   *
   * Müşteri açılıp iş oluşturma patlasaydı ortada SAHİPSİZ bir müşteri kalırdı;
   * üstelik ikinci denemede o kayıt "mevcut" sayılıp `created: false` dönerdi —
   * yani hata, sonraki denemenin sonucunu da değiştirirdi.
   */
  it('iş oluşturma patlarsa İŞLEM GERİ ALINIYOR', async () => {
    const { client, jobCreate } = istemci();
    jobCreate.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const { run, geriAlindi } = geriAlinabilir();

    await expect(
      convertMessageToJob(
        { contactMessageId: MESAJ_ID, title: 'X', contact: GONDEREN },
        client,
        run,
      ),
    ).rejects.toThrow();

    expect(geriAlindi()).toBe(true);
  });

  it('müşteri ve iş AYNI işlem istemcisiyle yazılıyor', async () => {
    const { client, clientCreate, jobCreate } = istemci();
    const gorulen: unknown[] = [];
    const run: RunInTransaction = (c, work) => {
      gorulen.push(c);
      return work(c);
    };

    await convertMessageToJob(
      { contactMessageId: MESAJ_ID, title: 'X', contact: GONDEREN },
      client,
      run,
    );

    // İkisi de işlem içindeki istemciyi kullanmalı; biri dışarıda kalsaydı
    // geri alma onu kapsamazdı.
    expect(gorulen).toHaveLength(1);
    expect(clientCreate).toHaveBeenCalledOnce();
    expect(jobCreate).toHaveBeenCalledOnce();
  });
});

describe('findJobByContactMessageId', () => {
  it('bağlı iş varsa kimlik ve başlık dönüyor', async () => {
    const { client, jobFindUnique } = istemci();
    jobFindUnique.mockResolvedValue(IS_SATIRI);

    expect(await findJobByContactMessageId(MESAJ_ID, client)).toEqual({
      id: 'is_1',
      title: 'Kurumsal site',
    });
  });

  it('yoksa null', async () => {
    const { client } = istemci();
    expect(await findJobByContactMessageId(MESAJ_ID, client)).toBeNull();
  });
});
