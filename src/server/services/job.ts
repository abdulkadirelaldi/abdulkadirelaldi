import type {
  ChangeJobStatusInput,
  CreateJobInput,
  JobFilterInput,
  UpdateJobInput,
} from '@/lib/schemas';
import { db } from '@/server/db';
import type { Currency, JobStatus } from '@/types';

import {
  appDayToDate,
  dateToAppDay,
  deriveBaseAmount,
  panelSkipTake,
  subtractMoney,
  sumMoney,
  toMoneyString,
  toPagedResult,
  toRateString,
  type DecimalLike,
} from './_shared';
import { findOrCreateClientForMessage, type ClientRefDto, type ClientWriteClient } from './client';
import type { PagedResult } from './content-dto';

/**
 * `Job` servisi — §6 mesaj→iş dönüşümünün İHTİYAÇ DUYDUĞU KADARI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KAPSAM SINIRI — TAM CRUD F4'ÜN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * YAZILAN: yalnızca `convertMessageToJob`. §6'nın "gelen mesajdan iş kartı
 * oluşturulur, müşteri kaydı otomatik açılır" cümlesini yerine getirir.
 *
 * YAZILMAYAN (F4'e devrediliyor): iş listeleme/kanban okuması, elle iş açma
 * (`createJobSchema`), güncelleme (`updateJobSchema`), kanban durum değişimi
 * (`changeJobStatusSchema`), ve PARANIN TAMAMI — `agreedAmount`, `fxRate`,
 * `baseAmount` (ADR-014). Üç şema da T-011'de yazılı ve DOKUNULMADI.
 *
 * PARA NEDEN HİÇ YOK: `convertMessageToJobSchema` (T-011) yalnızca
 * `contactMessageId` + `title` taşıyor. Dönüşüm anında tutar HENÜZ BİLİNMİYOR —
 * iş `LEAD` (aday) olarak açılır, pazarlık sonra yapılır. Yani `baseAmount`
 * türetmesi bu turda gerekmiyor; F4 onu kendi `createJob`/`updateJob`ında
 * kuracak. Buraya bugün bir tutar hesabı yazmak, sınanmayan ve çağrılmayan
 * bir kural bırakırdı.
 */

/** Dönüşümün ihtiyaç duyduğu asgari Prisma yüzeyi. */
interface JobRow {
  id: string;
  title: string;
  status: string;
  clientId: string | null;
  contactMessageId: string | null;
  createdAt: Date;
}

export interface JobWriteClient extends ClientWriteClient {
  job: {
    findUnique(args: { where: { contactMessageId: string } }): Promise<JobRow | null>;
    create(args: {
      data: {
        title: string;
        status: 'LEAD';
        clientId: string;
        contactMessageId: string;
      };
    }): Promise<JobRow>;
  };
}

/**
 * Dönüşümün tam sonucu.
 *
 * `client` de dönüyor çünkü kullanıcıya söylenecek şey iki parçalı: iş açıldı,
 * VE müşteri ya yeni açıldı ya mevcut olana bağlandı (bkz. `ClientRefDto.created`).
 */
export interface JobConversionDto {
  job: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
  client: ClientRefDto;
}

/** Dönüşümün girdisi — mesajdan okunan gönderen bilgisi + kullanıcının verdiği başlık. */
export interface ConvertMessageInput {
  contactMessageId: string;
  title: string;
  contact: { name: string; email: string; phone: string | null };
}

/** Bu mesajdan zaten bir iş açılmış mı — `Job.contactMessageId @unique` (ADR-017). */
export async function findJobByContactMessageId(
  contactMessageId: string,
  client: JobWriteClient = db,
): Promise<{ id: string; title: string } | null> {
  const row = await client.job.findUnique({ where: { contactMessageId } });
  return row ? { id: row.id, title: row.title } : null;
}

/**
 * Mesajı iş kartına dönüştürür — §6'nın kritik ilişkisi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEK İŞLEMDE (ATOMİK) — İKİ YAZMA BİRLİKTE YA DA HİÇ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Müşteri açılıp iş oluşturma başarısız olsaydı (örneğin `contactMessageId`
 * benzersizlik ihlali — aynı mesaj ikinci kez dönüştürülüyor), ORTADA SAHİPSİZ
 * BİR MÜŞTERİ KAYDI KALIRDI. Kullanıcı hata görür, ama müşteri listesinde
 * açıklanamayan bir kayıt belirir; üstelik ikinci denemede o kayıt "mevcut"
 * sayılıp `created: false` dönerdi — yani hata, sonraki denemenin sonucunu da
 * değiştirirdi.
 *
 * `$transaction` bunu kökten çözüyor: `job.create` patlarsa `client.create`
 * geri alınır.
 *
 * `status: 'LEAD'` SABİT: §4.2/ADR-017'nin beş kolonlu kanban'ında yeni gelen
 * her şey ilk kolondan başlar. Kullanıcıya sorulacak bir şey değil — dönüşüm
 * "tek tıkla" olmalı (§6) ve tek tık bir durum seçimi içeremez.
 */
export async function convertMessageToJob(
  input: ConvertMessageInput,
  client: JobWriteClient = db,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): Promise<JobConversionDto> {
  return runInTransaction(client, async (tx) => {
    const musteri = await findOrCreateClientForMessage(input.contact, tx);

    const is = await tx.job.create({
      data: {
        title: input.title,
        status: 'LEAD',
        clientId: musteri.id,
        contactMessageId: input.contactMessageId,
      },
    });

    return {
      job: {
        id: is.id,
        title: is.title,
        status: is.status,
        createdAt: is.createdAt.toISOString(),
      },
      client: musteri,
    };
  });
}

/**
 * İşlem sarmalayıcısı — ENJEKTE EDİLEBİLİR.
 *
 * `db.$transaction`ı doğrudan çağırmak, testi Prisma'nın etkileşimli işlem
 * uygulamasını taklit etmeye zorlardı (`pnpm test` DB'siz koşar). Sarmalayıcıyı
 * dışarı almak, testin "işlem içinde koşuyormuş gibi" davranan sade bir işlev
 * geçirmesini sağlıyor — ve GERÇEK kod yolu değişmiyor.
 */
