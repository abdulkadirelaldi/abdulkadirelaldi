import { describe, expect, it } from 'vitest';

import { planla, vapidAyarlari, type PlanGirdisi } from '@/server/services/bildirim';

const temel: PlanGirdisi = {
  gun: '2026-10-30',
  saat: 10,
  tercih: { borc: true, aliskanlik: true, su: true },
  borclar: [],
  kalanAliskanliklar: [],
  suMl: 4000,
};

describe('planla — ne zaman ne gider', () => {
  it('borç: 2 gün önce ve ödeme günü, 09–21 arası', () => {
    const borclar = [{ id: 'kk', ad: 'Kredi kartı', odemeGunu: 1, tutar: '4.500,00 ₺' }];
    // 30 Ekim → 2 gün sonra 1 Kasım (ay geçişi)
    const once = planla({ ...temel, borclar });
    expect(once).toEqual([
      expect.objectContaining({
        tur: 'borc',
        anahtar: 'kk:2026-11-01',
        baslik: 'Ödeme yaklaşıyor',
        govde: 'Kredi kartı — 2 gün sonra · 4.500,00 ₺',
      }),
    ]);
    const gunu = planla({ ...temel, gun: '2026-11-01', borclar });
    expect(gunu[0]).toMatchObject({ baslik: 'Bugün ödeme günü', anahtar: 'kk:2026-11-01' });
    // İki bildirim AYNI anahtarı paylaşmıyor? Paylaşıyor ama farklı GÜNLERDE — kayıt (tür, anahtar, gün).
    expect(planla({ ...temel, saat: 8, borclar })).toEqual([]);
    expect(planla({ ...temel, saat: 21, borclar })).toEqual([]);
  });

  it("⚠️ 31'inde ödenen borç kısa ayda son güne düşer", () => {
    const borclar = [{ id: 'k', ad: 'Kira', odemeGunu: 31, tutar: null }];
    expect(planla({ ...temel, gun: '2027-02-28', borclar })[0]).toMatchObject({
      baslik: 'Bugün ödeme günü',
      govde: 'Kira',
    });
    expect(planla({ ...temel, gun: '2027-02-26', borclar })[0]).toMatchObject({
      baslik: 'Ödeme yaklaşıyor',
    });
  });

  it('alışkanlık: 21:00 sonrası, kalan varsa', () => {
    const kalan = ['Kitap oku', 'İngilizce'];
    expect(planla({ ...temel, saat: 20, kalanAliskanliklar: kalan })).toEqual([]);
    expect(planla({ ...temel, saat: 21, kalanAliskanliklar: kalan })).toEqual([
      expect.objectContaining({
        baslik: 'Bugün 2 alışkanlık kaldı',
        govde: 'Kitap oku, İngilizce',
      }),
    ]);
    expect(planla({ ...temel, saat: 22, kalanAliskanliklar: [] })).toEqual([]);
  });

  it('su: yalnızca 11/15/18 penceresinde ve hedefin altındaysa; birikmez', () => {
    const az = { ...temel, suMl: 1250 };
    expect(planla({ ...az, saat: 10 })).toEqual([]);
    expect(planla({ ...az, saat: 11 })).toEqual([
      expect.objectContaining({ anahtar: 's11', govde: 'Bugün 1,25 L içtin, hedef 3,5 L.' }),
    ]);
    expect(planla({ ...az, saat: 14 })).toEqual([]);
    // 19:00'da kalkan sunucu yalnızca 18'in hatırlatmasını gönderir, sabahınkileri değil.
    expect(planla({ ...az, saat: 19 }).map((b) => b.anahtar)).toEqual(['s18']);
    expect(planla({ ...temel, saat: 15, suMl: 3500 })).toEqual([]);
  });

  it('kapalı tercih gönderilmez', () => {
    const kapali = { borc: false, aliskanlik: false, su: false };
    expect(
      planla({
        ...temel,
        saat: 21,
        tercih: kapali,
        suMl: 0,
        kalanAliskanliklar: ['x'],
        borclar: [{ id: 'k', ad: 'K', odemeGunu: 30, tutar: null }],
      }),
    ).toEqual([]);
  });
});

describe('vapidAyarlari', () => {
  it('anahtar yoksa özellik kapalı', () => {
    expect(vapidAyarlari({})).toBeNull();
    expect(vapidAyarlari({ VAPID_PUBLIC_KEY: 'a', VAPID_PRIVATE_KEY: 'b' })).toMatchObject({
      publicKey: 'a',
      subject: 'mailto:bildirim@abdulkadirelaldi.com',
    });
  });
});
