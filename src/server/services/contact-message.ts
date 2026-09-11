import type {
  ContactMessageFilterInput,
  CreateContactMessageInput,
  UpdateContactMessageInput,
} from '@/lib/schemas';
import { db } from '@/server/db';

import { contactRateWindowStart } from './_shared';

/**
 * `ContactMessage` servisi — §4.1 /iletisim, §7.4, ADR-020/C11.
 *
 * §7.4: DB erişimi YALNIZCA burada. Route handler ham Prisma çağırmaz.
 * Servis konvansiyonu (bkz. `services/index.ts`): istemci enjekte edilir,
 * girdi ZATEN DOĞRULANMIŞ gelir, Prisma satırı doğrudan dönmez.
 *
 * §8.15'in POLİTİKASI burada DEĞİL — `_shared/contact-policy.ts` içinde. Bu
 * dosya yalnızca sayar ve yazar; eşiğin kaç olduğunu bilmez. Ayrım, ADR-013'ün
 * `LoginAttempt` için kurduğu ayrımın aynısı: tablo ve servis bir yerde,
 * "kaç tanede ne olur" başka yerde.
 */

/**
 * Bu servisin Prisma'dan İHTİYAÇ DUYDUĞU asgari yüzey.
 *
 * `Pick<PrismaClient, 'contactMessage'>` DEĞİL — okuma servisleri (`post.ts`,
 * `project.ts`) onu kullanıyor ama onlar testte taklit istemci kurmuyor. Burada
 * taklit ZORUNLU (`pnpm test` DB'siz koşar) ve tam delegate 16 metot istiyor;
 * hepsini taklit etmek testi Prisma'nın iç yüzeyine bağlardı.
 *
 * `LoginAttemptClient`/`LockoutClient` ile aynı kalıp: dar arayüz + aşağıdaki
 * DERLEME ZAMANI uyum kontrolü. Gerçek `PrismaClient` bu arayüzü sağlamak
 * ZORUNDA; sağlamazsa `tsc` burada kırılır, testte değil.
 */
export interface ContactMessageClient {
  contactMessage: {
    create(args: {
      data: {
        name: string;
        email: string;
        phone: string | null;
        subject: string | null;
        message: string;
        sourcePage: string | null;
        ip: string | null;
        userAgent: string | null;
        isSpam: boolean;
        honeypotHit: boolean;
        spamScore: number;
      };
      select: { id: true; createdAt: true };
    }): Promise<{ id: string; createdAt: Date }>;
    /**
     * `where` GENİŞ TİPLİ — §8.15 sayacı `{ ip, createdAt }` verirken mesaj
     * kutusu `buildContactMessageWhere`in ürettiği serbest bloğu veriyor. Dar
     * bir birleşim yazmak, filtre her genişlediğinde bu arayüzü de düzenlemeyi
     * gerektirirdi; asıl tip güvencesi zaten aşağıdaki uyum kapısında.
     */
    count(args: { where: Record<string, unknown> }): Promise<number>;
    findMany(args: {
      where: Record<string, unknown>;
      select: typeof LIST_SELECT;
      orderBy: { createdAt: 'desc' }[];
      skip: number;
      take: number;
    }): Promise<ContactMessageListRow[]>;
    findUnique(args: {
      where: { id: string };
      select: typeof LIST_SELECT & { ip: true; userAgent: true };
    }): Promise<ContactMessageDetailRow | null>;
    update(args: {
      where: { id: string };
      data: {
        isRead?: boolean;
        isSpam?: boolean;
        repliedAt?: Date | null;
        archivedAt?: Date | null;
      };
      select: typeof LIST_SELECT;
    }): Promise<ContactMessageListRow>;
  };
}

/** Uyum kapısı — gerçek istemci dar arayüze OTURUYOR. Çalışma zamanı etkisi yok. */
const _uyumKontrolu: ContactMessageClient = db;
void _uyumKontrolu;

