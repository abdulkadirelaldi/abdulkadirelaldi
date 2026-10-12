import type { ExportBasis, ReportRange, TransactionFilterInput } from '@/lib/schemas';
import { db } from '@/server/db';

import { buildCsv, csvBoolean, csvMoney, csvText } from './_shared';
import { fetchCategoryBreakdown, fetchYearlyReport } from './report';
import { fetchTransactionsForExport } from './transaction';

/**
 * CSV DIŞA AKTARIM — §4.2, T-106.
 *
 * Kodlama kararları (ayırıcı, BOM, `sep=` satırı, formül enjeksiyonu)
 * `_shared/csv.ts` içinde ÖLÇÜMLERİYLE yazılı. Bu dosya YALNIZCA "hangi rapor,
 * hangi kolonlar, hangi esas" sorusunu cevaplıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ESAS BAŞLIKTA YAZILI — "GELİR" TEK BAŞINA İKİ ŞEYİ ADLANDIRIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-102'de kararı verdim ve burada da uyguluyorum: nakit esası TAHSİL EDİLENİ,
 * tahakkuk esası KESİLENİ sayar. Bu dosya bir muhasebeciye gidebilir ve hangi
 * esası taşıdığı dosyanın İÇİNDEN okunabilmeli — kullanıcının hatırlamasına
 * bırakılamaz.
 *
 * Üç yerde yazılı ve üçü de kasıtlı:
 *   1. KOLON BAŞLIĞINDA  — "Tahsil Edilen (TRY)" / "Kesilen (TRY)"
 *   2. DOSYA ADINDA      — `…_nakit.csv` / `…_tahakkuk.csv`
 *   3. İŞLEM DEFTERİNDE AYRICA SATIR SEÇİMİNDE — nakit esası yalnızca
 *      ödenmiş hareketleri taşır ve başlık bunu söylüyor.
 *
 * Birini atlamak yeterli olmazdı: dosya adı yeniden adlandırılabiliyor, kolon
 * başlığı ise dosyayla birlikte gidiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ §8.20 — HANGİ ALANLAR DIŞARI ÇIKIYOR, VE ÖLÇÜT DENETİM KAYDININ ÖLÇÜTÜ DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-100'de `Client` denetim diff'inden `email`, `phone` ve `notes`i BİLEREK
 * çıkarmıştım. Kart haklı olarak "aynı ölçüt CSV'ye de uygulanmalı mı" diye
 * sordu. Cevap: ÖLÇÜT AYNI DEĞİL, çünkü iki yüzeyin amacı aynı değil.
 *
 * DENETİM KAYDINDA gerekçe şuydu: bir LOG, kişisel veriyi ikinci bir mağazaya
 * (ve §8.21 yedeğine) KOPYALAMAMALI; denetimin cevapladığı soru "kim ne zaman
 * neyi değiştirdi" ve iletişim bilgisi o soruya bir şey katmıyor.
 *
 * CSV'DE durum farklı: kullanıcı KENDİ verisini KENDİSİ dışa aktarıyor ve
 * zaten hepsine erişimi var. Burada "gizlemek" kimseyi korumuyor; soru
 * gizlilik değil AMACA UYGUNLUK (veri azaltma):
 *
 *   ÇIKIYOR   — `clientName`: hangi işin/faturanın kime ait olduğu muhasebe
 *               kaydının ta kendisi. Olmadan dosya işe yaramaz.
 *   ÇIKIYOR   — `description`, `invoiceNo`: muhasebe kaydının açıklaması.
 *               Serbest metin olmaları denetim kaydında sorundu (ADR-034'ün
 *               "değere gömülü sır" ölçümü, EKRANA basılıyordu); burada dosyayı
 *               indiren kişi o metni zaten yazmış olan kişi.
 *   ÇIKMIYOR  — müşterinin `email`, `phone`, `notes` alanları. Muhasebe amacına
 *               HİÇBİR katkısı yok ve dosya uygulamadan ÇIKIYOR: e-postaya
 *               eklenir, İndirilenler'de kalır, muhasebeciye gider. Amaca
 *               katkısı olmayan kişisel veriyi o yolculuğa sokmak için bir
 *               sebep yok.
 *
 * Yani ölçüt kopyalanmadı, YENİDEN TÜRETİLDİ — ve farklı bir sonuç verdi
 * (`description` denetimde yok, burada var). Bir kuralı gerekçesini okumadan
 * taşımak, ADR-039'un kaydettiği hata sınıfının aynısı olurdu.
 *
 * ⚠️ `fxRate` VE `currency` DE ÇIKIYOR: ADR-014'ün "`agreedAmount + currency`
 * kaydın kendi gerçeğini gösterir" kuralı gereği. TRY karşılığını tek başına
 * vermek, 2500 USD'lik bir hareketi denetlenemez kılardı.
 */

