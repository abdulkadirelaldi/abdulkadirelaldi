import type { ReactNode } from 'react';

import { ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import type { Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
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
  dil,
  profil,
  baslikDuzeyi: Baslik = 'h2',
  form,
}: {
  dil: Dil;
  profil: ProfileDto;
  baslikDuzeyi?: 'h1' | 'h2';
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
  const s = sozluk(dil).iletisimBolum;
  const sosyal = profil.socials ?? {};
  const eposta = sosyal.email;
  const sosyalListe = SOSYAL.map(([anahtar, etiket]) => ({
    etiket,
    adres: sosyal[anahtar],
  })).filter((g): g is { etiket: (typeof SOSYAL)[number][1]; adres: string } => Boolean(g.adres));

  return (
    <section
      id="iletisim"
      aria-labelledby="iletisim-baslik"
      className="bg-surface border-line scroll-mt-20 border-t py-20 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-[1fr_1.1fr] md:gap-16 md:px-8">
        <div className="flex flex-col gap-6">
          <Baslik id="iletisim-baslik" className="dev-baslik text-primary text-3xl md:text-4xl">
            {s.baslikUst} {s.baslikAlt}
          </Baslik>

          <p className="text-body max-w-md">{s.giris}</p>

          {eposta && (
            <a
              href={`mailto:${eposta}`}
              className="focus-ring rounded-btn text-accent hover:text-accent-hover w-fit text-lg font-semibold break-all"
            >
              {eposta}
            </a>
          )}

          {(profil.location || profil.availability) && (
            <dl className="border-line flex flex-col gap-3 border-t pt-6 text-sm">
              {profil.location && (
                <div className="flex gap-3">
                  <dt className="text-muted w-20 shrink-0">{s.konum}</dt>
                  <dd className="text-primary">{profil.location}</dd>
                </div>
              )}
              {profil.availability && (
                <div className="flex gap-3">
                  <dt className="text-muted w-20 shrink-0">{s.durum}</dt>
                  <dd className="text-primary">{profil.availability}</dd>
                </div>
              )}
            </dl>
          )}

          {sosyalListe.length > 0 && (
            <ul aria-label={s.sosyalHesaplar} className="flex flex-wrap gap-2">
              {sosyalListe.map((g) => (
                <li key={g.etiket}>
                  <a
                    href={g.adres}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ikincilSiniflari('sm')}
                  >
                    {g.etiket}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-line bg-canvas rounded-card border p-6 shadow-sm md:p-8">{form}</div>
      </div>
    </section>
  );
}
