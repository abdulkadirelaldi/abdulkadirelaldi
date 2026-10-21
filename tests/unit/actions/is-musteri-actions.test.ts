import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * `Job` + `Client` SERVER ACTION'LARI — T-100.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "PARA EKRANDA GÖRÜNMÜYOR": T-052/T-053 ile
 * `AuditLog.diff` artık KULLANICIYA BASILIYOR, yani denetim kaydına yazdığımız
 * her şey bir ekran kararı haline geldi. Blok zinciri uçtan uca kuruyor —
 * gerçek `writeAuditLog` → yakalanan satır → gerçek okuma özeti.
 */

/* ===========================================================================
 * TAKLİTLER — `auth` ve `db`
 * ======================================================================== */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { dbMock } = vi.hoisted(() => {
  const jobSatiri = {
    id: 'job_1',
    title: 'Kurumsal site',
    status: 'ACTIVE',
    clientId: 'cli_1',
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    dueDate: new Date('2026-03-10T00:00:00.000Z'),
    deliveredAt: null,
    agreedAmount: { toFixed: (n = 2) => (2500).toFixed(n) },
    currency: 'USD',
    fxRate: { toFixed: (n = 2) => (34.25).toFixed(n) },
    baseAmount: { toFixed: (n = 2) => (85625).toFixed(n) },
    contactMessageId: null,
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
    updatedAt: new Date('2026-02-02T09:00:00.000Z'),
    description: 'Açıklama',
    client: { id: 'cli_1', name: 'Kıyı Medya', email: 'a@b.com', isArchived: false },
    contactMessage: null,
  };

  const clientSatiri = {
    id: 'cli_1',
    name: 'Kıyı Medya',
    company: 'Kıyı Medya Ltd.',
    email: 'musteri@ornek.com',
    phone: '+90 555 000 00 00',
    notes: 'Gizli not metni',
    isKiyiMedya: true,
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    _count: { jobs: 3 },
  };

  return {
    dbMock: {
      job: {
        create: vi.fn().mockResolvedValue(jobSatiri),
        update: vi.fn().mockResolvedValue(jobSatiri),
        findUnique: vi.fn().mockResolvedValue(jobSatiri),
      },
      client: {
        create: vi.fn().mockResolvedValue(clientSatiri),
        update: vi.fn().mockResolvedValue(clientSatiri),
        findUnique: vi.fn().mockResolvedValue(clientSatiri),
      },
      attachment: { count: vi.fn().mockResolvedValue(1) },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { revalidateTagMock } = vi.hoisted(() => ({ revalidateTagMock: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: revalidateTagMock }));

const { archiveClientAction, createClientAction, updateClientAction } =
  await import('@/server/actions/client');
const { changeJobStatusAction, createJobAction, updateJobAction } =
  await import('@/server/actions/job');

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  dbMock.attachment.count.mockResolvedValue(1);
});

/** Son yazılan denetim satırının `diff`i. */
function yazilanDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

/* ===========================================================================
 * YETKİ — ADR-035/B
 * ======================================================================== */

describe('yetki kapısı', () => {
  const eylemler = [
    ['createJobAction', () => createJobAction({ title: 'X' })],
    ['updateJobAction', () => updateJobAction({ id: 'job_1', title: 'X' })],
    ['changeJobStatusAction', () => changeJobStatusAction({ id: 'job_1', status: 'ACTIVE' })],
    ['createClientAction', () => createClientAction({ name: 'X' })],
    ['updateClientAction', () => updateClientAction({ id: 'cli_1', name: 'X' })],
    ['archiveClientAction', () => archiveClientAction({ id: 'cli_1', isArchived: true })],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA UNAUTHORIZED', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    const sonuc = await cagir();

    expect(sonuc.ok).toBe(false);
    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
    // Hiçbir yazma denenmedi.
    expect(dbMock.job.create).not.toHaveBeenCalled();
    expect(dbMock.client.create).not.toHaveBeenCalled();
  });

  it.each(eylemler)('%s — YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED', async (_ad, cagir) => {
    // ADR-035/B: `writesValidFrom`dan önceki jeton yazamaz.
    writesRevokedMock.mockResolvedValue(true);
    const sonuc = await cagir();

    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
  });
});

/* ===========================================================================
 * ⚠️⚠️ PARA — SATIRA YAZILIYOR, EKRANDA GÖRÜNMÜYOR
 * ======================================================================== */

describe('AuditLog diff — PARA kararı', () => {
  it('tutarlar SATIRA yazılıyor (adli değer, sır değil)', async () => {
    await createJobAction({
      title: 'Yeni iş',
      agreedAmount: '2500.00',
      fxRate: '34.25',
      currency: 'USD',
    });

    const diff = JSON.stringify(yazilanDiff());
    expect(diff).toContain('agreedAmount');
    expect(diff).toContain('2500.00');
    expect(diff).toContain('fxRate');
    expect(diff).toContain('baseAmount');
    // Türetilmiş alan da yazılıyor: ADR-014 bozulursa denetim kaydı kanıt taşır.
    expect(diff).toContain('85625.00');
  });

  it('⚠️ AMA DENETİM EKRANINDA DEĞER GÖRÜNMÜYOR — yalnızca alan adı', async () => {
    /*
     * Zincir: gerçek `writeAuditLog` satırı yazdı → T-053'ün gerçek okuma
     * özetinden geçiriyoruz. `{ before, after }` çiftlerinin DEĞERİ hiç
     * basılmıyor, dolayısıyla tutar ekrana ulaşmıyor.
     *
     * KARAR BU: beyaz listeye `agreedAmount` EKLENMEDİ, çünkü listenin tek
     * üyelik ölçütü "değer bir ALAN ADI ya da kodda yazılı KAPALI KÜME" ve tutar
     * tam olarak KAYIT İÇERİĞİ. Bir içerik alanını almak, listeyi yapısal bir
     * ölçütten "hangi içerik masum" tartışmasına çevirirdi.
     */
    await createJobAction({
      title: 'Yeni iş',
      agreedAmount: '2500.00',
      fxRate: '34.25',
      currency: 'USD',
    });

    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields).toContain('agreedAmount');
    expect(ozet.fields).toContain('baseAmount');
    expect(ozet.fields).toContain('fxRate');

    const ekran = JSON.stringify(ozet);
    for (const deger of ['2500.00', '34.25', '85625.00']) {
      expect(ekran, `${deger} denetim ekranına ulaştı`).not.toContain(deger);
    }
    expect(ozet.values).toEqual({});
  });

  it('GÜNCELLEMEDE de tutar satıra giriyor, ekrana GİRMİYOR', async () => {
    /*
     * `updateJobAction`ın başarı yolu ayrıca sınanıyor: para diff'inin asıl
     * doğduğu yer burası (kur güncellemesi) ve ilk yazdığımda yalnızca
     * NOT_FOUND dalını sınamıştım — kapsam ölçümü bunu gösterdi.
     */
    const sonuc = await updateJobAction({ id: 'job_1', fxRate: '40.00' });
    expect(sonuc.ok).toBe(true);

    const diff = yazilanDiff();
    expect(JSON.stringify(diff)).toContain('85625.00');

    const ozet = toDiffSummary(diff);
    expect(ozet.fields).toContain('baseAmount');
    // Hangi alanların gönderildiği BEYAZ LİSTEDEKİ `changed` ile okunabiliyor.
    expect(ozet.values).toEqual({ changed: 'fxRate' });
    expect(JSON.stringify(ozet)).not.toContain('85625.00');
  });

  it('BULGU-019 — diff alanları ELLE sayılıyor, modelden türetilmiyor', async () => {
    await createJobAction({ title: 'X' });
    const alanlar = toDiffSummary(yazilanDiff()).fields.sort();

    // Tam liste SABİT: `jobBase`e yarın eklenecek bir alan kendiliğinden
    // girmesin. `{ deleted: before }` kalıbı tam bu güvenceyi kaybettirirdi.
    expect(alanlar).toEqual([
      'agreedAmount',
      'baseAmount',
      'clientId',
      'currency',
      'deliveredAt',
      'dueDate',
      'fxRate',
      'startDate',
      'status',
      'title',
    ]);
  });

  it('kanban durum değişiminde diff TEK ALAN + bağlam', async () => {
    await changeJobStatusAction({ id: 'job_1', status: 'DELIVERED' });
    const ozet = toDiffSummary(yazilanDiff());

    // Değişmeyen dokuz alan her sürüklemede tekrar yazılmıyor.
    expect(ozet.fields.sort()).toEqual(['context', 'status']);
    // `context` ve `status` BEYAZ LİSTEDE değil mi? `context` evet, `status` hayır —
    // yani bağlam okunabiliyor, durumun kendisi yalnızca "değişti" olarak.
    expect(ozet.values).toEqual({ context: 'KANBAN_STATUS' });
  });
});

