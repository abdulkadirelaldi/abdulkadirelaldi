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
