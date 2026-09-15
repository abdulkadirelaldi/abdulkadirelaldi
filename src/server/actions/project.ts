'use server';

import { createProjectSchema, entityIdSchema, updateProjectSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import {
  archiveProject,
  createProject,
  findProjectSnapshot,
  updateProject,
} from '@/server/services/project';
import {
  buildDiff,
  notFound,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';
import type { ContentWriteDto } from '@/server/services/content-dto';

import { currentActorId, toFailure, unauthorized } from './_shared';
import { revalidateContent, tagTargetsFor } from './tags';

/**
 * `Project` Server Action'ları — §7.1, §8.6, §8.8, §8.19, ADR-029.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA REFERANS UYGULAMADIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Altı varlığın içinde ÜÇ zorluğun hepsini birden taşıyan tek varlık `Project`:
 * slug'ı var, dili var ve yayın durumu var. Diğer beş dosya bu sırayı kopyalar
 * ve yalnızca eksik boyutları düşürür. F3'ün CRUD ekranları, F4 ve F5 de bunu
 * çoğaltacak.
 *
 * §7.1 SIRASI — her eylemin gövdesinde AÇIKÇA görünür:
 *   1. auth()          — §8.6, middleware'e güvenilmez
 *   2. Zod parse       — §8.8, action parametreleri dahil
 *   3. servis          — §7.4, ham Prisma çağrısı YOK
 *   4. AuditLog        — §8.19, `writeAuditLog` üzerinden (redaksiyon otomatik)
 *   5. revalidateTag   — ADR-029, HER SEVİYE AYRI
 *
 * SIRA ÖNEMLİ: `revalidateTag` mutasyondan SONRA çağrılır. Önce çağrılsaydı
 * önbellek eski veriyle yeniden dolar ve geçersizleştirme hiçbir işe yaramazdı.
 */

/* ===========================================================================
 * EKLEME
 * ======================================================================== */

export async function createProjectAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createProjectSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createProject(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Project',
        entityId: dto.id,
        // `content` (MDX) diff'e GİRMEZ: denetim kaydını şişirir ve okunmaz
        // hâle getirir. Neyin oluşturulduğunu kimlik alanları söyler.
        diff: buildDiff(null, {
          slug: dto.slug,
          locale: dto.locale,
          title: parsed.data.title,
          status: dto.status,
        }),
      },
      db,
    );

    /*
     * `localeTag` DÜŞÜYOR; `slugTag` de düşüyor ama BUGÜN SONUCU DEĞİŞTİRMİYOR.
     *
     * Buradaki eski yorum, olumsuz önbellek (404) yüzünden slug etiketinin
     * ŞART olduğunu söylüyordu. Yanlıştı: o 404 girdisi de `localeTag` taşıyor
     * (T-039 mutasyonuyla ölçüldü). Tam gerekçe `tags.ts`'te.
     */
    revalidateContent('project', tagTargetsFor(null, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('project:create', error);
  }
}

/* ===========================================================================
 * GÜNCELLEME
 * ======================================================================== */

export async function updateProjectAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateProjectSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    /*
     * ÖNCEKİ DURUM MUTASYONDAN ÖNCE OKUNUR — iki sebeple, ikisi de zorunlu:
     *   1. `AuditLog` farkı "ne değişti"yi ancak eski değerle söyleyebilir.
     *   2. ADR-029: slug veya dil değiştiyse ESKİ etiketler de düşürülmeli.
     *      Sonradan okunsaydı eski değerler çoktan kaybolmuş olurdu.
     */
    const before = await findProjectSnapshot(parsed.data.id);
    if (!before) return notFound('Proje bulunamadı.');

    const dto = await updateProject(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Project',
        entityId: dto.id,
        diff: buildDiff(
          { slug: before.slug, locale: before.locale, title: before.title, status: before.status },
          { slug: dto.slug, locale: dto.locale, title: parsed.data.title, status: dto.status },
        ),
      },
      db,
    );

    /*
     * DURUM DEĞİŞİKLİĞİ DE BURADAN GEÇER (DRAFT→PUBLISHED, →ARCHIVED).
     * `tagTargetsFor` her hâlükârda `localeTag` düşürüyor — ADR-029'un
     * "durum değişikliğinde localeTag MUTLAKA" maddesi bu yüzden ayrı bir dal
     * gerektirmiyor. Bu madde AYAKTA: liste, `getSiteStats` ve sitemap girdileri
     * yalnızca `localeTag` taşıyor, `slugTag` taşımıyor — yani onlara ulaşan tek
     * etiket `localeTag`. (Çürütülen şey tersiydi: slug'lı girdilere `localeTag`
     * ULAŞMIYOR sanılmasıydı.)
     */
    revalidateContent('project', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('project:update', error);
  }
}

/* ===========================================================================
 * ARŞİVLEME — SİLME YOK (ADR-017/019)
 * ======================================================================== */

/**
 * Projeyi arşivler. `DELETE` DEĞİL, `ARCHIVE`.
 *
 * `ARCHIVED` slug'ı korur ve public taraf 410 döner (ADR-019): adres bir zamanlar
 * vardı ve artık yok — "hiç olmadı" değil. Satırı silmek slug'ı serbest
 * bırakırdı ve ileride başka bir içerik aynı adresi alabilirdi.
 *
 * `AuditAction.ARCHIVE` kullanılıyor, `UPDATE` değil: eylem kullanıcı için
 * "sil" düğmesidir ve denetim kaydında öyle görünmelidir.
 */
export async function archiveProjectAction(raw: unknown): Promise<ApiResponse<ContentWriteDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(entityIdSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const before = await findProjectSnapshot(parsed.data.id);
    if (!before) return notFound('Proje bulunamadı.');

    const dto = await archiveProject(parsed.data.id);

    await writeAuditLog(
      {
        actorId,
        action: 'ARCHIVE',
        entity: 'Project',
        entityId: dto.id,
        diff: buildDiff({ status: before.status }, { status: dto.status }),
      },
      db,
    );

    // Arşivleme BİR DURUM DEĞİŞİKLİĞİDİR: hem liste, hem istatistik, hem de
    // kaydın kendi sayfası (200 → 410) değişti. Üç seviyenin ikisi `localeTag`,
    // üçüncüsü `slugTag` altında.
    revalidateContent('project', tagTargetsFor(before, dto));

    return ok(dto);
  } catch (error) {
    return toFailure('project:archive', error);
  }
}