/* ===========================================================================
 * ⚠️ MÜŞTERİ DİFF'İ — §8.20 kişisel veri
 * ======================================================================== */

describe('AuditLog diff — Client kişisel verisi', () => {
  it('⚠️ e-posta, telefon ve NOT denetim kaydına GİRMİYOR', async () => {
    await createClientAction({
      name: 'Kıyı Medya',
      email: 'musteri@ornek.com',
      phone: '+90 555 000 00 00',
      notes: 'Gizli not metni',
    });

    const diff = JSON.stringify(yazilanDiff());

    // §8.20 — tam e-posta hiçbir koşulda denetim kaydında görünmez.
    expect(diff).not.toContain('musteri@ornek.com');
    expect(diff).not.toContain('555 000');
    // `notes` serbest metin: ADR-034'ün "masum anahtarın değerine gömülü sır"
    // ölçümü tam bu alanın tarifi.
    expect(diff).not.toContain('Gizli not');
    // Maske bile yok: alan hiç yazılmadı.
    expect(diff).not.toContain('[REDACTED]');
  });

  it('e-postanın VARLIĞI yazılıyor, değeri değil', async () => {
    await createClientAction({ name: 'X', email: 'musteri@ornek.com' });
    const ozet = toDiffSummary(yazilanDiff());

    expect(ozet.fields).toContain('hasEmail');
    expect(ozet.fields).not.toContain('email');
  });

  it('güncellemede DEĞİŞEN ALAN ADLARI yazılıyor, değerleri değil', async () => {
    await updateClientAction({ id: 'cli_1', name: 'Yeni', notes: 'Gizli not metni' });
    const diff = yazilanDiff() as { changed: string };

    expect(diff.changed).toBe('name, notes');
    expect(JSON.stringify(diff)).not.toContain('Gizli not');
  });

  it('arşivleme `ARCHIVE`, geri alma `RESTORE` yazıyor — `UPDATE` değil', async () => {
    /*
     * Eylem kullanıcı için "sil" / "geri al" düğmesi ve denetim kaydında öyle
     * görünmeli (`archiveProjectAction` ile aynı gerekçe); `UPDATE` yazmak
     * arşivlemeyi sıradan bir alan düzenlemesiyle aynı kefeye koyardı.
     */
    const arsivli = await archiveClientAction({ id: 'cli_1', isArchived: true });
    expect(arsivli.ok).toBe(true);
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('ARCHIVE');

    // Geri alma turunda servis `isArchived: false` dönen satırı görmeli.
    dbMock.client.update.mockResolvedValueOnce({
      id: 'cli_1',
      name: 'Kıyı Medya',
      company: null,
      email: null,
      phone: null,
      notes: null,
      isKiyiMedya: false,
      isArchived: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      _count: { jobs: 0 },
    });

    const geri = await archiveClientAction({ id: 'cli_1', isArchived: false });
    expect(geri.ok).toBe(true);
    expect(dbMock.auditLog.create.mock.calls.at(-1)?.[0].data.action).toBe('RESTORE');
  });
});

