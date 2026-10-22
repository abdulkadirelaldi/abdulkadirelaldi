import process from 'node:process';

import {
  createExperienceSchema,
  createPostSchema,
  createProjectSchema,
  createServiceSchema,
  createSkillSchema,
  updateProfileSchema,
} from '@/lib/schemas';
import { closeDatabase, db } from '@/server/db';
import { calculateReadingMinutes } from '@/server/services/_shared/reading-time';

import { DILLER, type Dil } from '@/i18n/diller';

import * as TR from './icerik/abdulkadir';
import * as DE from './icerik/abdulkadir.de';
import * as EN from './icerik/abdulkadir.en';
import { YAZILAR as YAZILAR_TR } from './icerik/yazilar';
import { YAZILAR as YAZILAR_DE } from './icerik/yazilar.de';
import { YAZILAR as YAZILAR_EN } from './icerik/yazilar.en';

/**
 * İÇERİK YÜKLEME — sitenin gerçek içeriğini (`scripts/icerik/abdulkadir.ts`)
 * veritabanına yazar. Yerelde ve üretimde (`araclar` imajı) aynı komut:
 *
 *   node --import ./scripts/yedek-register.mjs scripts/icerik-yukle.ts [--esitle]
 *
 * İDEMPOTENT — doğal anahtarla UPSERT:
 *   profil            dil başına tek kayıt; başlık/alt başlık/biyografi/konum/
 *                     durum/sosyal yazılır. Avatar ve CV dosyası DOKUNULMAZ
 *                     (panelden yükleniyorlar).
 *   yetenek           (ad, dil)
 *   deneyim/ödül      (tür, kurum, ünvan, dil) — tabloda doğal anahtar yok
 *   hizmet            (başlık, dil); `ctaUrl` DOKUNULMAZ
 *   proje / yazı      (slug, dil); KAPAK DOKUNULMAZ — panelden yüklenen kapak
 *                     yeniden çalıştırmada silinmesin.
 *
 * `--esitle`: listede OLMAYAN yetenek ve deneyimleri SİLER, projeleri
 * ARŞİVLER (silmez — adres 410 döner, ADR-019; kapak/galeri ilişkisi korunur).
 * Seed'in demo içeriğini temizlemek için bir kez; panelden eklenmiş kayıtları
 * da götüreceği için üretimde DİKKATLE.
 *
 * ÇOK DİL (ADR-046): üç dil sırayla yazılır (tr → en → de). Türkçe kayıtlar
 * `translationKey` = kendi slug'ı; çeviriler Türkçe slug'ı anahtar taşır —
 * dil seçici ve hreflang bu eşlemeyle çalışır. Önekli dillerin profili yoksa
 * AÇILIR (sosyal bağlantılar Türkçe profilden), varsa Türkçedeki gibi güncellenir.
 *
 * Her kayıt panelin kullandığı AYNI Zod şemasından geçer (seed ilkesi) — betik
 * panelin kabul etmeyeceği bir şey yazamaz.
 *
 * ÖNBELLEK: public sayfalar `unstable_cache` ile önbellekli (ADR-011) ve bu
 * betik Next'in dışında çalışıyor, etiket düşüremez. Yeni içerik önbellek
 * süresi dolunca görünür; hemen görmek için uygulamayı yeniden başlat.
 */

const ESITLE = process.argv.includes('--esitle');

const ICERIK = {
  tr: { ...TR, YAZILAR: YAZILAR_TR },
  en: { ...EN, YAZILAR: YAZILAR_EN },
  de: { ...DE, YAZILAR: YAZILAR_DE },
} satisfies Record<Dil, unknown>;

