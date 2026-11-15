import { createHash } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { MASA_PARCA_BAYT } from '@/lib/masa/dosya-sinirlari';
import { db } from '@/server/db';
import {
  dolapOlustur,
  dolapSil,
  fetchDolap,
  MasaHatasi,
  notOlustur,
  rafOlustur,
  rafSil,
} from '@/server/services/masa';
import {
  ogeSil,
  parcaYukle,
  yarimYuklemeleriTemizle,
  YARIM_YUKLEME_OMRU_MS,
  yuklemeBaslat,
  yuklemeBitir,
} from '@/server/services/masa-yukleme';
import type { FetchLike, R2Config } from '@/server/storage/r2';

/**
 * MASA PARÇALI YÜKLEME — gerçek PostgreSQL + BELLEKTE SAHTE R2 (ADR-049 M2b). Sahte R2 S3
 * protokolünün kullandığımız kısmını taklit eder: ?uploads, ?partNumber&uploadId, birleştirme,
 * GET, DELETE. Gerçek R2 bu testlerde yok (CI'da anahtar yok); gerçek R2 ölçümü yerelde tek
 * seferlik yapıldı (rota-kapsami notu).
 */
const ONEK = 'zzit-masa-yukleme';
const config: R2Config = { accountId: 'h', accessKeyId: 'a', secretAccessKey: 's', bucket: 'kova' };

function sahteR2(ayar: { kesik?: boolean } = {}) {
  const nesneler = new Map<string, Uint8Array>();
  const yuklemeler = new Map<string, { key: string; parcalar: Map<number, Uint8Array> }>();
  const olaylar: string[] = [];
  let sayac = 0;
  const fetchImpl: FetchLike = async (adres, init) => {
    const url = new URL(adres);
    const key = decodeURIComponent(url.pathname.replace('/kova/', ''));
    const yontem = init?.method ?? 'GET';
    const q = url.searchParams;
    if (yontem === 'POST' && q.has('uploads')) {
      const id = `u${++sayac}`;
      yuklemeler.set(id, { key, parcalar: new Map() });
      olaylar.push(`baslat:${key}`);
      return new Response(
        `<InitiateMultipartUploadResult><UploadId>${id}</UploadId></InitiateMultipartUploadResult>`,
      );
    }
    if (yontem === 'PUT' && q.has('partNumber')) {
      const y = yuklemeler.get(q.get('uploadId')!)!;
      y.parcalar.set(Number(q.get('partNumber')), new Uint8Array(init!.body as Uint8Array));
      return new Response(null, { headers: { etag: `"p${q.get('partNumber')}"` } });
    }
    if (yontem === 'POST' && q.has('uploadId')) {
      const y = yuklemeler.get(q.get('uploadId')!)!;
      const sirali = [...y.parcalar.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
      const toplam = sirali.reduce((n, b) => n + b.byteLength, 0);
      const birlesik = new Uint8Array(toplam);
      let i = 0;
      for (const b of sirali) {
        birlesik.set(b, i);
        i += b.byteLength;
      }
      nesneler.set(y.key, ayar.kesik ? birlesik.subarray(0, toplam - 1) : birlesik);
      yuklemeler.delete(q.get('uploadId')!);
      olaylar.push(`birlestir:${y.key}`);
      return new Response('<CompleteMultipartUploadResult/>');
    }
    if (yontem === 'DELETE' && q.has('uploadId')) {
      yuklemeler.delete(q.get('uploadId')!);
      olaylar.push(`iptal:${key}`);
      return new Response(null, { status: 204 });
    }
    if (yontem === 'DELETE') {
      nesneler.delete(key);
      olaylar.push(`sil:${key}`);
      return new Response(null, { status: 204 });
    }
    const nesne = nesneler.get(key);
    return nesne ? new Response(new Uint8Array(nesne)) : new Response(null, { status: 404 });
  };
  return { deps: { r2: { config, fetchImpl } }, nesneler, yuklemeler, olaylar };
}

/** iPhone Sesli Not başı (ftyp M4A) + dolgu. */
function m4a(boyut: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(boyut);
  b.set([0, 0, 0, 0x20, ...[...'ftypM4A '].map((c) => c.charCodeAt(0))]);
  for (let i = 12; i < boyut; i++) b[i] = i % 251;
  return b;
}

const temizle = async () => {
  const dolaplar = (
    await db.dolap.findMany({ where: { ad: { startsWith: ONEK } }, select: { id: true } })
  ).map((d) => d.id);
  const ogeler = (
    await db.masaOgesi.findMany({ where: { dolapId: { in: dolaplar } }, select: { id: true } })
  ).map((o) => o.id);
  await db.attachment.deleteMany({ where: { entity: 'MASA_OGESI', entityId: { in: ogeler } } });
  await db.masaOgesi.deleteMany({ where: { id: { in: ogeler } } });
  await db.raf.deleteMany({ where: { dolapId: { in: dolaplar } } });
  await db.dolap.deleteMany({ where: { id: { in: dolaplar } } });
};

/*
 * Yükleyen kullanıcı TESTİN KENDİSİ açar: CI'ın boş veritabanında tohum kullanıcı yok (ilk CI
 * koşusu `findFirstOrThrow` ile tam burada düştü). `Attachment.uploadedById` FK'si gerçek satır ister.
 */
const KULLANICI = `${ONEK}@ornek.test`;
let actorId = '';
beforeAll(async () => {
  actorId = (
    await db.user.upsert({
      where: { email: KULLANICI },
      create: { email: KULLANICI, name: ONEK, passwordHash: 'kullanilmaz' },
      update: {},
      select: { id: true },
    })
  ).id;
});
beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.user.deleteMany({ where: { email: KULLANICI } });
  await db.$disconnect();
});