export type RunInTransaction = <T>(
  client: JobWriteClient,
  work: (tx: JobWriteClient) => Promise<T>,
) => Promise<T>;

interface TransactionCapableClient {
  $transaction<T>(work: (tx: JobWriteClient) => Promise<T>): Promise<T>;
}

const defaultRunInTransaction: RunInTransaction = (client, work) =>
  (client as unknown as TransactionCapableClient).$transaction(work);

/* ===========================================================================
 * ⚠️⚠️ ADR-014 — `baseAmount` TÜRETİLİR, GİRİLMEZ
 *
 * KURALIN TANIMI BURADA DEĞİL: kanonik tanım `_shared/money.ts` içinde
 * (`deriveBaseAmount`). T-100'de bu dosyada yazılmıştı — ilk ihtiyaç duyulduğu
 * yer burasıydı — ve T-101'de oraya TAŞINDI. Sebep ölçülmüş: kural saf ve
 * `Job`a özel değil, ama bu dosya `@/server/db` çekiyor; dolayısıyla düz Node
 * ile koşan `prisma/seed.ts` oradan okuyamıyor ve kuralı ÜÇÜNCÜ kez yazmak
 * zorunda kalmış görünüyordu. `money.ts` hiç `import` taşımıyor (ölçüldü).
 *
 * Aşağıdaki yeniden ihraç, T-100'ün çağıranlarını değiştirmemek için duruyor —
 * değerin kendisi ve gerekçesi orada, burada İKİNCİ BİR TANIM YOK.
 *
 * ⚠️ İKİNCİ TANIM OLMAMASI DERLEME TARAFINDAN DA ZORLANIYOR: `services/index.ts`
 * hem `./_shared`ı hem bu dosyayı yeniden ihraç ediyor, dolayısıyla burada
 * yerel bir `deriveBaseAmount` TANIMI olursa `tsc` TS2308 ile kırılır
 * ("already exported a member named 'deriveBaseAmount'"). T-101b'de tam olarak
 * bu görüldü: tanım geri geldiğinde barrel derlenmedi. Yani çiftlenme bu
 * dosyada sessiz kalamıyor.
 *
 * KDV VE STOPAJ YOK — v1 kapsamı DIŞI (ADR-014/B8, kullanıcı onaylı).
 * `agreedAmount` BRÜT tutardır. Burada bir vergi hesabı ARAMAYIN: eksik değil,
 * kapsam dışı. Eklenirse `baseAmount`ın brüt mü net mi olduğu ayrıca
 * kararlaştırılmalı, çünkü tüm raporlama bu alana bağlı.
 * ======================================================================== */

export { deriveBaseAmount };

/* ===========================================================================
 * PANEL OKUMA — DTO'LAR
 * ======================================================================== */

/**
 * Listede ve kanban kartında görünen iş.
 *
 * ⚠️ PARA ALANLARI `string` — ADR-014'ün üçüncü kuralı. Prisma `Decimal` bir
 * `Decimal.js` NESNESİDİR ve Server → Client sınırında serialize EDİLEMEZ (R4).
 * Tip sistemi bu kaçağı GÖRMEZ: `Decimal` yapısal olarak `unknown`a uyar ve
 * DTO'ya sızdığı yerde derleme geçer, hata ÇALIŞMA ZAMANINDA çıkar. Bu yüzden
 * `tests/unit/services/is-musteri.test.ts` kaçağı ayrıca ölçüyor.
 *
 * ⚠️ BAKİYE BURADA YOK — `paidAmount`/`remainingAmount` alanları BİLEREK
 * eklenmedi. Gerekçe `fetchJobForPanel`ın üstünde.
 */