async function profil(DIL: Dil): Promise<string> {
  const { PROFIL } = ICERIK[DIL];
  /*
   * Profil YOKSA AÇILIR — Türkçe dahil (kimliği `singleton`, ADR-017).
   * Önceden Türkçe profil yalnızca `uretim-baslat` ile açılıyordu ve o betik
   * yönetici şifresi istiyor; site, şifre girilene kadar profil yokluğundan
   * 500 veriyordu. İçerik ve yönetici artık birbirini beklemiyor. Önekli
   * diller Türkçenin sosyal bağlantılarını devralır (Türkçe önce yazılır).
   */
  const turkce = await db.profile.findUnique({
    where: { locale: 'tr' },
    select: { socials: true },
  });
  const mevcut =
    DIL === 'tr'
      ? turkce
      : await db.profile.findUnique({ where: { locale: DIL }, select: { socials: true } });

  // Sitenin kendi adresi (`website`) gibi belgede olmayan alanlar korunur;
  // belgede olanlar belgedeki değerle yazılır.
  const eskiSosyal = ((mevcut ?? turkce)?.socials ?? {}) as Record<string, unknown>;
  const girdi = updateProfileSchema.parse({
    headline: PROFIL.headline,
    subtitle: PROFIL.subtitle,
    bio: PROFIL.bio,
    location: PROFIL.location,
    availability: PROFIL.availability,
    socials: { ...eskiSosyal, ...PROFIL.socials },
  });
  if (mevcut) {
    await db.profile.update({ where: { locale: DIL }, data: girdi });
    return 'güncellendi';
  }
  await db.profile.create({
    data: {
      ...(DIL === 'tr' ? { id: 'singleton' } : {}),
      ...girdi,
      locale: DIL,
      headline: PROFIL.headline,
      bio: PROFIL.bio,
    },
  });
  return 'oluşturuldu';
}

async function yetenekler(DIL: Dil): Promise<string> {
  const { YETENEKLER } = ICERIK[DIL];
  for (const ham of YETENEKLER) {
    const girdi = createSkillSchema.parse({ ...ham, locale: DIL });
    await db.skill.upsert({
      where: { name_locale: { name: girdi.name, locale: girdi.locale } },
      update: girdi,
      create: girdi,
    });
  }
  let silinen = 0;
  if (ESITLE) {
    const sonuc = await db.skill.deleteMany({
      where: { locale: DIL, name: { notIn: YETENEKLER.map((y) => y.name) } },
    });
    silinen = sonuc.count;
  }
  return `${YETENEKLER.length} yazıldı${ESITLE ? `, ${silinen} silindi` : ''}`;
}

/**
 * CV SIRASI — yeniden eskiye: süren kayıtlar önce (başlangıca göre), sonra
 * bitenler bitiş tarihine göre. Belgedeki el sırası tarihe göre değildi ve
 * sayfada "Kas 2023 → Tem 2026 → Eyl 2024" diye zıplıyordu (inceleme,
 * 2026-10-22). Panelde elle sıralama yine mümkün; betik her çalıştığında bu
 * sırayı yeniden yazar. ISO gün dizeleri sözlük sırasıyla karşılaştırılabilir.
 */
function yenidenEskiye<T extends { startDate: string; endDate?: string; current?: boolean }>(
  liste: readonly T[],
): T[] {
  const anahtar = (k: T) =>
    k.current ? `9999|${k.startDate}` : `${k.endDate ?? k.startDate}|${k.startDate}`;
  return [...liste].sort((a, b) => anahtar(b).localeCompare(anahtar(a)));
}

async function deneyimler(DIL: Dil): Promise<string> {
  const { DENEYIMLER } = ICERIK[DIL];
  const tutulan: string[] = [];
  for (const [sira, ham] of yenidenEskiye(DENEYIMLER).entries()) {
    const girdi = createExperienceSchema.parse({ ...ham, locale: DIL, order: sira + 1 });
    const veri = {
      ...girdi,
      startDate: new Date(`${girdi.startDate}T00:00:00Z`),
      endDate: girdi.endDate ? new Date(`${girdi.endDate}T00:00:00Z`) : null,
      description: girdi.description ?? null,
    };
    const mevcut = await db.experience.findFirst({
      where: { locale: DIL, type: girdi.type, organization: girdi.organization, role: girdi.role },
      select: { id: true },
    });
    const kayit = mevcut
      ? await db.experience.update({ where: { id: mevcut.id }, data: veri, select: { id: true } })
      : await db.experience.create({ data: veri, select: { id: true } });
    tutulan.push(kayit.id);
  }
  let silinen = 0;
  if (ESITLE) {
    const sonuc = await db.experience.deleteMany({
      where: { locale: DIL, id: { notIn: tutulan } },
    });
    silinen = sonuc.count;
  }
  return `${DENEYIMLER.length} yazıldı${ESITLE ? `, ${silinen} silindi` : ''}`;
}

