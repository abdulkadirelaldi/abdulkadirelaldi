import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * E2E test verisi yönetimi.
 *
 * Bu dosya İNCE BİR SARMALAYICIDIR: gerçek veritabanı işleri `db-task.ts`
 * içinde, ayrı bir Node sürecinde koşar. Gerekçe `db-resolver.mjs` başında —
 * özetle Playwright'in yükleyicisi `src/**` içindeki `@/` takma adlarını
 * çözemiyor ve kök `tsconfig.json` bu görevin kapsamı dışında.
 *
 * KAZANÇ: Backend'in `encryptSecret` / `hashBackupCodes` / `hashEmail`
 * uygulamaları TÜKETİLİR, kopyalanmaz. Şifreleme biçimi değişirse test tarafı
 * kendiliğinden uyumlu kalır — güvenlik ilkelinin ikinci bir kopyası oluşmaz.
 *
 * NEDEN BU DOSYA VAR (T-018b / ENGEL-1 ve ENGEL-2): Frontend 2FA'yı elle açıp
 * elle temizledi. Temizliği UNUTMAK, secret'ı yalnızca testlerde bulunan bir
 * hesap bırakır — **site sahibi kendi panelinden kilitlenir.** Temizlik artık
 * `globalTeardown`'a bağlı ve otomatik.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const REGISTER = path.join(PROJECT_ROOT, 'tests/e2e/_helpers/db-register.mjs');
const TASK = path.join(PROJECT_ROOT, 'tests/e2e/_helpers/db-task.ts');

/** Sabit test secret'ı — RFC 6238 tohumunun Base32 hâli (deterministik kod üretimi). */
export const TEST_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** Sabit kurtarma kodları — biçim `XXXXX-XXXXX` (ADR-013). */
export const TEST_BACKUP_CODES = ['AAAAA-BBBBB', 'CCCCC-DDDDD', 'EEEEE-FFFFF'] as const;

async function runTask<T>(command: string, arg?: string): Promise<T> {
  const args = ['--import', REGISTER, TASK, command];
  if (arg !== undefined) args.push(arg);

  const { stdout } = await execFileAsync(process.execPath, args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    // Node'un TypeScript tip sıyırma uyarısı stderr'i kirletmesin.
    encoding: 'utf8',
  });

  return JSON.parse(stdout) as T;
}

export interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Seed'in oluşturduğu yönetici hesabının kimlik bilgileri.
 *
 * `.env`'den okunur, teste GÖMÜLMEZ (§8.17/§8.20). Eksikse net hata verilir;
 * boş dizeyle devam etmek testleri sessizce anlamsız kılardı.
 */
export function adminCredentials(): AdminCredentials {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E için ADMIN_EMAIL ve ADMIN_PASSWORD gerekli. .env dosyasını kontrol edin (bkz. .env.example).',
    );
  }

  return { email, password };
}

export interface AdminSnapshot {
  id: string;
  email: string;
  twoFactorEnabled: boolean;
  remainingBackupCodes: number;
  lockedUntil: string | null;
}

export async function findAdminUser(): Promise<AdminSnapshot> {
  return runTask<AdminSnapshot>('admin');
}

/**
 * Test kullanıcısında 2FA'yı açar.
 *
 * Seed 2FA'yı KAPALI bırakıyor (bilinçli, T-013b) — §9/3'ün "doğru şifre →
 * 2FA adımı" kısmı ancak bundan sonra ölçülebilir.
 */
export async function enableTwoFactor(): Promise<{
  secret: string;
  backupCodes: readonly string[];
}> {
  return runTask('enableTwoFactor');
}

/** Kalan (tüketilmemiş) kurtarma kodu sayısı — tüketimi doğrulamak için. */
export async function remainingBackupCodeCount(): Promise<number> {
  return (await findAdminUser()).remainingBackupCodes;
}

export async function isAccountLocked(now: Date = new Date()): Promise<boolean> {
  const { lockedUntil } = await findAdminUser();
  return lockedUntil != null && new Date(lockedUntil).getTime() > now.getTime();
}

/** Kilit denetim kaydı sayısı — ADR-022'nin uçtan uca doğrulanması. */
export async function lockAuditLogCount(): Promise<number> {
  return (await runTask<{ count: number }>('lockAuditCount')).count;
}

export async function clearLock(): Promise<void> {
  await runTask('clearLock');
}

/**
 * Başarısız deneme sayacını sıfırlar.
 *
 * §8.4 sayımı IP başına 15 dakikalık pencerede. Kilit testi 5 kayıt bırakır;
 * temizlenmezse SONRAKİ testler ilk denemede kilide takılır ve sıraya bağlı,
 * açıklaması zor kırılmalar başlar.
 */
export async function clearLoginAttempts(): Promise<void> {
  await runTask('clearLoginAttempts');
}

/** Kullanıcıyı seed durumuna döndürür ve testin bıraktığı izleri siler. */
export async function resetAuthState(since?: Date): Promise<void> {
  await runTask('resetAuthState', since?.toISOString());
}

/* ===========================================================================
 * §9/6 ve §9/2 — içerik izleri (T-039)
 * ======================================================================== */

/** E2E'nin ürettiği kayıtların ortak öneki — temizlik bu öneke dayanıyor. */
export const E2E_ICERIK_ONEKI = 'e2e-t039';

export interface ProjeDurumu {
  bulundu: boolean;
  status?: string;
  locale?: string;
  publishedAt?: string | null;
}

/** Slug'ı verilen projenin DB'deki yayın durumu. */
export async function projeDurumu(slug: string): Promise<ProjeDurumu> {
  return runTask<ProjeDurumu>('projeDurumu', JSON.stringify({ slug }));
}

/** Test projelerini siler (slug öneki zorunlu). */
export async function projeleriTemizle(slugOneki: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'projeleriTemizle',
    JSON.stringify({ slugOneki }),
  );
  return silinen;
}

export interface IletisimMesajiOzeti {
  bulundu: boolean;
  isRead?: boolean;
  arsivlendi?: boolean;
  honeypotHit?: boolean;
  isSpam?: boolean;
  spamScore?: number | null;
  adEsit?: boolean | null;
  epostaEsit?: boolean | null;
  mesajEsit?: boolean | null;
  ipYazildi?: boolean;
  userAgentYazildi?: boolean;
}

/**
 * Gönderilen mesajın DB'deki ÖZETİ.
 *
 * Beklenen değerler argüman olarak gidiyor ve karşılaştırma alt süreçte
 * yapılıyor: mesaj gövdesi, e-posta ve IP test çıktısına HİÇ düşmesin (§8.20).
 */
export async function iletisimMesajiOzeti(beklenen: {
  subject: string;
  name?: string;
  email?: string;
  message?: string;
}): Promise<IletisimMesajiOzeti> {
  return runTask<IletisimMesajiOzeti>('iletisimMesajiOzeti', JSON.stringify(beklenen));
}

/** Panelin okuma yolu (`fetchContactMessages`) bu mesajı görüyor mu? */
export async function mesajKutusuIceriyorMu(subject: string): Promise<{
  toplam: number;
  okunmamis: number;
  iceriyor: boolean;
  isRead: boolean | null;
  isSpam: boolean | null;
  onizlemeUzunlugu: number | null;
}> {
  return runTask('mesajKutusuIceriyorMu', JSON.stringify({ subject }));
}

export async function iletisimMesajlariniTemizle(konuOneki: string): Promise<number> {
  const { silinen } = await runTask<{ silinen: number }>(
    'iletisimMesajlariniTemizle',
    JSON.stringify({ konuOneki }),
  );
  return silinen;
}
