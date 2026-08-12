'use client';

import { ArrowUpRight, Briefcase } from 'lucide-react';
import Link from 'next/link';

import { BolumGiris } from '@/components/public/bolum-giris';
import { SpotlightCard } from '@/components/reactbits/lazy';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ServiceDto } from '@/server/services/content-dto';

export type HizmetlerProps = {
  hizmetler: ServiceDto[];
  /** §12 — `NEXT_PUBLIC_KIYI_MEDYA_URL`. Hizmetin kendi `ctaUrl`'i yoksa yedek. */
  kiyiMedyaUrl: string;
};

/**
 * "Hizmetler" bölümü — §4.1, kartlar `SpotlightCard` (§5.1).
 *
 * K4 SÖZLEŞMESİ: her kart ÖLÇÜLEBİLİR bir CTA taşır. `data-cta="kiyi-medya"`
 * ve `data-hizmet` nitelikleri analitik bağlandığında (F6) hangi hizmetin
 * dönüştürdüğünü ayırt etmeyi sağlar — sonradan eklenmesi zor, şimdi ücretsiz.
 *
 * `ctaUrl` DTO'da `null` olabilir; o zaman Kıyı Medya ana adresine gidilir.
 * §1.A: ticari niyeti olan ziyaretçi Kıyı Medya'ya yönlendirilir.
 */
export function Hizmetler({ hizmetler, kiyiMedyaUrl }: HizmetlerProps) {
  const sirali = [...hizmetler].sort((a, b) => a.order - b.order);

  return (
    <section id="hizmetler" aria-labelledby="hizmetler-baslik" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <BolumGiris className="flex flex-col gap-3">
          <p className="tabular text-accent-soft text-xs tracking-wider uppercase">
            05 — Hizmetler
          </p>
          <h2 id="hizmetler-baslik" className="text-3xl md:text-4xl">
            Nasıl yardımcı olabilirim
          </h2>
        </BolumGiris>

        {sirali.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={Briefcase}
            title="Hizmet listesi hazırlanıyor"
            description="Ne yaptığımı buradan anlatacağım. Aklındaki işi şimdiden konuşabiliriz."
            action={
              <Link href="/iletisim" prefetch={false} className={buttonClasses({ size: 'sm' })}>
                Bana yaz
              </Link>
            }
          />
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {sirali.map((hizmet, sira) => (
              <li key={hizmet.id}>
                <BolumGiris gecikme={sira * 0.06}>
                  <SpotlightCard className="flex h-full flex-col gap-3">
                    <h3 className="text-primary text-base font-semibold">{hizmet.title}</h3>
                    <p className="text-muted text-sm">{hizmet.description}</p>

                    <a
                      href={hizmet.ctaUrl ?? kiyiMedyaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cta="kiyi-medya"
                      data-hizmet={hizmet.id}
                      className="focus-ring text-accent-soft ease-brand duration-micro rounded-btn mt-auto inline-flex items-center gap-1 self-start pt-2 text-sm font-medium transition-colors"
                    >
                      Kıyı Medya ile ilerle
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </SpotlightCard>
                </BolumGiris>
              </li>
            ))}
          </ul>
        )}

        <BolumGiris gecikme={0.1} className="mt-8">
          <div className="border-line bg-surface/60 rounded-card flex flex-wrap items-center justify-between gap-4 border p-6">
            <p className="text-body max-w-xl text-sm">
              Ticari işler <span className="text-primary font-medium">Kıyı Medya</span> üzerinden
              yürüyor. Teklif, sözleşme ve faturalandırma orada.
            </p>

            <a
              href={kiyiMedyaUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cta="kiyi-medya"
              data-hizmet="genel"
              className={buttonClasses({ className: 'shrink-0' })}
            >
              Kıyı Medya&apos;ya git
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </BolumGiris>
      </div>
    </section>
  );
}
