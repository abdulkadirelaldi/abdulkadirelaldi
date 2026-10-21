import { headers } from 'next/headers';
import localFont from 'next/font/local';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';
import { DIL_BASLIGI, dilMi, VARSAYILAN_DIL, type Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import { analitikAyari } from '@/lib/analitik';
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
async function altBilgiProfili(dil: Dil): Promise<ProfileDto | null> {
  try {
    return await getProfile(dil);
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
  // ADR-046 — layout `[dil]` parametresini görmüyor (o, sayfa ağacında daha
  // aşağıda); dili middleware'in istek başlığından okuyor.
  const istek = await headers();
  const dilBasligi = istek.get(DIL_BASLIGI);
  const dil = dilMi(dilBasligi) ? dilBasligi : VARSAYILAN_DIL;
  const s = sozluk(dil);
  const profil = await altBilgiProfili(dil);
  // Analitik YALNIZCA public sitede (panel ölçülmez) ve yalnızca yapılandırıldıysa.
  const analitik = analitikAyari();
  const nonce = analitik ? (istek.get('x-nonce') ?? undefined) : undefined;

  return (
    <div
      className={`${archivoGenis.variable} site-koyu bg-canvas text-body flex min-h-dvh flex-col`}
    >
      <a
        data-yazdirmada-gizle
        href="#icerik"
        className="focus-ring rounded-btn bg-elevated text-primary sr-only px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100"
      >
        {s.site.icerigeGec}
      </a>

      <Navbar dil={dil} metin={{ nav: s.nav, sayfaAdi: s.sayfaAdi }} />

      <main id="icerik" className="flex-1">
        {children}
      </main>

      <Footer profil={profil} dil={dil} />

      {analitik && (
        // `afterInteractive`: ölçüm betiği ilk boyamayı ve LCP'yi beklemez.
        // Nonce middleware'den — CSP `'strict-dynamic'` nonce'suz betiği reddeder.
        <Script
          src={analitik.betik}
          data-website-id={analitik.siteId}
          strategy="afterInteractive"
          nonce={nonce}
        />
      )}
    </div>
  );
}
