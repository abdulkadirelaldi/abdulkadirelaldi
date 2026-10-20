import { randomUUID } from 'node:crypto';

import { db } from '@/server/db';
import { presignDownload } from '@/server/storage/r2';
import type { AttachmentEntity } from '@/types';

import type { SniffedMime } from './_shared/file-type';

/**
 * `Attachment` VARLIK KONTROLÜ — T-051/B.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN VAR: ŞEMA BİÇİMİ DOĞRULUYOR, VARLIĞI DOĞRULAMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `coverAttachmentId` (proje + blog) ve `avatarAttachmentId`/`cvAttachmentId`
 * (profil) GİZLİ FORM ALANLARINDAN geliyor. Şema yalnızca `cuidSchema` ile
 * biçimi doğruluyor; var olmayan bir kimlik şemayı geçiyor ve tek kapı
 * veritabanındaki FK kısıtı oluyor (`onDelete: Restrict`).
 *
 * Bu modül o kapıyı YAZMADAN ÖNCEYE taşıyor. İki kazanç:
 *   1. Hangi ALANIN bozuk olduğu KESİN bilinir — çünkü kontrolü biz yapıyoruz.
 *   2. Başarısız bir yazma denemesi hiç yapılmıyor.
 *
 * ⚠️ T-037'NİN KANCASI BURASI. Bugün sorulan soru "bu eklenti VAR MI". Yükleme
 * bağlandığında soru "bu eklenti BU KULLANICIYA MI AİT" olacak ve cevabı aynı
 * fonksiyonun içinde genişleyecek — çağıran taraflar değişmeyecek. Bugün tek
 * kullanıcı olduğu için ikisi aynı kapı; yarın ayrışacak.
 */

/** Bu kontrolün Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface AttachmentExistenceClient {
  attachment: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
}

/**
 * Verilen kimliklerden veritabanında BULUNMAYANLARI döndürür.
 *
 * TEK SORGU: kimlikler `in` ile birlikte sorulup dönen kümeyle farkı alınıyor.
 * Alan başına ayrı `findUnique` çağırmak profil kaydında (avatar + cv) iki
 * gidiş-dönüş demekti ve ileride galeri eklendiğinde doğrusal büyürdü.
 *
 * BOŞ GİRDİ SORGU AÇMAZ: hiçbir eklenti alanı gönderilmemiş bir kaydetme —
 * bugün en sık durum — fazladan hiçbir maliyet ödemiyor.
 *
 * YİNELENEN kimlikler tekilleştiriliyor: profilde aynı dosya hem avatar hem cv
 * olarak seçilebilir ve `in` listesine iki kez koymak gereksiz.
 */
export async function findMissingAttachmentIds(
  ids: readonly (string | null | undefined)[],
  client: AttachmentExistenceClient = db,
): Promise<string[]> {
  const aranacak = [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')),
  ];
  if (aranacak.length === 0) return [];

  const bulunanlar = await client.attachment.findMany({
    where: { id: { in: aranacak } },
    select: { id: true },
  });

  const bulunanKume = new Set(bulunanlar.map((row) => row.id));
  return aranacak.filter((id) => !bulunanKume.has(id));
}

/* ===========================================================================
 * §8.11 / ADR-018 — R2 EKLENTİ YÖNETİMİ (T-037)
 * ======================================================================== */

/**
 * ⚠️ DB'DE ADRES YOK, YALNIZCA ANAHTAR VAR — tasarımın kalbi, esnetilmiyor.
 *
 * `Attachment.url` ADR-018'de KALDIRILDI: kalıcı bir URL ya bayat olurdu (15
 * dakikada ölür) ya da bucket'ın private olmadığı anlamına gelirdi. İmzalı
 * adres `key`den İSTEK ANINDA üretiliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️⚠️ İMZALI ADRES ÖNBELLEĞE GİRMEZ — ADR-018'İN KABUL KRİTERİ, ÖLÇÜLDÜ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ADR-018 bunu T-037'nin kabul kriteri olarak yazmıştı: *"imzalı URL'nin TTL'i
 * önbellek süresinden kısaysa bozuk görsel çıkar."* Ölçtüm ve çatışma GERÇEK:
 *
 *   CONTENT_REVALIDATE_SECONDS = 3600 sn   (önbellek girdisinin ömrü)
 *   SIGNED_GET_TTL_SECONDS     =  900 sn   (§8.11 imzalı adres ömrü)
 *
 * Yani imzalı adres bir `cachedRead` çıktısına girerse, girdi 1 saat yaşarken
 * adres 15 dakikada ölür → her saatin 45 DAKİKASI KIRIK GÖRSEL.
 *
 * ÇÖZÜM TTL'İ BÜYÜTMEK DEĞİL (§8.11 15 dakikayı şart koşuyor ve uzatmak çalınan
 * adresin ömrünü uzatır), İKİSİNİ HİÇ KARŞILAŞTIRMAMAK: imzalı adres
 * ÖNBELLEKLENEN HİÇBİR DTO'YA girmiyor. `AttachmentRefDto` `key` taşıyor (T-031
 * onu böyle tasarlamıştı) ve imza, önbelleğin DIŞINDA, çizim anında üretiliyor.
 *
 * Yapısal olarak sağlanıyor ve `tests/unit/services/eklenti-r2.test.ts` bunu
 * bir kapıyla sabitliyor: önbellekli okuma yollarında `presign`/`url` geçmiyor.
 */

