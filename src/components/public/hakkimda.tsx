import { BolumGiris } from '@/components/public/bolum-giris';
import { GradyanBaglanti } from '@/components/public/tasarim/gradyan-baglanti';
import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { ParlakGlif, ParlakHalka, ParlakKure } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { CountUp } from '@/components/reactbits/lazy';
import type { ProfileDto } from '@/server/services/content-dto';
import type { SiteStatsDto } from '@/server/services/_shared/stats';

type Kart = { deger: number; sonek?: string; etiket: string };

export type HakkimdaProps = {
  profil: ProfileDto;
  istatistikler: SiteStatsDto;
};

/** Sıfır değerli istatistik ÇİZİLMEZ — "0 yıl deneyim" kendine zarar verir. */
function kartlar({ experienceYears, publishedProjects }: SiteStatsDto): Kart[] {
  return [
    experienceYears > 0 && { deger: experienceYears, sonek: '+', etiket: 'yıl deneyim' },
    publishedProjects > 0 && { deger: publishedProjects, etiket: 'yayınlanan proje' },
  ].filter((kart): kart is Kart => Boolean(kart));
}

/**
 * Ana sayfa "Hakkımda" — ADR-045 (örnekteki "ABOUT ME").
 *
 * Kontur başlık kaydırdıkça doluyor; iki yanda parlak süsler farklı hızlarda
 * süzülüyor (paralaks derinliği). Biyografinin İLK paragrafı ortada — tamamı
 * /hakkimda'da.
 */
export function Hakkimda({ profil, istatistikler }: HakkimdaProps) {
  const [ilkParagraf] = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const istatistikKartlari = kartlar(istatistikler);

  return (
    <section
      id="hakkimda"
      aria-labelledby="hakkimda-baslik"
      className="relative isolate overflow-hidden pt-28 pb-36 md:pt-40 md:pb-52"
    >
      <Yuzen hiz={-200} className="top-24 left-[3%] w-20 md:left-[8%] md:w-32">
        <ParlakGlif glif="{ }" className="text-[4.5rem] md:text-[7rem]" />
      </Yuzen>
      <Yuzen hiz={-120} gecikme={1} className="top-16 right-[4%] w-16 md:right-[10%] md:w-28">
        <ParlakKure className="w-full" renk="var(--sekil-mor)" />
      </Yuzen>
      <Yuzen hiz={-260} gecikme={0.5} className="bottom-20 left-[12%] hidden w-24 md:block">
        <ParlakHalka className="w-full" />
      </Yuzen>
      <Yuzen hiz={-60} gecikme={1.6} className="right-[8%] bottom-28 w-14 md:w-20">
        <ParlakKure className="w-full" renk="var(--sekil-pembe)" />
      </Yuzen>

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-4 text-center">
        <KonturBaslik
          id="hakkimda-baslik"
          metin="Hakkımda"
          className="text-[clamp(2.5rem,11vw,9.5rem)]"
        />

        {ilkParagraf && (
          <BolumGiris>
            <p className="text-primary max-w-2xl text-lg leading-relaxed text-balance md:text-xl">
              {ilkParagraf}
            </p>
          </BolumGiris>
        )}

        {istatistikKartlari.length > 0 && (
          <BolumGiris gecikme={0.1}>
            <dl className="flex flex-wrap justify-center gap-x-14 gap-y-6">
              {istatistikKartlari.map((i) => (
                <div key={i.etiket} className="flex flex-col items-center">
                  <dt className="text-muted order-2 text-[0.7rem] tracking-[0.16em] uppercase">
                    {i.etiket}
                  </dt>
                  <dd className="dev-baslik text-primary order-1 text-5xl md:text-6xl">
                    <CountUp to={i.deger} duration={1.4} />
                    {i.sonek}
                  </dd>
                </div>
              ))}
            </dl>
          </BolumGiris>
        )}

        <BolumGiris gecikme={0.16}>
          <GradyanBaglanti href="/hakkimda">Hikâyemin devamı</GradyanBaglanti>
        </BolumGiris>
      </div>
    </section>
  );
}
