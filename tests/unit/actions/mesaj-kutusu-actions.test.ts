import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiResponse } from '@/types';

/**
 * MESAJ KUTUSU VE DÖNÜŞÜM SERVER ACTION'LARI — §4.2, §6, §7.1, §8.6, ADR-022.
 *
 * Taklit gerekçeleri `content-actions.test.ts` ile aynı: `next-auth` node
 * ortamında yüklenemiyor, `revalidateTag` gözlenmeli, `pnpm test` DB'siz koşar.
 *
 * `writeAuditLog` yine TAKLİT EDİLMİYOR — ADR-022'nin "sonuçlar AuditLog'a"
 * kuralı onun gerçek davranışıyla (redaksiyon dahil) sınanmalı.
 */

const auth = vi.hoisted(() => vi.fn());
const revalidateTag = vi.hoisted(() => vi.fn());
const auditCreate = vi.hoisted(() => vi.fn());

vi.mock('@/server/auth', () => ({ auth }));
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: vi.fn() }));
vi.mock('@/server/db', () => ({ db: { auditLog: { create: auditCreate } } }));

const svc = vi.hoisted(() => ({
  fetchContactMessageById: vi.fn(),
  fetchContactMessages: vi.fn(),
  updateContactMessageStatus: vi.fn(),
  convertMessageToJob: vi.fn(),
  findJobByContactMessageId: vi.fn(),
}));

vi.mock('@/server/services/contact-message', () => svc);
vi.mock('@/server/services/job', () => svc);

const ID = 'clx0000000000000000000001';

const MESAJ = {
  id: ID,
  name: 'Ayşe Yılmaz',
  email: 'ayse@ornek.com',
  phone: '+90 555 000 00 00',
  subject: 'Teklif',
  preview: 'Merhaba, bir kurumsal site yaptırmak istiyorum.',
  message: 'Merhaba, bir kurumsal site yaptırmak istiyorum.',
  sourcePage: '/iletisim',
  isRead: false,
  isSpam: false,
  honeypotHit: false,
  spamScore: 0,
  repliedAt: '2026-09-01T10:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-09-09T12:00:00.000Z',
  convertedJobId: null,
  ip: '203.0.113.7',
  userAgent: 'UA',
};

