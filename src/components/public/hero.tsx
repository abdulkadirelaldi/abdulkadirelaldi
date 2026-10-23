import Link from 'next/link';

import { GradyanBaglanti, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { HarfHarf } from '@/components/public/tasarim/harf-harf';
import { ParlakHalka, ParlakKure } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
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
  /** Süren işler ("Kurum · Rol") — penceredeki `şimdi` dizisi; boşsa satır yok. */
  simdi: string[];
  /** Başlıca yetenekler — isminin üstündeki satır; boşsa satır yok. */
  yetenekler: string[];
};

/**
 * Ana sayfa hero'su — 2026-10-23 yeniden tasarım.
 *
 * NEDEN DEĞİŞTİ: ortadaki büyük portre ve onun giriş animasyonu sahibinin
 * beğenmediği yerdi; ayrıca sayfanın LCP öğesiydi (88 KB, mobil LCP 3 sn).
 * Yeni düzen sitenin geri kalanıyla AYNI dili konuşuyor:
 *
 *   - Solda dev isim (ADR-045 tipografisi): ad DOLU, soyad KONTUR — tıpkı
 *     bölüm başlıklarının dolu/kontur ikiliği.
 *   - Sağda proje kartlarındaki kod künyesinin akrabası bir "ben.ts"
 *     penceresi: odak, SÜREN işler (deneyim kayıtlarından — soldaki alt
 *     başlığı tekrar etmesin), konum, canlı saat. Portre burada KÜÇÜK, yuvarlak bir avatar.
 *
 * LCP artık `<h1>` METNİ: görsel beklemiyor, sunucuda çiziliyor. Avatar 8 KB,
 * ön yükleme YOK (ekranın odağı değil).
 *
 * ERİŞİLEBİLİRLİK: görsel harfler `aria-hidden`; `<h1>` adını `sr-only`
 * metinden alıyor. Kod penceresi bir `<figure>` — ekran okuyucu onu
 * "kısa künye" diye duyar, içindeki noktalama gürültüsünü değil (`aria-label`).
 */
