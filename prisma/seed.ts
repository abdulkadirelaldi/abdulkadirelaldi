import process from 'node:process';

import {
  createClientSchema,
  createExerciseSchema,
  createExperienceSchema,
  createGeneratedTransactionSchema,
  createGoalSchema,
  createHabitLogSchema,
  createHabitSchema,
  createHealthLogSchema,
  createJobSchema,
  createJournalEntrySchema,
  createPersonalRecordSchema,
  createPostSchema,
  createProfileSchema,
  createProjectSchema,
  createRecurringTransactionSchema,
  createServiceSchema,
  createSkillSchema,
  createTransactionCategorySchema,
  createTransactionSchema,
  createWorkoutSchema,
  createWorkoutSetSchema,
} from '@/lib/schemas';
import { hashPassword } from '@/server/auth/password';
import { closeDatabase, db } from '@/server/db';
import { calculateReadingMinutes } from '@/server/services/_shared';

/**
 * Seed — PROGRAM.md §6, ADR-013/014/017/018/019.
 *
 * BU DOSYANIN ASIL DEĞERİ DOĞRULAMADIR: her girdi ilgili `createXSchema`'dan
 * geçirilir. Prisma'ya ham nesne verilmez. Böylece şema, enum'lar ve Zod
 * sözleşmesi ilk kez gerçek veriyle sınanır — şemalar atlanırsa seed'in
 * doğrulama değeri tamamen kaybolur.
 *
 * İDEMPOTENT: her kayıt ya `upsert` ile ya da sabit `id` üzerinden yazılır.
 * İki kez çalıştırıldığında sayılar değişmez.
 *
 * §8.20: Çıktı hiçbir şifre, hash veya secret yazdırmaz.
 */

/* ===========================================================================
 * YARDIMCILAR
 * ======================================================================== */

/**
 * Seed özetini stdout'a yazar.
 *
 * `console.log` KULLANILMAZ: ESLint `no-console` kuralı yalnızca `warn`/`error`e
 * izin veriyor (§10.6 "sıfır uyarı") ve kural doğru — uygulama kodunda kalıntı
 * log istemiyoruz. Ama seed bir CLI aracıdır ve çıktısı ürünün parçasıdır;
 * `process.stdout.write` CLI'ların standart yoludur. Kuralı gevşetmek yerine
 * doğru API kullanılıyor.
 */
function print(line = ''): void {
  process.stdout.write(`${line}\n`);
}

/**
 * `YYYY-MM-DD` → `Date` (UTC gece yarısı).
 *
 * `new Date('2026-08-05')` zaten UTC yorumlar, ama açıkça `T00:00:00.000Z`
 * yazmak niyeti görünür kılıyor: bu alanlar `@db.Date` (ADR-016) ve SAAT
 * BİLEŞENİ TAŞIMAMALI. Yerel saatli bir kurucu kullanılsaydı UTC+3'te tarih
 * bir gün geriye kayardı.
 */
