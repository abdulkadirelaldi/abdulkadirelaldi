import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { isValidPeriodKey } from '@/server/services/_shared/period-key';
import {
  fetchCategoryBreakdown,
  fetchMonthlyReport,
  fetchOutstandingSummary,
  fetchYearlyReport,
  type CategoryReportClient,
  type OutstandingClient,
  type ReportClient,
} from '@/server/services/report';

import { decimal, decimalKalanlar, dedektorCalisiyor } from '../_helpers/decimal-kacak';

/**
 * RAPOR HESAPLAYICILARI — §4.2, T-102.
 *
 * ⚠️ BU DOSYANIN İKİ EN ÖNEMLİ BLOĞU:
 *   1. "kategori dağılımı İŞLEMİN türüne göre" — kategorinin türü sonradan
 *      değişebiliyor ve dağılımı ona göre hesaplamak işlemleri YANLIŞ TARAFA
 *      yazar; toplamlar yine tutar, yalnızca yanlış kümede.
 *   2. "ay sınırı" — kart `appDayStartInstant` istedi, ÖLÇÜM `appDayToDate`in
 *      doğru olduğunu gösterdi (`transaction.date` bir `date` sütunu).
 */

const KOK = resolve(__dirname, '../../..');

/** `@db.Date` Prisma'da UTC gece yarısı olarak okunuyor (T-102'de ölçüldü). */
function gun(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

type Grup = {
  date?: Date;
  categoryId?: string;
  type: 'INCOME' | 'EXPENSE';
  isPaid: boolean;
  _sum: { baseAmount: ReturnType<typeof decimal> | null };
  _count: number;
};

function g(
  anahtar: { date?: string; categoryId?: string },
  type: 'INCOME' | 'EXPENSE',
  isPaid: boolean,
  tutar: string,
  adet = 1,
): Grup {
  return {
    ...(anahtar.date ? { date: gun(anahtar.date) } : {}),
    ...(anahtar.categoryId ? { categoryId: anahtar.categoryId } : {}),
    type,
    isPaid,
    _sum: { baseAmount: decimal(tutar) },
    _count: adet,
  };
}

function raporIstemci(gruplar: Grup[]) {
  const groupBy = vi.fn().mockResolvedValue(gruplar);
  const findMany = vi.fn().mockResolvedValue([]);
  const client = {
    transaction: { groupBy },
    transactionCategory: { findMany },
  } as unknown as ReportClient;
  return { client, groupBy };
}

function kategoriIstemci(
  gruplar: Grup[],
  kategoriler: { id: string; name: string; type: 'INCOME' | 'EXPENSE' }[],
) {
  const groupBy = vi.fn().mockResolvedValue(gruplar);
  const findMany = vi.fn().mockResolvedValue(kategoriler);
  const client = {
    transaction: { groupBy },
    transactionCategory: { findMany },
  } as unknown as CategoryReportClient;
  return { client, groupBy, findMany };
}

/* ===========================================================================
 * ⚠️⚠️ AY SINIRI — KARTIN ÖNCÜLÜ BU SÜTUNDA GEÇERSİZ
 * ======================================================================== */

describe('⚠️ ay sınırı — `date` sütunu için `appDayToDate` DOĞRU', () => {
  /**
   * ÖLÇÜLDÜ (T-102, canlı PG + information_schema):
   *   transaction.date      = `date`       → saat saklamıyor
   *   transaction.paidAt    = `timestamp`
   *   audit_log.createdAt   = `timestamp`  → T-052'nin tuzağı BURADA
   *
   * Dört sınır kaydıyla (28 Şub · 1 Mar · 31 Mar · 1 Nis) Mart sorgusu:
   *   appDayToDate       → 1 Mar, 31 Mar   ✅
   *   appDayStartInstant → 28 Şub, 1 Mar   ❌ (Şubat girdi, 31 Mart düştü)
   */
  it('Mart sınırı UTC gece yarısı — ayı bir gün GERİYE kaydırmıyor', async () => {
    const { client, groupBy } = raporIstemci([]);
    await fetchMonthlyReport(2026, 3, client);

    const where = groupBy.mock.calls[0]?.[0].where as { date: { gte: Date; lte: Date } };

    expect(where.date.gte.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-03-31T00:00:00.000Z');

    // ⚠️ `appDayStartInstant` bunları üretirdi; ürettiği gün bu assert kırılır.
    expect(where.date.gte.toISOString()).not.toBe('2026-02-28T21:00:00.000Z');
    expect(where.date.lte.toISOString()).not.toBe('2026-03-31T21:00:00.000Z');
  });

  it('ayın son günü DAHİL — `lte`, dışlayıcı sınır değil', async () => {
    const { client, groupBy } = raporIstemci([]);
    await fetchMonthlyReport(2026, 3, client);
    const where = groupBy.mock.calls[0]?.[0].where as { date: { gte: Date; lte: Date } };

    expect(gun('2026-03-31') <= where.date.lte).toBe(true);
    expect(gun('2026-04-01') <= where.date.lte).toBe(false);
    expect(gun('2026-02-28') >= where.date.gte).toBe(false);
  });

  it('ARTIK YIL — şubat 29 gün, aralık `appMonthRange`ten geliyor', async () => {
    const { client, groupBy } = raporIstemci([]);
    await fetchMonthlyReport(2028, 2, client); // 2028 artık yıl
    const where = groupBy.mock.calls[0]?.[0].where as { date: { lte: Date } };

    // Elle `'-28'` yazan bir uygulama 29 Şubat'ı düşürürdü.
    expect(where.date.lte.toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('GEÇERSİZ ay fırlatıyor — sessizce boş rapor DÖNMÜYOR', async () => {
    const { client } = raporIstemci([]);
    // Boş rapor dönmek kullanıcıya "o ayda hareket yok" demek olurdu.
    await expect(fetchMonthlyReport(2026, 13, client)).rejects.toThrow('Geçersiz ay');
    await expect(fetchMonthlyReport(2026, 0, client)).rejects.toThrow('Geçersiz ay');
  });

  it('`period` `buildPeriodKey` ile üretiliyor — elle kurulmuyor', async () => {
    const { client } = raporIstemci([]);
    const rapor = await fetchMonthlyReport(2026, 3, client);

    // `${year}-${month}` elle kurulsaydı `2026-3` çıkardı ve desene uymazdı.
    expect(rapor.period).toBe('2026-03');
    expect(isValidPeriodKey(rapor.period)).toBe(true);
  });
});

/* ===========================================================================
 * ⚠️⚠️ İKİ ESAS — "gelir" tek başına iki şeyi adlandırıyor
 * ======================================================================== */

describe('⚠️ iki esas ayrı ayrı — collected / invoiced', () => {
  it('ödenmiş gelir HEM collected HEM invoiced — tahakkuk nakdi KAPSAR', async () => {
    const { client } = raporIstemci([g({ date: '2026-03-10' }, 'INCOME', true, '1000.00')]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.income.collected).toBe('1000.00');
    expect(r.income.invoiced).toBe('1000.00');
  });

  it('⚠️ ÖDENMEMİŞ gelir YALNIZCA invoiced — fatura kesmek para almak DEĞİL', async () => {
    const { client } = raporIstemci([g({ date: '2026-03-10' }, 'INCOME', false, '1000.00')]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.income.collected).toBe('0.00');
    expect(r.income.invoiced).toBe('1000.00');
  });

  it('gider tarafı simetrik: paid / incurred', async () => {
    const { client } = raporIstemci([
      g({ date: '2026-03-01' }, 'EXPENSE', true, '300.00'),
      g({ date: '2026-03-02' }, 'EXPENSE', false, '200.00'),
    ]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.expense.paid).toBe('300.00');
    expect(r.expense.incurred).toBe('500.00');
  });

  it('⚠️ NETLER DOĞRU ÇİFTLERDEN — çapraz esas karışımı YOK', async () => {
    /*
     * Alanlar döndürülmeseydi arayüz çıkarma yapardı ve `invoiced − paid`
     * seçebilirdi: tahakkuk gelirini nakit gideriyle karıştıran sessiz hata.
     * Doğru eşleşmeler burada kurulduğu için o karışım imkânsız.
     */
    const { client } = raporIstemci([
      g({ date: '2026-03-01' }, 'INCOME', true, '1000.00'),
      g({ date: '2026-03-02' }, 'INCOME', false, '500.00'),
      g({ date: '2026-03-03' }, 'EXPENSE', true, '200.00'),
      g({ date: '2026-03-04' }, 'EXPENSE', false, '100.00'),
    ]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.net.cash).toBe('800.00'); // 1000 − 200
    expect(r.net.accrual).toBe('1200.00'); // 1500 − 300
    // Yanlış eşleşmeler:
    expect(r.net.cash).not.toBe('1300.00'); // invoiced − paid
    expect(r.net.accrual).not.toBe('900.00'); // collected − incurred
  });

  it('⚠️ ÇIPLAK bir `net` alanı YOK — isim esası söylemek zorunda', async () => {
    const { client } = raporIstemci([]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(Object.keys(r.net).sort()).toEqual(['accrual', 'cash']);
    expect(r).not.toHaveProperty('income.total');
    // "gelir" diye tek bir alan yok — kararın kendisi bu.
    expect(Object.keys(r.income).sort()).toEqual(['collected', 'invoiced']);
  });

  it('net NEGATİF olabilir — kırpılmıyor', async () => {
    const { client } = raporIstemci([g({ date: '2026-03-01' }, 'EXPENSE', true, '500.00')]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.net.cash).toBe('-500.00');
  });

  it('hareketsiz ay SIFIRLARLA döner, `transactionCount` 0', async () => {
    const { client } = raporIstemci([]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.income).toEqual({ collected: '0.00', invoiced: '0.00' });
    expect(r.expense).toEqual({ paid: '0.00', incurred: '0.00' });
    expect(r.transactionCount).toBe(0);
  });

  it('`_sum` NULL gelirse `0.00` sayılıyor — `NaN` ya da çökme yok', async () => {
    /*
     * `baseAmount` NOT NULL olduğu için Prisma'nın `_sum`ı pratikte null
     * dönmüyor; dal savunma. Null bir toplamı dizeye zorlamak `"null"` ya da
     * `NaN` üretirdi ve o değer `sumMoney`de fırlatırdı.
     */
    const { client } = raporIstemci([
      {
        date: gun('2026-03-01'),
        type: 'INCOME',
        isPaid: true,
        _sum: { baseAmount: null },
        _count: 1,
      },
    ]);
    const r = await fetchMonthlyReport(2026, 3, client);

    expect(r.income.collected).toBe('0.00');
    expect(r.transactionCount).toBe(1);
  });

  it('`_count` toplanıyor', async () => {
    const { client } = raporIstemci([
      g({ date: '2026-03-01' }, 'INCOME', true, '10.00', 3),
      g({ date: '2026-03-02' }, 'EXPENSE', true, '5.00', 2),
    ]);
    expect((await fetchMonthlyReport(2026, 3, client)).transactionCount).toBe(5);
  });
});

/* ===========================================================================
 * YILLIK
 * ======================================================================== */

describe('fetchYearlyReport', () => {
  it('ON İKİ ay HER ZAMAN dönüyor — hareketsiz aylar sıfırlarla', async () => {
    /*
     * Eksik ay döndürmek, grafiği çizecek arayüzü boşlukları doldurmaya
     * zorlar; biri atladığında şubat ile nisan yan yana çizilir.
     */
    const { client } = raporIstemci([g({ date: '2026-03-10' }, 'INCOME', true, '100.00')]);
    const r = await fetchYearlyReport(2026, client);

    expect(r.months).toHaveLength(12);
    expect(r.months.map((m) => m.period)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    expect(r.months[0]?.income.collected).toBe('0.00');
    expect(r.months[2]?.income.collected).toBe('100.00');
  });

  it('TEK SORGU — aya göre gruplama JS`te katlanıyor (ham SQL yok)', async () => {
    const { client, groupBy } = raporIstemci([]);
    await fetchYearlyReport(2026, client);

    expect(groupBy).toHaveBeenCalledOnce();
    expect(groupBy.mock.calls[0]?.[0].by).toEqual(['date', 'type', 'isPaid']);
  });

  it('yıl aralığı 1 Ocak – 31 Aralık', async () => {
    const { client, groupBy } = raporIstemci([]);
    await fetchYearlyReport(2026, client);
    const where = groupBy.mock.calls[0]?.[0].where as { date: { gte: Date; lte: Date } };

    expect(where.date.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('aylar doğru kovaya düşüyor ve YIL TOPLAMI hepsini içeriyor', async () => {
    const { client } = raporIstemci([
      g({ date: '2026-01-31' }, 'INCOME', true, '100.00'),
      g({ date: '2026-02-01' }, 'INCOME', true, '200.00'),
      g({ date: '2026-12-31' }, 'INCOME', true, '300.00'),
    ]);
    const r = await fetchYearlyReport(2026, client);

    expect(r.months[0]?.income.collected).toBe('100.00');
    expect(r.months[1]?.income.collected).toBe('200.00');
    expect(r.months[11]?.income.collected).toBe('300.00');
    expect(r.income.collected).toBe('600.00');
  });

  it('her ayın NETİ de kuruluyor — yalnızca yıl toplamının değil', async () => {
    const { client } = raporIstemci([
      g({ date: '2026-05-01' }, 'INCOME', true, '100.00'),
      g({ date: '2026-05-02' }, 'EXPENSE', true, '40.00'),
    ]);
    const r = await fetchYearlyReport(2026, client);

    expect(r.months[4]?.net.cash).toBe('60.00');
    expect(r.net.cash).toBe('60.00');
  });

  it('YIL DIŞI bir grup satırı YOKSAYILIYOR — yanlış kovaya düşmüyor', async () => {
    /*
     * `where` yıl aralığını sınırlandırdığı için gerçek sorguda olamaz; ama
     * savunma dalı ölçülüyor. Yoksayılmak yerine `aylar.get(13)` gibi bir
     * `undefined`a yazılsaydı satır sessizce KAYBOLUR ve yıl toplamı ile
     * ayların toplamı birbirini tutmazdı — fark edilmesi en zor hata sınıfı.
     */
    const { client } = raporIstemci([
      g({ date: '2026-06-15' }, 'INCOME', true, '100.00'),
      g({ date: '2027-01-05' }, 'INCOME', true, '999.00'), // yıl dışı
    ]);
    const r = await fetchYearlyReport(2026, client);

    expect(r.months[5]?.income.collected).toBe('100.00');
    // Yıl dışı satır hiçbir ayda görünmüyor.
    expect(r.months.map((m) => m.income.collected).filter((v) => v !== '0.00')).toEqual(['100.00']);
    // ⚠️ VE YIL TOPLAMINA DA GİRMİYOR: "ayların toplamı = yıl toplamı"
    // değişmezi korunuyor. Satır ya ikisine girer ya hiçbirine.
    expect(r.income.collected).toBe('100.00');
  });

  it('⚠️ DEĞİŞMEZ: ayların toplamı = yıl toplamı', async () => {
    /*
     * Raporu okuyan kişinin güvendiği şey bu. Tutmadığı gün farkı veride arar
     * ve bulamaz — çünkü fark katlamada.
     */
    const { client } = raporIstemci([
      g({ date: '2026-01-15' }, 'INCOME', true, '100.00'),
      g({ date: '2026-01-20' }, 'INCOME', false, '50.00'),
      g({ date: '2026-07-01' }, 'EXPENSE', true, '30.00'),
      g({ date: '2026-12-31' }, 'EXPENSE', false, '20.00'),
    ]);
    const r = await fetchYearlyReport(2026, client);

    const topla = (al: (m: (typeof r.months)[number]) => string) =>
      r.months.reduce((a, m) => a + Number(al(m)), 0).toFixed(2);

    expect(topla((m) => m.income.collected)).toBe(r.income.collected);
    expect(topla((m) => m.income.invoiced)).toBe(r.income.invoiced);
    expect(topla((m) => m.expense.paid)).toBe(r.expense.paid);
    expect(topla((m) => m.expense.incurred)).toBe(r.expense.incurred);
    expect(r.transactionCount).toBe(4);
  });

  it('`period` yıllık anahtar', async () => {
    const { client } = raporIstemci([]);
    const r = await fetchYearlyReport(2026, client);

    expect(r.period).toBe('2026');
    expect(isValidPeriodKey(r.period)).toBe(true);
  });
});

/* ===========================================================================
 * ⚠️⚠️ KATEGORİ DAĞILIMI — `Transaction.type` ÜZERİNDEN
 * ======================================================================== */

describe('⚠️ kategori dağılımı İŞLEMİN türüne göre', () => {
  const ARALIK = { from: '2026-03-01', to: '2026-03-31' } as const;

  it('⚠️ KATEGORİ TÜRÜ DEĞİŞMİŞSE işlemler KENDİ türlerinde kalıyor', async () => {
    /*
     * KARTIN EN PAHALI HATA SINIFI. Kategori "Yazılım" GİDER'e çevrilmiş ama
     * altında eski GELİR işlemleri var — `updateTransactionCategory` tür
     * değişimine izin veriyor (T-101) ve `Transaction.type` bağımsız bir sütun.
     *
     * Dağılım kategorinin türüne göre hesaplanırsa o gelir işlemleri GİDER
     * sayılır: toplamlar yine tutar, yalnızca yanlış kümede — sessiz ve
     * gelir tablosunu bozan bir hata.
     */
    const { client } = kategoriIstemci(
      [
        g({ categoryId: 'cat_1' }, 'INCOME', true, '1000.00'),
        g({ categoryId: 'cat_1' }, 'EXPENSE', true, '300.00'),
      ],
      [{ id: 'cat_1', name: 'Yazılım', type: 'EXPENSE' }],
    );

    const satirlar = await fetchCategoryBreakdown(ARALIK, client);

    // Kategori BİR, satır İKİ — işlemin türü gruplama anahtarı.
    expect(satirlar).toHaveLength(2);

    const gelir = satirlar.find((s) => s.type === 'INCOME');
    const gider = satirlar.find((s) => s.type === 'EXPENSE');

    expect(gelir?.invoiced).toBe('1000.00');
    expect(gider?.invoiced).toBe('300.00');

    // Kategorinin KENDİ türü ayrıca taşınıyor ve UYUŞMAZLIK işaretli.
    expect(gelir?.categoryType).toBe('EXPENSE');
    expect(gelir?.typeMismatch).toBe(true);
    expect(gider?.typeMismatch).toBe(false);
  });

  it('gruplama anahtarı `categoryId` + `type` — kategori türü sorguya GİRMİYOR', async () => {
    const { client, groupBy } = kategoriIstemci([], []);
    await fetchCategoryBreakdown(ARALIK, client);

    expect(groupBy.mock.calls[0]?.[0].by).toEqual(['categoryId', 'type', 'isPaid']);
    // `category: { type: … }` gibi bir süzgeç ya da gruplama YOK.
    expect(JSON.stringify(groupBy.mock.calls[0]?.[0])).not.toContain('categoryType');
  });

  it('uyuşan kategoride `typeMismatch` false', async () => {
    const { client } = kategoriIstemci(
      [g({ categoryId: 'cat_1' }, 'INCOME', true, '100.00')],
      [{ id: 'cat_1', name: 'Proje Geliri', type: 'INCOME' }],
    );

    const satirlar = await fetchCategoryBreakdown(ARALIK, client);
    expect(satirlar[0]?.typeMismatch).toBe(false);
    expect(satirlar[0]?.categoryName).toBe('Proje Geliri');
  });

  it('`isPaid` satır İÇİNDE katlanıyor — collected / invoiced', async () => {
    const { client } = kategoriIstemci(
      [
        g({ categoryId: 'cat_1' }, 'INCOME', true, '400.00'),
        g({ categoryId: 'cat_1' }, 'INCOME', false, '600.00'),
      ],
      [{ id: 'cat_1', name: 'Proje Geliri', type: 'INCOME' }],
    );

    const satirlar = await fetchCategoryBreakdown(ARALIK, client);
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0]?.collected).toBe('400.00');
    expect(satirlar[0]?.invoiced).toBe('1000.00');
    expect(satirlar[0]?.transactionCount).toBe(2);
  });

  it('TUTARA göre azalan sıralı, eşitlikte ADA göre', async () => {
    const { client } = kategoriIstemci(
      [
        g({ categoryId: 'c_b' }, 'EXPENSE', true, '100.00'),
        g({ categoryId: 'c_a' }, 'EXPENSE', true, '100.00'),
        g({ categoryId: 'c_c' }, 'EXPENSE', true, '900.00'),
      ],
      [
        { id: 'c_a', name: 'Abonelik', type: 'EXPENSE' },
        { id: 'c_b', name: 'Baskı', type: 'EXPENSE' },
        { id: 'c_c', name: 'Taşeron', type: 'EXPENSE' },
      ],
    );

    const satirlar = await fetchCategoryBreakdown(ARALIK, client);
    // Sıra Postgres'in döndürme sırasına kalmıyor.
    expect(satirlar.map((s) => s.categoryName)).toEqual(['Taşeron', 'Abonelik', 'Baskı']);
  });

  it('boş dönem — kategori sorgusu HİÇ açılmıyor', async () => {
    const { client, findMany } = kategoriIstemci([], []);
    expect(await fetchCategoryBreakdown(ARALIK, client)).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('kategori adı bulunamazsa SESSİZ `undefined` basmıyor', async () => {
    // FK `Restrict` olduğu için pratikte erişilemez; yine de açık davranış.
    const { client } = kategoriIstemci([g({ categoryId: 'yok' }, 'INCOME', true, '1.00')], []);
    const satirlar = await fetchCategoryBreakdown(ARALIK, client);

    expect(satirlar[0]?.categoryName).toBe('(bilinmeyen kategori)');
    expect(satirlar[0]?.typeMismatch).toBe(false);
  });
});

/* ===========================================================================
 * TOPLAM ALACAK
 * ======================================================================== */

describe('fetchOutstandingSummary', () => {
  function alacakIstemci(
    isler: { id: string; baseAmount: string | null }[],
    gruplar: { jobId: string; type: 'INCOME' | 'EXPENSE'; isPaid: boolean; tutar: string }[],
    iptalSayisi = 0,
  ) {
    // `fetchJobFinancials` da `job.findMany` çağırıyor; ikisi aynı şekli
    // istiyor, bu yüzden tek taklit yetiyor.
    const findMany = vi.fn().mockResolvedValue(
      isler.map((i) => ({
        id: i.id,
        baseAmount: i.baseAmount === null ? null : decimal(i.baseAmount),
      })),
    );
    const count = vi.fn().mockResolvedValue(iptalSayisi);
    const groupBy = vi.fn().mockResolvedValue(
      gruplar.map((x) => ({
        jobId: x.jobId,
        type: x.type,
        isPaid: x.isPaid,
        _sum: { baseAmount: decimal(x.tutar) },
        _count: 1,
      })),
    );

    const client = {
      job: { findMany, count },
      transaction: { groupBy },
    } as unknown as OutstandingClient & Parameters<typeof fetchOutstandingSummary>[0];

    return { client, findMany, count, groupBy };
  }

  it('kalanları topluyor — `fetchJobFinancials` KURALIYLA', async () => {
    const { client } = alacakIstemci(
      [
        { id: 'job_1', baseAmount: '1000.00' },
        { id: 'job_2', baseAmount: '500.00' },
      ],
      [{ jobId: 'job_1', type: 'INCOME', isPaid: true, tutar: '400.00' }],
    );

    const ozet = await fetchOutstandingSummary(client);

    expect(ozet.totalRemaining).toBe('1100.00'); // (1000−400) + 500
    expect(ozet.jobCount).toBe(2);
  });

  it('⚠️ GİDER alacağı AZALTMIYOR — işaret kararı buraya da taşınıyor', async () => {
    /*
     * Toplam kendi kuralını yazmıyor, `fetchJobFinancials`ı çağırıyor. Bu
     * yüzden işaret kararı tek yerde kalıyor ve ikisinin sapması imkânsız.
     */
    const { client } = alacakIstemci(
      [{ id: 'job_1', baseAmount: '1000.00' }],
      [
        { jobId: 'job_1', type: 'INCOME', isPaid: true, tutar: '1000.00' },
        { jobId: 'job_1', type: 'EXPENSE', isPaid: true, tutar: '300.00' },
      ],
    );

    expect((await fetchOutstandingSummary(client)).totalRemaining).toBe('0.00');
  });

  it('⚠️ tutarı BİLİNMEYEN iş toplamdan HARİÇ ve AYRICA sayılıyor', async () => {
    // Sıfır saymak toplamı doğru gösterirdi ama "bu işten ne bekliyorum"
    // sorusunu sessizce yok sayardı.
    const { client } = alacakIstemci(
      [
        { id: 'job_1', baseAmount: '1000.00' },
        { id: 'job_lead', baseAmount: null },
      ],
      [],
    );

    const ozet = await fetchOutstandingSummary(client);
    expect(ozet.totalRemaining).toBe('1000.00');
    expect(ozet.jobCount).toBe(1);
    expect(ozet.unknownAmountJobCount).toBe(1);
  });

  it('tutarı bilinmeyen işin BEKLEYEN faturası yine sayılıyor', async () => {
    // Kesilmiş bir fatura, anlaşma tutarı bilinmese de vardır.
    const { client } = alacakIstemci(
      [{ id: 'job_lead', baseAmount: null }],
      [{ jobId: 'job_lead', type: 'INCOME', isPaid: false, tutar: '250.00' }],
    );

    const ozet = await fetchOutstandingSummary(client);
    expect(ozet.totalPending).toBe('250.00');
    expect(ozet.totalRemaining).toBe('0.00');
    expect(ozet.unknownAmountJobCount).toBe(1);
  });

  it('⚠️ İPTAL EDİLMİŞ işler HARİÇ — ve kaç tanesi olduğu DÖNÜYOR', async () => {
    const { client, findMany, count } = alacakIstemci(
      [{ id: 'job_1', baseAmount: '1000.00' }],
      [],
      4,
    );

    const ozet = await fetchOutstandingSummary(client);

    expect(ozet.cancelledJobCount).toBe(4);
    // Sorgu iptalleri DIŞLIYOR.
    expect(findMany.mock.calls[0]?.[0].where).toEqual({ status: { not: 'CANCELLED' } });
    expect(count.mock.calls[0]?.[0].where).toEqual({ status: 'CANCELLED' });
  });

  it('hiç iş yoksa sıfırlar — `fetchJobFinancials` çağrılmıyor', async () => {
    const { client, groupBy } = alacakIstemci([], [], 2);
    const ozet = await fetchOutstandingSummary(client);

    expect(ozet).toEqual({
      totalRemaining: '0.00',
      totalPending: '0.00',
      jobCount: 0,
      unknownAmountJobCount: 0,
      cancelledJobCount: 2,
    });
    expect(groupBy).not.toHaveBeenCalled();
  });

  it('DTO`da `Decimal` kaçağı YOK', async () => {
    /*
     * ⚠️ BU İDDİAYI GÜVENLİK`İN KAPISI BULDURDU: `decimal-yuzey-sayimi.test.ts`
     * "her `Decimal` DTO yüzeyi ölçülüyor" diyor ve `fetchOutstandingSummary`
     * için bir `decimalKalanlar` iddiam yoktu — aylık/yıllık/kategori için
     * vardı, bu yüzey atlanmıştı. Kapı haklıydı: bu fonksiyon `Job.baseAmount`
     * okuyor, yani gerçek bir `Decimal` yüzeyi.
     */
    const { client } = alacakIstemci(
      [{ id: 'job_1', baseAmount: '1000.00' }],
      [{ jobId: 'job_1', type: 'INCOME', isPaid: true, tutar: '400.00' }],
    );

    expect(decimalKalanlar(await fetchOutstandingSummary(client))).toEqual([]);
  });

  it('bekleyen fatura kalanın İÇİNDE — iki kez sayılmıyor', async () => {
    const { client } = alacakIstemci(
      [{ id: 'job_1', baseAmount: '1000.00' }],
      [
        { jobId: 'job_1', type: 'INCOME', isPaid: true, tutar: '400.00' },
        { jobId: 'job_1', type: 'INCOME', isPaid: false, tutar: '600.00' },
      ],
    );

    const ozet = await fetchOutstandingSummary(client);
    expect(ozet.totalRemaining).toBe('600.00'); // 1000 − 400 (tahsil)
    expect(ozet.totalPending).toBe('600.00'); // kalanın İÇİNDE
  });
});

/* ===========================================================================
 * DTO SINIRI
 * ======================================================================== */

describe('rapor DTO sınırı', () => {
  it('dedektör ÇALIŞIYOR — vakum değil', () => {
    expect(dedektorCalisiyor()).toEqual([['a.b'], []]);
  });

  it('üç raporda da `Decimal` kaçağı YOK', async () => {
    const { client } = raporIstemci([g({ date: '2026-03-01' }, 'INCOME', true, '1.00')]);
    expect(decimalKalanlar(await fetchMonthlyReport(2026, 3, client))).toEqual([]);
    expect(decimalKalanlar(await fetchYearlyReport(2026, client))).toEqual([]);

    const { client: kc } = kategoriIstemci(
      [g({ categoryId: 'c' }, 'INCOME', true, '1.00')],
      [{ id: 'c', name: 'X', type: 'INCOME' }],
    );
    expect(
      decimalKalanlar(await fetchCategoryBreakdown({ from: '2026-03-01', to: '2026-03-31' }, kc)),
    ).toEqual([]);
  });

  it('bütün tutarlar `string` ve iki ondalıklı', async () => {
    const { client } = raporIstemci([g({ date: '2026-03-01' }, 'INCOME', true, '1234.5')]);
    const r = await fetchMonthlyReport(2026, 3, client);

    for (const deger of [r.income.collected, r.income.invoiced, r.net.cash, r.net.accrual]) {
      expect(typeof deger).toBe('string');
      expect(deger).toMatch(/^-?\d+\.\d{2}$/);
    }
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

  const RAPOR = kod('src/server/services/report.ts');

  it('tarama vakum değil', () => {
    expect(RAPOR).toContain('fetchMonthlyReport');
    expect(RAPOR).toContain('appMonthRange');
  });

  it('ÖNBELLEKLENMİYOR', () => {
    expect(RAPOR).not.toContain('next/cache');
    expect(RAPOR).not.toContain('cachedRead');
    expect(RAPOR).not.toContain('unstable_cache');
  });

  it('⚠️ HAM SQL YOK (§8.10)', () => {
    /*
     * "Aya göre grupla" `date_trunc` gerektirirdi; yerine gün bazında
     * gruplanıp JS'te katlanıyor. Ham SQL güvenlik onayına bağlı.
     */
    expect(RAPOR).not.toContain('$queryRaw');
    expect(RAPOR).not.toContain('$executeRaw');
    expect(RAPOR).not.toContain('date_trunc');
  });

  it('⚠️ `appDayStartInstant` KULLANILMIYOR — `date` sütunu için yanlış', () => {
    // Ölçüm dosya başında. Kullanılırsa ay bir gün geriye kayar.
    expect(RAPOR).not.toContain('appDayStartInstant');
    expect(RAPOR).not.toContain('appDayRangeToInstantFilter');
    expect(RAPOR).toContain('appDayToDate');
  });

  it('⚠️ ÖLÇEKLİ ARİTMETİK YOK — para `money.ts` üzerinden', () => {
    // BULGU-024 sonrası biçim kapısı istisnasız; rapor da `BigInt` yazmıyor.
    expect(RAPOR).not.toMatch(/\bBigInt\s*\(/);
    expect(RAPOR).toContain('sumMoney');
    expect(RAPOR).toContain('subtractMoney');
  });

  it('⚠️ ALACAK TOPLAMI `fetchJobFinancials`ı ÇAĞIRIYOR — kuralı kopyalamıyor', () => {
    /*
     * İşaret kararı tek yerde kalsın: ikinci bir kopya biri düzeltilip diğeri
     * kaldığında sapar. Toplam bir FOLD.
     */
    expect(RAPOR).toContain('fetchJobFinancials');
    expect(RAPOR).not.toMatch(/type\s*===\s*'INCOME'[\s\S]{0,400}remaining/);
  });

  it('`fetchX` adlandırması — `getX` YOK (T-040 kuralı)', () => {
    expect(RAPOR).not.toMatch(/export\s+async\s+function\s+get[A-Z]/);
    expect(RAPOR).toMatch(/export\s+async\s+function\s+fetchMonthlyReport/);
  });

  it('`periodKey` elle kurulmuyor — `buildPeriodKey` üzerinden', () => {
    expect(RAPOR).toContain('buildPeriodKey');
    // `${year}-${month}` gibi elle bir dönem anahtarı YOK.
    expect(RAPOR).not.toMatch(/period:\s*`\$\{/);
  });
});
