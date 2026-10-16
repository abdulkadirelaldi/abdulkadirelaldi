'use server';

import { createHash } from 'node:crypto';

import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  confirmUploadSchema,
  entityIdSchema,
  uploadRequestSchema,
} from '@/lib/schemas';
import { db } from '@/server/db';
import {
  buildAttachmentKey,
  fetchAttachmentById,
  type AttachmentDto,
  type UploadTicketDto,
} from '@/server/services/attachment';
import {
  sniffMime,
  readImageDimensions,
  type SniffedMime,
} from '@/server/services/_shared/file-type';
import {
  SIGNED_PUT_TTL_SECONDS,
  deleteObjectQuietly,
  getObjectBytes,
  presignUpload,
} from '@/server/storage/r2';
import {
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * EKLENTİ YÜKLEME — §8.11, ADR-018, T-037.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ İKİ ADIMLI VE SEBEBİ ÖLÇÜLDÜ: BAYTLAR SUNUCUDAN GEÇEMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tek adımlı bir akış (dosyayı Server Action'a gönder, sunucu R2'ye yazsın)
 * daha basit olurdu ve ÇALIŞMAZDI. Ölçüm (T-037):
 *
 *   next.config.ts    → `serverActions.bodySizeLimit` AYARLANMAMIŞ
 *   Next 15 varsayılanı → 1 MB
 *   MAX_UPLOAD_BYTES  → 10 MB  (§8.11)
 *
 * Yani 1 MB'ı aşan her dosya Server Action gövdesinde REDDEDİLİRDİ. Sınırı
 * büyütmek `next.config.ts` değişikliği ister — §10.1 ortak dosyası, benim
 * değil. Ve büyütmek doğru da olmazdı: 10 MB'lık gövdeleri Next sunucusundan
 * geçirmek, R2'nin doğrudan yükleme yeteneğini boşa harcamak demek.
 *
 * AKIŞ:
 *   1. `requestUploadAction` — sunucu ANAHTARI üretir, imzalı PUT adresi döner
 *   2. tarayıcı DOĞRUDAN R2'ye PUT eder (Next sunucusu baytları hiç görmez)
 *   3. `confirmUploadAction` — sunucu nesneyi GERİ OKUR, doğrular, satırı yazar
 *
 * ⚠️ 3. ADIM OLMADAN BU AKIŞ GÜVENSİZDİ: istemci "mime: image/png" diyebilir
 * ve bambaşka bir şey yüklemiş olabilir. Sunucu baytları görmediği için
 * imzalayamıyor (`UNSIGNED-PAYLOAD`), bu yüzden DOĞRULAMA yüklemeden SONRA,
 * nesnenin kendisi üzerinde yapılıyor.
 */

/* ===========================================================================
 * 1 — YÜKLEME İZNİ
 * ======================================================================== */

/**
 * Polimorfik hedefin VAR OLDUĞUNU doğrular.
 *
 * ⚠️ ADR-018: *"Polimorfik ilişkide FK yok; bütünlük UYGULAMA KATMANINDA
 * korunur."* Bu fonksiyon o cümlenin karşılığı. Kontrol olmasa, var olmayan bir
 * `entityId` ile açılan eklenti hiçbir galeri sorgusunda görünmeyen bir yetim
 * SATIR olurdu — R2'deki yetim NESNEnin veritabanı tarafındaki eşi.
 *
 * `count` kullanılıyor, `findUnique` değil: varlığın kendisi okunmuyor, yalnızca
 * sayısı. Altı varlık türü tek bir `switch`te; `default` YOK, yani
 * `AttachmentEntity`ye yeni bir değer eklenirse `tsc` burayı eksik bulup kırar.
 */
async function hedefVarMi(
  entity: Parameters<typeof buildAttachmentKey>[0],
  entityId: string,
): Promise<boolean> {
  switch (entity) {
    case 'PROJECT':
      return (await db.project.count({ where: { id: entityId } })) > 0;
    case 'POST':
      return (await db.post.count({ where: { id: entityId } })) > 0;
    case 'PROFILE':
      return (await db.profile.count({ where: { id: entityId } })) > 0;
    case 'TRANSACTION':
      return (await db.transaction.count({ where: { id: entityId } })) > 0;
    case 'JOB':
      return (await db.job.count({ where: { id: entityId } })) > 0;
    case 'CLIENT':
      return (await db.client.count({ where: { id: entityId } })) > 0;
  }
}

export async function requestUploadAction(raw: unknown): Promise<ApiResponse<UploadTicketDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(uploadRequestSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    if (!(await hedefVarMi(parsed.data.entity, parsed.data.entityId))) {
      return fail(
        'VALIDATION_ERROR',
        'Dosyanın bağlanacağı kayıt bulunamadı — silinmiş olabilir. Sayfayı yenileyin.',
        { entityId: 'Bağlanacak kayıt bulunamadı.' },
      );
    }

    /*
     * Anahtar SUNUCUDA üretiliyor ve istemcinin dosya adı hiç girmiyor —
     * gerekçe `buildAttachmentKey`in yanında (yol kaçışı + uzantı yalanı).
     *
     * ⚠️ Uzantı İSTEMCİNİN BEYAN ETTİĞİ mime'dan türüyor ve bu bir TUTARSIZLIK
     * DEĞİL: beyan yalansa `confirmUpload` nesneyi reddediyor ve satır hiç
     * yazılmıyor. Anahtardaki uzantı o noktada yalnızca yetim bir nesnenin
     * adında kalır, ve gece temizliği onu alır.
     */
    const key = buildAttachmentKey(
      parsed.data.entity,
      parsed.data.entityId,
      parsed.data.mime as SniffedMime,
    );

    return ok({
      key,
      uploadUrl: presignUpload(key),
      expiresAt: new Date(Date.now() + SIGNED_PUT_TTL_SECONDS * 1000).toISOString(),
    });
  } catch (error) {
    return toFailure('attachment:requestUpload', error);
  }
}

