import Link from 'next/link';

import type { Dil } from '@/i18n/diller';
import { yol, type Sayfa } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { SITE_NAME } from '@/lib/constants';
import type { ProfileDto } from '@/server/services/content-dto';

/** Alt bilgideki sayfalar; adresler dile göre (ADR-046). */
const ALT_SAYFALAR: readonly Sayfa[] = [
  'hakkimda',
  'projeler',
  'blog',
  'hizmetler',
  'iletisim',
  'cv',
];

const SOSYAL_ETIKET = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
} as const;

const BASLIK = 'text-primary text-sm font-semibold';
const BAGLANTI =
  'focus-ring rounded-btn text-body hover:text-accent text-sm transition-colors duration-200';

/**
 * Public alt bilgi — ADR-045. Sunucu Bileşeni, JS yok.
 *
 * Örnekteki gibi: dev isim, üç sütun, en altta renkli şekil şeridi. Profil
 * OKUNAMAZSA (boş veritabanı, BULGU-013) alt bilgi sosyal/iletişim sütunları
 * olmadan çizilir — layout'u düşürmek bütün public siteyi düşürürdü.
 *
 * Kıyı Medya adresi ortam değişkeninden (§12). Telif yılı sunucuda üretilir —
 * istemcide üretilseydi hidrasyon uyuşmazlığı riski olurdu.
 */
export function Footer({ profil, dil }: { profil: ProfileDto | null; dil: Dil }) {
  const s = sozluk(dil);
  const year = new Date().getFullYear();
  const kiyiMedyaUrl = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';
  const sosyal = profil?.socials ?? {};
  const sosyalListe = (Object.keys(SOSYAL_ETIKET) as (keyof typeof SOSYAL_ETIKET)[])
    .map((anahtar) => ({ etiket: SOSYAL_ETIKET[anahtar], adres: sosyal[anahtar] }))
    .filter((g): g is typeof g & { adres: string } => Boolean(g.adres));

  return (
    <footer data-yazdirmada-gizle className="bg-surface border-line border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-16 pb-8 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-primary text-base font-semibold">{SITE_NAME}</p>
            {profil?.headline && <p className="text-muted max-w-xs text-sm">{profil.headline}</p>}
          </div>

          <nav aria-label={s.altBilgi.menu} className="flex flex-col gap-4">
            <p className={BASLIK}>{s.altBilgi.sayfalar}</p>
            <ul className="flex flex-col gap-2">
              {ALT_SAYFALAR.map((sayfa) => (
                <li key={sayfa}>
                  <Link href={yol(dil, sayfa)} className={BAGLANTI}>
                    {s.sayfaAdi[sayfa]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {sosyalListe.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className={BASLIK}>{s.altBilgi.sosyal}</p>
              <ul className="flex flex-col gap-2">
                {sosyalListe.map((g) => (
                  <li key={g.etiket}>
                    <a
                      href={g.adres}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={BAGLANTI}
                    >
                      {g.etiket}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <p className={BASLIK}>{s.altBilgi.iletisim}</p>
            <ul className="flex flex-col gap-2">
              {sosyal.email && (
                <li>
                  <a href={`mailto:${sosyal.email}`} className={`${BAGLANTI} break-all`}>
                    {sosyal.email}
                  </a>
                </li>
              )}
              {profil?.location && <li className="text-body text-sm">{profil.location}</li>}
              <li>
                <a
                  href={kiyiMedyaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BAGLANTI}
                >
                  Kıyı Medya ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-line text-muted flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <span className="tabular">{year}</span> {SITE_NAME} · {s.altBilgi.kiyiOnce}{' '}
            <a
              href={kiyiMedyaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-btn text-accent"
            >
              Kıyı Medya
            </a>
            {s.altBilgi.kiyiSonra}
          </p>
          <p className="tabular">{s.altBilgi.yigin}</p>
        </div>
      </div>
    </footer>
  );
}
