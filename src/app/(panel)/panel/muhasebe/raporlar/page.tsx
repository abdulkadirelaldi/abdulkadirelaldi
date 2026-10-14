import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CsvIndir } from '@/components/panel/csv-indir';
import { RaporEkrani } from '@/components/panel/rapor-ekrani';
import { kategoriCubuklariniCevir, yillikGrafigeCevir } from '@/components/panel/rapor-veri';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { YazdirDugmesi } from '@/components/ui/yazdir-dugmesi';
import { monthlyReportSchema } from '@/lib/schemas/report';
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
 * Dönem çözümü — ADR-032: ADRES ÇUBUĞU KULLANICI GİRDİSİDİR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ T-105'TE BURADA ELLE DOĞRULAMA VARDI VE SESSİZCE KIRPIYORDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O turda beyanıma "ŞEMA YOK" yazmıştım çünkü `fetchMonthlyReport(year, month)`
 * imzası iki SAYI alıyor ve `safeParse` edilecek bir şema yoktu. Backend T-106'da
 * `monthlyReportSchema`yı yazdı; artık var.
 *
 * ÖLÇTÜĞÜM KUSUR BEKLENENDEN FARKLI ÇIKTI. Kart "şu an 500 veriyor" diyordu;
 * ölçüm beşinin beşini de 200 gösterdi:
 *
 *   ?yil=2026&ay=10 → 200    ?yil=2026&ay=99 → 200
 *   ?yil=2026&ay=0  → 200    ?yil=99&ay=5    → 200
 *   ?yil=abc&ay=xyz → 200
 *
 * Yani elle yazdığım kırpma 500'ü önlüyordu — ama DAHA SİNSİ bir şey yapıyordu:
 * `?yil=99` adresinde 2026 verisi gösteriyordu. Adres ile içerik SESSİZCE
 * ayrışıyor ve kullanıcı yanlış dönemi doğru sanıyor. Bir hata sayfası
 * görmekten kötü: hata görünür, sessiz kırpma görünmez.
 *
 * ŞEMA + GÖRÜNÜR BİLDİRİM: geçersiz adres bugünün dönemine düşüyor (ekran
 * kullanılamaz kalmasın) AMA alan hataları EKRANDA yazılıyor. Denetim ve
 * muhasebe ekranlarında kurduğum kalıbın aynısı.
 *
 * YIL SINIRI 1000–9999 ve KEYFÎ DEĞİL: `buildPeriodKey` dört basamaklı yıl
 * varsayıyor; dışına taşan bir yıl sessizce bozuk bir `periodKey` üretir ve
 * ADR-015'in idempotanslığı o biçime bağlı.
 */
