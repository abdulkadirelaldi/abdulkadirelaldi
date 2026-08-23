import { SkillCategory } from '@/types';

/**
 * Yetenek kategorilerinin Türkçe başlıkları.
 *
 * AYRI DOSYADA çünkü İKİ yerden okunuyor: ana sayfanın `Yetenekler` bölümü
 * (istemci) ve `/cv` (sunucu). Kopyalansaydı iki liste sessizce ayrışırdı —
 * `Record<SkillCategory, string>` tipi de yalnızca kendi kopyasını korurdu.
 * Prisma'ya yeni bir kategori eklendiğinde `pnpm typecheck` BURAYI kırar ve
 * her iki sayfa birden düzelir.
 */
export const KATEGORI_BASLIK: Record<SkillCategory, string> = {
  [SkillCategory.FRONTEND]: 'Frontend',
  [SkillCategory.BACKEND]: 'Backend',
  [SkillCategory.DATABASE]: 'Veritabanı',
  [SkillCategory.DEVOPS]: 'Altyapı',
  [SkillCategory.MOBILE]: 'Mobil',
  [SkillCategory.DESIGN]: 'Tasarım',
  [SkillCategory.TOOLING]: 'Araçlar',
  [SkillCategory.SOFT_SKILL]: 'Çalışma biçimi',
  [SkillCategory.OTHER]: 'Diğer',
};
