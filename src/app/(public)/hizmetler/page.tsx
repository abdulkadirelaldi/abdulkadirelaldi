import { ArrowUpRight, Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getServices } from '@/server/services';

export const metadata: Metadata = {
  title: 'Hizmetler',
  description:
    'Kurumsal web sitesi, web uygulaması, e-ticaret ve bakım. Ticari işler Kıyı Medya üzerinden yürüyor.',
};

/** §12 — adres koda gömülmez, ortam değişkeninden okunur. */
const KIYI_MEDYA_URL = process.env.NEXT_PUBLIC_KIYI_MEDYA_URL ?? 'https://kiyimedya.com';

/**
 * /hizmetler — §4.1, §1.1 K4.
 *
 * SUNUCU BİLEŞENİ, istemci bileşeni YOK. Ana sayfadaki Hizmetler bölümü
 * `SpotlightCard` kullanıyor (vitrin, tek bölüm); burası KATALOG sayfası ve
 * T-023'ün ölçümü net: gereksiz istemci ağacı belgeyi büyütüp ilk boyamayı
 * geciktiriyor. Kartlar token'lı düz yüzeyler.
 *
 * ÖLÇÜLEBİLİR CTA (K4): her kart `data-cta="kiyi-medya"` + `data-hizmet` +
 * `data-kaynak="hizmetler"` taşıyor. `data-kaynak` T-022'ye göre YENİ: aynı
 * hizmet hem ana sayfada hem burada CTA üretiyor; kaynağı ayırmadan hangi
 * sayfanın dönüştürdüğü ölçülemezdi. Sonradan eklemek zor, şimdi ücretsiz.
 *
 * LOGO ŞERİDİ (LogoLoop) BU SAYFADA YOK — gerekçe raporda: gösterilecek logo
 * verisi yok ve uydurma logo koymak, ADR-027'nin yasakladığı uydurma
 * istatistikle aynı şey olurdu.
 */
export default async function HizmetlerSayfasi() {
  const hizmetler = await getServices();
  const sirali = [...hizmetler].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16 md:py-24">
      <header className="flex flex-col gap-4">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Hizmetler</p>
        <h1 className="text-3xl md:text-5xl">Nasıl yardımcı olabilirim</h1>
        <p className="text-body max-w-2xl text-lg">
          İşin tasarımından veritabanına, dağıtımından bakımına kadar uçtan uca kuruyorum. Aşağıdaki
          başlıklardan biri sana uyuyorsa konuşalım.
        </p>
      </header>

      {sirali.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Hizmet listesi hazırlanıyor"
          description="Ne yaptığımı buradan anlatacağım. Aklındaki işi şimdiden konuşabiliriz."
          action={
            <Link href="/iletisim" className={buttonClasses({ size: 'sm' })}>
              Bana yaz
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {sirali.map((hizmet) => (
            <li key={hizmet.id}>
              <article className="border-line bg-surface/50 rounded-card flex h-full flex-col gap-3 border p-6">
                {/* Sayfa `h1` → kart `h2`: araya bölüm başlığı girmiyor (T-024 dersi). */}
                <h2 className="text-primary text-lg font-semibold">{hizmet.title}</h2>

                <p className="text-muted text-sm">{hizmet.description}</p>

                <a
                  href={hizmet.ctaUrl ?? KIYI_MEDYA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cta="kiyi-medya"
                  data-hizmet={hizmet.id}
                  data-kaynak="hizmetler"
                  className="focus-ring text-accent-soft ease-brand duration-micro rounded-btn mt-auto inline-flex items-center gap-1 self-start pt-2 text-sm font-medium transition-colors"
                >
                  Kıyı Medya ile ilerle
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </article>
            </li>
          ))}
        </ul>
      )}

      <section
        aria-labelledby="kiyi-medya-baslik"
        className="border-line bg-surface/60 rounded-card flex flex-col gap-4 border p-6"
      >
        <h2 id="kiyi-medya-baslik" className="text-2xl">
          Ticari işler Kıyı Medya üzerinden
        </h2>

        <p className="text-body max-w-2xl text-sm">
          {/* İç referans (§1.A) BİLEREK yok: ziyaretçi PROGRAM.md'yi okumuyor. */}
          Teklif, sözleşme ve faturalandırma Kıyı Medya çatısı altında yürüyor. Aklındaki iş ticari
          bir işse oradan başlamak en hızlısı; kişisel bir soru ya da fikir alışverişiyse doğrudan
          bana yazabilirsin.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={KIYI_MEDYA_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="kiyi-medya"
            data-hizmet="genel"
            data-kaynak="hizmetler"
            className={buttonClasses({ className: 'shrink-0' })}
          >
            Kıyı Medya&apos;ya git
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>

          <Link href="/iletisim" className={buttonClasses({ variant: 'secondary' })}>
            Bana yaz
          </Link>
        </div>
      </section>
    </div>
  );
}
