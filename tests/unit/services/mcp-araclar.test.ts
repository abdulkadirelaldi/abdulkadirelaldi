import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * MCP ARAÇLARI (ADR-056) — BİRİM: servisler taklit; araçların karar dalları (arama sonucu yok/tek/çok,
 * geçersiz girdi, bulunamayan iş, bilinmeyen araç, servis hatası). Gerçek veritabanıyla akış
 * `tests/integration/oauth-mcp.test.ts`te.
 */

const m = vi.hoisted(() => ({
  fetchIsListesi: vi.fn(),
  fetchBugunGorevleri: vi.fn(),
  gorevOlustur: vi.fn(),
  gorevBitti: vi.fn(),
  gorevGuncelle: vi.fn(),
  gorevSil: vi.fn(),
  fetchBugunTakvim: vi.fn(),
  fetchHabitDay: vi.fn(),
  findUnique: vi.fn(),
  auditCreate: vi.fn(),
  fetchDukkanKayitlari: vi.fn(),
  paketSay: vi.fn(),
}));

vi.mock('@/server/services/gorev', async (orijinal) => ({
  ...(await orijinal<typeof import('@/server/services/gorev')>()),
  fetchIsListesi: m.fetchIsListesi,
  fetchBugunGorevleri: m.fetchBugunGorevleri,
  gorevOlustur: m.gorevOlustur,
  gorevBitti: m.gorevBitti,
  gorevGuncelle: m.gorevGuncelle,
  gorevSil: m.gorevSil,
}));
vi.mock('@/server/services/takvim', () => ({ fetchBugunTakvim: m.fetchBugunTakvim }));
vi.mock('@/server/services/dukkan', async (orijinal) => ({
  ...(await orijinal<typeof import('@/server/services/dukkan')>()),
  fetchDukkanKayitlari: m.fetchDukkanKayitlari,
  paketSay: m.paketSay,
}));
vi.mock('@/server/services/habit-gun', () => ({ fetchHabitDay: m.fetchHabitDay }));
vi.mock('@/server/db', () => ({
  db: { gorev: { findUnique: m.findUnique }, auditLog: { create: m.auditCreate } },
}));

const { aracCalistir } = await import('@/server/services/mcp-araclar');
const { GorevHatasi } = await import('@/server/services/gorev');
const { DukkanHatasi } = await import('@/server/services/dukkan');

const g = (p: Record<string, unknown> = {}) => ({
  id: 'g1',
  baslik: 'Garage — 4 reels',
  not: null,
  alan: 'KIYI_MEDYA',
  etiket: 'Garage',
  teslimGun: null,
  teslimDakika: null,
  tamamlandiAt: null,
  ...p,
});
const bosListe = { gecikmis: [], bugun: [], buHafta: [], sonra: [], tarihsiz: [], bitenler: [] };
const b = { userId: 'u', sonra: vi.fn() };
const yazi = (r: { content: { text: string }[] }) => r.content.map((c) => c.text).join('\n');

beforeEach(() => {
  vi.clearAllMocks();
  m.fetchIsListesi.mockResolvedValue(bosListe);
});

describe('okuma araçları', () => {
  it('bugün özeti: boş gün ve dolu gün (saatli + gün boyu etkinlik, kalan rutin)', async () => {
    m.fetchBugunGorevleri.mockResolvedValueOnce([]);
    m.fetchBugunTakvim.mockRejectedValueOnce(new Error('google yok'));
    m.fetchHabitDay.mockResolvedValueOnce({ items: [] });
    expect(yazi(await aracCalistir('bugun_ozeti', {}, b))).toContain('Kalan rutinler: yok');

    m.fetchBugunGorevleri.mockResolvedValueOnce([g({ teslimGun: '2020-01-01' })]);
    m.fetchBugunTakvim.mockResolvedValueOnce([
      { tumGun: true, baslangic: '2026-11-18T21:00:00Z', baslik: 'Teslim' },
      { tumGun: false, baslangic: '2026-11-18T06:30:00Z', baslik: 'Ders' },
    ]);
    m.fetchHabitDay.mockResolvedValueOnce({
      items: [
        { name: 'Kitap', durum: 'ISARETSIZ' },
        { name: 'Su', durum: 'YAPILDI' },
      ],
    });
    const t = yazi(await aracCalistir('bugun_ozeti', {}, b));
    expect(t).toContain('gün boyu Teslim');
    expect(t).toContain('09:30 Ders');
    expect(t).toContain('Kalan rutinler: Kitap');
  });

  it('listele: açık/biten, alan ve arama süzgeci, boş sonuç', async () => {
    m.fetchIsListesi.mockResolvedValue({
      ...bosListe,
      tarihsiz: [g(), g({ id: 'g2', baslik: 'Ödev', alan: 'OKUL', etiket: null })],
      bitenler: [g({ id: 'g3', tamamlandiAt: '2026-11-17T10:00:00Z' })],
    });
    expect(yazi(await aracCalistir('isleri_listele', { alan: 'OKUL' }, b))).toContain('1 iş');
    expect(yazi(await aracCalistir('isleri_listele', { ara: 'garaj reels' }, b))).toBe(
      'Eşleşen iş yok.',
    );
    expect(yazi(await aracCalistir('isleri_listele', { durum: 'biten' }, b))).toContain('✓');
  });
});

