import { createGeneratedTransactionSchema, type RecurrenceRule } from '@/lib/schemas';
import { db } from '@/server/db';
import type { Currency, PaymentMethod, TransactionType } from '@/types';

import {
  addAppDays,
  addAppMonths,
  addAppYears,
  appDayToDate,
  appToday,
  buildPeriodKey,
  computeBaseAmount,
  dateToAppDay,
  toMoneyString,
  type AppDay,
  type DecimalLike,
} from './_shared';

/**
 * `RecurringTransaction` ÜRETİM SERVİSİ — ADR-040, ADR-015, T-109b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜÇ TUR KAPSAM DIŞI BIRAKTIM; ADR-040 İTİRAZI ESNETMEDİ, KARŞILADI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İtirazım *"çağıranı olmayan servis yazmak"*tı ve çıkmazı çözen gözlem şuydu:
 * sorun servis değil, ÇAĞIRANIN CRON OLMAK ZORUNDA SANILMASI. Tetikleyici elle
 * (panelden) olunca servisin gerçek bir çağıranı var; F7'de cron AYNI eylemi
 * çağıracak — yeni kod değil, yeni bir tetikleyici.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️⚠️ KARAR: GECİKMİŞ DÖNEMLERİN HEPSİ ÜRETİLİR ("yakalama"), BİRİ DEĞİL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ADR-040 bunu bilerek açık bıraktı: kullanıcı üç ay basmazsa üç kayıt mı, bir
 * mi? CEVAP: ÜÇ. Ve gerekçe tek bir cümlede — **abonelik üç kez çekildi.**
 *
 * Şablon gerçek bir yükümlülüğü temsil ediyor. Kullanıcı düğmeye basmadığı için
 * para hesaptan çıkmadı değil; çıktı. Tek kayıt üretmek Ağustos ve Eylül'ün
 * aylık raporlarını EKSİK gösterirdi — ve bu, T-102'de "sessizce yanlış toplam"
 * diye adlandırdığım sınıfın ta kendisi. Defter olayı kaydeder, düğmeye basılma
 * anını değil.
 *
 * ⚠️ VE BU YORUM DEĞİL: ŞEMANIN KENDİSİ BUNU SÖYLÜYOR.
 * `@@unique([sourceRecurringId, periodKey])` kısıtı DÖNEM BAŞINA tekillik
 * kuruyor. Yalnızca "şimdi" üretilecekse o anahtar anlamsız olurdu — bir damga
 * yeterdi. Dönem bazlı anahtar, çoklu dönem üretiminin baştan tasarlandığının
 * kanıtı (ADR-015).
 *
 * SINIRSIZ DEĞİL: tek basışta şablon başına `CATCHUP_LIMIT` dönem üretilir ve
 * KALAN SAYISI döner. Beş yıl dokunulmamış bir `DAILY` şablon tek basışta
 * binlerce kayıt üretmesin; kullanıcı tekrar basarak bitirir ve ne kaldığını
 * görür (`BOARD_COLUMN_LIMIT`in kalıbı: üst sınır + dürüst sayı).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ `nextRunAt` BİR İMLEÇ DEĞİL — DOĞRULUK ONA BAĞLI DEĞİL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Hangi şablonların ele alınacağını `nextRunAt` filtreliyor (indeksli, ucuz).
 * Ama NE ÜRETİLECEĞİNİ o belirlemiyor: oluşumlar DAİMA `startDate` çapasından
 * hesaplanıyor ve zaten üretilmiş `periodKey`ler çıkarılıyor.
 *
 * Sonuç: bayat bir `nextRunAt` üretimi GECİKTİREBİLİR, ama ne çift kayıt ne
 * atlanmış dönem ne de yanlış tarih üretir — sonraki basışta eksikler
 * yakalanır. Kendi kendini onaran yazma (T-100'ün `baseAmount` gerekçesi).
 *
 * Tamamen kendini onaran alternatif — `nextRunAt`i hiç süzmeyip tüm aktif
 * şablonları taramak — değerlendirildi ve gerekmedi: filtre yalnızca
 * geciktirebiliyor, ve `@@index([isActive, nextRunAt])` F7'nin cron'u için
 * zaten orada.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ TRY DIŞI ŞABLON ÜRETİLMİYOR — KUR UYDURULMUYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Şablon `fxRate` TAŞIMIYOR ve ADR-015 bunu açıkça gerekçelendiriyor: *"kur
 * üretim anına aittir."* Ama bu projede bir KUR KAYNAĞI YOK.
 *
 * `isFxRateConsistent` (T-011) TRY dışı işlemde kurun 1.0 OLAMAYACAĞINI şart
 * koşuyor. Yani TRY dışı bir şablon için ya gerçek kur gerekiyor ya da bir sayı
 * UYDURMAK. Uydurmak, bütün TRY toplamlarını sessizce yanlış yapardı — ADR-014'ün
 * kaçındığı şeyin tam merkezi.
 *
 * KARAR: TRY dışı şablonlar ATLANIR ve SEBEBİYLE RAPORLANIR. Kullanıcı o kaydı
 * elle, günün kuruyla girer. Sessizce atlamak kabul edilemezdi; uydurmak daha
 * da kötüydü.
 */