/* ===========================================================================
 * ⚠️ FK KAPISI — var olmayan müşteri
 * ======================================================================== */

describe('clientId varlık kapısı', () => {
  it('var olmayan müşteri → KESİN alan hatası, yazma DENENMİYOR', async () => {
    dbMock.client.findUnique.mockResolvedValueOnce(null);

    const sonuc = await createJobAction({ title: 'X', clientId: 'cli_yok' });

    expect(sonuc.ok).toBe(false);
    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.clientId).toBeTruthy();
    expect(dbMock.job.create).not.toHaveBeenCalled();
  });

  it('⚠️ MESAJ "DOSYA" DEMİYOR — müşteri diyor', async () => {
    /*
     * `toFailure`ın P2003 varsayılan metni eklentiye özeldi ("Seçilen dosya
     * bulunamadı") çünkü T-050'de bu yola giren tek şey eklentilerdi. F4 ikinci
     * kaynağı açıyor; bu assert kullanıcıya yanlış şeyin adının söylenmesini
     * engelliyor.
     */
    dbMock.client.findUnique.mockResolvedValueOnce(null);
    const sonuc = await createJobAction({ title: 'X', clientId: 'cli_yok' });

    expect(sonuc.ok === false && sonuc.error.message).toContain('müşteri');
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('dosya');
  });

  it('müşterisiz iş açılabiliyor — sorgu HİÇ açılmıyor', async () => {
    const sonuc = await createJobAction({ title: 'Müşterisiz iş' });

    expect(sonuc.ok).toBe(true);
    // `clientId` gönderilmediyse varlık sorgusu bedava atlanıyor.
    expect(dbMock.client.findUnique).not.toHaveBeenCalled();
  });

  it('geçerli müşteri geçiyor', async () => {
    const sonuc = await createJobAction({ title: 'X', clientId: 'cli_1' });

    expect(sonuc.ok).toBe(true);
    expect(dbMock.job.create).toHaveBeenCalledOnce();
  });

  it('P2003 YARIŞINDA da müşteri mesajı dönüyor', async () => {
    // Kontrol ile yazma arasında müşteri silinirse FK tetiklenir.
    dbMock.job.create.mockRejectedValueOnce(Object.assign(new Error('fk'), { code: 'P2003' }));

    const sonuc = await createJobAction({ title: 'X', clientId: 'cli_1' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('müşteri');
    expect(sonuc.ok === false && sonuc.error.fields?.clientId).toBeTruthy();
  });

  it('GÜNCELLEMEDE de P2003 yarışı müşteri mesajı dönüyor', async () => {
    dbMock.job.update.mockRejectedValueOnce(Object.assign(new Error('fk'), { code: 'P2003' }));

    const sonuc = await updateJobAction({ id: 'job_1', clientId: 'cli_1' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('müşteri');
  });

  it('EKLENTİ yolunun P2003 metni DEĞİŞMEDİ — varsayılan korundu', async () => {
    const { toFailure } = await import('@/server/actions/_shared');
    const hata = Object.assign(new Error('fk'), { code: 'P2003' });

    // Geçersiz kılma verilmezse eski metin aynen duruyor (T-050/T-051 yolları).
    expect(toFailure('x', hata).error.message).toContain('Seçilen dosya bulunamadı');
  });
});

/* ===========================================================================
 * BENZERSİZLİK — `Client.email @unique`
 * ======================================================================== */

describe('Client.email benzersizliği', () => {
  it('P2002 → SLUG mesajı DEĞİL, e-posta mesajı', async () => {
    dbMock.client.create.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await createClientAction({ name: 'X', email: 'a@b.com' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.message).toContain('e-posta');
    // Ortada slug YOK; varsayılan metin anlamsız kalırdı.
    expect(sonuc.ok === false && sonuc.error.message).not.toContain('slug');
    expect(sonuc.ok === false && sonuc.error.fields?.email).toBeTruthy();
  });
});

/* ===========================================================================
 * NOT FOUND
 * ======================================================================== */

describe('beklenmeyen hatalar yutulmuyor', () => {
  it('güncellemede P2002 → CONFLICT (e-posta metni)', async () => {
    dbMock.client.update.mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    );

    const sonuc = await updateClientAction({ id: 'cli_1', email: 'a@b.com' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.ok === false && sonuc.error.message).toContain('e-posta');
  });

  it('arşivlemede P2025 → NOT_FOUND', async () => {
    dbMock.client.update.mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'P2025' }),
    );

    const sonuc = await archiveClientAction({ id: 'yok', isArchived: true });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
  });

  it('durum değişiminde P2025 → NOT_FOUND', async () => {
    dbMock.job.update.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'P2025' }));

    const sonuc = await changeJobStatusAction({ id: 'yok', status: 'ACTIVE' });
    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
  });

  it('bilinmeyen hata INTERNAL_ERROR — sessizce başarı dönmüyor', async () => {
    dbMock.job.create.mockRejectedValueOnce(new Error('beklenmedik'));

    const sonuc = await createJobAction({ title: 'X' });
    expect(sonuc.ok).toBe(false);
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('bulunamayan kayıt', () => {
  it('updateJobAction — iş yoksa NOT_FOUND, yazma denenmiyor', async () => {
    dbMock.job.findUnique.mockResolvedValueOnce(null);

    const sonuc = await updateJobAction({ id: 'yok', title: 'X' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
    expect(dbMock.job.update).not.toHaveBeenCalled();
    // Denetim kaydı da yazılmadı: olmayan bir şeyin değişimi kaydedilmez.
    expect(dbMock.auditLog.create).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * T-117 — LOGO ŞERİDİ: sahiplik ve önbellek
 * ======================================================================== */

describe('⚠️ T-117 — müşteri logosu', () => {
  const ID = 'cli_1';

  it('⚠️ BAŞKA KAYDIN eklentisi logo yapılamıyor — makbuz vitrine çıkmasın', async () => {
    dbMock.attachment.count.mockResolvedValue(0);
    const sonuc = await updateClientAction({
      id: ID,
      logoAttachmentId: 'ckmakbuz000000000000000001',
    });

    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.error.fields).toHaveProperty('logoAttachmentId');
    expect(dbMock.client.update).not.toHaveBeenCalled();

    // Sorgu sahipliği SORUYOR: entity CLIENT ve entityId = bu müşteri.
    expect(dbMock.attachment.count.mock.calls[0]?.[0].where).toEqual({
      id: 'ckmakbuz000000000000000001',
      entity: 'CLIENT',
      entityId: ID,
    });
  });

  it('kendi logosu kabul ediliyor; logoyu kaldırmak (`null`) sahiplik sormuyor', async () => {
    expect(
      (await updateClientAction({ id: ID, logoAttachmentId: 'cklogo0000000000000000001' })).ok,
    ).toBe(true);
    dbMock.attachment.count.mockClear();
    expect((await updateClientAction({ id: ID, logoAttachmentId: null })).ok).toBe(true);
    expect(dbMock.attachment.count).not.toHaveBeenCalled();
  });

  it('YENİ kayıtta logo reddediliyor — müşteri yokken eklentisi de yok', async () => {
    const sonuc = await createClientAction({
      name: 'Yeni',
      logoAttachmentId: 'cklogo0000000000000000001',
    });
    expect(sonuc.ok).toBe(false);
    expect(dbMock.client.create).not.toHaveBeenCalled();
  });

  it.each([
    ['ekleme', () => createClientAction({ name: 'Yeni' })],
    ['güncelleme', () => updateClientAction({ id: ID, showOnSite: true })],
    ['arşivleme', () => archiveClientAction({ id: ID, isArchived: true })],
  ] as const)('%s logo şeridinin önbelleğini (`content:client`) düşürüyor', async (_ad, cagir) => {
    expect((await cagir()).ok).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalledWith('content:client');
  });
});
