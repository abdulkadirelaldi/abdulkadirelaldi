import type {
  CreateTransactionInput,
  TransactionFilterInput,
  UpdateTransactionInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { Currency, PaymentMethod, TransactionType } from '@/types';

import {
  appDayToDate,
  computeBaseAmount,
  dateToAppDay,
  panelSkipTake,
  toMoneyString,
  toPagedResult,
  toRateString,
  type DecimalLike,
} from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `Transaction` servisi — §6'NIN KRİTİK İLİŞKİSİ, ADR-014/015/016, T-101.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ §6: "BİR İŞE ÖDEME GİRİLDİĞİNDE OTOMATİK OLARAK GELİR TABLOSUNA DÜŞER.
 *          AYNI VERİ İKİ YERE GİRİLMEZ."  — CÜMLENİN TAM KARŞILIĞI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart iki mekanizma önerdi: (a) işe ödeme girmek bir `Transaction` OLUŞTURUR,
 * (b) `Transaction` oluşturulurken `jobId` BAĞLANIR. İkisi de "akış" sorusu ve
 * ⚠️ CÜMLE BİR AKIŞTAN DEĞİL, İKİNCİ BİR KAYIT YERİNİN OLMAMASINDAN BAHSEDİYOR.
 *
 * "Otomatik düşer"in zıddı nedir? Ödemeyi iş kartına yazıp AYRICA gelir
 * tablosuna bir satır girmek. Yasaklanan şey bu. Yani güvence şudur:
 *
 *   1. PARA HAREKETİNİN TEK KAYDI `Transaction` SATIRIDIR. İş üzerinden
 *      girilmiş olması onu farklı bir şey yapmaz — `jobId` yalnızca BİR ALAN.
 *   2. "GELİR TABLOSU" BİR TABLO DEĞİL, O SATIRLAR ÜZERİNDE BİR OKUMADIR.
 *      Toplamlar türetilir; saklanmaz (ADR-014/B8 bunu zaten şart koşuyor:
 *      "tahsil edilen ve kalan bakiye SÜTUN DEĞİL").
 *   3. TEK YAZMA YOLU VAR: `createTransaction`. İş kartındaki "ödeme ekle"
 *      düğmesi de, muhasebe ekranındaki "işlem ekle" düğmesi de AYNI
 *      fonksiyonu çağırır; tek fark `jobId`nin arayüz tarafından önceden
 *      doldurulmuş olması. İki eylem yazmak, "aynı veri iki yere girilmez"
 *      şartını koruyan şeyi — tekliği — bozmanın en kolay yolu olurdu.
 *
 * Yani kartın (a) ve (b) seçenekleri AYNI MEKANİZMANIN iki arayüz görünümü.
 * `Transaction.jobId?` opsiyonel olduğu için ikisi de ifade edilebiliyor ve
 * şema bu yüzden doğru.
 *
 * ⚠️ İŞ KARTI ÖDEMEDEN `currency`/`fxRate` DEVRALMAZ ve bu ZORUNLU: ADR-014
 * "İŞLEM ANINDAKİ kur" diyor. 2500 USD'lik bir iş için bugün alınan ödeme
 * bugünün kuruyla çevrilir, işin pazarlık günündeki kurla değil. Devralmak,
 * sessizce yanlış TRY karşılığı üretirdi — bu kartın en pahalı hata sınıfı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ `clientId` İŞTEN TÜRETİLİR — İKİ FK'NİN AYRIŞMASI ENGELLENİYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `Transaction` hem `jobId` hem `clientId` taşıyor ve şema ikisinin TUTARLI
 * olmasını zorlamıyor. Form `jobId: A` (müşterisi X) ile `clientId: Y`
 * gönderebilirdi; o satır sonra "X'in cirosu" ve "A işinin tahsilatı"
 * raporlarında AYNI PARAYI FARKLI MÜŞTERİLERE yazardı — ve hiçbir şey
 * kırmızıya dönmezdi.
 *
 * Bu yüzden `jobId` verildiğinde `clientId` İŞİN müşterisinden türetilir ve
 * istemcinin gönderdiği değer EZİLİR. İşin müşterisi yoksa (`clientId` null)
 * istemcinin değeri korunur — orada ayrışacak bir gerçek yok.
 *
 * `clientId` sütunu KALDIRILAMAZ: işsiz ama müşterili bir hareket meşru
 * (doğrudan satış, avans). Yani kolon gerekli, tutarlılığı sağlayan yer burası.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ · `revalidateTag` YOK — T-101'de TARANDI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `Transaction` ve `TransactionCategory` geçen TEK SATIR YOK: `services/stats.ts`,
 * `_shared/stats.ts`, `services/cached.ts`, `_shared/content-cache.ts` ve
 * `src/app/(public)/**`. `ContentEntity` birleşiminde de yok. Yani düşürülecek
 * etiket TANIMLI DEĞİL (T-100'ün `Job` taraması aynı sonucu vermişti).
 */

/* ===========================================================================
 * DTO
 * ======================================================================== */

/**
 * Listede görünen işlem.
 *
 * ⚠️ ÜÇ PARA ALANI DA `string` — ADR-014'ün üçüncü kuralı (R4). `Decimal`
 * Server → Client sınırında serialize edilemez ve tip sistemi bu kaçağı
 * GÖRMEZ; `tests/unit/services/islem.test.ts` T-100'ün kaçak dedektörünü
 * genişleterek ölçüyor.
 */
export interface TransactionPanelListItemDto {
  id: string;
  type: TransactionType;
  /** Kaydın kendi para birimindeki tutarı (ADR-014). */
  amount: string;
  currency: Currency;
  fxRate: string;
  /** TRY karşılığı — TÜM toplama ve raporlama bu alan üzerinden. */
  baseAmount: string;
  /** Gün semantiği (ADR-016) — `YYYY-MM-DD`. */
  date: string;
  categoryId: string;
  categoryName: string;
  jobId: string | null;
  jobTitle: string | null;
  clientId: string | null;
  clientName: string | null;
  method: PaymentMethod;
  isPaid: boolean;
  paidAt: string | null;
  invoiceNo: string | null;
  /** Cron ürünü mü (ADR-015) — kimliğin kendisi değil, olgusu. */
  fromRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Detay — düzenleme formunun tam alan kümesi. */
export interface TransactionPanelDto extends TransactionPanelListItemDto {
  description: string | null;
}

const PANEL_LIST_SELECT = {
  id: true,
  type: true,
  amount: true,
  currency: true,
  fxRate: true,
  baseAmount: true,
  date: true,
  categoryId: true,
  jobId: true,
  clientId: true,
  method: true,
  isPaid: true,
  paidAt: true,
  invoiceNo: true,
  sourceRecurringId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  job: { select: { title: true } },
  client: { select: { name: true } },
} as const;

const PANEL_DETAIL_SELECT = { ...PANEL_LIST_SELECT, description: true } as const;

interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: DecimalLike;
  currency: Currency;
  fxRate: DecimalLike;
  baseAmount: DecimalLike;
  date: Date;
  categoryId: string;
  jobId: string | null;
  clientId: string | null;
  method: PaymentMethod;
  isPaid: boolean;
  paidAt: Date | null;
  invoiceNo: string | null;
  sourceRecurringId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string };
  job: { title: string } | null;
  client: { name: string } | null;
}

interface TransactionDetailRow extends TransactionRow {
  description: string | null;
}

/** Bu servisin Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface TransactionClient {
  transaction: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof PANEL_LIST_SELECT;
      orderBy: Record<string, unknown>[];
      skip: number;
      take: number;
    }): Promise<TransactionRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<TransactionDetailRow | null>;
    create(args: {
      data: {
        type: TransactionType;
        amount: string;
        currency: Currency;
        fxRate: string;
        baseAmount: string;
        date: Date;
        categoryId: string;
        jobId: string | null;
        clientId: string | null;
        description: string | null;
        method: PaymentMethod;
        isPaid: boolean;
        paidAt: Date | null;
        invoiceNo: string | null;
      };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<TransactionDetailRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<TransactionDetailRow>;
  };
  job: {
    findUnique(args: {
      where: { id: string };
      select: { clientId: true };
    }): Promise<{ clientId: string | null } | null>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: TransactionClient = db;
void _uyumKontrolu;

/**
 * DIŞA AKTARIM okumasının yüzeyi — AYRI bir arayüz, ve sebebi ölçüldü.
 *
 * `TransactionClient`a ikinci bir `findMany` imzası eklemek denendi: `tsc`
 * reddetti (TS2322, `PrismaClient` aşırı yükleme kümesine oturmuyor). Ayrı
 * arayüz bu depoda zaten kurulu kalıp — `JobFinancialsClient` ve
 * `CategoryReportClient` de aynı sebeple ayrı.
 */
export interface TransactionExportClient {
  transaction: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof PANEL_DETAIL_SELECT;
      orderBy: Record<string, unknown>[];
      take: number;
    }): Promise<TransactionDetailRow[]>;
  };
}

