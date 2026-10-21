import type { ClientFilterInput, CreateClientInput, UpdateClientInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { panelSkipTake, toPagedResult } from './_shared';
import { ATTACHMENT_SELECT, toAttachmentRef } from './_shared/content-query';
import type { AttachmentRefDto, PagedResult } from './content-dto';

/**
 * `Client` servisi — §4.2 müşteri yönetimi, ADR-017.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM: T-038 DÖNÜŞÜMÜN ASGARİSİNİ YAZDI, T-100 TAMAMLADI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-038 yalnızca `findOrCreateClientForMessage`ı yazdı ve gerisini bilerek
 * F4'e bıraktı — listeleme sözleşmesi o gün donmasın diye. T-100 panel okuma
 * yolunu ve tam yazma yolunu ekledi; dönüşümün yüzeyi GENİŞLETİLDİ, yeniden
 * yazılmadı.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SİLME YOK — ARŞİVLEME VAR (ADR-017)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `isArchived` bir sütun ve `Job.clientId` ile `Transaction.clientId` ikisi de
 * `onDelete: Restrict` (şemada ölçüldü) — yani bağlı işi ya da ödemesi olan bir
 * müşteri veritabanı düzeyinde SİLİNEMEZ. Bu yüzden bir `deleteClient` yazmak
 * iki kötü sonuçtan birini verirdi: ya çoğu müşteride patlayan bir düğme, ya da
 * "silinebilenleri sil" gibi kullanıcının öngöremediği bir davranış. Arşivleme
 * her müşteride çalışır ve geri alınabilir.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖNBELLEKLENMEZ
 * ───────────────────────────────────────────────────────────────────────────
 *
 * T-038/T-040/T-052 gerekçesi: tek kullanıcılı panelde hiçbir yükü azaltmadan
 * "yeni kayıt görünmüyor" riski açar. `Client` public tarafta hiç görünmüyor
 * (`ContentEntity` birleşiminde yok, hiçbir `cachedRead` onu okumuyor — T-100'de
 * yeniden tarandı), yani düşürülecek bir etiket de yok.
 */

/** Dönüşümün gereksinim duyduğu asgari Prisma yüzeyi. */
export interface ClientWriteClient {
  client: {
    findUnique(args: { where: { email: string } }): Promise<ClientRow | null>;
    create(args: {
      data: { name: string; email: string | null; phone: string | null; notes: string | null };
    }): Promise<ClientRow>;
  };
}

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isArchived: boolean;
}

/** Dönüşümün dışarı verdiği müşteri özeti — tam DTO F4'te. */
export interface ClientRefDto {
  id: string;
  name: string;
  email: string | null;
  /**
   * Bu çağrıda YENİ mi açıldı, yoksa mevcut kayda mı bağlandı.
   *
   * Sonuç zarfında taşınıyor çünkü kullanıcıya söylenmesi gereken şey bu:
   * "yeni müşteri açıldı" ile "mevcut müşteriye bağlandı" farklı sonuçlardır ve
   * ikincisinde kullanıcı beklemediği bir kayda bağlandığını fark edebilmeli.
   */
  created: boolean;
  /** Mevcut kayıt arşivlenmişse `true` — bkz. `findOrCreateClientForMessage`. */
  isArchived: boolean;
}

export interface MessageContact {
  name: string;
  email: string;
  phone: string | null;
}

/**
 * Mesajın göndereni için müşteri kaydını BULUR ya da AÇAR — §6, ADR-017.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KİMLİK ANAHTARI E-POSTADIR, AD DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Client.email @unique` tam da bunun için var (ADR-017): aynı kişi üç kez
 * yazarsa üç müşteri oluşmamalı.
 *
 * ADA GÖRE EŞLEŞTİRME BİLEREK YAPILMIYOR. İki farklı "Ahmet Yılmaz" birbirinin
 * aynı değildir; ada göre birleştirmek İKİ GERÇEK MÜŞTERİYİ TEK KAYDA KATARDI
 * ve müşteri bazlı muhasebeyi geri döndürülemez biçimde bozardı. Yinelenen bir
 * kayıt can sıkıcıdır ama düzeltilebilir; birleşmiş iki kayıt ayrıştırılamaz.
 * Asimetri, hangi hatayı tercih edeceğimizi belirliyor.
 *
 * `upsert` YERİNE `findUnique` + `create`: `upsert`in `update` tarafı boş
 * kalırdı (mevcut müşterinin adını mesajdaki adla EZMEK istemiyoruz — panelde
 * elle düzeltilmiş bir ad, gelen bir mesaj yüzünden geri alınmamalı) ve dahası
 * `created` bilgisini `upsert`ten okumak mümkün değil.
 *
 * ARŞİVLENMİŞ MÜŞTERİYE BAĞLANIR ve arşivden ÇIKARMAZ: arşivleme bilinçli bir
 * karardı, gelen bir mesaj onu sessizce geri almamalı. Durum `isArchived` ile
 * raporlanır, kararı kullanıcı verir.
 */
