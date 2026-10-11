'use server';

import {
  changeJobStatusSchema,
  convertMessageToJobSchema,
  createJobSchema,
  updateJobSchema,
} from '@/lib/schemas';
import { db } from '@/server/db';
import { clientExists } from '@/server/services/client';
import { fetchContactMessageById } from '@/server/services/contact-message';
import {
  changeJobStatus,
  convertMessageToJob,
  createJob,
  findJobByContactMessageId,
  updateJob,
  type JobConversionDto,
  type JobPanelDto,
} from '@/server/services/job';
import {
  buildDiff,
  fail,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiFailure,
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
      conflict: {
        message: ZATEN_DONUSTURULDU.message,
        fields: { ...ZATEN_DONUSTURULDU.fields },
      },
    });
  }
}

/* ===========================================================================
 * F4 — ELLE İŞ AÇMA, GÜNCELLEME, KANBAN DURUM DEĞİŞİMİ (T-100)
 * ======================================================================== */

/**
 * ⚠️⚠️ `AuditLog.diff`TE PARA — KARAR VE GEREKÇE (T-100)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart doğru soruyu sordu: `agreedAmount` iş verisidir, sır değil — ama T-053'ün
 * beyaz listesi onu varsayılan olarak GÖSTERMİYOR ve polaritesi bilinçli.
 *
 * ⚠️ SORU İKİ AYRI YÜZEY HAKKINDA VE CEVAPLARI FARKLI:
 *
 *   SATIR (veritabanı)  → tutarlar YAZILIYOR.
 *   EKRAN (denetim)     → tutarlar GÖRÜNMÜYOR.
 *
 * SATIRA YAZILIYOR, çünkü ADR-034'ün kuralı "sırrı diff'e hiç koyma"dır ve tutar
 * sır değil. Dahası yeni bir maruziyet de açmıyor: aynı tutar `job` tablosunda
 * zaten duruyor ve §8.21 yedeği ikisini AYNI yedeğe alıyor. Yazmanın karşılığı
 * gerçek bir adli değer — "kur 34,25'ten 40,00'a kim çekti" sorusu ancak satırda
 * değer varsa cevaplanır.
 *
 * EKRANDA GÖRÜNMÜYOR, ve bunun için HİÇBİR ŞEY YAPMAM GEREKMİYOR: T-053'ün
 * okuma yolu `{ before, after }` çiftlerinin DEĞERİNİ hiç basmıyor, yalnızca
 * alan adını veriyor. Yani `agreedAmount` ekranda "değişti" olarak görünür,
 * "85.000 → 100.000" olarak görünmez.
 *
 * ⚠️ BEYAZ LİSTEYE EKLEMİYORUM ve bu kararın ASIL KISMI. Kart ekleme şartını
 * doğru koydu: "o adın altına asla kayıt içeriği yazılmadığını kanıtla" — ve
 * kanıtlanamaz, çünkü TUTAR TAM OLARAK KAYIT İÇERİĞİDİR. Beyaz listenin tek
 * üyelik ölçütü "değer bir ALAN ADI ya da kodda yazılı KAPALI BİR KÜME"; tutar
 * ikisi de değil.
 *
 * Bir içerik alanını listeye almak, listeyi yapısal bir ölçütten "hangi içerik
 * masum" tartışmasına çevirirdi: yarın `title`, sonra `notes`, sonra müşteri
 * telefonu. ADR-034'ün cümlesi tam buydu — koruma, hatırlamayı (ve tartışmayı)
 * gerektirdiği anda koruma olmaktan çıkar. Listenin değeri kısalığında değil,
 * ÖLÇÜTÜN MEKANİK OLMASINDA.
 *
 * KAYBEDİLEN ŞEY KÜÇÜK: tutar geçmişi denetim ekranından okunamıyor. Ama o
 * zaten `AuditLog`un işi değil — tutar geçmişi bir SÜRÜMLEME özelliğidir ve onu
 * beyaz listeyi genişleterek inşa etmek, hem güvenilmez bir yarım sürüm geçmişi
 * hem zayıflamış bir ölçüt verirdi. İşin bugünkü tutarı kaydın kendisinde,
 * kullanıcının zaten baktığı ekranda duruyor.
 */

/** İş diff'inde SAYILAN alanlar — BULGU-019: liste elle, modelden türetilmez. */
function auditableJob(dto: JobPanelDto) {
  return {
    title: dto.title,
    status: dto.status,
    clientId: dto.clientId,
    startDate: dto.startDate,
    dueDate: dto.dueDate,
    deliveredAt: dto.deliveredAt,
    agreedAmount: dto.agreedAmount,
    currency: dto.currency,
    fxRate: dto.fxRate,
    // TÜRETİLMİŞ ama diff'e GİRİYOR: ADR-014'ün kuralı bozulursa denetim
    // kaydında görünür. `agreedAmount × fxRate` ile tutmayan bir `baseAmount`
    // satırı, tutarsızlığın ne zaman doğduğunu söyleyen tek kanıt olurdu.
    baseAmount: dto.baseAmount,
  };
}

