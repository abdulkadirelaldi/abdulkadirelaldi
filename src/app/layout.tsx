import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { parseTheme, THEME_COOKIE, themeClassName } from '@/components/theme';
import { ThemeProvider } from '@/components/theme-provider';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

import './globals.css';

/**
 * §3.2 — üç font ailesi.
 * `latin-ext` subset'i ZORUNLUDUR: ğ ü ş İ ı ö ç karakterleri `latin` içinde yok;
 * eksik olursa tarayıcı yedek fontla harf harf yama yapar ve metin bozulur.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * ÖN YÜKLEME AÇIK KALDI — T-023'te kapatıldı, ÖLÇÜLDÜ, geri alındı.
 *
 * Denenen: `preload: false`. Gerekçe makuldü — üç ailenin ön yüklenen altı
 * dosyası 218 kB ve Slow 4G'de bu JS'ten büyük bir kalem.
 * Ölçüm (3'er koşu, medyan): FCP 907 ms → 1359 ms, LCP 3456 → 3456.
 * Sebep: ön yükleme kalkınca font BELGE → CSS → FONT zincirine düşüyor ve
 * FCP grafiğine fazladan bir gidiş-dönüş ekliyor. Kazanılan bant genişliği,
 * kaybedilen turdan küçük. Kayıtta kalsın ki bir daha denenmesin.
 */
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: 'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum.',
};

/**
 * §3.1 hex yasağının TEK istisnası: `themeColor` çerçeve tarafından dayatılan bir
 * metadata alanı, ham renk değeri istiyor ve CSS değişkeni kabul etmiyor.
 *
 * Aşağıdaki iki değer `--bg-base` token'ının iki temadaki karşılığıdır ve
 * `globals.css` ile BİRLİKTE güncellenmelidir — projede bu token'ın ikinci ve
 * son kopyası burasıdır.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A12' }, // --bg-base (koyu)
    { media: '(prefers-color-scheme: light)', color: '#F8F8FC' }, // --bg-base (aydınlık)
  ],
};

/**
 * Kök layout.
 *
 * Tema: cookie'den okunur ve sınıf `<html>`'e SUNUCUDA basılır. Böylece ilk
 * boyamada doğru tema gelir — FOUC yapısal olarak imkânsızdır ve §8.13'ün
 * yasakladığı satır içi script'e gerek kalmaz. Cookie yoksa sınıf da yoktur;
 * kararı globals.css'teki `prefers-color-scheme` bloğu verir.
 *
 * Bilinen maliyet: `cookies()` kök layout'u dinamik render'a çeker — raporun
 * "Engeller / talepler" bölümünde Orkestra Şefi'ne bildirildi.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="tr"
      className={cn(
        spaceGrotesk.variable,
        inter.variable,
        jetBrainsMono.variable,
        themeClassName(theme),
      )}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
