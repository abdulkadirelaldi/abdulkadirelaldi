'use server';

import { updateProfileSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { findProfileSnapshot, upsertProfile } from '@/server/services/profile';
import {
  buildDiff,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import { DEFAULT_LOCALE } from '@/server/services/_shared/content-query';
import type { ProfileDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent } from './tags';

/**
 * `Profile` Server Action'ı — §7.1 sırası `project.ts`'te.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEK EYLEM — `create`/`update`/`archive` ÜÇLÜSÜ YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Profile` dil başına TEKİL kayıttır (ADR-017) ve seed ile açılır. Panelde
 * "yeni profil" veya "profili sil" diye bir eylem yoktur; kullanıcının
 * yapabileceği tek şey kaydetmektir. Diğer beş varlıkla simetri kurmak için üç
 * eylem uydurmak, olmayan bir seçimi arayüze taşırdı.
 *
 * Yazma `upsert` ile: seed çalıştırılmamış bir kurulumda kaydetmek hata vermek
 * yerine kaydı açar.
 *
 * ETİKET: slug yok, durum yok — yalnızca `localeTag('profile', locale)`.
 */
export async function saveProfileAction(raw: unknown): Promise<ApiResponse<ProfileDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateProfileSchema, raw);
  if (!parsed.ok) return parsed.failure;

  /*
   * DİL, GÜNCELLENEN ALAN DEĞİL ADRESTİR.
   *
   * `updateProfileSchema` `locale`ü de opsiyonel bir alan olarak taşıyor, ama
   * tekil bir kayıtta `locale` "hangi satır" sorusunun cevabıdır — onu bir
   * güncelleme alanı gibi işlemek, Türkçe profili kaydederken dilini "en"
   * yapmanın kaydı taşıması anlamına gelirdi. Bu yüzden `where` anahtarı olarak
   * kullanılıyor ve varsayılanı ADR-019'un public dilidir.
   */
  const locale = parsed.data.locale ?? DEFAULT_LOCALE;

  try {
    const before = await findProfileSnapshot(locale);
    const dto = await upsertProfile(locale, parsed.data);

    await writeAuditLog(
      {
        actorId,
        // Kayıt yoksa `upsert` onu AÇMIŞTIR — denetim kaydı hangisi olduğunu
        // doğru söylemeli, yoksa "profil ne zaman oluştu" izlenemez.
        action: before ? 'UPDATE' : 'CREATE',
        entity: 'Profile',
        entityId: dto.id,
        /*
         * §8.20 / ADR-020: `socials.email` HAM E-POSTA TAŞIR.
         * `writeAuditLog` redaksiyonu ALAN ADI bazlıdır ve İÇ İÇE çalışır, yani
         * `socials.email` maskeleniyor — `redactAuditDiff` bunu kendisi yapar,
         * burada elle temizlemeye gerek yok. Testte AYRICA doğrulanıyor:
         * redaksiyonun "otomatik olduğu" varsayımı sınanmadan bırakılamaz.
         */
        diff: buildDiff(
          before
            ? { headline: before.headline, location: before.location, socials: before.socials }
            : null,
          { headline: dto.headline, location: dto.location, socials: dto.socials },
        ),
      },
      db,
    );

    revalidateContent('profile', { locales: [locale] });

    return ok(dto);
  } catch (error) {
    return toFailure('profile:save', error);
  }
}