function toDbDate(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

/**
 * `baseAmount = amount × fxRate` — ADR-014.
 *
 * Kayan noktalı çarpım KULLANILMAZ: `1250.00 * 34.12345678` IEEE-754'te kuruş
 * sapması üretir ve bu sapma aylık toplamlarda birikir. Hesap tamsayı (BigInt)
 * üzerinden yapılır: tutar kuruşa, kur 8 ondalıklı tamsayıya çevrilir.
 *
 * NOT: Bu yardımcı seed'e özeldir. Üretimdeki karşılığı T-015'te servis
 * katmanında yazılacak ve §9 gereği birim testi olacak.
 */
function computeBaseAmount(amount: string, fxRate: string): string {
  const toScaled = (value: string, scale: number): bigint => {
    const [whole = '0', fraction = ''] = value.split('.');
    return BigInt(whole + fraction.padEnd(scale, '0').slice(0, scale));
  };

  const amountCents = toScaled(amount, 2); // 10^2
  const rateScaled = toScaled(fxRate, 8); // 10^8

  // (cents × rate) / 10^8, yarımı yukarı yuvarla
  const numerator = amountCents * rateScaled;
  const divisor = 10n ** 8n;
  const result = (numerator + divisor / 2n) / divisor;

  return `${result / 100n}.${(result % 100n).toString().padStart(2, '0')}`;
}

/* ===========================================================================
 * BAĞLANTI
 * ======================================================================== */

/**
 * Bağlantı `@/server/db`'den gelir — seed KENDİ havuzunu kurmaz.
 *
 * Önceki sürüm ayarsız bir `new Pool({ connectionString })` açıyordu; `max`,
 * `idleTimeoutMillis` ve `connectionTimeoutMillis` (ADR-005) uygulanmıyordu.
 * Ortak havuzu kullanmak hem ayarları tek yerde tutar hem de seed'i F7'nin cron
 * betikleri için örnek hâline getirir: `closeDatabase()` ile kapat, `exit()` kullanma.
 *
 * `.env` ortak modül OKUNMADAN önce yüklenmeli — `db` tembel olduğu için ilk
 * gerçek erişime kadar `DATABASE_URL`'e bakılmaz, ama sırayı garantiye alıyoruz.
 */
if (!process.env.DATABASE_URL) {
  process.loadEnvFile?.('.env');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.');
}

/* ===========================================================================
 * 1. YÖNETİCİ KULLANICI — §8.2, ADR-013
 * ======================================================================== */

async function seedAdmin(): Promise<string> {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error('ADMIN_EMAIL tanımlı değil (§12). .env dosyasına ekleyin.');
  }

  /**
   * Şifre KODA GÖMÜLMEZ. İki kaynak desteklenir:
   *   1. `ADMIN_PASSWORD_HASH` (§12) — zaten argon2id hash'i, doğrudan kullanılır.
   *      Tercih edilen yol: düz şifre hiçbir yerde bulunmaz.
   *   2. `ADMIN_PASSWORD` — yalnızca ilk kurulum kolaylığı için; `hashPassword`
   *      (T-013a) ile hash'lenir ve düz hâli asla yazdırılmaz/saklanmaz.
   */
  const providedHash = process.env.ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!providedHash && !plainPassword) {
    throw new Error(
      'Yönetici şifresi yok. ADMIN_PASSWORD_HASH (önerilen) veya ADMIN_PASSWORD tanımlayın.',
    );
  }

  const passwordHash = providedHash ?? (await hashPassword(plainPassword ?? ''));

  const user = await db.user.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { name: 'Abdulkadir Elaldı' },
    create: {
      email: email.trim().toLowerCase(),
      name: 'Abdulkadir Elaldı',
      passwordHash,
      /**
       * `totpConfirmedAt` BOŞ bırakılır (bilinçli, T-013b'de onaylandı):
       * ilk giriş 2FA istemez, kurulum panelden yapılır (T-036). Aksi hâlde
       * seed'in ürettiği bir secret'ı kullanıcıya güvenli biçimde ulaştırmak
       * gerekirdi — §8.20 ile çelişirdi.
       */
      totpSecret: null,
      totpEnabled: false,
      totpConfirmedAt: null,
      totpBackupCodes: [],
    },
  });

  return user.id;
}

/* ===========================================================================
 * 2. SİTE İÇERİĞİ
 * ======================================================================== */

async function seedProfile(): Promise<void> {
  const input = createProfileSchema.parse({
    locale: 'tr',
    headline: 'Full Stack Developer',
    subtitle: 'Web uygulamaları ve dijital ürünler',
    bio: 'Uçtan uca web uygulamaları geliştiriyorum. Next.js, TypeScript ve PostgreSQL ile ölçeklenebilir ürünler kuruyor; tasarımdan dağıtıma kadar süreci tek başıma yürütüyorum.',
    location: 'İstanbul, Türkiye',
    availability: 'Yeni projelere açığım',
    socials: {
      github: 'https://github.com/abdulkadirelaldi',
      linkedin: 'https://linkedin.com/in/abdulkadirelaldi',
      website: 'https://abdulkadirelaldi.com',
    },
  });

  // ADR-017 — tekil kayıt, sabit id.
  await db.profile.upsert({
    where: { id: 'singleton' },
    update: input,
    create: { id: 'singleton', ...input },
  });
}

async function seedSkills(): Promise<number> {
  const skills = [
    { name: 'TypeScript', category: 'FRONTEND', level: 92, order: 1 },
    { name: 'React', category: 'FRONTEND', level: 90, order: 2 },
    { name: 'Next.js', category: 'FRONTEND', level: 88, order: 3 },
    { name: 'Node.js', category: 'BACKEND', level: 85, order: 4 },
    { name: 'PostgreSQL', category: 'DATABASE', level: 80, order: 5 },
    { name: 'Prisma', category: 'DATABASE', level: 82, order: 6 },
    { name: 'Docker', category: 'DEVOPS', level: 72, order: 7 },
    { name: 'Tailwind CSS', category: 'DESIGN', level: 86, order: 8 },
  ];

  for (const raw of skills) {
    const input = createSkillSchema.parse({ ...raw, locale: 'tr' });
    await db.skill.upsert({
      where: { name_locale: { name: input.name, locale: input.locale } },
      update: input,
      create: input,
    });
  }

  return skills.length;
}

