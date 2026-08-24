import type { CreateContactMessageInput } from '@/lib/schemas';
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
    count(args: { where: { ip: string; createdAt: { gte: Date } } }): Promise<number>;
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
