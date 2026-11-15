import { createHash } from 'node:crypto';

import type { YuklemeBaslatGirdisi } from '@/lib/schemas';
import { MASA_PARCA_BAYT } from '@/lib/masa/dosya-sinirlari';
import { masaDosyaTuru } from '@/lib/masa/dosya-turu';
import { db } from '@/server/db';
import { Prisma } from '@/server/generated/prisma/client';
import {
  abortMultipartUploadQuietly,
  completeMultipartUpload,
  createMultipartUpload,
  deleteObjectQuietly,
  getObjectResponse,
  uploadPart,
  type R2Deps,
} from '@/server/storage/r2';

import { MasaHatasi, ogeYeri } from './masa';

/**
 * MASA PARÇALI YÜKLEME (ADR-049 M2b) — dosya ve ses kayıtları.
 *
 * AKIŞ: `baslat` (öğe YUKLENIYOR olarak açılır, parça planı döner) → `parca` × n (sırayla;
 * İLK parçada tür BAYTLARDAN belirlenir ve R2 parçalı yüklemesi o zaman açılır) → `bitir`
 * (R2 birleştirir, nesne AKIŞLA okunup SHA-256 ve boyut doğrulanır, `Attachment` yazılır,
 * öğe HAZIR olur).
 *
 * NEDEN TÜR İLK PARÇADA: kabul edilmeyen bir dosyanın tek baytı bile R2'ye yazılmaz
 * (ADR-044'ün "önce doğrula" sırası). Reddedilen yüklemenin öğesi de silinir.
 *
 * NEDEN BOYUT BİTİŞTE YENİDEN: istemci başlangıçta boyut beyan eder ve parça planı ondan
 * çıkar; ama beyan GİRDİDİR. R2'nin birleştirdiği nesne baştan sona okunur — sayılan bayt
 * beyanla uyuşmazsa nesne silinir.
 *
 * YARIM KALAN YÜKLEMELER: telefon uykuya geçer, sekme kapanır. 24 saatten eski YUKLENIYOR
 * öğeler her yeni başlangıçta iptal edilir (R2'deki parçalar da) — zamanlayıcı gerekmez.
 */

export const YARIM_YUKLEME_OMRU_MS = 24 * 60 * 60 * 1000;

type Parca = { n: number; etag: string; boyut: number };

function parcaPlani(boyut: number): number {
  return Math.ceil(boyut / MASA_PARCA_BAYT);
}

function parcalariOku(json: unknown): Parca[] {
  return Array.isArray(json) ? (json as Parca[]) : [];
}

/** Uzantıdan arındırılmış ad — başlık verilmezse. */
function adSadelestir(dosyaAdi: string): string {
  const i = dosyaAdi.lastIndexOf('.');
  return (i > 0 ? dosyaAdi.slice(0, i) : dosyaAdi).slice(0, 160);
}