export function Hero({ dil, profil, ad, avatar, simdi, yetenekler }: HeroProps) {
  const s = sozluk(dil);
  const h = s.hero;
  const [ilkAd = ad, ...kalan] = ad.split(' ');
  const soyad = kalan.join(' ');

  // Ünvan "A · B · C" biçiminde (ADR-026): pencerede dizi olarak.
  const odak = profil.headline
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      aria-labelledby="hero-baslik"
      className="relative isolate flex min-h-dvh flex-col overflow-hidden pt-28 md:pt-32"
    >
      {/* Zemin: ince nokta ızgarası + iki yumuşak ışık. Süs, metin yok. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] [background-size:28px_28px]" />
        <div className="bg-accent/20 absolute -top-48 -left-24 size-[40rem] rounded-full blur-[140px]" />
        <div className="absolute right-0 bottom-0 size-[28rem] rounded-full bg-[color-mix(in_oklab,var(--sekil-pembe)_16%,transparent)] blur-[120px]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 pb-14 md:px-8 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:pb-20">
        {/* ---------------------------------------------------------- SOL */}
        <div className="flex min-w-0 flex-col gap-7">
          <p className="tabular text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.72rem]">
            <span>
              <span className="text-accent-soft">{s.site.terminalKullanici}</span>:~${' '}
              <span className="text-primary">whoami</span>
              <span
                aria-hidden="true"
                className="bg-accent-soft ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-pulse"
              />
            </span>
            {/*
              BAŞLICA YETENEKLER — 2026-10-23'e kadar burada "durum" satırı vardı
              (staja/işe açık); sahibinin isteğiyle yerini yetenekler aldı. Durum
              bilgisi iletişim bölümünde duruyor.
            */}
            {yetenekler.length > 0 && (
              <span
                role="list"
                aria-label={h.yeteneklerEtiket}
                className="border-line text-body flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1 tracking-[0.08em]"
              >
                {yetenekler.map((y, i) => (
                  <span key={y} role="listitem" className="flex items-center gap-2">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-accent-soft">
                        ·
                      </span>
                    )}
                    {y}
                  </span>
                ))}
              </span>
            )}
          </p>

          <h1
            id="hero-baslik"
            className="dev-baslik text-primary text-[clamp(2.4rem,10.4vw,5.5rem)] lg:text-[clamp(3.25rem,5.1vw,6rem)]"
          >
            <span className="sr-only">
              {ad} — {profil.headline}
            </span>
            <HarfHarf metin={ilkAd} className="block" aralik={0.025} />
            {soyad && (
              <HarfHarf
                metin={soyad}
                className="metin-kontur block"
                baslangic={0.12}
                aralik={0.025}
              />
            )}
          </h1>

          <div className="animate-sayfa-giris flex max-w-xl flex-col gap-3 [animation-delay:0.15s]">
            <p className="text-gradient-vurgu text-sm font-semibold tracking-[0.16em] uppercase md:text-base">
              {profil.headline}
            </p>
            {profil.subtitle && (
              <p className="text-body text-sm leading-relaxed md:text-base">{profil.subtitle}</p>
            )}
          </div>

          <div className="animate-sayfa-giris flex flex-wrap items-center gap-3 [animation-delay:0.25s]">
            <GradyanBaglanti href={yol(dil, 'iletisim')}>{h.cta}</GradyanBaglanti>
            <Link href={yol(dil, 'projeler')} className={hapSiniflari('h-11')}>
              {h.projeler}
            </Link>
          </div>
        </div>

        {/* ---------------------------------------------------------- SAĞ */}
        <div className="animate-sayfa-giris relative min-w-0 [animation-delay:0.2s]">
          <div
            aria-hidden="true"
            className="bg-accent/25 absolute inset-[12%] -z-10 rounded-full blur-[90px]"
          />

          <figure
            aria-label={h.pencereEtiket}
            className="bg-surface/85 border-line overflow-hidden rounded-[1.75rem] border shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] backdrop-blur-md"
          >
            {/* Pencere başlığı: avatar + kimlik + dosya adı. */}
            <figcaption className="border-line flex items-center gap-3 border-b px-5 py-4">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- `public/`ten statik 8 KB kare; next/image standalone imaja `sharp` ister
                <img
                  src={avatar}
                  alt=""
                  width={48}
                  height={48}
                  decoding="async"
                  className="ring-accent/50 size-12 shrink-0 rounded-full bg-[var(--bg-base)] object-cover ring-2"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="bg-gradient-vurgu dev-baslik flex size-12 shrink-0 items-center justify-center rounded-full text-sm text-white"
                >
                  {ilkAd[0]}
                  {soyad[0] ?? ''}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="text-primary truncate text-sm font-semibold">{ad}</span>
                {profil.location && (
                  <span className="text-muted truncate text-xs">{profil.location}</span>
                )}
              </span>
              <span className="tabular text-muted ml-auto hidden text-[0.7rem] sm:inline">
                {h.dosya}
              </span>
            </figcaption>

            <pre className="tabular text-muted px-5 py-5 text-[0.74rem] leading-[1.75] break-words whitespace-pre-wrap md:px-6 md:text-[0.8rem]">
              <code>
                <span className="text-accent-soft">const</span>{' '}
                <span className="text-primary">{h.kodDegisken}</span> = {'{'}
                {'\n'}
                <Satir anahtar={h.kodOdak} degerler={odak} />
                <Satir anahtar={h.kodSimdi} degerler={simdi} />
                {profil.location && <Satir anahtar={h.kodKonum} deger={profil.location} />}
                {'  '}
                {h.kodSaat}: <span className="text-warning">&apos;</span>
                <span className="text-warning">
                  <YerelSaat />
                </span>
                <span className="text-warning">&apos;</span>,{'\n'}
                {'}'};
              </code>
            </pre>
          </figure>

          {/* Küçük süsler pencerenin kenarlarında — odak değil, derinlik. */}
          <Yuzen hiz={-90} className="-top-8 -right-6 hidden w-20 md:block">
            <ParlakKure className="w-full" renk="var(--sekil-turuncu)" />
          </Yuzen>
          <Yuzen hiz={-140} gecikme={1.2} className="-right-4 -bottom-14 hidden w-16 md:block">
            <ParlakHalka className="w-full" />
          </Yuzen>
        </div>
      </div>

      {/* Kaydırma işareti — yalnızca geniş ekranda, hero'nun alt boşluğunda. Süs. */}
      <div
        aria-hidden="true"
        className="border-line-strong absolute bottom-8 left-1/2 hidden h-10 w-6 -translate-x-1/2 justify-center rounded-full border pt-2 lg:flex"
      >
        <span className="bg-accent-soft h-2 w-1 animate-bounce rounded-full" />
      </div>
    </section>
  );
}

/** Kod penceresinde tek satır — dizi ya da tek değer; boşsa satır YOK. */
function Satir({
  anahtar,
  degerler,
  deger,
}: {
  anahtar: string;
  degerler?: string[];
  deger?: string;
}) {
  if (degerler && degerler.length === 0) return null;
  return (
    <span>
      {'  '}
      {anahtar}:{' '}
      {degerler ? (
        <>
          [
          {degerler.map((d, i) => (
            <span key={d}>
              {i > 0 && ', '}
              <span className="text-success">&apos;{d}&apos;</span>
            </span>
          ))}
          ]
        </>
      ) : (
        <span className="text-success">&apos;{deger}&apos;</span>
      )}
      ,{'\n'}
    </span>
  );
}
