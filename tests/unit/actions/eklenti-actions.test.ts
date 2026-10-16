import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toDiffSummary } from '@/server/services/audit-log';

/**
 * EKLENTİ YÜKLEME EYLEMLERİ — §8.11, ADR-018, T-037.
 *
 * ⚠️ İKİ EN ÖNEMLİ BLOK:
 *   1. "İÇERİK DOĞRULAMA" — istemcinin beyanı değil, R2'den geri okunan
 *      baytlar. `mime: image/png` diyen bir metin dosyası REDDEDİLİYOR.
 *   2. "YETİM NESNE" — DB yazımı düşerse nesne HEMEN silinmeye çalışılıyor;
 *      telafi de düşerse gece işi alıyor (ADR-018). İki hat.
 */

const { authMock, writesRevokedMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  writesRevokedMock: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ auth: authMock }));
vi.mock('@/server/auth/write-gate', () => ({ writesRevoked: writesRevokedMock }));

const { r2Mock } = vi.hoisted(() => ({
  r2Mock: {
    getObjectBytes: vi.fn(),
    deleteObjectQuietly: vi.fn().mockResolvedValue(true),
    presignUpload: vi.fn().mockReturnValue('https://imzali.example/put'),
    presignDownload: vi.fn().mockReturnValue('https://imzali.example/get'),
    SIGNED_PUT_TTL_SECONDS: 300,
    SIGNED_GET_TTL_SECONDS: 900,
  },
}));

vi.mock('@/server/storage/r2', () => r2Mock);

const { dbMock } = vi.hoisted(() => {
  const satir = {
    id: 'att_1',
    key: 'project/prj_1/rnd.png',
    mime: 'image/png',
    size: 95,
    width: 1,
    height: 1,
    entity: 'PROJECT',
    entityId: 'prj_1',
    order: 0,
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
  };

  return {
    dbMock: {
      attachment: {
        create: vi.fn().mockResolvedValue(satir),
        findUnique: vi.fn().mockResolvedValue(satir),
        delete: vi.fn().mockResolvedValue(satir),
        findMany: vi.fn().mockResolvedValue([satir]),
      },
      project: { count: vi.fn().mockResolvedValue(1) },
      post: { count: vi.fn().mockResolvedValue(1) },
      profile: { count: vi.fn().mockResolvedValue(1) },
      transaction: { count: vi.fn().mockResolvedValue(1) },
      job: { count: vi.fn().mockResolvedValue(1) },
      client: { count: vi.fn().mockResolvedValue(1) },
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@/server/db', () => ({ db: dbMock }));

const { confirmUploadAction, deleteAttachmentAction, requestUploadAction } =
  await import('@/server/actions/attachment');

/** Geçerli, minik bir PNG (imza + IHDR 1×1). */
function gercekPng(): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(1, 16);
  buf.writeUInt32BE(1, 20);
  return buf;
}

const ONAY = {
  key: 'project/prj_1/rnd.png',
  entity: 'PROJECT' as const,
  entityId: 'prj_1',
  order: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: 'usr_1' }, tokenIssuedAt: 1_800_000_000 });
  writesRevokedMock.mockResolvedValue(false);
  r2Mock.getObjectBytes.mockResolvedValue(gercekPng());
  r2Mock.deleteObjectQuietly.mockResolvedValue(true);
  r2Mock.presignUpload.mockReturnValue('https://imzali.example/put');
});

function yazilanDiff(): unknown {
  const cagri = dbMock.auditLog.create.mock.calls.at(-1);
  return (cagri?.[0] as { data: { diff: unknown } }).data.diff;
}

/* ===========================================================================
 * YETKİ
 * ======================================================================== */

describe('yetki kapısı', () => {
  const eylemler = [
    [
      'requestUploadAction',
      () =>
        requestUploadAction({ mime: 'image/png', size: 100, entity: 'PROJECT', entityId: 'prj_1' }),
    ],
    ['confirmUploadAction', () => confirmUploadAction(ONAY)],
    ['deleteAttachmentAction', () => deleteAttachmentAction({ id: 'att_1' })],
  ] as const;

  it.each(eylemler)('%s — oturum YOKSA UNAUTHORIZED', async (_ad, cagir) => {
    authMock.mockResolvedValue(null);
    const sonuc = await cagir();

    expect(sonuc.ok === false && sonuc.error.code).toBe('UNAUTHORIZED');
    expect(r2Mock.presignUpload).not.toHaveBeenCalled();
    expect(r2Mock.getObjectBytes).not.toHaveBeenCalled();
    expect(dbMock.attachment.create).not.toHaveBeenCalled();
  });

  it.each(eylemler)(
    '%s — YAZMA YETKİSİ İPTALLİYSE UNAUTHORIZED (ADR-035/B)',
    async (_ad, cagir) => {
      writesRevokedMock.mockResolvedValue(true);
      expect((await cagir()).ok).toBe(false);
    },
  );
});

