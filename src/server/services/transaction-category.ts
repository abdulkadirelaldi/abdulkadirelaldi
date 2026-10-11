import type {
  CreateTransactionCategoryInput,
  TransactionCategoryFilterInput,
  UpdateTransactionCategoryInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { TransactionType } from '@/types';

import { panelSkipTake, toPagedResult } from './_shared';
import type { PagedResult } from './content-dto';

/**
 * `TransactionCategory` servisi — §4.2 muhasebe, ADR-017, T-101.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SİLME YOK — ARŞİVLEME VAR, VE ÖLÇÜT T-038'İN ÖLÇÜTÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Şemadan ölçüldü: `Transaction.categoryId` ve `RecurringTransaction.categoryId`
 * ikisi de `onDelete: Restrict`, ve kategoride `isArchived` sütunu var. Yani
 * kullanılmış bir kategori veritabanı düzeyinde SİLİNEMEZ.
 *
 * Bu, `Client` ile AYNI sınıf (T-100) ve aynı sonucu veriyor: bir
 * `deleteTransactionCategory` ya çoğu kategoride patlayan bir düğme olurdu, ya
 * da "kullanılmamışları sil" gibi kullanıcının öngöremediği bir davranış.
 * Arşivleme her kategoride çalışır ve geri alınabilir.
 *
 * ⚠️ `Job`DAN FARKI: `Job` için T-100'de KOŞULLU gerçek silme kararı verildi,
 * çünkü ödemesi olmayan bir `LEAD`'in bağımlısı YOK ve "yanlışlıkla açtım" ile
 * "anlaşma düştü" ayrı şeyler. Kategoride böyle bir ayrım yok: kullanılmamış bir
 * kategori zararsızdır ve arşivlenmesi onu listelerden düşürmeye yeter.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * `@@unique([name, type])` — AYNI ADIN İKİ TÜRDE OLMASI MEŞRU
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Benzersizlik ad+tür ÇİFTİ üzerinde, yalnızca ad üzerinde değil. "Yazılım"
 * hem bir gelir hem bir gider kategorisi olabilir ve bu gerçek bir ihtiyaç.
 * P2002 mesajı bunu söylemek zorunda, yoksa kullanıcı "bu ad zaten var" deyip
 * duran bir forma bakar ve neden olduğunu anlamaz.
 *
 * ÖNBELLEKLENMEZ — T-038/T-040/T-052 gerekçesi; `Transaction` ve kategorileri
 * public tarafta hiç görünmüyor (T-101'de tarandı).
 */

export interface TransactionCategoryPanelDto {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  /** Bağlı işlem sayısı — "neden silinemiyor" sorusunun cevabı. */
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

const PANEL_SELECT = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  /*
   * `_count` TEK SORGUDA — alternatifi N+1'di. Sayı arayüzde "arşivle ≠ sil"
   * ayrımını açıklıyor (`ClientPanelListItemDto.jobCount` ile aynı gerekçe).
   *
   * ⚠️ `recurringTransactions` DA SAYILIYOR: bir kategori yalnızca şablonlarda
   * kullanılıyor olabilir ve o da `Restrict` taşıyor. Yalnızca `transactions`
   * saymak "0 işlem, silinebilir" izlenimi verirdi — oysa silinemez.
   */
  _count: { select: { transactions: true, recurringTransactions: true } },
} as const;

interface CategoryRow {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { transactions: number; recurringTransactions: number };
}

export interface TransactionCategoryClient {
  transactionCategory: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof PANEL_SELECT;
      orderBy: ({ type: 'asc' } | { name: 'asc' })[];
      skip: number;
      take: number;
    }): Promise<CategoryRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof PANEL_SELECT;
    }): Promise<CategoryRow | null>;
    create(args: {
      data: {
        name: string;
        type: TransactionType;
        color: string | null;
        icon: string | null;
      };
      select: typeof PANEL_SELECT;
    }): Promise<CategoryRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof PANEL_SELECT;
    }): Promise<CategoryRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: TransactionCategoryClient = db;
void _uyumKontrolu;

function toDto(row: CategoryRow): TransactionCategoryPanelDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    isArchived: row.isArchived,
    // İki bağ TOPLANIYOR: ikisi de `Restrict`, ikisi de silmeyi engelliyor.
    transactionCount: row._count.transactions + row._count.recurringTransactions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Filtreyi `where`e çevirir — SAF.
 *
 * `isArchived` VERİLMEZSE ARŞİV DAHİL HEPSİ gelir (T-038 kararı, T-100'de
 * `Client` için de korundu). Aynı bağlayıcı sonuç burada da geçerli:
 * ⚠️ İŞLEM FORMUNDAKİ KATEGORİ SEÇİCİSİ `isArchived: false` GÖNDERMEK ZORUNDA,
 * yoksa arşivlenmiş kategoriler seçilebilir çıkar ve arşivleme anlamını yitirir.
 */
