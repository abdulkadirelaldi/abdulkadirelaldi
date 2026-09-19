import { auth } from '@/server/auth';
import { fail, internalError, unauthorized, type ApiFailure } from '@/server/services/_shared';

/**
 * Server Action ortak parçaları — §7.1, §8.6.
 *
 * ADR-029'un etiket hesabı BURADA DEĞİL, `./tags.ts` içinde: bu dosya `auth()`
 * yüzünden `next-auth` içe aktarıyor ve o modül Vitest'in `node` ortamında
 * yüklenemiyor. Ayrımın gerekçesi `tags.ts`'in başında.
 *
 * BURAYA YALNIZCA GERÇEKTEN ORTAK OLAN ŞEY GİRER. §7.1'in sırası
 * (`auth()` → Zod → servis → `AuditLog` → `revalidateTag`) her action'ın
 * GÖVDESİNDE AÇIKÇA yazılıdır ve bir fabrikaya gömülmemiştir — F3'ün dört CRUD
 * ekranı, F4'ün muhasebesi ve F5'in tamamı bu sırayı KOPYALAYACAK. Sıra
 * gizlenirse kopyalanamaz; kopyalanamayan bir kalıp da uygulanmaz.
 */

/* ===========================================================================
 * 1. YETKİ — §8.6
 * ======================================================================== */

/**
 * Oturum sahibinin kimliği; oturum yoksa `null`.
 *
 * §8.6: HER action bunu KENDİ İÇİNDE çağırır. Middleware'e güvenilmez — matcher
 * yanlış yazılmış olabilir, ara katman atlanabilir, ve Server Action'lar
 * middleware'in görmediği bir POST yüzeyi açar. Yetki kontrolü mutasyonun
 * kendisinde durmalı.
 */
export async function currentActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export { unauthorized };

/* ===========================================================================
 * 2. HATA EŞLEME
 * ======================================================================== */

/** Prisma'nın bilinen hata kodları — `instanceof` yerine ördek tipi. */
function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/**
 * Servis hatasını §7.2 zarfına çevirir.
 *
 * İKİ PRISMA HATASI KULLANICI HATASIDIR, sunucu hatası değil:
 *
 *   P2002 — benzersizlik ihlali. İçerikte bu neredeyse her zaman `@@unique([slug,
 *           locale])`dir: kullanıcı var olan bir slug'ı yeniden kullandı.
 *           `INTERNAL_ERROR` dönmek ona "bir şeyler ters gitti" der ve
 *           DÜZELTEBİLECEĞİ bir şeyi gizlerdi.
 *   P2025 — kayıt yok. Başka bir sekmede silinmiş bir kaydı düzenlemek.
 *
 * Diğer her şey `internalError`dan geçer: ayrıntı loga, kullanıcıya sabit mesaj
 * (§8.20 — yığın izi ve veritabanı metni yanıta GİRMEZ).
 *
 * `conflict` PARAMETRESİ (T-038): P2002'nin varsayılan metni slug'a özeldir,
 * çünkü içerik varlıklarında benzersizlik ihlali daima `@@unique([slug, locale])`
 * demekti. Mesaj→iş dönüşümünde ise `Job.contactMessageId @unique` ihlal olur ve
 * kullanıcıya "slug zaten kullanılıyor" demek ANLAMSIZDIR — ortada slug yok.
 * Varsayılanı bozmadan, çağıranın kendi metnini vermesine izin veriliyor.
 */
export function toFailure(
  context: string,
  error: unknown,
  conflict?: { message: string; fields?: Record<string, string> },
): ApiFailure {
  switch (prismaErrorCode(error)) {
    case 'P2002':
      return conflict
        ? fail('CONFLICT', conflict.message, conflict.fields)
        : fail(
            'CONFLICT',
            'Bu adres (slug) aynı dilde zaten kullanılıyor. Farklı bir slug girin.',
            { slug: 'Bu slug zaten kullanılıyor.' },
          );
    case 'P2025':
      return fail('NOT_FOUND', 'Kayıt bulunamadı. Başka bir yerden silinmiş olabilir.');
    default:
      return internalError(context, error);
  }
}