function denetimKaydi(): Record<string, unknown> {
  expect(auditCreate).toHaveBeenCalledOnce();
  return (auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
}

beforeEach(() => {
  auth.mockResolvedValue({ user: { id: 'kullanici-1' } });
  auditCreate.mockResolvedValue({});
  svc.fetchContactMessageById.mockResolvedValue(MESAJ);
  svc.updateContactMessageStatus.mockResolvedValue({ ...MESAJ, isRead: true });
  svc.findJobByContactMessageId.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const eylemler = async () => {
  const [mesaj, is] = await Promise.all([
    import('@/server/actions/contact-message'),
    import('@/server/actions/job'),
  ]);
  return { ...mesaj, ...is };
};

/* ===========================================================================
 * §8.6 — HER ACTION TEK TEK
 * ======================================================================== */

describe('§8.6 — yetkisiz erişim', () => {
  it('oturum YOKSA hepsi UNAUTHORIZED ve servise HİÇ gitmiyor', async () => {
    auth.mockResolvedValue(null);
    const hepsi = await eylemler();

    for (const [ad, eylem] of Object.entries(hepsi)) {
      const sonuc = (await (eylem as (raw: unknown) => Promise<ApiResponse<unknown>>)({})) as {
        ok: boolean;
        error?: { code: string };
      };
      expect(sonuc.ok, `${ad} oturumsuz geçirdi`).toBe(false);
      expect(sonuc.error?.code, `${ad} yanlış kod döndü`).toBe('UNAUTHORIZED');
    }

    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('oturum var ama `user.id` yoksa yine UNAUTHORIZED', async () => {
    auth.mockResolvedValue({ user: {} });
    const { archiveContactMessageAction } = await import('@/server/actions/contact-message');
    expect((await archiveContactMessageAction({ id: ID })).ok).toBe(false);
  });

  it('beş eylemin tamamı listede — kapsam eksiksiz', async () => {
    // 4 mesaj kutusu eylemi + 1 dönüşüm. Sayı sabit ki yeni bir eylem
    // eklendiğinde bu test kırılsın ve §8.6 kapsamı unutulmasın.
    expect(Object.keys(await eylemler())).toHaveLength(5);
  });

  it('OKUMALAR bu dosyadan İHRAÇ EDİLMİYOR — §7.1', async () => {
    // `'use server'` dosyasından ihraç edilen her işlev ağdan çağrılabilir bir
    // POST ucuna dönüşür; okumaları böyle açmak boşuna saldırı yüzeyi olurdu.
    const mesajEylemleri = await import('@/server/actions/contact-message');
    expect(mesajEylemleri).not.toHaveProperty('listContactMessages');
    expect(mesajEylemleri).not.toHaveProperty('getContactMessage');
  });
});

/* ===========================================================================
 * DURUM EYLEMLERİ
 * ======================================================================== */

describe('markContactMessageReadAction', () => {
  it('okundu işaretliyor, AuditLog UPDATE yazıyor', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    const sonuc = await markContactMessageReadAction({ id: ID, isRead: true });

    expect(sonuc.ok).toBe(true);
    expect(svc.updateContactMessageStatus).toHaveBeenCalledWith({ id: ID, isRead: true });
    expect(denetimKaydi()).toMatchObject({
      actorId: 'kullanici-1',
      action: 'UPDATE',
      entity: 'ContactMessage',
      entityId: ID,
    });
  });

  it('isRead verilmezse varsayılan `true` — düğmenin ana kullanımı', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    await markContactMessageReadAction({ id: ID });
    expect(svc.updateContactMessageStatus).toHaveBeenCalledWith({ id: ID, isRead: true });
  });

  /** ⚠️ KABUL KRİTERİ: repliedAt/archivedAt BOZULMUYOR. */
  it('servise SADECE isRead geçiyor — repliedAt/archivedAt gönderilmiyor', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    await markContactMessageReadAction({ id: ID, isRead: true });

    const gecen = svc.updateContactMessageStatus.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(gecen).sort()).toEqual(['id', 'isRead']);
  });

  it('mesaj yoksa NOT_FOUND — güncelleme denenmiyor', async () => {
    svc.fetchContactMessageById.mockResolvedValue(null);
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    const sonuc = await markContactMessageReadAction({ id: ID });

    expect(sonuc.ok).toBe(false);
    expect(svc.updateContactMessageStatus).not.toHaveBeenCalled();
  });

  it('geçersiz id → VALIDATION_ERROR (§8.8)', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    expect((await markContactMessageReadAction({ id: '' })).ok).toBe(false);
    expect(svc.updateContactMessageStatus).not.toHaveBeenCalled();
  });
});

describe('markContactMessageSpamAction', () => {
  it('isSpam yazıyor; spamScore/honeypotHit’e DOKUNMUYOR', async () => {
    const { markContactMessageSpamAction } = await import('@/server/actions/contact-message');
    await markContactMessageSpamAction({ id: ID, isSpam: true });

    const gecen = svc.updateContactMessageStatus.mock.calls[0]?.[0] as Record<string, unknown>;
    // `spamScore`/`honeypotHit` ÖLÇÜMDÜR (T-027), `isSpam` KARARDIR.
    // Ölçümü sonradan düzeltmek işaretlemenin izini silerdi.
    expect(gecen).not.toHaveProperty('spamScore');
    expect(gecen).not.toHaveProperty('honeypotHit');
  });
});

