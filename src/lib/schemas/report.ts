import * as z from 'zod';

/**
 * Rapor dönemi — §4.2 `/panel/muhasebe/raporlar`, T-106.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU ŞEMA VAR: ÖLÇÜLEN BİR 500
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rapor servisleri dönemi `(year, month)` olarak alıyor ve geçersiz ay için
 * FIRLATIYOR (`appMonthRange` → "Geçersiz ay"). Fırlatmak doğru davranış —
 * sessizce boş rapor dönmek kullanıcıya "o ayda hareket yok" demek olurdu.
 *
 * AMA FIRLATMA BİR KULLANICI HATASI DEĞİL, BİR SUNUCU HATASI OLARAK ÇIKIYOR:
 * `/panel/muhasebe/raporlar?month=99` adresinde sayfa 500 verir. ADR-032'nin
 * cümlesi tam buraya bakıyor — **adres çubuğu KULLANICI GİRDİSİDİR.** Bir
 * kullanıcının yazabildiği değer, doğrulanmadan bir hesaba girmemeli.
 *
 * Bu şema birinci kapı: sayfa `safeParse` ile ayrıştırıp ALAN HATASI
 * gösterebiliyor. Servisin fırlatması İKİNCİ kapı olarak duruyor ve kalıyor —
 * doğrudan çağıran bir betik ya da ileride bir cron şemayı atlayabilir.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ YIL SINIRI KEYFİ DEĞİL — ÖLÇÜLDÜ (T-106)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Tarih yardımcıları DÖRT BASAMAKLI yıl varsayıyor. Ölçüm:
 *
 *   yıl      appDayToDate        buildPeriodKey          sonuç
 *   ────     ──────────────      ──────────────────      ──────────────────
 *    999     FIRLATIR            `"999-03-"`             geçersiz anahtar
 *   1000     ✅                   `"1000-03"`             geçerli
 *   9999     ✅                   `"9999-03"`             geçerli
 *  10000     FIRLATIR            `"10000-0"`             geçersiz anahtar
 *      0     FIRLATIR            `"0-03-01"`             geçersiz anahtar
 *     -5     FIRLATIR            `"-5-03-0"`             geçersiz anahtar
 *
 * ⚠️ KRİTİK OLAN İKİNCİ KOLON: `buildPeriodKey` SESSİZCE BOZUK anahtar üretiyor
 * (`day.slice(0, 7)` dört basamaklı yıl varsayıyor), fırlatmıyor. Yani sınır
 * yalnızca kozmetik bir aralık kontrolü değil — `periodKey`in iyi biçimli
 * kalmasını sağlayan şey. ADR-015'in `@@unique([sourceRecurringId, periodKey])`
 * idempotanslığı bu biçime bağlı.
 *
 * Sınırlar bu yüzden 1000–9999: yardımcıların GERÇEKTEN çalıştığı aralık.
 * "2000–2100" gibi iş odaklı bir aralık seçmek daha dar görünürdü ama keyfî
 * olurdu; burada sınır ÖLÇÜLEN bir teknik gerçek.
 */

/**
 * `z.coerce` ZORUNLU: değerler URL arama parametresinden gelir, yani DAİMA
 * dize (`common.ts`'in filtre bloğundaki aynı gerekçe).
 *
 * `z.coerce.boolean()`in tersine `z.coerce.number()` SESSİZ DEĞİL: `"abc"` →
 * `NaN` ve `.int()` onu reddediyor. Ölçülen davranışlar:
 *   `""` → 0 (min sınırına takılır) · `"2026.5"` → `.int()` reddediyor
 */
const yearSchema = z.coerce
  .number({ error: 'Yıl geçersiz.' })
  .int({ error: 'Yıl tam sayı olmalıdır.' })
  .min(1000, { error: 'Yıl 1000 ile 9999 arasında olmalıdır.' })
  .max(9999, { error: 'Yıl 1000 ile 9999 arasında olmalıdır.' });