async function projeler(DIL: Dil): Promise<string> {
  const { PROJELER } = ICERIK[DIL];
  const simdi = new Date();
  for (const [sira, ham] of PROJELER.entries()) {
    const girdi = createProjectSchema.parse({
      ...ham,
      translationKey: ham.translationKey ?? ham.slug,
      locale: DIL,
      order: sira + 1,
      status: 'PUBLISHED',
    });
    // Kapak bilerek YOK (yukarıdaki not); yayın tarihi yalnızca İLK yazımda.
    const { coverAttachmentId: _kapak, publishedAt: _tarih, ...veri } = girdi;
    await db.project.upsert({
      where: { slug_locale: { slug: girdi.slug, locale: girdi.locale } },
      update: {
        ...veri,
        liveUrl: veri.liveUrl ?? null,
        repoUrl: veri.repoUrl ?? null,
        clientName: veri.clientName ?? null,
        period: veri.period ?? null,
      },
      create: { ...veri, publishedAt: simdi },
    });
  }
  let arsivlenen = 0;
  if (ESITLE) {
    const sonuc = await db.project.updateMany({
      where: {
        locale: DIL,
        slug: { notIn: PROJELER.map((p) => p.slug) },
        status: { not: 'ARCHIVED' },
      },
      data: { status: 'ARCHIVED', featured: false },
    });
    arsivlenen = sonuc.count;
  }
  return `${PROJELER.length} yazıldı${ESITLE ? `, ${arsivlenen} arşivlendi` : ''}`;
}

async function hizmetler(DIL: Dil): Promise<string> {
  const { HIZMETLER } = ICERIK[DIL];
  // Hizmette doğal anahtar yok (slug yok) — (başlık, dil) ile eşleniyor.
  // `ctaUrl` YAZILMIYOR: panelden özel bağlantı verilmişse yeniden çalıştırma ezmesin.
  const tutulan: string[] = [];
  for (const [sira, ham] of HIZMETLER.entries()) {
    const girdi = createServiceSchema.parse({ ...ham, locale: DIL, order: sira + 1 });
    const { ctaUrl: _cta, iconKey: _ikon, ...veri } = girdi;
    const mevcut = await db.service.findFirst({
      where: { locale: DIL, title: girdi.title },
      select: { id: true },
    });
    const kayit = mevcut
      ? await db.service.update({ where: { id: mevcut.id }, data: veri, select: { id: true } })
      : await db.service.create({ data: veri, select: { id: true } });
    tutulan.push(kayit.id);
  }
  let silinen = 0;
  if (ESITLE) {
    const sonuc = await db.service.deleteMany({ where: { locale: DIL, id: { notIn: tutulan } } });
    silinen = sonuc.count;
  }
  return `${HIZMETLER.length} yazıldı${ESITLE ? `, ${silinen} silindi` : ''}`;
}

async function yazilar(DIL: Dil): Promise<string> {
  const { YAZILAR } = ICERIK[DIL];
  const simdi = new Date();
  for (const ham of YAZILAR) {
    const girdi = createPostSchema.parse({
      ...ham,
      translationKey: ham.translationKey ?? ham.slug,
      locale: DIL,
      status: 'PUBLISHED',
    });
    // Okuma süresi panelle AYNI kaynaktan: türetilmiş alan yalnızca sunucuda (T-011).
    const { coverAttachmentId: _kapak, publishedAt: _tarih, ...veri } = girdi;
    const okuma = calculateReadingMinutes(veri.content);
    await db.post.upsert({
      where: { slug_locale: { slug: girdi.slug, locale: girdi.locale } },
      update: { ...veri, readingMinutes: okuma },
      create: { ...veri, readingMinutes: okuma, publishedAt: simdi },
    });
  }
  let arsivlenen = 0;
  if (ESITLE) {
    const sonuc = await db.post.updateMany({
      where: {
        locale: DIL,
        slug: { notIn: YAZILAR.map((y) => y.slug) },
        status: { not: 'ARCHIVED' },
      },
      data: { status: 'ARCHIVED' },
    });
    arsivlenen = sonuc.count;
  }
  return `${YAZILAR.length} yazıldı${ESITLE ? `, ${arsivlenen} arşivlendi` : ''}`;
}

try {
  for (const DIL of DILLER) {
    const sonuclar = {
      profil: await profil(DIL),
      yetenek: await yetenekler(DIL),
      deneyim: await deneyimler(DIL),
      proje: await projeler(DIL),
      yazi: await yazilar(DIL),
      hizmet: await hizmetler(DIL),
    };
    for (const [ad, sonuc] of Object.entries(sonuclar)) {
      process.stdout.write(`[icerik] ${DIL} · ${ad}: ${sonuc}\n`);
    }
  }
} catch (error) {
  process.stderr.write(
    `[icerik] BAŞARISIZ: ${error instanceof Error ? error.message : 'bilinmeyen hata'}\n`,
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
