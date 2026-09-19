'use server';

import { entityIdSchema, updateContactMessageSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  fetchContactMessageById,
  updateContactMessageStatus,
  type ContactMessageListItemDto,
} from '@/server/services/contact-message';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * Mesaj kutusu Server Action'ları — §4.2, §7.1, §8.6, ADR-022.
 *
 * T-031'in kalıbının İLK KOPYASI. Sıra birebir aynı; TEK FARK son adımda:
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `revalidateTag` YOK — VE BU BİR EKSİKLİK DEĞİL, ÖLÇÜLMÜŞ BİR KARAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-029'un etiket hiyerarşisi PUBLIC İÇERİK içindir. `ContactMessage` public
 * tarafta HİÇBİR YERDE görünmüyor:
 *
 *   - `ContentEntity` birleşiminde yok ('profile' | 'project' | 'post' |
 *     'experience' | 'skill' | 'service') — yani düşürülebilecek bir etiket
 *     tanımlı bile değil.
 *   - `cached.ts`'teki hiçbir `cachedRead` girdisi `ContactMessage` okumuyor;
 *     `getSiteStats` yalnızca `Project` + `Experience` topluyor (tarandı).
 *   - Mesaj kutusu okumaları önbeleklenmiyor (bkz. `services/contact-message.ts`).
 *   - Panel rotalarının hepsi dinamik (T-034 ölçümü: ƒ /panel, ƒ /panel/ayarlar,
 *     ƒ /panel/desenler), yani `revalidatePath` de gerekmiyor.
 *
 * Yani düşürülecek bir şey YOK. Simetri uğruna `revalidateTag('content:...')`
 * çağırmak, var olmayan bir etiketi düşürmeye çalışan ölü kod olurdu — ve daha
 * kötüsü, sonraki okuyucuya "mesaj kutusu önbelleklidir" diye yanlış bilgi
 * verirdi. Kalıbı kopyalarken KOPYALANMAYACAK adımı işaretlemek, kalıbın
 * kendisinin bir parçası.
 */

/*
 * OKUMALAR BURADAN İHRAÇ EDİLMİYOR — §7.1.
 *
 * "Panel okuma → Server Component içinde DOĞRUDAN servis çağrısı." Sayfa
 * `fetchContactMessages`/`fetchContactMessageById`i `@/server/services/
 * contact-message`ten alır.
 *
 * Buradan yeniden ihraç etmek cazipti (tek içe aktarma noktası) ama YANLIŞTI:
 * `'use server'` dosyasından ihraç edilen HER işlev bir Server Action'a, yani
 * ağdan çağrılabilir bir POST ucuna dönüşür. Okuma fonksiyonlarını böyle
 * açmak, hiçbir faydası olmadan yeni bir saldırı yüzeyi üretirdi.
 */

/* ===========================================================================
 * DURUM EYLEMLERİ — ADR-022: bunlar SONUÇ, AuditLog'a yazılır
 * ======================================================================== */

/** `AuditLog` farkı için okunan alanlar — hepsi durum, içerik değil. */
function auditableStatus(dto: ContactMessageListItemDto) {
  return {
    isRead: dto.isRead,
    isSpam: dto.isSpam,
    repliedAt: dto.repliedAt,
    archivedAt: dto.archivedAt,
  };
}

/**
 * Ortak gövde — üç durum eyleminin tek farkı YAMA ve `AuditAction`.
 *
 * Bu yardımcı §7.1 sırasını GİZLEMİYOR: `auth()` ve `parseOrFail` çağıran
 * eylemlerde açıkça duruyor; burada yalnızca "oku → yaz → denetle" üçlüsü var
 * ve o üçlü zaten üçünde birebir aynı. T-031'in "fabrika yok" kararı sıranın
 * GÖRÜNÜR kalmasıyla ilgiliydi, her satırın üç kez yazılmasıyla değil.
 */
