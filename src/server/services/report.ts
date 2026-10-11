import { db } from '@/server/db';
import type { TransactionType } from '@/types';

import {
  appDayToDate,
  appMonthRange,
  appYearRange,
  buildPeriodKey,
  sumMoney,
  subtractMoney,
  toMoneyString,
  type AppDay,
  type AppDayRange,
  type DecimalLike,
} from './_shared';
import { fetchJobFinancials } from './job';

/**
 * RAPOR HESAPLAYICILARI — §4.2 `/panel/muhasebe/raporlar`, ADR-014/015, T-102.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ "GELİR" TEK BAŞINA İKİ ŞEYİ ADLANDIRIYOR — KARAR: İKİSİ DE DÖNER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aylık "gelir" neyi sayıyor: KESİLEN FATURA mı, TAHSİL EDİLEN PARA mı? İkisi
 * farklı rapor ve ikisi de meşru:
 *
 *   NAKİT ESASI   (cash)    → eline geçen para. "Bu ay ne kazandım" sorusunun
 *                             günlük dildeki cevabı.
 *   TAHAKKUK ESASI (accrual) → hak edilen/doğan tutar. "Bu ay ne ürettim".
 *
 * BİRİNİ SEÇİP "gelir" DEMEK EN KÖTÜ SEÇENEKTİ. Rakamı okuyan kişi hangisine
 * baktığını bilemez ve iki rapor birbirini tutmadığında hatayı veride arar.
 * T-101'de `JobFinancialsDto` için verilen kararın aynısı: alan adı HANGİSİ
 * olduğunu söylemek zorunda (`collected`/`invoiced`, `paid`/`incurred`).
 *
 * ⚠️ ÇIPLAK BİR `net` ALANI YOK — AMA İKİ ESASIN NET'İ VAR, VE SEBEBİ ÖNEMLİ.
 *
 * T-101'de bir iş için `net` yazmayı reddetmiştim: v1 vergiyi hesaplamadığı
 * için bir kâr iddiası dürüst olmazdı. Burada farklı davranıyorum ve gerekçesi
 * şu: netleri DÖNDÜRMEMEK riski ARAYÜZE TAŞIYOR. Arayüz çıkarma yapmak zorunda
 * kalır ve YANLIŞ ÇİFTİ seçebilir —
 *
 *     invoiced − paid   ← TAHAKKUK geliri ile NAKİT gideri karıştırır
 *
 * Bu, iki esası tek sayıda birleştiren sessiz bir hata ve bu projenin tanıdığı
 * sınıf. Doğru eşleşmeleri BURADA kurmak onu yapısal olarak imkânsız kılıyor:
 * `net.cash` yalnızca `collected − paid`, `net.accrual` yalnızca
 * `invoiced − incurred`. İsim esası söylüyor, yani "kâr" iddiası da yok.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * T-101 İLE UYUM — `JobFinancialsDto.expense` TAHAKKUK GÖRÜNÜMÜDÜR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * T-101'de bir işin `expense`i `isPaid` ayrımı YAPMIYOR ("gelen fatura, henüz
 * ödenmemiş olsa da o işin maliyetidir"). Yani o alan burada `expense.incurred`
 * karşılığıdır. İki yüzey çelişmiyor; aynı sayının iki farklı soruya verilmiş
 * cevabı. Bu eşleştirme yazılı olmasa, biri "iş gideri 10.000 ama aylık gider
 * 3.000" görüp veriden şüphelenirdi.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ DÖNEM EKSENİ `date` — `paidAt` DEĞİL, VE SEBEBİ ÖLÇÜLDÜ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Nakit esası için "paranın hareket ettiği an" kulağa `paidAt` gibi geliyor.
 * Kullanılmıyor çünkü `paidAt` OPSİYONEL ve rutin olarak `null`:
 * `Transaction.isPaid` varsayılanı `true` ama `paidAt` zorunlu değil, yani
 * ödenmiş kayıtların çoğu damga taşımıyor. Ekseni `paidAt` yapmak o satırların
 * TAMAMINI rapordan düşürürdü — sessiz ve büyük bir kayıp.
 *
 * `date` kullanıcının girdiği MUHASEBE GÜNÜDÜR ve nakit bir kayıtta kullanıcı
 * oraya paranın hareket ettiği günü yazar.
 *
 * BİLİNEN SINIR: `paidAt` DOLU ve `date` ile AYRI AYLARA düşüyorsa nakit
 * görünümü kaydı `date`in ayına yazar. Düzeltmek `paidAt`i `isPaid` olduğunda
 * ZORUNLU kılmayı gerektirir — şema değişikliği, yani bu kartın kapsamı dışı.
 * Raporlandı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ AY SINIRI: `appDayToDate` DOĞRU, `appDayStartInstant` YANLIŞ — ÖLÇÜLDÜ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Görev kartı `appDayStartInstant`/`appDayRangeToInstantFilter` kullanmamı
 * istedi ve gerekçesi "`date` bir `DateTime`, sınır İstanbul'da üç saat kayıyor"
 * idi. ⚠️ BU ÖNCÜL BU SÜTUN İÇİN GEÇERLİ DEĞİL ve ölçtüm (T-102, canlı PG):
 *
 *   information_schema → transaction.date = `date`   (timestamp DEĞİL)
 *                        transaction.paidAt = `timestamp`
 *                        audit_log.createdAt = `timestamp`
 *
 *   Mart sınırı, dört sınır kaydıyla (28 Şub · 1 Mar · 31 Mar · 1 Nis):
 *     appDayToDate       → 1 Mar, 31 Mar      ✅ DOĞRU küme
 *     appDayStartInstant → 28 Şub, 1 Mar      ❌ Şubat'ı içeriyor, 31 Mart'ı DÜŞÜRÜYOR
 *
 * Yani önerilen yardımcı ayı bir gün geriye kaydırıyor: şubatın son günü marta
 * sayılıyor, martın son günü hiç sayılmıyor. Kartın engellemek istediği hata
 * sınıfının ta kendisi, ama bu sütunda SEBEBİ ters.
 *
 * KURAL (T-101'de de yazılıydı): HANGİ YARDIMCININ KULLANILACAĞINI SÜTUNUN
 * TİPİ BELİRLER. `date` sütunu saat saklamıyor → UTC gece yarısı tam doğru.
 * `timestamp` sütunu (T-052'nin `AuditLog.createdAt`i) → `appDayStartInstant`.
 * `tests/unit/services/rapor.test.ts` iki yönü de sabitliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · HAM SQL YOK
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Önbellek gerekçesi T-038/T-040/T-052/T-101 ile aynı. §8.10 gereği ham SQL de
 * yok: yıllık rapor "aya göre grupla" isteseydi `date_trunc` gerekirdi; yerine
 * `by: ['date', …]` ile gün bazında gruplanıp AYLARA KATLANIYOR — tek sorgu,
 * en kötü hâlde 365×4 grup, ve güvenlik onayı gerektirmiyor.
 */