/* ===========================================================================
 * ⚠️ PDF BURADA YOK — KARAR VERİLDİ (T-106, kullanıcı onaylı)
 * ===========================================================================
 *
 * §4.2 "dışa aktarım" diyor, BİÇİM demiyor. PDF için sunucu tarafı üretim
 * REDDEDİLDİ ve gerekçe ölçüldü:
 *
 * ⚠️ TÜRKÇE HARFLER PDF KÜTÜPHANELERİNİN YERLEŞİK FONTLARINDA YOK.
 *   `ş` U+015F · `Ş` U+015E · `ğ` U+011F · `Ğ` U+011E · `ı` U+0131 · `İ` U+0130
 *   altısı da WinAnsi (≤ 0xFF) DIŞINDA (ölçüldü). `ö`, `ü`, `ç` içinde — yani
 *   kusur KISMİ olurdu: "Kıyı Medya" yazan bir fatura "K?y? Medya" çıkardı ve
 *   bazı sözcükler doğru göründüğü için hata geç fark edilirdi.
 *
 * Yani sunucu tarafı PDF İKİ ekleme gerektiriyordu: bir PDF kütüphanesi VE bir
 * TTF/OTF font dosyası — depoda yalnızca WOFF2 var (`src/app/fonts/*.woff2`,
 * ADR-031) ve PDF kütüphaneleri onu gömemiyor. §5.2'nin paket bütçesine iki
 * kalem, karşılığında bugün hiçbir akışın istemediği bir yetenek.
 *
 * SEÇİLEN: TARAYICI YAZDIRMA. Rapor ekranına print CSS eklenir, kullanıcı
 * "PDF olarak kaydet" ile alır. Sıfır bağımlılık, sıfır paket yükü, ve Türkçe
 * karakterleri tarayıcı zaten doğru çiziyor.
 *
 * ⚠️ BU DOSYAYA PDF EKLEMEK İSTEYEN SONRAKİ OKUYUCUYA: yukarıdaki iki ekleme
 * hâlâ gerekli ve karar kullanıcıya ait (ADR-004, onaysız bağımlılık yok).
 * Sunucudan üretilen PDF'in GERÇEK sürücüsü "e-postaya otomatik fatura eklemek"
 * gibi bir akış olur; o akış yoksa kütüphane ölü yüktür.
 * ======================================================================== */

/** Dışa aktarım sonucu — içerik ve indirme adı birlikte. */
export interface CsvExportDto {
  /** ASCII dosya adı — Türkçe karakter YOK (gerekçe `dosyaAdi`nın yanında). */
  filename: string;
  /** Tam CSV belgesi: BOM + `sep=` satırı + başlık + veri. */
  content: string;
  /** Veri satırı sayısı (başlık ve `sep=` hariç) — arayüz "0 kayıt" diyebilsin. */
  rowCount: number;
}

/** Esasın Türkçe adı — başlıkta ve dosya adında aynı sözcük kullanılsın. */
const ESAS_ADI: Record<ExportBasis, string> = { cash: 'nakit', accrual: 'tahakkuk' };

/**
 * Dosya adı — ASCII, küçük harf, tire ve alt çizgi.
 *
 * Türkçe karakter KULLANILMIYOR: `Content-Disposition` başlığında ASCII dışı
 * karakterler ek kodlama (RFC 5987 `filename*`) gerektiriyor ve bazı istemciler
 * onu yanlış çözüyor — dosya "indirme (1)" gibi adlarla kaydediliyor. Esas ve
 * dönem ADIN İÇİNDE, yani kullanıcı indirilenler klasöründe ayırt edebiliyor.
 */
function dosyaAdi(parcalar: readonly string[], basis: ExportBasis): string {
  return `${[...parcalar, ESAS_ADI[basis]].join('_')}.csv`;
}

