'use client';

import { KategoriDagilimi } from '@/components/panel/kategori-dagilimi';
import { paraBicim } from '@/components/panel/para-bicim';
import type { AylikNokta, KategoriCubugu } from '@/components/panel/rapor-veri';
import { YillikGrafikDinamik } from '@/components/panel/yillik-grafik-lazy';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { MonthlyReportDto, OutstandingSummaryDto } from '@/server/services/report';
import { Currency } from '@/types';

/**
 * RAPOR EKRANI — §4.2 aylık/yıllık grafik, kategori dağılımı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AYLIK RAPOR GRAFİK DEĞİL, DURUM KUTULARI — FORM KARARI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aylık rapor TEK DÖNEM: altı sayı ve bir sayaç. Bunu çubuk grafiğe çevirmek
 * tek çubuklu bir grafik üretirdi — sayının kendisi zaten "grafik". Durum
 * kutuları hem daha okunur hem dürüst.
 *
 * Zaman içinde değişim YILLIK grafiğin işi ve o on iki noktayla gerçekten bir
 * grafik hak ediyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ İKİ ESAS AYRI BAŞLIKLAR ALTINDA — AYNI GRAFİKTE/KUTUDA KARIŞTIRILMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend "gelir" diye tek bir sayı döndürmüyor ve gerekçesi arayüzü bağlıyor:
 *
 *   NAKİT    → `income.collected` / `expense.paid` / `net.cash`
 *   TAHAKKUK → `income.invoiced`  / `expense.incurred` / `net.accrual`
 *
 * İki esas İKİ AYRI BLOKTA ve her bloğun başlığı hangi esasa baktığını
 * YAZIYOR. Karıştırmak — örneğin kesilen geliri ödenen giderden çıkarmak —
 * Backend'in `net`i döndürme sebebinin ta kendisi: döndürmemek o riski arayüze
 * taşıyordu. Arayüz ÇIKARMA YAPMIYOR; `net.cash`/`net.accrual` olduğu gibi
 * basılıyor.
 */
