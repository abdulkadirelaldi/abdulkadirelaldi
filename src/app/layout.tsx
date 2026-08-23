import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { parseTheme, THEME_COOKIE, themeClassName } from '@/components/theme';
import { ThemeProvider } from '@/components/theme-provider';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

import './globals.css';

/* ===========================================================================
 * §3.2 — ÜÇ FONT AİLESİ, REPODAN (ADR-031)
 * ===========================================================================
 *
 * NEDEN `next/font/google` DEĞİL: o yükleyici DERLEME ANINDA fonts.gstatic.com'a
 * çıkar. CI koşusu 31909914487'de "Failed to fetch Inter from Google Fonts" ile
 * derleme düştü; yeniden koşuda geçti. Asıl zarar skor değil, "zaten bazen
 * düşüyor, tekrar koştur" refleksinin kapıyı aşındırması — o refleks bir gün
 * gerçek bir kırılmayı da yutar. T-070'in Docker derlemesi aynı duvara
 * çarpacaktı. Artık dosyalar `./fonts` altında; derleme ağa HİÇ çıkmıyor.
 *
 * DOSYALAR NASIL ÜRETİLDİ: `fonts/uret.py` (aynı klasörde, tekrar üretilebilir).
 * google/fonts deposundaki DEĞİŞKEN kaynaklar alındı, ağırlık ekseni yalnızca
 * kullandığımız aralığa daraltıldı ve `latin` + `latin-ext` birleşimine
 * indirgendi. Aralıklar elle uydurulmadı: eski `next/font/google` çıktısının
 * `unicode-range` değerlerinden birebir kopyalandı.
 *
 * `latin-ext` ZORUNLU: ğ ü ş İ ı ö ç karakterleri `latin` içinde YOK; eksik
 * olsaydı tarayıcı yedek fontla harf harf yama yapar ve metin bozulurdu.
 * Kapsam `fonts/uret.py` ile üretim sonrası doğrulandı (üç fontta da eksik yok).
 *
 * AİLE BAŞINA TEK DOSYA: Google altkümeleri `latin` ve `latin-ext` diye ikiye
 * bölüp ön yükleme listesini altı dosyaya çıkarıyordu (218 kB). Birleşik
 * değişken dosyalar 163 kB ve üç istek — hem daha küçük hem daha az gidiş-dönüş.
 *
 * `weight` ARALIK OLARAK VERİLİYOR ('600 700'): dosya değişken kaldığı için tek
 * yüz bütün ağırlıkları karşılıyor. Sabit ağırlıklara ayırmak yedi dosya ve
 * 275 kB ederdi — ölçüldü.
 *
 * ÖN YÜKLEME AÇIK (varsayılan) — T-023'te kapatmak DENENDİ ve GERİ ALINDI:
 * `preload: false` ile font BELGE → CSS → FONT zincirine düşüyor ve FCP
 * grafiğine fazladan bir gidiş-dönüş ekliyor; ölçüm FCP 907 → 1359 ms, LCP
 * değişmedi. Bir daha denenmesin diye burada duruyor.
 *
 * `adjustFontFallback: 'Arial'` DA AÇIK: yedek font için ascent/descent ve
 * `size-adjust` üretir. `swap` sırasında satır yüksekliği oynamadığı için
 * CLS 0 bunun sayesinde korunuyor; kapatmak sessiz bir düzen kaymasıdır.
 */
const spaceGrotesk = localFont({
  src: './fonts/space-grotesk.woff2',
  weight: '600 700',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
  variable: '--font-space-grotesk',
});

const inter = localFont({
  src: './fonts/inter.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
  variable: '--font-inter',
});

const jetBrainsMono = localFont({
  src: './fonts/jetbrains-mono.woff2',
  weight: '400 500',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
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