/** İstemciden ALINMAYAN, sunucuda belirlenen alanlar (bkz. `schemas/contact-message.ts`). */
export interface ContactMessageServerFields {
  /** §8/KVKK — 90 gün sonra temizlenir. §8.15 sayacı da bu alanı okur. */
  ip: string | null;
  /** §8/KVKK — `ip` ile aynı ömürde. Yalnızca panelde spam incelemesi için. */
  userAgent: string | null;
  isSpam: boolean;
  honeypotHit: boolean;
  spamScore: number;
}

/**
 * Kayıt sonrası dışarı verilen şekil.
 *
 * MESAJIN İÇERİĞİ VE ADRESİ BURADA YOK ve kasıtlı: bu DTO §7.2 zarfıyla
 * ZİYARETÇİYE dönüyor. Gönderdiği şeyi ona geri yansıtmak hiçbir işe yaramaz,
 * ama bir XSS zincirinde yansıtılmış girdi hâline gelir. `isSpam`/`spamScore`
 * da yok: bota "yakalandın" demek, sonraki denemeyi bilgilendirir.
 */
export interface ContactMessageReceiptDto {
  id: string;
  createdAt: string;
}

/**
 * §8.15 sayacı — verilen IP'nin pencere içinde KABUL EDİLMİŞ mesaj sayısı.
 *
 * Reddedilen istekler kaydedilmediği için sayıya girmez; honeypot'a takılanlar
 * KAYDEDİLDİĞİ için girer — bir bot, işaretlenmiş gönderimleriyle kendi
 * kotasını tüketir.
 *
 * `ip` yoksa (başlık okunamadı) sayım YAPILMAZ ve 0 döner: `ip IS NULL` olan
 * tüm kayıtlar tek bir sayaçta toplanırsa, vekil başlığı düşen bir kurulumda
 * bütün ziyaretçiler birbirinin kotasını yer.
 */
export async function countRecentContactMessagesByIp(
  ip: string | null,
  now: Date,
  client: ContactMessageClient = db,
): Promise<number> {
  if (!ip) return 0;

  return client.contactMessage.count({
    where: { ip, createdAt: { gte: contactRateWindowStart(now) } },
  });
}

/**
 * Mesajı kaydeder.
 *
 * SPAM MESAJ DA KAYDEDİLİR (ADR-020/C11) — silinmez, ayrılır. Yanlış pozitifte
 * gerçek müşteri kaybedilmesin diye karar veren tek şey `isSpam` bayrağıdır.
 */
export async function createContactMessage(
  input: CreateContactMessageInput,
  server: ContactMessageServerFields,
  client: ContactMessageClient = db,
): Promise<ContactMessageReceiptDto> {
  const row = await client.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      // Boş string yerine `null`: "girilmedi" ile "boş girildi" panelde aynı şey.
      phone: input.phone?.trim() ? input.phone : null,
      subject: input.subject?.trim() ? input.subject : null,
      message: input.message,
      sourcePage: input.sourcePage?.trim() ? input.sourcePage : null,
      ip: server.ip,
      userAgent: server.userAgent,
      isSpam: server.isSpam,
      honeypotHit: server.honeypotHit,
      spamScore: server.spamScore,
    },
    select: { id: true, createdAt: true },
  });

  return { id: row.id, createdAt: row.createdAt.toISOString() };
}

/* ===========================================================================
 * OKUMA YOLU — §4.2 mesaj kutusu, T-038
 *
 * ÖNBELLEK YOK ve bu bilinçli: mesaj kutusu PANELDİR, public değil. ADR-011'in
 * `cachedRead` katmanı public okumalar içindir; panel rotalarının hepsi dinamik
 * (T-034'te ölçüldü: ƒ /panel, ƒ /panel/ayarlar, ƒ /panel/desenler). Bir
 * önbellek eklemek, tek kullanıcılı bir panelde hiçbir yükü azaltmadan
 * "yeni mesaj görünmüyor" sınıfından bir hata riski açardı.
 * ======================================================================== */

