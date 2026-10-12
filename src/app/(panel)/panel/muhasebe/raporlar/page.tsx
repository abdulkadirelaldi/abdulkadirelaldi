import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RaporEkrani } from '@/components/panel/rapor-ekrani';
import { kategoriCubuklariniCevir, yillikGrafigeCevir } from '@/components/panel/rapor-veri';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  fetchCategoryBreakdown,
  fetchMonthlyReport,
  fetchOutstandingSummary,
  fetchYearlyReport,
} from '@/server/services/report';

export const metadata: Metadata = {
  title: 'Raporlar',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

const AY_ADI = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/**
 * Dönem seçimi — adres çubuğundan, kullanıcı girdisi olarak.
 *
 * ⚠️ ŞEMA YOK: `fetchMonthlyReport(year, month)` imzası iki SAYI alıyor, bir
 * filtre nesnesi değil — yani `safeParse` edilecek bir şema da yok. Doğrulama
 * bu yüzden burada ve DAR: makul aralık dışı değer sessizce bugüne düşüyor.
 * Bunu bir şemaya taşımak Backend'in işi olurdu; uydurma bir şema yazmadım.
 *
 * Aralık `2000..9999` çünkü `appMonthRange` takvim hesabı yapıyor ve çok uzak
 * bir yıl anlamsız bir sorgu üretir; ay `1..12`.
 */
function donemCoz(yilHam: string, ayHam: string): { yil: number; ay: number } {
  const simdi = new Date();
  const yilSayi = Number(yilHam);
  const aySayi = Number(ayHam);

  const yil =
    Number.isInteger(yilSayi) && yilSayi >= 2000 && yilSayi <= 9999 ? yilSayi : simdi.getFullYear();
  const ay =
    Number.isInteger(aySayi) && aySayi >= 1 && aySayi <= 12 ? aySayi : simdi.getMonth() + 1;

  return { yil, ay };
}

/**
 * `/panel/muhasebe/raporlar` — §4.2.
 *
 * ⚠️ §9/5'İN DÖRDÜNCÜ HALKASI BURADA: toplamın bir EKRANA ulaşması. Muhasebe
 * listesinin "11 işlem" sayacı satır sayısıydı, para toplamı değildi; bu sayfa
 * ilk kez gerçek bir para toplamı gösteriyor.
 *
 * DÖRT OKUMA PARALEL: aylık, yıllık, kategori dağılımı ve alacak. Dördü de
 * bağımsız ve `Promise.all` ile tek turda; sırayla beklemek sayfayı dört kat
 * yavaşlatırdı.
 *
 * Kategori dağılımı AYLIK aralığı kullanıyor (`aylik.range`) — yıllık değil:
 * "bu ay en çok nerede" sorusu, yıllık dağılımdan daha sık sorulan şey ve
 * grafikteki ay seçimiyle tutarlı kalıyor.
 */
export default async function RaporlarPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const { yil, ay } = donemCoz(tek(parametreler.yil), tek(parametreler.ay));

  const aylik = await fetchMonthlyReport(yil, ay);

  const [yillik, kategoriSatirlari, alacak] = await Promise.all([
    fetchYearlyReport(yil),
    /* Aylık aralık — iki uç DAHİL, Backend'in `range`i olduğu gibi geçiyor. */
    fetchCategoryBreakdown(aylik.range),
    fetchOutstandingSummary(),
  ]);

  const ayEtiketi = `${AY_ADI[ay - 1] ?? ''} ${yil}`;

  return (
    <>
      <Topbar title="Raporlar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <Link
            href="/panel/muhasebe"
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'self-start' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Muhasebeye dön
          </Link>

          {/*
            DÖNEM SEÇİCİ — her dönem bir ADRES, o yüzden `Link`. Sunucu
            hesaplıyor; istemcide yeniden toplama yok. Paylaşılabilir ve geri
            tuşu çalışıyor (T-041f'teki mesaj görünümleriyle aynı karar).
          */}
          <div className="flex flex-col gap-3">
            <nav aria-label="Ay seçimi" className="relative -mx-1 overflow-x-auto px-1 pb-1">
              <ul className="flex min-w-max gap-1.5">
                {AY_ADI.map((ad, i) => {
                  const secili = i + 1 === ay;
                  return (
                    <li key={ad}>
                      <Link
                        href={`/panel/muhasebe/raporlar?yil=${yil}&ay=${i + 1}`}
                        aria-current={secili ? 'page' : undefined}
                        className={cn(
                          'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-2 text-sm transition-colors',
                          secili
                            ? 'border-accent/40 bg-accent/12 text-accent-soft'
                            : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                        )}
                      >
                        {ad}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <nav aria-label="Yıl seçimi" className="flex gap-1.5">
              {[yil - 1, yil, yil + 1].map((y) => {
                const secili = y === yil;
                return (
                  <Link
                    key={y}
                    href={`/panel/muhasebe/raporlar?yil=${y}&ay=${ay}`}
                    aria-current={secili ? 'page' : undefined}
                    className={cn(
                      'focus-ring ease-brand duration-micro rounded-btn tabular inline-flex items-center border px-3 py-2 text-sm transition-colors',
                      secili
                        ? 'border-accent/40 bg-accent/12 text-accent-soft'
                        : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                    )}
                  >
                    {y}
                  </Link>
                );
              })}
            </nav>
          </div>

          <RaporEkrani
            aylik={aylik}
            yillikNoktalar={yillikGrafigeCevir(yillik)}
            kategoriler={kategoriCubuklariniCevir(kategoriSatirlari)}
            alacak={alacak}
            yil={yil}
            ayEtiketi={ayEtiketi}
          />
        </div>
      </main>
    </>
  );
}
