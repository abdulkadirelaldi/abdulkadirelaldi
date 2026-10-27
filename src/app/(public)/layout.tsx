import { headers } from 'next/headers';
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
 * `site-kurumsal`: public site HER ZAMAN açık, kurumsal tema (kullanıcı kararı,
 * 2026-10-27; önceki koyu ADR-045 dili "şablon gibi" bulundu). Kap kendi
 * token'larını basıyor; tema çerezi panelde geçerliliğini koruyor.
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
    <div className="site-kurumsal bg-canvas text-body flex min-h-dvh flex-col">
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
