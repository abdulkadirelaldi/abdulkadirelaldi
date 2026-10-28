import Link from 'next/link';

import { BirincilBaglanti, ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import { YerelSaat } from '@/components/public/yerel-saat';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import type { ProfileDto } from '@/server/services/content-dto';

export type HeroProps = {
  dil: Dil;
  /** ADR-026 sözleşmesi. `headline` ünvan, `subtitle` kısa tanıtım. */
  profil: ProfileDto;
  /** Görünen isim — `ProfileDto`'da ad alanı yok, `SITE_NAME`'den gelir. */
  ad: string;
  /** Küçük kare portre (`public/`), yoksa `null` ve baş harfler çiziliyor. */
  avatar: string | null;
  /** Süren işler ("Kurum · Rol") — kartta "Şu an"; boşsa satır yok. */
  simdi: string[];
  /** Başlıca yetenekler — isminin üstündeki satır; boşsa satır yok. */
  yetenekler: string[];
};

/**
 * Ana sayfa hero'su — 2026-10-27 kurumsal tasarım.
 *
 * NEDEN DEĞİŞTİ: ADR-045 dili (harf harf yükselen dev isim, kontur soyad,
 * gradyan ünvan, nokta ızgarası ve yüzen küreler, `ben.ts` kod penceresi)
 * sahibine "şablon gibi, yapmacık" geldi. Şimdi solda isim ve ünvan, sağda
 * sade bir künye kartı. Hareket ölçülü (2026-10-28): öğeler 60–300 ms arayla
 * beliriyor, "Şu an" noktası nabız atıyor.
 *
 * LCP `<h1>` METNİ: sunucuda çiziliyor, görsel ya da animasyon beklemiyor.
 * Avatar 8 KB, ön yükleme yok (ekranın odağı değil).
 */
export function Hero({ dil, profil, ad, avatar, simdi, yetenekler }: HeroProps) {
  const h = sozluk(dil).hero;
  const [ilkAd = ad, ...kalan] = ad.split(' ');
  const soyad = kalan.join(' ');

  return (
    <section
      aria-labelledby="hero-baslik"
      className="border-line relative isolate overflow-hidden border-b pt-32 pb-16 md:pt-40 md:pb-24"
    >
      {/* Tek, durağan bir ışık — sağ üstten çok hafif vurgu; süs, metin yok. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_85%_0%,var(--accent-glow),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-8 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          {yetenekler.length > 0 && (
            <ul
              aria-label={h.yeteneklerEtiket}
              className="animate-belir text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            >
              {yetenekler.map((y, i) => (
                <li key={y} className="flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-line-strong">
                      ·
                    </span>
                  )}
                  {y}
                </li>
              ))}
            </ul>
          )}

          {/* LCP öğesi: yalnızca KAYMA (`sayfa-giris`), opaklık yok — globals.css notu. */}
          <h1
            id="hero-baslik"
            className="dev-baslik text-primary animate-sayfa-giris text-5xl [animation-delay:60ms] md:text-6xl"
          >
            {ad}
          </h1>

          <div className="animate-belir flex max-w-2xl flex-col gap-3 [animation-delay:140ms]">
            <p className="text-accent text-lg font-semibold md:text-xl">{profil.headline}</p>
            {profil.subtitle && (
              <p className="text-body text-base leading-relaxed md:text-lg">{profil.subtitle}</p>
            )}
          </div>

          <div className="animate-belir flex flex-wrap items-center gap-3 pt-2 [animation-delay:220ms]">
            <BirincilBaglanti href={yol(dil, 'iletisim')}>{h.cta}</BirincilBaglanti>
            <Link href={yol(dil, 'projeler')} className={ikincilSiniflari('md')}>
              {h.projeler}
            </Link>
            <Link href={yol(dil, 'cv')} className={ikincilSiniflari('md')}>
              {h.cv}
            </Link>
          </div>
        </div>

        <figure
          aria-label={h.kartEtiket}
          className="animate-belir border-line bg-canvas rounded-card min-w-0 border p-6 shadow-sm [animation-delay:300ms]"
        >
          <figcaption className="flex items-center gap-4">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- `public/`ten statik 8 KB kare; next/image standalone imaja `sharp` ister
              <img
                src={avatar}
                alt=""
                width={64}
                height={64}
                decoding="async"
                className="bg-surface size-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="bg-accent flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
              >
                {ilkAd[0]}
                {soyad[0] ?? ''}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="text-primary truncate font-semibold">{ad}</span>
              {profil.location && (
                <span className="text-muted truncate text-sm">{profil.location}</span>
              )}
            </span>
          </figcaption>

          <dl className="border-line mt-6 flex flex-col gap-4 border-t pt-6 text-sm">
            {simdi.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted flex items-center gap-2">
                  {/* Süren iş var → canlı nokta. Süs; bilgi metinde. */}
                  <span
                    aria-hidden="true"
                    className="bg-success animate-nabiz size-2 shrink-0 rounded-full"
                  />
                  {h.kartSimdi}
                </dt>
                {simdi.map((is) => (
                  <dd key={is} className="text-primary">
                    {is}
                  </dd>
                ))}
              </div>
            )}
            {profil.location && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{h.kartKonum}</dt>
                <dd className="text-primary text-right">{profil.location}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{h.kartSaat}</dt>
              <dd className="text-primary">
                <YerelSaat />
              </dd>
            </div>
          </dl>
        </figure>
      </div>
    </section>
  );
}
