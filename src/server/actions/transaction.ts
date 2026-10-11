'use server';

import { createTransactionSchema, updateTransactionSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { clientExists } from '@/server/services/client';
import { jobExists } from '@/server/services/job';
import {
  createTransaction,
  updateTransaction,
  type TransactionPanelDto,
} from '@/server/services/transaction';
import { transactionCategoryExists } from '@/server/services/transaction-category';
import {
  buildDiff,
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiFailure,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Transaction` Server Action'ları — §6'NIN KRİTİK İLİŞKİSİ, §7.1, T-101.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TEK YAZMA YOLU — "AYNI VERİ İKİ YERE GİRİLMEZ" ŞARTINI KORUYAN ŞEY BU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İŞ KARTINDAKİ "ödeme ekle" İÇİN AYRI BİR EYLEM YOK ve olmaması kasıtlı.
 * `createTransactionAction` hem muhasebe ekranından hem iş kartından çağrılır;
 * tek fark `jobId`nin arayüz tarafından önceden doldurulmuş olması.
 *
 * İkinci bir eylem (`recordJobPaymentAction` gibi) yazmak cazipti ve YANLIŞ
 * olurdu: iki yazma yolu, "para hareketinin tek kaydı var" güvencesini koruyan
 * tekliği bozmanın en kolay yolu. Üstelik sağlayacağı tek kolaylık —
 * işin `currency`/`fxRate`ini devralmak — ADR-014'e AYKIRI olurdu: kur İŞLEM
 * ANININ kuruudur, pazarlık gününün değil.
 *
 * Gerekçenin tamamı `services/transaction.ts`in başında.
 *
 * ⚠️ `AuditLog.diff`TE PARA: T-100'ün kararı AYNEN uygulanıyor — tutar SATIRA
 * yazılıyor (sır değil, adli değeri gerçek: "kuru kim değiştirdi"), EKRANDA
 * görünmüyor (T-053'ün okuyucusu `{before, after}` değerini basmıyor), BEYAZ
 * LİSTEYE EKLENMİYOR (ölçüt "değer bir alan adı ya da kapalı küme"; tutar kayıt
 * içeriği). Burada değiştirmek için bir sebep yok ve farklı davranmak iki
 * varlığı aynı ekranda farklı kurallarla gösterirdi.
 *
 * ⚠️ SİLME EYLEMİ YOK. Gerekçe: bir işlemi silmek defteri geriye dönük
 * değiştirmektir ve `Transaction` bir OLAY kaydı (şema yorumu: "gerçekleşmiş
 * para hareketi"). Yanlış girilen bir hareket ya düzeltilir (`update`) ya da
 * ters kayıtla kapatılır — ikisi de izi korur. Silme kararı ayrı bir kalem ve
 * bu kartın yazma kapsamında sayılmadı; raporlandı.
 */

/* ===========================================================================
 * FK KAPILARI — T-051/B kalıbı, üç bağ için
 * ======================================================================== */

/**
 * Üç yabancı anahtarın VARLIĞINI yazmadan önce kontrol eder.
 *
 * `categoryId` ZORUNLU, `jobId`/`clientId` opsiyonel; üçü de
 * `onDelete: Restrict` (şemada ölçüldü). `cuidSchema` yalnızca BİÇİMİ
 * doğruluyor, dolayısıyla var olmayan bir kimlik şemayı geçer ve tek kapı FK
 * kısıtı olurdu — kullanıcıya da P2003'ün eklentiye özel varsayılan metni
 * ("Seçilen dosya bulunamadı") gösterilirdi.
 *
 * ÜÇ KONTROL PARALEL: sırayla çalıştırmak üç gidiş-dönüşü seri hâle getirirdi
 * ve hiçbiri diğerine bağlı değil. Gönderilmeyen bağ için sorgu AÇILMIYOR.
 *
 * ALAN ADLARI KESİN, çünkü kontrolü biz yapıyoruz — belgelenmemiş bir hata
 * kabuğunu ayrıştırmaya gerek yok (T-051/B'nin kararı).
 */
async function missingReferenceFailure(refs: {
  categoryId?: string;
  jobId?: string;
  clientId?: string;
}): Promise<ApiFailure | null> {
  const [kategoriVar, isVar, musteriVar] = await Promise.all([
    refs.categoryId ? transactionCategoryExists(refs.categoryId) : Promise.resolve(true),
    refs.jobId ? jobExists(refs.jobId) : Promise.resolve(true),
    refs.clientId ? clientExists(refs.clientId) : Promise.resolve(true),
  ]);

  const fields: Record<string, string> = {};
  if (!kategoriVar) fields.categoryId = 'Seçilen kategori bulunamadı.';
  if (!isVar) fields.jobId = 'Seçilen iş bulunamadı.';
  if (!musteriVar) fields.clientId = 'Seçilen müşteri bulunamadı.';

  if (Object.keys(fields).length === 0) return null;

  return fail(
    'VALIDATION_ERROR',
    'Seçilen kayıtlardan biri bulunamadı — silinmiş olabilir. Listeleri yenileyip tekrar seçin.',
    fields,
  );
}

/** P2003 yarışında dönen metin — ön kontrolle AYNI cümle (T-051/B). */
const REFERANS_YOK = {
  message:
    'Seçilen kayıtlardan biri bulunamadı — silinmiş olabilir. Listeleri yenileyip tekrar seçin.',
} as const;

/** İşlem diff'inde SAYILAN alanlar — BULGU-019: liste elle, modelden türetilmez. */
function auditableTransaction(dto: TransactionPanelDto) {
  return {
    type: dto.type,
    amount: dto.amount,
    currency: dto.currency,
    fxRate: dto.fxRate,
    // Türetilmiş ama diff'e GİRİYOR: ADR-014 bozulursa tutarsızlığın ne zaman
    // doğduğunu söyleyen tek kanıt bu satır olur (T-100 gerekçesi).
    baseAmount: dto.baseAmount,
    date: dto.date,
    categoryId: dto.categoryId,
    jobId: dto.jobId,
    clientId: dto.clientId,
    method: dto.method,
    isPaid: dto.isPaid,
    invoiceNo: dto.invoiceNo,
    // `description` BİLEREK YOK: serbest metin, yani içine ne yazıldığı
    // bilinemez — ADR-034'ün "masum anahtarın değerine gömülü sır" ölçümünün
    // tarifi (`Client.notes` ile aynı sınıf).
  };
}

/* ===========================================================================
 * EKLEME
 * ======================================================================== */

export async function createTransactionAction(
  raw: unknown,
): Promise<ApiResponse<TransactionPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createTransactionSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const eksikReferans = await missingReferenceFailure({
    categoryId: parsed.data.categoryId,
    jobId: parsed.data.jobId,
    clientId: parsed.data.clientId,
  });
  if (eksikReferans) return eksikReferans;

  try {
    const dto = await createTransaction(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Transaction',
        entityId: dto.id,
        diff: buildDiff(null, auditableTransaction(dto)),
      },
      db,
    );

    /* ETİKET DÜŞÜRÜLMÜYOR — tarama `services/transaction.ts`in başında. */
    return ok(dto);
  } catch (error) {
    return toFailure('transaction:create', error, { foreignKey: { ...REFERANS_YOK } });
  }
}

/* ===========================================================================
 * GÜNCELLEME
 * ======================================================================== */

export async function updateTransactionAction(
  raw: unknown,
): Promise<ApiResponse<TransactionPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateTransactionSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const eksikReferans = await missingReferenceFailure({
    categoryId: parsed.data.categoryId,
    jobId: parsed.data.jobId,
    clientId: parsed.data.clientId,
  });
  if (eksikReferans) return eksikReferans;

  try {
    /*
     * `updateTransaction` `null` DÖNÜYOR, fırlatmıyor: `baseAmount` türetmesi
     * için mevcut satırı ZATEN okuyor, dolayısıyla "kayıt yok" durumunu
     * P2025'e bırakmak yerine doğrudan bilebiliyor (T-100'ün `updateJob`
     * kararıyla aynı).
     */
    const dto = await updateTransaction(parsed.data);
    if (!dto) return notFound('İşlem bulunamadı.');

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Transaction',
        entityId: dto.id,
        diff: {
          ...buildDiff(null, auditableTransaction(dto)),
          // `buildDiff` DIŞINDA — gerekçe `actions/job.ts`te (sarılmış bir
          // `changed` denetim ekranında okunamaz).
          changed: Object.keys(parsed.data)
            .filter((key) => key !== 'id')
            .sort()
            .join(', '),
        },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('transaction:update', error, { foreignKey: { ...REFERANS_YOK } });
  }
}