/**
 * Dışa aktarımın tek sayfada çektiği üst sınır.
 *
 * ⚠️ `perPage` ŞEMADA 100 İLE SINIRLI (`paginationSchema`) ve o sınır ARAYÜZ
 * içindi — bir ekranda yüzden fazla satır göstermek anlamsız. Dışa aktarımda
 * ise EKSİK DOSYA sessiz bir veri kaybı olurdu: kullanıcı 100 satırlık bir CSV
 * indirir ve yılın tamamını aldığını sanır.
 *
 * Bu yüzden sınır burada ayrı ve yüksek. Şemanın `max(100)` kuralı aşılmıyor —
 * bu değer şemadan GEÇMİYOR, servis katmanında veriliyor; `fetchTransactionsForPanel`
 * `perPage`i doğrulanmış girdi olarak alıyor ve bir üst sınır koşmuyor.
 *
 * 10.000 seçildi çünkü tek kullanıcılı bir defterde yılda ~birkaç yüz hareket
 * bekleniyor (T-100'ün hacim ölçümü) ve on bin, on yılın tamamından fazlası.
 * ⚠️ AŞILDIĞINDA SESSİZ KALMIYOR: `rowCount` sınıra eşitse çağıran taraf
 * dosyanın kesilmiş OLABİLECEĞİNİ bilir — `exportTruncated` bunu söylüyor.
 */
export const EXPORT_PAGE_SIZE = 10_000;

/** Dosya üst sınıra dayandı mı — arayüz uyarmak zorunda. */
export function exportTruncated(dto: CsvExportDto): boolean {
  return dto.rowCount >= EXPORT_PAGE_SIZE;
}

/* ===========================================================================
 * 1 — İŞLEM DEFTERİ
 * ======================================================================== */

/**
 * İşlem defteri — satır başına bir para hareketi.
 *
 * ⚠️ ESAS SATIR SEÇİMİNİ DEĞİŞTİRİYOR, bir kolonu değil:
 *   nakit     → yalnızca `isPaid` hareketler (eline geçen / elinden çıkan para)
 *   tahakkuk  → hepsi (kesilen fatura ve doğan gider dahil)
 *
 * Nakit esasında `isPaid` filtresi ÇAĞIRANIN filtresinin ÜZERİNE yazılıyor:
 * kullanıcı `isPaid: false` seçip "nakit" isterse çelişkili bir dosya doğardı.
 * Esas daha güçlü bir ifade ve kazanıyor; `Ödendi` kolonu yine de duruyor ki
 * dosyada ne olduğu görünür kalsın.
 */