const UZANTI: Readonly<Record<string, string>> = {
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

function nesneAnahtari(dolapId: string, ogeId: string, mime: string, dosyaAdi: string): string {
  const uzanti =
    UZANTI[mime] ??
    dosyaAdi
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') ??
    'bin';
  return `masa/${dolapId}/${ogeId}.${uzanti}`;
}

/** 24 saatten eski yarım yüklemeleri iptal eder — R2 parçaları dahil. Kaç tane temizlendi. */
export async function yarimYuklemeleriTemizle(
  simdi: Date = new Date(),
  deps: { r2?: R2Deps } = {},
): Promise<number> {
  const eskiler = await db.masaOgesi.findMany({
    where: {
      durum: 'YUKLENIYOR',
      createdAt: { lt: new Date(simdi.getTime() - YARIM_YUKLEME_OMRU_MS) },
    },
    select: { id: true, yuklemeKey: true, yuklemeId: true },
  });
  for (const o of eskiler) {
    if (o.yuklemeKey && o.yuklemeId) {
      await abortMultipartUploadQuietly(o.yuklemeKey, o.yuklemeId, deps.r2);
    }
  }
  if (eskiler.length > 0) {
    await db.masaOgesi.deleteMany({ where: { id: { in: eskiler.map((o) => o.id) } } });
  }
  return eskiler.length;
}

export interface YuklemePlani {
  id: string;
  parcaBoyutu: number;
  parcaSayisi: number;
}

export async function yuklemeBaslat(
  g: YuklemeBaslatGirdisi,
  deps: { r2?: R2Deps; simdi?: Date } = {},
): Promise<YuklemePlani> {
  await yarimYuklemeleriTemizle(deps.simdi, deps);
  const yer = await ogeYeri(g.dolapId, g.rafId);
  const oge = await db.masaOgesi.create({
    data: {
      ...yer,
      tur: 'DOSYA', // Kesin tür ilk parçanın baytlarından.
      baslik: adSadelestir(g.dosyaAdi),
      durum: 'YUKLENIYOR',
      dosyaAdi: g.dosyaAdi,
      boyut: g.boyut,
      parcalar: [],
    },
    select: { id: true },
  });
  return { id: oge.id, parcaBoyutu: MASA_PARCA_BAYT, parcaSayisi: parcaPlani(g.boyut) };
}

async function yuklenenOge(id: string) {
  const o = await db.masaOgesi.findUnique({ where: { id } });
  if (!o) throw new MasaHatasi('NOT_FOUND', 'Yükleme bulunamadı.');
  if (o.durum !== 'YUKLENIYOR' || o.boyut === null || o.dosyaAdi === null) {
    throw new MasaHatasi('CONFLICT', 'Bu yükleme zaten bitmiş.');
  }
  return { ...o, boyut: o.boyut, dosyaAdi: o.dosyaAdi };
}

/**
 * Bir parçayı yazar. Parçalar SIRAYLA gelir (1, 2, …); aynı parçanın tekrarı (ağ koptu, yeniden
 * denendi) öncekinin yerine geçer. Parça boyutu plana uymazsa reddedilir — R2 eşit olmayan
 * parçaları birleştirmede reddederdi ve hata o zaman, bütün dosya gönderildikten sonra çıkardı.
 */
export async function parcaYukle(
  id: string,
  n: number,
  bytes: Uint8Array<ArrayBuffer>,
  deps: { r2?: R2Deps } = {},
): Promise<{ n: number; kalan: number }> {
  const o = await yuklenenOge(id);
  const sayi = parcaPlani(o.boyut);
  if (!Number.isInteger(n) || n < 1 || n > sayi) {
    throw new MasaHatasi('VALIDATION_ERROR', `Parça numarası 1–${sayi} arasında olmalı.`);
  }
  const beklenen = n < sayi ? MASA_PARCA_BAYT : o.boyut - (sayi - 1) * MASA_PARCA_BAYT;
  if (bytes.byteLength !== beklenen) {
    throw new MasaHatasi('VALIDATION_ERROR', 'Parça boyutu beklenenden farklı.');
  }

  let key = o.yuklemeKey;
  let uploadId = o.yuklemeId;
  if (n === 1 && (!key || !uploadId)) {
    const tur = masaDosyaTuru(bytes.subarray(0, 512), o.dosyaAdi);
    if (!tur) {
      await db.masaOgesi.delete({ where: { id } });
      throw new MasaHatasi(
        'VALIDATION_ERROR',
        'Bu dosya türü kabul edilmiyor (PDF, görsel, Word/Excel/PowerPoint ya da ses kaydı). ' +
          'Uzantı doğru olsa bile içerik farklı olabilir.',
        'dosya',
      );
    }
    key = nesneAnahtari(o.dolapId, id, tur.mime, o.dosyaAdi);
    uploadId = await createMultipartUpload(key, tur.mime, deps.r2);
    await db.masaOgesi.update({
      where: { id },
      data: { tur: tur.tur, mime: tur.mime, yuklemeKey: key, yuklemeId: uploadId },
    });
  }
  if (!key || !uploadId) {
    throw new MasaHatasi('VALIDATION_ERROR', 'Önce ilk parça gönderilmeli.');
  }

  const etag = await uploadPart(key, uploadId, n, bytes, deps.r2);
  const parcalar = [
    ...parcalariOku(o.parcalar).filter((p) => p.n !== n),
    { n, etag, boyut: bytes.byteLength },
  ].sort((a, b) => a.n - b.n);
  await db.masaOgesi.update({ where: { id }, data: { parcalar } });
  return { n, kalan: sayi - parcalar.length };
}

/** Nesneyi akışla okur: SHA-256 ve bayt sayısı (300 MB'ı belleğe almadan). */
async function nesneOzeti(key: string, deps?: R2Deps): Promise<{ sha256: string; boyut: number }> {
  const yanit = await getObjectResponse(key, null, deps);
  if (!yanit?.body) throw new Error('Birleşen nesne okunamadı.');
  const hash = createHash('sha256');
  let boyut = 0;
  const okuyucu = yanit.body.getReader();
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    hash.update(value);
    boyut += value.byteLength;
  }
  return { sha256: hash.digest('hex'), boyut };
}