export interface JobPanelListItemDto {
  id: string;
  title: string;
  status: JobStatus;
  clientId: string | null;
  /** Bağlı müşterinin adı — kart üzerinde ikinci bir sorgu açılmasın. */
  clientName: string | null;
  startDate: string | null;
  dueDate: string | null;
  deliveredAt: string | null;
  /** BRÜT anlaşma tutarı, kaydın kendi para biriminde (ADR-014). */
  agreedAmount: string | null;
  currency: Currency;
  fxRate: string;
  /** TRY karşılığı — TÜM toplama ve raporlama bu alan üzerinden. */
  baseAmount: string | null;
  /**
   * Bu iş bir mesajdan DÖNÜŞTÜ mü (§6) — kimliğin kendisi değil, yalnızca
   * olgusu. Listede kimliğe gerek yok; bağlantı kurulacak yer DETAY ekranı ve
   * orada `sourceMessage` tam özetle duruyor.
   */
  fromContactMessage: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Detay — düzenleme formunun tam alan kümesi + bağlı kayıtlar. */
export interface JobPanelDto extends JobPanelListItemDto {
  description: string | null;
  /** Bağlı müşteri özeti; iş müşterisiz açılabilir (`clientId` opsiyonel). */
  client: { id: string; name: string; email: string | null; isArchived: boolean } | null;
  /** Dönüşüm kaynağı mesaj — yoksa `null`. §8.20: gövde YOK, yalnızca kimlik. */
  sourceMessage: { id: string; name: string; subject: string | null; createdAt: string } | null;
}

/* ===========================================================================
 * ⚠️ KANBAN OKUMASI — ÖLÇÜLDÜ, VE KARTIN SUNDUĞU İKİ SEÇENEKTEN BİRİ DEĞİL
 * ======================================================================== */

/**
 * Kolon başına ÜST SINIR + GERÇEK TOPLAM. Sayfalama YOK, "hepsi" de değil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÖLÇÜM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart haklı olarak "tek kullanıcılı panelde iş sayısı küçük" ifadesinin bir
 * VARSAYIM olduğunu söyledi. Ölçtüğüm şey, kararı belirleyen maliyet: RSC
 * sınırından geçen DTO yükü (T-100, gerçekçi kart verisiyle):
 *
 *   kart başına ~496 B   →   N=50: 24 KB · N=500: 242 KB · N=5000: 2,4 MB
 *
 * Ve hacim: ayda 8 iş (yoğun bir serbest çalışan) 10 yılda ~960 kayıt → "hepsi"
 * seçeneği zamanla ~465 KB'lık bir sayfa yükü demek. Yani "küçük" varsayımı
 * BUGÜN doğru, SÜREKLİ değil.
 *
 * ⚠️ AMA ASIL BULGU SAYILARDA DEĞİL: BEŞ KOLONUN BÜYÜME KARAKTERİ AYNI DEĞİL.
 *
 *   LEAD · PROPOSAL · ACTIVE    → İNSAN KAPASİTESİYLE SINIRLI. Bunlar "devam
 *                                 eden iş"tir; bir kişi aynı anda 200 aktif iş
 *                                 yürütemez. Pratik üst sınırı var.
 *   DELIVERED · CANCELLED       → TEK YÖNLÜ BÜYÜYEN ARŞİV. Yalnızca birikir.
 *
 * Yani problem "kanban büyük mü" değil, "kanban'ın İKİ kolonu arşiv". Sorunun
 * tamamını sayfalamaya çevirmek yanlış araç olurdu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * KOLON BAŞINA SAYFALAMA NEDEN REDDEDİLDİ — PERFORMANS DEĞİL, ANLAM
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Kanban'ın tek işi kartı bir kolondan diğerine SÜRÜKLEMEK. Kolon 20 kartla
 * sayfalanmışsa:
 *   - dolu bir kolona kart taşımak, görünen sayfadan bir kartı DÜŞÜRÜR → kart
 *     "kayboldu" olur ve kullanıcı taşımanın başarısız olduğunu sanır;
 *   - kolon başlığındaki sayı ile gösterilen kart sayısı TUTMAZ;
 *   - URL'de beş ayrı sayfalama durumu taşınır ve "tahtayı paylaş" anlamsızlaşır.
 * Üçü de performans sorunu değil, DOĞRULUK sorunu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SEÇİLEN: ÜST SINIR + DÜRÜST SAYI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Her kolon en fazla `BOARD_COLUMN_LIMIT` kart taşır, VE kolonun GERÇEK toplamı
 * ayrıca döner. Sonuç:
 *   - üç canlı kolon pratikte DAİMA tamamını gösterir (sınıra hiç yaklaşmazlar),
 *     yani sürükleme semantiği bozulmaz;
 *   - iki arşiv kolonu en yenileri gösterir ve "50 / 1240" diye DÜRÜSTÇE söyler;
 *     geçmişin tamamı sayfalı LİSTE görünümünde (`fetchJobsForPanel`) — ki arşiv
 *     için doğru araç da odur, kanban değil;
 *   - yük yukarıdan sınırlı: 5 × 50 × ~496 B ≈ 124 KB, ve BÜYÜMEZ.
 *
 * Sınır 50 ölçümden: tek kişinin eşzamanlı yürüttüğü iş sayısının çok üstünde,
 * yük tarafında ise hâlâ ucuz. Düşürmek canlı kolonları kesme riski doğurur,
 * yükseltmek arşiv kolonlarında karşılıksız yük taşır.
 */
export const BOARD_COLUMN_LIMIT = 50;

/** ADR-017'nin beş kolonu — SIRA ÖNEMLİ, arayüz bu sırayı çiziyor. */
export const BOARD_COLUMNS = [
  'LEAD',
  'PROPOSAL',
  'ACTIVE',
  'DELIVERED',
  'CANCELLED',
] as const satisfies readonly JobStatus[];

/**
 * Kolonun canlı mı arşiv mi olduğu — SIRALAMAYI bu belirliyor.
 *
 * Canlı kolonlarda soru "sırada ne var": en yakın teslim tarihi üstte.
 * Arşiv kolonlarında teslim tarihine göre sıralamak anlamsız (hepsi geçmişte);
 * oradaki soru "en son ne oldu".
 */
const LIVE_COLUMNS = new Set<JobStatus>(['LEAD', 'PROPOSAL', 'ACTIVE']);

export interface JobBoardColumnDto {
  status: JobStatus;
  items: JobPanelListItemDto[];
  /** Kolondaki GERÇEK kayıt sayısı — `items.length` üst sınırla kesilmiş olabilir. */
  total: number;
  /** `total > items.length` — arayüz "tamamını listede gör" demek zorunda. */
  truncated: boolean;
}

export interface JobBoardDto {
  columns: JobBoardColumnDto[];
  /** Kolon başına üst sınır — arayüz kendi sayısını uydurmasın. */
  columnLimit: number;
}

/* ===========================================================================
 * PANEL OKUMA — SORGU
 * ======================================================================== */

const PANEL_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  clientId: true,
  startDate: true,
  dueDate: true,
  deliveredAt: true,
  agreedAmount: true,
  currency: true,
  fxRate: true,
  baseAmount: true,
  contactMessageId: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { name: true } },
} as const;

const PANEL_DETAIL_SELECT = {
  ...PANEL_LIST_SELECT,
  description: true,
  client: { select: { id: true, name: true, email: true, isArchived: true } },
  /*
   * §8.20 — MESAJ GÖVDESİ SEÇİLMİYOR. Dönüşüm kaynağını göstermek için kimlik,
   * gönderen adı ve konu yeterli; gövdeyi buraya çekmek onu ikinci bir yüzeye
   * kopyalardı ve mesajın kendi detay ekranı zaten var (T-038).
   */
  contactMessage: { select: { id: true, name: true, subject: true, createdAt: true } },
} as const;

interface JobPanelListRow {
  id: string;
  title: string;
  status: JobStatus;
  clientId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  deliveredAt: Date | null;
  agreedAmount: DecimalLike | null;
  currency: Currency;
  fxRate: DecimalLike;
  baseAmount: DecimalLike | null;
  contactMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string } | null;
}

interface JobPanelDetailRow extends Omit<JobPanelListRow, 'client'> {
  description: string | null;
  client: { id: string; name: string; email: string | null; isArchived: boolean } | null;
  contactMessage: { id: string; name: string; subject: string | null; createdAt: Date } | null;
}

