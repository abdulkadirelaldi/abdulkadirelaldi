import { yil } from '@/components/public/gun-bicim';
import type { ExperienceDto } from '@/server/services/content-dto';

/**
 * Spor — `ExperienceType.SPORT` kayıtları (2026-10-23).
 *
 * İKİ GRUP, TEK TÜR (schema.prisma notu): tek tarihli kayıt DERECE, tarih
 * aralığı olan kayıt TAKIM. Takım üyeliği doğası gereği bir dönem; ayrı bir
 * alan yerine bu ayrım yetiyor.
 *
 * KRONOLOJİK (eskiden yeniye) — sahibinin isteği: dereceler 2013'teki ilkokul
 * şampiyonluğundan bugüne bir hikâye gibi okunsun. Sitenin geri kalanı
 * yeniden eskiye sıralı; burada bilerek ters.
 *
 * YALNIZCA YIL: kayıtların çoğu "2024–2025 bahar dönemi" gibi dönem bilgisi
 * taşıyor ve dönem turnuva adında yazılı; ay göstermek uydurma kesinlik olurdu.
 *
 * SUNUCU BİLEŞENİ, istemci JS'i yok.
 */
export function Spor({
  kayitlar,
  metin,
}: {
  kayitlar: ExperienceDto[];
  metin: { dereceler: string; takimlar: string };
}) {
  const kronolojik = [...kayitlar].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const dereceler = kronolojik.filter((k) => !k.endDate);
  const takimlar = kronolojik.filter((k) => k.endDate);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
      {dereceler.length > 0 && (
        <section aria-labelledby="spor-derece-baslik" className="flex flex-col gap-5">
          <h3
            id="spor-derece-baslik"
            className="tabular text-accent-soft text-[0.72rem] tracking-[0.14em] uppercase"
          >
            {metin.dereceler}
          </h3>
          <ol className="border-line border-t">
            {dereceler.map((k) => (
              <li
                key={k.id}
                className="border-line grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 gap-y-1 border-b py-4 sm:grid-cols-[3.5rem_9rem_1fr]"
              >
                <span className="tabular text-muted text-xs">{yil(k.startDate)}</span>
                <span className="text-primary text-sm font-semibold">{k.role}</span>
                <span className="text-body col-start-2 text-sm leading-relaxed sm:col-start-3">
                  {k.organization}
                  {k.description && <span className="text-muted"> · {k.description}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {takimlar.length > 0 && (
        <section aria-labelledby="spor-takim-baslik" className="flex flex-col gap-5">
          <h3
            id="spor-takim-baslik"
            className="tabular text-accent-soft text-[0.72rem] tracking-[0.14em] uppercase"
          >
            {metin.takimlar}
          </h3>
          <ul className="flex flex-col gap-3">
            {takimlar.map((k) => (
              <li key={k.id} className="bg-surface border-line rounded-[1.25rem] border p-5">
                <p className="tabular text-muted text-xs">
                  {yil(k.startDate)}–{k.endDate ? yil(k.endDate) : ''}
                </p>
                <p className="text-primary mt-1 text-sm font-semibold">{k.organization}</p>
                <p className="text-body text-sm">
                  {k.role}
                  {k.description && <span className="text-muted"> · {k.description}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