const _uyumDisaAktarim: TransactionExportClient = db;
void _uyumDisaAktarim;

/** ADR-014'ün 3. kuralının UYGULANDIĞI TEK YER — üç para alanı da dizeye çevrilir. */
function toListDto(row: TransactionRow): TransactionPanelListItemDto {
  return {
    id: row.id,
    type: row.type,
    amount: toMoneyString(row.amount),
    currency: row.currency,
    fxRate: toRateString(row.fxRate),
    baseAmount: toMoneyString(row.baseAmount),
    date: dateToAppDay(row.date),
    categoryId: row.categoryId,
    categoryName: row.category.name,
    jobId: row.jobId,
    jobTitle: row.job?.title ?? null,
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    method: row.method,
    isPaid: row.isPaid,
    paidAt: row.paidAt?.toISOString() ?? null,
    invoiceNo: row.invoiceNo,
    fromRecurring: row.sourceRecurringId !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetailDto(row: TransactionDetailRow): TransactionPanelDto {
  return { ...toListDto(row), description: row.description };
}

/* ===========================================================================
 * OKUMA
 * ======================================================================== */

/**
 * Filtreyi `where`e çevirir — SAF, ayrıca sınanabiliyor.
 *
 * TARİH ARALIĞI `date` ÜZERİNDE ve `date` bir `@db.Date` — yani `appDayToDate`
 * (UTC gece yarısı) DOĞRU dönüştürücü. T-052'de `AuditLog.createdAt` bir
 * `DateTime` olduğu için aynı sınır YANLIŞTI ve o günün ilk üç saatini
 * düşürüyordu. Hangisinin kullanılacağını SÜTUNUN TİPİ belirliyor.
 */
export function buildTransactionWhere(filter: TransactionFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.type) where.type = filter.type;
  if (filter.currency) where.currency = filter.currency;
  if (filter.method) where.method = filter.method;
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.jobId) where.jobId = filter.jobId;
  if (filter.clientId) where.clientId = filter.clientId;
  if (filter.isPaid !== undefined) where.isPaid = filter.isPaid;

  if (filter.from || filter.to) {
    where.date = {
      ...(filter.from ? { gte: appDayToDate(filter.from) } : {}),
      ...(filter.to ? { lte: appDayToDate(filter.to) } : {}),
    };
  }

  if (filter.q) {
    where.OR = [
      { description: { contains: filter.q, mode: 'insensitive' } },
      { invoiceNo: { contains: filter.q, mode: 'insensitive' } },
      // İş ve müşteri adıyla da aranıyor: kimlik filtreleri kimliği bilmeyi
      // gerektiriyor, oysa panelde insan ADI hatırlıyor (T-100 gerekçesi).
      { job: { title: { contains: filter.q, mode: 'insensitive' } } },
      { client: { name: { contains: filter.q, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/**
 * İşlem listesi — TARİHE göre, sayfalı.
 *
 * Birincil anahtar `date`, `updatedAt` DEĞİL ve bu içerik listelerinden
 * bilinçli bir sapma: muhasebe defteri KRONOLOJİK okunur, "en son dokunduğum"
 * sırası bir defteri okunamaz hâle getirir. Yön filtreden gelir
 * (`sortDirectionSchema` varsayılanı `desc`).
 *
 * İKİNCİL ANAHTAR `createdAt` ZORUNLU: `date` bir GÜN (saat yok), yani aynı
 * güne düşen işlemler arasında sıra belirsiz kalırdı ve sayfalama kararsız
 * olurdu — aynı kayıt iki sayfada görünebilir ya da hiç görünmeyebilirdi.
 */
export async function fetchTransactionsForPanel(
  filter: TransactionFilterInput,
  client: TransactionClient = db,
): Promise<PagedResult<TransactionPanelListItemDto>> {
  const where = buildTransactionWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.transaction.findMany({
      where,
      select: PANEL_LIST_SELECT,
      orderBy: [{ date: filter.sort }, { createdAt: filter.sort }],
      skip,
      take,
    }),
    client.transaction.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toListDto);
}

export async function fetchTransactionForPanel(
  id: string,
  client: TransactionClient = db,
): Promise<TransactionPanelDto | null> {
  const row = await client.transaction.findUnique({
    where: { id },
    select: PANEL_DETAIL_SELECT,
  });
  return row ? toDetailDto(row) : null;
}

/* ===========================================================================
 * YAZMA
 * ======================================================================== */

/**
 * `jobId` verilmişse müşteriyi İŞTEN türetir — iki FK'nin ayrışmasını engeller.
 *
 * Gerekçe dosyanın başında. İşin müşterisi yoksa istemcinin değeri korunur.
 */
async function resolveClientId(
  jobId: string | undefined,
  clientId: string | undefined,
  client: TransactionClient,
): Promise<string | null> {
  if (!jobId) return clientId ?? null;

  const is = await client.job.findUnique({ where: { id: jobId }, select: { clientId: true } });
  return is?.clientId ?? clientId ?? null;
}

export async function createTransaction(
  input: CreateTransactionInput,
  client: TransactionClient = db,
): Promise<TransactionPanelDto> {
  const row = await client.transaction.create({
    data: {
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      fxRate: input.fxRate,
      // ADR-014 — İSTEMCİDEN ALINMAZ. `Job`dakinden farkı: ZORUNLU, yani
      // `null` yolu yok (`amount` da zorunlu olduğu için gerekmiyor).
      baseAmount: computeBaseAmount(input.amount, input.fxRate),
      date: appDayToDate(input.date),
      categoryId: input.categoryId,
      jobId: input.jobId ?? null,
      clientId: await resolveClientId(input.jobId, input.clientId, client),
      description: input.description?.trim() ? input.description : null,
      method: input.method,
      isPaid: input.isPaid,
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      invoiceNo: input.invoiceNo?.trim() ? input.invoiceNo : null,
      // `sourceRecurringId`/`periodKey` BURADAN YAZILMAZ — yalnızca cron üretimi
      // doldurur (ADR-015) ve o yol bu kartın kapsamı dışı. Gerekçe raporda.
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toDetailDto(row);
}

/**
 * İşlemi günceller — KISMİ, ve `baseAmount` KOŞULSUZ yeniden türetilir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ T-100'ÜN SESSİZ HATASI BURADA DAHA PAHALI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Job.baseAmount` bir ANLAŞMA tutarıydı; `Transaction.baseAmount` GERÇEKLEŞMİŞ
 * paradır ve gelir tablosunun tamamı onun üzerinden toplanıyor (ADR-014/A4).
 * Yalnızca kuru güncelleyip `baseAmount`a dokunmamak, aylık toplamı sessizce
 * kaydırırdı — Orkestra Şefi'nin bağımsız ölçümü: 2500×34,25 = 85.625,00 vs
 * 2500×40,00 = 100.000,00, yani 14.375 TL.
 *
 * ETKİN ÇİFT: gönderilen varsa o, yoksa KAYITTAKİ değer. Bunun için mevcut
 * satır okunuyor; alternatifi yok, Prisma `update`i "diğer alanın bugünkü
 * değeri" ile hesap yapamaz.
 *
 * KOŞULSUZ yazılıyor — T-100'ün gerekçesi: bu onu KENDİ KENDİNİ ONARAN bir
 * yazma yapıyor. Satır herhangi bir yoldan tutarsız kaldıysa (seed, migration,
 * elle psql) ilk güncelleme düzeltir. Koşullu yazmanın kazancı sıfırdı.
 *
 * `clientId` DE YENİDEN TÜRETİLİYOR: `jobId` değiştirilirse müşteri de
 * değişmek zorunda, yoksa işlem yeni işe bağlanırken ESKİ işin müşterisinde
 * kalırdı — iki FK'nin ayrışmasının tam olarak engellenmek istenen hâli.
 */
export async function updateTransaction(
  input: UpdateTransactionInput,
  client: TransactionClient = db,
): Promise<TransactionPanelDto | null> {
  const { id, ...fields } = input;

  const before = await client.transaction.findUnique({
    where: { id },
    select: PANEL_DETAIL_SELECT,
  });
  if (!before) return null;

  const etkinTutar = fields.amount !== undefined ? fields.amount : toMoneyString(before.amount);
  const etkinKur = fields.fxRate !== undefined ? fields.fxRate : toRateString(before.fxRate);

  /*
   * `jobId` GÖNDERİLMEDİYSE kayıttaki iş geçerli. `?? undefined` dönüşümü
   * `resolveClientId`in imzası yüzünden: o fonksiyon "iş yok" durumunu
   * `undefined` ile ifade ediyor, veritabanı `null` ile.
   */
  const etkinIs = fields.jobId !== undefined ? fields.jobId : (before.jobId ?? undefined);
  const etkinMusteri =
    fields.clientId !== undefined ? fields.clientId : (before.clientId ?? undefined);

  const row = await client.transaction.update({
    where: { id },
    data: {
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.amount !== undefined ? { amount: fields.amount } : {}),
      ...(fields.currency !== undefined ? { currency: fields.currency } : {}),
      ...(fields.fxRate !== undefined ? { fxRate: fields.fxRate } : {}),
      ...(fields.date !== undefined ? { date: appDayToDate(fields.date) } : {}),
      ...(fields.categoryId !== undefined ? { categoryId: fields.categoryId } : {}),
      ...(fields.jobId !== undefined ? { jobId: fields.jobId } : {}),
      ...(fields.description !== undefined
        ? { description: fields.description.trim() ? fields.description : null }
        : {}),
      ...(fields.method !== undefined ? { method: fields.method } : {}),
      ...(fields.isPaid !== undefined ? { isPaid: fields.isPaid } : {}),
      ...(fields.paidAt !== undefined ? { paidAt: new Date(fields.paidAt) } : {}),
      ...(fields.invoiceNo !== undefined
        ? { invoiceNo: fields.invoiceNo.trim() ? fields.invoiceNo : null }
        : {}),
      // İKİSİ DE KOŞULSUZ — gerekçe yukarıda.
      baseAmount: computeBaseAmount(etkinTutar, etkinKur),
      clientId: await resolveClientId(etkinIs, etkinMusteri, client),
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toDetailDto(row);
}

/**
 * DIŞA AKTARIM okuması — tam alan kümesi, sayfalama YOK (T-106).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI FONKSİYON — VE KURAL NEDEN ÇİFTLENMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CSV defteri `description` istiyor; panel listesi onu BİLEREK taşımıyor
 * (T-101: "liste hafif kalsın", 2000 karaktere kadar serbest metin her ekran
 * okumasına binmesin). İki tüketicinin alan ihtiyacı farklı.
 *
 * İki çıkış vardı ve ikisi de kötüydü: (a) liste seçimini genişletmek — her
 * ekran okuması bedeli öder, (b) dışa aktarımda `where` kurma mantığını
 * kopyalamak — filtre kuralı iki yerde yaşar ve sapar.
 *
 * ÜÇÜNCÜSÜ: `buildTransactionWhere` ZATEN SAF VE İHRAÇ EDİLMİŞ. Bu fonksiyon
 * onu çağırıyor, yani filtre kuralı TEK YERDE kalıyor; değişen yalnızca
 * `select` ve sayfalamanın olmaması.
 *
 * SIRALAMA ARTAN (`date asc`): bir defter kronolojik okunur ve tablo programına
 * en eski üstte açılması beklenir. Ekran listesi tersine (`desc`) sıralı çünkü
 * oradaki soru "en son ne oldu" — iki yüzey, iki soru.
 */
export async function fetchTransactionsForExport(
  filter: TransactionFilterInput,
  limit: number,
  client: TransactionExportClient = db,
): Promise<TransactionPanelDto[]> {
  const rows = await client.transaction.findMany({
    where: buildTransactionWhere(filter),
    select: PANEL_DETAIL_SELECT,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  return rows.map(toDetailDto);
}
