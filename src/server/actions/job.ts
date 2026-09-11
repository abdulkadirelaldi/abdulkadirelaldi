'use server';

import { convertMessageToJobSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { fetchContactMessageById } from '@/server/services/contact-message';
import {
  convertMessageToJob,
  findJobByContactMessageId,
  type JobConversionDto,
} from '@/server/services/job';
import {
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * Mesaj → iş dönüşümü — §6'NIN KRİTİK İLİŞKİSİ, §7.1 sırası.
 *
 * §6: "ContactMessage → Job dönüşümü tek tıkla yapılır, gelen mesajdan iş kartı
 * oluşturulur, müşteri kaydı otomatik açılır."
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA F4'ÜN TAMAMI DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yalnızca DÖNÜŞÜM var. İş listeleme, kanban, elle iş açma, güncelleme ve
 * paranın tamamı (`agreedAmount`/`fxRate`/`baseAmount`, ADR-014) F4'ün.
 * Kapsam gerekçesi `services/job.ts`'in başında.
 *
 * ADR-022: dönüşüm bir SONUÇTUR (kalıcı durum değişikliği), `AuditLog`a yazılır.
 */

/** Aynı mesajın ikinci kez dönüştürülmesinde dönen metin — tek yerde. */
const ZATEN_DONUSTURULDU = {
  message: 'Bu mesajdan zaten bir iş kartı oluşturulmuş. Bir mesaj yalnızca bir işe dönüşebilir.',
  fields: { contactMessageId: 'Bu mesaj zaten dönüştürülmüş.' },
} as const;

export async function convertMessageToJobAction(
  raw: unknown,
): Promise<ApiResponse<JobConversionDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(convertMessageToJobSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const mesaj = await fetchContactMessageById(parsed.data.contactMessageId);
    if (!mesaj) return notFound('Mesaj bulunamadı.');

    /*
     * ÇİFT DÖNÜŞÜM — İKİ KATMANLI SAVUNMA, İKİSİ DE GEREKLİ.
     *
     * 1. BURADAKİ ÖN KONTROL kullanıcıya ANLAŞILIR bir mesaj verir ve hangi
     *    işe dönüştüğünü söyleyebilir. Tek başına yeterli DEĞİL: iki eşzamanlı
     *    istek arasında yarış var.
     * 2. `Job.contactMessageId @unique` (ADR-017) GERÇEK güvencedir ve yarışı
     *    kapatır. Tek başına yeterli değil çünkü ham P2002'nin varsayılan
     *    metni slug'a özeldir ve burada anlamsız kalırdı.
     *
     * Ön kontrolü atlayıp yalnızca kısıta güvenmek "çalışırdı" ama kullanıcı
     * hangi işe bakacağını öğrenemezdi; yalnızca ön kontrole güvenmek ise
     * nadiren ikinci bir iş açılmasına izin verirdi.
     */
    const mevcutIs = await findJobByContactMessageId(parsed.data.contactMessageId);
    if (mevcutIs) {
      return fail('CONFLICT', ZATEN_DONUSTURULDU.message, {
        ...ZATEN_DONUSTURULDU.fields,
        // Frontend bu kimlikle "işi göster" bağlantısı kurabilsin.
        jobId: mevcutIs.id,
      });
    }

    const sonuc = await convertMessageToJob({
      contactMessageId: parsed.data.contactMessageId,
      title: parsed.data.title,
      contact: { name: mesaj.name, email: mesaj.email, phone: mesaj.phone },
    });

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Job',
        entityId: sonuc.job.id,
        /*
         * §8.20: gönderenin ADI ve E-POSTASI diff'e YAZILMIYOR. Denetim kaydının
         * cevaplaması gereken soru "hangi mesajdan hangi iş ve müşteri doğdu";
         * kimlik bilgisi zaten bağlanan kayıtlarda duruyor ve `AuditLog`
         * yedeklere (§8.21) giden ayrı bir kopya üretmemeli.
         */
        diff: {
          contactMessageId: parsed.data.contactMessageId,
          jobTitle: sonuc.job.title,
          jobStatus: sonuc.job.status,
          clientId: sonuc.client.id,
          clientCreated: sonuc.client.created,
        },
      },
      db,
    );

    /*
     * ETİKET DÜŞÜRÜLMÜYOR — gerekçe `actions/contact-message.ts`'in başında.
     * Ne `Job` ne `Client` ne de `ContactMessage` public tarafta görünüyor;
     * `ContentEntity` birleşiminde üçü de yok, panel rotaları dinamik.
     */

    return ok(sonuc);
  } catch (error) {
    // Yarışta kaybeden ikinci istek buraya düşer: `@unique` ihlali P2002 verir
    // ve ön kontrolle AYNI metni görmeli — kullanıcı için ikisi aynı olaydır.
    return toFailure('job:convert', error, {
      message: ZATEN_DONUSTURULDU.message,
      fields: { ...ZATEN_DONUSTURULDU.fields },
    });
  }
}
