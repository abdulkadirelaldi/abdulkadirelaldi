/**
 * CSV kodlayıcı — §4.2 dışa aktarım, T-106.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARARLAR ÖLÇÜLDÜ, VARSAYILMADI (T-106)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dosyanın okuyucusu bir TABLO PROGRAMIDIR (§1.B tek kullanıcılı panel; dosya
 * indirilip Excel'de açılır ya da muhasebeciye gönderilir). Kararlar o okuyucuya
 * göre verildi ve her biri ölçüme dayanıyor:
 *
 * 1. AYIRICI `;` — ÇÜNKÜ ONDALIK AYIRICI `,`.
 *
 *    `Intl.NumberFormat('tr-TR')` ölçümü: binlik `.`, ondalık `,`
 *    (`1234567.5` → `1.234.567,50`). Yani Türkçe bir tablo programı `1234,50`
 *    bekler. Ölçüldü: `"1234,50"` VİRGÜL ayırıcılı bir CSV'de İKİ HÜCREYE
 *    bölünüyor, noktalı virgülle TEK hücre kalıyor. İkisi aynı dosyada
 *    olamıyor; ondalık virgülü seçmek ayırıcıyı `;` yapmayı ZORUNLU kılıyor.
 *
 * 2. `sep=;` İLK SATIR — okuyucunun YERELİNDEN BAĞIMSIZ olsun.
 *
 *    Excel ayırıcıyı işletim sisteminin "liste ayırıcısı" ayarından okur; tr-TR
 *    kurulumda `;`, en-US kurulumda `,`. `sep=` satırı olmadan dosya MAKİNEYE
 *    GÖRE farklı açılır — tam olarak bu projenin kaçındığı ortam bağımlı sessiz
 *    bozulma. Satır Excel ve LibreOffice tarafından anlaşılıyor.
 *
 *    ⚠️ BEDELİ KAYITLI: katı bir RFC 4180 ayrıştırıcısı o satırı tek hücreli
 *    bir VERİ SATIRI olarak görür. Tercih bilinçli — dosyanın hedefi tablo
 *    programı, betik değil. Makine okunur bir aktarım gerekirse o AYRI bir
 *    artefakt olur (`sep=` yok, ayırıcı `,`, ondalık `.`); bu dosya ikisini
 *    birden olmaya çalışmıyor.
 *
 * 3. UTF-8 BOM (`EF BB BF`, ölçüldü) — Excel UTF-8'i BOM olmadan tahmin eder ve
 *    Türkçe karakterlerde yanılır (`Şişli` → `ÅiÅli`). BOM tahmini kaldırıyor.
 *
 * 4. SATIR SONU `\r\n` — RFC 4180 bunu şart koşuyor ve Excel'in beklentisi de bu.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️⚠️ FORMÜL ENJEKSİYONU — GERÇEK BİR SALDIRI YOLU VAR, VARSAYIMSAL DEĞİL
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `=`, `+`, `-`, `@`, TAB ya da CR ile başlayan bir hücreyi Excel FORMÜL olarak
 * değerlendirir (ölçüldü). `=HYPERLINK(...)` ya da harici bir çağrı, dosyayı
 * açan kişinin makinesinde çalışır.
 *
 * ⚠️ VE BU VERİ HER ZAMAN BİZİM DEĞİL: §6 dönüşümü ZİYARETÇİNİN gönderdiği
 * `ContactMessage.name`i `Client.name`e taşıyor (`findOrCreateClientForMessage`),
 * o da bu CSV'nin "Müşteri" kolonuna düşüyor. Yani iletişim formuna
 * `=HYPERLINK("http://…")` yazan biri, panel sahibinin indirdiği dosyaya formül
 * koyabilir. Zincir ölçülebilir ve kapatılması zorunlu.
 *
 * KORUMA: tehlikeli bir karakterle başlayan her hücre TEK TIRNAKLA öneklenir —
 * tablo programı onu metin sayar. Sayısal hücrelere DOKUNULMAZ ve dokunulmaması
 * önemli: negatif tutarlar `-` ile başlıyor ve onları metne çevirmek bütün
 * toplamları bozardı. Bu yüzden önekleme METİN hücrelerine uygulanıyor; tutar
 * hücreleri ayrı bir yoldan (`csvMoney`) geçiyor ve zaten yalnızca rakam,
 * virgül ve eksi içeriyor.
 */

