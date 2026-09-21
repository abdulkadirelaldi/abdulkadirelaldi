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
/**
 * İki `socials` nesnesi arasında DEĞİŞEN ANAHTAR ADLARI — değerler asla dönmez.
 *
 * `null`/`undefined` taraflar boş nesne sayılır: "hiç sosyal yoktu" ile "boş
 * nesne vardı" denetim kaydı açısından aynı şeydir.
 *
 * Karşılaştırma `JSON.stringify` ile: değerler dize ya da `undefined` (şema
 * `optionalUrlSchema`), yani derin karşılaştırmaya gerek yok ve `Object.is`
 * iki eşdeğer dizeyi ayırt etmez.
 *
 * ⚠️ İHRAÇ EDİLMİYOR ve bu zorunlu: bu dosya `'use server'` taşıyor, yani
 * ihraç edilen her işlev ağdan çağrılabilir bir POST ucuna dönüşür — üstelik
 * senkron bir ihraç derlemeyi de kırardı (Server Action'lar async olmak
 * zorunda). Davranışı `saveProfileAction` üzerinden sınanıyor.
 */
function changedSocialKeys(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const a = before ?? {};
  const b = after ?? {};

  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .sort();
}

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

    /** Değişen sosyal anahtar ADLARI — değerler denetim kaydına GİRMEZ. */
    const socialsChanged = changedSocialKeys(before?.socials, dto.socials);

    await writeAuditLog(
      {
        actorId,
        // Kayıt yoksa `upsert` onu AÇMIŞTIR — denetim kaydı hangisi olduğunu
        // doğru söylemeli, yoksa "profil ne zaman oluştu" izlenemez.
        action: before ? 'UPDATE' : 'CREATE',
        entity: 'Profile',
        entityId: dto.id,
        /*
         * BULGU-019 / ADR-034 — `socials` DEĞERLERİ DEĞİL, DEĞİŞEN ANAHTAR
         * ADLARI yazılıyor.
         *
         * Eskiden nesnenin tamamı diff'e giriyordu. Gerekçe şuydu: `socials.email`
         * ham e-posta taşır ama `redactAuditDiff` alan adı bazlı ve iç içe
         * çalıştığı için maskeler. Doğruydu — AMA ADR-034'ün dersi tam olarak
         * buna güvenmemek: redaksiyon bir emniyet ağı, alan seçiminin yerine
         * geçmez.
         *
         * `socials` şemada `.strict()` ile bağlı, ama VERİTABANI sütunu serbest
         * `Json` ve okuma tarafı onu doğrulamadan tipe daraltıyor
         * (`profile.ts` → `row.socials as ...`). Yani seed, migration ya da elle
         * bir yazma oraya BEKLENMEYEN bir anahtar koyabilir ve o anahtar
         * `REDACTED_KEYS`te olmadığı için diff'e sızardı — `experience`/`skill`/
         * `service` silmeleriyle aynı sınıf (BULGU-019), sadece bir seviye derinde.
         *
         * ÇÖZÜM DEĞERLERİ HİÇ YAZMAMAK. Denetim kaydının cevaplaması gereken soru
         * "profil ne zaman, kim tarafından değişti" ve "hangi bağlantılar
         * dokunuldu" — bağlantının KENDİSİ değil. Anahtar ADI hiçbir koşulda
         * hassas değil, gelecekte eklenecek bir anahtar bile olsa.
         *
         * Yedi anahtarı elle saymak da bir seçenekti; reddedildi: o liste
         * `socialsSchema` ile sapar ve sapma sessiz olur.
         */
        diff: {
          ...buildDiff(before ? { headline: before.headline, location: before.location } : null, {
            headline: dto.headline,
            location: dto.location,
          }),
          /*
           * `buildDiff`TEN GEÇİRİLMİYOR ve bu zorunlu: o yardımcı `Object.is`
           * ile karşılaştırıyor, yani İKİ BOŞ DİZİ bile "değişti" sayılırdı ve
           * `socialsChanged: []` hiç değişiklik olmadığında da denetim kaydına
           * girerdi. Liste zaten FARKIN KENDİSİ; ikinci kez farklanacak bir
           * önce/sonra değeri yok.
           */
          ...(socialsChanged.length > 0 ? { socialsChanged } : {}),
        },
      },
      db,
    );

    revalidateContent('profile', { locales: [locale] });

    return ok(dto);
  } catch (error) {
    return toFailure('profile:save', error);
  }
}