export async function exportTransactionsCsv(
  filter: TransactionFilterInput,
  basis: ExportBasis,
  client = db,
): Promise<CsvExportDto> {
  const islemler = await fetchTransactionsForExport(
    {
      ...filter,
      // Nakit esası ÖDENMİŞLERİ taşır; çağıranın aksi yöndeki filtresi ezilir.
      ...(basis === 'cash' ? { isPaid: true } : {}),
    },
    EXPORT_PAGE_SIZE,
    client,
  );

  const headers = [
    'Tarih',
    'Tür',
    'Kategori',
    'İş',
    'Müşteri',
    'Tutar',
    'Para Birimi',
    'Kur',
    basis === 'cash' ? 'TRY Karşılığı (tahsil/ödenmiş)' : 'TRY Karşılığı (kesilen/doğan)',
    'Yöntem',
    'Ödendi',
    'Fatura No',
    'Açıklama',
  ] as const;

  const rows = islemler.map((islem) => [
    csvText(islem.date),
    csvText(islem.type === 'INCOME' ? 'Gelir' : 'Gider'),
    csvText(islem.categoryName),
    csvText(islem.jobTitle),
    csvText(islem.clientName),
    csvMoney(islem.amount),
    csvText(islem.currency),
    csvMoney(islem.fxRate),
    csvMoney(islem.baseAmount),
    csvText(islem.method),
    csvBoolean(islem.isPaid),
    csvText(islem.invoiceNo),
    csvText(islem.description),
    // ⚠️ MÜŞTERİNİN `email`/`phone`/`notes` ALANLARI YOK — gerekçe dosya başında.
  ]);

  return {
    filename: dosyaAdi(['islemler', filter.from ?? 'tum', filter.to ?? 'tarihler'], basis),
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

/* ===========================================================================
 * 2 — KATEGORİ DAĞILIMI
 * ======================================================================== */

/**
 * Kategori dağılımı — satır başına bir (kategori, İŞLEM TÜRÜ) çifti.
 *
 * ⚠️ `typeMismatch` KOLONU DOSYAYA GİRİYOR (ADR-039). Bir kategorinin türü
 * sonradan değiştirilebiliyor ve altındaki işlemler kendi türünü koruyor; yani
 * "gider kategorisinde gelir işlemi" MEŞRU. Dosyada aynı kategori iki satır
 * üretebilir ve bunu açıklamayan bir dosya okuyucusunu yanıltır — kolon o
 * yüzden var, gizlenmiyor.
 */
export async function exportCategoryBreakdownCsv(
  range: ReportRange,
  basis: ExportBasis,
  client = db,
): Promise<CsvExportDto> {
  const satirlar = await fetchCategoryBreakdown(range, client);

  const tutarBasligi = basis === 'cash' ? 'Tahsil Edilen (TRY)' : 'Kesilen (TRY)';
  const headers = [
    'Kategori',
    'İşlem Türü',
    'Kategori Türü',
    'Tür Uyuşmazlığı',
    tutarBasligi,
    'İşlem Sayısı',
  ] as const;

  const rows = satirlar.map((satir) => [
    csvText(satir.categoryName),
    csvText(satir.type === 'INCOME' ? 'Gelir' : 'Gider'),
    csvText(satir.categoryType === 'INCOME' ? 'Gelir' : 'Gider'),
    csvBoolean(satir.typeMismatch),
    csvMoney(basis === 'cash' ? satir.collected : satir.invoiced),
    csvText(String(satir.transactionCount)),
  ]);

  return {
    filename: dosyaAdi(['kategori-dagilimi', range.from, range.to], basis),
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

/* ===========================================================================
 * 3 — AYLIK ÖZET
 * ======================================================================== */

/**
 * Yılın on iki ayı — satır başına bir ay.
 *
 * HAREKETSİZ AYLAR DA SATIR ÜRETİYOR (sıfırlarla): `fetchYearlyReport` on iki
 * ayı tam döndürüyor ve dosyada ay atlamak, grafiği çizen ya da tabloyu okuyan
 * tarafı boşlukları doldurmaya zorlardı (T-102 gerekçesi).
 *
 * ⚠️ `net` KOLONU ESASLA EŞLEŞTİRİLMİŞ geliyor: `net.cash` yalnızca
 * `collected − paid`, `net.accrual` yalnızca `invoiced − incurred`. Dosyada
 * çapraz bir çıkarma YAPILMIYOR — T-102'de serviste kurulan koruma burada da
 * geçerli ve dosya kendi başına yanlış bir net hesaplayamıyor.
 */
export async function exportMonthlySummaryCsv(
  year: number,
  basis: ExportBasis,
  client = db,
): Promise<CsvExportDto> {
  const rapor = await fetchYearlyReport(year, client);

  const nakit = basis === 'cash';
  const headers = [
    'Dönem',
    'Başlangıç',
    'Bitiş',
    nakit ? 'Gelir — Tahsil Edilen (TRY)' : 'Gelir — Kesilen (TRY)',
    nakit ? 'Gider — Ödenen (TRY)' : 'Gider — Doğan (TRY)',
    nakit ? 'Net — Nakit (TRY)' : 'Net — Tahakkuk (TRY)',
    'İşlem Sayısı',
  ] as const;

  const rows = rapor.months.map((ay) => [
    csvText(ay.period),
    csvText(ay.range.from),
    csvText(ay.range.to),
    csvMoney(nakit ? ay.income.collected : ay.income.invoiced),
    csvMoney(nakit ? ay.expense.paid : ay.expense.incurred),
    csvMoney(nakit ? ay.net.cash : ay.net.accrual),
    csvText(String(ay.transactionCount)),
  ]);

  /*
   * YIL TOPLAMI SON SATIR OLARAK EKLENMİYOR ve bu bilinçli: bir tablo
   * programında veri satırlarıyla aynı kolonlarda duran bir "TOPLAM" satırı,
   * kullanıcı sıraladığında ya da filtrelediğinde veriye KARIŞIR ve toplamlar
   * iki kez sayılır. Yıl toplamı `fetchYearlyReport`tan okunabiliyor; tablo
   * programı da kendi toplamını alabiliyor.
   */
  return {
    filename: dosyaAdi(['aylik-ozet', String(year)], basis),
    content: buildCsv(headers, rows),
    rowCount: rows.length,
  };
}

/*
 * ⚠️ `monthlySummaryRange` YAZILDI VE SİLİNDİ (T-106) — kapsam ölçümü buldurdu.
 *
 * Yılın gün aralığını döndüren bir yardımcıydı ("arayüz başlıkta gösterebilsin")
 * ve testsiz kalmıştı. Testini yazmak yerine NEDEN testsiz kaldığına baktım:
 * çağıranı yoktu, çünkü `fetchYearlyReport` DTO'sunda `range` zaten AYNI
 * bilgiyi taşıyor. Yani yardımcı bir kolaylık değil, ikinci bir kaynaktı.
 *
 * "Çalışıyormuş gibi görünen ölü kod" bu deponun en pahalı sınıfı (T-040).
 * Kapsam boşluğunu test ekleyerek kapatmak onu KALICI hâle getirirdi.
 */
