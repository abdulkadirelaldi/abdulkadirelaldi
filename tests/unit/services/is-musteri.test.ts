import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { decimal, decimalKalanlar, dedektorCalisiyor } from '../_helpers/decimal-kacak';

import {
  clientFilterSchema,
  convertMessageToJobSchema,
  createClientSchema,
  createJobSchema,
  jobFilterSchema,
  updateClientSchema,
  updateJobSchema,
} from '@/lib/schemas';
import {
  buildClientWhere,
  clientExists,
  createClient,
  fetchClientForPanel,
  fetchClientsForPanel,
  setClientArchived,
  updateClient,
  type ClientPanelClient,
} from '@/server/services/client';
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LIMIT,
  buildJobWhere,
  changeJobStatus,
  createJob,
  deriveBaseAmount,
  fetchJobBoard,
  fetchJobForPanel,
  fetchJobsForPanel,
  updateJob,
  type JobPanelClient,
} from '@/server/services/job';

/**
 * `Job` + `Client` SERVİSLERİ — F4'ün açılışı, T-100.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ İKİ BLOĞU:
 *   1. "ADR-014 — baseAmount TÜRETİLİR": kuralın bozulması SESSİZ bir hatadır,
 *      kayıt kendi içinde tutarsız kalır ve hiçbir şey kırmızıya dönmez.
 *   2. "DTO sınırında Decimal KAÇAĞI YOK": tip sistemi bu kaçağı GÖREMEZ
 *      (R4) — `Decimal` yapısal olarak her yere uyar, hata çalışma zamanında
 *      Server → Client sınırında çıkar.
 */

const KOK = resolve(__dirname, '../../..');

function jobSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'job_1',
    title: 'Kurumsal site',
    status: 'ACTIVE' as const,
    clientId: 'cli_1',
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    dueDate: new Date('2026-03-10T00:00:00.000Z'),
    deliveredAt: null,
    agreedAmount: decimal('2500'),
    currency: 'USD' as const,
    fxRate: decimal('34.25'),
    baseAmount: decimal('85625'),
    contactMessageId: null,
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
    updatedAt: new Date('2026-02-02T09:00:00.000Z'),
    description: 'Açıklama',
    client: { id: 'cli_1', name: 'Kıyı Medya', email: 'a@b.com', isArchived: false },
    contactMessage: null,
    ...ek,
  };
}

function jobIstemci(ek: Partial<Record<string, unknown>> = {}) {
  const create = vi.fn().mockResolvedValue(jobSatiri());
  const update = vi.fn().mockResolvedValue(jobSatiri());
  const findUnique = vi.fn().mockResolvedValue(jobSatiri());
  const findMany = vi.fn().mockResolvedValue([jobSatiri()]);
  const count = vi.fn().mockResolvedValue(1);
  const groupBy = vi.fn().mockResolvedValue([]);
  const client = {
    job: { create, update, findUnique, findMany, count, groupBy, ...ek },
  } as unknown as JobPanelClient;
  return { client, create, update, findUnique, findMany, count, groupBy };
}

function clientSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'cli_1',
    name: 'Kıyı Medya',
    company: 'Kıyı Medya Ltd.',
    email: 'a@b.com',
    phone: '+90 555 000 00 00',
    notes: 'Not',
    isKiyiMedya: true,
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { jobs: 3 },
    ...ek,
  };
}

function clientIstemci() {
  const create = vi.fn().mockResolvedValue(clientSatiri());
  const update = vi.fn().mockResolvedValue(clientSatiri());
  const findUnique = vi.fn().mockResolvedValue(clientSatiri());
  const findMany = vi.fn().mockResolvedValue([clientSatiri()]);
  const count = vi.fn().mockResolvedValue(1);
  const client = {
    client: { create, update, findUnique, findMany, count },
  } as unknown as ClientPanelClient;
  return { client, create, update, findUnique, findMany, count };
}

/* ===========================================================================
 * ⚠️⚠️ ADR-014 / 1 — `baseAmount` TÜRETİLİR, GİRİLMEZ
 * ======================================================================== */

