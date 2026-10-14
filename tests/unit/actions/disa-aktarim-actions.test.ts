import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * CSV DIŞA AKTARIM + TEKRARLAYAN İŞLEM EYLEMLERİ — T-109b.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "YETKİ": iki eylem de `'use server'`
 * dosyasından ihraç ediliyor, yani AĞDAN ÇAĞRILABİLİR POST uçları. Dışa
 * aktarım özellikle: ele geçirilmiş bir oturumun yapabileceği en zararlı şey
 * bütün muhasebe defterini tek dosyada dışarı almaktır.
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { dbMock } = vi.hoisted(() => {
  const dec = (v: string) => ({ toFixed: (n = 2) => Number(v).toFixed(n) });

  const islem = {
    id: 'trx_1',
    type: 'INCOME',
    amount: dec('2500'),
    currency: 'USD',
    fxRate: dec('34.25'),
    baseAmount: dec('85625'),
    date: new Date('2026-03-10T00:00:00.000Z'),
    categoryId: 'cat_1',
    jobId: null,
    clientId: null,
    method: 'BANK_TRANSFER',
    isPaid: true,
    paidAt: null,
    invoiceNo: 'FTR-001',
    sourceRecurringId: null,
    createdAt: new Date('2026-03-10T09:00:00.000Z'),
    updatedAt: new Date('2026-03-11T09:00:00.000Z'),
    description: 'Birinci taksit',
    category: { name: 'Proje Geliri' },
    job: null,
    client: { name: 'Kıyı Medya' },
  };

  const sablon = {
    id: 'rec_1',
    type: 'EXPENSE',
    amount: dec('890'),
    currency: 'TRY',
    categoryId: 'cat_1',
    description: 'Yazılım aboneliği',
    method: 'BANK_TRANSFER',
    recurrenceRule: 'MONTHLY',
    startDate: new Date('2026-01-15T00:00:00.000Z'),
    endDate: null,
    nextRunAt: null,
    isActive: true,
  };

  return {
    dbMock: {
      transaction: {
        findMany: vi.fn().mockResolvedValue([islem]),
        groupBy: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      transactionCategory: { findMany: vi.fn().mockResolvedValue([]) },
      recurringTransaction: {
        findMany: vi.fn().mockResolvedValue([sablon]),
        update: vi.fn().mockResolvedValue(undefined),
      },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { exportCsvAction } = await import('@/server/actions/export');
const { processRecurringAction } = await import('@/server/actions/recurring-transaction');

const ISLEM_ISTEGI = {
  dataset: 'transactions' as const,
  basis: 'accrual' as const,
  filter: { page: 1, perPage: 20, sort: 'desc' as const, from: '2026-03-01', to: '2026-03-31' },
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
});

function yazilanDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

/* ===========================================================================
 * ⚠️⚠️ YETKİ — ağdan çağrılabilir uçlar
 * ======================================================================== */

describe('⚠️ yetki kapısı', () => {
  const eylemler = [
    ['exportCsvAction', () => exportCsvAction(ISLEM_ISTEGI)],
    ['processRecurringAction', () => processRecurringAction()],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA UNAUTHORIZED', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    const sonuc = await cagir();

    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
    // Hiçbir okuma ya da yazma denenmedi.
    expect(dbMock.transaction.findMany).not.toHaveBeenCalled();
    expect(dbMock.transaction.createMany).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED', async (_ad, cagir) => {
    /*
     * ⚠️ DIŞA AKTARIM BİR OKUMA, AMA YAZMA KAPISI ONA DA UYGULANIYOR VE BU
     * BİLİNÇLİ: ele geçirilmiş bir oturumun yapabileceği en zararlı şey bütün
     * defteri tek dosyada dışarı almak. ADR-035/C okuma korumasını F6'ya
     * bırakmıştı çünkü ara katman Edge'de DB okuyamıyor; bu uç bir Server
     * Action olduğu için kapı burada BEDAVA.
     */
    writesRevokedMock.mockResolvedValue(true);
    const sonuc = await cagir();

    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
  });
});

/* ===========================================================================
 * DIŞA AKTARIM — üç küme, tek eylem
 * ======================================================================== */

describe('exportCsvAction', () => {
  it('işlem defteri üretiliyor ve `truncated` ZARFTA', async () => {
    const sonuc = await exportCsvAction(ISLEM_ISTEGI);

    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;

    expect(sonuc.data.filename).toContain('islemler');
    expect(sonuc.data.content).toContain('sep=;');
    expect(sonuc.data.rowCount).toBe(1);
    /*
     * Uyarı zarfın İÇİNDE, arayüzün `exportTruncated()`ı kendisinin
     * çağırmasına bırakılmadı: o çağrıyı atlamak mümkün olurdu ve Frontend'in
     * cümlesi "sessizce kesilmiş bir CSV, fark edilemeyecek tek veri kaybı".
     */
    expect(sonuc.data.truncated).toBe(false);
  });

  it('kategori dağılımı ve aylık özet de AYNI eylemden', async () => {
    const kategori = await exportCsvAction({
      dataset: 'categories',
      basis: 'cash',
      range: { from: '2026-03-01', to: '2026-03-31' },
    });
    expect(kategori.ok).toBe(true);
    expect(kategori.ok && kategori.data.filename).toContain('kategori-dagilimi');

    const aylik = await exportCsvAction({ dataset: 'monthly', basis: 'cash', year: 2026 });
    expect(aylik.ok).toBe(true);
    expect(aylik.ok && aylik.data.rowCount).toBe(12);
  });

  it('⚠️ `basis` EKSİKSE REDDEDİLİYOR — varsayılan yok', async () => {
    // Varsayılan vermek, kullanıcının seçmediği bir esası ona atfetmek olurdu
    // ve dosya bir muhasebeciye gidiyor (T-106 kararı).
    const sonuc = await exportCsvAction({ ...ISLEM_ISTEGI, basis: undefined });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.basis).toBeTruthy();
  });

  it('⚠️ YANLIŞ KÜMEYE YANLIŞ GİRDİ reddediliyor — sessizce düşmüyor', async () => {
    /*
     * Ayrık birleşimin sebebi: düz bir nesne olsaydı `{ dataset: 'monthly' }`
     * ile `range` göndermek şemayı GEÇER ve sunucu sessizce yoksayardı —
     * bu turda `jobBase.contactMessageId`den çıkardığım tuzağın aynısı.
     */
    const sonuc = await exportCsvAction({
      dataset: 'monthly',
      basis: 'cash',
      range: { from: '2026-03-01', to: '2026-03-31' },
    });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.year).toBeTruthy();
  });

  it('geçersiz `dataset` reddediliyor', async () => {
    expect((await exportCsvAction({ dataset: 'herşey', basis: 'cash' })).ok).toBe(false);
  });

  it('⚠️ YIL SINIRI eylemde de geçerli', async () => {
    // `buildPeriodKey` dört basamaklı yıl varsayıyor (ADR-040 bağlayıcı).
    expect((await exportCsvAction({ dataset: 'monthly', basis: 'cash', year: 10000 })).ok).toBe(
      false,
    );
  });

  /* ───────────────────────────────────────────────────────────────────────
   * ⚠️ DENETİM KAYDI — veri çıkışı kaydediliyor, İÇERİK yazılmıyor
   * ──────────────────────────────────────────────────────────────────── */

  it('`EXPORT` eylemi yazılıyor — enum T-010`dan beri kullanılmamıştı', async () => {
    await exportCsvAction(ISLEM_ISTEGI);

    const satir = dbMock.auditLog.create.mock.calls.at(-1)?.[0].data as {
      action: string;
      entity: string;
    };
    expect(satir.action).toBe('EXPORT');
    expect(satir.entity).toBe('Transaction');
  });

  it('⚠️ DOSYANIN İÇERİĞİ diff`e GİRMİYOR', async () => {
    /*
     * Bir satırını bile yazmak, denetim kaydını verinin ikinci bir kopyası
     * yapardı ve §8.21 yedeğine taşırdı. Amaç veriyi saklamak değil, ÇIKIŞI
     * kaydetmek.
     */
    await exportCsvAction(ISLEM_ISTEGI);
    const diff = JSON.stringify(yazilanDiff());

    expect(diff).not.toContain('Kıyı Medya');
    expect(diff).not.toContain('FTR-001');
    expect(diff).not.toContain('85625');
    expect(diff).not.toContain('Birinci taksit');
  });

  it('diff KAPSAM ve SAYI taşıyor — adli değer burada', async () => {
    await exportCsvAction(ISLEM_ISTEGI);
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields.sort()).toEqual(['basis', 'dataset', 'rowCount', 'scope', 'truncated']);
    // Bunlar BEYAZ LİSTEDE değil, yani ekranda yalnızca alan adları görünür —
    // tutar ve kimlik taşımadıkları için sorun değil (T-102 polaritesi).
    expect(JSON.stringify(ozet)).not.toContain('Kıyı Medya');
  });

  it('kapsam özeti TARİH UÇLARI — kimlik taşımıyor', async () => {
    await exportCsvAction({
      ...ISLEM_ISTEGI,
      filter: { ...ISLEM_ISTEGI.filter, clientId: 'cli_gizli', categoryId: 'cat_gizli' },
    });

    const diff = yazilanDiff() as { scope: string };
    expect(diff.scope).toBe('2026-03-01..2026-03-31');
    expect(JSON.stringify(diff)).not.toContain('cli_gizli');
    expect(JSON.stringify(diff)).not.toContain('cat_gizli');
  });

  it('tarih verilmemişse kapsam bunu SÖYLÜYOR', async () => {
    await exportCsvAction({
      dataset: 'transactions',
      basis: 'cash',
      filter: { page: 1, perPage: 20, sort: 'desc' },
    });

    expect((yazilanDiff() as { scope: string }).scope).toBe('baslangicsiz..bitissiz');
  });

  it('beklenmeyen hata yutulmuyor', async () => {
    dbMock.transaction.findMany.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await exportCsvAction(ISLEM_ISTEGI);
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });
});

