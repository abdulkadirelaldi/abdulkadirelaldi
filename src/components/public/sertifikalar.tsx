import { ayYil } from '@/components/public/gun-bicim';
import type { Dil } from '@/i18n/diller';
import type { ExperienceDto } from '@/server/services/content-dto';

/**
 * Sertifika listesi — `ExperienceType.CERTIFICATE` kayıtları (2026-10-23).
 *
 * ÖDÜL KARTLARINDAN BİLEREK SADE: ödül bir başarı, sertifika bir belge. Aynı
 * ağırlıkta çizilseydi on üç eğitim belgesi sekiz ödülü gölgede bırakırdı.
 * Kurum adına göre GRUPLANIYOR (BTK Akademi, Deneyap, TEKNOFEST…): okuyan
 * "nereden, ne kadar" sorusunu tek bakışta yanıtlıyor. Grup sırası ilk
 * kaydın sırası — kayıtlar zaten yeniden eskiye geliyor.
 *
 * SUNUCU BİLEŞENİ, istemci JS'i yok.
 */
export function SertifikaListesi({
  sertifikalar,
  dil,
}: {
  sertifikalar: ExperienceDto[];
  dil: Dil;
}) {
  const gruplar = new Map<string, ExperienceDto[]>();
  for (const s of sertifikalar) {
    const liste = gruplar.get(s.organization) ?? [];
    liste.push(s);
    gruplar.set(s.organization, liste);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...gruplar].map(([kurum, belgeler]) => (
        <section
          key={kurum}
          aria-label={kurum}
          className="bg-surface border-line flex flex-col gap-4 rounded-[1.5rem] border p-6"
        >
          <h3 className="tabular text-accent-soft text-[0.72rem] tracking-[0.14em] uppercase">
            {kurum}
          </h3>
          <ul className="flex flex-col gap-3">
            {belgeler.map((b) => (
              <li key={b.id} className="flex items-baseline justify-between gap-4">
                <span className="text-primary text-sm leading-snug">{b.role}</span>
                <span className="tabular text-muted shrink-0 text-xs">
                  {ayYil(b.startDate, dil)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