function donemCoz(parametreler: Record<string, string | string[] | undefined>): {
  yil: number;
  ay: number;
  hatalar: string[];
} {
  const simdi = new Date();
  const cozum = monthlyReportSchema.safeParse({
    year: tek(parametreler.yil),
    month: tek(parametreler.ay),
  });

  if (cozum.success) {
    return { yil: cozum.data.year, ay: cozum.data.month, hatalar: [] };
  }

  /*
    PARAMETRE HİÇ VERİLMEMİŞSE bu bir HATA DEĞİL: `/panel/muhasebe/raporlar`
    çıplak adresi bugünün dönemini göstermeli. Şema boş dizeyi reddediyor, o
    yüzden "verilmedi" ile "geçersiz verildi" ayrımını burada yapıyoruz —
    yoksa menüden gelen her kullanıcı bir hata mesajı görürdü.
  */
  const verildi = tek(parametreler.yil) !== '' || tek(parametreler.ay) !== '';

  return {
    yil: simdi.getFullYear(),
    ay: simdi.getMonth() + 1,
    hatalar: verildi ? cozum.error.issues.map((i) => i.message) : [],
  };
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
  const { yil, ay, hatalar } = donemCoz(parametreler);

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
      {/*
        PDF = TARAYICININ YAZDIRMASI, kendi üreticim değil. Bir PDF kitaplığı
        (jsPDF/pdfmake) yığına yüz kB'larca ekler ve §5.2'nin 40 kB eşiğini tek
        başına aşar; üstelik grafiği kâğıda ikinci bir kod yolundan çizmek
        ekranda görüneni DOĞRULAMADAN kopyalamak olurdu — ayrışma riski tam da
        `rapor-veri.ts`te kapattığım risk. Tarayıcının yazdırması ekranda
        duran DOM'u basıyor, yani ayrışma yapısal olarak imkânsız.
      */}
      <Topbar title="Raporlar" actions={<YazdirDugmesi />} />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="yazdirma-sayfa flex max-w-5xl flex-col gap-6">
          <Link
            href="/panel/muhasebe"
            data-yazdirmada-gizle
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'self-start' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Muhasebeye dön
          </Link>

          {/*
            KÂĞIDIN BAŞLIĞI — yalnızca yazdırmada.

            Üst çubuk (`<h1>Raporlar`) kâğıtta gizli; gizlenmezse menü, tema
            düğmesi ve kırıntı yolu da basılırdı. Ama o zaman çıktının HİÇ
            başlığı kalmıyor ve elden ele dolaşan bir kâğıt "bu hangi dönem"
            sorusuna cevap vermiyor.

            `hidden print:block`: ekranda yok, kâğıtta var. Her iki ortamda da
            TEK görünür `<h1>` kalıyor — ekranda üst çubuğun, kâğıtta bunun.
          */}
          <div className="hidden flex-col gap-1 print:flex">
            <h1 className="text-primary text-xl font-bold">Muhasebe raporu · {ayEtiketi}</h1>
            <p className="text-muted text-sm">
              Tutarlar TRY karşılığıdır. Nakit ve tahakkuk esasları ayrı bloklarda; blok başlıkları
              hangi esasa baktığını yazıyor.
            </p>
          </div>

          {hatalar.length > 0 && (
            /*
              GEÇERSİZ ADRES SESSİZ KALMIYOR. Şemanın mesajları olduğu gibi
              basılıyor — "Ay 1 ile 12 arasında olmalıdır." gibi; kendi
              metnimi yazmak kuralı iki yerde tutmak olurdu.
            */
            <div
              role="alert"
              className="rounded-input border-danger/40 bg-danger/8 border px-3 py-2.5 text-sm"
            >
              <p className="text-danger font-medium">Adresteki dönem geçersiz</p>
              <ul className="text-body mt-1 flex flex-col gap-0.5">
                {hatalar.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <p className="text-muted mt-1">
                Bu yüzden bu ayın raporu gösteriliyor — aşağıdaki seçiciyle dönem değiştirebilirsin.
              </p>
            </div>
          )}

          {/*
            DÖNEM SEÇİCİ — her dönem bir ADRES, o yüzden `Link`. Sunucu
            hesaplıyor; istemcide yeniden toplama yok. Paylaşılabilir ve geri
            tuşu çalışıyor (T-041f'teki mesaj görünümleriyle aynı karar).
          */}
          <div data-yazdirmada-gizle className="flex flex-col gap-3">
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

          {/*
            ⚠️ İKİ AYRI İNDİRME, TEK BİR "RAPORU İNDİR" DEĞİL. Ekrandaki iki
            tablo iki FARKLI aralığa bakıyor: kategori dağılımı SEÇİLİ AYA
            (`aylik.range`), aylık özet BÜTÜN YILA. Tek düğme altında
            birleştirmek, kullanıcının hangi dönemi indirdiğini bilmemesi
            demekti — ve dosya muhasebecisine gidiyor.

            `data-yazdirmada-gizle`: kâğıtta "indir" düğmesi anlamsız (T-108f'in
            yazdırma sözleşmesi).
          */}
          <div data-yazdirmada-gizle className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <CsvIndir
              istek={{ dataset: 'categories', range: aylik.range }}
              etiket="Kategori dağılımını indir"
              aciklama={`${ayEtiketi} — ekrandaki dağılımın aynısı (${aylik.range.from} … ${aylik.range.to}).`}
            />

            <CsvIndir
              istek={{ dataset: 'monthly', year: yil }}
              etiket="Aylık özeti indir"
              aciklama={`${yil} yılının on iki ayı — seçili ay değil, yılın tamamı.`}
            />
          </div>
        </div>
      </main>
    </>
  );
}