export function buildTransactionCategoryWhere(
  filter: TransactionCategoryFilterInput,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.type) where.type = filter.type;
  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived;

  return where;
}

/**
 * Kategori listesi — TÜRE, sonra ADA göre.
 *
 * İki anahtarlı sıralama kasıtlı: kategori listesi gelir ve gider kümelerini
 * BİR ARADA gösteriyor ve ikisini karıştırmak hem seçerken hem okurken hata
 * kaynağı. Tür önce gelince liste kendiliğinden iki bloğa ayrılıyor; ad ikinci
 * anahtar olduğu için blok içi sıra öngörülebilir kalıyor.
 * `@@index([type, isArchived])` bu sıraya uygun (şemada ölçüldü).
 */
export async function fetchTransactionCategoriesForPanel(
  filter: TransactionCategoryFilterInput,
  client: TransactionCategoryClient = db,
): Promise<PagedResult<TransactionCategoryPanelDto>> {
  const where = buildTransactionCategoryWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.transactionCategory.findMany({
      where,
      select: PANEL_SELECT,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip,
      take,
    }),
    client.transactionCategory.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toDto);
}

export async function fetchTransactionCategoryForPanel(
  id: string,
  client: TransactionCategoryClient = db,
): Promise<TransactionCategoryPanelDto | null> {
  const row = await client.transactionCategory.findUnique({
    where: { id },
    select: PANEL_SELECT,
  });
  return row ? toDto(row) : null;
}

/**
 * Kategori VAR MI — işlem yazmadan önceki kapı (T-051/B kalıbı).
 *
 * `Transaction.categoryId` ZORUNLU ve `onDelete: Restrict`. `cuidSchema` yalnızca
 * biçimi doğruluyor; var olmayan bir kimlik şemayı geçer ve tek kapı FK kısıtı
 * olur. `clientExists` (T-100) ile aynı gerekçe ve aynı imza.
 */
export async function transactionCategoryExists(
  id: string,
  client: TransactionCategoryClient = db,
): Promise<boolean> {
  const row = await client.transactionCategory.findUnique({
    where: { id },
    select: PANEL_SELECT,
  });
  return row !== null;
}

/** Boş dize `null` olur — "girilmedi" ile "boş girildi" panelde aynı şey. */
function bosaNull(value: string | undefined): string | null {
  return value?.trim() ? value : null;
}

export async function createTransactionCategory(
  input: CreateTransactionCategoryInput,
  client: TransactionCategoryClient = db,
): Promise<TransactionCategoryPanelDto> {
  const row = await client.transactionCategory.create({
    data: {
      name: input.name,
      type: input.type,
      color: bosaNull(input.color),
      icon: bosaNull(input.icon),
    },
    select: PANEL_SELECT,
  });

  return toDto(row);
}

/**
 * Kategoriyi günceller — KISMİ (T-031'in `undefined` ≠ `null` kuralı).
 *
 * ⚠️ `type` DEĞİŞTİRİLEBİLİR ve bu bir risk; şema izin veriyor (`categoryBase`
 * `partialWithoutDefaults`ten geçiyor) ve burada engellenmiyor. Gerekçe:
 * kullanıcı kategoriyi yanlış türle açmış olabilir ve düzeltmesi meşru.
 *
 * ⚠️ AMA SONUCU RAPORLANDI: türü değişen bir kategorinin ALTINDAKİ İŞLEMLER
 * kendi `type` alanını koruyor (`Transaction.type` bağımsız bir sütun), yani
 * kategori "gider" olurken altındaki gelir işlemleri gelir kalır. Bu yanlış
 * değil — işlemin türü işlemin gerçeğidir — ama kategori bazlı bir raporda
 * (T-102) "gider kategorisinde gelir işlemi" gibi görünebilir. T-102'nin
 * kategori dağılımını `Transaction.type` üzerinden hesaplaması gerekiyor,
 * kategorinin türü üzerinden DEĞİL.
 */
export async function updateTransactionCategory(
  input: UpdateTransactionCategoryInput,
  client: TransactionCategoryClient = db,
): Promise<TransactionCategoryPanelDto> {
  const { id, ...fields } = input;

  const row = await client.transactionCategory.update({
    where: { id },
    data: {
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.color !== undefined ? { color: bosaNull(fields.color) } : {}),
      ...(fields.icon !== undefined ? { icon: bosaNull(fields.icon) } : {}),
    },
    select: PANEL_SELECT,
  });

  return toDto(row);
}

/** Arşivler ya da arşivden çıkarır — İKİ YÖNLÜ (`setClientArchived` gerekçesi). */
export async function setTransactionCategoryArchived(
  id: string,
  isArchived: boolean,
  client: TransactionCategoryClient = db,
): Promise<TransactionCategoryPanelDto> {
  const row = await client.transactionCategory.update({
    where: { id },
    data: { isArchived },
    select: PANEL_SELECT,
  });

  return toDto(row);
}
