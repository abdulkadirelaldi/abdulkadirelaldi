import { paraBicim } from '@/components/panel/para-bicim';
import type { CategoryBreakdownRowDto, YearlyReportDto } from '@/server/services/report';
import { Currency } from '@/types';

/**
 * GRAFİK VERİSİ — DİZEDEN SAYIYA DÖNÜŞÜMÜN TEK YERİ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ADR-014/D İLE GERİLİM: GRAFİK SAYI İSTİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-014/D "DTO sınırında `string`" diyor ve T-103/T-104'te `Number()`'a hiç
 * dokunmadım — `para-bicim.ts` dize üzerinde gruplama yapıyor. Ama Recharts
 * geometriyi `number` ile çiziyor; `<Bar dataKey>` bir dizeyi yükseklik olarak
 * yorumlayamaz. Dönüşüm KAÇINILMAZ.
 *
 * KAÇINILMAZ OLAN ŞEYİ TEK YERE TOPLAMAK, onu güvenli kılmıyor ama GÖRÜNÜR
 * kılıyor. Bu dosya o tek yer; `Number()` başka hiçbir arayüz dosyasında yok.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * HASSASİYET KAYBI — ÖLÇÜLDÜ, SAKLANMIYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `Number('12345678901234567.89')` → 12345678901234568 (sessiz bozulma).
 * IEEE-754 çift duyarlık 2^53'ten (≈9.007×10^15) sonra tam sayıları bile
 * ayırt edemiyor. Kuruş hassasiyetiyle bu ≈90 trilyon TRY demek — panelin
 * bugünkü ve öngörülebilir tutarlarının çok ötesinde. Yani kayıp GERÇEK ama
 * bu ekranda ERİŞİLEMEZ.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ ASIL TEHLİKE BU DEĞİL: İKİ KAYNAĞIN AYRIŞMASI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Tehlike "grafik 0.01 kuruş kaydırdı" değil; grafiğin ÇİZDİĞİ sayı ile
 * kullanıcıya YAZILAN sayının iki ayrı yoldan gelmesi. Biri `Number()`'dan,
 * diğeri dizeden gelirse bir gün ayrışırlar ve kimse fark etmez.
 *
 * Bu yüzden her satır İKİ ALAN taşıyor ve ikisi AYNI dizeden üretiliyor:
 *
 *   `deger`  → yalnızca GEOMETRİ için (`Number`)
 *   `etiket` → kullanıcıya gösterilen her yerde (`paraBicim`, DİZEDEN)
 *
 * Tooltip ve eksen etiketleri `etiket`i okuyor; `deger` ekranda HİÇ
 * yazılmıyor. Ayrışma yapısal olarak imkânsız: tek girdi, iki türev.
 */

/** Grafiğe giren tek değer — geometri ve metin aynı dizeden. */
export type GrafikDeger = {
  /** Yalnızca çizim. Ekranda GÖSTERİLMEZ. */
  deger: number;
  /** Ekranda gösterilen her yer. Kaynak dizeden biçimlendirildi. */
  etiket: string;
};

function degerYap(tutar: string): GrafikDeger {
  return { deger: Number(tutar), etiket: paraBicim(tutar, Currency.TRY) };
}

/** Yıllık grafiğin bir ayı. */
export type AylikNokta = {
  /** `periodKey` — `2026-03`. */
  period: string;
  /** Kısa ay adı, eksende. */
  ay: string;
  gelir: GrafikDeger;
  gider: GrafikDeger;
  islemSayisi: number;
};

const AY_KISA = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

/**
 * Yıllık raporu grafiğe çevirir — NAKİT esası.
 *
 * ⚠️ TEK ESAS: `collected` ve `paid`. Tahakkuk (`invoiced`/`incurred`) AYNI
 * GRAFİĞE KONMUYOR — Backend'in uyarısı tam buydu ve grafik başlığı hangi
 * esasa baktığını yazıyor. İki esası aynı grafikte karıştırmak, kullanıcıya
 * "gelir şu kadar, gider bu kadar" derken birini kesilmiş diğerini ödenmiş
 * saymak olurdu.
 *
 * `months` ON İKİ ay geliyor (hareketsiz aylar sıfırlarla) — eksende boşluk
 * yok, yani "mart yok mu" sorusu doğmuyor.
 */
export function yillikGrafigeCevir(rapor: YearlyReportDto): AylikNokta[] {
  return rapor.months.map((ay) => {
    const ayNo = Number(ay.period.slice(5, 7));
    return {
      period: ay.period,
      ay: AY_KISA[ayNo - 1] ?? ay.period,
      gelir: degerYap(ay.income.collected),
      gider: degerYap(ay.expense.paid),
      islemSayisi: ay.transactionCount,
    };
  });
}

/** Kategori dağılımının bir çubuğu. */
export type KategoriCubugu = {
  /** `categoryId:type` — satır anahtarı (kategori, işlem türü) ÇİFTİ. */
  anahtar: string;
  categoryId: string;
  ad: string;
  /** İŞLEMİN türü — gruplama anahtarı. */
  tur: CategoryBreakdownRowDto['type'];
  /** Kategorinin KENDİ türü. */
  kategoriTuru: CategoryBreakdownRowDto['categoryType'];
  /** ADR-039 — arayüz bunu AÇIKLAMAK zorunda, saklamamalı. */
  uyusmazlik: boolean;
  tutar: GrafikDeger;
  islemSayisi: number;
};

/**
 * Kategori dağılımını çubuklara çevirir — TAHAKKUK esası (`invoiced`).
 *
 * Backend sıralamayı `invoiced` azalan yapıyor ve dağılımın sorusu "en çok
 * nerede"; bu yüzden çubuk da `invoiced` okuyor. Sıralama SUNUCUDAN geldiği
 * gibi korunuyor — istemcide yeniden sıralamak, eşitlikteki ikincil anahtarı
 * (ad) kaybettirip sırayı her yenilemede değiştirebilirdi.
 *
 * ⚠️ SATIR ANAHTARI (kategori, İŞLEM TÜRÜ) ÇİFTİ: bir kategori İKİ satır
 * üretebilir (ADR-039). `categoryId` tek başına anahtar DEĞİL — React
 * `key`inde kullanmak iki satırı çakıştırırdı.
 */
export function kategoriCubuklariniCevir(satirlar: CategoryBreakdownRowDto[]): KategoriCubugu[] {
  return satirlar.map((s) => ({
    anahtar: `${s.categoryId}:${s.type}`,
    categoryId: s.categoryId,
    ad: s.categoryName,
    tur: s.type,
    kategoriTuru: s.categoryType,
    uyusmazlik: s.typeMismatch,
    tutar: degerYap(s.invoiced),
    islemSayisi: s.transactionCount,
  }));
}
