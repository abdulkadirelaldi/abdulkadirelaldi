import type {
  ProfileDto,
  ProjectListItemDto,
  ServiceDto,
  SkillDto,
} from '@/server/services/content-dto';
import { SkillCategory } from '@/types';

/**
 * GEÇİCİ İÇERİK — ADR-026 "sözleşme-önce".
 *
 * TİPLER BACKEND'DEN TÜREVDİR, elle kopya DEĞİLDİR: aşağıdaki nesneler
 * `ProfileDto` ve `SkillDto` olarak ANOTE EDİLMİŞTİR. Sözleşme değişirse
 * (alan eklenir, adı değişir, `null` olur) `pnpm typecheck` BURAYI KIRAR —
 * ADR-026'nın "fixture sapabilir" endişesinin yapısal karşılığı budur.
 *
 * `import type` kullanılıyor: tipler derlemede silinir, sunucu modülü istemci
 * paketine sızmaz.
 *
 * SERVİSLER GELİNCE: bu dosya SİLİNİR ve `page.tsx` içindeki iki satır
 * `fetchProfile()` / `fetchSkills()` çağrılarıyla değişir. Bölüm bileşenleri
 * zaten DTO alıyor, onlarda değişiklik gerekmez.
 */

/** Ekranda görünmeyen ama tipin istediği alanlar için sabit yer tutucu. */
const YER_TUTUCU_ID = 'fixture';

export const GECICI_PROFIL: ProfileDto = {
  id: YER_TUTUCU_ID,
  locale: 'tr',
  headline: 'Full Stack Developer',
  subtitle: 'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum.',
  bio: [
    'Üniversite öğrencisiyim ve iki yıldır web geliştiriyorum. Kıyı Medya çatısı altında markalar için kurumsal siteler ve özel yazılımlar üretiyorum.',
    'İşin tasarımından veritabanına, dağıtımından bakımına kadar her adımını kendim kuruyorum. Ölçülebilir, yönetilebilir ve hızlı kalan ürünler çıkarmayı önemsiyorum.',
  ].join('\n\n'),
  location: 'Türkiye',
  availability: 'Yeni projelere açığım',
  socials: {
    github: 'https://github.com/',
    linkedin: 'https://www.linkedin.com/',
    x: 'https://x.com/',
    email: 'merhaba@abdulkadirelaldi.com',
  },
  avatar: null,
  cv: null,
};

/** `order` alanı bilinçli olarak karışık — gruplayıcının sıralaması sınansın. */
export const GECICI_YETENEKLER: SkillDto[] = [
  { name: 'React', category: SkillCategory.FRONTEND, order: 1 },
  { name: 'Next.js', category: SkillCategory.FRONTEND, order: 2 },
  { name: 'TypeScript', category: SkillCategory.FRONTEND, order: 3 },
  { name: 'Tailwind CSS', category: SkillCategory.FRONTEND, order: 4 },
  { name: 'Node.js', category: SkillCategory.BACKEND, order: 1 },
  { name: 'Prisma', category: SkillCategory.BACKEND, order: 2 },
  { name: 'Zod', category: SkillCategory.BACKEND, order: 3 },
  { name: 'Auth.js', category: SkillCategory.BACKEND, order: 4 },
  { name: 'PostgreSQL', category: SkillCategory.DATABASE, order: 1 },
  { name: 'Docker', category: SkillCategory.DEVOPS, order: 1 },
  { name: 'Coolify', category: SkillCategory.DEVOPS, order: 2 },
  { name: 'Cloudflare R2', category: SkillCategory.DEVOPS, order: 3 },
  { name: 'Figma', category: SkillCategory.DESIGN, order: 1 },
  { name: 'Tasarım sistemi', category: SkillCategory.DESIGN, order: 2 },
  { name: 'Erişilebilirlik', category: SkillCategory.DESIGN, order: 3 },
  { name: 'Git', category: SkillCategory.TOOLING, order: 1 },
  { name: 'Vitest', category: SkillCategory.TOOLING, order: 2 },
  { name: 'Playwright', category: SkillCategory.TOOLING, order: 3 },
].map((ham, sira) => ({
  id: `${YER_TUTUCU_ID}-${sira}`,
  locale: 'tr',
  level: 0,
  iconKey: null,
  ...ham,
}));

/**
 * `cover` BİLEREK `null`: `AttachmentRefDto` URL taşımıyor (ADR-018) ve seed
 * hiç `Attachment` üretmiyor — yani gerçek veride de bugün null. Yer tutucu
 * yolu asıl yol; T-037 imzalı URL'leri getirince düzen değişmeden dolacak.
 */
export const GECICI_PROJELER: ProjectListItemDto[] = [
  {
    slug: 'kiyi-medya-kurumsal',
    title: 'Kıyı Medya kurumsal site',
    summary: 'Ajansın kendi vitrini: içerik yönetimi, blog ve teklif akışı tek panelden.',
    tags: ['kurumsal', 'cms'],
    stack: ['Next.js', 'TypeScript', 'Prisma', 'PostgreSQL'],
  },
  {
    slug: 'rezervasyon-paneli',
    title: 'Rezervasyon paneli',
    summary: 'Küçük bir otel için oda, tarih ve ödeme takibini tek ekranda toplayan araç.',
    tags: ['panel', 'saas'],
    stack: ['React', 'Node.js', 'PostgreSQL'],
  },
  {
    slug: 'e-ticaret-vitrini',
    title: 'E-ticaret vitrini',
    summary: 'Ürün kataloğu, sepet ve ödeme entegrasyonu; mobilde 90+ Lighthouse.',
    tags: ['e-ticaret'],
    stack: ['Next.js', 'Tailwind CSS', 'Stripe'],
  },
].map((ham, sira) => ({
  id: `${YER_TUTUCU_ID}-proje-${sira}`,
  locale: 'tr',
  cover: null,
  featured: true,
  order: sira,
  publishedAt: '2026-01-15T00:00:00.000Z',
  ...ham,
}));

export const GECICI_HIZMETLER: ServiceDto[] = [
  {
    title: 'Kurumsal web sitesi',
    description:
      'Markanı doğru anlatan, hızlı açılan ve panelden kendi başına güncelleyebileceğin bir site.',
  },
  {
    title: 'Web uygulaması',
    description:
      'İşini yürüten özel yazılım: veri girişi, raporlama ve yetkilendirme uçtan uca kurulur.',
  },
  {
    title: 'E-ticaret',
    description: 'Ürün kataloğu, ödeme ve kargo entegrasyonlarıyla satışa hazır mağaza.',
  },
  {
    title: 'Bakım ve destek',
    description: 'Yayındaki sistemin güncel, yedekli ve izlenir kalması için sürekli destek.',
  },
].map((ham, sira) => ({
  id: `${YER_TUTUCU_ID}-hizmet-${sira}`,
  locale: 'tr',
  iconKey: null,
  ctaUrl: null,
  order: sira,
  ...ham,
}));