/* ===========================================================================
 * DTO
 * ======================================================================== */

/** Bir dönemdeki para hareketi — İKİ ESAS AYRI AYRI, isimler esası söylüyor. */
export interface PeriodTotalsDto {
  income: {
    /** GELİR ∧ ödenmiş — eline geçen para (nakit esası). */
    collected: string;
    /** GELİR, ödenme durumuna BAKILMAZ — kesilen toplam (tahakkuk esası). */
    invoiced: string;
  };
  expense: {
    /** GİDER ∧ ödenmiş (nakit esası). */
    paid: string;
    /** GİDER, ödenme durumuna BAKILMAZ (tahakkuk esası). T-101'in `expense`i. */
    incurred: string;
  };
  /** Doğru eşleşmiş netler — çapraz esas karışımı YAPISAL OLARAK imkânsız. */
  net: {
    /** `collected − paid`. */
    cash: string;
    /** `invoiced − incurred`. */
    accrual: string;
  };
  transactionCount: number;
}

export interface MonthlyReportDto extends PeriodTotalsDto {
  /** `periodKey` (ADR-015) — `2026-03`. Tek yerden üretiliyor. */
  period: string;
  /** Hesaba katılan gün aralığı — iki uç DAHİL. */
  range: { from: AppDay; to: AppDay };
}