async function seedServices(): Promise<number> {
  const services = [
    {
      id: 'seed_service_web',
      title: 'Web Uygulaması Geliştirme',
      description:
        'İhtiyaca özel, hızlı ve bakımı kolay web uygulamaları. Next.js ve TypeScript ile uçtan uca geliştirme.',
      ctaUrl: 'https://kiyimedya.com/iletisim',
      order: 1,
    },
    {
      id: 'seed_service_kurumsal',
      title: 'Kurumsal Web Sitesi',
      description:
        'SEO uyumlu, hızlı ve yönetilebilir kurumsal siteler. İçerik yönetimi panelle birlikte teslim edilir.',
      ctaUrl: 'https://kiyimedya.com/iletisim',
      order: 2,
    },
    {
      id: 'seed_service_danismanlik',
      title: 'Teknik Danışmanlık',
      description:
        'Mimari kararlar, kod incelemesi ve performans iyileştirme. Mevcut projenizi birlikte değerlendirelim.',
      ctaUrl: 'https://kiyimedya.com/iletisim',
      order: 3,
    },
  ];

  for (const { id, ...raw } of services) {
    const input = createServiceSchema.parse({ ...raw, locale: 'tr' });
    await db.service.upsert({ where: { id }, update: input, create: { id, ...input } });
  }

  return services.length;
}