/**
 * Var olmayan müşteri kimliği için KESİN alan hatası — T-051/B'nin kalıbı.
 *
 * `cuidSchema` yalnızca biçimi doğruluyor; varlığı burada kontrol ediliyor,
 * böylece `Job.clientId`in FK kısıtına (`onDelete: Restrict` → P2003)
 * düşülmüyor ve kullanıcıya DOĞRU alan söyleniyor.
 *
 * ⚠️ BU KONTROL OLMASA KULLANICI "DOSYA" HATASI GÖRÜRDÜ: `toFailure`ın P2003
 * varsayılan metni eklentiye özel ("Seçilen dosya bulunamadı") çünkü T-050'de
 * bu yola giren tek şey eklentilerdi. F4 ikinci kaynağı açıyor; hem bu ön
 * kontrol hem `_shared.ts`teki `foreignKey` geçersiz kılma o yüzden eklendi.
 */
async function missingClientFailure(clientId: string | undefined): Promise<ApiFailure | null> {
  if (!clientId) return null;
  if (await clientExists(clientId)) return null;

  return fail(
    'VALIDATION_ERROR',
    'Seçilen müşteri bulunamadı — silinmiş olabilir. Listeyi yenileyip tekrar seçin.',
    { clientId: 'Seçilen müşteri bulunamadı.' },
  );
}

/** P2003 yarışında gösterilecek metin — ön kontrolle AYNI cümle. */
const MUSTERI_YOK = {
  message: 'Seçilen müşteri bulunamadı — silinmiş olabilir. Listeyi yenileyip tekrar seçin.',
  fields: { clientId: 'Seçilen müşteri bulunamadı.' },
} as const;

export async function createJobAction(raw: unknown): Promise<ApiResponse<JobPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createJobSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const eksikMusteri = await missingClientFailure(parsed.data.clientId);
  if (eksikMusteri) return eksikMusteri;

  try {
    const dto = await createJob(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Job',
        entityId: dto.id,
        diff: buildDiff(null, auditableJob(dto)),
      },
      db,
    );

    /* ETİKET DÜŞÜRÜLMÜYOR — tarama ve gerekçe `actions/client.ts`in başında. */
    return ok(dto);
  } catch (error) {
    return toFailure('job:create', error, { foreignKey: { ...MUSTERI_YOK } });
  }
}

export async function updateJobAction(raw: unknown): Promise<ApiResponse<JobPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateJobSchema, raw);
  if (!parsed.ok) return parsed.failure;

  const eksikMusteri = await missingClientFailure(parsed.data.clientId);
  if (eksikMusteri) return eksikMusteri;

  try {
    /*
     * `updateJob` `null` DÖNÜYOR, FIRLATMIYOR: `baseAmount` türetmesi için
     * mevcut satırı ZATEN okuyor (gerekçe o fonksiyonda), dolayısıyla "kayıt
     * yok" durumunu P2025'e bırakmak yerine doğrudan bilebiliyor. P2025'e
     * bırakmak aynı sonucu daha belirsiz bir mesajla verirdi.
     */
    const dto = await updateJob(parsed.data);
    if (!dto) return notFound('İş bulunamadı.');

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Job',
        entityId: dto.id,
        /*
         * SONRAKİ durum yazılıyor, önce/sonra çifti DEĞİL — `updateClientAction`
         * ile aynı takas (etiket olmadığı için fazladan okuma yapılmıyor), ama
         * burada tutarların KENDİSİ de giriyor: `updateJob` zaten mevcut satırı
         * okuyor, yani bilgi elimizde ve bedava.
         */
        diff: {
          ...buildDiff(null, auditableJob(dto)),
          /*
           * ⚠️ `changed` `buildDiff`TEN GEÇMİYOR VE BU ZORUNLU — ölçümle bulundu.
           *
           * `buildDiff` her alanı `{ before, after }` çiftine sarıyor; T-053'ün
           * okuma yolu ise o çiftlerin DEĞERİNİ bilerek hiç basmıyor (yalnızca
           * alan adını). Yani sarılmış bir `changed`, denetim ekranında
           * "changed değişti" diye görünür ve HANGİ ALANLARIN gönderildiği
           * KAYBOLUR — oysa bu alanın tek varlık sebebi okunabilir olması, ve
           * beyaz listede bulunmasının sebebi de bu (değeri bir ALAN ADI
           * listesi, kayıt içeriği değil).
           *
           * T-046'nın `profile.socials`ta `buildDiff`i atlama gerekçesi
           * farklıydı (`Object.is` iki boş diziyi "değişti" sayıyordu); burada
           * sebep okuma yüzeyi. İki ayrı sebep, aynı sonuç: FARKIN KENDİSİ olan
           * bir alan ikinci kez farklanmaz.
           */
          changed: Object.keys(parsed.data)
            .filter((key) => key !== 'id')
            .sort()
            .join(', '),
        },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('job:update', error, { foreignKey: { ...MUSTERI_YOK } });
  }
}

/**
 * Kanban durum değişimi — kart sürüklendiğinde çağrılır.
 *
 * ⚠️ `CANCELLED` BİR DURUMDUR, SİLME DEĞİL. İkisi ayrı sorular ve bu eylem
 * yalnızca ilkini cevaplıyor; silme kararı ve FK ölçümü raporda.
 */
export async function changeJobStatusAction(raw: unknown): Promise<ApiResponse<JobPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(changeJobStatusSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await changeJobStatus(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Job',
        entityId: dto.id,
        // Tek alan değişti; diff de tek alan taşıyor. `auditableJob`un tamamını
        // yazmak, değişmeyen dokuz alanı her sürüklemede tekrar kaydetmek olurdu.
        diff: { status: dto.status, context: 'KANBAN_STATUS' },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('job:status', error);
  }
}