export interface YearlyReportDto extends PeriodTotalsDto {
  /** `periodKey` — `2026`. */
  period: string;
  range: { from: AppDay; to: AppDay };
  /** ON İKİ ay, hareketsiz aylar SIFIRLARLA — eksik ay yok (gerekçe aşağıda). */
  months: MonthlyReportDto[];
}

/**
 * Kategori dağılımının BİR SATIRI.
 *
 * ⚠️ SATIR ANAHTARI (kategori, İŞLEM TÜRÜ) ÇİFTİDİR — gerekçe
 * `fetchCategoryBreakdown`ın üstünde. Bir kategori İKİ satır üretebilir.
 */
export interface CategoryBreakdownRowDto {
  categoryId: string;
  categoryName: string;
  /** ⚠️ İŞLEMİN türü — gruplama anahtarı. Kategorinin türü DEĞİL. */
  type: TransactionType;
  /** Kategorinin KENDİ türü. İşlemin türünden farklı olabilir ve bu MEŞRU. */
  categoryType: TransactionType;
  /** `type !== categoryType` — arayüz bunu açıklamak zorunda, saklamamalı. */
  typeMismatch: boolean;
  collected: string;
  invoiced: string;
  transactionCount: number;
}

/**
 * Toplam alacak — `fetchJobFinancials`ın KATLANMIŞ hâli.
 *
 * Kendi toplama kuralını YAZMIYOR, o fonksiyonu ÇAĞIRIYOR. Böylece işaret
 * kararı (gider netlenmez), `isPaid` asimetrisi ve `remaining` kuralları ile
 * SAPMASI İMKÂNSIZ — ikinci bir kopya olsaydı biri düzeltilip diğeri kalırdı.
 */
export interface OutstandingSummaryDto {
  /** Tahsil edilmemiş alacak toplamı. */
  totalRemaining: string;
  /** Kesilmiş ama tahsil edilmemiş faturalar — `totalRemaining` İÇİNDE. */
  totalPending: string;
  /** Hesaba KATILAN iş sayısı. */
  jobCount: number;
  /**
   * Anlaşma tutarı BİLİNMEDİĞİ için hesaba KATILMAYAN iş sayısı (`LEAD`ler).
   *
   * Dışarı veriliyor çünkü aksi hâlde toplam "düşük" görünür ve sebebi
   * görünmez olurdu. Sıfır göstermek yerine saymak, T-101'in `remaining: null`
   * kararının rapor tarafındaki karşılığı.
   */
  unknownAmountJobCount: number;
  /** İPTAL EDİLMİŞ işler hesaba KATILMADI — kaç tanesi atlandı. */
  cancelledJobCount: number;
}

/* ===========================================================================
 * PRISMA YÜZEYİ
 * ======================================================================== */

type GroupRow<K extends string> = Record<K, string | Date> & {
  type: TransactionType;
  isPaid: boolean;
  _sum: { baseAmount: DecimalLike | null };
  _count: number;
};

export interface ReportClient {
  transaction: {
    groupBy(args: {
      by: ['date', 'type', 'isPaid'];
      where: { date: { gte: Date; lte: Date } };
      _sum: { baseAmount: true };
      _count: true;
    }): Promise<(GroupRow<'date'> & { date: Date })[]>;
  };
  transactionCategory: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; name: true; type: true };
    }): Promise<{ id: string; name: string; type: TransactionType }[]>;
  };
}

export interface CategoryReportClient {
  transaction: {
    groupBy(args: {
      by: ['categoryId', 'type', 'isPaid'];
      where: { date: { gte: Date; lte: Date } };
      _sum: { baseAmount: true };
      _count: true;
    }): Promise<(GroupRow<'categoryId'> & { categoryId: string })[]>;
  };
  transactionCategory: ReportClient['transactionCategory'];
}

