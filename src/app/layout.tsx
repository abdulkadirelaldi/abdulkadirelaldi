import type { Metadata } from 'next';
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