async function applyStatusChange(
  actorId: string,
  id: string,
  patch: { isRead?: boolean; isSpam?: boolean; archivedAt?: string | null },
  action: 'UPDATE' | 'ARCHIVE',
  context: string,
): Promise<ApiResponse<ContactMessageListItemDto>> {
  try {
    const before = await fetchContactMessageById(id);
    if (!before) return notFound('Mesaj bulunamadı.');

    const dto = await updateContactMessageStatus({ id, ...patch });

    await writeAuditLog(
      {
        actorId,
        action,
        entity: 'ContactMessage',
        entityId: id,
        /*
         * §8.20 — `diff`e YALNIZCA durum alanları girer.
         *
         * Mesaj gövdesi, gönderenin adı ve E-POSTASI denetim kaydına YAZILMAZ.
         * `redactAuditDiff` `email` anahtarını zaten maskelerdi, ama gövdeyi
         * maskelemezdi: ziyaretçinin yazdığı serbest metin `AuditLog`a
         * kopyalanır ve oradan yedeklere (§8.21) girerdi. Değişen şey durumdur;
         * denetim kaydının taşıması gereken de odur.
         */
        diff: buildDiff(auditableStatus(before), auditableStatus(dto)),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure(context, error);
  }
}

/**
 * Okundu / okunmadı işaretler.
 *
 * ⚠️ `repliedAt` ve `archivedAt`e DOKUNMAZ. Yama yalnızca `isRead` taşıyor ve
 * `updateContactMessageStatus` kısmi yazıyor (gönderilmeyen alan `data`ya hiç
 * girmiyor). Tam kaydı geri yazan bir uygulama, bir mesajı okundu işaretlerken
 * yanıtlanma ve arşivlenme bilgisini sessizce silerdi.
 */
export async function markContactMessageReadAction(
  raw: unknown,
): Promise<ApiResponse<ContactMessageListItemDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateContactMessageSchema.pick({ id: true, isRead: true }), raw);
  if (!parsed.ok) return parsed.failure;

  return applyStatusChange(
    actorId,
    parsed.data.id,
    // Gönderilmediyse varsayılan "okundu" — düğmenin ana kullanımı bu.
    { isRead: parsed.data.isRead ?? true },
    'UPDATE',
    'contact-message:read',
  );
}

/**
 * Spam işaretler / işareti kaldırır.
 *
 * `spamScore` ve `honeypotHit` DEĞİŞMEZ: onlar ÖLÇÜMDÜR (T-027, sunucunun
 * gönderim anında gördüğü sinyaller), `isSpam` ise KARARDIR. Ölçümü sonradan
 * düzeltmek, mesajın neden işaretlendiğinin izini silerdi.
 */
export async function markContactMessageSpamAction(
  raw: unknown,
): Promise<ApiResponse<ContactMessageListItemDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateContactMessageSchema.pick({ id: true, isSpam: true }), raw);
  if (!parsed.ok) return parsed.failure;

  return applyStatusChange(
    actorId,
    parsed.data.id,
    { isSpam: parsed.data.isSpam ?? true },
    'UPDATE',
    'contact-message:spam',
  );
}

/**
 * Arşivler — SİLMEZ (ADR-020/C11).
 *
 * `archivedAt` bir ZAMAN DAMGASIDIR, boole değil: ne zaman arşivlendiği
 * bilgisini bedavaya veriyor ve "arşivde mi" sorusu `archivedAt !== null` ile
 * cevaplanıyor. Ayrı bir `isArchived` boole'u ikinci bir doğruluk kaynağı olurdu.
 *
 * `AuditAction.ARCHIVE` — T-031'de `archiveProjectAction` için verilen gerekçe:
 * eylem kullanıcı için "sil" düğmesidir ve denetim kaydında öyle görünmelidir.
 */
export async function archiveContactMessageAction(
  raw: unknown,
): Promise<ApiResponse<ContactMessageListItemDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  return applyStatusChange(
    actorId,
    parsed.data.id,
    { archivedAt: new Date().toISOString() },
    'ARCHIVE',
    'contact-message:archive',
  );
}

/** Arşivden çıkarır. `AuditAction.RESTORE` — arşivlemenin tam tersi. */
export async function unarchiveContactMessageAction(
  raw: unknown,
): Promise<ApiResponse<ContactMessageListItemDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  return applyStatusChange(
    actorId,
    parsed.data.id,
    { archivedAt: null },
    'UPDATE',
    'contact-message:unarchive',
  );
}
