import { Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HizmetListesi } from '@/components/public/hizmetler';
import { GradyanDisBaglanti, hapSiniflari } from '@/components/public/tasarim/gradyan-baglanti';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { ParlakKup } from '@/components/public/tasarim/sekiller';
import { Yuzen } from '@/components/public/tasarim/yuzen';
import { LOGO_ESIGI, LogoSeridi } from '@/components/public/vitrin-seritleri';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getServices, getSiteClientLogos } from '@/server/services';

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
 * ADR-045: satırlar ana sayfayla AYNI `HizmetListesi` (numaralı, açık panel).
 * İstemciye inen tek parça satırların giriş animasyonu (`BolumGiris`).
 *
 * ÖLÇÜLEBİLİR CTA (K4): her kart `data-cta="kiyi-medya"` + `data-hizmet` +
 * `data-kaynak="hizmetler"` taşıyor. `data-kaynak` T-022'ye göre YENİ: aynı
 * hizmet hem ana sayfada hem burada CTA üretiyor; kaynağı ayırmadan hangi
 * sayfanın dönüştürdüğü ölçülemezdi. Sonradan eklemek zor, şimdi ücretsiz.
 *
 * LOGO ŞERİDİ (T-117) — YALNIZCA GERÇEK VERİYLE. T-026'da bu sayfada YOKTU:
 * veri yoktu ve uydurma logo ADR-027'nin yasakladığı uydurma istatistikle aynı
 * şey olurdu. Artık veri `showOnSite` işaretli müşterilerden geliyor
 * (ad + logo, başka hiçbir alan). Eşik `LOGO_ESIGI` (vitrin-seritleri.tsx):
 * altındaysa bölüm HİÇ çizilmiyor. Şerit saf CSS (ADR-045) — JS maliyeti yok.
 */
export default async function HizmetlerSayfasi() {
  const [hizmetler, logolar] = await Promise.all([getServices(), getSiteClientLogos()]);
  const sirali = [...hizmetler].sort((a, b) => a.order - b.order);

  return (
    <>
      <SayfaBasligi
        baslik="Hizmetler"
        yol="~/hizmetler"
        aciklama="İşin tasarımından veritabanına, dağıtımından bakımına kadar uçtan uca kuruyorum. Aşağıdaki başlıklardan biri sana uyuyorsa konuşalım."
        susler={
          <Yuzen hiz={-120} className="top-32 right-[6%] w-16 md:w-28">
            <ParlakKup className="w-full" />
          </Yuzen>
        }
      />

      {logolar.length >= LOGO_ESIGI && (
        <section aria-labelledby="logolar-baslik" className="flex flex-col gap-6 pb-16">
          <h2
            id="logolar-baslik"
            className="tabular text-muted text-center text-xs font-normal tracking-[0.16em] uppercase"
          >
            Birlikte çalıştığım ekipler
          </h2>
          <LogoSeridi logolar={logolar} />
        </section>
      )}

      <section className="panel-acik bg-canvas text-body relative z-10 rounded-t-[2.5rem] md:rounded-t-[3.5rem]">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-28 md:px-8 md:pt-24 md:pb-36">
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
            // Sayfa `h1` → satır `h2`: araya bölüm başlığı girmiyor (T-024 dersi).
            <HizmetListesi
              hizmetler={sirali}
              kiyiMedyaUrl={KIYI_MEDYA_URL}
              baslikDuzeyi="h2"
              kaynak="hizmetler"
            />
          )}

          <section
            aria-labelledby="kiyi-medya-baslik"
            className="bg-surface border-line mt-20 grid gap-8 rounded-[2rem] border p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12"
          >
            <div className="flex flex-col gap-4">
              <h2 id="kiyi-medya-baslik" className="dev-baslik text-primary text-3xl md:text-5xl">
                Ticari işler Kıyı Medya üzerinden
              </h2>
              <p className="text-body max-w-2xl text-sm">
                {/* İç referans (§1.A) BİLEREK yok: ziyaretçi PROGRAM.md'yi okumuyor. */}
                Teklif, sözleşme ve faturalandırma Kıyı Medya çatısı altında yürüyor. Aklındaki iş
                ticari bir işse oradan başlamak en hızlısı; kişisel bir soru ya da fikir
                alışverişiyse doğrudan bana yazabilirsin.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <GradyanDisBaglanti
                href={KIYI_MEDYA_URL}
                data-cta="kiyi-medya"
                data-hizmet="genel"
                data-kaynak="hizmetler"
              >
                Kıyı Medya&apos;ya git
              </GradyanDisBaglanti>
              <Link href="/iletisim" className={hapSiniflari('h-11')}>
                Bana yaz
              </Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
