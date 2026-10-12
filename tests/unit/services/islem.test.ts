import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  createTransactionCategorySchema,
  createTransactionSchema,
  transactionCategoryFilterSchema,
  transactionFilterSchema,
  updateTransactionCategorySchema,
  updateTransactionSchema,
} from '@/lib/schemas';
import { fetchJobFinancials, type JobFinancialsClient } from '@/server/services/job';
import {
  buildTransactionWhere,
  createTransaction,
  fetchTransactionForPanel,
  fetchTransactionsForExport,
  fetchTransactionsForPanel,
  updateTransaction,
  type TransactionClient,
} from '@/server/services/transaction';
import {
  buildTransactionCategoryWhere,
  createTransactionCategory,
  fetchTransactionCategoriesForPanel,
  setTransactionCategoryArchived,
  transactionCategoryExists,
  updateTransactionCategory,
  type TransactionCategoryClient,
} from '@/server/services/transaction-category';

import { decimal, dedektorCalisiyor, decimalKalanlar } from '../_helpers/decimal-kacak';

/**
 * `Transaction` + `TransactionCategory` + BAKİYE — T-101.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "İŞARET SORUNU": bir işe bağlı GİDER kaydının
 * bakiyeyi netlemesi, kartın "en pahalı hata sınıfı" dediği şey — ekran
 * "müşteri borçlu" derken aslında benim harcadığım parayı gösterirdi.
 */

const KOK = resolve(__dirname, '../../..');

function islemSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'trx_1',
    type: 'INCOME' as const,
    amount: decimal('2500'),
    currency: 'USD' as const,
    fxRate: decimal('34.25'),
    baseAmount: decimal('85625'),
    date: new Date('2026-03-10T00:00:00.000Z'),
    categoryId: 'cat_1',
    jobId: 'job_1',
    clientId: 'cli_1',
    method: 'BANK_TRANSFER' as const,
    isPaid: true,
    paidAt: new Date('2026-03-10T12:00:00.000Z'),
    invoiceNo: 'FTR-001',
    sourceRecurringId: null,
    createdAt: new Date('2026-03-10T09:00:00.000Z'),
    updatedAt: new Date('2026-03-11T09:00:00.000Z'),
    description: 'Açıklama',
    category: { name: 'Proje Geliri' },
    job: { title: 'Kurumsal site' },
    client: { name: 'Kıyı Medya' },
    ...ek,
  };
}

function islemIstemci(isMusteriId: string | null = 'cli_1') {
  const create = vi.fn().mockResolvedValue(islemSatiri());
  const update = vi.fn().mockResolvedValue(islemSatiri());
  const findUnique = vi.fn().mockResolvedValue(islemSatiri());
  const findMany = vi.fn().mockResolvedValue([islemSatiri()]);
  const count = vi.fn().mockResolvedValue(1);
  const jobFindUnique = vi.fn().mockResolvedValue({ clientId: isMusteriId });

  const client = {
    transaction: { create, update, findUnique, findMany, count },
    job: { findUnique: jobFindUnique },
  } as unknown as TransactionClient;

  return { client, create, update, findUnique, findMany, count, jobFindUnique };
}

function kategoriSatiri(ek: Record<string, unknown> = {}) {
  return {
    id: 'cat_1',
    name: 'Proje Geliri',
    type: 'INCOME' as const,
    color: '#11aa55',
    icon: 'wallet',
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { transactions: 4, recurringTransactions: 1 },
    ...ek,
  };
}

function kategoriIstemci() {
  const create = vi.fn().mockResolvedValue(kategoriSatiri());
  const update = vi.fn().mockResolvedValue(kategoriSatiri());
  const findUnique = vi.fn().mockResolvedValue(kategoriSatiri());
  const findMany = vi.fn().mockResolvedValue([kategoriSatiri()]);
  const count = vi.fn().mockResolvedValue(1);
  const client = {
    transactionCategory: { create, update, findUnique, findMany, count },
  } as unknown as TransactionCategoryClient;
  return { client, create, update, findUnique, findMany, count };
}

/* ===========================================================================
 * ⚠️⚠️ BAKİYE — İŞARET SORUNU
 * ======================================================================== */

/** `groupBy` satırı üretici. */
function grup(
  jobId: string,
  type: 'INCOME' | 'EXPENSE',
  isPaid: boolean,
  toplam: string,
  adet = 1,
) {
  return { jobId, type, isPaid, _sum: { baseAmount: decimal(toplam) }, _count: adet };
}

function finansIstemci(gruplar: unknown[], isler: { id: string; baseAmount: string | null }[]) {
  const groupBy = vi.fn().mockResolvedValue(gruplar);
  const findMany = vi.fn().mockResolvedValue(
    isler.map((is) => ({
      id: is.id,
      baseAmount: is.baseAmount === null ? null : decimal(is.baseAmount),
    })),
  );
  const client = {
    transaction: { groupBy },
    job: { findMany },
  } as unknown as JobFinancialsClient;
  return { client, groupBy, findMany };
}

