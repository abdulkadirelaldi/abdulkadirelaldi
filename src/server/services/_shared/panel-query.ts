import type { PagedResult } from '../content-dto';

/**
 * Panel okuma yardımcıları — T-040.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PANEL OKUMA YOLU PUBLIC OKUMA YOLUNDAN AYRI — CAN DAMARI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Public okumalar `publishedWhere` uygular (ADR-019): yalnızca `PUBLISHED` ve
 * yayın saati gelmiş kayıtlar. Panel okumaları HİÇBİR durum filtresi uygulamaz —
 * `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED` hepsi görünür.
 *
 * İKİ YOL BİRLEŞTİRİLMEZ. "Tek fonksiyon, bir `includeUnpublished` bayrağı"
 * kısa görünürdü ama o bayrağın varsayılanını bir gün yanlış yazan biri
 * TASLAKLARI PUBLIC'E SIZDIRIR — ve sızdığı gün hiçbir test kırmızıya dönmez,
 * çünkü public sayfa yine çalışıyor olur, sadece fazlasını gösterir. Ayrı
 * fonksiyonlarda böyle bir bayrak yok, dolayısıyla yanlış yazılacak bir
 * varsayılan da yok.
 *
 * `tests/unit/services/panel-okuma.test.ts` bunu iki yönlü sabitliyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ PANEL OKUMALARI ÖNBELLEKLENMEZ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `cachedRead` public okumalar içindir (ADR-011). Panel tarafında gerekçesi
 * T-038'deki ile aynı: tek kullanıcılı bir panelde hiçbir yükü azaltmadan
 * "yeni kayıt görünmüyor" sınıfından bir hata riski açar. Panel rotalarının
 * hepsi zaten dinamik (T-034 ölçümü).
 *
 * Bu modül SAFTIR (`next/*` içe aktarmaz) — kapı testinin saf tarafında.
 */

/** Sayfalama girdisi — `paginationSchema`'nın çıktısıyla uyumlu. */
export interface PanelPagination {
  page: number;
  perPage: number;
}

/** `skip`/`take`e çevirir. Tek yerde, üç serviste tekrar edilmesin. */
export function panelSkipTake(pagination: PanelPagination): { skip: number; take: number } {
  return {
    skip: (pagination.page - 1) * pagination.perPage,
    take: pagination.perPage,
  };
}

/** Satırları ve toplamı `PagedResult` zarfına sarar. */
export function toPagedResult<Row, Dto>(
  rows: Row[],
  total: number,
  pagination: PanelPagination,
  toDto: (row: Row) => Dto,
): PagedResult<Dto> {
  return {
    items: rows.map(toDto),
    total,
    page: pagination.page,
    perPage: pagination.perPage,
  };
}

/**
 * Panel listesinin `where` bloğu — DURUM FİLTRESİ YOK, yalnızca istenen süzmeler.
 *
 * `status` VERİLMEZSE HİÇ EKLENMEZ, yani tüm durumlar döner. Varsayılanı
 * `PUBLISHED` yapmak ENGEL-1'in kendisiydi; varsayılanı `{ not: 'ARCHIVED' }`
 * yapmak da yanlış olurdu — arşivlenen kayıt panelden geri alınabilmeli.
 */
export function panelContentWhere(filter: {
  locale?: string;
  status?: string;
  q?: string;
  searchFields?: readonly string[];
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.locale) where.locale = filter.locale;
  if (filter.status) where.status = filter.status;

  if (filter.q && filter.searchFields?.length) {
    // `mode: 'insensitive'` şart — Türkçe başlıklarda harf farkı aramayı
    // sessizce boş bırakırdı (T-038'de aynı gerekçe).
    where.OR = filter.searchFields.map((field) => ({
      [field]: { contains: filter.q, mode: 'insensitive' },
    }));
  }

  return where;
}