/* ===========================================================================
 * 1 — YÜKLEME İZNİ
 * ======================================================================== */

describe('requestUploadAction', () => {
  const GECERLI = {
    mime: 'image/png' as const,
    size: 1000,
    entity: 'PROJECT' as const,
    entityId: 'prj_1',
  };

  it('anahtar SUNUCUDA üretiliyor ve imzalı PUT adresi dönüyor', async () => {
    const sonuc = await requestUploadAction(GECERLI);

    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    expect(sonuc.data.key).toMatch(/^project\/prj_1\/[\w-]+\.png$/);
    expect(sonuc.data.uploadUrl).toBe('https://imzali.example/put');
    expect(new Date(sonuc.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('⚠️ HEDEF KAYIT YOKSA reddediliyor — ADR-018 uygulama katmanı bütünlüğü', async () => {
    /*
     * Polimorfik bağda FK YOK, yani veritabanı bunu yakalamıyor. Kontrol
     * olmasa, var olmayan bir `entityId` ile açılan eklenti hiçbir galeri
     * sorgusunda görünmeyen bir yetim SATIR olurdu.
     */
    dbMock.project.count.mockResolvedValueOnce(0);
    const sonuc = await requestUploadAction(GECERLI);

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.fields?.entityId).toBeTruthy();
    expect(r2Mock.presignUpload).not.toHaveBeenCalled();
  });

  it('altı varlık türünün HEPSİ doğru tabloya bakıyor', async () => {
    const eslesme = [
      ['PROJECT', dbMock.project],
      ['POST', dbMock.post],
      ['PROFILE', dbMock.profile],
      ['TRANSACTION', dbMock.transaction],
      ['JOB', dbMock.job],
      ['CLIENT', dbMock.client],
    ] as const;

    for (const [entity, delegate] of eslesme) {
      vi.clearAllMocks();
      delegate.count.mockResolvedValue(1);
      const sonuc = await requestUploadAction({ ...GECERLI, entity });

      expect(sonuc.ok, entity).toBe(true);
      expect(delegate.count, entity).toHaveBeenCalledOnce();
    }
  });

  it('⚠️ İZİN VERİLMEYEN tip ve AŞIRI boyut ERKEN reddediliyor', async () => {
    // Ucuz kapı: R2'ye hiç gitmeden.
    const tip = await requestUploadAction({ ...GECERLI, mime: 'application/zip' });
    expect(tip.ok === false && tip.error.fields?.mime).toBeTruthy();

    const boyut = await requestUploadAction({ ...GECERLI, size: 11 * 1024 * 1024 });
    expect(boyut.ok === false && boyut.error.fields?.size).toBeTruthy();

    expect(r2Mock.presignUpload).not.toHaveBeenCalled();
  });

  it('boş dosya reddediliyor', async () => {
    expect((await requestUploadAction({ ...GECERLI, size: 0 })).ok).toBe(false);
  });
});

/* ===========================================================================
 * ⚠️⚠️ 2 — İÇERİK DOĞRULAMA
 * ======================================================================== */

describe('⚠️ confirmUploadAction — içerik doğrulaması', () => {
  it('geçerli PNG kabul ediliyor, boyut ve sağlama SUNUCUDA hesaplanıyor', async () => {
    const png = gercekPng();
    const sonuc = await confirmUploadAction(ONAY);

    expect(sonuc.ok).toBe(true);
    const data = dbMock.attachment.create.mock.calls[0]?.[0].data;
    expect(data.mime).toBe('image/png');
    expect(data.size).toBe(png.length);
    expect(data.width).toBe(1);
    expect(data.height).toBe(1);
    // ⚠️ İstemci sağlama toplamı GÖNDERMİYOR — sunucu baytlardan hesaplıyor.
    expect(data.checksum).toBe(createHash('sha256').update(png).digest('hex'));
    expect(data.uploadedById).toBe('usr_1');
  });

  it('⚠️ "image/png" DİYEN METİN REDDEDİLİYOR ve nesne SİLİNİYOR', async () => {
    /*
     * Kararın kalbi: istemci `mime`ı beyan etmiyor, sunucu BAYTLARDAN
     * çıkarıyor. Doğrulamayı geçmemiş bir nesneyi bucket'ta bırakmak anlamsız.
     */
    r2Mock.getObjectBytes.mockResolvedValue(Buffer.from('image/png bu bir yalan'));
    const sonuc = await confirmUploadAction(ONAY);

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('içeriği');
    expect(dbMock.attachment.create).not.toHaveBeenCalled();
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledWith(ONAY.key);
  });

  it('⚠️ ANAHTAR ÖN EKİ DOĞRULANIYOR — başka kaydın nesnesi bağlanamıyor', async () => {
    /*
     * `key` istemciden geliyor. Kontrol olmasa istemci BAŞKA bir varlığın
     * anahtarını verip o nesneyi kendi kaydına bağlayabilirdi — nesne bizim
     * bucket'ta olduğu için imza da geçerdi.
     */
    const sonuc = await confirmUploadAction({ ...ONAY, key: 'post/baska_kayit/x.png' });

    expect(sonuc.ok === false && sonuc.error.fields?.key).toBeTruthy();
    expect(r2Mock.getObjectBytes).not.toHaveBeenCalled();
    expect(dbMock.attachment.create).not.toHaveBeenCalled();
  });

  it('nesne YOKSA anlaşılır hata — yükleme tamamlanmamış olabilir', async () => {
    r2Mock.getObjectBytes.mockResolvedValue(null);
    const sonuc = await confirmUploadAction(ONAY);

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('tamamlanmamış');
  });

  it('⚠️ GERÇEK BOYUT sınırı aşarsa reddediliyor — beyan değil, bayt', async () => {
    // İstemci `size: 100` demiş olabilir; sunucu gerçeğe bakıyor.
    r2Mock.getObjectBytes.mockResolvedValue(Buffer.alloc(11 * 1024 * 1024));
    const sonuc = await confirmUploadAction(ONAY);

    expect(sonuc.ok === false && sonuc.error.message).toContain('10 MB');
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledWith(ONAY.key);
    expect(dbMock.attachment.create).not.toHaveBeenCalled();
  });

  it('PDF kabul ediliyor, boyut alanları `null`', async () => {
    r2Mock.getObjectBytes.mockResolvedValue(Buffer.from('%PDF-1.7\n...'));
    dbMock.attachment.create.mockResolvedValueOnce({
      id: 'att_pdf',
      key: ONAY.key,
      mime: 'application/pdf',
      size: 12,
      width: null,
      height: null,
      entity: 'PROJECT',
      entityId: 'prj_1',
      order: 0,
      createdAt: new Date('2026-10-14T12:00:00.000Z'),
    });

    const sonuc = await confirmUploadAction(ONAY);
    expect(sonuc.ok).toBe(true);
    expect(dbMock.attachment.create.mock.calls[0]?.[0].data.width).toBeNull();
  });

  /* ───────────────────────────────────────────────────────────────────────
   * ⚠️⚠️ YETİM NESNE
   * ──────────────────────────────────────────────────────────────────── */

  it('⚠️ DB YAZIMI DÜŞERSE nesne HEMEN silinmeye çalışılıyor (telafi)', async () => {
    /*
     * Sıra: ÖNCE R2, SONRA DB. Başarısızlık penceresinde kalan şey yetim
     * NESNE (görünmez, gece işi alır), kırık REFERANS değil — ADR-018 bu
     * seçimi zaten yapmış ve temizlik işini öngörmüş.
     *
     * Telafi, yetim penceresini "gece işine kadar"dan "milisaniyeler"e indiriyor.
     */
    dbMock.attachment.create.mockRejectedValueOnce(new Error('db düştü'));
    const sonuc = await confirmUploadAction(ONAY);

    expect(sonuc.ok).toBe(false);
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledWith(ONAY.key);
  });

  it('⚠️ TELAFİ DE DÜŞERSE asıl hata KORUNUYOR — maskelenmiyor', async () => {
    /*
     * `deleteObjectQuietly` fırlatmıyor (sözleşmesi öyle), ama `false` dönüyor.
     * Kullanıcı DB hatasını görmeli, "silme başarısız" hatasını değil —
     * `writeAuditLog`ın aynı gerekçesi.
     */
    dbMock.attachment.create.mockRejectedValueOnce(new Error('db düştü'));
    r2Mock.deleteObjectQuietly.mockResolvedValue(false);

    const sonuc = await confirmUploadAction(ONAY);
    expect(sonuc.ok === false && sonuc.error.code).toBe('INTERNAL_ERROR');
  });

  it('BAŞARILI yolda nesne SİLİNMİYOR', async () => {
    await confirmUploadAction(ONAY);
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  /* ───────────────────────────────────────────────────────────────────────
   * DENETİM KAYDI
   * ──────────────────────────────────────────────────────────────────── */

  it('⚠️ diff ANAHTAR taşıyor, SAĞLAMA TOPLAMI taşımıyor', async () => {
    await confirmUploadAction(ONAY);
    const ozet = toDiffSummary(yazilanDiff());

    // Anahtar yetim nesne soruşturmasının tek tutamağı.
    expect(ozet.fields.sort()).toEqual(['key', 'mime', 'size', 'targetEntity']);
    // 64 karakterlik özet denetim sorusuna bir şey katmıyor ve satırı şişirir.
    expect(JSON.stringify(yazilanDiff())).not.toMatch(/[a-f0-9]{64}/);
  });
});

/* ===========================================================================
 * 3 — SİLME
 * ======================================================================== */

describe('deleteAttachmentAction', () => {
  it('⚠️ SIRA: ÖNCE DB SATIRI, SONRA R2 NESNESİ', async () => {
    /*
     * Yüklemenin TERSİ, ve sebebi aynı mantık: başarısızlık penceresinde
     * kalan şey yine yetim nesne olsun, kırık referans olmasın.
     */
    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok).toBe(true);
    expect(dbMock.attachment.delete).toHaveBeenCalledOnce();
    expect(r2Mock.deleteObjectQuietly).toHaveBeenCalledWith('project/prj_1/rnd.png');

    const dbSira = dbMock.attachment.delete.mock.invocationCallOrder[0] ?? 0;
    const r2Sira = r2Mock.deleteObjectQuietly.mock.invocationCallOrder[0] ?? 0;
    expect(dbSira).toBeLessThan(r2Sira);
  });

  it('⚠️ KULLANIMDAysa (P2003) NESNEYE DOKUNULMUYOR', async () => {
    /*
     * `onDelete: Restrict` gerçek bir kapı: eklenti kapak/CV olarak bağlıysa
     * DB silmesi düşüyor. Silme sırası DB'yi öne aldığı için nesne SAĞLAM
     * kalıyor — ters sırada nesne silinmiş, satır kalmış olurdu.
     */
    dbMock.attachment.delete.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );

    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.ok === false && sonuc.error.message).toContain('kapak');
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  it('⚠️ P2003 metni EKLENTİYE ÖZEL — "Seçilen dosya bulunamadı" DEĞİL', async () => {
    /*
     * T-050'de yazdığım varsayılan P2003 metni ("Seçilen dosya bulunamadı")
     * YANLIŞ YÖNÜ anlatıyor: orada eksik bir dosya seçilmişti, burada dosya
     * VAR ve KULLANILIYOR. `foreignKey` geçersiz kılması bu yüzden gerekli.
     */
    dbMock.attachment.delete.mockRejectedValueOnce(
      Object.assign(new Error('fk'), { code: 'P2003' }),
    );
    const sonuc = await deleteAttachmentAction({ id: 'att_1' });

    expect(sonuc.ok === false && sonuc.error.message).not.toContain('bulunamadı');
  });

  it('kayıt yoksa NOT_FOUND, silme denenmiyor', async () => {
    dbMock.attachment.findUnique.mockResolvedValueOnce(null);
    const sonuc = await deleteAttachmentAction({ id: 'yok' });

    expect(sonuc.ok === false && sonuc.error.code).toBe('NOT_FOUND');
    expect(dbMock.attachment.delete).not.toHaveBeenCalled();
    expect(r2Mock.deleteObjectQuietly).not.toHaveBeenCalled();
  });

  it('denetim kaydı silineni ANAHTARIYLA kaydediyor', async () => {
    await deleteAttachmentAction({ id: 'att_1' });
    const satir = dbMock.auditLog.create.mock.calls.at(-1)?.[0].data as { action: string };

    expect(satir.action).toBe('DELETE');
    expect(JSON.stringify(yazilanDiff())).toContain('project/prj_1/rnd.png');
  });
});