describe('⚠️ fetchJobFinancials — işaret sorunu', () => {
  it('⚠️ GİDER TAHSİLATTAN DÜŞÜLMÜYOR — netleme YOK', async () => {
    /*
     * KARTIN EN PAHALI HATA SINIFI. 85.000 TL'lik iş tamamen tahsil edilmiş,
     * ayrıca 10.000 TL taşeron gideri girilmiş. Naif `sumMoney(hepsi)` 75.000
     * verir ve ekran "müşteri 10.000 TL borçlu" der — müşteri HİÇBİR ŞEY
     * borçlu değil, ben 10.000 harcadım. İki farklı iş durumu, tek yanlış sayı.
     */
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '85000.00'), grup('job_1', 'EXPENSE', true, '10000.00')],
      [{ id: 'job_1', baseAmount: '85000.00' }],
    );

    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(finans?.collected).toBe('85000.00');
    expect(finans?.expense).toBe('10000.00');
    // KALAN SIFIR: müşteri borcunu kapattı.
    expect(finans?.remaining).toBe('0.00');
    // Netlenmiş olsaydı bu çıkardı:
    expect(finans?.remaining).not.toBe('10000.00');
  });

  it('⚠️ GİDER DIŞLANIYOR AMA GİZLENMİYOR — DTO`da ayrı alan', async () => {
    /*
     * "Dışlanmış" ile "görünmez" aynı şey değil: gideri hiç döndürmemek, işe
     * para harcandığını ekrandan silmek olurdu ve o da bir sessizlik olurdu.
     *
     * İddia DTO'nun ANAHTAR KÜMESİ üzerinde — ilk yazdığımda bir dizi
     * literalinin `expense` içerdiğini assert ediyordum, yani kodu hiç
     * okumuyordu (T-050'de bulduğum vakum sınıfı, kendi testimde).
     */
    const { client } = finansIstemci(
      [grup('job_1', 'EXPENSE', true, '10000.00')],
      [{ id: 'job_1', baseAmount: '85000.00' }],
    );
    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(Object.keys(finans ?? {}).sort()).toEqual([
      'agreedBaseAmount',
      'collected',
      'expense',
      'jobId',
      'pending',
      'remaining',
      'transactionCount',
    ]);
    // Gider görünür, ama alacağa DOKUNMUYOR.
    expect(finans?.expense).toBe('10000.00');
    expect(finans?.remaining).toBe('85000.00');

    // ⚠️ `net` BİLEREK YOK: v1 vergiyi hesaplamadığı için bir kâr iddiası
    // dürüst olmaz; arayüz iki alandan türetebilir.
    expect(finans).not.toHaveProperty('net');
  });

  it('⚠️ ÖDENMEMİŞ GELİR TAHSİLAT SAYILMIYOR — `pending` ayrı', async () => {
    /*
     * İkinci işaret tuzağı: `isPaid: false` kesilmiş ama TAHSİL EDİLMEMİŞ
     * faturadır. `collected`a saymak, fatura kesmeyi para almak saymak olurdu.
     */
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '40000.00'), grup('job_1', 'INCOME', false, '45000.00')],
      [{ id: 'job_1', baseAmount: '85000.00' }],
    );

    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(finans?.collected).toBe('40000.00');
    expect(finans?.pending).toBe('45000.00');
    // `pending` KALANIN İÇİNDE: kesilmiş fatura da tahsil edilmemiştir.
    expect(finans?.remaining).toBe('45000.00');
  });

  it('⚠️ ASİMETRİ KASITLI — gider tarafında `isPaid` ayrımı YAPILMIYOR', async () => {
    /*
     * Gelen bir fatura, henüz ödenmemiş olsa da o işin maliyetidir. İki alan
     * iki ayrı soruya cevap verdiği için `isPaid`i aynı ele almaları gerekmiyor;
     * aynı ele almak sorulardan birini bozardı.
     */
    const { client } = finansIstemci(
      [grup('job_1', 'EXPENSE', true, '3000.00'), grup('job_1', 'EXPENSE', false, '2000.00')],
      [{ id: 'job_1', baseAmount: '85000.00' }],
    );

    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(finans?.expense).toBe('5000.00');
    expect(finans?.collected).toBe('0.00');
    expect(finans?.remaining).toBe('85000.00');
  });

  it('⚠️ `agreedAmount` BİLİNMİYORSA `remaining` NULL — `0.00` DEĞİL', async () => {
    // `LEAD` aşamasında anlaşma tutarı bilinmiyor; "borcu yok" demek yanlış
    // olurdu (`deriveBaseAmount` ile aynı kural, aynı sebep).
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '5000.00')],
      [{ id: 'job_1', baseAmount: null }],
    );

    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(finans?.agreedBaseAmount).toBeNull();
    expect(finans?.remaining).toBeNull();
    expect(finans?.collected).toBe('5000.00');
  });

  it('⚠️ FAZLA TAHSİLAT NEGATİF KALAN veriyor — sıfıra KIRPILMIYOR', async () => {
    // Fazla tahsilat ya veri girişi hatası ya gerçek avans; ikisi de görülmeli.
    // Kırpmak tam olarak ADR-014'ün kaçındığı şeyi yapar: tutarsızlığı gizlemek.
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '90000.00')],
      [{ id: 'job_1', baseAmount: '85000.00' }],
    );

    expect((await fetchJobFinancials(['job_1'], client)).job_1?.remaining).toBe('-5000.00');
  });

  it('işlemi OLMAYAN iş de TAM DTO döner — `undefined` değil', async () => {
    /*
     * Çağıran `financials[jobId]` yazdığında `undefined` görmemeli; yoksa her
     * kullanım yerinde bir `?? sıfırlar` nöbeti gerekir ve biri onu
     * unuttuğunda ekranda boşluk çıkar.
     */
    const { client } = finansIstemci([], [{ id: 'job_1', baseAmount: '85000.00' }]);
    const finans = (await fetchJobFinancials(['job_1'], client)).job_1;

    expect(finans).toEqual({
      jobId: 'job_1',
      agreedBaseAmount: '85000.00',
      collected: '0.00',
      pending: '0.00',
      expense: '0.00',
      remaining: '85000.00',
      transactionCount: 0,
    });
  });

  it('TOPLU — N iş için iki sorgu, N+1 yok', async () => {
    const { client, groupBy, findMany } = finansIstemci(
      [grup('job_1', 'INCOME', true, '100.00'), grup('job_2', 'EXPENSE', true, '50.00')],
      [
        { id: 'job_1', baseAmount: '100.00' },
        { id: 'job_2', baseAmount: '200.00' },
      ],
    );

    const finans = await fetchJobFinancials(['job_1', 'job_2'], client);

    expect(groupBy).toHaveBeenCalledOnce();
    expect(findMany).toHaveBeenCalledOnce();
    expect(Object.keys(finans).sort()).toEqual(['job_1', 'job_2']);
    expect(finans.job_1?.remaining).toBe('0.00');
    expect(finans.job_2?.remaining).toBe('200.00');
  });

  it('BOŞ liste sorgu AÇMIYOR, yinelenen kimlik tekilleştiriliyor', async () => {
    const { client, groupBy } = finansIstemci([], []);
    expect(await fetchJobFinancials([], client)).toEqual({});
    expect(groupBy).not.toHaveBeenCalled();

    const { client: c2, groupBy: g2 } = finansIstemci([], [{ id: 'a', baseAmount: '1.00' }]);
    await fetchJobFinancials(['a', 'a'], c2);
    expect(g2.mock.calls[0]?.[0].where.jobId.in).toEqual(['a']);
  });

  it('`transactionCount` gelir ve gideri birlikte sayıyor', async () => {
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '100.00', 3), grup('job_1', 'EXPENSE', true, '50.00', 2)],
      [{ id: 'job_1', baseAmount: '100.00' }],
    );

    expect((await fetchJobFinancials(['job_1'], client)).job_1?.transactionCount).toBe(5);
  });

  it('`groupBy` SORULMAYAN işi döndürse yoksayılıyor', async () => {
    // Savunmacı: `null` ya da beklenmeyen bir `jobId` ile kayıt yazmak sessizce
    // yanlış bir girdi üretirdi.
    const { client } = finansIstemci(
      [
        grup('job_1', 'INCOME', true, '100.00'),
        { ...grup('x', 'INCOME', true, '9.00'), jobId: null },
      ],
      [{ id: 'job_1', baseAmount: '100.00' }],
    );

    const finans = await fetchJobFinancials(['job_1'], client);
    expect(Object.keys(finans)).toEqual(['job_1']);
    expect(finans.job_1?.collected).toBe('100.00');
  });

  it('DTO`da `Decimal` kaçağı YOK', async () => {
    const { client } = finansIstemci(
      [grup('job_1', 'INCOME', true, '100.00')],
      [{ id: 'job_1', baseAmount: '100.00' }],
    );

    expect(decimalKalanlar(await fetchJobFinancials(['job_1'], client))).toEqual([]);
  });
});