const dolap = () => dolapOlustur({ ad: `${ONEK} Okul`, emoji: '🎓', katman: 'OKUL' });

describe('masa parçalı yükleme', () => {
  it('iki parçalı ders kaydı: tür baytlardan, birleşir, SHA-256 doğru, öğe HAZIR', async () => {
    const r2 = sahteR2();
    const d = await dolap();
    const raf = await rafOlustur({ dolapId: d.id, ustRafId: null, ad: 'Fizik' });
    const dosya = m4a(MASA_PARCA_BAYT + 1234);
    const plan = await yuklemeBaslat(
      { dolapId: d.id, rafId: raf.id, dosyaAdi: '3. hafta.m4a', boyut: dosya.byteLength },
      r2.deps,
    );
    expect(plan).toMatchObject({ parcaBoyutu: MASA_PARCA_BAYT, parcaSayisi: 2 });

    expect(await parcaYukle(plan.id, 1, dosya.slice(0, MASA_PARCA_BAYT), r2.deps)).toEqual({
      n: 1,
      kalan: 1,
    });
    // Aynı parçanın tekrarı (ağ koptu) öncekinin yerine geçer.
    await parcaYukle(plan.id, 1, dosya.slice(0, MASA_PARCA_BAYT), r2.deps);
    await parcaYukle(plan.id, 2, dosya.slice(MASA_PARCA_BAYT), r2.deps);
    const sonuc = await yuklemeBitir(plan.id, actorId, r2.deps);

    const ek = await db.attachment.findUniqueOrThrow({ where: { id: sonuc.dosyaId } });
    expect(ek).toMatchObject({
      mime: 'audio/mp4',
      size: dosya.byteLength,
      entity: 'MASA_OGESI',
      entityId: plan.id,
      checksum: createHash('sha256').update(dosya).digest('hex'),
    });
    expect(ek.key).toBe(`masa/${d.id}/${plan.id}.m4a`);
    expect(r2.olaylar.filter((o) => o.startsWith('baslat'))).toHaveLength(1);

    const oge = (await fetchDolap(d.id))!.ogeler[0]!;
    expect(oge).toMatchObject({
      tur: 'SES',
      durum: 'HAZIR',
      baslik: '3. hafta',
      rafId: raf.id,
      dosyaId: ek.id,
    });
    const satir = await db.masaOgesi.findUniqueOrThrow({ where: { id: plan.id } });
    expect([satir.yuklemeKey, satir.yuklemeId, satir.parcalar]).toEqual([null, null, null]);
  });

  it("⚠️ kabul edilmeyen tür: R2'ye HİÇ yazılmaz, öğe silinir", async () => {
    const r2 = sahteR2();
    const d = await dolap();
    const exe = new Uint8Array(100);
    exe.set([0x4d, 0x5a]);
    const plan = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'ders.m4a', boyut: 100 },
      r2.deps,
    );
    await expect(parcaYukle(plan.id, 1, exe, r2.deps)).rejects.toMatchObject({
      kod: 'VALIDATION_ERROR',
      alan: 'dosya',
    });
    expect(r2.olaylar).toEqual([]);
    expect(await db.masaOgesi.findUnique({ where: { id: plan.id } })).toBeNull();
  });

  it('parça planı: yanlış boyut, aralık dışı numara, önce-ilk-parça ve eksik parçayla bitiş reddedilir', async () => {
    const r2 = sahteR2();
    const d = await dolap();
    const boyut = MASA_PARCA_BAYT + 10;
    const plan = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'a.m4a', boyut },
      r2.deps,
    );
    const dosya = m4a(boyut);
    await expect(parcaYukle(plan.id, 3, dosya.slice(0, 10), r2.deps)).rejects.toThrow('1–2');
    await expect(parcaYukle(plan.id, 2, dosya.slice(MASA_PARCA_BAYT), r2.deps)).rejects.toThrow(
      'ilk parça',
    );
    await expect(parcaYukle(plan.id, 1, dosya.slice(0, 100), r2.deps)).rejects.toThrow('boyutu');
    await parcaYukle(plan.id, 1, dosya.slice(0, MASA_PARCA_BAYT), r2.deps);
    await expect(yuklemeBitir(plan.id, actorId, r2.deps)).rejects.toThrow('Eksik parça var (1/2)');
  });

  it('⚠️ birleşen nesne beyandan kısaysa nesne ve öğe silinir', async () => {
    const r2 = sahteR2({ kesik: true });
    const d = await dolap();
    const dosya = m4a(5000);
    const plan = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'a.m4a', boyut: 5000 },
      r2.deps,
    );
    await parcaYukle(plan.id, 1, dosya, r2.deps);
    await expect(yuklemeBitir(plan.id, actorId, r2.deps)).rejects.toThrow('uyuşmuyor');
    expect(r2.nesneler.size).toBe(0);
    expect(await db.masaOgesi.findUnique({ where: { id: plan.id } })).toBeNull();
    expect(await db.attachment.count({ where: { entityId: plan.id } })).toBe(0);
  });

  it('silme: satırlar ve R2 nesnesi gider; yarım yükleme iptal edilir', async () => {
    const r2 = sahteR2();
    const d = await dolap();
    const dosya = new Uint8Array([...'%PDF-1.7 deneme'].map((c) => c.charCodeAt(0)));
    const plan = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'odev.pdf', boyut: dosya.byteLength },
      r2.deps,
    );
    await parcaYukle(plan.id, 1, dosya, r2.deps);
    await yuklemeBitir(plan.id, actorId, r2.deps);
    expect(r2.nesneler.size).toBe(1);
    await ogeSil(plan.id, r2.deps);
    expect(r2.nesneler.size).toBe(0);
    expect(await db.attachment.count({ where: { entityId: plan.id } })).toBe(0);

    const yarim = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'b.m4a', boyut: 5000 },
      r2.deps,
    );
    await parcaYukle(yarim.id, 1, m4a(5000), r2.deps);
    expect(r2.yuklemeler.size).toBe(1);
    await ogeSil(yarim.id, r2.deps);
    expect(r2.yuklemeler.size).toBe(0);
  });

  it('24 saatten eski yarım yükleme temizlenir, yenisi kalır', async () => {
    const r2 = sahteR2();
    const d = await dolap();
    const eski = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'eski.m4a', boyut: 5000 },
      r2.deps,
    );
    await parcaYukle(eski.id, 1, m4a(5000), r2.deps);
    await db.masaOgesi.update({
      where: { id: eski.id },
      data: { createdAt: new Date(Date.now() - YARIM_YUKLEME_OMRU_MS - 60_000) },
    });
    const yeni = await yuklemeBaslat(
      { dolapId: d.id, rafId: null, dosyaAdi: 'yeni.m4a', boyut: 5000 },
      r2.deps,
    );
    // `yeni`nin başlangıcı zaten temizledi; ikinci çağrı bulacak bir şey bulmamalı.
    expect(await yarimYuklemeleriTemizle(new Date(), r2.deps)).toBe(0);
    expect(await db.masaOgesi.findUnique({ where: { id: eski.id } })).toBeNull();
    expect(await db.masaOgesi.findUnique({ where: { id: yeni.id } })).not.toBeNull();
    expect(r2.olaylar).toContain(`iptal:masa/${d.id}/${eski.id}.m4a`);
  });

  it('içinde not ya da dosya olan raf/dolap silinmez', async () => {
    const d = await dolap();
    const raf = await rafOlustur({ dolapId: d.id, ustRafId: null, ad: 'Notlar' });
    const not = await notOlustur({
      dolapId: d.id,
      rafId: raf.id,
      baslik: 'Newton',
      metin: 'F = ma',
    });
    await expect(rafSil(raf.id)).rejects.toBeInstanceOf(MasaHatasi);
    await expect(dolapSil(d.id)).rejects.toMatchObject({ kod: 'CONFLICT' });
    await ogeSil(not.id, sahteR2().deps);
    await rafSil(raf.id);
    await expect(dolapSil(d.id)).resolves.toEqual({ id: d.id });
  });
});