/** Tek basışta şablon başına üretilecek EN FAZLA dönem. */
export const CATCHUP_LIMIT = 120;

/** `buildPeriodKey` dört basamaklı yıl varsayıyor — ADR-040 bağlayıcı sınırı. */
const MAX_PERIOD_YEAR = 9999;

/**
 * Gün dizesinin YILI — İLK TİREYE KADAR, `slice(0, 4)` DEĞİL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BU FONKSİYON BİR HATA DÜZELTMESİ VE HATA BENİMDİ — ÜSTELİK KORUMANIN
 *    KENDİSİ, KORUDUĞU KUSURU YENİDEN ÜRETMİŞTİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yıl sınırı kontrolünü ilk yazdığımda `Number(gun.slice(0, 4)) > 9999` dedim.
 * Ölçüldü ve ÇALIŞMIYOR:
 *
 *   "10000-01-01".slice(0, 4)  →  "1000"  →  1000  →  sınırı GEÇİYOR
 *
 * Yani beş basamaklı yılı dört basamak okumak — `buildPeriodKey`in tam olarak
 * engellemeye çalıştığım kusuru (ADR-040: yıl 10000'in `YEARLY` anahtarı yıl
 * 1000 ile çakışıyor). Koruma, koruduğu hata sınıfını kendi içinde yeniden
 * üretti; ADR-038'e işlenen dersin aynısı, bu kez tarih tarafında.
 *
 * İKİNCİ KUSUR AYNI KÖKTEN: döngü `gun > son` ile de durmuyordu, çünkü
 * SÖZLÜKSEL karşılaştırmada `"10000-01-01" > "9999-12-31"` **false** — `'1'`,
 * `'9'`dan küçük. Beş basamaklı yıl `YYYY-MM-DD` varsayımının TAMAMINI bozuyor.
 *
 * Bu yüzden sınır kontrolü HER KARŞILAŞTIRMADAN ÖNCE ve bu fonksiyonla
 * yapılıyor; testle sabit.
 */
function appDayYear(day: AppDay): number {
  return Number(day.slice(0, day.indexOf('-')));
}

/* ===========================================================================
 * SAF ÇEKİRDEK — oluşum takvimi
 * ======================================================================== */

/** Kurala göre `startDate`in `n`inci oluşumu. ÇAPA DAİMA `startDate`. */
function occurrenceAt(rule: RecurrenceRule, startDate: AppDay, n: number): AppDay {
  switch (rule) {
    case 'DAILY':
      return addAppDays(startDate, n);
    case 'WEEKLY':
      return addAppDays(startDate, n * 7);
    case 'MONTHLY':
      return addAppMonths(startDate, n);
    case 'YEARLY':
      return addAppYears(startDate, n);
  }
}

export interface OccurrenceScan {
  /** `throughDay`e kadar (dahil) üretilmesi gereken oluşum günleri. */
  days: AppDay[];
  /** `limit` yüzünden bu turda DIŞARIDA kalan oluşum sayısı. */
  remaining: number;
  /** ⚠️ Yıl sınırı (9999) yüzünden durulduysa `true` — gerekçe dosya başında. */
  yearLimitReached: boolean;
}

/**
 * `startDate`ten `throughDay`e kadarki oluşumları üretir.
 *
 * ⚠️ HER OLUŞUM `startDate`TEN HESAPLANIYOR, bir öncekinden DEĞİL. Adım adım
 * ilerletmek günü kalıcı olarak kaydırıyor ve ölçüldü (T-109b):
 *
 *   adım adım : 2026-01-31 → 02-28 → 03-28 → 04-28   ← ayın 28'ine SAPLANDI
 *   çapalı    : 2026-01-31 → 02-28 → 03-31 → 04-30   ← ay sonuna geri dönüyor
 *
 * Bir kira ya da abonelik ayın sonunda çekiliyorsa, şubattan sonra 28'inde
 * kalması yanlış. `addAppMonths` kırpmayı yapıyor; çapayı korumak BURANIN işi.
 *
 * `endDate` ÜST SINIRI: şablonun bitişi geçtiyse oluşum üretilmez — bitmiş bir
 * yükümlülük için kayıt açmak defteri bozardı.
 */
