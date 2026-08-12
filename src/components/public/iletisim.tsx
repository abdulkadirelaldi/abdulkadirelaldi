'use client';

import { CircleDot, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';

import { GithubIcon, LinkedinIcon, XIcon } from '@/components/icons/social';
import { BolumGiris } from '@/components/public/bolum-giris';
import { SpotlightCard } from '@/components/reactbits/lazy';
import { buttonClasses } from '@/components/ui/button';
import type { ProfileDto } from '@/server/services/content-dto';

export type IletisimProps = {
  /** ADR-026 sözleşmesi. `location`, `availability`, `socials` buradan okunur. */
  profil: ProfileDto;
};

/**
 * "İletişim" bölümü — §4.1.
 *
 * ADR-025 SAPMASI: §5.1 burada `MagicBento` diyordu; gsap reddedilince yerine
 * `SpotlightCard` ızgarası kondu. Tam görsel karşılığı yok — bento'nun asimetrik
 * düzeni ve parçacık katmanı gitti — ama etkileşim (imleci takip eden ışık) ve
 * bilgi mimarisi korundu.
 *
 * FORM BURADA YOK (T-026): honeypot, zaman tuzağı ve hız sınırı (§8.15) tek
 * yerde, `/iletisim` sayfasında yaşayacak. Ana sayfanın işi yönlendirmek.
 *
 * Yalnızca DOLU alanlar kart üretir: `location`/`availability` `null` olabilir,
 * boş bir kart göstermek bilgi vermez.
 */
export function Iletisim({ profil }: IletisimProps) {
  const sosyal = profil.socials ?? {};
  const eposta = sosyal.email;

  const kartlar = [
    eposta && {
      anahtar: 'eposta',
      Ikon: Mail,
      baslik: 'E-posta',
      icerik: (
        <a
          href={`mailto:${eposta}`}
          className="focus-ring text-accent-soft rounded-btn text-sm break-all"
        >
          {eposta}
        </a>
      ),
    },
    profil.location && {
      anahtar: 'konum',
      Ikon: MapPin,
      baslik: 'Konum',
      icerik: <p className="text-body text-sm">{profil.location}</p>,
    },
    profil.availability && {
      anahtar: 'durum',
      Ikon: CircleDot,
      baslik: 'Durum',
      icerik: <p className="text-body text-sm">{profil.availability}</p>,
    },
  ].filter((kart): kart is Exclude<typeof kart, false | '' | undefined | null> => Boolean(kart));

  const sosyalBaglantilar = [
    sosyal.github && {
      anahtar: 'github',
      etiket: 'GitHub',
      adres: sosyal.github,
      Ikon: GithubIcon,
    },
    sosyal.linkedin && {
      anahtar: 'linkedin',
      etiket: 'LinkedIn',
      adres: sosyal.linkedin,
      Ikon: LinkedinIcon,
    },
    sosyal.x && { anahtar: 'x', etiket: 'X', adres: sosyal.x, Ikon: XIcon },
  ].filter((b): b is Exclude<typeof b, false | '' | undefined | null> => Boolean(b));

  return (
    <section id="iletisim" aria-labelledby="iletisim-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-col gap-3">
          <p className="tabular text-accent-soft text-xs tracking-wider uppercase">06 — İletişim</p>
          <h2 id="iletisim-baslik" className="text-3xl md:text-4xl">
            Konuşalım
          </h2>
        </BolumGiris>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <BolumGiris className="md:col-span-1">
            <SpotlightCard className="flex h-full flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-primary text-base font-semibold">Bir fikrin mi var?</h3>
                <p className="text-muted text-sm">
                  Kısaca yaz, ne yapmak istediğini birlikte netleştirelim. Genelde bir gün içinde
                  dönüyorum.
                </p>
              </div>

              <Link
                href="/iletisim"
                prefetch={false}
                className={buttonClasses({ size: 'sm', className: 'mt-auto self-start' })}
              >
                İletişim formunu aç
              </Link>
            </SpotlightCard>
          </BolumGiris>

          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            {kartlar.map((kart, sira) => (
              <BolumGiris key={kart.anahtar} gecikme={0.06 + sira * 0.06}>
                <SpotlightCard className="flex h-full flex-col gap-2">
                  <div className="text-muted flex items-center gap-2">
                    <kart.Ikon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-xs tracking-wider uppercase">{kart.baslik}</span>
                  </div>
                  {kart.icerik}
                </SpotlightCard>
              </BolumGiris>
            ))}

            {sosyalBaglantilar.length > 0 && (
              <BolumGiris gecikme={0.06 + kartlar.length * 0.06} className="sm:col-span-2">
                <SpotlightCard className="flex flex-col gap-3">
                  <span className="text-muted text-xs tracking-wider uppercase">Sosyal</span>
                  <ul className="flex flex-wrap gap-3">
                    {sosyalBaglantilar.map(({ anahtar, etiket, adres, Ikon }) => (
                      <li key={anahtar}>
                        <a
                          href={adres}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring border-line bg-elevated text-body hover:text-primary hover:border-line-hover ease-brand duration-micro rounded-pill inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors"
                        >
                          <Ikon title="" aria-hidden className="size-4" />
                          {etiket}
                        </a>
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              </BolumGiris>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
