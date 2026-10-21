import type { ReactNode } from 'react';

import { SahnePaneli } from '@/components/public/tasarim/sahne-paneli';
import { ParlakGlif, ParlakHalka } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import type { ProfileDto } from '@/server/services/content-dto';

const SOSYAL = [
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['x', 'X'],
  ['instagram', 'Instagram'],
] as const;

/**
 * İletişim bloğu — ADR-045 (örnekteki "LET'S GET IN TOUCH").
 *
 * AÇIK panel: solda dev çağrı + e-posta + sosyal, sağda form. Ana sayfa ve
 * /iletisim AYNI bloğu kullanıyor; başlık düzeyi çağırandan (`h1` / `h2`).
 * Form `IletisimFormu` — aynı bileşen, aynı alan kimlikleri (E2E sözleşmesi).
 */
export function IletisimBlogu({
  profil,
  baslikDuzeyi: Baslik = 'h2',
  katman = 30,
  form,
}: {
  profil: ProfileDto;
  baslikDuzeyi?: 'h1' | 'h2';
  katman?: number;
  /**
   * Form DIŞARIDAN, yuva olarak geliyor — bu modül hiçbir form bileşenini
   * import ETMİYOR. Sebep ölçüldü: sunucu modülünün import ettiği her istemci
   * bileşeni, çizilmese bile o rotanın paketine giriyor. Blok iki formu da
   * import ettiğinde ana sayfa, tembel yüklediği formun Zod'unu (~32 kB) yine
   * de ilk yüklemede indiriyordu. Ana sayfa `TembelIletisimFormu`, /iletisim
   * `IletisimFormu` verir.
   */
  form: ReactNode;
}) {
  const sosyal = profil.socials ?? {};
  const eposta = sosyal.email;
  const sosyalListe = SOSYAL.map(([anahtar, etiket]) => ({
    etiket,
    adres: sosyal[anahtar],
  })).filter((g): g is { etiket: (typeof SOSYAL)[number][1]; adres: string } => Boolean(g.adres));

  return (
    <SahnePaneli ton="acik" katman={katman} id="iletisim" aria-labelledby="iletisim-baslik">
      <div className="relative isolate mx-auto grid max-w-7xl gap-14 px-4 pt-20 pb-28 md:grid-cols-[1fr_1.1fr] md:px-8 md:pt-28 md:pb-36">
        <Yuzen hiz={-120} className="top-10 right-[4%] w-16 md:w-24">
          <ParlakHalka className="w-full" renk="var(--sekil-mor)" />
        </Yuzen>
        <Yuzen hiz={-200} gecikme={0.7} className="bottom-10 left-[2%] hidden md:block">
          <ParlakGlif glif="@" className="text-[7rem]" />
        </Yuzen>

        <div className="flex flex-col gap-8">
          <Baslik
            id="iletisim-baslik"
            className="dev-baslik text-primary text-[clamp(2.1rem,8vw,6.5rem)]"
          >
            Hadi
            <br />
            konuşalım
          </Baslik>

          <p className="text-body max-w-md">
            Bir fikrin, bir işin ya da bir sorun mu var? Kısaca yaz, birlikte netleştirelim. Genelde
            bir gün içinde dönüyorum.
          </p>

          {eposta && (
            <a
              href={`mailto:${eposta}`}
              className="focus-ring rounded-btn text-primary w-fit text-lg font-semibold break-all underline decoration-2 underline-offset-[6px] md:text-2xl"
            >
              {eposta}
            </a>
          )}

          {(profil.location || profil.availability) && (
            <dl className="tabular text-muted flex flex-wrap gap-x-8 gap-y-2 text-xs tracking-[0.12em] uppercase">
              {profil.location && (
                <div className="flex gap-2">
                  <dt>Konum:</dt>
                  <dd className="text-primary">{profil.location}</dd>
                </div>
              )}
              {profil.availability && (
                <div className="flex gap-2">
                  <dt>Durum:</dt>
                  <dd className="text-primary">{profil.availability}</dd>
                </div>
              )}
            </dl>
          )}

          {sosyalListe.length > 0 && (
            <ul aria-label="Sosyal hesaplar" className="flex flex-wrap gap-2">
              {sosyalListe.map((g) => (
                <li key={g.etiket}>
                  <a
                    href={g.adres}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring rounded-pill border-line-strong text-primary ease-brand hover:bg-primary hover:text-canvas inline-flex h-9 items-center border px-4 text-[0.7rem] font-semibold tracking-[0.12em] uppercase transition-colors duration-300"
                  >
                    {g.etiket}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-surface border-line relative rounded-[1.75rem] border p-6 shadow-[0_30px_80px_-40px_rgba(20,20,43,0.35)] md:p-8">
          {form}
        </div>
      </div>
    </SahnePaneli>
  );
}