/* ===========================================================================
 * ⚠️ ADR-014 — `baseAmount` TÜRETMESİ
 * ======================================================================== */

describe('Transaction baseAmount türetmesi', () => {
  it('şema `baseAmount` ALANI TAŞIMIYOR — istemciden gelmesi imkânsız', () => {
    const olustur = createTransactionSchema.parse({
      type: 'INCOME',
      amount: '100.00',
      date: '2026-03-10',
      categoryId: 'cat_1',
      baseAmount: '999999.00',
    });
    expect('baseAmount' in olustur).toBe(false);

    const guncelle = updateTransactionSchema.parse({ id: 'trx_1', baseAmount: '999999.00' });
    expect('baseAmount' in guncelle).toBe(false);
  });

  it('create — sunucuda hesaplanıyor', async () => {
    const { client, create } = islemIstemci();
    await createTransaction(
      createTransactionSchema.parse({
        type: 'INCOME',
        amount: '2500.00',
        currency: 'USD',
        fxRate: '34.25',
        date: '2026-03-10',
        categoryId: 'cat_1',
      }),
      client,
    );

    expect(create.mock.calls[0]?.[0].data.baseAmount).toBe('85625.00');
  });

  it('⚠️ update — YALNIZCA kur gönderilince yeniden hesaplanıyor', async () => {
    // Orkestra Şefi'nin bağımsız ölçümü: 2500×34,25 = 85.625 vs 2500×40 =
    // 100.000 → yalnızca kur güncellenseydi 14.375 TL sessiz sapma.
    const { client, update } = islemIstemci();
    await updateTransaction(
      updateTransactionSchema.parse({ id: 'trx_1', fxRate: '40.00' }),
      client,
    );

    expect(update.mock.calls[0]?.[0].data.baseAmount).toBe('100000.00');
    expect(update.mock.calls[0]?.[0].data.baseAmount).not.toBe('85625.00');
  });

  it('⚠️ update — YALNIZCA tutar gönderilince de yeniden hesaplanıyor', async () => {
    const { client, update } = islemIstemci();
    await updateTransaction(
      updateTransactionSchema.parse({ id: 'trx_1', amount: '100.00' }),
      client,
    );

    // Kayıttaki kur (34.25) kullanılıyor — gönderilmeyen alan KAYITTAN okunuyor.
    expect(update.mock.calls[0]?.[0].data.baseAmount).toBe('3425.00');
  });

  it('PARA ALANI HİÇ GÖNDERİLMESE BİLE yazılıyor — kendi kendini onarır', async () => {
    const { client, update } = islemIstemci();
    await updateTransaction(
      updateTransactionSchema.parse({ id: 'trx_1', invoiceNo: 'FTR-002' }),
      client,
    );

    expect(update.mock.calls[0]?.[0].data.baseAmount).toBe('85625.00');
  });

  it('TÜM alanlar gönderildiğinde hepsi yazılıyor ve boş metinler `null` oluyor', async () => {
    /*
     * Kısmi güncelleme haritasının TAMAMINI bir kez ölçüyor: on iki alanın
     * hepsi `data`ya giriyor, `description`/`invoiceNo` boş gönderilince
     * `null` oluyor ("girilmedi" ile "boş girildi" panelde aynı şey), ve
     * tarihler doğru dönüştürücüden geçiyor (`date` gün, `paidAt` an).
     */
    const { client, update } = islemIstemci('cli_YENI');
    await updateTransaction(
      updateTransactionSchema.parse({
        id: 'trx_1',
        type: 'EXPENSE',
        amount: '10.00',
        currency: 'TRY',
        fxRate: '1',
        date: '2026-04-01',
        categoryId: 'cat_2',
        jobId: 'job_2',
        description: '   ',
        method: 'CASH',
        isPaid: false,
        paidAt: '2026-04-02T08:00:00.000Z',
        invoiceNo: '  ',
      }),
      client,
    );

    const data = update.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.type).toBe('EXPENSE');
    expect(data.amount).toBe('10.00');
    expect(data.currency).toBe('TRY');
    expect(data.fxRate).toBe('1');
    expect((data.date as Date).toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(data.categoryId).toBe('cat_2');
    expect(data.jobId).toBe('job_2');
    expect(data.method).toBe('CASH');
    expect(data.isPaid).toBe(false);
    expect((data.paidAt as Date).toISOString()).toBe('2026-04-02T08:00:00.000Z');
    // Yalnızca boşluk içeren metinler `null`.
    expect(data.description).toBeNull();
    expect(data.invoiceNo).toBeNull();
    // Yeni işin müşterisi türetildi, `baseAmount` yeni çiftten hesaplandı.
    expect(data.clientId).toBe('cli_YENI');
    expect(data.baseAmount).toBe('10.00');
  });

  it('kayıt yoksa `null` ve YAZMA DENENMİYOR', async () => {
    const { client, update, findUnique } = islemIstemci();
    findUnique.mockResolvedValue(null);

    expect(
      await updateTransaction(updateTransactionSchema.parse({ id: 'yok' }), client),
    ).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('TRY kuru 1 — şema tutarsız kuru REDDEDİYOR', () => {
    const temel = { type: 'INCOME', amount: '100.00', date: '2026-03-10', categoryId: 'cat_1' };
    // TRY'de kur 1 olmalı.
    expect(
      createTransactionSchema.safeParse({ ...temel, currency: 'TRY', fxRate: '34.25' }).success,
    ).toBe(false);
    // TRY dışında 1 OLAMAZ — 1 bırakılırsa yabancı para TRY sanılır.
    expect(
      createTransactionSchema.safeParse({ ...temel, currency: 'USD', fxRate: '1' }).success,
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({ ...temel, currency: 'USD', fxRate: '34.25' }).success,
    ).toBe(true);
  });
});

/* ===========================================================================
 * ⚠️ `clientId` İŞTEN TÜRETİLİYOR — iki FK ayrışmıyor
 * ======================================================================== */

describe('clientId tutarlılığı', () => {
  const temel = {
    type: 'INCOME' as const,
    amount: '100.00',
    date: '2026-03-10',
    categoryId: 'cat_1',
  };

  it('⚠️ `jobId` verilince müşteri İŞTEN geliyor — gönderilen EZİLİYOR', async () => {
    /*
     * Form `jobId: A` (müşterisi X) ile `clientId: Y` gönderebilirdi; o satır
     * "X'in cirosu" ve "A işinin tahsilatı" raporlarında AYNI PARAYI FARKLI
     * MÜŞTERİLERE yazardı ve hiçbir şey kırmızıya dönmezdi.
     */
    const { client, create } = islemIstemci('cli_ISIN');
    await createTransaction(
      createTransactionSchema.parse({ ...temel, jobId: 'job_1', clientId: 'cli_YANLIS' }),
      client,
    );

    expect(create.mock.calls[0]?.[0].data.clientId).toBe('cli_ISIN');
  });

  it('işin müşterisi YOKSA gönderilen korunuyor', async () => {
    // Ayrışacak bir gerçek yok; kullanıcının seçimi geçerli.
    const { client, create } = islemIstemci(null);
    await createTransaction(
      createTransactionSchema.parse({ ...temel, jobId: 'job_1', clientId: 'cli_X' }),
      client,
    );

    expect(create.mock.calls[0]?.[0].data.clientId).toBe('cli_X');
  });

  it('`jobId` YOKSA iş hiç sorgulanmıyor — işsiz hareket meşru', async () => {
    const { client, create, jobFindUnique } = islemIstemci();
    await createTransaction(createTransactionSchema.parse({ ...temel, clientId: 'cli_X' }), client);

    expect(jobFindUnique).not.toHaveBeenCalled();
    expect(create.mock.calls[0]?.[0].data.clientId).toBe('cli_X');
    expect(create.mock.calls[0]?.[0].data.jobId).toBeNull();
  });

  it('⚠️ `jobId` DEĞİŞTİRİLİRSE müşteri de yeniden türetiliyor', async () => {
    // Yoksa işlem yeni işe bağlanırken ESKİ işin müşterisinde kalırdı.
    const { client, update, jobFindUnique } = islemIstemci('cli_YENI');
    await updateTransaction(
      updateTransactionSchema.parse({ id: 'trx_1', jobId: 'job_YENI' }),
      client,
    );

    expect(jobFindUnique.mock.calls[0]?.[0].where.id).toBe('job_YENI');
    expect(update.mock.calls[0]?.[0].data.clientId).toBe('cli_YENI');
  });

  it('güncellemede `jobId` gönderilmezse KAYITTAKİ iş kullanılıyor', async () => {
    const { client, jobFindUnique } = islemIstemci();
    await updateTransaction(updateTransactionSchema.parse({ id: 'trx_1', amount: '1.00' }), client);

    expect(jobFindUnique.mock.calls[0]?.[0].where.id).toBe('job_1');
  });

  it('⚠️ İŞ KARTI ÖDEMEYE kur/para birimi DEVRETMİYOR', async () => {
    /*
     * ADR-014: "İŞLEM ANINDAKİ kur". 2500 USD'lik bir iş için bugün alınan ödeme
     * bugünün kuruyla çevrilir, pazarlık günündeki kurla değil. Devralmak
     * sessizce yanlış TRY karşılığı üretirdi.
     *
     * Ölçüm: iş USD/34.25 taşıyor (`islemIstemci` satırı), ödeme TRY/1
     * gönderiliyor ve TRY/1 olarak yazılıyor.
     */
    const { client, create } = islemIstemci();
    await createTransaction(
      createTransactionSchema.parse({ ...temel, jobId: 'job_1', currency: 'TRY', fxRate: '1' }),
      client,
    );

    const data = create.mock.calls[0]?.[0].data;
    expect(data.currency).toBe('TRY');
    expect(data.fxRate).toBe('1');
    expect(data.baseAmount).toBe('100.00');
  });

  it('`sourceRecurringId` BURADAN YAZILMIYOR — yalnızca cron doldurur', async () => {
    const { client, create } = islemIstemci();
    await createTransaction(createTransactionSchema.parse(temel), client);

    expect('sourceRecurringId' in create.mock.calls[0]![0].data).toBe(false);
    expect('periodKey' in create.mock.calls[0]![0].data).toBe(false);
  });
});

/* ===========================================================================
 * DTO SINIRI
 * ======================================================================== */

describe('Transaction DTO sınırı', () => {
  it('dedektör ÇALIŞIYOR — vakum değil', () => {
    expect(dedektorCalisiyor()).toEqual([['a.b'], []]);
  });

  it('liste DTO`sunda `Decimal` YOK, üç para alanı `string`', async () => {
    const { client } = islemIstemci();
    const sayfa = await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client);
    const item = sayfa.items[0];

    expect(decimalKalanlar(sayfa)).toEqual([]);
    expect(item?.amount).toBe('2500.00');
    expect(item?.fxRate).toBe('34.25000000');
    expect(item?.baseAmount).toBe('85625.00');
  });

  it('detay DTO`sunda da `Decimal` YOK', async () => {
    const { client } = islemIstemci();
    expect(decimalKalanlar(await fetchTransactionForPanel('trx_1', client))).toEqual([]);
  });

  it('`date` `@db.Date` → `YYYY-MM-DD`, `paidAt` `DateTime` → ISO', async () => {
    const { client } = islemIstemci();
    const item = (await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client))
      .items[0];

    expect(item?.date).toBe('2026-03-10');
    expect(item?.paidAt).toBe('2026-03-10T12:00:00.000Z');
  });

  it('ilişki adları DÜZLEŞTİRİLİYOR — iç içe nesne yok', async () => {
    const { client } = islemIstemci();
    const item = (await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client))
      .items[0];

    expect(item?.categoryName).toBe('Proje Geliri');
    expect(item?.jobTitle).toBe('Kurumsal site');
    expect(item?.clientName).toBe('Kıyı Medya');
    expect(item).not.toHaveProperty('category');
  });

  it('`fromRecurring` kimliğin OLGUSU — kimliğin kendisi listede yok', async () => {
    const { client, findMany } = islemIstemci();
    findMany.mockResolvedValue([islemSatiri({ sourceRecurringId: 'rec_1' })]);

    const item = (await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client))
      .items[0];

    expect(item?.fromRecurring).toBe(true);
    expect(item).not.toHaveProperty('sourceRecurringId');
  });

  it('DIŞA AKTARIM okumasında da `Decimal` kaçağı YOK', async () => {
    /*
     * ⚠️ BU İDDİAYI GÜVENLİK`İN KAPISI BULDURDU (ikinci kez):
     * `decimal-yuzey-sayimi.test.ts` yeni bir `Decimal` yüzeyi — T-106'da
     * eklenen `fetchTransactionsForExport` — için ölçüm olmadığını söyledi.
     * Kapı haklıydı: fonksiyon `amount`/`fxRate`/`baseAmount` okuyor.
     *
     * T-102'de aynı kapı `fetchOutstandingSummary` için ötmüştü. Yeni bir okuma
     * yüzeyi her eklendiğinde ötüyor, yani ölçüm listesi kendini hatırlatıyor.
     */
    const { client } = islemIstemci();
    // Taklit `findMany` zaten DETAY satırı döndürüyor; dar arayüz farklı
    // olduğu için tip burada daraltılıyor.
    const satirlar = await fetchTransactionsForExport(
      transactionFilterSchema.parse({}),
      100,
      client as unknown as Parameters<typeof fetchTransactionsForExport>[2],
    );

    expect(decimalKalanlar(satirlar)).toEqual([]);
    expect(satirlar[0]?.baseAmount).toBe('85625.00');
    // Dışa aktarım DETAY seçimini kullanıyor: `description` taşıyor.
    expect(satirlar[0]?.description).toBe('Açıklama');
  });

  it('`description` LİSTEDE YOK, detayda VAR', async () => {
    const { client } = islemIstemci();
    const sayfa = await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client);

    expect(sayfa.items[0]).not.toHaveProperty('description');
    expect((await fetchTransactionForPanel('trx_1', client))?.description).toBe('Açıklama');
  });
});