describe('archiveContactMessageAction', () => {
  it('archivedAt zaman damgası yazıyor ve AuditAction.ARCHIVE düşüyor', async () => {
    const { archiveContactMessageAction } = await import('@/server/actions/contact-message');
    const sonuc = await archiveContactMessageAction({ id: ID });

    expect(sonuc.ok).toBe(true);
    const gecen = svc.updateContactMessageStatus.mock.calls[0]?.[0] as { archivedAt: string };
    expect(typeof gecen.archivedAt).toBe('string');
    expect(Number.isNaN(Date.parse(gecen.archivedAt))).toBe(false);
    expect(denetimKaydi()).toMatchObject({ action: 'ARCHIVE', entity: 'ContactMessage' });
  });

  it('arşivden çıkarma `archivedAt: null` yazıyor', async () => {
    const { unarchiveContactMessageAction } = await import('@/server/actions/contact-message');
    await unarchiveContactMessageAction({ id: ID });
    expect(svc.updateContactMessageStatus).toHaveBeenCalledWith({ id: ID, archivedAt: null });
  });
});

/* ===========================================================================
 * §8.20 — DENETİM KAYDINDA İÇERİK VE KİMLİK YOK
 * ======================================================================== */

describe('§8.20 — AuditLog diff’i', () => {
  it('mesaj GÖVDESİ, AD ve E-POSTA denetim kaydına YAZILMIYOR', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    await markContactMessageReadAction({ id: ID });

    const yazilan = JSON.stringify(denetimKaydi());
    // Ziyaretçinin serbest metni `AuditLog`a kopyalanırsa yedeklere (§8.21) girer.
    expect(yazilan).not.toContain('kurumsal site');
    expect(yazilan).not.toContain('Ayşe Yılmaz');
    expect(yazilan).not.toContain('ayse@ornek.com');
  });

  it('diff YALNIZCA durum alanlarını taşıyor', async () => {
    const { markContactMessageReadAction } = await import('@/server/actions/contact-message');
    await markContactMessageReadAction({ id: ID });

    const diff = denetimKaydi().diff as Record<string, unknown>;
    // `buildDiff` yalnızca DEĞİŞENİ taşır; burada değişen tek şey `isRead`.
    expect(Object.keys(diff)).toEqual(['isRead']);
    expect(diff.isRead).toEqual({ before: false, after: true });
  });
});

/* ===========================================================================
 * ADR-029 — ETİKET DÜŞÜRÜLMÜYOR (ölçülmüş karar)
 * ======================================================================== */

