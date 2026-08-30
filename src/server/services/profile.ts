import type { UpdateProfileInput } from '@/lib/schemas';
import { db } from '@/server/db';
import type { PrismaClient } from '@/server/generated/prisma/client';

import { ATTACHMENT_SELECT, DEFAULT_LOCALE, toAttachmentRef, type AttachmentRow } from './_shared';
import type { ProfileDto } from './content-dto';

/**
 * `Profile` servisi — tekil kayıt (ADR-017), T-015 konvansiyonu.
 */

interface ProfileRow {
  id: string;
  locale: string;
  headline: string;
  subtitle: string | null;
  bio: string;
  location: string | null;
  availability: string | null;
  socials: unknown;
  avatar: AttachmentRow | null;
  cv: AttachmentRow | null;
}

/**
 * İstemci tipi PRISMA'DAN TÜRETİLİYOR, elle yazılmıyor.
 *
 * Elle yazılmış bir imza (`select: Record<string, unknown>`) Prisma'nın
 * `SelectSubset` jenerikleriyle yapısal olarak uyuşmuyor ve `db` atanamıyor —
 * T-013c'de `LockoutClient` ile aynı duvara çarpılmıştı. `Pick` ile türetmek
 * hem gerçek tip güvenliğini korur hem de testte sahte istemci enjekte etmeye
 * engel değildir (`as unknown as ProfileClient`).
 */
export type ProfileClient = Pick<PrismaClient, 'profile'>;

const PROFILE_SELECT = {
  id: true,
  locale: true,
  headline: true,
  subtitle: true,
  bio: true,
  location: true,
  availability: true,
  socials: true,
  avatar: { select: ATTACHMENT_SELECT },
  cv: { select: ATTACHMENT_SELECT },
} as const;

function toDto(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    locale: row.locale,
    headline: row.headline,
    subtitle: row.subtitle,
    bio: row.bio,
    location: row.location,
    availability: row.availability,
    /**
     * `socials` şemada `Json`. Şekli T-011'in `socialsSchema`'sı bağlar ama
     * veritabanı bunu zorlamaz; DTO'ya `unknown`'dan geçirmek yerine tip
     * daraltması yapılıyor. Doğrulama panel yazma yolunda (F3) uygulanacak.
     */
    socials: (row.socials as ProfileDto['socials']) ?? null,
    avatar: toAttachmentRef(row.avatar),
    cv: toAttachmentRef(row.cv),
  };
}

/**
 * Profili okur. Ham (önbelleksiz) sürüm — testler ve F3 mutasyonları bunu kullanır.
 *
 * BULUNAMAZSA FIRLATIR, sessiz `null` DÖNMEZ. `Profile` seed ile açılan tekil
 * bir kayıttır (ADR-017); yokluğu bir "boş durum" değil, kurulum hatasıdır.
 * `null` dönseydi public sayfa boş başlıkla render edilir ve sorun ancak
 * kullanıcı fark ettiğinde anlaşılırdı.
 */
export async function fetchProfile(
  locale: string = DEFAULT_LOCALE,
  client: ProfileClient = db,
): Promise<ProfileDto> {
  const row = await client.profile.findUnique({
    where: { locale },
    select: PROFILE_SELECT,
  });

  if (!row) {
    throw new Error(
      `Profil kaydı bulunamadı (locale: "${locale}"). Seed çalıştırıldı mı? (pnpm db:seed)`,
    );
  }

  return toDto(row);
}

/* ===========================================================================
 * YAZMA YOLU — T-031
 * ======================================================================== */

/**
 * Profili yazar — TEKİL KAYIT, `upsert` (ADR-017).
 *
 * NEDEN `create`/`update` AYRIMI YOK: `Profile` dil başına tek satırdır ve
 * seed ile açılır. Panelde "yeni profil oluştur" diye bir eylem yoktur; kullanıcı
 * yalnızca kaydeder. İki ayrı eylem sunmak, olmayan bir seçimi kullanıcıya
 * sorardı — ve "önce oluştur mu güncelle mi" kararını her form gönderiminde
 * istemciye taşırdı.
 *
 * `upsert`in ikinci faydası: seed çalıştırılmamış bir kurulumda kaydetmek
 * `RecordNotFound` ile patlamak yerine kaydı açar.
 *
 * KISMİ GÜNCELLEME: `update` tarafında yalnızca gönderilen alanlar yazılır
 * (bkz. `updateProject`); `create` tarafında zorunlu alanlar eksikse Prisma
 * hata verir — bu doğru, çünkü var olmayan bir kaydı kısmi veriyle açmak
 * yarım bir profil üretirdi.
 */
export async function upsertProfile(
  locale: string,
  input: UpdateProfileInput,
  client: ProfileClient = db,
): Promise<ProfileDto> {
  const patch = {
    ...(input.headline !== undefined ? { headline: input.headline } : {}),
    ...(input.subtitle !== undefined ? { subtitle: input.subtitle ?? null } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.location !== undefined ? { location: input.location ?? null } : {}),
    ...(input.availability !== undefined ? { availability: input.availability ?? null } : {}),
    ...(input.socials !== undefined ? { socials: input.socials } : {}),
    ...(input.avatarAttachmentId !== undefined
      ? { avatarAttachmentId: input.avatarAttachmentId ?? null }
      : {}),
    ...(input.cvAttachmentId !== undefined ? { cvAttachmentId: input.cvAttachmentId ?? null } : {}),
  };

  const row = await client.profile.upsert({
    where: { locale },
    update: patch,
    // Yeni kayıt: zorunlu alanlar `patch` içinde yoksa Prisma reddeder.
    create: { locale, headline: '', bio: '', ...patch },
    select: PROFILE_SELECT,
  });

  return toDto(row);
}

/** Mutasyon öncesi anlık görüntü — `AuditLog` farkı için. Yoksa `null`. */
export async function findProfileSnapshot(
  locale: string,
  client: ProfileClient = db,
): Promise<ProfileDto | null> {
  const row = await client.profile.findUnique({ where: { locale }, select: PROFILE_SELECT });
  return row ? toDto(row) : null;
}
