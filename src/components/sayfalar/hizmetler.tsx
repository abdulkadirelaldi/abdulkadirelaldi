import { Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HizmetListesi } from '@/components/public/hizmetler';
import { BirincilDisBaglanti, ikincilSiniflari } from '@/components/public/tasarim/dugmeler';
import { SayfaBasligi } from '@/components/public/tasarim/sayfa-basligi';
import { LOGO_ESIGI, LogoSeridi } from '@/components/public/vitrin-seritleri';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Dil } from '@/i18n/diller';
import { dilAlternatifleri } from '@/i18n/meta';
import { yol } from '@/i18n/rotalar';
import { sozluk } from '@/i18n/sozluk';
import { getServices, getSiteClientLogos } from '@/server/services';

export function hizmetlerMetadata(dil: Dil): Metadata {
  const m = sozluk(dil).sayfaBaslik.hizmetler;
  return { title: m.baslik, description: m.metaAciklama, ...dilAlternatifleri(dil, 'hizmetler') };
}

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
 * altındaysa bölüm HİÇ çizilmiyor. Sıra sabit, JS yok.
 */
export async function HizmetlerSayfasi({ dil }: { dil: Dil }) {
  const s = sozluk(dil);
  const h = s.hizmetlerSayfa;
  const [hizmetler, logolar] = await Promise.all([getServices(dil), getSiteClientLogos()]);
  const sirali = [...hizmetler].sort((a, b) => a.order - b.order);

  return (
    <>
      <SayfaBasligi
        baslik={s.sayfaBaslik.hizmetler.baslik}
        aciklama={s.sayfaBaslik.hizmetler.aciklama}
      />

      {logolar.length >= LOGO_ESIGI && (
        <section aria-labelledby="logolar-baslik" className="flex flex-col gap-6 pb-16">
          <h2 id="logolar-baslik" className="text-muted text-center text-sm font-medium">
            {h.ekipler}
          </h2>
          <LogoSeridi logolar={logolar} etiket={h.ekipler} />
        </section>
      )}

      <section className="bg-surface border-line border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
          {sirali.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={h.bos}
              description={h.bosAciklama}
              action={
                <Link href={yol(dil, 'iletisim')} className={buttonClasses({ size: 'sm' })}>
                  {h.banaYaz}
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
            className="bg-canvas border-line rounded-card mt-12 grid gap-8 border p-8 md:grid-cols-[1fr_auto] md:items-end md:p-10"
          >
            <div className="flex flex-col gap-4">
              <h2 id="kiyi-medya-baslik" className="dev-baslik text-primary text-2xl md:text-3xl">
                {h.kiyiBaslik}
              </h2>
              <p className="text-body max-w-2xl text-sm">
                {/* İç referans (§1.A) BİLEREK yok: ziyaretçi PROGRAM.md'yi okumuyor. */}
                {h.kiyiAciklama}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <BirincilDisBaglanti
                href={KIYI_MEDYA_URL}
                data-cta="kiyi-medya"
                data-umami-event="kiyi-medya"
                data-hizmet="genel"
                data-kaynak="hizmetler"
              >
                {h.kiyiGit}
              </BirincilDisBaglanti>
              <Link href={yol(dil, 'iletisim')} className={ikincilSiniflari('md')}>
                {h.banaYaz}
              </Link>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