/** Ölçülen tehlikeli ön karakterler — formül olarak değerlendirilenler. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Excel'in ayırıcıyı yerelden tahmin etmesini engelleyen satır. */
export const CSV_SEPARATOR_HINT = 'sep=;';

export const CSV_DELIMITER = ';';
export const CSV_NEWLINE = '\r\n';
export const CSV_BOM = '﻿';

/**
 * Metin hücresini kaçırır.
 *
 * SIRA ÖNEMLİ: formül öneki tırnaklamadan ÖNCE eklenir, yoksa `'` tırnakların
 * içinde kalır ve tablo programı onu veri sanar.
 *
 * Tırnaklama koşulu: ayırıcı, çift tırnak ya da satır sonu içeren her hücre.
 * İçerideki çift tırnaklar RFC 4180 gereği ikileniyor.
 */
export function csvText(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  const korunan = FORMULA_PREFIX.test(value) ? `'${value}` : value;

  const tirnakGerekli =
    korunan.includes(CSV_DELIMITER) ||
    korunan.includes('"') ||
    korunan.includes('\n') ||
    korunan.includes('\r');

  return tirnakGerekli ? `"${korunan.replaceAll('"', '""')}"` : korunan;
}

/**
 * Para dizesini tablo programının SAYI olarak okuyacağı biçime çevirir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ADR-014/D İLE ÇATIŞMA — VE NEDEN GERÇEKTE ÇATIŞMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-014/D "DTO sınırında `string`" diyor; CSV'de ise okuyucunun SAYI görmesi
 * gerekiyor. İlk bakışta iki kural çakışıyor.
 *
 * Çatışma ÇÖZÜLMÜYOR, YOK: ADR-014/D'nin yasakladığı şey paranın SAYIYA
 * ÇEVRİLMESİ (kayan nokta kuruş sapması) ve `Decimal` nesnesinin serialize
 * edilemeyen bir sınırdan geçmesi. Burada ikisi de olmuyor —
 *
 *   ⚠️ DÖNÜŞÜM TAMAMEN DİZE ÜZERİNDE: `'1234.50'` → `'1234,50'`.
 *      `Number()` ÇAĞRILMIYOR, `parseFloat` ÇAĞRILMIYOR, aritmetik YAPILMIYOR.
 *      Değişen tek şey ONDALIK AYIRICI KARAKTERİ.
 *
 * Yani CSV bir DTO sınırı değil, bir SUNUM artefaktı; ve paranın kanonik
 * gösterimi hiçbir noktada terk edilmiyor.
 *
 * BİNLİK AYIRICI EKLENMİYOR: `1.234.567,50` da geçerli olurdu ama gereksiz bir
 * belirsizlik katmanı (nokta hem binlik hem ondalık olarak görülebiliyor) ve
 * tablo programı gruplamayı KENDİ biçimlendirmesiyle zaten ekliyor.
 *
 * `null` → BOŞ HÜCRE, `0,00` DEĞİL. Ayrım ADR-014'ün kuralının aynısı:
 * "bilinmiyor" ile "sıfır" farklı şeyler ve bir tabloda `0,00` toplamlara girer,
 * boş hücre girmez.
 */
export function csvMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return value.replace('.', ',');
}

/** Boole → okunabilir Türkçe. Tablo programında `TRUE/FALSE` okunmaz. */
export function csvBoolean(value: boolean): string {
  return value ? 'Evet' : 'Hayır';
}

/**
 * Satırları tam bir CSV belgesine çevirir — BOM + `sep=` satırı + başlık + veri.
 *
 * Hücreler ÇAĞIRAN TARAFINDAN kaçırılmış gelir (`csvText`/`csvMoney`): kodlayıcı
 * bir hücrenin metin mi tutar mı olduğunu bilemez ve tahmin etmeye çalışsaydı
 * negatif tutarları formül koruması altında metne çevirirdi.
 */
export function buildCsv(headers: readonly string[], rows: readonly string[][]): string {
  const satirlar = [
    CSV_SEPARATOR_HINT,
    headers.map((h) => csvText(h)).join(CSV_DELIMITER),
    ...rows.map((row) => row.join(CSV_DELIMITER)),
  ];

  // Sonda satır sonu: POSIX araçları (`wc -l`, `tail`) son satırı eksik saymasın.
  return CSV_BOM + satirlar.join(CSV_NEWLINE) + CSV_NEWLINE;
}
