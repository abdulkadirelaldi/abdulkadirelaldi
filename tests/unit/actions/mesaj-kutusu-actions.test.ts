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
const userFindUnique = vi.hoisted(() => vi.fn());
vi.mock('@/server/db', () => ({
  db: { auditLog: { create: auditCreate }, user: { findUnique: userFindUnique } },
}));
/*
 * ADR-035/B — YAZMA KAPISI (T-046).
 *
 * `currentActorId()` artık `writesRevoked()` çağırıyor, yani her Server Action
 * `user.findUnique` ile `writesValidFrom` okuyor. İki şey taklide eklendi:
 *
 *   - `db.user.findUnique` → `{ writesValidFrom: null }` ("hiç geçersizleştirilmedi")
 *   - oturuma `tokenIssuedAt` → kapı FAIL-CLOSED; `iat` taşımayan bir oturum
 *     yazma yetkisiz sayılıyor. Bu kasıtlı ve `yazma-kapisi.test.ts` ölçüyor.
 */

const svc = vi.hoisted(() => ({
  fetchContactMessageById: vi.fn(),
  fetchContactMessages: vi.fn(),
  updateContactMessageStatus: vi.fn(),
}));

vi.mock('@/server/services/contact-message', () => svc);

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
  ip: '203.0.113.7',
  userAgent: 'UA',
};

function denetimKaydi(): Record<string, unknown> {
  expect(auditCreate).toHaveBeenCalledOnce();
  return (auditCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
}

/** Jetonun verildiği an — yazma kapısının eşiği (ADR-035/B). */
const OTURUM_IAT = Math.floor(Date.parse('2026-09-20T12:00:00.000Z') / 1000);

beforeEach(() => {
  userFindUnique.mockResolvedValue({ writesValidFrom: null });
  auth.mockResolvedValue({ user: { id: 'kullanici-1' }, tokenIssuedAt: OTURUM_IAT });
  auditCreate.mockResolvedValue({});
  svc.fetchContactMessageById.mockResolvedValue(MESAJ);
  svc.updateContactMessageStatus.mockResolvedValue({ ...MESAJ, isRead: true });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const eylemler = async () => ({ ...(await import('@/server/actions/contact-message')) });

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
    auth.mockResolvedValue({ user: {}, tokenIssuedAt: OTURUM_IAT });
    const { archiveContactMessageAction } = await import('@/server/actions/contact-message');
    expect((await archiveContactMessageAction({ id: ID })).ok).toBe(false);
  });

  it('dört eylemin tamamı listede — kapsam eksiksiz', async () => {
    /*
     * 4 mesaj kutusu eylemi. Mesajı işe dönüştürme ve iş eylemleri 2026-10-29'da
     * iş modülüyle kaldırıldı (8 → 4). Sayı, yeni bir eylem eklendiğinde §8.6
     * kapsamının unutulmaması için duruyor (T-038).
     */
    expect(Object.keys(await eylemler())).toHaveLength(4);
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
});
