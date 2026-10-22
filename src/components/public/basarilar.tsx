import { BolumGiris } from '@/components/public/bolum-giris';
import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { ParlakKup } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import type { Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import type { ExperienceDto } from '@/server/services/content-dto';

/**
 * Ödül ızgarası — `ExperienceType.AWARD` kayıtları (schema.prisma notu):
 * `role` = derece ("Türkiye 1.liği"), `organization` = yarışma ve kategori,
 * `startDate` = tarih, `description` = takım / rol.
 *
 * Kartın üst kenarındaki gradyan çizgi derecenin vurgusu; yıl mono. Sıra
 * servisten (`order`) — burada yeniden sıralanmıyor.
 */
export function OdulIzgarasi({
  oduller,
  baslikDuzeyi: Baslik = 'h3',
}: {
  oduller: ExperienceDto[];
  baslikDuzeyi?: 'h2' | 'h3';
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {oduller.map((odul, sira) => (
        <li key={odul.id} className="h-full">
          <BolumGiris gecikme={(sira % 4) * 0.05} className="h-full">
            <article className="border-line-hover bg-surface relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.5rem] border p-6">
              <span aria-hidden="true" className="bg-gradient-vurgu absolute inset-x-0 top-0 h-1" />
              <p className="tabular text-muted text-xs">{odul.startDate.slice(0, 4)}</p>
              <Baslik className="dev-baslik text-primary text-xl leading-[0.95] [overflow-wrap:anywhere] xl:text-2xl">
                {odul.role}
              </Baslik>
              <p className="text-body text-sm leading-relaxed">{odul.organization}</p>
              {odul.description && (
                <p className="tabular text-muted mt-auto pt-2 text-[0.7rem] tracking-[0.08em] uppercase">
                  {odul.description}
                </p>
              )}
            </article>
          </BolumGiris>
        </li>
      ))}
    </ul>
  );
}

/** Ana sayfa "Başarılar" bölümü — ödül yoksa hiç çizilmez. */
export function Basarilar({ dil, oduller }: { dil: Dil; oduller: ExperienceDto[] }) {
  if (oduller.length === 0) return null;

  return (
    <section
      id="basarilar"
      aria-labelledby="basarilar-baslik"
      className="relative isolate overflow-hidden pt-8 pb-32 md:pb-44"
    >
      <Yuzen hiz={-120} className="top-4 right-[6%] w-16 md:w-24">
        <ParlakKup className="w-full" renk="var(--sekil-mor)" />
      </Yuzen>
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 md:gap-20 md:px-8">
        <KonturBaslik
          id="basarilar-baslik"
          metin={sozluk(dil).basarilar.baslik}
          className="text-center text-[clamp(2.5rem,11vw,9.5rem)]"
        />
        <OdulIzgarasi oduller={oduller} />
      </div>
    </section>
  );
}