/* ===========================================================================
 * TEKRARLAYAN — ADR-040 elle tetikleyici
 * ======================================================================== */

describe('processRecurringAction', () => {
  it('⚠️ GİRDİ ALMIYOR — hangi şablonların işleneceğini KENDİ belirliyor', async () => {
    /*
     * İstemciden kimlik listesi almak, kullanıcının görmediği bir şablonu
     * işlemesine ya da bir şablonu atlamasına izin verirdi; "işlenmeyi
     * bekleyen her şey işlensin" zaten düğmenin anlamı.
     */
    expect(processRecurringAction.length).toBe(0);

    const sonuc = await processRecurringAction();
    expect(sonuc.ok).toBe(true);
  });

  it('sonuç SAYILARI taşıyor', async () => {
    const sonuc = await processRecurringAction();
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;

    expect(sonuc.data.consideredTemplates).toBe(1);
    expect(sonuc.data.createdCount).toBe(2);
    expect(sonuc.data.skipped).toEqual([]);
  });

  it('denetim kaydı `RECURRING_RUN` bağlamıyla yazılıyor', async () => {
    await processRecurringAction();
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.values.context).toBe('RECURRING_RUN');
    expect(ozet.fields).toContain('createdCount');
    expect(ozet.fields).toContain('skippedDuplicateCount');
  });

  it('⚠️ ÜRETİLEN KAYITLARIN İÇERİĞİ diff`e GİRMİYOR', async () => {
    await processRecurringAction();
    const diff = JSON.stringify(yazilanDiff());

    // Tutar ve şablon açıklaması yok; `Transaction` satırlarından okunuyor.
    expect(diff).not.toContain('890');
    expect(diff).not.toContain('Yazılım aboneliği');
  });

  it('ATLAMA SEBEPLERİ diff`e giriyor, açıklama GİRMİYOR', async () => {
    dbMock.recurringTransaction.findMany.mockResolvedValueOnce([
      {
        id: 'rec_usd',
        type: 'EXPENSE',
        amount: { toFixed: () => '100.00' },
        currency: 'USD',
        categoryId: 'cat_1',
        description: 'Gizli şablon notu',
        method: 'BANK_TRANSFER',
        recurrenceRule: 'MONTHLY',
        startDate: new Date('2026-01-15T00:00:00.000Z'),
        endDate: null,
        nextRunAt: null,
        isActive: true,
      },
    ]);

    const sonuc = await processRecurringAction();
    expect(sonuc.ok && sonuc.data.skipped[0]?.reason).toBe('NON_TRY_CURRENCY');

    const diff = JSON.stringify(yazilanDiff());
    expect(diff).toContain('NON_TRY_CURRENCY');
    // Serbest metin denetim kaydına girmez (ADR-034).
    expect(diff).not.toContain('Gizli şablon notu');
  });

  it('beklenmeyen hata yutulmuyor', async () => {
    dbMock.recurringTransaction.findMany.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await processRecurringAction();
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });
});
