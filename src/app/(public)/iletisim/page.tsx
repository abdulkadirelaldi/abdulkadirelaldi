import { CircleDot, Mail, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

import { GithubIcon, LinkedinIcon, XIcon } from '@/components/icons/social';
import { IletisimFormu } from '@/components/public/iletisim-formu';
import { getProfile } from '@/server/services';

export const metadata: Metadata = {
  title: 'İletişim',
  description:
    'Bir fikrin varsa yaz: e-posta, sosyal hesaplar veya iletişim formu. Genelde bir gün içinde dönüyorum.',
};

/**
 * /iletisim — §4.1.
 *
 * SUNUCU BİLEŞENİ; tek istemci yaprağı `IletisimFormu` (doğrulama için gerekli).
 *
 * YALNIZCA DOLU ALANLAR KART ÜRETİR (T-022 kalıbı): `location` ve
 * `availability` `null` olabilir; boş bir kart bilgi vermez, yer kaplar.
 */
export default async function IletisimSayfasi() {
  const profil = await getProfile();
  const sosyal = profil.socials ?? {};
  const eposta = sosyal.email;

  const kartlar = [
    eposta && {
      anahtar: 'eposta',
      Ikon: Mail,
      baslik: 'E-posta',
      icerik: (
        <a href={`mailto:${eposta}`} className="focus-ring link rounded-btn text-sm break-all">
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
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">İletişim</p>
        <h1 className="text-3xl md:text-5xl">Konuşalım</h1>
        <p className="text-body max-w-2xl text-lg">
          Bir fikrin, bir işin ya da bir sorun mu var? Kısaca yaz, birlikte netleştirelim. Genelde
          bir gün içinde dönüyorum.
        </p>
      </header>

      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="form-baslik" className="flex flex-col gap-5">
          <h2 id="form-baslik" className="text-2xl">
            Mesaj gönder
          </h2>

          {/* Uyarı metni gerçek veriye bağlı: e-posta yoksa e-posta önerilmiyor. */}
          <IletisimFormu eposta={eposta ?? null} />
        </section>

        <section aria-labelledby="dogrudan-baslik" className="flex flex-col gap-4">
          <h2 id="dogrudan-baslik" className="text-2xl">
            Doğrudan
          </h2>

          {kartlar.length > 0 && (
            <dl className="flex flex-col gap-3">
              {kartlar.map((kart) => (
                <div
                  key={kart.anahtar}
                  className="border-line bg-surface/60 rounded-card flex flex-col gap-1.5 border p-4"
                >
                  <dt className="text-muted flex items-center gap-2 text-xs tracking-wider uppercase">
                    <kart.Ikon className="size-4 shrink-0" aria-hidden="true" />
                    {kart.baslik}
                  </dt>
                  <dd>{kart.icerik}</dd>
                </div>
              ))}
            </dl>
          )}

          {sosyalBaglantilar.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-muted text-xs tracking-wider uppercase">Sosyal</p>
              <ul className="flex flex-wrap gap-2">
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