/* ===========================================================================
 * 2 — YÜKLEME ONAYI VE DOĞRULAMA
 * ======================================================================== */

/**
 * Yüklenen nesneyi DOĞRULAR ve `Attachment` satırını yazar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ YETİM NESNE KARARI — SIRA: ÖNCE R2, SONRA DB. TELAFİ + GECE İŞİ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İki ayrı sistem var ve aralarında transaction YOK (T-038'de `$transaction`
 * mesaj→iş dönüşümünü atomik yapmıştı; burada o araç yok). Dolayısıyla bir
 * başarısızlık penceresi KAÇINILMAZ ve soru HANGİ BAŞARISIZLIĞI seçtiğimiz:
 *
 *   (a) ÖNCE DB, SONRA R2 → yükleme düşerse, veritabanında HİÇBİR ŞEYE
 *       ÇÖZÜLMEYEN bir satır kalır. Kullanıcı kırık görsel görür, ve
 *       `onDelete: Restrict` o satırı bir kapak olarak bağlıysa silinmesini de
 *       engeller. GÖRÜNÜR ve KULLANICIYI YANILTAN bir bozukluk.
 *
 *   (b) ÖNCE R2, SONRA DB → DB düşerse R2'de SAHİPSİZ bir nesne kalır.
 *       Görünmez, küçük bir depolama maliyeti, hiçbir referans kırılmıyor.
 *
 * (b) SEÇİLDİ — ve seçimi ADR-018 zaten yapmıştı: *"Yetim dosyalar için gece
 * temizlik işi (§13.5 cron'una eklenir)."* Tasarım hangi başarısızlığı kabul
 * ettiğini baştan söylemiş; telafi mekanizması da öngörülmüş.
 *
 * ÜSTÜNE TELAFİ EKLENDİ: DB yazımı düşerse nesne HEMEN silinmeye çalışılıyor
 * (`deleteObjectQuietly`). Böylece yetim penceresi "gece işine kadar"dan
 * "milisaniyeler"e iniyor. Telafi de düşerse gece işi yakalıyor — iki hat.
 *
 * ⚠️ TELAFİ FIRLATMIYOR ve bu zorunlu: fırlatsa ASIL hatayı (DB) maskeler ve
 * kullanıcıya yanlış sebebi gösterirdik (`writeAuditLog`ın aynı gerekçesi).
 */