/** Panel okuma + yazmanın Prisma'dan ihtiyaç duyduğu yüzey. */
export interface JobPanelClient {
  job: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof PANEL_LIST_SELECT;
      orderBy: Record<string, unknown>[];
      skip?: number;
      take?: number;
    }): Promise<JobPanelListRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    groupBy(args: {
      by: ['status'];
      _count: true;
    }): Promise<{ status: JobStatus; _count: number }[]>;
    findUnique(args: {
      where: { id: string };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<JobPanelDetailRow | null>;
    /*
     * `data` TAM TİPLİ, `Record<string, unknown>` DEĞİL — ve bunu yukarıdaki
     * uyum kapısı ÖĞRETTİ: gevşek yazıldığında `tsc` "Property 'title' is
     * missing in type 'Record<string, unknown>'" diyerek kırıldı. Yani kapı
     * tasarlandığı işi yaptı; zorunlu alanı atlayan bir `create` derlenemez.
     */
    create(args: {
      data: {
        title: string;
        description: string | null;
        status: JobStatus;
        clientId: string | null;
        startDate: Date | null;
        dueDate: Date | null;
        deliveredAt: Date | null;
        agreedAmount: string | null;
        currency: Currency;
        fxRate: string;
        baseAmount: string | null;
      };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<JobPanelDetailRow>;
    /*
     * `update`te `data` SERBEST kalıyor ve bu doğru: kısmi güncelleme alanları
     * koşullu yayıyor (`...(x !== undefined ? {x} : {})`), yani şekli çağrı
     * anında belirleniyor. Prisma'nın `update` girdisi zaten tüm alanları
     * opsiyonel kabul ediyor, dolayısıyla uyum kapısı burada bir şey kaybetmiyor.
     */
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<JobPanelDetailRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _panelUyumKontrolu: JobPanelClient = db;
void _panelUyumKontrolu;

/**
 * Satırı DTO'ya çevirir — ADR-014'ün üçüncü kuralının UYGULANDIĞI TEK YER.
 *
 * Üç para alanı da `toMoneyString`/`toRateString`ten geçiyor; hiçbiri ham
 * geçmiyor. `fxRate` NOT NULL olduğu için `toRateString` non-null aşırı
 * yüklemesini seçiyor ve tip `string` kalıyor — DTO'da opsiyonel değil.
 */
function toJobListDto(row: JobPanelListRow): JobPanelListItemDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    clientId: row.clientId,
    clientName: row.client?.name ?? null,
    startDate: row.startDate ? dateToAppDay(row.startDate) : null,
    dueDate: row.dueDate ? dateToAppDay(row.dueDate) : null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    agreedAmount: toMoneyString(row.agreedAmount),
    currency: row.currency,
    fxRate: toRateString(row.fxRate),
    baseAmount: toMoneyString(row.baseAmount),
    // Kimliğin kendisi DEĞİL, olgusu — gerekçe DTO'nun yanında.
    fromContactMessage: row.contactMessageId !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toJobDetailDto(row: JobPanelDetailRow): JobPanelDto {
  return {
    ...toJobListDto({ ...row, client: row.client }),
    description: row.description,
    client: row.client,
    sourceMessage: row.contactMessage
      ? {
          id: row.contactMessage.id,
          name: row.contactMessage.name,
          subject: row.contactMessage.subject,
          createdAt: row.contactMessage.createdAt.toISOString(),
        }
      : null,
  };
}

/**
 * Filtreyi Prisma `where` bloğuna çevirir — SAF, ayrıca sınanabiliyor.
 *
 * TARİH ARALIĞI `dueDate` ÜZERİNDE ve bu bir seçim: `jobFilterSchema`'nın
 * `from`/`to`su "hangi işler bu aralıkta teslim edilecek" sorusunu cevaplıyor,
 * "hangi işler bu aralıkta açıldı"yı değil. Panelde aranan şey teslim takvimi;
 * `createdAt` aralığı istenirse ayrı bir alan gerekir (şema bugün taşımıyor).
 *
 * `dueDate` `@db.Date` olduğu için `appDayToDate` DOĞRU dönüştürücü — sütun saat
 * saklamıyor, dolayısıyla T-052'nin `DateTime` sınırı tuzağı BURADA YOK. İki
 * farklı yardımcının hangisinin kullanılacağını sütunun tipi belirliyor.
 */
export function buildJobWhere(filter: JobFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.status) where.status = filter.status;
  if (filter.clientId) where.clientId = filter.clientId;

  if (filter.from || filter.to) {
    where.dueDate = {
      ...(filter.from ? { gte: appDayToDate(filter.from) } : {}),
      ...(filter.to ? { lte: appDayToDate(filter.to) } : {}),
    };
  }

  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q, mode: 'insensitive' } },
      { description: { contains: filter.q, mode: 'insensitive' } },
      // Müşteri adıyla da aranabiliyor: "Kıyı Medya'nın işleri" panelde en sık
      // sorulan şey ve `clientId` filtresi kimliği bilmeyi gerektiriyor.
      { client: { name: { contains: filter.q, mode: 'insensitive' } } },
    ];
  }

  return where;
}

/**
 * İş listesi — sayfalı, EN SON DOKUNULAN ÜSTTE.
 *
 * `updatedAt desc`, `dueDate` DEĞİL: liste görünümü bir DÜZENLEME yüzeyi
 * (kanban planlama yüzeyi) ve `dueDate` kayıtların bir kısmında `null`
 * (`LEAD` aşamasında teslim tarihi yok), dolayısıyla onları bir uca yığar ve
 * aralarındaki sırayı belirsiz bırakırdı — `fetchProjectsForPanel`ta ölçülen
 * aynı gerekçe. Teslim sırası KANBAN'ın işi ve orada uygulanıyor.
 */
export async function fetchJobsForPanel(
  filter: JobFilterInput,
  client: JobPanelClient = db,
): Promise<PagedResult<JobPanelListItemDto>> {
  const where = buildJobWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.job.findMany({
      where,
      select: PANEL_LIST_SELECT,
      orderBy: [{ updatedAt: 'desc' }],
      skip,
      take,
    }),
    client.job.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toJobListDto);
}