/* ===========================================================================
 * FİLTRE VE SIRALAMA
 * ======================================================================== */

describe('buildTransactionWhere', () => {
  it('verilmeyen alan `where`e HİÇ girmiyor', () => {
    expect(buildTransactionWhere(transactionFilterSchema.parse({}))).toEqual({});
  });

  it('tüm süzgeçler kendi alanına düşüyor', () => {
    const where = buildTransactionWhere(
      transactionFilterSchema.parse({
        type: 'EXPENSE',
        currency: 'USD',
        method: 'CASH',
        categoryId: 'cat_1',
        jobId: 'job_1',
        clientId: 'cli_1',
        isPaid: 'false',
      }),
    );

    expect(where).toEqual({
      type: 'EXPENSE',
      currency: 'USD',
      method: 'CASH',
      categoryId: 'cat_1',
      jobId: 'job_1',
      clientId: 'cli_1',
      // ADR-033 — `"false"` dizesi `false` oldu, `true` DEĞİL.
      isPaid: false,
    });
  });

  it('tarih aralığı `date` üzerinde — `@db.Date`, UTC gece yarısı DOĞRU', () => {
    // T-052'de `AuditLog.createdAt` bir `DateTime` olduğu için aynı sınır
    // YANLIŞTI. Hangisinin kullanılacağını SÜTUNUN TİPİ belirliyor.
    const where = buildTransactionWhere(
      transactionFilterSchema.parse({ from: '2026-03-01', to: '2026-03-31' }),
    );
    const date = where.date as { gte: Date; lte: Date };

    expect(date.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(date.lte.toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('arama açıklama, fatura no, İŞ ve MÜŞTERİ adında', () => {
    const where = buildTransactionWhere(transactionFilterSchema.parse({ q: 'kıyı' }));
    expect(where.OR).toHaveLength(4);
    expect(JSON.stringify(where.OR)).toContain('insensitive');
  });

  it('⚠️ sıralama TARİHE göre, ve İKİNCİL ANAHTAR ZORUNLU', async () => {
    /*
     * `date` bir GÜN (saat yok), yani aynı güne düşen işlemler arasında sıra
     * belirsiz kalırdı ve SAYFALAMA KARARSIZ olurdu — aynı kayıt iki sayfada
     * görünebilir ya da hiç görünmeyebilirdi.
     */
    const { client, findMany } = islemIstemci();
    await fetchTransactionsForPanel(transactionFilterSchema.parse({}), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ date: 'desc' }, { createdAt: 'desc' }]);
  });

  it('`sort=asc` İKİ anahtarı birlikte çeviriyor', async () => {
    const { client, findMany } = islemIstemci();
    await fetchTransactionsForPanel(transactionFilterSchema.parse({ sort: 'asc' }), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ date: 'asc' }, { createdAt: 'asc' }]);
  });

  it('`count` listeyle AYNI `where`i kullanıyor', async () => {
    const { client, findMany, count } = islemIstemci();
    await fetchTransactionsForPanel(transactionFilterSchema.parse({ type: 'INCOME' }), client);

    expect(count.mock.calls[0]?.[0].where).toEqual(findMany.mock.calls[0]?.[0].where);
  });
});