/** Panelde listelenen mesaj — `message` gövdesi YOK (liste hafif kalsın). */
export interface ContactMessageListItemDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  /** Liste için kısaltılmış önizleme; tam gövde detayda. */
  preview: string;
  sourcePage: string | null;
  isRead: boolean;
  isSpam: boolean;
  honeypotHit: boolean;
  spamScore: number | null;
  repliedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  /** Bu mesajdan iş açıldıysa onun kimliği — §6 dönüşümü (ADR-017 tek yön). */
  convertedJobId: string | null;
}

export interface ContactMessageDto extends ContactMessageListItemDto {
  message: string;
  /** §8/KVKK — 90 gün sonra temizlenir. Yalnızca panelde, spam incelemesi için. */
  ip: string | null;
  userAgent: string | null;
}

export interface ContactMessagePageDto {
  items: ContactMessageListItemDto[];
  total: number;
  page: number;
  perPage: number;
  /** Rozet için — filtreden BAĞIMSIZ, arşivlenmemiş okunmamış sayısı. */
  unreadCount: number;
}

/** Liste önizlemesi bu uzunlukta kesilir. */
const PREVIEW_LENGTH = 160;

function toPreview(message: string): string {
  const tek = message.replace(/\s+/g, ' ').trim();
  return tek.length <= PREVIEW_LENGTH ? tek : `${tek.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * LİSTE satırı — `ip`/`userAgent` YOK.
 *
 * Detaydan ayrı tutuluyor çünkü `LIST_SELECT` onları çekmiyor: KVKK kapsamındaki
 * iki alan yalnızca tek mesaj açıldığında okunur, listede yüzlerce satırda
 * taşınmaz. Tek bir satır tipi yazsaydım `findMany`nin dönüşü tipe uymazdı ve
 * bunu bir `as` ile bastırmak, seçim ile tip arasındaki sapmayı gizlerdi.
 */
interface ContactMessageListRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  sourcePage: string | null;
  isRead: boolean;
  isSpam: boolean;
  honeypotHit: boolean;
  spamScore: number | null;
  repliedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  convertedJob: { id: string } | null;
}

/** DETAY satırı — §8/KVKK alanları burada. */
interface ContactMessageDetailRow extends ContactMessageListRow {
  ip: string | null;
  userAgent: string | null;
}

function toListDto(row: ContactMessageListRow): ContactMessageListItemDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    preview: toPreview(row.message),
    sourcePage: row.sourcePage,
    isRead: row.isRead,
    isSpam: row.isSpam,
    honeypotHit: row.honeypotHit,
    spamScore: row.spamScore,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    // İlişki DÜZLEŞTİRİLİYOR: DTO'ya iç içe bir `{ convertedJob: { id } }`
    // koymak, Frontend'i "var mı yok mu" için iki seviye kontrole zorlardı.
    convertedJobId: row.convertedJob?.id ?? null,
  };
}

/**
 * Filtreyi Prisma `where` bloğuna çevirir — SAF, bu yüzden ayrıca sınanabiliyor.
 *
 * `archived` ÜÇ DURUMLUDUR ve `archivedAt` üzerinden çözülür (ayrı bir boole
 * sütun yok): `true` → yalnızca arşivlenmişler, `false` → yalnızca kutudakiler,
 * verilmemiş → hepsi. Varsayılanı "hepsi" bırakmak kasıtlı: filtresiz bir
 * çağrının sessizce arşivi gizlemesi, "mesajım kayboldu" sorusunu üretirdi.
 */
export function buildContactMessageWhere(
  filter: ContactMessageFilterInput,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filter.isRead !== undefined) where.isRead = filter.isRead;
  if (filter.isSpam !== undefined) where.isSpam = filter.isSpam;
  if (filter.honeypotHit !== undefined) where.honeypotHit = filter.honeypotHit;
  if (filter.archived !== undefined) {
    where.archivedAt = filter.archived ? { not: null } : null;
  }
  if (filter.minSpamScore !== undefined) {
    where.spamScore = { gte: filter.minSpamScore };
  }
  if (filter.q) {
    // Ad, e-posta, konu ve gövdede arama. `mode: 'insensitive'` şart:
    // Türkçe adlarda büyük/küçük harf farkı aramayı sessizce boş bırakırdı.
    where.OR = [
      { name: { contains: filter.q, mode: 'insensitive' } },
      { email: { contains: filter.q, mode: 'insensitive' } },
      { subject: { contains: filter.q, mode: 'insensitive' } },
      { message: { contains: filter.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

const LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  subject: true,
  message: true,
  sourcePage: true,
  isRead: true,
  isSpam: true,
  honeypotHit: true,
  spamScore: true,
  repliedAt: true,
  archivedAt: true,
  createdAt: true,
  convertedJob: { select: { id: true } },
} as const;

/**
 * Mesaj listesi — EN YENİ ÖNCE, sayfalı.
 *
 * `unreadCount` filtreden BAĞIMSIZ hesaplanır: menüdeki rozet "spam hariç,
 * arşivlenmemiş, okunmamış" sayısını göstermeli ve kullanıcı spam sekmesine
 * geçtiğinde bu sayının değişmesi anlamsız olurdu.
 */
export async function fetchContactMessages(
  filter: ContactMessageFilterInput,
  client: ContactMessageClient = db,
): Promise<ContactMessagePageDto> {
  const where = buildContactMessageWhere(filter);
  const skip = (filter.page - 1) * filter.perPage;

  const [rows, total, unreadCount] = await Promise.all([
    client.contactMessage.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: filter.perPage,
    }),
    client.contactMessage.count({ where }),
    client.contactMessage.count({ where: { isRead: false, isSpam: false, archivedAt: null } }),
  ]);

  return {
    items: rows.map(toListDto),
    total,
    page: filter.page,
    perPage: filter.perPage,
    unreadCount,
  };
}

/** Tekil mesaj — tam gövde, `ip`/`userAgent` dahil. Yoksa `null`. */
export async function fetchContactMessageById(
  id: string,
  client: ContactMessageClient = db,
): Promise<ContactMessageDto | null> {
  const row = await client.contactMessage.findUnique({
    where: { id },
    select: { ...LIST_SELECT, ip: true, userAgent: true },
  });
  if (!row) return null;

  return {
    ...toListDto(row),
    message: row.message,
    ip: row.ip,
    userAgent: row.userAgent,
  };
}

/* ===========================================================================
 * PANEL YAZMA YOLU — T-038
 * ======================================================================== */

/**
 * Mesajın DURUM alanlarını günceller. İÇERİĞİ DEĞİŞTİRMEZ.
 *
 * `updateContactMessageSchema` zaten yalnızca `isRead`/`isSpam`/`repliedAt`/
 * `archivedAt` taşıyor (T-011); gövde ve gönderen bilgisi panelden düzenlenemez.
 *
 * KISMİ: gönderilmeyen alana DOKUNULMAZ. Bu, "okundu işaretle"nin `repliedAt`
 * veya `archivedAt`i BOZMAMASININ tek sebebi — `data`ya yalnızca `isRead`
 * girer. (T-031'in `undefined` ≠ `null` kuralının aynısı.)
 */
export async function updateContactMessageStatus(
  input: UpdateContactMessageInput,
  client: ContactMessageClient = db,
): Promise<ContactMessageListItemDto> {
  const { id, ...fields } = input;

  const row = await client.contactMessage.update({
    where: { id },
    data: {
      ...(fields.isRead !== undefined ? { isRead: fields.isRead } : {}),
      ...(fields.isSpam !== undefined ? { isSpam: fields.isSpam } : {}),
      ...(fields.repliedAt !== undefined
        ? { repliedAt: fields.repliedAt ? new Date(fields.repliedAt) : null }
        : {}),
      ...(fields.archivedAt !== undefined
        ? { archivedAt: fields.archivedAt ? new Date(fields.archivedAt) : null }
        : {}),
    },
    select: LIST_SELECT,
  });

  return toListDto(row);
}