export async function yuklemeBitir(
  id: string,
  actorId: string,
  deps: { r2?: R2Deps } = {},
): Promise<{ id: string; dosyaId: string }> {
  const o = await yuklenenOge(id);
  const sayi = parcaPlani(o.boyut);
  const parcalar = parcalariOku(o.parcalar);
  if (!o.yuklemeKey || !o.yuklemeId || !o.mime || parcalar.length !== sayi) {
    throw new MasaHatasi('VALIDATION_ERROR', `Eksik parça var (${parcalar.length}/${sayi}).`);
  }
  const key = o.yuklemeKey;

  await completeMultipartUpload(key, o.yuklemeId, parcalar, deps.r2);
  const ozet = await nesneOzeti(key, deps.r2);
  if (ozet.boyut !== o.boyut) {
    await deleteObjectQuietly(key, deps.r2);
    await db.masaOgesi.delete({ where: { id } });
    throw new MasaHatasi('VALIDATION_ERROR', 'Yüklenen dosyanın boyutu beyanla uyuşmuyor.');
  }

  try {
    const dosya = await db.$transaction(async (tx) => {
      const ek = await tx.attachment.create({
        data: {
          key,
          mime: o.mime!,
          size: ozet.boyut,
          checksum: ozet.sha256,
          entity: 'MASA_OGESI',
          entityId: id,
          uploadedById: actorId,
        },
        select: { id: true },
      });
      await tx.masaOgesi.update({
        where: { id },
        data: {
          durum: 'HAZIR',
          yuklemeKey: null,
          yuklemeId: null,
          parcalar: Prisma.DbNull,
          // Ses kaydı Mac köprüsünün sırasına girer (ADR-049 M6).
          ...(o.tur === 'SES' ? { yaziDurumu: 'SIRADA' as const } : {}),
        },
      });
      return ek;
    });
    return { id, dosyaId: dosya.id };
  } catch (error) {
    // ADR-044 telafisi: DB yazımı düştüyse nesne yetim kalmasın.
    await deleteObjectQuietly(key, deps.r2);
    throw error;
  }
}

/**
 * Öğeyi siler: not → satır; dosya/ses → önce satırlar (Attachment + öğe, tek işlem), sonra
 * R2 nesnesi (FIRLATMADAN; düşerse yetim nesne gece temizliğine kalır). Yarım yükleme → iptal.
 */
export async function ogeSil(id: string, deps: { r2?: R2Deps } = {}): Promise<{ id: string }> {
  const o = await db.masaOgesi.findUnique({ where: { id } });
  if (!o) throw new MasaHatasi('NOT_FOUND', 'Öğe bulunamadı.');
  const dosyalar = await db.attachment.findMany({
    where: { entity: 'MASA_OGESI', entityId: id },
    select: { id: true, key: true },
  });
  await db.$transaction([
    db.attachment.deleteMany({ where: { id: { in: dosyalar.map((d) => d.id) } } }),
    db.masaOgesi.delete({ where: { id } }),
  ]);
  for (const d of dosyalar) await deleteObjectQuietly(d.key, deps.r2);
  if (o.durum === 'YUKLENIYOR' && o.yuklemeKey && o.yuklemeId) {
    await abortMultipartUploadQuietly(o.yuklemeKey, o.yuklemeId, deps.r2);
  }
  return { id };
}