/** Panelde ve galeride görünen eklenti. `url` YOK — gerekçe yukarıda. */
export interface AttachmentDto {
  id: string;
  /** R2 nesne anahtarı. İmzalı adres bundan üretilir. */
  key: string;
  mime: string;
  size: number;
  /** Görsel değilse (PDF) ya da boyutu okunamıyorsa (AVIF/SVG) `null`. */
  width: number | null;
  height: number | null;
  entity: AttachmentEntity;
  entityId: string;
  order: number;
  createdAt: string;
}

/** Yükleme izni yanıtı — istemci bu adrese DOĞRUDAN PUT yapıyor. */
export interface UploadTicketDto {
  /** Sunucunun ürettiği anahtar — istemci bunu `confirmUpload`a geri verir. */
  key: string;
  /** İmzalı PUT adresi. Ömrü `SIGNED_PUT_TTL_SECONDS`. */
  uploadUrl: string;
  /** Adresin son kullanma anı (ISO) — arayüz "süre doldu" diyebilsin. */
  expiresAt: string;
}

const ATTACHMENT_SELECT = {
  id: true,
  key: true,
  mime: true,
  size: true,
  width: true,
  height: true,
  entity: true,
  entityId: true,
  order: true,
  createdAt: true,
} as const;

interface AttachmentRow {
  id: string;
  key: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  entity: AttachmentEntity;
  entityId: string;
  order: number;
  createdAt: Date;
}

export interface AttachmentWriteClient {
  attachment: {
    findMany(args: {
      where: { entity: AttachmentEntity; entityId: string };
      select: typeof ATTACHMENT_SELECT;
      orderBy: ({ order: 'asc' } | { createdAt: 'asc' })[];
    }): Promise<AttachmentRow[]>;
    findUnique(args: {
      where: { id: string };
      select: typeof ATTACHMENT_SELECT;
    }): Promise<AttachmentRow | null>;
    create(args: {
      data: {
        key: string;
        mime: string;
        size: number;
        checksum: string;
        width: number | null;
        height: number | null;
        entity: AttachmentEntity;
        entityId: string;
        order: number;
        uploadedById: string | null;
      };
      select: typeof ATTACHMENT_SELECT;
    }): Promise<AttachmentRow>;
    delete(args: { where: { id: string } }): Promise<AttachmentRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. */
const _uyumYazma: AttachmentWriteClient = db;
void _uyumYazma;

function toDto(row: AttachmentRow): AttachmentDto {
  return {
    id: row.id,
    key: row.key,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    entity: row.entity,
    entityId: row.entityId,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Doğrulanan MIME'dan uzantı — İSTEMCİNİN dosya adından DEĞİL. */
const MIME_EXTENSIONS: Record<SniffedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

/**
 * R2 nesne anahtarı üretir.
 *
 * ⚠️ İSTEMCİNİN DOSYA ADI ANAHTARA HİÇ GİRMİYOR ve bu bir güvenlik kararı.
 * Dosya adı ziyaretçi girdisi; anahtara koymak iki kapıyı birden açardı:
 *   - YOL KAÇIŞI: `../../gizli/x.png` gibi bir ad bucket'ta başka bir yere yazar.
 *   - UZANTI YALANI: `.html`/`.svg` uzantısı, imzalı adresle açıldığında
 *     tarayıcıyı içeriği ÇALIŞTIRMAYA yöneltebilir.
 *
 * Anahtar tamamen bizim ürettiğimiz parçalardan kuruluyor: varlık türü,
 * varlık kimliği, rastgele bir kimlik ve DOĞRULANMIŞ mime'ın uzantısı.
 * `crypto.randomUUID` çakışma riskini pratikte sıfırlıyor; `key @unique` de
 * veritabanı tarafında son savunma.
 */
export function buildAttachmentKey(
  entity: AttachmentEntity,
  entityId: string,
  mime: SniffedMime,
  randomId: string = randomUUID(),
): string {
  return `${entity.toLowerCase()}/${entityId}/${randomId}.${MIME_EXTENSIONS[mime]}`;
}

/** Galeri okuması — `order`, sonra `createdAt` (ADR-018 indeksine uygun). */
export async function fetchAttachmentsForEntity(
  entity: AttachmentEntity,
  entityId: string,
  client: AttachmentWriteClient = db,
): Promise<AttachmentDto[]> {
  const rows = await client.attachment.findMany({
    where: { entity, entityId },
    select: ATTACHMENT_SELECT,
    // İkincil anahtar ZORUNLU: `order` varsayılanı 0, yani birden çok eklenti
    // aynı sırada olabilir ve aralarındaki dizilim kararsız kalırdı.
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  return rows.map(toDto);
}

export async function fetchAttachmentById(
  id: string,
  client: AttachmentWriteClient = db,
): Promise<AttachmentDto | null> {
  const row = await client.attachment.findUnique({ where: { id }, select: ATTACHMENT_SELECT });
  return row ? toDto(row) : null;
}

/** §8.11 — 15 dakikalık imzalı okuma adresi. Önbelleğe GİRMEZ (gerekçe yukarıda). */
export function signedUrlForKey(key: string, deps?: Parameters<typeof presignDownload>[1]): string {
  return presignDownload(key, deps);
}
