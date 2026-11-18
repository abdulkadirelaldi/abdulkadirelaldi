import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { takvimEtkinligiSchema } from '@/lib/schemas/takvim';
import {
  donusAdresi,
  etkinlikGovdesi,
  googleAyarli,
  panelEtkinligiGovdesi,
  yeniDurum,
  yetkiAdresi,
} from '@/server/services/google-takvim';

/**
 * GOOGLE TAKVİM — saf çeviriler (ADR-051/053). Ağ ve veritabanı yok; eşitleme akışı
 * `tests/integration/google-takvim.test.ts`te.
 */

const ESKI = { ...process.env };
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ornek.test/';
  process.env.GOOGLE_CLIENT_ID = 'istemci';
  process.env.GOOGLE_CLIENT_SECRET = 'gizli';
});
afterEach(() => {
  process.env = { ...ESKI };
});

describe('ayar ve izin adresi', () => {
  it('anahtar yoksa kapalı; dönüş adresi siteden; izin adresi offline + consent + state', () => {
    expect(googleAyarli()).toBe(true);
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(googleAyarli()).toBe(false);
    expect(donusAdresi()).toBe('https://ornek.test/api/v1/panel/google/donus');
    const d = yeniDurum();
    expect(d).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const u = new URL(yetkiAdresi(d));
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('state')).toBe(d);
    expect(u.searchParams.get('scope')).toContain('calendar.events');
  });
});

describe('görev → etkinlik', () => {
  const temel = {
    id: 'g',
    baslik: 'Rapor',
    not: 'ayrıntı',
    alan: 'OKUL' as const,
    etiket: null,
    teslimGun: '2026-11-30',
    teslimDakika: null,
    bitti: false,
  };
  it('notlu, etiketsiz, site adresi yoksa bağlantısız açıklama', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const e = etkinlikGovdesi(temel);
    expect(e.description).toBe('Okul\n\nayrıntı');
    expect(e.colorId).toBe('3');
  });
});

describe('panel formu → Google etkinliği', () => {
  const temel = {
    baslik: 'Toplantı',
    aciklama: 'gündem',
    konum: 'Ofis',
    kategori: 'TOPLANTI',
    tumGun: false,
    baslangicGun: '2026-11-20',
    baslangicSaat: '10:00',
    bitisGun: '2026-11-20',
    bitisSaat: '11:00',
    tekrar: { tur: 'YOK', aralik: 1, gunler: [], bitisGun: null, sayi: null },
    hatirlatmalar: [],
  };
  const yap = (p: Record<string, unknown>) =>
    panelEtkinligiGovdesi(takvimEtkinligiSchema.parse({ ...temel, ...p }));

  it('tekrarsız: açıklama ve konum taşınır, kural yok, alarmsız', () => {
    const e = yap({});
    expect(e).toMatchObject({ description: 'gündem', location: 'Ofis', visibility: 'private' });
    expect(e.recurrence).toBeUndefined();
    expect(e.reminders.overrides).toEqual([]);
  });

  it.each([
    ['GUNLUK', { sayi: 5 }, 'RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5'],
    ['AYLIK', {}, 'RRULE:FREQ=MONTHLY;INTERVAL=2'],
    ['YILLIK', {}, 'RRULE:FREQ=YEARLY;INTERVAL=2'],
    ['HAFTALIK', { gunler: [3, 7] }, 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE,SU'],
  ])('%s kuralı', (tur, ek, beklenen) => {
    const e = yap({
      aciklama: null,
      konum: null,
      tekrar: { tur, aralik: 2, gunler: [], bitisGun: null, sayi: null, ...ek },
    });
    expect(e.recurrence).toEqual([beklenen]);
    expect('description' in e).toBe(false);
    expect('location' in e).toBe(false);
  });
});