const monthSchema = z.coerce
  .number({ error: 'Ay geçersiz.' })
  .int({ error: 'Ay tam sayı olmalıdır.' })
  .min(1, { error: 'Ay 1 ile 12 arasında olmalıdır.' })
  .max(12, { error: 'Ay 1 ile 12 arasında olmalıdır.' });

/**
 * Aylık rapor dönemi — `year` + `month`, ikisi de ZORUNLU.
 *
 * `month` opsiyonel BIRAKILMADI ve ayrı bir şema yazıldı (`yearlyReportSchema`):
 * tek şemada opsiyonel bir `month` "ay verilmezse yıllık rapor" demek olurdu ve
 * çağıran tarafın hangi raporu aldığını ÇALIŞMA ZAMANINDA anlaması gerekirdi.
 * İki ayrı şema, iki ayrı servis — tip düzeyinde belirli.
 */
export const monthlyReportSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

/** Yıllık rapor dönemi. */
export const yearlyReportSchema = z.object({
  year: yearSchema,
});

/**
 * Serbest gün aralığı — kategori dağılımı ve CSV dışa aktarım bunu kullanır.
 *
 * `dateRangeSchema` (`common.ts`) ile AYNI KURAL ama iki uç ZORUNLU: dağılımın
 * "başlangıcı verilmemiş" hâli yok, rapor ekranı daima bir aralıkla geliyor.
 * Ters aralık reddediliyor — sessizce boş liste dönse kullanıcı filtresini
 * değil VERİSİNİ sorgulamaya başlardı (T-052'de aynı gerekçe).
 */
export const reportRangeSchema = z
  .object({
    from: z.iso.date({ error: 'Başlangıç tarihi YYYY-AA-GG biçiminde olmalıdır.' }),
    to: z.iso.date({ error: 'Bitiş tarihi YYYY-AA-GG biçiminde olmalıdır.' }),
  })
  .refine((value) => value.from <= value.to, {
    error: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
    path: ['to'],
  });

/* ===========================================================================
 * CSV DIŞA AKTARIM — hangi rapor, hangi esas
 * ======================================================================== */

/**
 * Dışa aktarılacak veri kümesi.
 *
 * `transactions` → işlem defteri (satır başına bir hareket)
 * `categories`   → kategori dağılımı (satır başına bir kategori+tür)
 * `monthly`      → yılın on iki ayı (satır başına bir ay)
 */
export const exportDatasetSchema = z.enum(['transactions', 'categories', 'monthly'], {
  error: 'Geçersiz dışa aktarım türü.',
});

/**
 * ⚠️ ESAS AÇIKÇA SEÇİLİYOR — VARSAYILANI YOK.
 *
 * "Gelir" tek başına iki şeyi adlandırıyor (T-102 kararı): nakit esası tahsil
 * edileni, tahakkuk esası kesileni sayar. Dosya bir muhasebeciye gidebilir ve
 * hangi esası taşıdığı BELİRSİZ KALMAMALI.
 *
 * Bu yüzden `basis` ZORUNLU — varsayılan vermek, kullanıcının seçmediği bir
 * esası ona atfetmek olurdu. Seçim dosyanın BAŞLIĞINA da yazılıyor
 * (`services/export.ts`).
 */
export const exportBasisSchema = z.enum(['cash', 'accrual'], {
  error: 'Geçersiz esas. "cash" (nakit) ya da "accrual" (tahakkuk) olmalıdır.',
});

export type MonthlyReportPeriod = z.infer<typeof monthlyReportSchema>;
export type YearlyReportPeriod = z.infer<typeof yearlyReportSchema>;
export type ReportRange = z.infer<typeof reportRangeSchema>;
export type ExportDataset = z.infer<typeof exportDatasetSchema>;
export type ExportBasis = z.infer<typeof exportBasisSchema>;