describe('yazma araçları', () => {
  it('ekle: geçersiz tarih reddedilir; geçerli ekleme kuyruğa girer', async () => {
    expect((await aracCalistir('is_ekle', { baslik: 'x', saat: '10:00' }, b)).isError).toBe(true);
    m.gorevOlustur.mockResolvedValueOnce(g());
    const r = await aracCalistir('is_ekle', { baslik: 'Garage — 4 reels' }, b);
    expect(yazi(r)).toContain('Eklendi');
    expect(b.sonra).toHaveBeenCalledWith('g1');
  });

  it('bitti: id/ara yoksa, eşleşme yoksa, çoksa hata; tek eşleşmede tik', async () => {
    expect((await aracCalistir('is_bitti', {}, b)).isError).toBe(true);
    expect(yazi(await aracCalistir('is_bitti', { ara: 'yok' }, b))).toContain(
      'eşleşen açık iş yok',
    );
    m.fetchIsListesi.mockResolvedValue({ ...bosListe, bugun: [g(), g({ id: 'g2' })] });
    expect(yazi(await aracCalistir('is_bitti', { ara: 'garage' }, b))).toContain('2 işe uyuyor');
    m.fetchIsListesi.mockResolvedValue({ ...bosListe, bugun: [g()] });
    m.gorevBitti.mockResolvedValueOnce(g({ tamamlandiAt: 'x' }));
    expect(yazi(await aracCalistir('is_bitti', { ara: 'GARAGE' }, b))).toContain('Bitti');
    expect(m.gorevBitti).toHaveBeenCalledWith({ id: 'g1', bitti: true });
  });

  it('geri al, sil (Google etkinliği kuyruğa), servis hatası araç hatasına döner', async () => {
    m.gorevBitti.mockResolvedValueOnce(g());
    expect(yazi(await aracCalistir('is_geri_al', { id: 'g1' }, b))).toContain('Yeniden açıldı');
    m.gorevSil.mockResolvedValueOnce({ id: 'g1', googleEtkinlikId: 'e1' });
    expect(yazi(await aracCalistir('is_sil', { id: 'g1' }, b))).toBe('Silindi.');
    expect(b.sonra).toHaveBeenCalledWith('g1', 'e1');
    m.gorevSil.mockRejectedValueOnce(new GorevHatasi('NOT_FOUND', 'Görev bulunamadı.'));
    const r = await aracCalistir('is_sil', { id: 'yok' }, b);
    expect(r).toMatchObject({ isError: true });
  });

  it('güncelle: bulunamayan iş; saat korunur; gün kaldırılınca saat düşer; geçersiz girdi', async () => {
    m.findUnique.mockResolvedValueOnce(null);
    expect(yazi(await aracCalistir('is_guncelle', { id: 'yok' }, b))).toBe('İş bulunamadı.');

    const satir = { ...g(), teslimGun: new Date('2026-11-28T00:00:00Z'), teslimDakika: 600 };
    m.findUnique.mockResolvedValueOnce(satir);
    m.gorevGuncelle.mockImplementationOnce(async (v: unknown) => ({ ...g(), ...(v as object) }));
    await aracCalistir('is_guncelle', { id: 'g1', baslik: 'Yeni' }, b);
    expect(m.gorevGuncelle).toHaveBeenLastCalledWith(
      expect.objectContaining({ baslik: 'Yeni', teslimGun: '2026-11-28', teslimSaat: '10:00' }),
    );

    m.findUnique.mockResolvedValueOnce(satir);
    m.gorevGuncelle.mockImplementationOnce(async (v: unknown) => ({ ...g(), ...(v as object) }));
    await aracCalistir('is_guncelle', { id: 'g1', gun: null, etiket: null, not: null }, b);
    expect(m.gorevGuncelle).toHaveBeenLastCalledWith(
      expect.objectContaining({ teslimGun: null, teslimSaat: null, etiket: null }),
    );

    m.findUnique.mockResolvedValueOnce({ ...satir, teslimGun: null, teslimDakika: null });
    expect((await aracCalistir('is_guncelle', { id: 'g1', saat: '10:00' }, b)).isError).toBe(true);
  });
});

