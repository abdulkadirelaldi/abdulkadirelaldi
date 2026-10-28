import { ArrowUpRight } from 'lucide-react';

import { BolumGiris } from '@/components/public/bolum-giris';
import type { ServiceDto } from '@/server/services/content-dto';

/**
 * Hizmet kartları — iki sütun ızgara (2026-10-27 kurumsal tasarım).
 *
 * Kartın tamamı Kıyı Medya'ya giden bağlantı. `data-cta` + `data-hizmet`
 * analitik sözleşmesi (T-022) korunuyor.
 *
 * Başlık düzeyi çağırandan: ana sayfada bölüm `h2` → satır `h3`; /hizmetler'de
 * sayfa `h1` → satır `h2` (T-024 dersi: düzey atlanmaz).
 */
export function HizmetListesi({
  hizmetler,
  kiyiMedyaUrl,
  baslikDuzeyi: Baslik = 'h3',
  kaynak,
}: {
  hizmetler: ServiceDto[];
  kiyiMedyaUrl: string;
  baslikDuzeyi?: 'h2' | 'h3';
  /** `data-kaynak` — hangi sayfadan tıklandığı (analitik). */
  kaynak?: string;
}) {
  const sirali = [...hizmetler].sort((a, b) => a.order - b.order);

  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {sirali.map((hizmet, sira) => (
        <li key={hizmet.id}>
          <BolumGiris gecikme={(sira % 2) * 0.05} className="h-full">
            <a
              href={hizmet.ctaUrl ?? kiyiMedyaUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cta="kiyi-medya"
              // Umami (isteğe bağlı analitik) bu öznitelikli tıklamaları kendisi sayar.
              data-umami-event="kiyi-medya"
              data-umami-event-hizmet={hizmet.title}
              data-hizmet={hizmet.id}
              data-kaynak={kaynak}
              className="group focus-ring rounded-card border-line bg-canvas hover:border-line-strong flex h-full flex-col gap-3 border p-6 transition-colors duration-200"
            >
              {/* `min-w-0` + heceleme: Almanca tek sözcük ("Unternehmenswebsite")
                  360 px'te taşıyordu (ADR-046). */}
              <Baslik className="text-primary flex min-w-0 items-start justify-between gap-4 text-lg font-semibold break-words hyphens-auto">
                {hizmet.title}
                <ArrowUpRight
                  aria-hidden="true"
                  className="text-muted group-hover:text-accent size-5 shrink-0 transition-colors"
                />
              </Baslik>
              <p className="text-body text-sm leading-relaxed">{hizmet.description}</p>
            </a>
          </BolumGiris>
        </li>
      ))}
    </ol>
  );
}
