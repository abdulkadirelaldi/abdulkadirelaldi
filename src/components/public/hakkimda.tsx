import Link from 'next/link';

import { Sayac } from '@/components/public/sayac';
import { Bolum } from '@/components/public/tasarim/bolum';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk, type Sozluk } from '@/i18n/sozluk';
import type { ProfileDto } from '@/server/services/content-dto';
import type { SiteStatsDto } from '@/server/services/_shared/stats';

type Kart = { deger: number; sonek?: string; etiket: string };

export type HakkimdaProps = {
  dil: Dil;
  profil: ProfileDto;
  istatistikler: SiteStatsDto;
  /** Ödül ve derece sayısı — hemen altındaki Başarılar listesinde tek tek görünür. */
  odulSayisi: number;
};

/**
 * Sıfır değerli istatistik ÇİZİLMEZ.
 *
 * "Yıl deneyim" 2026-10-26'da KALDIRILDI: 2028 mezunu bir öğrencide lise
 * takımından sayılan "5+ yıl" işe alımcıya abartı gibi okunuyordu ve sayfadaki
 * öteki sayılara güveni zedeliyordu. Yerine sayfada TEK TEK doğrulanabilen
 * ödül sayısı geldi.
 */
function kartlar(
  { publishedProjects }: SiteStatsDto,
  odulSayisi: number,
  s: Sozluk['hakkimdaBolum'],
): Kart[] {
  return [
    odulSayisi > 0 && { deger: odulSayisi, etiket: s.odulDerece },
    publishedProjects > 0 && { deger: publishedProjects, etiket: s.yayinlananProje },
  ].filter((kart): kart is Kart => Boolean(kart));
}

/**
 * Ana sayfa "Hakkımda" — solda biyografinin İLK paragrafı (tamamı /hakkimda'da),
 * sağda doğrulanabilir sayılar.
 */
export function Hakkimda({ dil, profil, istatistikler, odulSayisi }: HakkimdaProps) {
  const s = sozluk(dil).hakkimdaBolum;
  const [ilkParagraf] = profil.bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const istatistikKartlari = kartlar(istatistikler, odulSayisi, s);

  return (
    <Bolum
      id="hakkimda"
      baslik={s.baslik}
      ton="gri"
      ek={
        <Link
          href={yol(dil, 'hakkimda')}
          className="focus-ring rounded-btn text-accent hover:text-accent-hover text-sm font-medium"
        >
          {s.devam} →
        </Link>
      }
    >
      <div className="grid gap-10 md:grid-cols-[1.6fr_1fr] md:gap-16">
        {ilkParagraf && (
          <p className="text-primary text-lg leading-relaxed md:text-xl">{ilkParagraf}</p>
        )}

        {istatistikKartlari.length > 0 && (
          <dl className="grid grid-cols-2 gap-6 self-start">
            {istatistikKartlari.map((i) => (
              <div key={i.etiket} className="border-accent flex flex-col gap-1 border-l-2 pl-4">
                <dt className="text-muted order-2 text-sm">{i.etiket}</dt>
                <dd className="text-primary order-1 text-4xl font-semibold tracking-tight">
                  {/* Sayaç saf JS, framer-motion DEĞİL (ADR-045 ölçümü): sayac.tsx. */}
                  <Sayac deger={i.deger} />
                  {i.sonek}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Bolum>
  );
}