export function recurrenceOccurrences(
  rule: RecurrenceRule,
  startDate: AppDay,
  throughDay: AppDay,
  options: { endDate?: AppDay | null; limit?: number } = {},
): OccurrenceScan {
  const limit = options.limit ?? CATCHUP_LIMIT;
  const son = options.endDate && options.endDate < throughDay ? options.endDate : throughDay;

  const days: AppDay[] = [];
  let remaining = 0;
  let yearLimitReached = false;

  for (let n = 0; ; n += 1) {
    const gun = occurrenceAt(rule, startDate, n);

    /*
     * ⚠️ SIRA ÖNEMLİ: yıl kontrolü `gun > son` KARŞILAŞTIRMASINDAN ÖNCE.
     * Beş basamaklı yılda sözlüksel karşılaştırma yanlış cevap veriyor
     * (`"10000-01-01" > "9999-12-31"` → false, ölçüldü), yani sonra bakmak
     * döngüyü sınıra kadar koşturuyordu. Gerekçe `appDayYear`ın yanında.
     */
    if (appDayYear(gun) > MAX_PERIOD_YEAR) {
      yearLimitReached = true;
      break;
    }
    if (gun > son) break;

    if (days.length < limit) days.push(gun);
    else remaining += 1;
  }

  return { days, remaining, yearLimitReached };
}

/* ===========================================================================
 * PRISMA YÜZEYİ
 * ======================================================================== */

interface RecurringRow {
  id: string;
  type: TransactionType;
  amount: DecimalLike;
  currency: Currency;
  categoryId: string;
  description: string | null;
  method: PaymentMethod;
  recurrenceRule: string;
  startDate: Date;
  endDate: Date | null;
  nextRunAt: Date | null;
  isActive: boolean;
}

const TEMPLATE_SELECT = {
  id: true,
  type: true,
  amount: true,
  currency: true,
  categoryId: true,
  description: true,
  method: true,
  recurrenceRule: true,
  startDate: true,
  endDate: true,
  nextRunAt: true,
  isActive: true,
} as const;

/** Üretilen kaydın yazma şekli — `createGeneratedTransactionSchema`nın çıktısı + `baseAmount`. */
interface GeneratedTransactionData {
  type: TransactionType;
  amount: string;
  currency: Currency;
  fxRate: string;
  /** ADR-014 — şemada YOK, serviste türetiliyor. */
  baseAmount: string;
  date: Date;
  categoryId: string;
  description: string | null;
  method: PaymentMethod;
  isPaid: boolean;
  /** ADR-015 — tekillik kısıtının iki yarısı. */
  sourceRecurringId: string;
  periodKey: string;
}

