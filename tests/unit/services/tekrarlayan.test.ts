import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { addAppMonths, addAppYears } from '@/server/services/_shared/app-date';
import {
  CATCHUP_LIMIT,
  fetchDueRecurringSummary,
  processDueRecurringTransactions,
  recurrenceOccurrences,
  type RecurringClient,
} from '@/server/services/recurring-transaction';

import { decimal, decimalKalanlar } from '../_helpers/decimal-kacak';

/**
 * TEKRARLAYAN İŞLEM ÜRETİMİ — ADR-040, T-109b.
 *
 * ⚠️ BU DOSYANIN İKİ EN ÖNEMLİ BLOĞU:
 *   1. "YAKALAMA" — kullanıcı üç ay basmazsa ÜÇ kayıt doğar, biri değil.
 *      Abonelik üç kez çekildi; tek kayıt Ağustos ve Eylül raporlarını eksik
 *      gösterirdi.
 *   2. "İDEMPOTANSLIK" — düğmeye iki kez basmak ikinci kayıt üretmemeli.
 *      Elle tetiklemeyi güvenli kılan tek şey bu (cron'da bir kereliktir).
 */

const KOK = resolve(__dirname, '../../..');

/** `@db.Date` Prisma'da UTC gece yarısı olarak okunuyor. */
const gun = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

function sablon(ek: Record<string, unknown> = {}) {
  return {
    id: 'rec_1',
    type: 'EXPENSE' as const,
    amount: decimal('890'),
    currency: 'TRY' as const,
    categoryId: 'cat_1',
    description: 'Yazılım aboneliği',
    method: 'BANK_TRANSFER' as const,
    recurrenceRule: 'MONTHLY',
    startDate: gun('2026-01-15'),
    endDate: null,
    nextRunAt: null,
    isActive: true,
    ...ek,
  };
}

function istemci(sablonlar: unknown[] = [sablon()], uretilmisAnahtarlar: (string | null)[] = []) {
  const findMany = vi.fn().mockResolvedValue(sablonlar);
  const update = vi.fn().mockResolvedValue(undefined);
  const trxFindMany = vi
    .fn()
    .mockResolvedValue(uretilmisAnahtarlar.map((periodKey) => ({ periodKey })));
  const createMany = vi
    .fn()
    .mockImplementation((args: { data: unknown[] }) =>
      Promise.resolve({ count: args.data.length }),
    );

  const client = {
    recurringTransaction: { findMany, update },
    transaction: { findMany: trxFindMany, createMany },
  } as unknown as RecurringClient;

  return { client, findMany, update, trxFindMany, createMany };
}

/* ===========================================================================
 * ⚠️⚠️ YAKALAMA — gecikmiş dönemlerin HEPSİ
 * ======================================================================== */

