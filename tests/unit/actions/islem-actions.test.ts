import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

import { decimal } from '../_helpers/decimal-kacak';

/**
 * `Transaction` + `TransactionCategory` SERVER ACTION'LARI — T-101.
 *
 * ⚠️ EN ÖNEMLİ BLOK "PARA SATIRA GİRİYOR, EKRANA GİRMİYOR": T-100'ün kararı
 * burada AYNEN uygulanıyor ve zincir uçtan uca ölçülüyor (gerçek
 * `writeAuditLog` → yakalanan satır → T-053'ün gerçek okuma özeti).
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
    jobId: 'job_1',
    clientId: 'cli_1',
    method: 'BANK_TRANSFER',
    isPaid: true,
    paidAt: null,
    invoiceNo: 'FTR-001',
    sourceRecurringId: null,
    createdAt: new Date('2026-03-10T09:00:00.000Z'),
    updatedAt: new Date('2026-03-11T09:00:00.000Z'),
    description: 'Gizli açıklama metni',
    category: { name: 'Proje Geliri' },
    job: { title: 'Kurumsal site' },
    client: { name: 'Kıyı Medya' },
  };

  const kategori = {
    id: 'cat_1',
    name: 'Proje Geliri',
    type: 'INCOME',
    color: '#11aa55',
    icon: 'wallet',
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { transactions: 4, recurringTransactions: 1 },
  };

  return {
    dbMock: {
      transaction: {
        create: vi.fn().mockResolvedValue(islem),
        update: vi.fn().mockResolvedValue(islem),
        findUnique: vi.fn().mockResolvedValue(islem),
      },
      transactionCategory: {
        create: vi.fn().mockResolvedValue(kategori),
        update: vi.fn().mockResolvedValue(kategori),
        findUnique: vi.fn().mockResolvedValue(kategori),
      },
      job: { findUnique: vi.fn().mockResolvedValue({ clientId: 'cli_1' }) },
      client: { findUnique: vi.fn().mockResolvedValue({ id: 'cli_1' }) },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { createTransactionAction, updateTransactionAction } = await import(
  '@/server/actions/transaction'
);
const {
  archiveTransactionCategoryAction,
  createTransactionCategoryAction,
  updateTransactionCategoryAction,
} = await import('@/server/actions/transaction-category');

/** Geçerli bir işlem girdisi — testler üzerine ekler. */
const GECERLI = {
  type: 'INCOME' as const,
  amount: '2500.00',
  currency: 'USD' as const,
  fxRate: '34.25',
  date: '2026-03-10',
  categoryId: 'cat_1',
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
 * YETKİ — ADR-035/B
 * ======================================================================== */

describe('yetki kapısı', () => {
  const eylemler = [
    ['createTransactionAction', () => createTransactionAction(GECERLI)],
    ['updateTransactionAction', () => updateTransactionAction({ id: 'trx_1', amount: '1.00' })],
    [
      'createTransactionCategoryAction',
      () => createTransactionCategoryAction({ name: 'X', type: 'INCOME' }),
    ],
    [
      'updateTransactionCategoryAction',
      () => updateTransactionCategoryAction({ id: 'cat_1', name: 'X' }),
    ],
    [
      'archiveTransactionCategoryAction',
      () => archiveTransactionCategoryAction({ id: 'cat_1', isArchived: true }),
    ],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA UNAUTHORIZED', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    const sonuc = await cagir();

    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
    expect(dbMock.transaction.create).not.toHaveBeenCalled();
    expect(dbMock.transactionCategory.create).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED', async (_ad, cagir) => {
    writesRevokedMock.mockResolvedValue(true);
    expect((await cagir()).ok).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️⚠️ PARA — SATIRA GİRİYOR, EKRANA GİRMİYOR (T-100 kararı aynen)
 * ======================================================================== */

describe('AuditLog diff — para', () => {
  it('tutarlar SATIRA yazılıyor', async () => {
    await createTransactionAction(GECERLI);
    const diff = JSON.stringify(yazilanDiff());

    expect(diff).toContain('2500.00');
    expect(diff).toContain('85625.00');
    expect(diff).toContain('34.25000000');
  });

  it('⚠️ DENETİM EKRANINDA DEĞER GÖRÜNMÜYOR — yalnızca alan adı', async () => {
    await createTransactionAction(GECERLI);
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields).toContain('amount');
    expect(ozet.fields).toContain('baseAmount');
    expect(ozet.fields).toContain('fxRate');

    const ekran = JSON.stringify(ozet);
    for (const deger of ['2500.00', '85625.00', '34.25']) {
      expect(ekran, `${deger} denetim ekranına ulaştı`).not.toContain(deger);
    }
    expect(ozet.values).toEqual({});
  });

  it('⚠️ `description` DİFF`E GİRMİYOR — serbest metin', async () => {
    /*
     * ADR-034'ün "masum anahtarın değerine gömülü sır" ölçümünün tarifi:
     * içine ne yazıldığı bilinemeyen bir alan. `Client.notes` ile aynı sınıf.
     */
    await createTransactionAction({ ...GECERLI, description: 'Gizli açıklama metni' });
    const diff = JSON.stringify(yazilanDiff());

    expect(diff).not.toContain('Gizli açıklama');
    // Maske bile yok: alan hiç yazılmadı.
    expect(diff).not.toContain('[REDACTED]');
  });

  it('BULGU-019 — diff alanları ELLE sayılıyor', async () => {
    await createTransactionAction(GECERLI);

    expect(toDiffSummary(yazilanDiff()).fields.sort()).toEqual([
      'amount',
      'baseAmount',
      'categoryId',
      'clientId',
      'currency',
      'date',
      'fxRate',
      'invoiceNo',
      'isPaid',
      'jobId',
      'method',
      'type',
    ]);
  });

  it('güncellemede `changed` EKRANDA OKUNABİLİR — `buildDiff` dışında', async () => {
    /*
     * T-100'de kendi kodumda bulduğum kusur: `buildDiff` her alanı
     * `{before, after}` çiftine sarıyor ve T-053'ün okuyucusu o çiftlerin
     * değerini hiç basmıyor — sarılmış bir `changed` okunamaz hâle gelirdi.
     */
    const sonuc = await updateTransactionAction({ id: 'trx_1', fxRate: '40.00' });
    expect(sonuc.ok).toBe(true);

    const ozet = toDiffSummary(yazilanDiff());
    expect(ozet.values).toEqual({ changed: 'fxRate' });
    expect(JSON.stringify(ozet)).not.toContain('85625.00');
  });

  it('kategori diff`inde `color` YOK', async () => {
    // Bir rengin değişmesi "hangi kategori ne zaman açıldı" sorusuna bir şey
    // katmıyor ve her tema düzenlemesinde satır üretirdi.
    await createTransactionCategoryAction({ name: 'X', type: 'INCOME', color: '#112233' });
    const diff = JSON.stringify(yazilanDiff());

    expect(diff).not.toContain('112233');
    expect(toDiffSummary(yazilanDiff()).fields.sort()).toEqual(['name', 'type']);
  });

  it('kategori türü değişirse diff AYIRT EDİLEBİLİR', async () => {
    await updateTransactionCategoryAction({ id: 'cat_1', type: 'INCOME' });
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields.sort()).toEqual(['changed', 'newType']);
    expect(ozet.values.changed).toBe('type');
  });

  it('arşivleme `ARCHIVE`, geri alma `RESTORE`', async () => {
    await archiveTransactionCategoryAction({ id: 'cat_1', isArchived: true });
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('ARCHIVE');

    dbMock.transactionCategory.update.mockResolvedValueOnce({
      id: 'cat_1',
      name: 'Proje Geliri',
      type: 'INCOME',
      color: null,
      icon: null,
      isArchived: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      _count: { transactions: 0, recurringTransactions: 0 },
    });
    await archiveTransactionCategoryAction({ id: 'cat_1', isArchived: false });
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('RESTORE');
  });
});

/* ===========================================================================
 * ⚠️ ÜÇ FK KAPISI
 * ======================================================================== */

describe('referans varlık kapıları', () => {
  it('var olmayan KATEGORİ → kesin alan hatası, yazma denenmiyor', async () => {
    dbMock.transactionCategory.findUnique.mockResolvedValueOnce(null);

    const sonuc = await createTransactionAction(GECERLI);

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.categoryId).toBeTruthy();
    expect(dbMock.transaction.create).not.toHaveBeenCalled();
  });

  it('var olmayan İŞ → `jobId` alanı işaretleniyor', async () => {
    dbMock.job.findUnique.mockResolvedValueOnce(null);

    const sonuc = await createTransactionAction({ ...GECERLI, jobId: 'job_yok' });

    expect(sonuc.ok === false && sonuc.error.fields?.jobId).toBeTruthy();
    expect(sonuc.ok === false && sonuc.error.fields?.categoryId).toBeUndefined();
  });

  it('var olmayan MÜŞTERİ → `clientId` alanı işaretleniyor', async () => {
    dbMock.client.findUnique.mockResolvedValueOnce(null);

    const sonuc = await createTransactionAction({ ...GECERLI, clientId: 'cli_yok' });

    expect(sonuc.ok === false && sonuc.error.fields?.clientId).toBeTruthy();
  });

  it('⚠️ YALNIZCA BOZUK OLAN alan işaretleniyor — ikisi bozuksa ikisi', async () => {
    dbMock.job.findUnique.mockResolvedValueOnce(null);
    dbMock.client.findUnique.mockResolvedValueOnce(null);

    const sonuc = await createTransactionAction({
      ...GECERLI,
      jobId: 'job_yok',
      clientId: 'cli_yok',
    });

    expect(sonuc.ok === false && Object.keys(sonuc.error.fields ?? {}).sort()).toEqual([
      'clientId',
      'jobId',
    ]);
    // Kategori sağlam — işaretlenmiyor.
    expect(sonuc.ok === false && sonuc.error.fields?.categoryId).toBeUndefined();
  });

  it('⚠️ MESAJ "DOSYA" DEMİYOR', async () => {
    /*
     * `toFailure`ın P2003 varsayılan metni eklentiye özeldi ("Seçilen dosya
     * bulunamadı"). T-100 ikinci kaynağı (`Job.clientId`), T-101 üçüncü ve
     * dördüncüyü (`categoryId`, `jobId`) açtı; `foreignKey` geçersiz kılması
     * her birinde doğru şeyin adını söylüyor.
     */
    dbMock.transactionCategory.findUnique.mockResolvedValueOnce(null);
    const sonuc = await createTransactionAction(GECERLI);

    expect(sonuc.ok === false && sonuc.error.message).not.toContain('dosya');
    expect(sonuc.ok === false && sonuc.error.message).toContain('Seçilen kayıtlardan');
  });

  it('bağ GÖNDERİLMEZSE sorgu AÇILMIYOR', async () => {
    await createTransactionAction(GECERLI);

    // `categoryId` zorunlu olduğu için sorgulanıyor; diğer ikisi gönderilmedi.
    expect(dbMock.transactionCategory.findUnique).toHaveBeenCalledOnce();
    expect(dbMock.job.findUnique).not.toHaveBeenCalled();
    expect(dbMock.client.findUnique).not.toHaveBeenCalled();
  });

  it('P2003 YARIŞINDA da referans mesajı dönüyor', async () => {
    dbMock.transaction.create.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await createTransactionAction(GECERLI);

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('Seçilen kayıtlardan');
  });

  it('GÜNCELLEMEDE de P2003 yarışı referans mesajı dönüyor', async () => {
    // Ön kontrol ile yazma arasında bir referans silinirse FK tetiklenir;
    // kullanıcı ön kontrolle AYNI cümleyi görmeli (T-051/B).
    dbMock.transaction.update.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await updateTransactionAction({ id: 'trx_1', categoryId: 'cat_1' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('Seçilen kayıtlardan');
  });

  it('EKLENTİ yolunun P2003 metni DEĞİŞMEDİ', async () => {
    const { toFailure } = await import('@/server/actions/_shared');
    const hata = Object.assign(new Error('fk'), { code: 'P2003' });

    expect(toFailure('x', hata).error.message).toContain('Seçilen dosya bulunamadı');
  });
});

/* ===========================================================================
 * BENZERSİZLİK VE HATA YOLLARI
 * ======================================================================== */

describe('kategori benzersizliği ve hata yolları', () => {
  it('⚠️ P2002 mesajı AD+TÜR ÇİFTİNİ anlatıyor — slug metni DEĞİL', async () => {
    /*
     * `@@unique([name, type])`. Aynı adın gelir VE gider kategorisi olması
     * MEŞRU ("Yazılım" ikisi de olabilir); mesaj bunu söylemezse kullanıcı
     * "bu ad zaten var" deyip duran bir forma bakıp neden olduğunu anlamaz.
     */
    dbMock.transactionCategory.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await createTransactionCategoryAction({ name: 'Yazılım', type: 'INCOME' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.message).toContain('diğer türde');
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('slug');
    expect(sonuc.ok === false && sonuc.error.fields?.name).toBeTruthy();
  });

  it('işlem yoksa NOT_FOUND, yazma ve denetim kaydı YOK', async () => {
    dbMock.transaction.findUnique.mockResolvedValueOnce(null);

    const sonuc = await updateTransactionAction({ id: 'yok', amount: '1.00' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
    expect(dbMock.transaction.update).not.toHaveBeenCalled();
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('kategori güncellemede P2025 → NOT_FOUND', async () => {
    dbMock.transactionCategory.update.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );

    expect(
      (await updateTransactionCategoryAction({ id: 'yok', name: 'X' })).ok === false,
    ).toBe(true);
  });

  it('arşivlemede P2025 → NOT_FOUND', async () => {
    dbMock.transactionCategory.update.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );

    const sonuc = await archiveTransactionCategoryAction({ id: 'yok', isArchived: true });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
  });

  it('bilinmeyen hata INTERNAL_ERROR — sessizce başarı dönmüyor', async () => {
    dbMock.transaction.create.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await createTransactionAction(GECERLI);
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });

  it('şema geçersiz girdiyi reddediyor — servis hiç çağrılmıyor', async () => {
    // TRY'de kur 1 olmalı (`isFxRateConsistent`).
    const sonuc = await createTransactionAction({ ...GECERLI, currency: 'TRY', fxRate: '34.25' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.fxRate).toBeTruthy();
    expect(dbMock.transaction.create).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * TEK YAZMA YOLU — §6
 * ======================================================================== */

describe('§6 — tek yazma yolu', () => {
  it('iş kartından gelen ödeme AYNI eylemi kullanıyor', async () => {
    /*
     * "Aynı veri iki yere girilmez" şartını koruyan şey TEKLİK: iş kartındaki
     * "ödeme ekle" de muhasebe ekranındaki "işlem ekle" de bu eylemi çağırır;
     * tek fark `jobId`nin önceden doldurulmuş olması.
     */
    const sonuc = await createTransactionAction({ ...GECERLI, jobId: 'job_1' });

    expect(sonuc.ok).toBe(true);
    expect(dbMock.transaction.create).toHaveBeenCalledOnce();
    expect(dbMock.transaction.create.mock.calls[0]?.[0].data.jobId).toBe('job_1');
  });

  it('`decimal` yardımcısı taklit satırla uyumlu — tip sağlaması', () => {
    // Yardımcı iki test dosyasında paylaşıldığı için imzası sabit kalmalı.
    expect(decimal('85625').toFixed(2)).toBe('85625.00');
  });
});