export async function confirmUploadAction(raw: unknown): Promise<ApiResponse<AttachmentDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(confirmUploadSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const { key, entity, entityId, order } = parsed.data;

  try {
    /*
     * ⚠️ ANAHTAR ÖN EKİ DOĞRULANIYOR. `key` istemciden geliyor ve
     * `requestUpload`ta ürettiğimiz anahtar olmak ZORUNDA. Kontrol olmasa
     * istemci BAŞKA bir varlığın anahtarını vererek o nesneyi kendi kaydına
     * bağlayabilirdi — nesne bizim bucket'ta olduğu için imza da geçerdi.
     */
    const beklenenOnEk = `${entity.toLowerCase()}/${entityId}/`;
    if (!key.startsWith(beklenenOnEk)) {
      return fail('VALIDATION_ERROR', 'Dosya anahtarı bu kayda ait değil.', {
        key: 'Anahtar geçersiz.',
      });
    }

    const bytes = await getObjectBytes(key);
    if (bytes === null) {
      return fail(
        'VALIDATION_ERROR',
        'Yüklenen dosya bulunamadı. Yükleme tamamlanmamış ya da süresi dolmuş olabilir; tekrar deneyin.',
        { key: 'Dosya bulunamadı.' },
      );
    }

    /*
     * ⚠️ DOĞRULAMA SIRASI: BOYUT → İÇERİK → ÖLÇÜ.
     *
     * Boyut en ucuz kontrol ve en büyük zararı engelliyor; içerik kontrolü
     * baytları gezdiği için sonra; ölçü okuma yalnızca içerik doğrulandıktan
     * SONRA anlam taşıyor (yanlış biçimi ayrıştırmaya çalışmak rastgele sayı
     * üretirdi).
     */
    if (bytes.length > MAX_UPLOAD_BYTES) {
      await deleteObjectQuietly(key);
      return fail('VALIDATION_ERROR', 'Dosya en fazla 10 MB olabilir.', {
        key: 'Dosya çok büyük.',
      });
    }

    const mime = sniffMime(bytes);
    if (mime === null || !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      /*
       * ⚠️ REDDEDİLEN NESNE HEMEN SİLİNİYOR. Bırakmak, bucket'ta doğrulamayı
       * geçmemiş bir dosya tutmak olurdu — ve o dosyanın anahtarı istemcide
       * biliniyor, yani imzalı adres üretmeye devam edemese bile bırakmanın
       * hiçbir faydası yok.
       */
      await deleteObjectQuietly(key);
      return fail(
        'VALIDATION_ERROR',
        'Dosya içeriği kabul edilen tiplerden biri değil (JPEG, PNG, WebP, AVIF, SVG, PDF). ' +
          'Dosya uzantısı doğru olsa bile içeriği farklı olabilir.',
        { key: 'Dosya tipi kabul edilmiyor.' },
      );
    }

    const olcu = readImageDimensions(bytes, mime);

    /*
     * ⚠️ SAĞLAMA TOPLAMI SUNUCUDA HESAPLANIYOR — istemciden ALINMIYOR.
     *
     * NE İÇİN: BÜTÜNLÜK, yineleme tespiti DEĞİL. Ve bu şemanın kendi
     * kararı — `key` `@unique` ama `checksum` DEĞİL ve üzerinde indeks de yok.
     * Yineleme tespiti için tasarlanmış olsaydı tam tersi olurdu. ADR-018 de
     * bunu söylüyor: *"§8.23 bütünlük doğrulaması aynı mekanizmayı kullanır."*
     *
     * SHA-256 seçimi de şemada ZATEN verilmiş: `createAttachmentSchema.checksum`
     * `/^[a-f0-9]{64}$/` istiyor — 64 hex karakter, yani 256 bit.
     *
     * Sunucuda hesaplanması, kaydedilen değerin DOĞRULANMIŞ bir temel olmasını
     * sağlıyor: §8.23 bir gün "nesne yüklendiğinden beri değişti mi" diye
     * sorduğunda cevap güvenilir olur. İstemcinin beyanı kaydedilseydi, yanlış
     * bir temel sonsuza kadar yanlış pozitif üretirdi.
     */
    const checksum = createHash('sha256').update(bytes).digest('hex');

    try {
      const row = await db.attachment.create({
        data: {
          key,
          mime,
          size: bytes.length,
          checksum,
          width: olcu?.width ?? null,
          height: olcu?.height ?? null,
          entity,
          entityId,
          order,
          uploadedById: actorId,
        },
        select: {
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
        },
      });

      await writeAuditLog(
        {
          actorId,
          action: 'CREATE',
          entity: 'Attachment',
          entityId: row.id,
          /*
           * §8.20 — DOSYA ADI YOK (istemci girdisi, serbest metin) ve
           * SAĞLAMA TOPLAMI DA YOK (64 karakterlik bir özet, denetim sorusuna
           * bir şey katmıyor ve satırı şişiriyor). Yazılan: hangi kayda, hangi
           * tip, ne büyüklük. Anahtar da yazılıyor çünkü yetim nesne
           * soruşturmasının tek tutamağı o.
           */
          diff: {
            key: row.key,
            mime: row.mime,
            size: row.size,
            targetEntity: entity,
          },
        },
        db,
      );

      return ok({ ...row, createdAt: row.createdAt.toISOString() });
    } catch (dbError) {
      // ⚠️ TELAFİ — gerekçe fonksiyonun üstünde. Sessiz, çünkü asıl hata bu değil.
      await deleteObjectQuietly(key);
      return toFailure('attachment:confirmUpload', dbError);
    }
  } catch (error) {
    return toFailure('attachment:confirmUpload', error);
  }
}