export interface OutstandingClient {
  job: {
    findMany(args: {
      where: { status: { not: 'CANCELLED' } };
      select: { id: true; baseAmount: true };
    }): Promise<{ id: string; baseAmount: DecimalLike | null }[]>;
    count(args: { where: { status: 'CANCELLED' } }): Promise<number>;
  };
}

/** Uyum kapıları — gerçek istemci dar arayüzlere OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumRapor: ReportClient = db;
const _uyumKategori: CategoryReportClient = db;
const _uyumAlacak: OutstandingClient = db;
void _uyumRapor;
void _uyumKategori;
void _uyumAlacak;

/* ===========================================================================
 * KATLAMA — tek yerde, üç rapor da buradan geçiyor
 * ======================================================================== */

function sifirToplam(): PeriodTotalsDto {
  return {
    income: { collected: '0.00', invoiced: '0.00' },
    expense: { paid: '0.00', incurred: '0.00' },
    net: { cash: '0.00', accrual: '0.00' },
    transactionCount: 0,
  };
}

/**
 * Bir grup satırını toplama ekler — İŞARET VE `isPaid` KURALI TEK YERDE.
 *
 * `invoiced`/`incurred` ödenme durumuna bakmaz, yani ödenmiş bir kayıt HEM
 * `collected`a HEM `invoiced`a girer. Bu bir çiftlenme değil, iki esasın
 * tanımı: tahakkuk görünümü nakit görünümünü KAPSAR.
 */
function topla(
  hedef: PeriodTotalsDto,
  satir: { type: TransactionType; isPaid: boolean; tutar: string; adet: number },
): void {
  hedef.transactionCount += satir.adet;

  if (satir.type === 'INCOME') {
    hedef.income.invoiced = sumMoney([hedef.income.invoiced, satir.tutar]);
    if (satir.isPaid) hedef.income.collected = sumMoney([hedef.income.collected, satir.tutar]);
  } else {
    hedef.expense.incurred = sumMoney([hedef.expense.incurred, satir.tutar]);
    if (satir.isPaid) hedef.expense.paid = sumMoney([hedef.expense.paid, satir.tutar]);
  }
}

/** Netleri DOĞRU ÇİFTLERDEN kurar — çapraz esas karışımı burada engelleniyor. */
function netleriKur(hedef: PeriodTotalsDto): void {
  hedef.net.cash = subtractMoney(hedef.income.collected, hedef.expense.paid);
  hedef.net.accrual = subtractMoney(hedef.income.invoiced, hedef.expense.incurred);
}

/** `AppDayRange` → Prisma `where.date`. Sütun `date` tipinde; gerekçe dosya başında. */
function araligaCevir(range: AppDayRange): { date: { gte: Date; lte: Date } } {
  return { date: { gte: appDayToDate(range.from), lte: appDayToDate(range.to) } };
}

/* ===========================================================================
 * AYLIK
 * ======================================================================== */

/**
 * Bir ayın toplamları.
 *
 * `appMonthRange` ARALIKI ÜRETEN TEK YER (ADR-016): artık yılı ve ay uzunluğunu
 * o çözüyor, burada `'-31'` gibi bir dize kurulmuyor. Geçersiz ay (`0`, `13`)
 * için fırlatıyor ve bu DOĞRU davranış — `appDayToDate`in takvimde olmayan gün
 * için fırlatmasıyla aynı aile; sessizce boş rapor dönmek, kullanıcıya "o ayda
 * hareket yok" demek olurdu.
 *
 * ⚠️ `period` `buildPeriodKey` ile üretiliyor (ADR-015), `${year}-${month}` diye
 * elle kurulmuyor: elle kurmak `2026-3` üretir ve `periodKeySchema` deseniyle
 * uyuşmazdı.
 */