describe('ADR-014 — baseAmount türetmesi', () => {
  it('şema `baseAmount` ALANI TAŞIMIYOR — istemciden gelmesi İMKÂNSIZ', () => {
    /*
     * Kart "createJobSchema'da var mı, kontrol et; varsa serverInterpreted
     * konvansiyonu bu sınıf için" dedi. ÖLÇÜM: alan şemada HİÇ YOK, dolayısıyla
     * `serverInterpreted` işaretine de gerek yok — Zod tanımadığı alanı düşürür.
     * Bu assert o durumu SABİTLİYOR: biri şemaya `baseAmount` eklerse kırılır.
     */
    const sonuc = createJobSchema.parse({ title: 'X', baseAmount: '999999.00' });
    expect('baseAmount' in sonuc).toBe(false);

    const guncel = updateJobSchema.parse({ id: 'job_1', baseAmount: '999999.00' });
    expect('baseAmount' in guncel).toBe(false);
  });

  it('TRY: fxRate 1 → baseAmount = agreedAmount', () => {
    expect(deriveBaseAmount('85000.00', '1')).toBe('85000.00');
  });

  it('USD: çarpım kuruş hassasiyetinde', () => {
    expect(deriveBaseAmount('2500.00', '34.25000000')).toBe('85625.00');
  });

  it('⚠️ agreedAmount NULL ise baseAmount da NULL — `0.00` DEĞİL', () => {
    /*
     * Ayrım anlamlı: `LEAD` aşamasında tutar BİLİNMİYOR, `0.00` ise "bedava"
     * demek olurdu. Raporlamada bilinmeyen tutar DIŞLANIR, sıfır ortalamayı
     * aşağı çeker. `prisma/seed.ts` bu noktada sapıyor (`?? '0'`) — raporlandı.
     */
    expect(deriveBaseAmount(null, '34.25')).toBeNull();
    expect(deriveBaseAmount(null, '1')).not.toBe('0.00');
  });

  it('createJob `baseAmount`ı SUNUCUDA hesaplıyor', async () => {
    const { client, create } = jobIstemci();
    await createJob(
      createJobSchema.parse({ title: 'X', agreedAmount: '100.00', fxRate: '1' }),
      client,
    );

    expect(create.mock.calls[0]?.[0].data.baseAmount).toBe('100.00');
  });

  it('agreedAmount verilmemiş create → baseAmount null', async () => {
    const { client, create } = jobIstemci();
    await createJob(createJobSchema.parse({ title: 'Aday is' }), client);

    expect(create.mock.calls[0]?.[0].data.agreedAmount).toBeNull();
    expect(create.mock.calls[0]?.[0].data.baseAmount).toBeNull();
  });

  /* ───────────────────────────────────────────────────────────────────────
   * ⚠️ SESSİZ HATANIN KENDİSİ: kısmi güncelleme
   * ──────────────────────────────────────────────────────────────────── */

  it('⚠️ YALNIZCA fxRate gönderilince baseAmount YENİDEN hesaplanıyor', async () => {
    // Kayıttaki tutar 2500 USD, kur 34.25 → 85.625. Kur 40'a çekiliyor.
    const { client, update } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', fxRate: '40.00000000' }), client);

    const data = update.mock.calls[0]?.[0].data;
    expect(data.fxRate).toBe('40.00000000');
    // Kuru güncelleyip baseAmount'a dokunmamak kaydı tutarsız bırakırdı:
    // kur değişti ama TRY karşılığı eski kalırdı ve hiçbir şey kırılmazdı.
    expect(data.baseAmount).toBe('100000.00');
    expect(data.baseAmount).not.toBe('85625.00');
  });

  it('⚠️ YALNIZCA agreedAmount gönderilince de yeniden hesaplanıyor', async () => {
    const { client, update } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', agreedAmount: '1000.00' }), client);

    const data = update.mock.calls[0]?.[0].data;
    // Kayıttaki kur (34.25) kullanılıyor — gönderilmeyen alan KAYITTAN okunuyor.
    expect(data.baseAmount).toBe('34250.00');
  });

  it('ikisi birlikte gönderilince ikisi de etkin', async () => {
    const { client, update } = jobIstemci();
    await updateJob(
      updateJobSchema.parse({ id: 'job_1', agreedAmount: '100.00', fxRate: '2.00000000' }),
      client,
    );

    expect(update.mock.calls[0]?.[0].data.baseAmount).toBe('200.00');
  });

  it('PARA ALANI HİÇ GÖNDERİLMESE BİLE baseAmount yazılıyor — kendi kendini onarır', async () => {
    /*
     * Koşulsuz yazma, satır herhangi bir yoldan tutarsız kalmışsa (seed sapması,
     * migration, elle psql) ilk güncellemede onu düzeltiyor. Koşullu yazmanın
     * kazancı sıfırdı, riski tutarsızlığın kalıcı olması.
     */
    const { client, update } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', title: 'Yeni ad' }), client);

    expect(update.mock.calls[0]?.[0].data.baseAmount).toBe('85625.00');
  });

  /* ───────────────────────────────────────────────────────────────────────
   * ⚠️ TUTAR TEMİZLEME — T-106'nın yeni yolu
   * ──────────────────────────────────────────────────────────────────── */

  it('⚠️ `agreedAmount: null` TUTARI DA `baseAmount`I DA temizliyor', async () => {
    /*
     * Yeni yol: `.nullable()` ile "tutarı sildim" ifade edilebiliyor. Kritik
     * olan `baseAmount`ın da null'a çekilmesi — bırakılsaydı `LEAD`e dönen bir
     * işin TRY karşılığı 85.000 kalır ve raporlar onu saymaya devam ederdi.
     */
    const { client, update } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', agreedAmount: null }), client);

    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.agreedAmount).toBeNull();
    expect(data.baseAmount).toBeNull();
    // `0.00` DEĞİL — "bilinmiyor" ile "bedava" ayrı şeyler (ADR-014).
    expect(data.baseAmount).not.toBe('0.00');
  });

  it('`undefined` ile `null` AYRI — dokunma vs temizle', async () => {
    // Kayıtta 2500 USD × 34.25 var.
    const { client: c1, update: u1 } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', title: 'Yeni ad' }), c1);
    const dokunma = u1.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect('agreedAmount' in dokunma).toBe(false);
    expect(dokunma.baseAmount).toBe('85625.00'); // korunuyor (kendi kendini onaran yazma)

    const { client: c2, update: u2 } = jobIstemci();
    await updateJob(updateJobSchema.parse({ id: 'job_1', agreedAmount: null }), c2);
    const temizle = u2.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(temizle.agreedAmount).toBeNull();
    expect(temizle.baseAmount).toBeNull();
  });

  it('temizlenen tutar KUR gönderilmiş olsa bile null kalıyor', async () => {
    // `null × kur` diye bir şey yok: tutar bilinmiyorsa karşılığı da bilinmiyor.
    const { client, update } = jobIstemci();
    await updateJob(
      updateJobSchema.parse({ id: 'job_1', agreedAmount: null, fxRate: '40.00' }),
      client,
    );

    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.fxRate).toBe('40.00');
    expect(data.baseAmount).toBeNull();
  });

  it('şema `null` KABUL EDİYOR, geçersiz dizeyi REDDEDİYOR', () => {
    expect(updateJobSchema.safeParse({ id: 'job_1', agreedAmount: null }).success).toBe(true);
    expect(createJobSchema.safeParse({ title: 'X', agreedAmount: null }).success).toBe(true);
    // `.nullable()` doğrulamayı GEVŞETMİYOR: biçim kuralı hâlâ yürürlükte.
    expect(createJobSchema.safeParse({ title: 'X', agreedAmount: '1.234' }).success).toBe(false);
    expect(createJobSchema.safeParse({ title: 'X', agreedAmount: 'abc' }).success).toBe(false);
  });

  it('createJob`ta `null` tutar → `baseAmount` null', async () => {
    const { client, create } = jobIstemci();
    await createJob(createJobSchema.parse({ title: 'Aday', agreedAmount: null }), client);

    expect(create.mock.calls[0]?.[0].data.agreedAmount).toBeNull();
    expect(create.mock.calls[0]?.[0].data.baseAmount).toBeNull();
  });

  it('kayıt yoksa `null` dönüyor ve YAZMA DENENMİYOR', async () => {
    const { client, update, findUnique } = jobIstemci();
    findUnique.mockResolvedValue(null);

    expect(await updateJob(updateJobSchema.parse({ id: 'yok' }), client)).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️⚠️ ADR-014 / 3 — DTO SINIRINDA `Decimal` KAÇAĞI YOK (R4)
 * ======================================================================== */

describe('DTO sınırında Decimal kaçağı YOK', () => {
  /**
   * TİP SİSTEMİ BU KAÇAĞI GÖREMEZ ve bu yüzden test ZORUNLU: Prisma `Decimal`
   * bir `Decimal.js` NESNESİDİR, Server → Client sınırında serialize edilemez
   * (R4, F0'da kaydedilmiş risk) ve sızdığı yerde derleme GEÇER — hata çalışma
   * zamanında, kullanıcının ekranında çıkar.
   *
   * ⚠️ DEDEKTÖR ARTIK `tests/unit/_helpers/decimal-kacak.ts` İÇİNDE. T-101
   * `Transaction` için aynı ölçümü gerektirdi ve ikinci bir kopya açmak, o
   * turda `prisma/seed.ts`ten silinen şeyin aynısı olurdu (ADR-037).
   */

  it('liste DTO`sunda Decimal YOK, üç para alanı da `string`', async () => {
    const { client } = jobIstemci();
    const sayfa = await fetchJobsForPanel(jobFilterSchema.parse({}), client);
    const item = sayfa.items[0];

    expect(decimalKalanlar(sayfa)).toEqual([]);
    expect(typeof item?.agreedAmount).toBe('string');
    expect(typeof item?.fxRate).toBe('string');
    expect(typeof item?.baseAmount).toBe('string');
    expect(item?.agreedAmount).toBe('2500.00');
    expect(item?.fxRate).toBe('34.25000000');
    expect(item?.baseAmount).toBe('85625.00');
  });

  it('detay DTO`sunda da Decimal YOK', async () => {
    const { client } = jobIstemci();
    expect(decimalKalanlar(await fetchJobForPanel('job_1', client))).toEqual([]);
  });

  it('kanban DTO`sunda da Decimal YOK', async () => {
    const { client, groupBy } = jobIstemci();
    groupBy.mockResolvedValue([{ status: 'ACTIVE', _count: 1 }]);
    expect(decimalKalanlar(await fetchJobBoard(client))).toEqual([]);
  });

  it('kaçak DEDEKTÖRÜ ÇALIŞIYOR — vakum değil', () => {
    // Dedektör gerçekten `Decimal` yakalıyor mu: yakalamıyorsa yukarıdaki üç
    // assert sahte yeşil verirdi. Sağlama yardımcının kendi içinde.
    expect(dedektorCalisiyor()).toEqual([['a.b'], []]);
  });

  it('tutar null ise DTO`da null — `"null"` dizesi DEĞİL', async () => {
    const { client, findMany } = jobIstemci();
    findMany.mockResolvedValue([jobSatiri({ agreedAmount: null, baseAmount: null })]);

    const sayfa = await fetchJobsForPanel(jobFilterSchema.parse({}), client);
    expect(sayfa.items[0]?.agreedAmount).toBeNull();
    expect(sayfa.items[0]?.baseAmount).toBeNull();
  });

  it('`@db.Date` alanları `YYYY-MM-DD`, `DateTime` alanları ISO', async () => {
    const { client } = jobIstemci();
    const item = (await fetchJobsForPanel(jobFilterSchema.parse({}), client)).items[0];

    expect(item?.startDate).toBe('2026-02-01');
    expect(item?.dueDate).toBe('2026-03-10');
    expect(item?.createdAt).toBe('2026-02-01T09:00:00.000Z');
  });
});

/* ===========================================================================
 * ⚠️ `contactMessageId` — DÖNÜŞÜMÜN TEKELİ
 * ======================================================================== */

describe('contactMessageId elle YAZILMIYOR', () => {
  it('⚠️ ŞEMA ARTIK TAŞIMIYOR — alan DÜŞÜRÜLÜYOR (T-106)', () => {
    /*
     * T-106'ya kadar `jobBase` alanı opsiyonel olarak taşıyordu: şema onu
     * geçiriyor, yazma yolu bilerek yoksayıyordu. O hâl bir TUZAKTI — sessizce
     * düşen bir girdi — ve çıkarıldı. İddia artık daha güçlü: alan şemada HİÇ
     * YOK, yani Zod onu düşürüyor ve servise ULAŞAMIYOR.
     *
     * `serverInterpreted` ile işaretlemek yanlış araç olurdu; gerekçe
     * `schemas/job.ts`te yazılı (sunucu alanı yorumlamıyor, yoksayıyor).
     */
    const olustur = createJobSchema.parse({ title: 'X', contactMessageId: 'msg_1' });
    expect('contactMessageId' in olustur).toBe(false);

    const guncelle = updateJobSchema.parse({ id: 'job_1', contactMessageId: 'msg_9' });
    expect('contactMessageId' in guncelle).toBe(false);
  });

  it('iki yazma yolu da `data`ya koymuyor — ikinci kapı duruyor', async () => {
    /*
     * Şema artık düşürüyor, ama servis kapısı KALDI ve kalması doğru: servis
     * `CreateJobInput` tipini alıyor ve bir gün şemaya geri eklenirse yazma yolu
     * yine yazmamalı. İki kapı, tek kural.
     */
    const { client, create } = jobIstemci();
    await createJob(
      { ...createJobSchema.parse({ title: 'X' }), contactMessageId: 'msg_1' } as never,
      client,
    );
    expect('contactMessageId' in create.mock.calls[0]![0].data).toBe(false);

    const { client: c2, update } = jobIstemci();
    await updateJob(
      { ...updateJobSchema.parse({ id: 'job_1' }), contactMessageId: 'msg_9' } as never,
      c2,
    );
    expect('contactMessageId' in update.mock.calls[0]![0].data).toBe(false);
  });

  it('DÖNÜŞÜM şeması alanı taşımaya DEVAM ediyor — meşru tek yazar', () => {
    // Çıkarma yalnızca `jobBase`ten; `convertMessageToJobSchema` ayrı.
    const parsed = convertMessageToJobSchema.parse({
      contactMessageId: 'msg_1',
      title: 'Dönüşen iş',
    });
    expect(parsed.contactMessageId).toBe('msg_1');
  });

  it('dönüşümden gelen iş AYNI okuma yolundan görünüyor, `fromContactMessage` ile ayrışıyor', async () => {
    const { client, findMany } = jobIstemci();
    findMany.mockResolvedValue([
      jobSatiri({ id: 'elle', contactMessageId: null }),
      jobSatiri({ id: 'donusen', contactMessageId: 'msg_1' }),
    ]);

    const sayfa = await fetchJobsForPanel(jobFilterSchema.parse({}), client);

    // Ayrı bir okuma yolu YOK — ikisi de aynı listede.
    expect(sayfa.items.map((i) => i.id)).toEqual(['elle', 'donusen']);
    expect(sayfa.items[0]?.fromContactMessage).toBe(false);
    expect(sayfa.items[1]?.fromContactMessage).toBe(true);
    // Kimliğin KENDİSİ listede yok — yalnızca olgusu.
    expect(sayfa.items[1]).not.toHaveProperty('contactMessageId');
  });

  it('detayda dönüşüm kaynağı mesaj ÖZETİ var — GÖVDESİ SEÇİLMİYOR (§8.20)', async () => {
    const { client, findUnique } = jobIstemci();
    await fetchJobForPanel('job_1', client);

    /*
     * ⚠️ İDDİA SEÇİM ÜZERİNDE, ÇIKTI ÜZERİNDE DEĞİL. İlk yazdığımda
     * `JSON.stringify(dto)).not.toContain('message')` vardı ve o iddia
     * TESADÜFEN geçiyordu: DTO'daki anahtar `sourceMessage`, yani büyük `M` ile
     * — küçük harfli `'message'` hiçbir koşulda eşleşmez ve gövde gerçekten
     * sızsa bile yeşil kalırdı. T-053'te Frontend'in `toContain('MDXRemote')`
     * iddiasında ölçtüğüm sınıfın aynısı, bu kez kendi testimde.
     *
     * Gövdenin sızmamasının GERÇEK sebebi `select`in onu hiç istememesi; iddia
     * da oraya bakıyor.
     */
    const secim = findUnique.mock.calls[0]?.[0].select.contactMessage.select;
    expect(Object.keys(secim).sort()).toEqual(['createdAt', 'id', 'name', 'subject']);
    expect('message' in secim).toBe(false);
    expect('email' in secim).toBe(false);
  });

  it('detayda dönüşüm kaynağı mesaj ÖZETİ DTO`ya giriyor', async () => {
    const { client, findUnique } = jobIstemci();
    findUnique.mockResolvedValue(
      jobSatiri({
        contactMessageId: 'msg_1',
        contactMessage: {
          id: 'msg_1',
          name: 'Ahmet',
          subject: 'Teklif',
          createdAt: new Date('2026-01-05T10:00:00.000Z'),
        },
      }),
    );

    const dto = await fetchJobForPanel('job_1', client);

    expect(dto?.sourceMessage).toEqual({
      id: 'msg_1',
      name: 'Ahmet',
      subject: 'Teklif',
      createdAt: '2026-01-05T10:00:00.000Z',
    });
  });
});

/* ===========================================================================
 * ⚠️ KANBAN — üst sınır + GERÇEK toplam
 * ======================================================================== */

describe('fetchJobBoard', () => {
  it('ADR-017`nin BEŞ kolonu, sırayla', async () => {
    const { client } = jobIstemci();
    const tahta = await fetchJobBoard(client);

    expect(tahta.columns.map((c) => c.status)).toEqual([
      'LEAD',
      'PROPOSAL',
      'ACTIVE',
      'DELIVERED',
      'CANCELLED',
    ]);
    expect(BOARD_COLUMNS).toHaveLength(5);
  });

  it('kolon başına ÜST SINIR uygulanıyor', async () => {
    const { client, findMany } = jobIstemci();
    await fetchJobBoard(client);

    for (const cagri of findMany.mock.calls) {
      expect(cagri[0].take).toBe(BOARD_COLUMN_LIMIT);
      // Sayfalama YOK: `skip` hiç gönderilmiyor.
      expect(cagri[0].skip).toBeUndefined();
    }
  });

  it('⚠️ GERÇEK TOPLAM `groupBy`dan geliyor, kesilmiş listeden DEĞİL', async () => {
    const { client, findMany, groupBy } = jobIstemci();
    findMany.mockResolvedValue([jobSatiri()]);
    groupBy.mockResolvedValue([{ status: 'DELIVERED', _count: 1240 }]);

    const tahta = await fetchJobBoard(client);
    const teslim = tahta.columns.find((c) => c.status === 'DELIVERED');

    expect(teslim?.items).toHaveLength(1);
    expect(teslim?.total).toBe(1240);
    // Arayüz "tamamını listede gör" demek zorunda.
    expect(teslim?.truncated).toBe(true);
  });

  it('kesilmemiş kolon `truncated: false`', async () => {
    const { client, findMany, groupBy } = jobIstemci();
    findMany.mockResolvedValue([jobSatiri()]);
    groupBy.mockResolvedValue([{ status: 'LEAD', _count: 1 }]);

    expect(tahtaKolon(await fetchJobBoard(client), 'LEAD')?.truncated).toBe(false);
  });

  it('⚠️ `groupBy` BOŞ KOLONU DÖNDÜRMÜYOR → toplam 0, `NaN` değil', async () => {
    const { client, findMany, groupBy } = jobIstemci();
    findMany.mockResolvedValue([]);
    groupBy.mockResolvedValue([]); // hiçbir kolon dönmedi

    const tahta = await fetchJobBoard(client);
    for (const kolon of tahta.columns) {
      expect(kolon.total).toBe(0);
      expect(Number.isNaN(kolon.total)).toBe(false);
      expect(kolon.truncated).toBe(false);
    }
  });

  it('CANLI kolonlar TESLİM TARİHİNE, arşiv kolonları GÜNCELLEMEYE göre sıralı', async () => {
    const { client, findMany } = jobIstemci();
    await fetchJobBoard(client);

    const sirala = (i: number) => findMany.mock.calls[i]?.[0].orderBy;

    // LEAD / PROPOSAL / ACTIVE — "sırada ne var": en yakın teslim üstte,
    // tarihsizler SONA (yoksa `null`lar başa yığılır).
    for (const i of [0, 1, 2]) {
      expect(sirala(i)).toEqual([
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ]);
    }
    // DELIVERED / CANCELLED — "en son ne oldu".
    for (const i of [3, 4]) {
      expect(sirala(i)).toEqual([{ updatedAt: 'desc' }]);
    }
  });

  it('üst sınır arayüze BİLDİRİLİYOR — kendi sayısını uydurmasın', async () => {
    const { client } = jobIstemci();
    expect((await fetchJobBoard(client)).columnLimit).toBe(BOARD_COLUMN_LIMIT);
  });
});

function tahtaKolon(tahta: Awaited<ReturnType<typeof fetchJobBoard>>, status: string) {
  return tahta.columns.find((c) => c.status === status);
}

/* ===========================================================================
 * FİLTRELER
 * ======================================================================== */

describe('buildJobWhere', () => {
  it('verilmeyen alan `where`e HİÇ girmiyor', () => {
    expect(buildJobWhere(jobFilterSchema.parse({}))).toEqual({});
  });

  it('durum ve müşteri süzgeçleri', () => {
    expect(buildJobWhere(jobFilterSchema.parse({ status: 'ACTIVE', clientId: 'cli_1' }))).toEqual({
      status: 'ACTIVE',
      clientId: 'cli_1',
    });
  });

  it('tarih aralığı `dueDate` ÜZERİNDE — `@db.Date`, UTC gece yarısı DOĞRU', () => {
    /*
     * T-052'de `AuditLog.createdAt` bir `DateTime` olduğu için UTC gece yarısı
     * YANLIŞTI (o günün ilk üç saatini düşürüyordu). `dueDate` `@db.Date`, yani
     * saat saklamıyor — `appDayToDate` burada DOĞRU dönüştürücü. Hangisinin
     * kullanılacağını SÜTUNUN TİPİ belirliyor; bu assert ayrımı sabitliyor.
     */
    const where = buildJobWhere(jobFilterSchema.parse({ from: '2026-03-01', to: '2026-03-31' }));
    const dueDate = where.dueDate as { gte: Date; lte: Date };

    expect(dueDate.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(dueDate.lte.toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('arama başlık, açıklama VE MÜŞTERİ ADINDA', () => {
    const where = buildJobWhere(jobFilterSchema.parse({ q: 'kıyı' }));
    expect(where.OR).toHaveLength(3);
    expect(JSON.stringify(where.OR)).toContain('insensitive');
    // Müşteri adıyla arama: `clientId` filtresi kimliği bilmeyi gerektiriyor.
    expect(JSON.stringify(where.OR)).toContain('client');
  });
});

describe('buildClientWhere', () => {
  it('⚠️ `isArchived` VERİLMEZSE arşiv dahil hepsi — T-038 kararı korundu', () => {
    // Varsayılanın gizlemesi "müşterim kayboldu" sorusunu üretirdi.
    expect(buildClientWhere(clientFilterSchema.parse({}))).toEqual({});
    expect('isArchived' in buildClientWhere(clientFilterSchema.parse({}))).toBe(false);
  });

  it('`isArchived=false` AÇIKÇA verilince süzülüyor — seçicinin yolu bu', () => {
    expect(buildClientWhere(clientFilterSchema.parse({ isArchived: 'false' }))).toEqual({
      isArchived: false,
    });
  });

  it('ADR-033 — `"false"` dizesi `false` oluyor, `true` DEĞİL', () => {
    // `z.coerce.boolean()` olsaydı boş olmayan her dize `true` olurdu (T-038).
    expect(buildClientWhere(clientFilterSchema.parse({ isKiyiMedya: 'false' }))).toEqual({
      isKiyiMedya: false,
    });
    expect(buildClientWhere(clientFilterSchema.parse({ isKiyiMedya: '0' }))).toEqual({
      isKiyiMedya: false,
    });
  });

  it('arama ad, şirket ve e-postada', () => {
    expect(buildClientWhere(clientFilterSchema.parse({ q: 'kıyı' })).OR).toHaveLength(3);
  });
});

/* ===========================================================================
 * MÜŞTERİ OKUMA / YAZMA
 * ======================================================================== */

describe('Client panel yolu', () => {
  it('liste ALFABETİK sıralı ve iş sayısını taşıyor', async () => {
    const { client, findMany } = clientIstemci();
    const sayfa = await fetchClientsForPanel(clientFilterSchema.parse({}), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ name: 'asc' }]);
    expect(sayfa.items[0]?.jobCount).toBe(3);
  });

  it('`notes` LİSTEDE YOK, detayda VAR', async () => {
    const { client } = clientIstemci();
    const sayfa = await fetchClientsForPanel(clientFilterSchema.parse({}), client);

    expect(sayfa.items[0]).not.toHaveProperty('notes');
  });

  it('detay TAM alan kümesini döndürüyor — `notes` dahil', async () => {
    const { client, findUnique } = clientIstemci();
    const dto = await fetchClientForPanel('cli_1', client);

    // Kart "düzenleme formunun TAM alan kümesi" dedi; form `notes`u da yazıyor.
    expect(dto?.notes).toBe('Not');
    expect(dto?.name).toBe('Kıyı Medya');
    expect(dto?.jobCount).toBe(3);
    expect(findUnique.mock.calls[0]?.[0].select.notes).toBe(true);
    // Tarihler DTO sınırında ISO dizesi — `Date` nesnesi dışarı çıkmıyor.
    expect(dto?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('detay — kayıt yoksa `null`', async () => {
    const { client, findUnique } = clientIstemci();
    findUnique.mockResolvedValue(null);

    expect(await fetchClientForPanel('yok', client)).toBeNull();
  });

  it('`clientExists` — varlık kapısı (T-051/B kalıbı)', async () => {
    const { client, findUnique } = clientIstemci();
    expect(await clientExists('cli_1', client)).toBe(true);

    findUnique.mockResolvedValue(null);
    expect(await clientExists('cli_yok', client)).toBe(false);
  });

  it('iş sayısı TEK sorguda — N+1 yok', async () => {
    const { client, findMany } = clientIstemci();
    await fetchClientsForPanel(clientFilterSchema.parse({}), client);

    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany.mock.calls[0]?.[0].select._count).toEqual({ select: { jobs: true } });
  });

  it('BOŞ DİZE `null` oluyor — benzersiz `email` için ZORUNLU', async () => {
    const { client, create } = clientIstemci();
    await createClient(createClientSchema.parse({ name: 'X', company: '', notes: '' }), client);

    const data = create.mock.calls[0]?.[0].data;
    expect(data.company).toBeNull();
    expect(data.notes).toBeNull();
    // İki müşteriyi boş e-postayla kaydetmek benzersizlik ihlali verirdi, oysa
    // ikisinin de e-postası YOK.
    expect(data.email).toBeNull();
  });

  it('kısmi güncelleme GÖNDERİLMEYEN alana dokunmuyor', async () => {
    const { client, update } = clientIstemci();
    await updateClient(updateClientSchema.parse({ id: 'cli_1', name: 'Yeni ad' }), client);

    const data = update.mock.calls[0]?.[0].data;
    expect(data).toEqual({ name: 'Yeni ad' });
    // `isKiyiMedya` varsayılanı enjekte EDİLMİYOR — yoksa adı düzeltmek
    // müşterinin işaretini sessizce `false`a çekerdi.
    expect('isKiyiMedya' in data).toBe(false);
  });

  it('⚠️ `isArchived` GÜNCELLEMEDEN değiştirilemiyor — ayrı eylem', async () => {
    const { client, update } = clientIstemci();
    // Şema onu taşımıyor (ayrı `archiveClientSchema` var); gönderilse de düşer.
    await updateClient(
      updateClientSchema.parse({ id: 'cli_1', name: 'X', isArchived: true } as never),
      client,
    );

    expect('isArchived' in update.mock.calls[0]![0].data).toBe(false);
  });

  it('arşivleme İKİ YÖNLÜ', async () => {
    const { client, update } = clientIstemci();
    await setClientArchived('cli_1', true, client);
    await setClientArchived('cli_1', false, client);

    expect(update.mock.calls[0]?.[0].data).toEqual({ isArchived: true });
    expect(update.mock.calls[1]?.[0].data).toEqual({ isArchived: false });
  });
});

/* ===========================================================================
 * DURUM DEĞİŞİMİ
 * ======================================================================== */

describe('changeJobStatus', () => {
  it('YALNIZCA `status` yazılıyor', async () => {
    const { client, update } = jobIstemci();
    await changeJobStatus({ id: 'job_1', status: 'DELIVERED' }, client);

    expect(update.mock.calls[0]?.[0].data).toEqual({ status: 'DELIVERED' });
  });

  it('⚠️ `deliveredAt` OTOMATİK DOLDURULMUYOR', async () => {
    /*
     * Teslim ANI ile "kartı taşıdığım an" aynı şey değil: iş cuma teslim edilip
     * pazartesi işaretlenebilir ve otomatik damga raporu yanlış tarihe yazar.
     */
    const { client, update } = jobIstemci();
    await changeJobStatus({ id: 'job_1', status: 'DELIVERED' }, client);

    expect('deliveredAt' in update.mock.calls[0]![0].data).toBe(false);
  });

  it('`baseAmount` yeniden hesaplanmıyor — gereksiz okuma yok', async () => {
    const { client, update, findUnique } = jobIstemci();
    await changeJobStatus({ id: 'job_1', status: 'ACTIVE' }, client);

    expect('baseAmount' in update.mock.calls[0]![0].data).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ⚠️ KAPILAR — önbellek yok, etiket yok
 * ======================================================================== */

describe('KAPILAR', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const JOB_SERVIS = kod('src/server/services/job.ts');
  const CLIENT_SERVIS = kod('src/server/services/client.ts');
  const JOB_EYLEM = kod('src/server/actions/job.ts');
  const CLIENT_EYLEM = kod('src/server/actions/client.ts');

  it('tarama vakum değil — dört kaynak da okundu', () => {
    expect(JOB_SERVIS).toContain('fetchJobBoard');
    expect(CLIENT_SERVIS).toContain('fetchClientsForPanel');
    expect(JOB_EYLEM).toContain('createJobAction');
    expect(CLIENT_EYLEM).toContain('createClientAction');
  });

  it('ÖNBELLEKLENMİYOR — `next/cache` hiç yok', () => {
    for (const [ad, kaynak] of [
      ['job servisi', JOB_SERVIS],
      ['client servisi', CLIENT_SERVIS],
    ] as const) {
      expect(kaynak, `${ad} önbellek çekiyor`).not.toContain('next/cache');
      expect(kaynak, `${ad} cachedRead kullanıyor`).not.toContain('cachedRead');
      expect(kaynak, `${ad} unstable_cache kullanıyor`).not.toContain('unstable_cache');
    }
  });

  it('`fetchX` adlandırması — `getX` YOK (T-040 kuralı)', () => {
    for (const kaynak of [JOB_SERVIS, CLIENT_SERVIS]) {
      expect(kaynak).not.toMatch(/export\s+async\s+function\s+get[A-Z]/);
    }
    expect(JOB_SERVIS).toMatch(/export\s+async\s+function\s+fetchJobsForPanel/);
    expect(CLIENT_SERVIS).toMatch(/export\s+async\s+function\s+fetchClientsForPanel/);
  });

  it('⚠️ Job `revalidateTag` ÇAĞIRMIYOR; Client YALNIZCA `content:client`ı düşürüyor (T-117)', () => {
    /*
     * T-038'in kararı, T-100'de yeniden tarandı: Job ve Client public'te
     * yoktu. T-117 müşteri LOGO ŞERİDİNİ getirdi — Client artık TEK bir
     * önbellekli girdiye (`getSiteClientLogos`) dokunuyor ve yalnızca onu
     * düşürüyor. Job için tarama aynen geçerli; o kısım KALICI.
     */
    expect(JOB_EYLEM).not.toContain('revalidateTag');
    expect(JOB_EYLEM).not.toContain('revalidateContent');
    expect(JOB_EYLEM).not.toContain('revalidatePath');

    expect(CLIENT_EYLEM).toContain("revalidateTag(entityTag('client'))");
    expect(CLIENT_EYLEM).not.toContain('revalidatePath');
  });

  it('⚠️ `getSiteStats` `Job` TOPLAMIYOR — ADR-029 kararının önkoşulu', () => {
    /*
     * Kart "varsayma, ÖLÇ" dedi. Bu assert ölçümü kalıcı kılıyor: `Job` bir gün
     * istatistiklere eklenirse önbellek etiketi kararı GEÇERSİZLEŞİR ve burası
     * kırılır — yani karar kendini hatırlatıyor.
     */
    for (const yol of ['src/server/services/stats.ts', 'src/server/services/_shared/stats.ts']) {
      const kaynak = kod(yol);
      expect(kaynak, `${yol} artık Job okuyor — etiket kararı gözden geçirilmeli`).not.toMatch(
        /\bjob\b/i,
      );
    }
  });

  it('`ContentEntity`: `job` YOK, `client` VAR (yalnızca logo şeridi, T-117)', () => {
    const cache = kod('src/server/services/_shared/content-cache.ts');
    const birlesim = cache.match(/export type ContentEntity =[^;]+;/)?.[0] ?? '';

    expect(birlesim).toContain('project');
    expect(birlesim).not.toContain("'job'");
    expect(birlesim).toContain("'client'");
  });

  it('her eylem `currentActorId` kapısından geçiyor (ADR-035/B)', () => {
    for (const [ad, kaynak] of [
      ['job', JOB_EYLEM],
      ['client', CLIENT_EYLEM],
    ] as const) {
      const eylemler = kaynak.match(/export async function \w+Action/g) ?? [];
      const kapilar = kaynak.match(/currentActorId\(\)/g) ?? [];
      expect(kapilar.length, `${ad}: eylem ${eylemler.length}, kapı ${kapilar.length}`).toBe(
        eylemler.length,
      );
    }
  });

  it('⚠️ `Client` SİLME eylemi YOK — arşivleme var (ADR-017)', () => {
    expect(CLIENT_EYLEM).not.toMatch(/deleteClient/);
    expect(CLIENT_SERVIS).not.toMatch(/export\s+async\s+function\s+deleteClient/);
    expect(CLIENT_EYLEM).toContain('archiveClientAction');
  });
});
