import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright yapılandırması — PROGRAM.md §9 (E2E senaryoları).
 *
 * F0 KAPSAMI: yalnızca altyapı + duman testi. §9'daki 7 senaryo ilgili
 * fazlarda yazılır (senaryo 3–4 → T-016, senaryo 2/6 → T-039, senaryo 5 →
 * T-047, senaryo 1/7 → T-029). Bu dosya o senaryoların üzerine kurulacağı
 * zemindir.
 *
 * SUNUCU SEÇİMİ: `next dev` değil `next build && next start`.
 * Ara katman (`src/middleware.ts`) ve güvenlik başlıkları geliştirme ve üretim
 * derlemelerinde farklı davranabilir; başlıkları doğrulayan bir test paketinin
 * üretime benzeyen çıktı üzerinde koşması şart. Ayrıca `dev` sunucusunda ilk
 * istek derleme beklediği için ölçümler gürültülü olurdu.
 *
 * VERİTABANI GEREKTİRMEZ: test edilen rotalar (`/`, `/panel`) statik.
 * `/api/v1/health` yalnızca BAŞLIKLARI için yoklanır — durum kodu bilinçli
 * olarak doğrulanmaz, çünkü DB kapalıyken 503 döner ve bu doğru davranıştır.
 */

/** 3000 değil: geliştiricinin açık `pnpm dev` sunucusuyla çakışmasın. */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  fullyParallel: true,

  // CI'da `test.only` unutulmuş olamaz — sessizce daralan bir paket, yeşil
  // görünen ama hiçbir şey doğrulamayan bir CI demektir.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Arayüz Türkçe (§1, v1 sadece TR); tarayıcı da öyle olsun ki tarih ve
    // sayı biçimlendirmesi üretimdekiyle aynı yoldan geçsin.
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /**
       * §9 senaryo 7 — "Mobil görünümde ana sayfa ve panel kullanılabilir".
       * Senaryonun kendisi T-029'da yazılacak; mobil projesi şimdiden burada
       * duruyor ki her E2E testi baştan itibaren iki görünümde de koşsun ve
       * mobil kırılma F6'ya birikmesin.
       */
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    /**
     * CI'da derleme AYRI BİR ADIM olarak zaten koştu (`.github/workflows/ci.yml`
     * → "build"), bu yüzden burada yalnızca sunucu başlatılır. Yeniden derleseydik
     * hem her koşuda bir derleme boşa gider hem de CI'ın `build → test:e2e`
     * sıralaması anlamsızlaşırdı: E2E kendi derlemesini yapsaydı, önceki adımın
     * başarısı E2E için bir ön koşul olmaktan çıkardı.
     *
     * Yerelde tek komutla çalışsın diye derleme dahil edilir.
     */
    command: isCI ? 'pnpm start' : 'pnpm build && pnpm start',
    url: `${BASE_URL}/panel`,
    env: {
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
    },
    // Yerelde ayakta bir sunucu varsa yeniden kullan; CI'da her zaman temiz derleme.
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