export async function fetchMonthlyReport(
  year: number,
  month: number,
  client: ReportClient = db,
): Promise<MonthlyReportDto> {
  const range = appMonthRange(year, month);

  const gruplar = await client.transaction.groupBy({
    by: ['date', 'type', 'isPaid'],
    where: araligaCevir(range),
    _sum: { baseAmount: true },
    _count: true,
  });

  const toplam = sifirToplam();
  for (const grup of gruplar) {
    topla(toplam, {
      type: grup.type,
      isPaid: grup.isPaid,
      tutar: toMoneyString(grup._sum.baseAmount) ?? '0.00',
      adet: grup._count,
    });
  }
  netleriKur(toplam);

  return { ...toplam, period: buildPeriodKey('MONTHLY', range.from), range };
}

/* ===========================================================================
 * YILLIK
 * ======================================================================== */

/**
 * Bir yılın toplamları + ON İKİ AYIN dökümü. TEK SORGU.
 *
 * Gün bazında gruplanıp aylara katlanıyor; `date_trunc` gerektiren bir "aya
 * göre grupla" yazmak ham SQL demekti (§8.10, güvenlik onayı gerekir).
 *
 * ⚠️ HAREKETSİZ AY DA DÖNÜYOR (sıfırlarla) ve on iki ay TAM. Eksik ay
 * döndürmek, grafiği çizecek arayüzü "hangi aylar yok" diye doldurmaya zorlar
 * ve biri bunu atladığında şubat ile nisan yan yana çizilir — sessiz ve
 * okunması zor bir hata. `fetchJobFinancials`ın "işlemi olmayan iş de tam DTO
 * döner" kararının aynısı.
 */
export async function fetchYearlyReport(
  year: number,
  client: ReportClient = db,
): Promise<YearlyReportDto> {
  const range = appYearRange(year);

  const gruplar = await client.transaction.groupBy({
    by: ['date', 'type', 'isPaid'],
    where: araligaCevir(range),
    _sum: { baseAmount: true },
    _count: true,
  });

  /**
   * `YYYY-MM` → aylık toplam. On ikisi de ÖNDEN kuruluyor.
   *
   * ⚠️ ANAHTAR TAM DÖNEM, SADECE AY NUMARASI DEĞİL — ve bu bir hata
   * düzeltmesi. İlk uygulama `Map<number, …>` kullanıyordu (`ay = 1..12`) ve
   * yıl dışı bir satır — ör. `2027-01-05` — ay numarası GEÇERLİ olduğu için
   * raporlanan yılın OCAK kovasına düşüyordu. Aşağıdaki `if (hedefAy)` koruması
   * da hiç ateşlenmiyordu: eşleşmeyen şey ay değil YILDI.
   *
   * Testle yakalandı (`rapor.test.ts` → "YIL DIŞI bir grup satırı
   * YOKSAYILIYOR"). Pratikte `where` yılı sınırlandırdığı için üretimde
   * görünmezdi — yani tam olarak "savunduğunu sanan ama savunmayan dal"
   * sınıfı. Tam dönem anahtarıyla eşleşme yıl dahil kontrol ediliyor.
   */
  const aylar = new Map<string, MonthlyReportDto>();
  for (let ay = 1; ay <= 12; ay += 1) {
    const ayAralik = appMonthRange(year, ay);
    aylar.set(buildPeriodKey('MONTHLY', ayAralik.from), {
      ...sifirToplam(),
      period: buildPeriodKey('MONTHLY', ayAralik.from),
      range: ayAralik,
    });
  }

  const yilToplam = sifirToplam();

  for (const grup of gruplar) {
    /*
     * `@db.Date` UTC gece yarısı olarak okunuyor (T-102'de canlı ölçüldü:
     * `date=2026-02-05T00:00:00.000Z (Date)`), bu yüzden gün dizesi doğrudan
     * ISO diliminden alınıyor — `toAppDay` bir zaman dilimi dönüşümü yapar ve
     * burada o dönüşüm YANLIŞ olurdu (gece yarısı İstanbul'da bir gün önceye
     * düşer).
     */
    const gun = grup.date.toISOString().slice(0, 10) as AppDay;

    const satir = {
      type: grup.type,
      isPaid: grup.isPaid,
      tutar: toMoneyString(grup._sum.baseAmount) ?? '0.00',
      adet: grup._count,
    };

    /*
     * Anahtar TAM DÖNEM: yıl dışı bir satır eşleşmez ve TAMAMEN yoksayılır —
     * yıl toplamına da girmez.
     *
     * ⚠️ `continue` ÖNEMLİ: satırı aya yazmayıp yıl toplamına eklemek,
     * "ayların toplamı = yıl toplamı" değişmezini bozardı ve raporu okuyan
     * kişi farkı veride arardı. Bir satır ya ikisine girer ya hiçbirine.
     */
    const hedefAy = aylar.get(buildPeriodKey('MONTHLY', gun));
    if (!hedefAy) continue;

    topla(hedefAy, satir);
    topla(yilToplam, satir);
  }

  for (const ayToplam of aylar.values()) netleriKur(ayToplam);
  netleriKur(yilToplam);

  return {
    ...yilToplam,
    period: buildPeriodKey('YEARLY', range.from),
    range,
    months: [...aylar.values()],
  };
}