/* ===========================================================================
 * 3 — SİLME
 * ======================================================================== */

/**
 * Eklentiyi siler — ÖNCE DB SATIRI, SONRA R2 NESNESİ.
 *
 * ⚠️ SIRA YÜKLEMENİN TERSİ VE SEBEBİ AYNI MANTIK: başarısızlık penceresinde
 * kalan şey yine YETİM NESNE olsun, kırık referans olmasın.
 *
 *   satır silindi, nesne silinemedi → yetim nesne (görünmez, gece işi alır)
 *   nesne silindi, satır silinemedi → KIRIK REFERANS (kullanıcı kırık görsel
 *                                     görür ve neden olduğunu anlamaz)
 *
 * ⚠️ `onDelete: Restrict` BURADA GERÇEK BİR KAPI: eklenti bir kapak/CV olarak
 * bağlıysa `db.attachment.delete` P2003 ile düşüyor ve nesneye HİÇ
 * DOKUNULMUYOR — çünkü silme sırası DB'yi öne alıyor. T-050'de yazdığım P2003
 * dalının mesajı ("Seçilen dosya bulunamadı…") burada ters yönden okunuyor, bu
 * yüzden kendi metnini veriyorum.
 */
export async function deleteAttachmentAction(raw: unknown): Promise<ApiResponse<{ id: string }>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const mevcut = await fetchAttachmentById(parsed.data.id);
    if (!mevcut) return notFound('Dosya bulunamadı.');

    await db.attachment.delete({ where: { id: parsed.data.id } });

    // Satır gitti; nesne gitmezse yetim kalır ve gece işi alır.
    await deleteObjectQuietly(mevcut.key);

    await writeAuditLog(
      {
        actorId,
        action: 'DELETE',
        entity: 'Attachment',
        entityId: mevcut.id,
        diff: { deleted: { key: mevcut.key, mime: mevcut.mime, size: mevcut.size } },
      },
      db,
    );

    return ok({ id: mevcut.id });
  } catch (error) {
    return toFailure('attachment:delete', error, {
      foreignKey: {
        message:
          'Bu dosya bir kapak görseli ya da CV olarak kullanılıyor. Önce kullanıldığı yerden kaldırın.',
        fields: { id: 'Dosya kullanımda.' },
      },
    });
  }
}