/* ===========================================================================
 * KATEGORİ
 * ======================================================================== */

describe('TransactionCategory', () => {
  it('⚠️ bağlı sayı İŞLEM + ŞABLON toplamı', async () => {
    /*
     * Bir kategori yalnızca şablonlarda kullanılıyor olabilir ve
     * `RecurringTransaction.categoryId` de `Restrict`. Yalnızca `transactions`
     * saymak "0 işlem, silinebilir" izlenimi verirdi — oysa silinemez.
     */
    const { client } = kategoriIstemci();
    const sayfa = await fetchTransactionCategoriesForPanel(
      transactionCategoryFilterSchema.parse({}),
      client,
    );

    expect(sayfa.items[0]?.transactionCount).toBe(5);
  });

  it('sıralama TÜRE, sonra ADA göre', async () => {
    // Liste gelir ve gider kümelerini bir arada gösteriyor; tür önce gelince
    // liste kendiliğinden iki bloğa ayrılıyor.
    const { client, findMany } = kategoriIstemci();
    await fetchTransactionCategoriesForPanel(transactionCategoryFilterSchema.parse({}), client);

    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ type: 'asc' }, { name: 'asc' }]);
  });

  it('`isArchived` verilmezse arşiv DAHİL hepsi (T-038 kararı)', () => {
    expect(buildTransactionCategoryWhere(transactionCategoryFilterSchema.parse({}))).toEqual({});
  });

  it('ADR-033 — `"false"` → `false`', () => {
    expect(
      buildTransactionCategoryWhere(transactionCategoryFilterSchema.parse({ isArchived: 'false' })),
    ).toEqual({ isArchived: false });
  });

  it('boş renk/ikon `null` oluyor', async () => {
    const { client, create } = kategoriIstemci();
    await createTransactionCategory(
      createTransactionCategorySchema.parse({ name: 'X', type: 'INCOME', icon: '' }),
      client,
    );

    expect(create.mock.calls[0]?.[0].data.icon).toBeNull();
    expect(create.mock.calls[0]?.[0].data.color).toBeNull();
  });

  it('kısmi güncelleme gönderilmeyen alana dokunmuyor', async () => {
    const { client, update } = kategoriIstemci();
    await updateTransactionCategory(
      updateTransactionCategorySchema.parse({ id: 'cat_1', name: 'Yeni' }),
      client,
    );

    expect(update.mock.calls[0]?.[0].data).toEqual({ name: 'Yeni' });
  });

  it('arşivleme İKİ YÖNLÜ', async () => {
    const { client, update } = kategoriIstemci();
    await setTransactionCategoryArchived('cat_1', true, client);
    await setTransactionCategoryArchived('cat_1', false, client);

    expect(update.mock.calls[0]?.[0].data).toEqual({ isArchived: true });
    expect(update.mock.calls[1]?.[0].data).toEqual({ isArchived: false });
  });

  it('`transactionCategoryExists` — varlık kapısı', async () => {
    const { client, findUnique } = kategoriIstemci();
    expect(await transactionCategoryExists('cat_1', client)).toBe(true);

    findUnique.mockResolvedValue(null);
    expect(await transactionCategoryExists('yok', client)).toBe(false);
  });

  it('DTO`da `Decimal` yok, tarihler ISO', async () => {
    const { client } = kategoriIstemci();
    const sayfa = await fetchTransactionCategoriesForPanel(
      transactionCategoryFilterSchema.parse({}),
      client,
    );

    expect(decimalKalanlar(sayfa)).toEqual([]);
    expect(sayfa.items[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

/* ===========================================================================
 * ⚠️ KAPILAR
 * ======================================================================== */

describe('KAPILAR', () => {
  const kod = (yol: string) =>
    readFileSync(join(KOK, yol), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, ' ');

  const TRX_SERVIS = kod('src/server/services/transaction.ts');
  const KAT_SERVIS = kod('src/server/services/transaction-category.ts');
  const TRX_EYLEM = kod('src/server/actions/transaction.ts');
  const KAT_EYLEM = kod('src/server/actions/transaction-category.ts');

  it('tarama vakum değil', () => {
    expect(TRX_SERVIS).toContain('createTransaction');
    expect(KAT_SERVIS).toContain('fetchTransactionCategoriesForPanel');
    expect(TRX_EYLEM).toContain('createTransactionAction');
    expect(KAT_EYLEM).toContain('archiveTransactionCategoryAction');
  });

  it('ÖNBELLEKLENMİYOR — `next/cache` hiç yok', () => {
    for (const kaynak of [TRX_SERVIS, KAT_SERVIS]) {
      expect(kaynak).not.toContain('next/cache');
      expect(kaynak).not.toContain('cachedRead');
      expect(kaynak).not.toContain('unstable_cache');
    }
  });

  it('`fetchX` adlandırması — `getX` YOK (T-040 kuralı)', () => {
    for (const kaynak of [TRX_SERVIS, KAT_SERVIS]) {
      expect(kaynak).not.toMatch(/export\s+async\s+function\s+get[A-Z]/);
    }
  });

  it('⚠️ `revalidateTag` ÇAĞRILMIYOR', () => {
    for (const kaynak of [TRX_EYLEM, KAT_EYLEM]) {
      expect(kaynak).not.toContain('revalidateTag');
      expect(kaynak).not.toContain('revalidateContent');
      expect(kaynak).not.toContain('revalidatePath');
    }
  });

  it('⚠️ `getSiteStats` `Transaction` TOPLAMIYOR — etiket kararının önkoşulu', () => {
    /*
     * T-100 `Job` için taramıştı; bu assert `Transaction` için aynı önkoşulu
     * kalıcı kılıyor. İstatistiklere eklendiği gün kırılır, yani karar kendini
     * hatırlatıyor.
     */
    for (const yol of ['src/server/services/stats.ts', 'src/server/services/_shared/stats.ts']) {
      expect(kod(yol), `${yol} artık Transaction okuyor`).not.toMatch(/\btransaction\b/i);
    }
  });

  it('`ContentEntity` birleşiminde `transaction` YOK', () => {
    const birlesim =
      kod('src/server/services/_shared/content-cache.ts').match(
        /export type ContentEntity =[^;]+;/,
      )?.[0] ?? '';

    expect(birlesim).toContain('project');
    expect(birlesim).not.toContain('transaction');
  });

  it('⚠️ İŞ KARTI İÇİN AYRI YAZMA EYLEMİ YOK — tek yazma yolu', () => {
    /*
     * §6'nın "aynı veri iki yere girilmez" şartını koruyan şey TEKLİK. İkinci
     * bir eylem (`recordJobPaymentAction` gibi) onu bozmanın en kolay yolu.
     */
    const eylemler = TRX_EYLEM.match(/export async function (\w+)/g) ?? [];
    expect(eylemler.sort()).toEqual([
      'export async function createTransactionAction',
      'export async function updateTransactionAction',
    ]);
    expect(TRX_EYLEM).not.toMatch(/recordJobPayment/i);
  });

  it('⚠️ `Job`da bakiye SÜTUNU YOK — ADR-014/B8', () => {
    /*
     * "Tahsil edilen ve kalan bakiye SÜTUN DEĞİL." Şemaya böyle bir kolon
     * eklenirse "gelir tablosu türetilir" güvencesi çöker ve iki yerde tutulup
     * birbirini tutmayan tutar sorunu doğar.
     */
    const sema = readFileSync(join(KOK, 'prisma/schema.prisma'), 'utf8');
    const jobBlok = sema.slice(sema.indexOf('model Job {'), sema.indexOf('model Transaction {'));

    expect(jobBlok).toContain('agreedAmount');
    expect(jobBlok).not.toMatch(/^\s*paidAmount/m);
    expect(jobBlok).not.toMatch(/^\s*collectedAmount/m);
    expect(jobBlok).not.toMatch(/^\s*remainingAmount/m);
  });

  it('her eylem `currentActorId` kapısından geçiyor (ADR-035/B)', () => {
    for (const [ad, kaynak] of [
      ['transaction', TRX_EYLEM],
      ['category', KAT_EYLEM],
    ] as const) {
      const eylemSayisi = (kaynak.match(/export async function \w+Action/g) ?? []).length;
      const kapiSayisi = (kaynak.match(/currentActorId\(\)/g) ?? []).length;
      expect(kapiSayisi, `${ad}: eylem ${eylemSayisi}, kapı ${kapiSayisi}`).toBe(eylemSayisi);
    }
  });

  it('⚠️ KATEGORİ SİLME eylemi YOK — arşivleme var (ADR-017)', () => {
    expect(KAT_EYLEM).not.toMatch(/deleteTransactionCategory/);
    expect(KAT_SERVIS).not.toMatch(/export\s+async\s+function\s+delete/);
  });

  it('⚠️ İŞLEM SİLME eylemi YOK — defter geriye dönük değiştirilmez', () => {
    expect(TRX_EYLEM).not.toMatch(/deleteTransaction/);
    expect(TRX_SERVIS).not.toMatch(/export\s+async\s+function\s+delete/);
  });
});
