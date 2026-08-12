'use client';

import Link from 'next/link';

import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from '@/components/icons/social';
import {
  Aurora,
  BlurText,
  GlassIcons,
  RotatingText,
  ShinyText,
  StarBorder,
} from '@/components/reactbits/lazy';
import { buttonClasses } from '@/components/ui/button';
import type { ProfileDto } from '@/server/services/content-dto';

/** Marka ikonu bulunan ağlar. `ProfileDto.socials` daha fazlasını taşıyabilir. */
export type SosyalAg = 'github' | 'linkedin' | 'x' | 'instagram';

export type HeroProps = {
  /** ADR-026 sözleşmesi. `headline` rozet, `subtitle` özet olarak kullanılır. */
  profil: ProfileDto;
  /** Görünen isim — `ProfileDto`'da ad alanı yok, `SITE_NAME`'den gelir. */
  ad: string;
  /** RotatingText'in döndüreceği ünvanlar. İlki `<h1>`'de de geçer. */
  unvanlar: string[];
};

const SOSYAL_TANIM: Record<SosyalAg, { etiket: string; Ikon: typeof GithubIcon }> = {
  github: { etiket: 'GitHub', Ikon: GithubIcon },
  linkedin: { etiket: 'LinkedIn', Ikon: LinkedinIcon },
  x: { etiket: 'X', Ikon: XIcon },
  instagram: { etiket: 'Instagram', Ikon: InstagramIcon },
};

/**
 * Ana sayfa hero'su — §5.1'in bileşen haritası (ADR-025 ile güncel).
 *
 * WEBGL: Aurora sayfanın TEK WebGL bileşenidir (§5.2.2) ve yalnızca
 * masaüstü + koyu tema + hareket açıkken yüklenir; diğer üç durumda `lazy.tsx`
 * statik gradienti koyar (T-020b ölçümü). Bu bileşen o kararı TEKRARLAMAZ,
 * sarmalayıcıya bırakır — kural tek yerde yaşasın.
 *
 * Metin katmanı `relative z-10` ile arka planın ÜSTÜNDE; hero kabı `isolate`
 * olduğu için z-index'ler sayfanın geri kalanına sızmaz.
 */
export function Hero({ profil, ad, unvanlar }: HeroProps) {
  const sosyal = profil.socials ?? {};

  const sosyalListe = (Object.keys(SOSYAL_TANIM) as SosyalAg[])
    .map((anahtar) => ({ anahtar, adres: sosyal[anahtar], ...SOSYAL_TANIM[anahtar] }))
    .filter((girdi): girdi is typeof girdi & { adres: string } => Boolean(girdi.adres));

  return (
    <section
      aria-labelledby="hero-baslik"
      className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden"
    >
      <Aurora opacity={0.45} />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16">
        {/*
          CLS = 0 için her tembel yuvaya SON YÜKSEKLİĞİ kadar yer ayrılıyor.
          `lazy.tsx`'in iskeletleri genel ölçülü; buradaki gerçek ölçüler
          tarayıcıda ölçülüp yazıldı (rozet 30px, isim 45/75px, ünvan 28px,
          sosyal 120px). İskelet → bileşen geçişinde kutu büyümüyor.
        */}
        <div className="min-h-8">
          <ShinyText
            text={profil.headline}
            className="border-line bg-surface/70 rounded-pill border px-3 py-1 text-sm font-medium backdrop-blur-sm"
            speed={3}
          />
        </div>

        <h1 id="hero-baslik" className="sr-only">
          {ad} — {unvanlar[0]}
        </h1>

        {/*
          BlurText bir <p> üretiyor; başlık semantiği yukarıdaki görünmez <h1>'de.
          Böylece ekran okuyucu tek ve tam bir başlık duyar, görsel katman ise
          animasyonlu kalır (§5.1 "tek seferlik, sayfa yüklemede").
        */}
        <div className="min-h-12 md:min-h-20">
          <BlurText
            text={ad}
            animateBy="words"
            delay={90}
            className="font-display text-primary text-4xl leading-tight font-bold md:text-6xl"
          />
        </div>

        <p className="text-body flex min-h-8 flex-wrap items-center gap-2 text-lg md:text-xl">
          <span>Ben bir</span>
          <RotatingText
            texts={unvanlar}
            mainClassName="text-accent-soft font-medium"
            rotationInterval={2800}
          />
        </p>

        {profil.subtitle && <p className="text-body max-w-2xl text-balance">{profil.subtitle}</p>}

        {/*
          Mobilde ALT ALTA: iskelet gerçek butondan geniş olduğu için satır
          kırılıyor, bileşen gelince tek satıra düşüyordu — ölçülen CLS 0.19.
          Dikey dizilim yüksekliği iki durumda da aynı tutuyor; yan kazanç
          olarak dokunma hedefi tam genişlik oluyor.
        */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <StarBorder as="div" speed="6s" className="w-full cursor-default sm:w-auto">
            <Link
              href="/projeler"
              prefetch={false}
              className="focus-ring rounded-btn block w-full text-center"
            >
              Projelerimi gör
            </Link>
          </StarBorder>

          <Link
            href="/iletisim"
            prefetch={false}
            className={buttonClasses({
              variant: 'secondary',
              size: 'lg',
              className: 'w-full sm:w-auto',
            })}
          >
            Benimle çalış
          </Link>
        </div>

        {sosyalListe.length > 0 && (
          <nav aria-label="Sosyal hesaplar" className="mt-2 min-h-30">
            <GlassIcons
              className="!mx-0 grid-cols-4 !gap-8 !py-6 md:grid-cols-4"
              items={sosyalListe.map(({ etiket, adres, Ikon }) => ({
                icon: <Ikon title="" aria-hidden />,
                color: 'accent',
                label: etiket,
                href: adres,
              }))}
            />
          </nav>
        )}
      </div>
    </section>
  );
}
