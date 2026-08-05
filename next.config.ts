import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * PROGRAM.md §13.1 — Docker imajı için `standalone` çıktı zorunlu.
 *
 * NOT (T-001 kapsam sınırı): güvenlik başlıkları (§8.12–8.14, HSTS/CSP/X-Frame-Options)
 * ve `middleware.ts` Güvenlik ajanının mülkiyetindedir (T-004). Buraya `headers()`
 * eklenmemiştir — bilinçli boşluktur.
 */
const nextConfig: NextConfig = {
  // Coolify + Docker dağıtımı için (§13.1)
  output: 'standalone',

  /**
   * Next, çalışma alanı kökünü yukarı doğru lock dosyası arayarak tahmin eder.
   * Depo dışında (örn. ev dizininde) bir `package-lock.json` varsa kökü yanlış
   * seçer ve `standalone` çıktısı eksik/şişkin dosya izlemesiyle üretilir —
   * Docker imajı bozulur. Kökü açıkça bu depoya sabitliyoruz.
   */
  outputFileTracingRoot: path.resolve(__dirname),

  // Derleme sırasında tip ve lint hatalarını asla yutma (§10.6 DoD)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // `next build` kendi lint'ini çalıştırmasın; lint ayrı script (§10.5)
    ignoreDuringBuilds: true,
  },

  // Kaynak haritaları üretimde kapalı — sunucu kodu sızmasın (§8)
  productionBrowserSourceMaps: false,

  // `X-Powered-By: Next.js` başlığı kapalı — gereksiz parmak izi (§8.14)
  poweredByHeader: false,

  reactStrictMode: true,
};

export default nextConfig;
