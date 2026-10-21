import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';
import { getProfile } from '@/server/services';
import type { ProfileDto } from '@/server/services/content-dto';

/**
 * ADR-045 — dev başlık fontu: Archivo, geniş (wdth 125), 800–900.
 *
 * KÖK layout'ta DEĞİL, burada: `next/font` fontu tanımlandığı layout'un
 * rotalarında ön yükler. Panel bu fontu hiç kullanmıyor; kökte tanımlansaydı
 * her panel sayfası 38 kB'lık bir dosyayı boşuna ön yüklerdi.
 * Kaynak ve altküme: `src/app/fonts/uret.py` (ADR-031 kalıbı).
 */
const archivoGenis = localFont({
  src: '../fonts/archivo-genis.woff2',
  weight: '800 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Arial',
  variable: '--font-archivo-genis',
});

/**
 * Alt bilgi için profil — OKUNAMAZSA `null`. `getProfile` profil satırı yoksa
 * fırlatıyor (ADR-017); layout'ta fırlamak `(public)/error.tsx`'e bile
 * ulaşmadan bütün siteyi düşürürdü. Ana sayfa aynı hatayı kendisi gösteriyor.
 */
async function altBilgiProfili(): Promise<ProfileDto | null> {
  try {
    return await getProfile();
  } catch {
    return null;
  }
}

/**
 * Public route group layout — §4.3, ADR-045.
 *
 * `site-koyu`: public site HER ZAMAN koyu (kullanıcı kararı, 2026-10-21). Kap,
 * koyu token'ları yeniden basıyor; tema çerezi panelde geçerliliğini koruyor.
 *
 * "İçeriğe geç" bağlantısı klavye kullanıcısının her sayfada menüyü tekrar
 * tekrar geçmesini engeller (K5 / WCAG 2.4.1). Odaklanana kadar görünmez.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const profil = await altBilgiProfili();

  return (
    <div
      className={`${archivoGenis.variable} site-koyu bg-canvas text-body flex min-h-dvh flex-col`}
    >
      <a
        data-yazdirmada-gizle
        href="#icerik"
        className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
      >
        İçeriğe geç
      </a>

      <Navbar />

      <main id="icerik" className="flex-1">
        {children}
      </main>

      <Footer profil={profil} />
    </div>
  );
}
