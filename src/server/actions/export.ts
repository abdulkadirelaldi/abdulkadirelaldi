'use server';

import { exportRequestSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  exportCategoryBreakdownCsv,
  exportMonthlySummaryCsv,
  exportTransactionsCsv,
  exportTruncated,
  type CsvExportDto,
} from '@/server/services/export';
import { ok, parseOrFail, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * CSV DIŞA AKTARIM EYLEMİ — §4.2, T-109b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BİR EYLEM, OYSA BU BİR OKUMA — VE YETKİ NİYE VAZGEÇİLMEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-038'de panel okumalarını eylem dosyasından yeniden ihraç ETMEMİŞTİM ve
 * gerekçe şuydu: `'use server'` dosyasından ihraç edilen her işlev ağdan
 * çağrılabilir bir POST ucuna dönüşür; okumaları böyle açmak hiçbir faydası
 * olmadan yeni bir saldırı yüzeyi üretirdi.
 *
 * ⚠️ BURADA O GEREKÇE GEÇERSİZ DEĞİL, KARŞILANIYOR: faydası VAR. İndirme
 * İSTEMCİDEN tetikleniyor (Blob + `URL.createObjectURL`), yani dosyayı üreten
 * kod bir Server Component'ten çağrılamıyor — kullanıcı düğmeye bastığında
 * çalışması gerekiyor. Eylem olmak ZORUNLU.
 *
 * Bedeli ödenmek zorunda: ağdan çağrılabilir bir uç açıldığı için `auth()`
 * kapısı VAZGEÇİLMEZ. `currentActorId()` hem oturumu hem ADR-035/B yazma
 * geçersizleştirmesini kontrol ediyor.
 *
 * ⚠️ YAZMA KAPISI BİR OKUMAYA UYGULANIYOR VE BU BİLİNÇLİ. `writesRevoked`
 * normalde mutasyonları kapatır; burada okuma yolunda da geçerli olması
 * ISTENEN davranış — ele geçirilmiş bir oturumun yapabileceği en zararlı şey
 * tam olarak bu: bütün muhasebe defterini tek dosyada dışarı almak. ADR-035/C
 * okuma korumasını F6'ya bırakmıştı çünkü ara katman Edge'de DB okuyamıyor;
 * ama bu uç bir Server Action, yani kapı burada BEDAVA ve uygulanıyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÜÇ KÜME, TEK EYLEM
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `exportRequestSchema` ayrık birleşim: her küme yalnızca kendi girdisini kabul
 * ediyor (gerekçe şemanın yanında). Üç ayrı eylem yazmak, yetki kapısını ve
 * denetim kaydını üç kez kopyalamak olurdu.
 */

/**
 * Dışa aktarımın sonucu — dosya + KESİLME UYARISI.
 *
 * ⚠️ `truncated` ZARFIN İÇİNDE ve bu Frontend'in cümlesinin karşılığı:
 * *"sessizce kesilmiş bir CSV, dosyayı indiren kişinin fark edemeyeceği tek
 * veri kaybı türü."* Arayüzün `exportTruncated()`ı kendisinin çağırmasına
 * bırakmak, o çağrıyı atlamayı mümkün kılardı; zarfta taşınınca uyarı
 * verinin yanında geliyor.
 */
export interface CsvExportResponseDto extends CsvExportDto {
  /** `true` ise dosya üst sınıra dayandı ve EKSİK OLABİLİR — kullanıcı uyarılmalı. */
  truncated: boolean;
}

export async function exportCsvAction(raw: unknown): Promise<ApiResponse<CsvExportResponseDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(exportRequestSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await uret(parsed.data);

    /*
     * ═══════════════════════════════════════════════════════════════════════
     * ⚠️ DENETİM KAYDI — EVET, VE BU BİR OKUMA OLMASINA RAĞMEN
     * ═══════════════════════════════════════════════════════════════════════
     *
     * ADR-022 "sonuçlar `AuditLog`a" diyor ve okumalar normalde sonuç değil.
     * Burada kaydediliyor çünkü bu okuma bir VERİ ÇIKIŞI: dosya müşteri adı,
     * fatura numarası ve bütün tutarları taşıyor ve UYGULAMADAN ÇIKIYOR —
     * e-postaya eklenir, İndirilenler'de kalır, muhasebeciye gider.
     *
     * `AuditAction.EXPORT` enum'da ZATEN VAR (ADR-020, T-010'da tanımlandı) ve
     * bugüne kadar hiç kullanılmamıştı. Yani şema bu olayın kaydedilmesini
     * baştan öngörmüş; kullanmamak o öngörüyü boşa düşürürdü.
     *
     * ⚠️ DİFF'E NE YAZILDIĞI AYRI BİR KARAR (§8.20):
     *
     *   YAZILMIYOR — dosyanın İÇERİĞİ. Bir satırını bile yazmak, denetim
     *     kaydını verinin ikinci bir kopyası yapardı ve §8.21 yedeğine
     *     taşırdı. Dışa aktarımı kaydetmenin amacı veriyi saklamak değil,
     *     ÇIKIŞI kaydetmek.
     *   YAZILMIYOR — müşteri adı, fatura numarası, tutarlar. Dosyada var,
     *     denetim kaydında yok; T-100'ün `Client` diff kararının aynısı.
     *   YAZILIYOR  — hangi küme, hangi esas, hangi aralık, KAÇ SATIR ve
     *     kesilip kesilmediği. Adli soru "ne zaman, ne kadar veri dışarı
     *     çıktı" ve bu alanlar onu cevaplıyor.
     *
     * `rowCount` özellikle değerli: aynı kullanıcının iki dışa aktarımı
     * arasında satır sayısının beklenmedik biçimde büyümesi, incelenecek bir
     * olaydır. İçeriği hiç taşımadan.
     */
    await writeAuditLog(
      {
        actorId,
        action: 'EXPORT',
        entity: 'Transaction',
        diff: {
          dataset: parsed.data.dataset,
          basis: parsed.data.basis,
          scope: kapsamOzeti(parsed.data),
          rowCount: dto.rowCount,
          truncated: exportTruncated(dto),
        },
      },
      db,
    );

    /* ETİKET DÜŞÜRÜLMÜYOR — okuma, ve `Transaction` public'te yok (T-101). */
    return ok({ ...dto, truncated: exportTruncated(dto) });
  } catch (error) {
    return toFailure('export:csv', error);
  }
}

