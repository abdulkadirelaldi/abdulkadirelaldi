import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/server/db';
import { dolapOlustur } from '@/server/services/masa';
import {
  IS_OMRU_MS,
  isAl,
  isBitir,
  isSesi,
  kopruAnahtariDogrula,
  kopruAnahtariUret,
  yaziyiYenidenSirala,
} from '@/server/services/masa-koprusu';

/**
 * MAC KÖPRÜSÜ — gerçek PostgreSQL (ADR-049 M6). İş sırası, eşzamanlı alım, süresi geçen işin
 * geri dönmesi, yalnızca işlenen işin indirilebilmesi, anahtar ve bitiş akışları.
 */
const ONEK = 'zzit-masa-kopru';
const KULLANICI = `${ONEK}@ornek.test`;
let userId = '';
let dolapId = '';

const ses = (baslik: string, ek: Record<string, unknown> = {}) =>
  db.masaOgesi.create({
    data: {
      dolapId,
      tur: 'SES',
      baslik: `${ONEK} ${baslik}`,
      durum: 'HAZIR',
      mime: 'audio/mp4',
      boyut: 1000,
      yaziDurumu: 'SIRADA',
      ...ek,
    },
    select: { id: true },
  });

const temizle = async () => {
  const d = (
    await db.dolap.findMany({ where: { ad: { startsWith: ONEK } }, select: { id: true } })
  ).map((x) => x.id);
  const o = (
    await db.masaOgesi.findMany({ where: { dolapId: { in: d } }, select: { id: true } })
  ).map((x) => x.id);
  await db.attachment.deleteMany({ where: { entity: 'MASA_OGESI', entityId: { in: o } } });
  await db.masaOgesi.deleteMany({ where: { id: { in: o } } });
  await db.dolap.deleteMany({ where: { id: { in: d } } });
};

beforeAll(async () => {
  userId = (
    await db.user.upsert({
      where: { email: KULLANICI },
      create: { email: KULLANICI, name: ONEK, passwordHash: 'kullanilmaz' },
      update: {},
      select: { id: true },
    })
  ).id;
});
beforeEach(async () => {
  await temizle();
  dolapId = (await dolapOlustur({ ad: `${ONEK} Okul`, emoji: '🎓', katman: 'OKUL' })).id;
});
afterAll(async () => {
  await temizle();
  await db.masaKoprusu.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { email: KULLANICI } });
  await db.$disconnect();
});

const benimki = async (simdi?: Date) => {
  const is = await isAl(simdi);
  return is && is.baslik.startsWith(ONEK) ? is : null;
};

describe('Mac köprüsü', () => {
  it('anahtar: üretilen doğrulanır ve son kullanım yazılır; yenisi eskisini geçersiz kılar', async () => {
    const a = await kopruAnahtariUret(userId);
    expect(a).toMatch(/^aemk_/);
    expect(await kopruAnahtariDogrula(a)).toBe(userId);
    expect(
      (await db.masaKoprusu.findUniqueOrThrow({ where: { userId } })).sonKullanim,
    ).not.toBeNull();
    const b = await kopruAnahtariUret(userId);
    expect(await kopruAnahtariDogrula(a)).toBeNull();
    expect(await kopruAnahtariDogrula(b)).toBe(userId);
    expect(await kopruAnahtariDogrula('aesk_baska-bir-anahtar')).toBeNull();
  });

  it('en eski iş önce; ⚠️ eşzamanlı iki alım aynı işi ALAMAZ', async () => {
    const eski = await ses('eski', { createdAt: new Date('2020-01-01T00:00:00Z') });
    const yeni = await ses('yeni', { createdAt: new Date('2020-01-02T00:00:00Z') });
    const [a, b] = await Promise.all([isAl(), isAl()]);
    const alinan = [a?.id, b?.id].filter((x) => x === eski.id || x === yeni.id);
    expect(new Set(alinan).size).toBe(alinan.length);
    expect(alinan).toContain(eski.id);
    const satir = await db.masaOgesi.findUniqueOrThrow({ where: { id: eski.id } });
    expect(satir.yaziDurumu).toBe('ISLENIYOR');
    expect(satir.yaziBaslangic).not.toBeNull();
  });

  it('2 saatte bitmeyen iş yeniden alınır (Mac uyudu); süresi dolmayan alınmaz', async () => {
    const o = await ses('uyuyan');
    const t0 = new Date();
    expect((await benimki(t0))?.id).toBe(o.id);
    expect(await benimki(new Date(t0.getTime() + 60_000))).toBeNull();
    expect((await benimki(new Date(t0.getTime() + IS_OMRU_MS + 60_000)))?.id).toBe(o.id);
  });

  it('ses yalnızca İŞLENEN iş için verilir', async () => {
    const o = await ses('indir');
    await db.attachment.create({
      data: {
        key: `masa/x/${o.id}.m4a`,
        mime: 'audio/mp4',
        size: 1000,
        checksum: 'a'.repeat(64),
        entity: 'MASA_OGESI',
        entityId: o.id,
      },
    });
    expect(await isSesi(o.id)).toBeNull();
    await benimki();
    expect(await isSesi(o.id)).toEqual({ key: `masa/x/${o.id}.m4a`, mime: 'audio/mp4' });
  });

  it('bitiş: yazı kaydedilir, özet ayrı; özet düşse de yazı kalır; işlenmeyen iş 409', async () => {
    const o = await ses('bitir');
    expect(await isBitir(o.id, { metin: 'x' })).toBeNull(); // henüz alınmadı
    await benimki();
    const ozetle = vi.fn(async () => '## Özet\nNewton');
    const denetle = vi.fn(async () => {});
    expect(await isBitir(o.id, { metin: 'Newton yasaları' }, { ozetle, denetle })).toEqual({
      durum: 'TAMAM',
      ozet: true,
    });
    expect(denetle).toHaveBeenCalledTimes(1);
    const s = await db.masaOgesi.findUniqueOrThrow({ where: { id: o.id } });
    expect([s.yaziDurumu, s.metin, s.ozet, s.yaziBaslangic]).toEqual([
      'TAMAM',
      'Newton yasaları',
      '## Özet\nNewton',
      null,
    ]);

    const o2 = await ses('ozetsiz');
    await benimki();
    expect(await isBitir(o2.id, { metin: 'yazı' }, { ozetle: async () => null })).toEqual({
      durum: 'TAMAM',
      ozet: false,
    });
    expect((await db.masaOgesi.findUniqueOrThrow({ where: { id: o2.id } })).metin).toBe('yazı');
  });

  it('hata kaydedilir; yeniden sıralanınca tekrar alınabilir', async () => {
    const o = await ses('hatali');
    await benimki();
    expect(await isBitir(o.id, { hata: 'ffmpeg çıkış 1' })).toEqual({ durum: 'HATA', ozet: false });
    expect((await db.masaOgesi.findUniqueOrThrow({ where: { id: o.id } })).yaziHata).toBe(
      'ffmpeg çıkış 1',
    );
    expect(await benimki()).toBeNull();
    await yaziyiYenidenSirala(o.id);
    expect((await benimki())?.id).toBe(o.id);
  });
});