export async function findOrCreateClientForMessage(
  contact: MessageContact,
  client: ClientWriteClient = db,
): Promise<ClientRefDto> {
  const eposta = contact.email.trim();

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * E-POSTASIZ MESAJ — ŞEMADA İMKÂNSIZ, YİNE DE ELE ALINIYOR
   * ═══════════════════════════════════════════════════════════════════════
   *
   * `ContactMessage.email` NOT NULL ve `createContactMessageSchema` geçerli
   * bir adres şart koşuyor; yani formdan gelen HİÇBİR mesaj buraya boş
   * e-postayla giremez. Kalan tek yol doğrudan bir veritabanı yazımı (seed,
   * migration, elle müdahale).
   *
   * O durumda TEKİLLEŞTİRME YAPILMAZ ve müşteri `email: null` ile açılır.
   * Sebep: `findUnique({ email: '' })` boş dizeyi bir KİMLİK gibi kullanırdı
   * ve e-postasız her gönderen aynı müşteri kaydında birikirdi — ada göre
   * eşleştirmenin reddedilme gerekçesinin aynısı, daha kötü hâli.
   *
   * `Client.email` nullable olduğu için birden fazla `null` yan yana durabilir
   * (Postgres'te NULL'lar unique indekste birbirinden ayrıdır). Yani bu yol
   * YİNELENEN kayıt üretebilir; kabul ediyoruz, çünkü alternatifi ayrı
   * kişileri birleştirmek ve o geri alınamaz.
   */
  if (!eposta) {
    const kimliksiz = await client.client.create({
      data: {
        name: contact.name,
        email: null,
        phone: contact.phone,
        notes: 'İletişim formundan gelen mesajdan otomatik oluşturuldu (e-posta yok).',
      },
    });
    return {
      id: kimliksiz.id,
      name: kimliksiz.name,
      email: null,
      created: true,
      isArchived: kimliksiz.isArchived,
    };
  }

  const mevcut = await client.client.findUnique({ where: { email: eposta } });

  if (mevcut) {
    return {
      id: mevcut.id,
      name: mevcut.name,
      email: mevcut.email,
      created: false,
      isArchived: mevcut.isArchived,
    };
  }

  const yeni = await client.client.create({
    data: {
      name: contact.name,
      email: eposta,
      phone: contact.phone,
      // İzin verilen tek otomatik not: müşterinin nereden geldiği.
      notes: 'İletişim formundan gelen mesajdan otomatik oluşturuldu.',
    },
  });

  return {
    id: yeni.id,
    name: yeni.name,
    email: yeni.email,
    created: true,
    isArchived: yeni.isArchived,
  };
}

/* ===========================================================================
 * PANEL OKUMA YOLU — T-100
 * ======================================================================== */

/** Listede görünen müşteri. `notes` YOK — liste hafif kalsın (T-038 kalıbı). */
export interface ClientPanelListItemDto {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  isKiyiMedya: boolean;
  isArchived: boolean;
  /** Logo şeridinde görünsün mü (T-117) — varsayılan kapalı. */
  showOnSite: boolean;
  /** Bağlı iş sayısı — "bu müşteri silinebilir mi" sorusunun cevabı da bu. */
  jobCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Düzenleme formunun TAM alan kümesi — `notes` dahil. */
export interface ClientPanelDto extends ClientPanelListItemDto {
  notes: string | null;
  /** T-117 — logo eklentisi; yalnızca detayda (form ve önizleme). */
  logo: AttachmentRefDto | null;
}

const PANEL_LIST_SELECT = {
  id: true,
  name: true,
  company: true,
  email: true,
  phone: true,
  isKiyiMedya: true,
  isArchived: true,
  showOnSite: true,
  createdAt: true,
  updatedAt: true,
  /*
   * İŞ SAYISI SORGUDAN GELİYOR, AYRI BİR TURDA DEĞİL.
   *
   * `_count` kullanılıyor çünkü alternatifi N+1'di: her satır için bir
   * `job.count` çağırmak, yirmi satırlı bir sayfada yirmi gidiş-dönüş demekti.
   * Sayı arayüzde "arşivle" ile "sil" ayrımını açıklamak için gerekli
   * (ADR-017): bağlı işi olan müşteri silinemez, arşivlenir.
   */
  _count: { select: { jobs: true } },
} as const;

const PANEL_DETAIL_SELECT = {
  ...PANEL_LIST_SELECT,
  notes: true,
  logo: { select: ATTACHMENT_SELECT },
} as const;

interface ClientPanelListRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  isKiyiMedya: boolean;
  isArchived: boolean;
  showOnSite: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { jobs: number };
}

