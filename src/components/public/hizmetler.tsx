import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { KonturBaslik } from '@/components/public/tasarim/kontur-baslik';
import { SahnePaneli } from '@/components/public/tasarim/sahne-paneli';
import type { Dil } from '@/i18n/diller';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import type { ServiceDto } from '@/server/services/content-dto';

/**
 * ADR-045 — numaralı hizmet satırları (örnekteki "01 3D MODELING").
 *
 * Satırın tamamı Kıyı Medya'ya giden bağlantı; üzerine gelince satır sağa
 * kayıyor, numara gradyana dönüyor ve ok beliriyor. `data-cta` +
 * `data-hizmet` analitik sözleşmesi (T-022) korunuyor.
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
    <ol className="border-line border-t">
      {sirali.map((hizmet, sira) => (
        <li key={hizmet.id} className="border-line border-b">
          <BolumGiris gecikme={sira * 0.05}>
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
              className="group focus-ring ease-brand grid grid-cols-[auto_1fr_auto] items-start gap-x-6 gap-y-2 py-8 transition-[padding] duration-500 hover:pl-4 md:grid-cols-[8rem_1fr_1.2fr_auto] md:items-center md:py-10"
            >
              <span className="dev-baslik group-hover:text-gradient-vurgu text-primary text-4xl md:text-6xl">
                {String(sira + 1).padStart(2, '0')}
              </span>
              {/* `min-w-0` + heceleme: ızgara sütunu en uzun sözcükten dar olamaz;
                  Almanca tek sözcük ("Unternehmenswebsite") 360 px'te taşıyordu (ADR-046). */}
              <Baslik className="text-primary font-display min-w-0 self-center text-sm font-bold tracking-[0.14em] break-words hyphens-auto uppercase md:text-base">
                {hizmet.title}
              </Baslik>
              <p className="text-body col-span-3 text-sm leading-relaxed md:col-span-1">
                {hizmet.description}
              </p>
              <span
                aria-hidden="true"
                className="border-line-strong text-primary ease-brand col-start-3 row-start-1 flex size-11 items-center justify-center rounded-full border transition-all duration-500 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-base)] md:col-start-auto md:row-start-auto"
              >
                <ArrowUpRight className="size-5" />
              </span>
            </a>
          </BolumGiris>
        </li>
      ))}
    </ol>
  );
}

export type HizmetlerProps = {
  dil: Dil;
  hizmetler: ServiceDto[];
  kiyiMedyaUrl: string;
};

/**
 * Ana sayfa hizmet bölümü — AÇIK panel, koyu sahnenin üstüne kayıyor.
 * Hizmet yoksa bölüm HİÇ çizilmiyor: boş bir açık panel sahnede delik açar.
 */
export function Hizmetler({ dil, hizmetler, kiyiMedyaUrl }: HizmetlerProps) {
  const s = sozluk(dil).hizmetlerBolum;
  if (hizmetler.length === 0) return null;

  return (
    <SahnePaneli ton="acik" katman={10} id="hizmetler" aria-labelledby="hizmetler-baslik">
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-28 md:px-8 md:pt-28 md:pb-36">
        <KonturBaslik
          id="hizmetler-baslik"
          metin={s.baslik}
          className="text-center text-[clamp(2.5rem,11vw,10rem)]"
        />

        <div className="mt-14 md:mt-20">
          <HizmetListesi hizmetler={hizmetler} kiyiMedyaUrl={kiyiMedyaUrl} />
        </div>

        <BolumGiris className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <p className="text-body max-w-xl text-sm">
            {s.kiyiOnce} <span className="text-primary font-semibold">Kıyı Medya</span>
            {s.kiyiSonra}
          </p>
          <Link
            href={yol(dil, 'hizmetler')}
            className="focus-ring rounded-btn text-primary text-xs font-semibold tracking-[0.16em] uppercase underline underline-offset-4"
          >
            {s.tumu}
          </Link>
        </BolumGiris>
      </div>
    </SahnePaneli>
  );
}
