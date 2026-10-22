import Link from 'next/link';
import { preload } from 'react-dom';

import { GradyanBaglanti, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { HarfHarf } from '@/components/public/tasarim/harf-harf';
import { ParlakGlif, ParlakHalka, ParlakKure } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { YerelSaat } from '@/components/public/yerel-saat';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { cn } from '@/lib/utils/cn';
import type { ProfileDto } from '@/server/services/content-dto';

export type HeroProps = {
  dil: Dil;
  /** ADR-026 sözleşmesi. `headline` ünvan, `subtitle` kısa tanıtım. */
  profil: ProfileDto;
  /** Görünen isim — `ProfileDto`'da ad alanı yok, `SITE_NAME`'den gelir. */
  ad: string;
  /**
   * Portrenin `public/` altındaki adresi (+ varsa küçük kopya); dosya yoksa
   * `null` ve yerine parlak küre çiziliyor (bkz. `app/(public)/page.tsx`).
   */
  avatar: { src: string; srcSet?: string } | null;
};

/**
 * Ana sayfa hero'su — ADR-045 (örnekteki "HI, I'M ALEX").
 *
 * SUNUCU BİLEŞENİ: giriş animasyonu saf CSS (`HarfHarf`), yani başlık JS'i
 * beklemeden ilk boyamada çiziliyor — LCP adayı bu blok. İstemciye inen tek
 * parçalar yüzen süsler ve yerel saat.
 *
 * BAŞLIK: görsel harfler `aria-hidden`; `<h1>` erişilebilir adını `sr-only`
 * metinden alıyor — ekran okuyucu "M-E-R-H-A-B-A" değil, tam cümleyi duyar.
 *
 * AVATAR: başlığın ÖNÜNDE, alt ortada; ismin üstüne biniyor (örnekteki gibi).
 * Dosya yoksa parlak küre + kod imi — "eksik görsel" değil, kasıtlı bir süs.
 */
/**
 * Görüntülenen genişlik: yükseklik `min(58dvh, 40rem)` × en/boy (900/1120).
 * Mobilde BİLEREK küçük yazılıyor (340px): gerçek genişlik ~380px ve 1.75
 * DPR'de tarayıcı 900w'yi seçiyordu (86 kB). Küçük kopya 720×896 — en/boy
 * oranı 900×1120 ile BİREBİR (600w'de 747 piksele yuvarlanınca Lighthouse
 * `image-aspect-ratio` uyarısı veriyordu); bu görsel mobil LCP öğesi.
 */
const AVATAR_SIZES = '(max-width: 767px) 340px, min(47vh, 515px)';

export function Hero({ dil, profil, ad, avatar }: HeroProps) {
  const s = sozluk(dil);
  // LCP öğesi: <head>'de, en yüksek öncelikle — gövdedeki <img>'i beklemeden
  // ve fontlarla yarışmadan inmeye başlasın.
  if (avatar) {
    preload(avatar.src, {
      as: 'image',
      fetchPriority: 'high',
      imageSrcSet: avatar.srcSet,
      imageSizes: avatar.srcSet ? AVATAR_SIZES : undefined,
    });
  }
  const [ilkAd] = ad.split(' ');

  return (
    <section
      aria-labelledby="hero-baslik"
      className="relative isolate flex min-h-dvh flex-col overflow-hidden pt-24 md:pt-28"
    >
      {/* Zemin: ince nokta ızgarası + iki yumuşak ışık. Süs, metin yok. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] [background-size:28px_28px]" />
        <div className="bg-accent/25 absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full blur-[140px]" />
        <div className="absolute right-0 bottom-0 size-[28rem] rounded-full bg-[color-mix(in_oklab,var(--sekil-pembe)_18%,transparent)] blur-[120px]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 md:px-8">
        <h1 id="hero-baslik" className="dev-baslik text-primary text-center">
          <span className="sr-only">
            {s.hero.selam} {ad} — {profil.headline}
          </span>
          <HarfHarf
            metin={s.hero.selam}
            className="block text-[clamp(1.75rem,6.6vw,6.25rem)]"
            baslangic={0}
            aralik={0.02}
          />
          <HarfHarf
            metin={ilkAd ?? ad}
            className="block text-[clamp(2.25rem,9.4vw,8.5rem)]"
            baslangic={0.12}
            aralik={0.025}
          />
        </h1>

        {/* ÜSTE yaslı (justify-start): portre her ekran yüksekliğinde ismin altına
            biniyor; boşluk kalırsa portre ile alt şerit arasında kalır, isimle değil. */}
        <div className="relative flex flex-1 flex-col items-center justify-start">
          {/* Avatar — başlığın ÜSTÜNE biniyor (negatif kenar boşluğu). */}
          <div
            className={cn(
              'animate-sayfa-giris relative z-10 -mt-[4vw] [animation-delay:0.1s] md:-mt-[6vw]',
              !avatar && 'w-[min(72vw,26rem)]',
            )}
          >
            {avatar ? (
              /*
                DİK PORTRE (şeffaf PNG'den WebP, 900×1120): yükseklikle
                ölçekleniyor ki alt şerit ekranın içinde kalsın. Alt kenar ve
                omuzların DÜZ kesildiği yan kenarlar zemine eriyor (iki maskenin
                kesişimi) — gövde sahnenin içinden çıkıyormuş gibi. Yüksekliğin
                üçüncü sınırı ekran GENİŞLİĞİNDEN türüyor (×1120/900): dar ekranda
                `max-width: 100%` genişliği kısıp yüksekliği sabit bırakınca portre
                hafifçe ESNİYORDU (Lighthouse `image-aspect-ratio` ölçtü). Arkadaki
                vurgu ışığı portreyi koyu zeminden ayırıyor. `alt` boş: başlık
                zaten ismi söylüyor, görsel bilgi değil süs.
              */
              <>
                <div
                  aria-hidden="true"
                  className="bg-accent/35 absolute inset-x-[10%] top-[18%] bottom-0 -z-10 rounded-full blur-[90px]"
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- `public/`ten statik, ölçüsü sabit; next/image optimizasyonu standalone imaja `sharp` ister */}
                <img
                  src={avatar.src}
                  srcSet={avatar.srcSet}
                  sizes={avatar.srcSet ? AVATAR_SIZES : undefined}
                  alt=""
                  width={900}
                  height={1120}
                  fetchPriority="high"
                  decoding="async"
                  className="mx-auto h-[min(58dvh,40rem,calc((100vw-2rem)*1.2444))] w-auto [mask-image:linear-gradient(to_bottom,black_70%,transparent),linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] [mask-composite:intersect]"
                />
              </>
            ) : (
              <div className="relative mx-auto aspect-square w-[80%]">
                <ParlakKure className="w-full" renk="var(--accent)" />
                <ParlakGlif
                  glif="</>"
                  className="absolute inset-0 flex items-center justify-center text-[clamp(3rem,9vw,7rem)]"
                />
              </div>
            )}
          </div>

          <Yuzen
            hiz={-160}
            className="bottom-[12%] left-[4%] w-14 md:top-[8%] md:bottom-auto md:left-[6%] md:w-24"
          >
            <ParlakHalka className="w-full" />
          </Yuzen>
          <Yuzen
            hiz={-90}
            gecikme={1.2}
            className="top-[30%] right-[3%] w-14 md:right-[8%] md:w-20"
          >
            <ParlakKure className="w-full" renk="var(--sekil-turuncu)" />
          </Yuzen>
        </div>

        {/* Alt şerit: solda tanıtım, sağda eylemler — örnekteki yerleşim. */}
        <div className="animate-sayfa-giris relative z-20 grid gap-6 pt-6 pb-8 [animation-delay:0.25s] md:grid-cols-[1fr_auto_1fr] md:items-end md:pb-10">
          <div className="flex max-w-xs flex-col gap-2">
            <p className="text-primary text-[0.7rem] leading-relaxed font-semibold tracking-[0.16em] uppercase">
              {profil.headline}
            </p>
            {profil.subtitle && (
              <p className="text-muted text-xs leading-relaxed">{profil.subtitle}</p>
            )}
          </div>

          <p className="tabular text-muted order-last flex items-center justify-center gap-3 text-[0.7rem] tracking-[0.14em] uppercase md:order-none">
            {profil.availability && (
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="relative flex size-2">
                  <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                  <span className="bg-success relative inline-flex size-2 rounded-full" />
                </span>
                {profil.availability}
              </span>
            )}
            <span className="hidden sm:inline">
              {profil.location && <>{profil.location.split(',')[0]} · </>}
              <YerelSaat />
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link href={yol(dil, 'projeler')} className={hapSiniflari()}>
              {s.hero.projeler}
            </Link>
            <GradyanBaglanti href={yol(dil, 'iletisim')}>{s.hero.cta}</GradyanBaglanti>
          </div>
        </div>
      </div>
    </section>
  );
}