/* ===========================================================================
 * ⚠️⚠️ KATEGORİ DAĞILIMI — `Transaction.type` ÜZERİNDEN
 * ======================================================================== */

/**
 * Kategori dağılımı — gruplama anahtarı (kategori, **İŞLEMİN TÜRÜ**).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KATEGORİNİN TÜRÜ ÜZERİNDEN HESAPLAMAK SESSİZCE YANLIŞ OLUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `TransactionCategory.type` SONRADAN DEĞİŞTİRİLEBİLİYOR (T-101,
 * `updateTransactionCategory` buna izin veriyor ve vermesi doğru: kullanıcı
 * kategoriyi yanlış türle açmış olabilir). Ama `Transaction.type` BAĞIMSIZ bir
 * sütun ve değişmiyor — işlemin türü işlemin gerçeğidir.
 *
 * Sonuç: "gider kategorisinde gelir işlemi" MEŞRU bir durumdur. Dağılımı
 * kategorinin türüne göre hesaplamak o işlemleri YANLIŞ TARAFA yazar ve gelir
 * tablosu sessizce bozulur — toplamlar yine tutar, yalnızca yanlış kümede.
 *
 * Bu yüzden gruplama `Transaction.type` ile yapılıyor ve bir kategori İKİ SATIR
 * üretebiliyor. `typeMismatch` o satırı İŞARETLİYOR: arayüz durumu açıklamak
 * zorunda, saklamamalı — kullanıcı "neden burada gelir var" diye sorabilmeli.
 *
 * Sabitleyen test: `rapor.test.ts` → "kategori dağılımı İŞLEMİN türüne göre".
 *
 * SIRALAMA: tutara göre azalan (`invoiced`), çünkü dağılımın sorusu "en çok
 * nerede". Eşitlikte ada göre — aksi hâlde sıra Postgres'in döndürme sırasına
 * kalır ve sayfa her yenilemede farklı dizilebilir.
 */
export async function fetchCategoryBreakdown(
  range: AppDayRange,
  client: CategoryReportClient = db,
): Promise<CategoryBreakdownRowDto[]> {
  const gruplar = await client.transaction.groupBy({
    by: ['categoryId', 'type', 'isPaid'],
    where: araligaCevir(range),
    _sum: { baseAmount: true },
    _count: true,
  });

  if (gruplar.length === 0) return [];

  const kategoriler = await client.transactionCategory.findMany({
    where: { id: { in: [...new Set(gruplar.map((g) => g.categoryId))] } },
    select: { id: true, name: true, type: true },
  });
  const kategoriHaritasi = new Map(kategoriler.map((k) => [k.id, k]));

  /** `categoryId|type` → satır. `isPaid` İÇİNDE katlanıyor. */
  const satirlar = new Map<string, CategoryBreakdownRowDto>();

  for (const grup of gruplar) {
    const anahtar = `${grup.categoryId}|${grup.type}`;
    const kategori = kategoriHaritasi.get(grup.categoryId);

    let satir = satirlar.get(anahtar);
    if (!satir) {
      satir = {
        categoryId: grup.categoryId,
        // Kategori silinemiyor (ADR-017, `Restrict`), yani bu dal pratikte
        // erişilemez; yine de sessiz bir `undefined` basmak yerine açık.
        categoryName: kategori?.name ?? '(bilinmeyen kategori)',
        type: grup.type,
        categoryType: kategori?.type ?? grup.type,
        typeMismatch: kategori !== undefined && kategori.type !== grup.type,
        collected: '0.00',
        invoiced: '0.00',
        transactionCount: 0,
      };
      satirlar.set(anahtar, satir);
    }

    const tutar = toMoneyString(grup._sum.baseAmount) ?? '0.00';
    satir.invoiced = sumMoney([satir.invoiced, tutar]);
    if (grup.isPaid) satir.collected = sumMoney([satir.collected, tutar]);
    satir.transactionCount += grup._count;
  }

  return [...satirlar.values()].sort((a, b) => {
    const fark = Number(b.invoiced) - Number(a.invoiced);
    // `Number` YALNIZCA SIRALAMADA — hiçbir tutar bu değerden türetilmiyor,
    // dolayısıyla ADR-014'ün "para `number`a çevrilmez" kuralı korunuyor.
    // Eşitlikte ad: sıra Postgres'in döndürme sırasına kalmasın.
    return fark !== 0 ? fark : a.categoryName.localeCompare(b.categoryName, 'tr');
  });
}

