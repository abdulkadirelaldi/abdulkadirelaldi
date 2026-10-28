import { BolumGiris } from '@/components/public/bolum-giris';
import { Bolum } from '@/components/public/tasarim/bolum';
import type { Dil } from '@/i18n/diller';
import { sozluk } from '@/i18n/sozluk';
import type { ExperienceDto } from '@/server/services/content-dto';

/**
 * Ödül ızgarası — `ExperienceType.AWARD` kayıtları (schema.prisma notu):
 * `role` = derece ("Türkiye 1.liği"), `organization` = yarışma ve kategori,
 * `startDate` = tarih, `description` = takım / rol.
 *
 * Yıl vurgu renginde, derece başlık; süs yok. Sıra servisten (`order`) —
 * burada yeniden sıralanmıyor.
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
            <article className="border-line bg-canvas rounded-card flex h-full flex-col gap-2 border p-5">
              <p className="text-accent text-sm font-semibold">{odul.startDate.slice(0, 4)}</p>
              <Baslik className="text-primary text-lg leading-snug font-semibold [overflow-wrap:anywhere]">
                {odul.role}
              </Baslik>
              <p className="text-body text-sm leading-relaxed">{odul.organization}</p>
              {odul.description && (
                <p className="text-muted mt-auto pt-2 text-sm">{odul.description}</p>
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
    <Bolum id="basarilar" baslik={sozluk(dil).basarilar.baslik} ton="gri">
      <OdulIzgarasi oduller={oduller} />
    </Bolum>
  );
}