describe('ADR-029 — mesaj kutusu public’te görünmüyor', () => {
  it('hiçbir eylem revalidateTag ÇAĞIRMIYOR', async () => {
    const { markContactMessageReadAction, archiveContactMessageAction } =
      await import('@/server/actions/contact-message');
    await markContactMessageReadAction({ id: ID });
    await archiveContactMessageAction({ id: ID });

    /*
     * `ContactMessage` `ContentEntity` birleşiminde YOK, hiçbir `cachedRead`
     * onu okumuyor, `getSiteStats` yalnızca Project+Experience topluyor ve
     * panel rotaları dinamik. Düşürülecek etiket yok; simetri uğruna çağırmak
     * ölü kod olurdu ve "mesaj kutusu önbelleklidir" diye yanlış bilgi verirdi.
     */
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('dönüşüm de etiket düşürmüyor — Job ve Client da public değil', async () => {
    svc.convertMessageToJob.mockResolvedValue({
      job: { id: 'is_1', title: 'X', status: 'LEAD', createdAt: MESAJ.createdAt },
      client: { id: 'musteri_1', name: 'A', email: 'a@b.com', created: true, isArchived: false },
    });

    const { convertMessageToJobAction } = await import('@/server/actions/job');
    await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

/* ===========================================================================
 * §6 DÖNÜŞÜMÜ
 * ======================================================================== */

describe('convertMessageToJobAction — §6 kritik ilişki', () => {
  const BASARILI = {
    job: { id: 'is_1', title: 'Kurumsal site', status: 'LEAD', createdAt: MESAJ.createdAt },
    client: {
      id: 'musteri_1',
      name: 'Ayşe Yılmaz',
      email: 'ayse@ornek.com',
      created: true,
      isArchived: false,
    },
  };

  it('mesajın GÖNDEREN bilgisini servise taşıyor', async () => {
    svc.convertMessageToJob.mockResolvedValue(BASARILI);
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({
      contactMessageId: ID,
      title: 'Kurumsal site',
    });

    expect(sonuc.ok).toBe(true);
    expect(svc.convertMessageToJob).toHaveBeenCalledWith({
      contactMessageId: ID,
      title: 'Kurumsal site',
      contact: { name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', phone: '+90 555 000 00 00' },
    });
  });

  it('sonuç hem işi hem MÜŞTERİNİN yeni mi olduğunu bildiriyor', async () => {
    svc.convertMessageToJob.mockResolvedValue(BASARILI);
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    if (!sonuc.ok) throw new Error('beklenmedik hata');
    expect(sonuc.data.job.id).toBe('is_1');
    // Kullanıcıya söylenecek şey iki parçalı: iş açıldı VE müşteri yeni mi.
    expect(sonuc.data.client.created).toBe(true);
  });

  it('AuditLog CREATE / Job yazıyor, clientCreated bilgisiyle', async () => {
    svc.convertMessageToJob.mockResolvedValue(BASARILI);
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    await convertMessageToJobAction({ contactMessageId: ID, title: 'Kurumsal site' });

    const kayit = denetimKaydi();
    expect(kayit).toMatchObject({ action: 'CREATE', entity: 'Job', entityId: 'is_1' });
    expect(kayit.diff).toMatchObject({
      contactMessageId: ID,
      clientId: 'musteri_1',
      clientCreated: true,
    });
  });

  it('§8.20 — dönüşüm denetim kaydında gönderenin adı/e-postası YOK', async () => {
    svc.convertMessageToJob.mockResolvedValue(BASARILI);
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    const yazilan = JSON.stringify(denetimKaydi());
    expect(yazilan).not.toContain('ayse@ornek.com');
    expect(yazilan).not.toContain('Ayşe Yılmaz');
  });

  it('mesaj yoksa NOT_FOUND', async () => {
    svc.fetchContactMessageById.mockResolvedValue(null);
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    expect(sonuc.ok).toBe(false);
    expect(svc.convertMessageToJob).not.toHaveBeenCalled();
  });

  it('başlıksız istek → VALIDATION_ERROR', async () => {
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: '' });

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('VALIDATION_ERROR');
    expect(sonuc.error.fields?.title).toBeTruthy();
  });

  /* ======================= ÇİFT DÖNÜŞÜM — İKİ KATMAN ===================== */

  it('ÖN KONTROL: zaten dönüştürülmüşse CONFLICT ve İŞİN KİMLİĞİ dönüyor', async () => {
    svc.findJobByContactMessageId.mockResolvedValue({ id: 'is_eski', title: 'Önceki iş' });
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: 'Yeni' });

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('CONFLICT');
    expect(sonuc.error.message).toContain('yalnızca bir işe');
    // Frontend "işi göster" bağlantısı kurabilsin.
    expect(sonuc.error.fields?.jobId).toBe('is_eski');
    expect(svc.convertMessageToJob).not.toHaveBeenCalled();
  });

  /**
   * YARIŞ DURUMU: iki eşzamanlı istek ön kontrolü birlikte geçebilir.
   * `Job.contactMessageId @unique` (ADR-017) gerçek güvencedir ve P2002 verir.
   */
  it('YARIŞ: P2002 de aynı CONFLICT metnini veriyor — slug mesajı DEĞİL', async () => {
    svc.convertMessageToJob.mockRejectedValue(
      Object.assign(new Error('unique violation'), { code: 'P2002' }),
    );
    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) throw new Error('beklenmedik başarı');
    expect(sonuc.error.code).toBe('CONFLICT');
    // Varsayılan P2002 metni slug'a özeldi ve burada anlamsız olurdu.
    expect(sonuc.error.message).not.toContain('slug');
    expect(sonuc.error.message).toContain('yalnızca bir işe');
  });

  it('beklenmeyen hata → INTERNAL_ERROR, ayrıntı SIZMIYOR (§8.20)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    svc.convertMessageToJob.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5433'));

    const { convertMessageToJobAction } = await import('@/server/actions/job');
    const sonuc = await convertMessageToJobAction({ contactMessageId: ID, title: 'X' });

    expect(JSON.stringify(sonuc)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(sonuc)).not.toContain('5433');
  });
});