export function RaporEkrani({
  aylik,
  yillikNoktalar,
  kategoriler,
  alacak,
  yil,
  ayEtiketi,
}: {
  aylik: MonthlyReportDto;
  yillikNoktalar: AylikNokta[];
  kategoriler: KategoriCubugu[];
  alacak: OutstandingSummaryDto;
  yil: number;
  ayEtiketi: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* ── NAKİT ESASI ──────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">{ayEtiketi} · nakit esası</CardTitle>
            <p className="text-muted text-sm">
              Eline geçen ve elinden çıkan para. Kesilmiş ama tahsil edilmemiş faturalar bu bloğa{' '}
              <span className="text-body">girmiyor</span>.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <Kutu
              etiket="Tahsil edilen"
              tutar={aylik.income.collected}
              not="Gelir ∧ tahsil edilmiş"
              renk="text-success"
            />
            <Kutu
              etiket="Ödenen"
              tutar={aylik.expense.paid}
              not="Gider ∧ ödenmiş"
              renk="text-danger"
            />
            <Kutu
              etiket="Net (nakit)"
              tutar={aylik.net.cash}
              not="Tahsil edilen − ödenen · sunucuda hesaplandı"
              renk="text-primary"
            />
          </dl>
        </CardContent>
      </Card>

      {/* ── TAHAKKUK ESASI ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">{ayEtiketi} · tahakkuk esası</CardTitle>
            <p className="text-muted text-sm">
              Kesilen ve doğan toplam — ödenme durumuna <span className="text-body">bakılmaz</span>.
              Nakit esasıyla aynı sayılar değildir ve karşılaştırılmamalıdır.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-4">
            <Kutu
              etiket="Kesilen gelir"
              tutar={aylik.income.invoiced}
              not="Gelir, hepsi"
              renk="text-success"
            />
            <Kutu
              etiket="Doğan gider"
              tutar={aylik.expense.incurred}
              not="Gider, hepsi"
              renk="text-danger"
            />
            <Kutu
              etiket="Net (tahakkuk)"
              tutar={aylik.net.accrual}
              not="Kesilen − doğan · sunucuda hesaplandı"
              renk="text-primary"
            />
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted text-xs">İşlem</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="tabular text-primary text-lg">{aylik.transactionCount}</span>
                <span className="text-muted text-xs">Bu ayda kayıtlı</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── YILLIK GRAFİK ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {/* BAŞLIK HANGİ ESASA BAKTIĞINI YAZIYOR — kart bunu şart koştu. */}
            <CardTitle seviye="h2">
              <span className="tabular">{yil}</span> · aylık nakit akışı
            </CardTitle>
            <p className="text-muted text-sm">
              Tahsil edilen ve ödenen, ay ay. <span className="text-body">Nakit esası</span> —
              kesilmiş ama tahsil edilmemiş tutarlar burada yok. Hareketsiz aylar sıfır gösterilir;
              eksende boşluk bırakılmaz.
            </p>
          </div>

          <YillikGrafikDinamik noktalar={yillikNoktalar} />
        </CardContent>
      </Card>

      {/* ── KATEGORİ DAĞILIMI ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">{ayEtiketi} · kategori dağılımı</CardTitle>
            <p className="text-muted text-sm">
              Kesilen tutara göre azalan sıra — <span className="text-body">tahakkuk esası</span>.
              Çubuk, en büyük kaleme göre orandır; gelir ve gider satırları birbirine eklenmez.
            </p>
          </div>

          <KategoriDagilimi cubuklar={kategoriler} />
        </CardContent>
      </Card>

      {/* ── ALACAK ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">Toplam alacak</CardTitle>
            <p className="text-muted text-sm">
              Tüm işlerin kalanı — dönemden bağımsız, bugünkü durum.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kutu
              etiket="Kalan alacak"
              tutar={alacak.totalRemaining}
              not="İptal edilen işler hariç"
              renk="text-primary"
            />
            <Kutu
              etiket="Bekleyen fatura"
              tutar={alacak.totalPending}
              not="Kesildi, gelmedi — kalan içinde"
              renk="text-warning"
            />
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted text-xs">Hesaba katılan iş</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="tabular text-primary text-lg">{alacak.jobCount}</span>
                <span className="text-muted text-xs">Anlaşma tutarı bilinen</span>
              </dd>
            </div>
            {/*
              ⚠️ ATLANAN İŞLER SAYILIYOR, GİZLENMİYOR. Backend bu iki sayıyı
              bilerek dışarı verdi: aksi hâlde toplam "düşük" görünür ve sebebi
              görünmez olurdu. Sıfır göstermek yerine saymak, T-101'in
              `remaining: null` kararının rapor tarafındaki karşılığı.
            */}
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted text-xs">Hesaba katılmayan</dt>
              <dd className="flex flex-col gap-0.5">
                <span className="tabular text-primary text-lg">
                  {alacak.unknownAmountJobCount + alacak.cancelledJobCount}
                </span>
                <span className="text-muted text-xs">
                  <span className="tabular">{alacak.unknownAmountJobCount}</span> tutarı bilinmiyor
                  · <span className="tabular">{alacak.cancelledJobCount}</span> iptal
                </span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Tek sayı kutusu.
 *
 * ⚠️ NOT `<dd>`NİN İÇİNDE, kardeşi DEĞİL: T-104'te ölçüldü — `<dl>` içindeki
 * sarmalayıcı `div` yalnızca `dt`/`dd` kabul ediyor ve kardeş bir `<p>`
 * Lighthouse `definition-list` denetimini kırıyor.
 *
 * Tutar `paraBicim` ile DİZEDEN basılıyor; bu ekranda hiçbir yerde `Number()`
 * çıktısı gösterilmiyor (dönüşüm yalnızca grafik geometrisi için ve tek yerde).
 */
function Kutu({
  etiket,
  tutar,
  not,
  renk,
}: {
  etiket: string;
  tutar: string;
  not: string;
  renk: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs">{etiket}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className={`tabular text-lg ${renk}`}>{paraBicim(tutar, Currency.TRY)}</span>
        <span className="text-muted text-xs">{not}</span>
      </dd>
    </div>
  );
}
