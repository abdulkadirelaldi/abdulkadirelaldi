import process from 'node:process';

import {
  createExperienceSchema,
  createPostSchema,
  createProjectSchema,
  createSkillSchema,
  updateProfileSchema,
} from '@/lib/schemas';
import { closeDatabase, db } from '@/server/db';
import { calculateReadingMinutes } from '@/server/services/_shared/reading-time';

import { DENEYIMLER, PROFIL, PROJELER, YETENEKLER } from './icerik/abdulkadir';
import { YAZILAR } from './icerik/yazilar';

/**
 * İÇERİK YÜKLEME — sitenin gerçek içeriğini (`scripts/icerik/abdulkadir.ts`)
 * veritabanına yazar. Yerelde ve üretimde (`araclar` imajı) aynı komut:
 *
 *   node --import ./scripts/yedek-register.mjs scripts/icerik-yukle.ts [--esitle]
 *
 * İDEMPOTENT — doğal anahtarla UPSERT:
 *   profil            tekil kayıt; yalnızca başlık/alt başlık/biyografi/konum/
 *                     sosyal yazılır. Avatar, CV dosyası ve "durum" DOKUNULMAZ
 *                     (panelden yönetiliyorlar).
 *   yetenek           (ad, dil)
 *   deneyim/ödül      (tür, kurum, ünvan, dil) — tabloda doğal anahtar yok
 *   proje / yazı      (slug, dil); KAPAK DOKUNULMAZ — panelden yüklenen kapak
 *                     yeniden çalıştırmada silinmesin.
 *
 * `--esitle`: listede OLMAYAN yetenek ve deneyimleri SİLER, projeleri
 * ARŞİVLER (silmez — adres 410 döner, ADR-019; kapak/galeri ilişkisi korunur).
 * Seed'in demo içeriğini temizlemek için bir kez; panelden eklenmiş kayıtları
 * da götüreceği için üretimde DİKKATLE.
 *
 * Her kayıt panelin kullandığı AYNI Zod şemasından geçer (seed ilkesi) — betik
 * panelin kabul etmeyeceği bir şey yazamaz.
 *
 * ÖNBELLEK: public sayfalar `unstable_cache` ile önbellekli (ADR-011) ve bu
 * betik Next'in dışında çalışıyor, etiket düşüremez. Yeni içerik önbellek
 * süresi dolunca görünür; hemen görmek için uygulamayı yeniden başlat.
 */

const ESITLE = process.argv.includes('--esitle');
const DIL = 'tr';

async function profil(): Promise<string> {
  const mevcut = await db.profile.findUnique({
    where: { id: 'singleton' },
    select: { socials: true },
  });
  if (!mevcut) throw new Error('Profil yok — önce scripts/uretim-baslat.ts çalıştırılmalı.');

  // Sitenin kendi adresi (`website`) gibi belgede olmayan alanlar korunur;
  // belgede olanlar belgedeki değerle yazılır.
  const eskiSosyal = (mevcut.socials ?? {}) as Record<string, unknown>;
  const girdi = updateProfileSchema.parse({
    headline: PROFIL.headline,
    subtitle: PROFIL.subtitle,
    bio: PROFIL.bio,
    location: PROFIL.location,
    socials: { ...eskiSosyal, ...PROFIL.socials },
  });
  await db.profile.update({ where: { id: 'singleton' }, data: girdi });
  return 'güncellendi';
}

async function yetenekler(): Promise<string> {
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

async function deneyimler(): Promise<string> {
  const tutulan: string[] = [];
  for (const [sira, ham] of DENEYIMLER.entries()) {
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

async function projeler(): Promise<string> {
  const simdi = new Date();
  for (const [sira, ham] of PROJELER.entries()) {
    const girdi = createProjectSchema.parse({
      ...ham,
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

async function yazilar(): Promise<string> {
  const simdi = new Date();
  for (const ham of YAZILAR) {
    const girdi = createPostSchema.parse({ ...ham, locale: DIL, status: 'PUBLISHED' });
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
  const sonuclar = {
    profil: await profil(),
    yetenek: await yetenekler(),
    deneyim: await deneyimler(),
    proje: await projeler(),
    yazi: await yazilar(),
  };
  for (const [ad, sonuc] of Object.entries(sonuclar)) {
    process.stdout.write(`[icerik] ${ad}: ${sonuc}\n`);
  }
} catch (error) {
  process.stderr.write(
    `[icerik] BAŞARISIZ: ${error instanceof Error ? error.message : 'bilinmeyen hata'}\n`,
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