/* ===========================================================================
 * TOPLAM ALACAK
 * ======================================================================== */

/**
 * Tahsil edilmemiş toplam alacak — `fetchJobFinancials`ı KATLAYARAK.
 *
 * ⚠️ KENDİ TOPLAMA KURALINI YAZMIYOR. İşaret kararı (gider netlenmez), `isPaid`
 * asimetrisi ve `remaining` kuralları T-101'de bir kez verildi; burada ikinci
 * bir kopya açmak, ikisinin sapması demekti — biri düzeltilir, diğeri kalır.
 * Bu yüzden toplam, aynı fonksiyonun çıktısı üzerinde bir FOLD.
 *
 * İPTAL EDİLMİŞ İŞLER HARİÇ: düşmüş bir anlaşmanın kalanı tahsil edilebilir bir
 * alacak değil. Kaç tanesinin atlandığı DÖNÜYOR — sessizce dışlamak "toplam
 * neden düşük" sorusunu üretirdi.
 *
 * ANLAŞMA TUTARI BİLİNMEYEN İŞLER DE HARİÇ (`remaining === null`) ve ayrıca
 * sayılıyor: `LEAD` aşamasındaki bir işi `0` saymak toplamı doğru gösterirdi
 * ama "bu işten ne bekliyorum" sorusunu sessizce yok sayardı.
 */
export async function fetchOutstandingSummary(
  client: OutstandingClient & Parameters<typeof fetchJobFinancials>[1] = db,
): Promise<OutstandingSummaryDto> {
  const [isler, cancelledJobCount] = await Promise.all([
    client.job.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: { id: true, baseAmount: true },
    }),
    client.job.count({ where: { status: 'CANCELLED' } }),
  ]);

  if (isler.length === 0) {
    return {
      totalRemaining: '0.00',
      totalPending: '0.00',
      jobCount: 0,
      unknownAmountJobCount: 0,
      cancelledJobCount,
    };
  }

  const finans = await fetchJobFinancials(
    isler.map((is) => is.id),
    client,
  );

  let totalRemaining = '0.00';
  let totalPending = '0.00';
  let jobCount = 0;
  let unknownAmountJobCount = 0;

  for (const dto of Object.values(finans)) {
    if (dto.remaining === null) {
      unknownAmountJobCount += 1;
      // Bekleyen fatura anlaşma tutarından BAĞIMSIZ — tutar bilinmese de
      // kesilmiş bir fatura vardır ve toplama girer.
      totalPending = sumMoney([totalPending, dto.pending]);
      continue;
    }
    jobCount += 1;
    totalRemaining = sumMoney([totalRemaining, dto.remaining]);
    totalPending = sumMoney([totalPending, dto.pending]);
  }

  return { totalRemaining, totalPending, jobCount, unknownAmountJobCount, cancelledJobCount };
}