/** Kümeye göre doğru üreticiyi çağırır — `switch` AYRIK BİRLEŞİM üzerinde tam. */
async function uret(istek: ReturnType<typeof exportRequestSchema.parse>): Promise<CsvExportDto> {
  switch (istek.dataset) {
    case 'transactions':
      return exportTransactionsCsv(istek.filter, istek.basis, db);
    case 'categories':
      return exportCategoryBreakdownCsv(istek.range, istek.basis, db);
    case 'monthly':
      return exportMonthlySummaryCsv(istek.year, istek.basis, db);
  }
  /*
   * `default` YOK ve bu kasıtlı: ayrık birleşime yeni bir küme eklendiğinde
   * `tsc` burayı eksik bulup kırar. `default: throw` yazmak o derleme zamanı
   * uyarısını ÇALIŞMA ZAMANI hatasına çevirirdi (T-046'da aynı kalıp
   * `toApiFailure`da işe yaradı).
   */
}

/**
 * Denetim kaydına giren KAPSAM ÖZETİ — tutar ve kimlik YOK, yalnızca sınırlar.
 *
 * İşlem defterinde filtre serbest olduğu için yalnızca TARİH uçları yazılıyor:
 * `categoryId`/`jobId`/`clientId` gibi kimlikler dosyanın kapsamını daraltıyor
 * ama denetim sorusunu ("ne kadar veri çıktı") cevaplamıyor ve kaydı kimlik
 * taşıyıcısına çevirirdi.
 */
function kapsamOzeti(istek: ReturnType<typeof exportRequestSchema.parse>): string {
  switch (istek.dataset) {
    case 'transactions':
      return `${istek.filter.from ?? 'baslangicsiz'}..${istek.filter.to ?? 'bitissiz'}`;
    case 'categories':
      return `${istek.range.from}..${istek.range.to}`;
    case 'monthly':
      return String(istek.year);
  }
}