describe('⚠️ yakalama: gecikmiş dönemlerin HEPSİ üretiliyor', () => {
  it('üç ay basılmazsa ÜÇ kayıt — biri değil', async () => {
    /*
     * ADR-040'ın bilerek açık bıraktığı nokta. Cevap: abonelik üç kez çekildi.
     * Tek kayıt üretmek Ağustos ve Eylül'ün aylık raporlarını EKSİK gösterirdi
     * — T-102'de "sessizce yanlış toplam" dediğim sınıf.
     */
    const { client, createMany } = istemci([
      sablon({ startDate: gun('2026-01-15'), recurrenceRule: 'MONTHLY' }),
    ]);

    await processDueRecurringTransactions(new Date('2026-03-20T10:00:00.000Z'), client);

    const yazilan = createMany.mock.calls[0]?.[0].data as { periodKey: string; date: Date }[];
    expect(yazilan.map((r) => r.periodKey)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('⚠️ ÇAPA `startDate` — adım adım ilerletme GÜN KAYDIRIYOR', async () => {
    /*
     * ÖLÇÜLDÜ (T-109b):
     *   adım adım : 2026-01-31 → 02-28 → 03-28 → 04-28   ← 28'ine SAPLANDI
     *   çapalı    : 2026-01-31 → 02-28 → 03-31 → 04-30   ← ay sonuna dönüyor
     * Ayın sonunda çekilen bir kira şubattan sonra 28'inde kalmamalı.
     */
    const { client, createMany } = istemci([
      sablon({ startDate: gun('2026-01-31'), recurrenceRule: 'MONTHLY' }),
    ]);

    await processDueRecurringTransactions(new Date('2026-04-30T10:00:00.000Z'), client);

    const tarihler = (createMany.mock.calls[0]?.[0].data as { date: Date }[]).map((r) =>
      r.date.toISOString().slice(0, 10),
    );
    expect(tarihler).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('üst sınır uygulanıyor ve KALAN sayısı dönüyor', async () => {
    // Beş yıl dokunulmamış bir DAILY şablon tek basışta binlerce kayıt
    // üretmesin; kullanıcı tekrar basarak bitirir ve ne kaldığını görür.
    const { client, createMany } = istemci([
      sablon({ startDate: gun('2026-01-01'), recurrenceRule: 'DAILY' }),
    ]);

    const sonuc = await processDueRecurringTransactions(
      new Date('2027-01-01T10:00:00.000Z'),
      client,
    );

    expect((createMany.mock.calls[0]?.[0].data as unknown[]).length).toBe(CATCHUP_LIMIT);
    expect(sonuc.remainingPeriodCount).toBeGreaterThan(0);
  });

  it('`endDate` geçmişse ÖTESİNDE kayıt üretilmiyor', async () => {
    // Bitmiş bir yükümlülük için kayıt açmak defteri bozardı.
    const { client, createMany } = istemci([
      sablon({ startDate: gun('2026-01-15'), endDate: gun('2026-02-20') }),
    ]);

    await processDueRecurringTransactions(new Date('2026-06-01T10:00:00.000Z'), client);

    const yazilan = createMany.mock.calls[0]?.[0].data as { periodKey: string }[];
    expect(yazilan.map((r) => r.periodKey)).toEqual(['2026-01', '2026-02']);
  });

  it('dört sıklık da doğru adımlıyor', () => {
    const t = (rule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY', through: string) =>
      recurrenceOccurrences(rule, '2026-01-01', through).days;

    expect(t('DAILY', '2026-01-04')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
    expect(t('WEEKLY', '2026-01-20')).toEqual(['2026-01-01', '2026-01-08', '2026-01-15']);
    expect(t('MONTHLY', '2026-03-05')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(t('YEARLY', '2028-06-01')).toEqual(['2026-01-01', '2027-01-01', '2028-01-01']);
  });

  it('başlangıç GELECEKTEyse hiç oluşum yok', () => {
    expect(recurrenceOccurrences('MONTHLY', '2027-01-01', '2026-06-01').days).toEqual([]);
  });
});

/* ===========================================================================
 * ⚠️⚠️ İDEMPOTANSLIK — elle tetiklemeyi güvenli kılan şey
 * ======================================================================== */

describe('⚠️ idempotanslık: düğmeye İKİ KEZ basmak', () => {
  it('üretilmiş dönemler ÇIKARILIYOR — ikinci basış sıfır kayıt', async () => {
    const { client, createMany } = istemci(
      [sablon({ startDate: gun('2026-01-15') })],
      ['2026-01', '2026-02', '2026-03'], // zaten üretilmiş
    );

    const sonuc = await processDueRecurringTransactions(
      new Date('2026-03-20T10:00:00.000Z'),
      client,
    );

    // Yazma HİÇ denenmiyor: üretilecek eksik dönem yok.
    expect(createMany).not.toHaveBeenCalled();
    expect(sonuc.createdCount).toBe(0);
  });

  it('KISMİ üretilmişse yalnızca EKSİKLER yazılıyor', async () => {
    const { client, createMany } = istemci(
      [sablon({ startDate: gun('2026-01-15') })],
      ['2026-01'], // yalnızca ocak üretilmiş
    );

    await processDueRecurringTransactions(new Date('2026-03-20T10:00:00.000Z'), client);

    const yazilan = createMany.mock.calls[0]?.[0].data as { periodKey: string }[];
    expect(yazilan.map((r) => r.periodKey)).toEqual(['2026-02', '2026-03']);
  });

  it('⚠️ `skipDuplicates` KULLANILIYOR — yarışta FIRLATMIYOR', async () => {
    /*
     * Çıkarma bir OPTİMİZASYON; gerçek güvence `@@unique([sourceRecurringId,
     * periodKey])`. İki eşzamanlı basış arasındaki yarışı yalnızca o kapatır
     * (T-038'in çift dönüşüm gerekçesinin aynısı) ve `skipDuplicates` o
     * reddi HATAYA çevirmiyor.
     */
    const { client, createMany } = istemci([sablon()], []);
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    expect(createMany.mock.calls[0]?.[0].skipDuplicates).toBe(true);
  });

  it('kısıt reddederse `skippedDuplicateCount` ARTIYOR, hata DÖNMÜYOR', async () => {
    // `createMany` 3 satır alıp 1 yazdı → 2'si kısıta takıldı.
    const { client, createMany } = istemci([sablon({ startDate: gun('2026-01-15') })], []);
    createMany.mockResolvedValue({ count: 1 });

    const sonuc = await processDueRecurringTransactions(
      new Date('2026-03-20T10:00:00.000Z'),
      client,
    );

    expect(sonuc.createdCount).toBe(1);
    // Sıfırdan farklı olması bir HATA değil, idempotanslığın çalıştığının kanıtı.
    expect(sonuc.skippedDuplicateCount).toBe(2);
  });
});

/* ===========================================================================
 * ⚠️ `nextRunAt` — null dalı ve ilerletme
 * ======================================================================== */

describe('nextRunAt', () => {
  it('⚠️ `null` dalı ŞART — yoksa yeni şablon HİÇ üretmez', async () => {
    /*
     * Yeni açılmış şablonun `nextRunAt`i `null` (şema: "üretim işi yönetir").
     * `{ nextRunAt: { lte: now } }` PostgreSQL'de NULL'ları DIŞLAR — yani yeni
     * açılan her şablon sessizce hiç üretmezdi ve özellik tamamen işlevsiz
     * olurdu.
     */
    const { client, findMany } = istemci();
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    const where = findMany.mock.calls[0]?.[0].where as { OR: unknown[]; isActive: boolean };
    expect(where.isActive).toBe(true);
    expect(where.OR).toEqual([{ nextRunAt: null }, { nextRunAt: { lte: expect.any(Date) } }]);
  });

  it('BUGÜNDEN SONRAKİ ilk oluşuma ilerletiliyor', async () => {
    const { client, update } = istemci([sablon({ startDate: gun('2026-01-15') })]);
    await processDueRecurringTransactions(new Date('2026-03-20T10:00:00.000Z'), client);

    const data = update.mock.calls[0]?.[0].data as { nextRunAt: Date | null };
    expect(data.nextRunAt?.toISOString().slice(0, 10)).toBe('2026-04-15');
  });

  it('şablon BİTMİŞSE `null` yazılıyor — bir daha ele alınmasın', async () => {
    const { client, update } = istemci([
      sablon({ startDate: gun('2026-01-15'), endDate: gun('2026-02-20') }),
    ]);
    await processDueRecurringTransactions(new Date('2026-06-01T10:00:00.000Z'), client);

    expect((update.mock.calls[0]?.[0].data as { nextRunAt: Date | null }).nextRunAt).toBeNull();
  });

  it('kayıt üretilmediyse `lastGeneratedAt` YAZILMIYOR', async () => {
    const { client, update } = istemci([sablon()], ['2026-01', '2026-02']);
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    expect('lastGeneratedAt' in (update.mock.calls[0]?.[0].data as object)).toBe(false);
  });

  it('kayıt üretildiyse `lastGeneratedAt` yazılıyor', async () => {
    const simdi = new Date('2026-02-20T10:00:00.000Z');
    const { client, update } = istemci([sablon()]);
    await processDueRecurringTransactions(simdi, client);

    expect((update.mock.calls[0]?.[0].data as { lastGeneratedAt?: Date }).lastGeneratedAt).toEqual(
      simdi,
    );
  });
});

/* ===========================================================================
 * ⚠️ ATLAMALAR — sessiz değil
 * ======================================================================== */

describe('⚠️ atlamalar SEBEBİYLE raporlanıyor', () => {
  it('TRY DIŞI şablon atlanıyor — kur UYDURULMUYOR', async () => {
    /*
     * Şablon `fxRate` taşımıyor (ADR-015: "kur üretim anına aittir") ve bu
     * projede kur kaynağı YOK. `isFxRateConsistent` TRY dışında kurun 1.0
     * olamayacağını şart koşuyor, yani bir sayı uydurmak gerekirdi — bütün TRY
     * toplamlarını sessizce yanlış yapardı.
     */
    const { client, createMany } = istemci([sablon({ currency: 'USD' })]);
    const sonuc = await processDueRecurringTransactions(
      new Date('2026-02-20T10:00:00.000Z'),
      client,
    );

    expect(createMany).not.toHaveBeenCalled();
    expect(sonuc.skipped).toEqual([
      { id: 'rec_1', description: 'Yazılım aboneliği', reason: 'NON_TRY_CURRENCY' },
    ]);
    expect(sonuc.createdCount).toBe(0);
  });

  it('TANINMAYAN kural atlanıyor — sütun serbest `String`', async () => {
    // `recurrenceRule` şemada enum ama SÜTUN `String`; seed/migration/elle bir
    // yazma tanınmayan bir değer koyabilir.
    const { client } = istemci([sablon({ recurrenceRule: 'HOURLY' })]);
    const sonuc = await processDueRecurringTransactions(
      new Date('2026-02-20T10:00:00.000Z'),
      client,
    );

    expect(sonuc.skipped[0]?.reason).toBe('UNKNOWN_RULE');
  });

  it('⚠️ YIL SINIRI — `periodKey` çakışması riski durduruyor', () => {
    /*
     * ADR-040 bağlayıcı: `buildPeriodKey` dört basamaklı yıl varsayıyor ve yıl
     * 10000'in YEARLY anahtarı yıl 1000 ile ÇAKIŞIYOR. İdempotanslık o anahtara
     * dayandığı için bir dönemin kaydı BAŞKASININ ÜZERİNE yazılırdı.
     */
    const tarama = recurrenceOccurrences('YEARLY', '9998-01-01', '9999-12-31');
    expect(tarama.days).toEqual(['9998-01-01', '9999-01-01']);
    expect(tarama.yearLimitReached).toBe(true);
  });

  it('⚠️ BEŞ BASAMAKLI YIL — koruma KENDİ kusuruna düşmüyor', () => {
    /*
     * REGRESYON. İlk uygulamam `Number(gun.slice(0, 4)) > 9999` yazıyordu ve
     * ÇALIŞMIYORDU: `"10000-01-01".slice(0, 4)` = `"1000"`. Yani koruma, tam da
     * engellemeye çalıştığı kusuru (dört basamak varsayımı) kendi içinde
     * yeniden üretmişti.
     *
     * İkinci kusur aynı kökten: `"10000-01-01" > "9999-12-31"` SÖZLÜKSEL olarak
     * **false**, yani `gun > son` kontrolü de durdurmuyordu ve döngü üst sınıra
     * kadar koşuyordu (ölçüldü: 10117'ye kadar oluşum üretti).
     */
    const tarama = recurrenceOccurrences('YEARLY', '9998-01-01', '9999-12-31');

    expect(tarama.days).toEqual(['9998-01-01', '9999-01-01']);
    expect(tarama.yearLimitReached).toBe(true);
    // Hiçbir oluşum beş basamaklı yıla taşmadı.
    expect(tarama.days.every((g) => g.indexOf('-') === 4)).toBe(true);
  });

  it('atlanan şablon için `nextRunAt` DOKUNULMUYOR mu — hayır, ilerletiliyor', async () => {
    // Atlanan şablon döngüden `continue` ile çıkıyor, yani `update` hiç
    // çağrılmıyor: sebebi düzeltildiğinde (kullanıcı para birimini TRY yapar)
    // şablon yine gecikmiş görünür ve yakalama çalışır.
    const { client, update } = istemci([sablon({ currency: 'EUR' })]);
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    expect(update).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * ÜRETİLEN KAYIT — ADR-014 ve şema
 * ======================================================================== */

describe('üretilen kayıt', () => {
  it('⚠️ `baseAmount` TÜRETİLİYOR (ADR-014)', async () => {
    const { client, createMany } = istemci([sablon({ amount: decimal('890') })]);
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    const satir = (createMany.mock.calls[0]?.[0].data as Record<string, unknown>[])[0];
    expect(satir?.amount).toBe('890.00');
    expect(satir?.fxRate).toBe('1');
    // TRY'de kur 1, yani baseAmount = amount — ama hesap `computeBaseAmount`tan
    // geçiyor ki kural tek yerde kalsın.
    expect(satir?.baseAmount).toBe('890.00');
  });

  it('`sourceRecurringId` ve `periodKey` ÇİFTİ yazılıyor — tekilliğin iki yarısı', async () => {
    const { client, createMany } = istemci();
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    const satir = (createMany.mock.calls[0]?.[0].data as Record<string, unknown>[])[0];
    expect(satir?.sourceRecurringId).toBe('rec_1');
    expect(satir?.periodKey).toBe('2026-01');
  });

  it('şablonun alanları devralınıyor, `isPaid` TRUE', async () => {
    const { client, createMany } = istemci();
    await processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client);

    const satir = (createMany.mock.calls[0]?.[0].data as Record<string, unknown>[])[0];
    expect(satir?.type).toBe('EXPENSE');
    expect(satir?.categoryId).toBe('cat_1');
    expect(satir?.method).toBe('BANK_TRANSFER');
    expect(satir?.description).toBe('Yazılım aboneliği');
    expect(satir?.isPaid).toBe(true);
  });

  it('⚠️ ŞEMA DOĞRULAMASI gerçekten koşuyor — geçersiz girdi FIRLATIYOR', async () => {
    /*
     * `createGeneratedTransactionSchema` (T-011'de yazılmış, bugüne kadar hiç
     * tüketilmemişti) yolun içinde. Geçersiz bir kategori kimliği şemadan
     * geçemiyor — doğrudan Prisma'ya nesne vermek bu kontrolü atlardı.
     */
    const { client } = istemci([sablon({ categoryId: '' })]);

    await expect(
      processDueRecurringTransactions(new Date('2026-02-20T10:00:00.000Z'), client),
    ).rejects.toThrow();
  });
});

/* ===========================================================================
 * OKUMA — "kaç kalem bekliyor" (ADR-040)
 * ======================================================================== */

describe('fetchDueRecurringSummary', () => {
  it('ŞABLON ve DÖNEM sayısını ayrı veriyor', async () => {
    /*
     * ADR-040 "3 kalem bekliyor" istiyor; dönem sayısı ayrıca veriliyor çünkü
     * bir şablon beş ay geride olabilir ve kullanıcı tek basışın ne kadar kayıt
     * üreteceğini bilmeli.
     */
    const { client } = istemci([
      sablon({ id: 'rec_1', startDate: gun('2026-01-15') }),
      sablon({ id: 'rec_2', startDate: gun('2026-03-01') }),
    ]);

    const ozet = await fetchDueRecurringSummary(new Date('2026-03-20T10:00:00.000Z'), client);

    expect(ozet.dueCount).toBe(2);
    // rec_1: Oca+Şub+Mar = 3 · rec_2: Mar = 1
    expect(ozet.pendingPeriodCount).toBe(4);
    expect(ozet.items.map((i) => i.pendingPeriods)).toEqual([3, 1]);
  });

  it('ENGELLİ kalem sebebiyle görünüyor, dönem saymıyor', async () => {
    const { client } = istemci([sablon({ currency: 'USD' })]);
    const ozet = await fetchDueRecurringSummary(new Date('2026-03-20T10:00:00.000Z'), client);

    expect(ozet.items[0]?.blockedReason).toBe('NON_TRY_CURRENCY');
    expect(ozet.items[0]?.pendingPeriods).toBe(0);
    expect(ozet.pendingPeriodCount).toBe(0);
  });

  it('üretilmiş dönemler SAYIYA girmiyor', async () => {
    const { client } = istemci([sablon({ startDate: gun('2026-01-15') })], ['2026-01', '2026-02']);
    const ozet = await fetchDueRecurringSummary(new Date('2026-03-20T10:00:00.000Z'), client);

    expect(ozet.pendingPeriodCount).toBe(1);
  });

  it('bekleyen kalem yoksa sıfır', async () => {
    const { client } = istemci([]);
    const ozet = await fetchDueRecurringSummary(new Date('2026-03-20T10:00:00.000Z'), client);

    expect(ozet).toEqual({ dueCount: 0, pendingPeriodCount: 0, items: [] });
  });

  it('OKUMA YAZMIYOR — `createMany`/`update` çağrılmıyor', async () => {
    const { client, createMany, update } = istemci();
    await fetchDueRecurringSummary(new Date('2026-03-20T10:00:00.000Z'), client);

    expect(createMany).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('⚠️ iki DTO`da da `Decimal` kaçağı YOK', async () => {
    /*
     * Güvenlik'in `decimal-yuzey-sayimi` kapısı bu iki yüzeyi istedi (üçüncü
     * kez ötüyor: T-102 `fetchOutstandingSummary`, T-106
     * `fetchTransactionsForExport`, şimdi bunlar). Şablonun `amount`ı bir
     * `Decimal` ve iki fonksiyon da onu okuyor.
     */
    const { client } = istemci();
    const simdi = new Date('2026-02-20T10:00:00.000Z');

    expect(decimalKalanlar(await fetchDueRecurringSummary(simdi, client))).toEqual([]);
    expect(decimalKalanlar(await processDueRecurringTransactions(simdi, client))).toEqual([]);
  });
});

/* ===========================================================================
 * TAKVİM ARİTMETİĞİ — ölçülen tuzak
 * ======================================================================== */

describe('addAppMonths / addAppYears', () => {
  it('⚠️ AYIN SONUNA KIRPIYOR — `setUTCMonth` TAŞIRDI', () => {
    // Ölçüldü: `new Date('2026-01-31').setUTCMonth(1)` → 2026-03-03.
    expect(addAppMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addAppMonths('2028-01-31', 1)).toBe('2028-02-29'); // artık yıl
    expect(addAppMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addAppMonths('2026-12-31', 1)).toBe('2027-01-31'); // yıl sınırı
  });

  it('negatif miktar geriye gidiyor', () => {
    expect(addAppMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addAppYears('2026-03-01', -1)).toBe('2025-03-01');
  });

  it('29 Şubat + 1 yıl = 28 Şubat', () => {
    expect(addAppYears('2028-02-29', 1)).toBe('2029-02-28');
  });

  it('sıfır miktar değiştirmiyor', () => {
    expect(addAppMonths('2026-05-17', 0)).toBe('2026-05-17');
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

  const SERVIS = kod('src/server/services/recurring-transaction.ts');
  const EYLEM = kod('src/server/actions/recurring-transaction.ts');

  it('tarama vakum değil', () => {
    expect(SERVIS).toContain('processDueRecurringTransactions');
    expect(EYLEM).toContain('processRecurringAction');
  });

  it('⚠️ `createGeneratedTransactionSchema` TÜKETİLİYOR', () => {
    // T-011'de yazılmış ve T-109b'ye kadar hiç çağıranı yoktu.
    expect(SERVIS).toContain('createGeneratedTransactionSchema.parse');
  });

  it('ÖNBELLEKLENMİYOR', () => {
    expect(SERVIS).not.toContain('next/cache');
    expect(SERVIS).not.toContain('cachedRead');
  });

  it('⚠️ MANTIK SERVİSTE, eylemde DEĞİL — F7 cron`u aynı servisi çağırabilsin', () => {
    /*
     * ADR-040'ın sözü: "yeni kod değil, yeni bir tetikleyici". Eylem yalnızca
     * yetki + denetim kaydı ekliyor; oluşum hesabı ve yazma serviste.
     */
    expect(EYLEM).not.toContain('recurrenceOccurrences');
    expect(EYLEM).not.toContain('buildPeriodKey');
    expect(EYLEM).not.toContain('createMany');
    expect(EYLEM).toContain('processDueRecurringTransactions');
  });

  it('eylem `currentActorId` kapısından geçiyor (ADR-035/B)', () => {
    expect(EYLEM).toContain('currentActorId()');
    expect(EYLEM).toContain('unauthorized()');
  });

  it('⚠️ `revalidateTag` YOK — `Transaction` public`te görünmüyor', () => {
    expect(EYLEM).not.toContain('revalidateTag');
    expect(EYLEM).not.toContain('revalidatePath');
  });

  it('⚠️ ÖLÇEKLİ ARİTMETİK YOK — para `money.ts` üzerinden', () => {
    expect(SERVIS).not.toMatch(/\bBigInt\s*\(/);
    expect(SERVIS).toContain('computeBaseAmount');
  });

  it('denetim kaydı SAYILAR taşıyor, üretilen kayıtları TAŞIMIYOR', () => {
    expect(EYLEM).toContain('createdCount');
    expect(EYLEM).toContain('skippedDuplicateCount');
    // Tutar ya da açıklama diff'e girmiyor.
    expect(EYLEM).not.toMatch(/diff:[\s\S]{0,400}amount/);
  });
});