async function seedExperience(): Promise<number> {
  const entries = [
    {
      id: 'seed_exp_kiyi',
      organization: 'Kıyı Medya',
      role: 'Kurucu / Full Stack Developer',
      type: 'WORK',
      startDate: '2024-06-01',
      current: true,
      description: 'Web uygulamaları ve kurumsal siteler geliştiriyorum.',
      order: 1,
    },
    {
      id: 'seed_exp_freelance',
      organization: 'Serbest Çalışma',
      role: 'Web Developer',
      type: 'WORK',
      startDate: '2023-01-01',
      endDate: '2024-05-31',
      description: 'Çeşitli müşteriler için web projeleri.',
      order: 2,
    },
    {
      id: 'seed_exp_universite',
      organization: 'Üniversite',
      role: 'Bilgisayar Mühendisliği',
      type: 'EDUCATION',
      startDate: '2019-09-01',
      endDate: '2023-06-30',
      order: 3,
    },
  ];

  for (const { id, ...raw } of entries) {
    const input = createExperienceSchema.parse({ ...raw, locale: 'tr' });
    const data = {
      ...input,
      startDate: toDbDate(input.startDate),
      endDate: input.endDate ? toDbDate(input.endDate) : null,
    };
    await db.experience.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  return entries.length;
}

async function seedProjects(): Promise<number> {
  const projects = [
    {
      slug: 'kiyi-medya-kurumsal-site',
      title: 'Kıyı Medya Kurumsal Site',
      summary:
        'Kıyı Medya için sıfırdan tasarlanıp geliştirilen kurumsal site ve içerik yönetim paneli.',
      content:
        '## Problem\n\nMevcut site yavaştı ve içerik güncellemek geliştirici gerektiriyordu.\n\n## Çözüm\n\nNext.js App Router ile yeniden yazıldı; tüm içerik panelden yönetilebilir hale getirildi.\n\n## Sonuç\n\nLCP 4.2s → 1.3s, içerik güncellemesi dakikalar içinde.',
      tags: ['kurumsal', 'cms'],
      stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      liveUrl: 'https://kiyimedya.com',
      clientName: 'Kıyı Medya',
      featured: true,
      order: 1,
      status: 'PUBLISHED',
      publishedAt: '2026-03-15T09:00:00.000Z',
    },
    {
      slug: 'rezervasyon-yonetim-paneli',
      title: 'Rezervasyon Yönetim Paneli',
      summary: 'Küçük işletmeler için rezervasyon takibi ve müşteri yönetimi uygulaması.',
      content:
        '## Problem\n\nRezervasyonlar defter ve WhatsApp üzerinden takip ediliyordu; çakışmalar sık yaşanıyordu.\n\n## Çözüm\n\nTakvim tabanlı bir panel; çakışma kontrolü veritabanı kısıtıyla garanti altına alındı.\n\n## Sonuç\n\nÇift rezervasyon sıfıra indi.',
      tags: ['panel', 'saas'],
      stack: ['Next.js', 'Prisma', 'PostgreSQL'],
      featured: true,
      order: 2,
      status: 'PUBLISHED',
      publishedAt: '2026-05-20T09:00:00.000Z',
    },
  ];

  for (const raw of projects) {
    const input = createProjectSchema.parse({ ...raw, locale: 'tr' });
    const data = {
      ...input,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    };
    await db.project.upsert({
      where: { slug_locale: { slug: input.slug, locale: input.locale } },
      update: data,
      create: data,
    });
  }

  return projects.length;
}

async function seedPosts(): Promise<number> {
  const posts = [
    {
      slug: 'nextjs-15-app-router-notlari',
      title: 'Next.js 15 App Router Notları',
      excerpt: 'App Router ile çalışırken sık karşılaştığım kararlar ve bunlara verdiğim yanıtlar.',
      content:
        'App Router, Server Components varsayılan olduğu için veri erişimini bileşenin içine taşıyor.\n\nBu yazıda önbellekleme, dinamik render ve Server Action sınırları üzerine notlarımı topladım.',
      tags: ['nextjs', 'react'],
      status: 'PUBLISHED',
      publishedAt: '2026-06-01T08:00:00.000Z',
    },
    {
      slug: 'postgres-ile-para-saklamak',
      title: 'PostgreSQL ile Para Saklamak',
      excerpt: 'Neden float değil Decimal, ve çoklu para biriminde kur snapshot’ı.',
      content:
        'Para alanlarında kayan nokta kullanmak, kuruş sapmalarının aylar içinde birikmesi demektir.\n\nBu yazı taslak hâlinde; kur snapshot bölümü henüz yazılıyor.',
      tags: ['postgresql', 'muhasebe'],
      status: 'DRAFT',
    },
  ];

  for (const raw of posts) {
    const input = createPostSchema.parse({ ...raw, locale: 'tr' });
    const data = {
      ...input,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      // T-015 ile gerçek hesaplayıcıya devredildi (ADR-019); seed artık tahmin yapmıyor.
      readingMinutes: calculateReadingMinutes(input.content),
    };
    await db.post.upsert({
      where: { slug_locale: { slug: input.slug, locale: input.locale } },
      update: data,
      create: data,
    });
  }

  return posts.length;
}

/* ===========================================================================
 * 3. İŞ & MUHASEBE — §6 kritik ilişkisi
 * ======================================================================== */

async function seedCategories(): Promise<Map<string, string>> {
  const categories = [
    { name: 'Proje Geliri', type: 'INCOME', color: '#34d399', icon: 'briefcase' },
    { name: 'Danışmanlık', type: 'INCOME', color: '#60a5fa', icon: 'message-circle' },
    { name: 'Sunucu & Altyapı', type: 'EXPENSE', color: '#f87171', icon: 'server' },
    { name: 'Yazılım Aboneliği', type: 'EXPENSE', color: '#fbbf24', icon: 'credit-card' },
    { name: 'Eğitim', type: 'EXPENSE', color: '#a78bfa', icon: 'book' },
    { name: 'Vergi & Resmî', type: 'EXPENSE', color: '#8383a0', icon: 'file-text' },
  ];

  const ids = new Map<string, string>();

  for (const raw of categories) {
    const input = createTransactionCategorySchema.parse(raw);
    const row = await db.transactionCategory.upsert({
      where: { name_type: { name: input.name, type: input.type } },
      update: { ...input, isArchived: false },
      create: { ...input, isArchived: false },
    });
    ids.set(input.name, row.id);
  }

  return ids;
}

async function seedClientsAndJobs(categories: Map<string, string>): Promise<{
  clients: number;
  jobs: number;
  transactions: number;
}> {
  // --- Müşteri (ADR-017: email @unique, upsert ile dedupe) ------------------
  const kiyiInput = createClientSchema.parse({
    name: 'Kıyı Medya',
    company: 'Kıyı Medya',
    email: 'info@kiyimedya.com',
    isKiyiMedya: true,
  });
  const kiyi = await db.client.upsert({
    where: { email: kiyiInput.email ?? '' },
    update: kiyiInput,
    create: kiyiInput,
  });

  const abroadInput = createClientSchema.parse({
    name: 'Northwind Studio',
    company: 'Northwind Studio LLC',
    email: 'hello@northwind.example',
    notes: 'Yurt dışı müşteri — ödemeler USD.',
  });
  const abroad = await db.client.upsert({
    where: { email: abroadInput.email ?? '' },
    update: abroadInput,
    create: abroadInput,
  });

  // --- İş 1: TRY, teslim edilmiş -------------------------------------------
  const job1Input = createJobSchema.parse({
    title: 'Kurumsal site yenileme',
    description: 'Tasarım, geliştirme ve içerik aktarımı dahil.',
    status: 'DELIVERED',
    clientId: kiyi.id,
    startDate: '2026-02-01',
    dueDate: '2026-03-10',
    deliveredAt: '2026-03-08T16:00:00.000Z',
    agreedAmount: '85000.00',
    currency: 'TRY',
    fxRate: '1',
  });
  const job1Data = {
    ...job1Input,
    startDate: job1Input.startDate ? toDbDate(job1Input.startDate) : null,
    dueDate: job1Input.dueDate ? toDbDate(job1Input.dueDate) : null,
    deliveredAt: job1Input.deliveredAt ? new Date(job1Input.deliveredAt) : null,
    baseAmount: computeBaseAmount(job1Input.agreedAmount ?? '0', job1Input.fxRate),
  };
  await db.job.upsert({
    where: { id: 'seed_job_kurumsal' },
    update: job1Data,
    create: { id: 'seed_job_kurumsal', ...job1Data },
  });

  // --- İş 2: USD, aktif — ADR-014 kur snapshot'ı ---------------------------
  const job2Input = createJobSchema.parse({
    title: 'Landing page tasarımı ve geliştirmesi',
    status: 'ACTIVE',
    clientId: abroad.id,
    startDate: '2026-07-01',
    dueDate: '2026-08-15',
    agreedAmount: '2500.00',
    currency: 'USD',
    fxRate: '34.25000000',
  });
  const job2Data = {
    ...job2Input,
    startDate: job2Input.startDate ? toDbDate(job2Input.startDate) : null,
    dueDate: job2Input.dueDate ? toDbDate(job2Input.dueDate) : null,
    baseAmount: computeBaseAmount(job2Input.agreedAmount ?? '0', job2Input.fxRate),
  };
  await db.job.upsert({
    where: { id: 'seed_job_landing' },
    update: job2Data,
    create: { id: 'seed_job_landing', ...job2Data },
  });

  // --- İşlemler: §6 "işe ödeme girilince gelir tablosuna düşer" ------------
  const transactions = [
    {
      id: 'seed_tx_kurumsal_1',
      type: 'INCOME',
      amount: '42500.00',
      currency: 'TRY',
      fxRate: '1',
      date: '2026-02-05',
      categoryId: categories.get('Proje Geliri') ?? '',
      jobId: 'seed_job_kurumsal',
      clientId: kiyi.id,
      description: 'Kurumsal site — ön ödeme (%50)',
      method: 'BANK_TRANSFER',
      isPaid: true,
      paidAt: '2026-02-05T11:00:00.000Z',
      invoiceNo: 'F-2026-0012',
    },
    {
      id: 'seed_tx_kurumsal_2',
      type: 'INCOME',
      amount: '42500.00',
      currency: 'TRY',
      fxRate: '1',
      date: '2026-03-09',
      categoryId: categories.get('Proje Geliri') ?? '',
      jobId: 'seed_job_kurumsal',
      clientId: kiyi.id,
      description: 'Kurumsal site — teslim ödemesi (%50)',
      method: 'BANK_TRANSFER',
      isPaid: true,
      paidAt: '2026-03-09T10:30:00.000Z',
      invoiceNo: 'F-2026-0018',
    },
    {
      // TRY DIŞI işlem — baseAmount = 1250.00 × 34.25 = 42812.50
      id: 'seed_tx_landing_1',
      type: 'INCOME',
      amount: '1250.00',
      currency: 'USD',
      fxRate: '34.25000000',
      date: '2026-07-03',
      categoryId: categories.get('Proje Geliri') ?? '',
      jobId: 'seed_job_landing',
      clientId: abroad.id,
      description: 'Landing page — ön ödeme',
      method: 'BANK_TRANSFER',
      isPaid: true,
      paidAt: '2026-07-03T14:00:00.000Z',
    },
    {
      id: 'seed_tx_sunucu',
      type: 'EXPENSE',
      amount: '1450.00',
      currency: 'TRY',
      fxRate: '1',
      date: '2026-07-01',
      categoryId: categories.get('Sunucu & Altyapı') ?? '',
      description: 'VPS ve yedekleme',
      method: 'CREDIT_CARD',
      isPaid: true,
    },
    {
      id: 'seed_tx_egitim',
      type: 'EXPENSE',
      amount: '2400.00',
      currency: 'TRY',
      fxRate: '1',
      date: '2026-06-18',
      categoryId: categories.get('Eğitim') ?? '',
      description: 'Teknik kurs',
      method: 'CREDIT_CARD',
      isPaid: true,
    },
  ];

  for (const { id, ...raw } of transactions) {
    const input = createTransactionSchema.parse(raw);
    const data = {
      ...input,
      date: toDbDate(input.date),
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      baseAmount: computeBaseAmount(input.amount, input.fxRate),
    };
    await db.transaction.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  return { clients: 2, jobs: 2, transactions: transactions.length };
}

/** ADR-015 — şablon + ondan üretilmiş kayıt (idempotanslık `periodKey` ile). */
async function seedRecurring(categories: Map<string, string>): Promise<number> {
  const templateInput = createRecurringTransactionSchema.parse({
    type: 'EXPENSE',
    amount: '890.00',
    currency: 'TRY',
    categoryId: categories.get('Yazılım Aboneliği') ?? '',
    description: 'Tasarım ve geliştirme araçları aboneliği',
    method: 'CREDIT_CARD',
    recurrenceRule: 'MONTHLY',
    startDate: '2026-01-01',
    isActive: true,
  });

  const templateData = {
    ...templateInput,
    startDate: toDbDate(templateInput.startDate),
    endDate: templateInput.endDate ? toDbDate(templateInput.endDate) : null,
    nextRunAt: new Date('2026-09-01T03:00:00.000Z'),
    lastGeneratedAt: new Date('2026-08-01T03:00:00.000Z'),
  };

  const template = await db.recurringTransaction.upsert({
    where: { id: 'seed_recurring_abonelik' },
    update: templateData,
    create: { id: 'seed_recurring_abonelik', ...templateData },
  });

  // Şablondan üretilmiş işlem. `@@unique([sourceRecurringId, periodKey])`
  // cron'un ikinci çalıştırmasında çift kayıt üretmesini DB düzeyinde engeller.
  const generatedInput = createGeneratedTransactionSchema.parse({
    type: templateInput.type,
    amount: templateInput.amount,
    currency: templateInput.currency,
    fxRate: '1',
    date: '2026-08-01',
    categoryId: templateInput.categoryId,
    description: templateInput.description,
    method: templateInput.method,
    isPaid: true,
    sourceRecurringId: template.id,
    periodKey: '2026-08',
  });

  const generatedData = {
    ...generatedInput,
    date: toDbDate(generatedInput.date),
    paidAt: null,
    baseAmount: computeBaseAmount(generatedInput.amount, generatedInput.fxRate),
  };

  await db.transaction.upsert({
    where: {
      sourceRecurringId_periodKey: {
        sourceRecurringId: template.id,
        periodKey: generatedInput.periodKey,
      },
    },
    update: generatedData,
    create: generatedData,
  });

  return 1;
}

/* ===========================================================================
 * 4. SAĞLIK & SPOR
 * ======================================================================== */

async function seedHealthAndSport(): Promise<{
  healthLogs: number;
  exercises: number;
  workouts: number;
  sets: number;
  records: number;
}> {
  const healthLogs = [
    {
      date: '2026-08-01',
      weightKg: '82.40',
      sleepHours: '7.20',
      waterMl: 2600,
      steps: 8400,
      mood: 4,
    },
    {
      date: '2026-08-02',
      weightKg: '82.10',
      sleepHours: '6.50',
      waterMl: 2200,
      steps: 6100,
      mood: 3,
    },
    {
      date: '2026-08-03',
      weightKg: '82.20',
      sleepHours: '8.00',
      waterMl: 3000,
      steps: 11200,
      mood: 5,
    },
    {
      date: '2026-08-04',
      weightKg: '81.90',
      sleepHours: '7.50',
      waterMl: 2800,
      steps: 9300,
      mood: 4,
    },
  ];

  for (const raw of healthLogs) {
    const input = createHealthLogSchema.parse(raw);
    const data = { ...input, date: toDbDate(input.date) };
    await db.healthLog.upsert({ where: { date: data.date }, update: data, create: data });
  }

  const exercises = [
    { name: 'Bench Press', muscleGroup: 'CHEST', equipment: 'BARBELL' },
    { name: 'Squat', muscleGroup: 'LEGS', equipment: 'BARBELL' },
    { name: 'Deadlift', muscleGroup: 'BACK', equipment: 'BARBELL' },
    { name: 'Pull Up', muscleGroup: 'BACK', equipment: 'BODYWEIGHT' },
    { name: 'Overhead Press', muscleGroup: 'SHOULDERS', equipment: 'BARBELL' },
  ];

  const exerciseIds = new Map<string, string>();
  for (const raw of exercises) {
    const input = createExerciseSchema.parse(raw);
    const row = await db.exercise.upsert({
      where: { name: input.name },
      update: { ...input, isArchived: false },
      create: { ...input, isArchived: false },
    });
    exerciseIds.set(input.name, row.id);
  }

  // Antrenman + setler
  const workoutInput = createWorkoutSchema.parse({
    date: '2026-08-04',
    type: 'GYM',
    durationMin: 65,
    feeling: 4,
    note: 'Üst vücut günü',
  });
  const workoutData = { ...workoutInput, date: toDbDate(workoutInput.date) };
  const workout = await db.workout.upsert({
    where: { id: 'seed_workout_1' },
    update: workoutData,
    create: { id: 'seed_workout_1', ...workoutData },
  });

  const sets = [
    { exercise: 'Bench Press', setNo: 1, reps: 8, weightKg: '80.00', rpe: 7 },
    { exercise: 'Bench Press', setNo: 2, reps: 6, weightKg: '85.00', rpe: 8 },
    { exercise: 'Bench Press', setNo: 3, reps: 5, weightKg: '90.00', rpe: 9 },
    { exercise: 'Overhead Press', setNo: 1, reps: 10, weightKg: '45.00', rpe: 7 },
    { exercise: 'Pull Up', setNo: 1, reps: 12, rpe: 8 },
  ];

  for (const { exercise, ...raw } of sets) {
    const exerciseId = exerciseIds.get(exercise) ?? '';
    const input = createWorkoutSetSchema.parse({ ...raw, workoutId: workout.id, exerciseId });
    await db.workoutSet.upsert({
      where: {
        workoutId_exerciseId_setNo: {
          workoutId: input.workoutId,
          exerciseId: input.exerciseId,
          setNo: input.setNo,
        },
      },
      update: input,
      create: input,
    });
  }

  // PR — ADR-021: TEKRAR BAZINDA, tahmini 1RM yok.
  const records = [
    { exercise: 'Bench Press', reps: 5, weightKg: '90.00', date: '2026-08-04' },
    { exercise: 'Bench Press', reps: 8, weightKg: '80.00', date: '2026-08-04' },
    { exercise: 'Squat', reps: 5, weightKg: '120.00', date: '2026-07-28' },
    { exercise: 'Deadlift', reps: 3, weightKg: '150.00', date: '2026-07-21' },
  ];

  for (const { exercise, ...raw } of records) {
    const exerciseId = exerciseIds.get(exercise) ?? '';
    const input = createPersonalRecordSchema.parse({ ...raw, exerciseId });
    const data = { ...input, date: toDbDate(input.date) };
    await db.personalRecord.upsert({
      where: { exerciseId_reps: { exerciseId: input.exerciseId, reps: input.reps } },
      update: data,
      create: data,
    });
  }

  return {
    healthLogs: healthLogs.length,
    exercises: exercises.length,
    workouts: 1,
    sets: sets.length,
    records: records.length,
  };
}

/* ===========================================================================
 * 5. HAYAT
 * ======================================================================== */

async function seedLife(): Promise<{
  habits: number;
  habitLogs: number;
  goals: number;
  journal: number;
}> {
  const habits = [
    {
      id: 'seed_habit_su',
      name: 'Su içmek',
      targetPerWeek: 7,
      targetPerDay: 8,
      color: '#60a5fa',
      icon: 'droplet',
    },
    { id: 'seed_habit_spor', name: 'Spor', targetPerWeek: 4, color: '#34d399', icon: 'dumbbell' },
    {
      id: 'seed_habit_okuma',
      name: 'Kitap okumak',
      targetPerWeek: 5,
      color: '#a78bfa',
      icon: 'book-open',
    },
  ];

  const habitIds: string[] = [];
  for (const { id, ...raw } of habits) {
    const input = createHabitSchema.parse(raw);
    await db.habit.upsert({
      where: { id },
      update: { ...input, isArchived: false },
      create: { id, ...input, isArchived: false },
    });
    habitIds.push(id);
  }

  // ADR-021 — `done` yok, `count` var.
  const logs = [
    { habitId: 'seed_habit_su', date: '2026-08-01', count: 7 },
    { habitId: 'seed_habit_su', date: '2026-08-02', count: 6 },
    { habitId: 'seed_habit_su', date: '2026-08-03', count: 8 },
    { habitId: 'seed_habit_su', date: '2026-08-04', count: 8 },
    { habitId: 'seed_habit_spor', date: '2026-08-04', count: 1 },
    { habitId: 'seed_habit_okuma', date: '2026-08-03', count: 1 },
    { habitId: 'seed_habit_okuma', date: '2026-08-04', count: 1 },
  ];

  for (const raw of logs) {
    const input = createHabitLogSchema.parse(raw);
    const data = { ...input, date: toDbDate(input.date) };
    await db.habitLog.upsert({
      where: { habitId_date: { habitId: input.habitId, date: data.date } },
      update: data,
      create: data,
    });
  }

  const goals = [
    {
      id: 'seed_goal_sertifika',
      title: 'AWS sertifikası almak',
      description: 'Solutions Architect Associate.',
      category: 'CAREER',
      targetDate: '2026-12-31',
      progress: 35,
      status: 'ACTIVE',
    },
    {
      id: 'seed_goal_kilo',
      title: '80 kg’a inmek',
      category: 'FITNESS',
      targetDate: '2026-10-01',
      progress: 60,
      status: 'ACTIVE',
    },
    {
      id: 'seed_goal_site',
      title: 'Kişisel siteyi yayına almak',
      category: 'CAREER',
      progress: 100,
      status: 'ACHIEVED',
    },
  ];

  for (const { id, ...raw } of goals) {
    const input = createGoalSchema.parse(raw);
    const data = { ...input, targetDate: input.targetDate ? toDbDate(input.targetDate) : null };
    await db.goal.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  const journal = [
    {
      id: 'seed_journal_1',
      date: '2026-08-03',
      title: 'Verimli bir hafta sonu',
      content:
        'Panelin veri modelini bitirdim. Kur snapshot kararı doğru olmuş, raporlar çok daha temiz duruyor.',
      mood: 5,
      tags: ['iş', 'proje'],
    },
    {
      id: 'seed_journal_2',
      date: '2026-08-04',
      title: 'Antrenman ve odak',
      content:
        'Bench’te 90 kg × 5 yaptım. Akşam kod incelemesi vardı, yorgun başladım ama iyi geçti.',
      mood: 4,
      tags: ['spor'],
    },
  ];

  for (const { id, ...raw } of journal) {
    const input = createJournalEntrySchema.parse(raw);
    const data = { ...input, date: toDbDate(input.date) };
    await db.journalEntry.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  return {
    habits: habits.length,
    habitLogs: logs.length,
    goals: goals.length,
    journal: journal.length,
  };
}

/* ===========================================================================
 * ÇALIŞTIR
 * ======================================================================== */

async function main(): Promise<void> {
  print('Seed başlıyor…\n');

  await seedAdmin();
  await seedProfile();
  const skills = await seedSkills();
  const services = await seedServices();
  const experience = await seedExperience();
  const projects = await seedProjects();
  const posts = await seedPosts();

  const categories = await seedCategories();
  const business = await seedClientsAndJobs(categories);
  const recurring = await seedRecurring(categories);

  const fitness = await seedHealthAndSport();
  const life = await seedLife();

  // §8.20 — hiçbir şifre, hash veya secret yazdırılmaz.
  print('Oluşturulan kayıtlar:');
  print(`  Kullanıcı            1 (2FA kurulumu panelden yapılacak)`);
  print(`  Profil               1 (singleton)`);
  print(`  Yetenek              ${skills}`);
  print(`  Hizmet               ${services}`);
  print(`  Deneyim              ${experience}`);
  print(`  Proje                ${projects}`);
  print(`  Yazı                 ${posts} (1 taslak)`);
  print(`  İşlem kategorisi     ${categories.size}`);
  print(`  Müşteri              ${business.clients}`);
  print(`  İş                   ${business.jobs} (1 TRY, 1 USD)`);
  print(`  İşlem                ${business.transactions + recurring}`);
  print(`  Tekrarlayan şablon   ${recurring}`);
  print(`  Sağlık kaydı         ${fitness.healthLogs}`);
  print(`  Egzersiz             ${fitness.exercises}`);
  print(`  Antrenman / set      ${fitness.workouts} / ${fitness.sets}`);
  print(`  Kişisel rekor        ${fitness.records}`);
  print(`  Alışkanlık / kayıt   ${life.habits} / ${life.habitLogs}`);
  print(`  Hedef                ${life.goals}`);
  print(`  Günlük               ${life.journal}`);
  print('\nSeed tamamlandı.');
}

try {
  await main();
} finally {
  // BULGU-007 — `$disconnect()` TEK BAŞINA YETMEZ; `pg` havuzunu bu kapatır.
  // `process.exit()` kullanılmaz: semptomu gizler, kaynağı bırakmaz.
  await closeDatabase();
}