describe('paket araçları (ADR-058)', () => {
  const kayit = (n: number) => ({
    anahtar: 'd:garage',
    driveUrl: null,
    not: null,
    paket: [
      { tur: 'reels', n, hedef: 4 },
      { tur: 'post', n: 0, hedef: 8 },
      { tur: 'story', n: 0, hedef: 8 },
    ],
  });

  it('listele: paketsizler atlanır, boşsa söyler', async () => {
    m.fetchDukkanKayitlari.mockResolvedValueOnce({});
    expect(yazi(await aracCalistir('paketleri_listele', {}, b))).toContain('Paketi tanımlı');
    m.fetchDukkanKayitlari.mockResolvedValueOnce({
      'd:garage': kayit(3),
      'd:leyla': { anahtar: 'd:leyla', driveUrl: null, not: null, paket: null },
    });
    const t = yazi(await aracCalistir('paketleri_listele', {}, b));
    expect(t).toContain('Garage: Reels 3/4, Gönderi 0/8, Story 0/8');
    expect(t).not.toContain('Leyla');
  });

  it('say: adet kadar artırır, geri alır, paketsiz dükkânda hata', async () => {
    m.paketSay.mockResolvedValue(kayit(2));
    const r = await aracCalistir('paket_say', { musteri: 'Garage', tur: 'reels', adet: 2 }, b);
    expect(yazi(r)).toContain('Garage: Reels 2/4');
    expect(m.paketSay).toHaveBeenCalledTimes(2);
    expect(m.paketSay).toHaveBeenLastCalledWith(
      { anahtar: 'd:garage', tur: 'reels', fark: 1 },
      expect.stringMatching(/^\d{4}-\d{2}$/),
    );
    await aracCalistir('paket_say', { musteri: 'Garage', tur: 'reels', geri_al: true }, b);
    expect(m.paketSay).toHaveBeenLastCalledWith(
      expect.objectContaining({ fark: -1 }),
      expect.any(String),
    );
    m.paketSay.mockRejectedValueOnce(
      new DukkanHatasi('NOT_FOUND', 'Bu dükkânın aylık paketi yok.'),
    );
    expect((await aracCalistir('paket_say', { musteri: 'Leyla', tur: 'post' }, b)).isError).toBe(
      true,
    );
    expect((await aracCalistir('paket_say', { musteri: ' ', tur: 'post' }, b)).isError).toBe(true);
  });

  it('ekle ve güncelle acil işaretini geçirir; listede [ACİL]', async () => {
    m.gorevOlustur.mockResolvedValueOnce(g({ acil: true }));
    const r = await aracCalistir('is_ekle', { baslik: 'x', acil: true }, b);
    expect(m.gorevOlustur).toHaveBeenLastCalledWith(expect.objectContaining({ acil: true }));
    expect(yazi(r)).toContain('[ACİL]');
  });
});

describe('dağıtıcı', () => {
  it('bilinmeyen araç ve şemaya uymayan girdi hata döner; beklenmeyen hata yukarı fırlar', async () => {
    expect(yazi(await aracCalistir('yok', {}, b))).toContain('Bilinmeyen araç');
    expect((await aracCalistir('is_geri_al', { id: 1 }, b)).isError).toBe(true);
    expect((await aracCalistir('is_ekle', { baslik: 'x', fazla: 1 }, b)).isError).toBe(true);
    m.gorevBitti.mockRejectedValueOnce(new Error('beklenmeyen'));
    await expect(aracCalistir('is_geri_al', { id: 'g1' }, b)).rejects.toThrow('beklenmeyen');
  });
});