/**
 * Panel TEK KAYIT — düzenleme formunun tam alan kümesi + bağlı müşteri +
 * dönüşüm kaynağı mesaj.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ BAKİYE BU DTO'DA YOK — KARAR, VE T-101'E BIRAKILMASI BİR ERTELEME DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart sordu: `Job` okuma DTO'su bakiyeyi İLERİDE taşıyacak biçimde mi
 * tasarlanmalı, yoksa T-101 kendi DTO'sunu mu getirmeli. Cevap: T-101 getirsin,
 * ve sebep ertelemeden daha güçlü — DOĞRU AYRIŞTIRMA BU.
 *
 * 1. BUGÜN EKLERSEM, HER ZAMAN `null` OLAN BİR ALAN AÇARIM. `Transaction`
 *    T-101'de geliyor; `paidAmount: string | null` alanı o güne kadar
 *    çalışıyormuş gibi görünüp hiçbir şey döndürmez. T-040'ın "bu projenin en
 *    pahalı sınıfı" dediği şey bu, ve T-053'te `fetchAuditLogById` yazmama
 *    gerekçem de aynıydı: çağıranı olmayan kod yazılmaz.
 *
 * 2. ASIL SEBEP KARDİNALİTE: bakiye `Job`un bir ALANI DEĞİL, bağlı tabloya
 *    yapılan bir TOPLAMADIR (ADR-014: "sütun değil, türetilir"). Job okumasına
 *    gömülürse HER iş okuması bir `Transaction` toplaması yapar — kanban'ın 250
 *    kartı dahil, ve kanban bakiyeye hiç bakmıyor. İki farklı veri, iki farklı
 *    maliyet, iki farklı okuma.
 *
 * 3. BU DTO T-101'İ ENGELLEMİYOR: düz bir arayüz, yani T-101 ya `extends` ile
 *    genişletir ya da `fetchJobFinancials(jobIds)` yazıp sayfa iki sonucu
 *    birleştirir. İkinci yol daha iyi, çünkü yalnızca bakiyeye İHTİYAÇ DUYAN
 *    ekran o maliyeti öder. Bu kart hiçbir kapıyı kapatmıyor.
 */
export async function fetchJobForPanel(
  id: string,
  client: JobPanelClient = db,
): Promise<JobPanelDto | null> {
  const row = await client.job.findUnique({ where: { id }, select: PANEL_DETAIL_SELECT });
  return row ? toJobDetailDto(row) : null;
}

/**
 * Kanban tahtası — beş kolon, kolon başına üst sınır, GERÇEK toplamlar.
 *
 * Karar ve ölçüm `BOARD_COLUMN_LIMIT`in üstünde.
 *
 * SORGU SAYISI: beş kolon + bir `groupBy` = altı, hepsi PARALEL. Tek bir
 * `findMany` ile çekip JS'te gruplamak daha az sorgu olurdu ama üst sınırı
 * uygulayamazdı — "en yeni 50'yi kolon başına" bir `LIMIT`tir ve kolon başına
 * sorulmak zorunda. `@@index([status, dueDate])` (şemada ölçüldü) bu beş
 * sorgunun tam olarak ihtiyaç duyduğu indeks.
 *
 * `groupBy` AYRI ve gerekli: üst sınırla kesilmiş bir listeden kolonun gerçek
 * toplamı HESAPLANAMAZ. Toplamı atlayıp "50+" yazmak, kullanıcıya kaç iş
 * olduğunu söylememek olurdu.
 */