export interface RecurringClient {
  recurringTransaction: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof TEMPLATE_SELECT;
      orderBy: { startDate: 'asc' }[];
    }): Promise<RecurringRow[]>;
    update(args: {
      where: { id: string };
      data: { nextRunAt: Date | null; lastGeneratedAt?: Date };
    }): Promise<unknown>;
  };
  transaction: {
    findMany(args: {
      where: { sourceRecurringId: string };
      select: { periodKey: true };
    }): Promise<{ periodKey: string | null }[]>;
    /*
     * `data` TAM TİPLİ, `Record<string, unknown>[]` DEĞİL — ve bunu uyum kapısı
     * ÖĞRETTİ: gevşek yazıldığında `tsc` "missing the following properties:
     * type, amount, baseAmount, date, categoryId" diyerek kırıldı. T-100'de
     * `job.create` için aynı ders alınmıştı; kapı iki kez de zorunlu alanı
     * atlayan bir yazmanın derlenmesini engelledi.
     */
    createMany(args: {
      data: GeneratedTransactionData[];
      skipDuplicates: true;
    }): Promise<{ count: number }>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: RecurringClient = db;
void _uyumKontrolu;

/**
 * İşlenmeyi bekleyen şablonların `where` bloğu.
 *
 * ⚠️ `nextRunAt: null` DALI ZORUNLU VE ATLANMASI KOLAY. Yeni açılmış bir şablonun
 * `nextRunAt`i `null` (şema: "üretim işi yönetir"). `{ nextRunAt: { lte: now } }`
 * yazmak PostgreSQL'de `NULL`ları DIŞLAR — yani yeni açılan her şablon HİÇ
 * ÜRETMEZDİ ve kullanıcı düğmeye bassa da hiçbir şey olmazdı. Sessiz ve
 * tamamen işlevsiz bir özellik; `OR` dalı bunu kapatıyor.
 */
function dueWhere(now: Date): Record<string, unknown> {
  return {
    isActive: true,
    OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
  };
}

/* ===========================================================================
 * OKUMA — "kaç kalem bekliyor" (ADR-040: sessiz değil)
 * ======================================================================== */

export interface DueRecurringItemDto {
  id: string;
  description: string | null;
  recurrenceRule: string;
  /** Bu şablon için üretilmeyi bekleyen DÖNEM sayısı. */
  pendingPeriods: number;
  /** Atlanacaksa sebebi — `null` ise işlenebilir. */
  blockedReason: RecurringSkipReason | null;
}

export interface DueRecurringSummaryDto {
  /** İşlenmeyi bekleyen ŞABLON sayısı — ADR-040'ın ekranda istediği sayı. */
  dueCount: number;
  /**
   * Bekleyen TOPLAM dönem sayısı.
   *
   * Ayrıca veriliyor çünkü "3 kalem bekliyor" ile "3 kalem, 7 dönem bekliyor"
   * farklı şeyler söylüyor: bir şablon beş ay geride olabilir ve kullanıcı tek
   * basışın ne kadar kayıt üreteceğini bilmeli.
   */
  pendingPeriodCount: number;
  items: DueRecurringItemDto[];
}

/** ÖNBELLEKLENMEZ — panel okuması (T-038/T-040/T-052 gerekçesi). */
export async function fetchDueRecurringSummary(
  now: Date = new Date(),
  client: RecurringClient = db,
): Promise<DueRecurringSummaryDto> {
  const sablonlar = await client.recurringTransaction.findMany({
    where: dueWhere(now),
    select: TEMPLATE_SELECT,
    orderBy: [{ startDate: 'asc' }],
  });

  const bugun = appToday(now);
  const items: DueRecurringItemDto[] = [];

  for (const sablon of sablonlar) {
    const uretilmis = await client.transaction.findMany({
      where: { sourceRecurringId: sablon.id },
      select: { periodKey: true },
    });

    const plan = planFor(sablon, bugun, new Set(uretilmis.map((r) => r.periodKey)));

    items.push({
      id: sablon.id,
      description: sablon.description,
      recurrenceRule: sablon.recurrenceRule,
      pendingPeriods: plan.eksikler.length + plan.tarama.remaining,
      blockedReason: plan.skipReason,
    });
  }

  return {
    dueCount: items.length,
    pendingPeriodCount: items.reduce((toplam, item) => toplam + item.pendingPeriods, 0),
    items,
  };
}

/* ===========================================================================
 * ÜRETİM
 * ======================================================================== */

export type RecurringSkipReason =
  /** TRY dışı şablon — kur kaynağı yok, uydurulmuyor (gerekçe dosya başında). */
  | 'NON_TRY_CURRENCY'
  /** Tanınmayan `recurrenceRule` — sütun serbest `String`, enum değil. */
  | 'UNKNOWN_RULE'
  /** Yıl sınırı (9999) aşıldı — `periodKey` çakışması riski. */
  | 'YEAR_LIMIT';

export interface RecurringSkipDto {
  id: string;
  description: string | null;
  reason: RecurringSkipReason;
}

export interface ProcessRecurringResultDto {
  /** Ele alınan şablon sayısı (atlananlar dahil). */
  consideredTemplates: number;
  /** GERÇEKTEN yazılan kayıt sayısı — `createMany` dönüşü. */
  createdCount: number;
  /**
   * Tekillik kısıtının reddettiği kayıt sayısı.
   *
   * ⚠️ SIFIRDAN FARKLI OLMASI BİR HATA DEĞİL, İDEMPOTANSLIĞIN ÇALIŞTIĞININ
   * KANITI: kullanıcı düğmeye ikinci kez bastığında bütün dönemler burada
   * sayılır ve `createdCount` sıfır kalır.
   */
  skippedDuplicateCount: number;
  /** Üst sınır yüzünden bu turda üretilmeyen dönem sayısı. */
  remainingPeriodCount: number;
  /** Atlanan şablonlar ve SEBEPLERİ — sessiz atlama yok. */
  skipped: RecurringSkipDto[];
}

/** Bir şablonun bu turdaki planı — saf, bu yüzden ayrıca sınanabiliyor. */
function planFor(
  sablon: RecurringRow,
  bugun: AppDay,
  uretilmisAnahtarlar: ReadonlySet<string | null>,
): {
  eksikler: { day: AppDay; periodKey: string }[];
  tarama: OccurrenceScan;
  skipReason: RecurringSkipReason | null;
} {
  const bosTarama: OccurrenceScan = { days: [], remaining: 0, yearLimitReached: false };

  if (!isRecurrenceRule(sablon.recurrenceRule)) {
    return { eksikler: [], tarama: bosTarama, skipReason: 'UNKNOWN_RULE' };
  }
  if (sablon.currency !== 'TRY') {
    return { eksikler: [], tarama: bosTarama, skipReason: 'NON_TRY_CURRENCY' };
  }

  const tarama = recurrenceOccurrences(
    sablon.recurrenceRule,
    dateToAppDay(sablon.startDate),
    bugun,
    {
      endDate: sablon.endDate ? dateToAppDay(sablon.endDate) : null,
    },
  );

  /*
   * ⚠️ ÜRETİLMİŞ DÖNEMLER ÇIKARILIYOR — ama GÜVENCE BU DEĞİL.
   *
   * Gerçek güvence `@@unique([sourceRecurringId, periodKey])`: iki eşzamanlı
   * basış arasındaki yarışı yalnızca o kapatır (T-038'in çift dönüşüm
   * gerekçesinin aynısı). Buradaki çıkarma, anlamsız yazma denemelerini ve
   * "kaç dönem bekliyor" sayısının yanlış çıkmasını önlüyor.
   */
  const eksikler = tarama.days
    .map((day) => ({
      day,
      periodKey: buildPeriodKey(sablon.recurrenceRule as RecurrenceRule, day),
    }))
    .filter((oluşum) => !uretilmisAnahtarlar.has(oluşum.periodKey));

  return {
    eksikler,
    tarama,
    skipReason: tarama.yearLimitReached && tarama.days.length === 0 ? 'YEAR_LIMIT' : null,
  };
}

/** `recurrenceRule` sütunu serbest `String` — enum değil, bu yüzden daraltılıyor. */
function isRecurrenceRule(value: string): value is RecurrenceRule {
  return value === 'DAILY' || value === 'WEEKLY' || value === 'MONTHLY' || value === 'YEARLY';
}

/**
 * Gecikmiş tekrarlayan kalemleri işler — ADR-040'ın elle tetiklenen gövdesi.
 *
 * ⚠️ HER ÜRETİLEN KAYIT `createGeneratedTransactionSchema`DAN GEÇİYOR (T-011'de
 * yazılmış ve bugüne kadar hiç tüketilmemişti). Doğrudan Prisma'ya nesne vermek
 * kısa olurdu ama şemanın çapraz doğrulamasını (`isFxRateConsistent`) ve
 * `periodKey` biçim kontrolünü atlardı — ADR-030'un "seed şemadan geçer"
 * disiplininin üretim tarafındaki karşılığı.
 *
 * `baseAmount` ŞEMADA YOK, burada türetiliyor (ADR-014): `amount × fxRate`.
 * TRY şablonlarda kur 1, yani `baseAmount = amount` — ama hesap yine
 * `computeBaseAmount`tan geçiyor ki kural tek yerde kalsın.
 */
export async function processDueRecurringTransactions(
  now: Date = new Date(),
  client: RecurringClient = db,
): Promise<ProcessRecurringResultDto> {
  const sablonlar = await client.recurringTransaction.findMany({
    where: dueWhere(now),
    select: TEMPLATE_SELECT,
    orderBy: [{ startDate: 'asc' }],
  });

  const bugun = appToday(now);
  const sonuc: ProcessRecurringResultDto = {
    consideredTemplates: sablonlar.length,
    createdCount: 0,
    skippedDuplicateCount: 0,
    remainingPeriodCount: 0,
    skipped: [],
  };

  for (const sablon of sablonlar) {
    const uretilmis = await client.transaction.findMany({
      where: { sourceRecurringId: sablon.id },
      select: { periodKey: true },
    });

    const plan = planFor(sablon, bugun, new Set(uretilmis.map((r) => r.periodKey)));

    if (plan.skipReason) {
      sonuc.skipped.push({
        id: sablon.id,
        description: sablon.description,
        reason: plan.skipReason,
      });
      continue;
    }

    sonuc.remainingPeriodCount += plan.tarama.remaining;

    if (plan.eksikler.length > 0) {
      const tutar = toMoneyString(sablon.amount);

      const girdiler = plan.eksikler.map((oluşum) => {
        // ŞEMADAN GEÇİYOR — gerekçe fonksiyonun üstünde.
        const dogrulanmis = createGeneratedTransactionSchema.parse({
          type: sablon.type,
          amount: tutar,
          currency: sablon.currency,
          // TRY şablonda kur 1; `isFxRateConsistent` bunu zorluyor.
          fxRate: '1',
          date: oluşum.day,
          categoryId: sablon.categoryId,
          description: sablon.description ?? undefined,
          method: sablon.method,
          isPaid: true,
          sourceRecurringId: sablon.id,
          periodKey: oluşum.periodKey,
        });

        return {
          type: dogrulanmis.type,
          amount: dogrulanmis.amount,
          currency: dogrulanmis.currency,
          fxRate: dogrulanmis.fxRate,
          baseAmount: computeBaseAmount(dogrulanmis.amount, dogrulanmis.fxRate),
          date: appDayToDate(dogrulanmis.date),
          categoryId: dogrulanmis.categoryId,
          description: dogrulanmis.description ?? null,
          method: dogrulanmis.method,
          isPaid: dogrulanmis.isPaid,
          sourceRecurringId: dogrulanmis.sourceRecurringId,
          periodKey: dogrulanmis.periodKey,
        };
      });

      /*
       * `skipDuplicates: true` — tekillik kısıtının reddettiği satırlar sessizce
       * atlanıyor ve FIRLATMIYOR. Bu, elle tetiklemeyi güvenli kılan şeyin
       * yarısı: ikinci basışta `count` sıfır döner, hata değil.
       */
      const yazilan = await client.transaction.createMany({
        data: girdiler,
        skipDuplicates: true,
      });

      sonuc.createdCount += yazilan.count;
      sonuc.skippedDuplicateCount += girdiler.length - yazilan.count;
    }

    /*
     * `nextRunAt` BİR SONRAKİ OLUŞUMA ilerletiliyor — bugünden SONRASINA.
     *
     * Gerekçe `nextRunAt`in imleç olmadığı notunda: bu alan hangi şablonların
     * ele alınacağını süzüyor, ne üretileceğini belirlemiyor. Yanlış hesaplansa
     * bile üretim gecikir, bozulmaz.
     *
     * Şablon BİTMİŞSE `null` yazılıyor: gelecekte bir oluşum yok, yani şablon
     * bir daha ele alınmamalı. `isActive`i `false`a çekmek DAHA İLERİ bir karar
     * olurdu — kullanıcının şablonu bitti diye arşivlemesi onun tercihi.
     */
    await client.recurringTransaction.update({
      where: { id: sablon.id },
      data: {
        nextRunAt: sonrakiOlusum(sablon, bugun),
        ...(plan.eksikler.length > 0 ? { lastGeneratedAt: now } : {}),
      },
    });
  }

  return sonuc;
}

/** Bugünden SONRAKİ ilk oluşum — yoksa `null` (şablon bitti). */
function sonrakiOlusum(sablon: RecurringRow, bugun: AppDay): Date | null {
  if (!isRecurrenceRule(sablon.recurrenceRule)) return null;

  const baslangic = dateToAppDay(sablon.startDate);
  const bitis = sablon.endDate ? dateToAppDay(sablon.endDate) : null;

  for (let n = 0; n <= CATCHUP_LIMIT * 2; n += 1) {
    const gun = occurrenceAt(sablon.recurrenceRule, baslangic, n);
    if (appDayYear(gun) > MAX_PERIOD_YEAR) return null;
    if (gun > bugun) return bitis && gun > bitis ? null : appDayToDate(gun);
  }

  /*
   * Buraya düşmek, bugünün çapadan `CATCHUP_LIMIT * 2` oluşumdan DAHA uzak
   * olduğu anlamına gelir — yani şablon çok geride. `null` yazmak şablonu bir
   * daha ele alınmaz yapardı ve KALAN DÖNEMLER KAYBOLURDU. Bu yüzden `null`
   * değil BUGÜN yazılıyor: şablon bir sonraki basışta yine ele alınır ve
   * yakalama devam eder.
   */
  return appDayToDate(bugun);
}