interface ClientPanelDetailRow extends ClientPanelListRow {
  notes: string | null;
  logo: {
    id: string;
    key: string;
    mime: string;
    width: number | null;
    height: number | null;
  } | null;
}

/** Bu servisin okuma ve panel yazması için Prisma'dan ihtiyaç duyduğu yüzey. */
export interface ClientPanelClient {
  client: {
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof PANEL_LIST_SELECT;
      orderBy: { name: 'asc' }[];
      skip: number;
      take: number;
    }): Promise<ClientPanelListRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<ClientPanelDetailRow | null>;
    create(args: {
      data: {
        name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
        notes: string | null;
        isKiyiMedya: boolean;
        showOnSite: boolean;
        logoAttachmentId: string | null;
      };
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<ClientPanelDetailRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      select: typeof PANEL_DETAIL_SELECT;
    }): Promise<ClientPanelDetailRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: ClientPanelClient = db;
void _uyumKontrolu;

function toListDto(row: ClientPanelListRow): ClientPanelListItemDto {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    isKiyiMedya: row.isKiyiMedya,
    isArchived: row.isArchived,
    showOnSite: row.showOnSite,
    jobCount: row._count.jobs,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetailDto(row: ClientPanelDetailRow): ClientPanelDto {
  return { ...toListDto(row), notes: row.notes, logo: toAttachmentRef(row.logo) };
}

/**
 * Filtreyi Prisma `where` bloğuna çevirir — SAF, ayrıca sınanabiliyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `isArchived` VERİLMEZSE ARŞİV DAHİL HEPSİ GELİR — T-038'in kararı KORUNDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart bunun burada da geçerli olup olmadığını sordu; geçerli ve aynı gerekçeyle:
 * varsayılanın arşivi GİZLEMESİ "müşterim kayboldu" sorusunu üretir, ve o soruyu
 * soran kişi filtresini değil VERİSİNİ sorgulamaya başlar. Sessiz bir eksilme,
 * gürültülü bir fazlalıktan pahalıdır.
 *
 * ⚠️ AMA ARAYÜZ İÇİN BİR SONUCU VAR, SÖZLEŞMEYE YAZIYORUM: bir müşteri SEÇİCİSİ
 * (iş formundaki "müşteri" alanı) `isArchived: false` GÖNDERMEK ZORUNDA. Aksi
 * hâlde arşivlenmiş müşteriler seçilebilir çıkar ve arşivleme anlamını yitirir.
 * Varsayılanı seçicinin ihtiyacına göre kurmak ise listeyi bozardı — iki
 * yüzeyin ihtiyacı zıt, ve bunu çözen yer varsayılan değil ÇAĞIRAN.
 */
export function buildClientWhere(filter: ClientFilterInput): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived;
  if (filter.isKiyiMedya !== undefined) where.isKiyiMedya = filter.isKiyiMedya;

  if (filter.q) {
    // `mode: 'insensitive'` şart — Türkçe adlarda harf farkı aramayı sessizce
    // boş bırakırdı (T-038'de aynı gerekçe).
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { company: { contains: filter.q, mode: 'insensitive' } },
      { email: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Müşteri listesi — ADA GÖRE ALFABETİK, sayfalı.
 *
 * Sıralama `name asc`, `updatedAt desc` DEĞİL ve bu içerik listelerinden
 * bilinçli bir sapma. Sebep: içerik listesinde "en son dokunduğum" yararlı bir
 * sıradır (düzenleme yüzeyi), müşteri listesinde ise insan ADI ARAR. Alfabetik
 * sıra aramayı öngörülebilir kılar; `@@index([isArchived, name])` da zaten bunu
 * destekliyor (şemada ölçüldü).
 */
export async function fetchClientsForPanel(
  filter: ClientFilterInput,
  client: ClientPanelClient = db,
): Promise<PagedResult<ClientPanelListItemDto>> {
  const where = buildClientWhere(filter);
  const { skip, take } = panelSkipTake(filter);

  const [rows, total] = await Promise.all([
    client.client.findMany({
      where,
      select: PANEL_LIST_SELECT,
      orderBy: [{ name: 'asc' }],
      skip,
      take,
    }),
    client.client.count({ where }),
  ]);

  return toPagedResult(rows, total, filter, toListDto);
}

/** Panel TEK KAYIT — düzenleme formunun tam alan kümesi. Yoksa `null`. */
export async function fetchClientForPanel(
  id: string,
  client: ClientPanelClient = db,
): Promise<ClientPanelDto | null> {
  const row = await client.client.findUnique({ where: { id }, select: PANEL_DETAIL_SELECT });
  return row ? toDetailDto(row) : null;
}

/* ===========================================================================
 * PANEL YAZMA YOLU — T-100
 * ======================================================================== */

/**
 * BOŞ DİZE `null` OLUR — "girilmedi" ile "boş girildi" panelde aynı şey.
 *
 * `createContactMessage`da (T-027) aynı normalizasyon var. Burada ayrıca
 * ZORUNLU: `email` benzersiz ve boş dize bir DEĞERDİR — iki müşteriyi boş
 * e-postayla kaydetmek ikinci kayıtta benzersizlik ihlali verirdi, oysa ikisinin
 * de e-postası YOK.
 */
function bosaNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

export async function createClient(
  input: CreateClientInput,
  client: ClientPanelClient = db,
): Promise<ClientPanelDto> {
  const row = await client.client.create({
    data: {
      name: input.name,
      company: bosaNull(input.company),
      email: bosaNull(input.email),
      phone: bosaNull(input.phone),
      notes: bosaNull(input.notes),
      isKiyiMedya: input.isKiyiMedya,
      showOnSite: input.showOnSite,
      logoAttachmentId: input.logoAttachmentId ?? null,
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toDetailDto(row);
}

/**
 * Müşteriyi günceller — KISMİ.
 *
 * GÖNDERİLMEYEN ALANA DOKUNULMAZ (T-031'in `undefined` ≠ `null` kuralı).
 * `updateClientSchema` `partialWithoutDefaults`ten geçtiği için `isKiyiMedya`
 * varsayılanı da enjekte edilmiyor — yoksa yalnızca adı düzeltmek, müşterinin
 * "Kıyı Medya" işaretini sessizce `false`a çekerdi.
 *
 * `isArchived` BURADAN DEĞİŞTİRİLEMEZ: ayrı bir eylem (`setClientArchived`) ve
 * ayrı bir şema (`archiveClientSchema`) var. Arşivleme bir DURUM KARARIDIR,
 * bir alan düzenlemesi değil; aynı yolda taşımak "adı düzelttim, müşteri
 * arşivden çıktı" sınıfından kazaları mümkün kılardı.
 */
export async function updateClient(
  input: UpdateClientInput,
  client: ClientPanelClient = db,
): Promise<ClientPanelDto> {
  const { id, ...fields } = input;

  const row = await client.client.update({
    where: { id },
    data: {
      ...(fields.name !== undefined ? { name: fields.name } : {}),
      ...(fields.company !== undefined ? { company: bosaNull(fields.company) } : {}),
      ...(fields.email !== undefined ? { email: bosaNull(fields.email) } : {}),
      ...(fields.phone !== undefined ? { phone: bosaNull(fields.phone) } : {}),
      ...(fields.notes !== undefined ? { notes: bosaNull(fields.notes) } : {}),
      ...(fields.isKiyiMedya !== undefined ? { isKiyiMedya: fields.isKiyiMedya } : {}),
      ...(fields.showOnSite !== undefined ? { showOnSite: fields.showOnSite } : {}),
      ...(fields.logoAttachmentId !== undefined
        ? { logoAttachmentId: fields.logoAttachmentId }
        : {}),
    },
    select: PANEL_DETAIL_SELECT,
  });

  return toDetailDto(row);
}

/**
 * Arşivler ya da arşivden çıkarır — SİLMEZ (ADR-017).
 *
 * İki YÖNLÜ ve bu zorunlu: tek yönlü bir `archiveClient` geri alınamaz bir
 * düğme olurdu, oysa arşivleme tam olarak "geri alınabilir silme" diye seçildi.
 * `archiveClientSchema` da `isArchived: z.boolean()` taşıyor (T-011), yani şema
 * bu kararı zaten veriyor.
 */
export async function setClientArchived(
  id: string,
  isArchived: boolean,
  client: ClientPanelClient = db,
): Promise<ClientPanelDto> {
  const row = await client.client.update({
    where: { id },
    data: { isArchived },
    select: PANEL_DETAIL_SELECT,
  });

  return toDetailDto(row);
}

/**
 * Müşteri VAR MI — yazmadan önceki kapı (T-051/B'nin kalıbı).
 *
 * `Job.clientId` gizli bir form alanından geliyor ve `cuidSchema` yalnızca
 * BİÇİMİ doğruluyor; var olmayan bir kimlik şemayı geçer ve tek kapı
 * veritabanındaki FK kısıtı olur (`onDelete: Restrict` → P2003). Eklenti
 * kimliklerinde aynı sınıfı T-051/B'de ölçtük ve çözümü aynı: kontrolü yazmanın
 * ÖNÜNE almak, böylece hangi alanın bozuk olduğu KESİN bilinir ve kullanıcıya
 * belgelenmemiş bir hata kabuğunu ayrıştırmadan doğru alan söylenir.
 *
 * T-101 (`Transaction.clientId`, aynı FK davranışı) bunu yeniden yazmadan
 * kullanabilir.
 */
export async function clientExists(id: string, client: ClientPanelClient = db): Promise<boolean> {
  const row = await client.client.findUnique({ where: { id }, select: PANEL_DETAIL_SELECT });
  return row !== null;
}

/* ===========================================================================
 * T-117 — HERKESE AÇIK LOGO ŞERİDİ
 * ======================================================================== */

/**
 * Logo şeridinin TEK okuması — ve müşterinin public'e çıkan TEK yüzeyi.
 *
 * ⚠️ SEÇİM DAR VE BİLİNÇLİ: yalnızca `id`, `name` ve logo. `email`, `phone`,
 * `notes`, `company` sorguya HİÇ GİRMİYOR — DTO'dan sonra süzmek değil,
 * SEÇMEMEK (bir gün DTO'ya alan eklenirse sızıntı tip değişikliği ister).
 *
 * Koşulların ÜÇÜ de şart: `showOnSite` (bilinçli işaret), arşivde değil
 * (bırakılan müşteri vitrine çıkmaz) ve logosu VAR (logosuz isim şeridi
 * boş kutu demek). Sunum ucu da aynı üç koşulu ayrıca kontrol ediyor
 * (`isPublicClientLogo`) — biri gevşerse öbürü tutar.
 */
export interface SiteClientLogoDto {
  id: string;
  name: string;
  logo: AttachmentRefDto;
}

export const SITE_CLIENT_LOGO_WHERE = {
  showOnSite: true,
  isArchived: false,
  logoAttachmentId: { not: null },
} as const;

export async function fetchSiteClientLogos(): Promise<SiteClientLogoDto[]> {
  const rows = await db.client.findMany({
    where: SITE_CLIENT_LOGO_WHERE,
    select: { id: true, name: true, logo: { select: ATTACHMENT_SELECT } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  return rows.flatMap((row) => {
    const logo = toAttachmentRef(row.logo);
    return logo ? [{ id: row.id, name: row.name, logo }] : [];
  });
}

/**
 * Bu eklenti, vitrindeki bir müşterinin logosu mu — sunum ucunun CLIENT
 * istisnası (ADR-044'ün "makbuz/iş/müşteri yalnızca oturumla" kuralının TEK
 * deliği). Müşterinin BAŞKA bir eklentisi (sözleşme, fatura) bu sorudan
 * geçemez: eşleşme `logoAttachmentId` üzerinden, entity üzerinden değil.
 */
export async function isPublicClientLogo(
  attachmentId: string,
  sahipClientId: string,
): Promise<boolean> {
  /*
   * ⚠️ `id: sahipClientId` ŞART: eşleşme yalnızca `logoAttachmentId` üzerinden
   * olsaydı, logo alanına BAŞKA bir kaydın eklentisi (ör. bir makbuz) yazılmış
   * bir müşteri o makbuzu herkese açardı. Yazma tarafı bunu zaten reddediyor
   * (`clientLogoBelongsTo`); bu ikinci kat.
   */
  const sayi = await db.client.count({
    where: { ...SITE_CLIENT_LOGO_WHERE, id: sahipClientId, logoAttachmentId: attachmentId },
  });
  return sayi > 0;
}

/**
 * Logo, BU müşterinin KENDİ eklentisi mi (entity CLIENT, entityId = müşteri).
 * `cuidSchema` yalnızca biçimi doğruluyor; başka bir kaydın eklentisini logo
 * yapmak, o dosyayı vitrine çıkarmak olurdu.
 */
export async function clientLogoBelongsTo(
  clientId: string,
  attachmentId: string,
): Promise<boolean> {
  const sayi = await db.attachment.count({
    where: { id: attachmentId, entity: 'CLIENT', entityId: clientId },
  });
  return sayi > 0;
}