export async function fetchJobBoard(client: JobPanelClient = db): Promise<JobBoardDto> {
  const [kolonlar, sayimlar] = await Promise.all([
    Promise.all(
      BOARD_COLUMNS.map((status) =>
        client.job.findMany({
          where: { status },
          select: PANEL_LIST_SELECT,
          orderBy: LIVE_COLUMNS.has(status)
            ? // En yakın teslim üstte; tarihsizler SONA (yoksa `null`lar başa
              // yığılır ve "sırada ne var" sorusunu cevaplamaz).
              [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
            : [{ updatedAt: 'desc' }],
          take: BOARD_COLUMN_LIMIT,
        }),
      ),
    ),
    client.job.groupBy({ by: ['status'], _count: true }),
  ]);

  const toplamlar = new Map(sayimlar.map((row) => [row.status, row._count]));

  return {
    columnLimit: BOARD_COLUMN_LIMIT,
    columns: BOARD_COLUMNS.map((status, index) => {
      const items = (kolonlar[index] ?? []).map(toJobListDto);
      // `groupBy` BOŞ KOLONU HİÇ DÖNDÜRMEZ — `?? 0` şart, yoksa boş bir kolonun
      // toplamı `undefined` olur ve arayüzde "NaN" çıkar.
      const total = toplamlar.get(status) ?? 0;

      return { status, items, total, truncated: total > items.length };
    }),
  };
}

/* ===========================================================================
 * PANEL YAZMA YOLU — T-100
 * ======================================================================== */

/**
 * Elle iş açar.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `contactMessageId` YAZILMIYOR — ŞEMA TAŞISA BİLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `jobBase` (T-011) `contactMessageId`yi opsiyonel bir alan olarak taşıyor, yani
 * `createJobSchema` onu KABUL EDİYOR. Buradan YAZILMIYOR ve bu bilinçli:
 *
 * `Job.contactMessageId @unique` dönüşüm korumasının GERÇEK güvencesidir
 * (T-038) — bir mesajdan en fazla bir iş. Elle açılan bir iş o alanı
 * doldurabilseydi, bir mesajı "rezerve edip" gerçek dönüşümü kalıcı olarak
 * engellemek mümkün olurdu: dönüşüm CONFLICT alır ve kullanıcı neden
 * dönüştüremediğini anlayamaz. Alanın tek meşru yazarı `convertMessageToJob`.
 *
 * ⚠️ RAPORLANDI, ŞEMA DEĞİŞTİRİLMEDİ: `src/lib/schemas/**` T-011'de bitti ve bu
 * kartın kapsamı dışı. Şemadan çıkarılması ya da `serverInterpreted` ile
 * işaretlenmesi daha temiz olurdu — o zaman sessizce düşen bir girdi kalmaz.
 * Bugünkü hâlde kapı BURADA ve `tests/unit/services/is-musteri.test.ts` onu
 * sabitliyor.
 */
export async function createJob(
  input: CreateJobInput,
  client: JobPanelClient = db,
): Promise<JobPanelDto> {
  const agreedAmount = input.agreedAmount ?? null;

  const row = await client.job.create({
    data: {
      title: input.title,
      description: input.description?.trim() ? input.description : null,
      status: input.status,
      clientId: input.clientId ?? null,
      startDate: input.startDate ? appDayToDate(input.startDate) : null,
      dueDate: input.dueDate ? appDayToDate(input.dueDate) : null,
      deliveredAt: input.deliveredAt ? new Date(input.deliveredAt) : null,
      agreedAmount,
      currency: input.currency,
      fxRate: input.fxRate,
      // ADR-014 — İSTEMCİDEN ALINMAZ, BURADA TÜRETİLİR.
      baseAmount: deriveBaseAmount(agreedAmount, input.fxRate),
      // `contactMessageId` BİLEREK YOK — gerekçe yukarıda.
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toJobDetailDto(row);
}

/**
 * İşi günceller — KISMİ, ve `baseAmount` HER ZAMAN YENİDEN TÜRETİLİR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ ADR-014'ÜN SESSİZ HATASI TAM BURADA DOĞAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kısmi güncelleme `agreedAmount` ve `fxRate`i AYRI AYRI gönderebilir. Yalnızca
 * gönderileni yazıp `baseAmount`a dokunmamak, kaydı kendi içinde tutarsız
 * bırakırdı:
 *
 *   öncesi:  agreedAmount=2500 USD · fxRate=34.25 · baseAmount=85.625,00
 *   istek:   { fxRate: '40.00' }
 *   yanlış:  fxRate=40.00 · baseAmount=85.625,00  ← kur değişti, TRY karşılığı DEĞİŞMEDİ
 *   doğru:   fxRate=40.00 · baseAmount=100.000,00
 *
 * Ve hiçbir şey kırmızıya dönmez: iki alan da geçerli, kayıt kaydedilir, rapor
 * yanlış toplar. Bu projenin tanıdığı sınıf.
 *
 * ÇÖZÜM: ETKİN ÇİFTİ hesapla (gönderilen varsa o, yoksa KAYITTAKİ değer) ve
 * `baseAmount`ı ondan türet. Bunun için mevcut satır OKUNUYOR — bir ekstra
 * sorgu, ama alternatifi yok: Prisma `update`i "diğer alanın bugünkü değeri"
 * ile bir hesap yapamaz.
 *
 * ⚠️ `baseAmount` KOŞULSUZ YAZILIYOR, yalnızca para alanları değiştiğinde değil.
 * Sebep: bu onu KENDİ KENDİNİ ONARAN bir yazma yapıyor. Satır herhangi bir
 * yoldan tutarsız kalmışsa (seed'in `?? '0'` sapması, migration, elle psql),
 * işe yapılan ilk güncelleme onu düzeltir. Koşullu yazmanın kazancı sıfırdı
 * (aynı değeri yazmak bedava), riski ise tutarsızlığın kalıcı olması.
 */
export async function updateJob(
  input: UpdateJobInput,
  client: JobPanelClient = db,
): Promise<JobPanelDto | null> {
  const { id, ...fields } = input;

  const before = await client.job.findUnique({ where: { id }, select: PANEL_DETAIL_SELECT });
  if (!before) return null;

  /*
   * ETKİN ÇİFT. `before` değerleri `Decimal` olduğu için `string`e çevriliyor —
   * `computeBaseAmount` yalnızca dize kabul ediyor (ADR-014: para hiçbir noktada
   * `number`a çevrilmez, kayan nokta kuruş sapması üretir).
   *
   * ⚠️ `agreedAmount`ı TEMİZLEMEK (null'a çekmek) BUGÜN İMKÂNSIZ ve bu bir şema
   * sınırı: `moneySchema.optional()` `string | undefined` veriyor, `null`
   * taşımıyor — yani "tutarı sildim" ifade edilemiyor, `undefined` "dokunma"
   * anlamına geliyor. Raporlandı; şema T-011'de bitti ve bu kartın kapsamı dışı.
   */
  const etkinTutar =
    fields.agreedAmount !== undefined ? fields.agreedAmount : toMoneyString(before.agreedAmount);
  const etkinKur = fields.fxRate !== undefined ? fields.fxRate : toRateString(before.fxRate);

  const row = await client.job.update({
    where: { id },
    data: {
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.description !== undefined
        ? { description: fields.description.trim() ? fields.description : null }
        : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      ...(fields.clientId !== undefined ? { clientId: fields.clientId } : {}),
      ...(fields.startDate !== undefined ? { startDate: appDayToDate(fields.startDate) } : {}),
      ...(fields.dueDate !== undefined ? { dueDate: appDayToDate(fields.dueDate) } : {}),
      ...(fields.deliveredAt !== undefined ? { deliveredAt: new Date(fields.deliveredAt) } : {}),
      ...(fields.agreedAmount !== undefined ? { agreedAmount: fields.agreedAmount } : {}),
      ...(fields.currency !== undefined ? { currency: fields.currency } : {}),
      ...(fields.fxRate !== undefined ? { fxRate: fields.fxRate } : {}),
      // KOŞULSUZ — gerekçe yukarıda (kendi kendini onaran yazma).
      baseAmount: deriveBaseAmount(etkinTutar, etkinKur),
      // `contactMessageId` BURADAN DA YAZILMIYOR — gerekçe `createJob`ta.
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toJobDetailDto(row);
}

/**
 * Kanban durum değişimi — YALNIZCA `status`.
 *
 * Ayrı bir fonksiyon, `updateJob`a bırakılmadı: kanban'da kart sürüklendiğinde
 * gönderilecek şey tek alandır ve `changeJobStatusSchema` (T-011) de tam olarak
 * bunu taşıyor. `updateJob`a yönlendirmek, sürükleme başına gereksiz bir okuma
 * + `baseAmount` yeniden türetmesi getirirdi.
 *
 * ⚠️ `deliveredAt` OTOMATİK DOLDURULMUYOR, `DELIVERED`a geçişte bile. Teslim
 * ANI ile "panelde kartı taşıdığım an" aynı şey değil — iş cuma teslim edilip
 * pazartesi işaretlenebilir, ve o zaman otomatik damga raporu yanlış tarihe
 * yazar. Alan düzenleme formunda açık ve kullanıcının kararı.
 */
export async function changeJobStatus(
  input: ChangeJobStatusInput,
  client: JobPanelClient = db,
): Promise<JobPanelDto> {
  const row = await client.job.update({
    where: { id: input.id },
    data: { status: input.status },
    select: PANEL_DETAIL_SELECT,
  });

  return toJobDetailDto(row);
}

/* ===========================================================================
 * ⚠️⚠️ BAKİYE — TÜRETİLİR, SÜTUN DEĞİL (ADR-014/B8) · T-101
 * ======================================================================== */

/**
 * Bir işin finansal özeti — HİÇBİRİ SÜTUN DEĞİL, hepsi `Transaction` toplaması.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ İŞARET SORUNU — EN PAHALI HATA SINIFI, VE CEVABI "NETLEME" DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `TransactionType` gelir/gider ayrımı taşıyor ve şema bir işe GİDER bağlanmasını
 * engellemiyor — meşru çünkü engellenmemeli: taşeron ödemesi, stok görsel
 * lisansı, baskı masrafı o işin gerçek maliyetidir.
 *
 * NAİF UYGULAMA `sumMoney(hepsi)` YAZARDI VE SESSİZCE YANLIŞ OLURDU. T-101'de
 * canlı ölçüldü (seed verisi + geri alınan transaction, gerçek Prisma):
 *
 *   İŞ: anlaşma 85.625,00 · tahsil 42.812,50
 *   + işe bağlı GİDER 10.000 ve ÖDENMEMİŞ GELİR 5.000 eklendi
 *
 *   doğru  → tahsil 42.812,50 · bekleyen 5.000 · gider 10.000 · KALAN 42.812,50
 *   naif   → hepsini `collected`a toplar (57.812,50) · KALAN 27.812,50
 *
 * Yani müşteri borcu **15.000 TL eksik** görünürdü ve fatura kesilmezdi. Oysa
 * müşteri o parayı borçlu değil; ben harcadım. İki tamamen farklı iş durumu,
 * tek ve yanlış bir sayı.
 *
 * ⚠️ KARAR: NETLEME YOK. GİDER TAHSİLATTAN DÜŞÜLMEZ — AMA GİZLENMEZ DE.
 *
 * Alacak hesabı yalnızca GELİR üzerinden yürür; gider AYRI BİR SAYI olarak
 * döner. "Dışlanmış" olması "görünmez" demek değil — gideri hiç döndürmemek,
 * işe para harcandığını ekrandan silmek olurdu ve o da bir sessizlik olurdu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ `isPaid` İKİNCİ BİR İŞARET TUZAĞI — VE ASİMETRİK ELE ALINIYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `Transaction.isPaid` varsayılanı `true`, ama `false` olabiliyor: kesilmiş ama
 * TAHSİL EDİLMEMİŞ fatura. Onu `collected`a saymak, fatura kesmeyi para almak
 * saymak olurdu — "tahsil edilen" sözcüğünün tam zıddı.
 *
 * ASİMETRİ KASITLI VE GEREKÇELİ:
 *   `collected` → GELİR ∧ `isPaid`      "elimdeki para"
 *   `pending`   → GELİR ∧ ¬`isPaid`     "kesildi, gelmedi"
 *   `expense`   → GİDER (ÖDENSİN YA DA ÖDENMESİN)  "bu işin bana maliyeti"
 *
 * Gider tarafında `isPaid` ayrımı yapılmıyor çünkü soru farklı: gelen bir
 * fatura, henüz ödenmemiş olsa da o işin maliyetidir. İki alan iki ayrı soruya
 * cevap verdiği için `isPaid`i aynı şekilde ele almaları GEREKMİYOR; aynı
 * şekilde ele almak, sorulardan birini bozmak olurdu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * `remaining` VE SINIR DURUMLARI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `remaining = agreedAmount − collected` — müşterinin HÂLÂ borçlu olduğu tutar.
 * `pending` bu tutarın İÇİNDEDİR (kesilmiş fatura de tahsil edilmemiştir).
 *
 * `agreedAmount` NULL İSE `remaining` DA NULL — `0.00` değil. `deriveBaseAmount`
 * ile aynı kural ve aynı sebep: `LEAD` aşamasında anlaşma tutarı BİLİNMİYOR,
 * "borcu yok" demek yanlış olurdu.
 *
 * `remaining` NEGATİF OLABİLİR ve sıfıra KIRPILMIYOR: fazla tahsilat ya bir veri
 * girişi hatasıdır ya da gerçek bir avanstır; ikisi de GÖRÜLMELİ. Kırpmak, tam
 * olarak ADR-014'ün kaçındığı şeyi yapar — bir tutarsızlığı gizlemek.
 *
 * ⚠️ KDV/STOPAJ YOK (ADR-014/B8, v1 kapsamı dışı): `agreedAmount` brüt, bu yüzden
 * `collected` ile karşılaştırması tutarlı. Vergi eklendiğinde `remaining`in brüt
 * mü net mü olduğu AYRICA kararlaştırılmalı.
 *
 * ⚠️ `net` (kârlılık) BİLEREK YOK. `collected − expense` arayüzde iki alandan
 * türetilebiliyor; burada üçüncü bir alan olarak sunmak onu bir KÂR İDDİASI
 * yapardı ve v1 vergiyi hesaplamadığı için o iddia dürüst olmaz. Genel gider
 * payı da modellenmiyor.
 */
export interface JobFinancialsDto {
  jobId: string;
  /** Anlaşma tutarının TRY karşılığı (`Job.baseAmount`). Bilinmiyorsa `null`. */
  agreedBaseAmount: string | null;
  /** GELİR ∧ ödenmiş — elimdeki para. */
  collected: string;
  /** GELİR ∧ ödenmemiş — kesilmiş, tahsil edilmemiş. `remaining` içinde. */
  pending: string;
  /** GİDER (ödenme durumuna bakılmaz) — bu işin maliyeti. Tahsilattan DÜŞÜLMEZ. */
  expense: string;
  /** `agreedBaseAmount − collected`. Tutar bilinmiyorsa `null`. Negatif olabilir. */
  remaining: string | null;
  /** Bu işe bağlı işlem sayısı (gelir + gider). */
  transactionCount: number;
}

/** `fetchJobFinancials`ın Prisma'dan ihtiyaç duyduğu yüzey. */
export interface JobFinancialsClient {
  transaction: {
    groupBy(args: {
      by: ['jobId', 'type', 'isPaid'];
      where: { jobId: { in: string[] } };
      _sum: { baseAmount: true };
      _count: true;
    }): Promise<
      {
        jobId: string | null;
        type: 'INCOME' | 'EXPENSE';
        isPaid: boolean;
        _sum: { baseAmount: DecimalLike | null };
        _count: number;
      }[]
    >;
  };
  job: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true; baseAmount: true };
    }): Promise<{ id: string; baseAmount: DecimalLike | null }[]>;
  };
}

/**
 * Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok.
 *
 * ⚠️ `_count: true` GERÇEKTEN `number` DÖNDÜRÜYOR — T-101'de canlı ölçüldü
 * (`_count=2 (number)`). Prisma'nın `groupBy` imzası bazı biçimlerde
 * `{ _all: number }` döndürebildiği için bu, modellenmiş değil ÖLÇÜLMÜŞ bir
 * varsayım.
 */
const _finansUyumKontrolu: JobFinancialsClient = db;
void _finansUyumKontrolu;

/**
 * Verilen işlerin finansal özetleri — `jobId` ile anahtarlanmış.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI FONKSİYON, NEDEN TOPLU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetchJobForPanel`ı genişletmek REDDEDİLDİ ve gerekçe kardinalite:
 *   - Bakiye `Job`un bir ALANI DEĞİL, bağlı tabloya yapılan bir TOPLAMADIR.
 *     Job okumasına gömülürse HER iş okuması bir `Transaction` toplaması yapar
 *     — kanban'ın 250 kartı dahil, ve kanban bakiyeye HİÇ BAKMIYOR.
 *   - Ayrı tutulunca "maliyeti yalnızca ihtiyaç duyan ekran öder".
 *
 * TOPLU (`jobIds`), tekil değil: iş listesinde bakiye kolonu gösterilmek
 * istenirse tekil imza N+1 üretirdi. İki sorgu — `groupBy` + işlerin
 * `baseAmount`ı — kaç iş sorulduğundan BAĞIMSIZ.
 *
 * `groupBy` ÜÇ ANAHTARLA (`jobId`, `type`, `isPaid`): dört kategoriyi
 * (gelir-ödenmiş, gelir-bekleyen, gider-ödenmiş, gider-bekleyen) tek sorguda
 * ayırıyor. Ayrı sorgular yazmak dört gidiş-dönüş olurdu.
 *
 * SORULAN AMA İŞLEMİ OLMAYAN İŞ DE DÖNER (sıfırlarla): çağıran taraf
 * `financials[jobId]` yazdığında `undefined` görmemeli — yoksa her kullanım
 * yerinde bir `?? sıfırlar` nöbeti gerekirdi ve biri onu unuttuğunda ekranda
 * boşluk çıkardı.
 */
export async function fetchJobFinancials(
  jobIds: readonly string[],
  client: JobFinancialsClient = db,
): Promise<Record<string, JobFinancialsDto>> {
  const aranacak = [...new Set(jobIds.filter((id) => id !== ''))];
  if (aranacak.length === 0) return {};

  const [gruplar, isler] = await Promise.all([
    client.transaction.groupBy({
      by: ['jobId', 'type', 'isPaid'],
      where: { jobId: { in: aranacak } },
      _sum: { baseAmount: true },
      _count: true,
    }),
    client.job.findMany({
      where: { id: { in: aranacak } },
      select: { id: true, baseAmount: true },
    }),
  ]);

  const anlasma = new Map(isler.map((row) => [row.id, toMoneyString(row.baseAmount)]));

  /** Her iş için sıfır tabanı — işlemi olmayan iş de tam DTO döner. */
  const sonuc: Record<string, JobFinancialsDto> = {};
  for (const jobId of aranacak) {
    const agreedBaseAmount = anlasma.get(jobId) ?? null;
    sonuc[jobId] = {
      jobId,
      agreedBaseAmount,
      collected: '0.00',
      pending: '0.00',
      expense: '0.00',
      remaining: agreedBaseAmount,
      transactionCount: 0,
    };
  }

  for (const grup of gruplar) {
    // `jobId` tipte nullable (`groupBy` genel imzası) ama `where` onu
    // sınırlandırıyor; yine de daraltılıyor — `null` anahtarla kayıt yazmak
    // sessizce yanlış bir girdi üretirdi.
    const hedef = grup.jobId === null ? undefined : sonuc[grup.jobId];
    if (!hedef) continue;

    const toplam = toMoneyString(grup._sum.baseAmount) ?? '0.00';
    hedef.transactionCount += grup._count;

    if (grup.type === 'INCOME') {
      // ⚠️ İŞARET KARARI BURADA: yalnızca ÖDENMİŞ gelir tahsilattır.
      if (grup.isPaid) hedef.collected = sumMoney([hedef.collected, toplam]);
      else hedef.pending = sumMoney([hedef.pending, toplam]);
    } else {
      // ⚠️ GİDER TAHSİLATTAN DÜŞÜLMEZ — ayrı sayı, `isPaid` ayrımı yapılmaz.
      hedef.expense = sumMoney([hedef.expense, toplam]);
    }
  }

  for (const dto of Object.values(sonuc)) {
    // Anlaşma tutarı bilinmiyorsa kalan da BİLİNMİYOR — `0.00` değil.
    dto.remaining =
      dto.agreedBaseAmount === null ? null : subtractMoney(dto.agreedBaseAmount, dto.collected);
  }

  return sonuc;
}

/**
 * İş VAR MI — işlem yazmadan önceki kapı (T-051/B kalıbı, T-101'de eklendi).
 *
 * `Transaction.jobId` opsiyonel ama `onDelete: Restrict`; `cuidSchema` yalnızca
 * biçimi doğruluyor. `clientExists` (T-100) ve `transactionCategoryExists`
 * (T-101) ile aynı imza ve aynı gerekçe: kapıyı yazmanın önüne almak, hangi
 * ALANIN bozuk olduğunu bir hata kabuğu ayrıştırmadan kesin bildiriyor.
 */
export async function jobExists(id: string, client: JobPanelClient = db): Promise<boolean> {
  const row = await client.job.findUnique({ where: { id }, select: PANEL_DETAIL_SELECT });
  return row !== null;
}
