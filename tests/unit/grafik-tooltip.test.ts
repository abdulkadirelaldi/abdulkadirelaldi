import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GRAFİKTE GÖSTERİLEN SAYI `etiket`TEN GELİR, `deger`DEN GELMEZ (T-108g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KORUNMAYAN ÖLÇÜM — Frontend kendisi bildirdi
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yıllık grafikte her veri noktası İKİ alan taşıyor ve ayrım kasıtlı:
 *
 *   `deger: number` → YALNIZCA GEOMETRİ. Çubuk yüksekliği buradan geliyor ve
 *                     ekranda HİÇ YAZILMIYOR.
 *   `etiket: string` → GÖSTERİLEN her yer. `paraBicim` ile biçimlendirilmiş.
 *
 * İkisi aynı kaynak dizeden türüyor, yani tutarsız olamazlar — AMA yalnızca
 * doğru olanı basıldığı sürece.
 *
 * ⚠️ GERİLEMENİN BİÇİMİ ÇOK İNCE: `<Tooltip content={<TooltipIcerik />} />`
 * içindeki `content` propu kaldırılırsa Recharts'ın VARSAYILAN tooltip'i
 * devreye girer ve o, `dataKey`in SAYISAL değerini yazar. Yani tutar bir anda
 * `paraBicim`den değil `Number`dan gelir:
 *
 *     paraBicim  → "₺85.625,00"
 *     varsayılan → "85625"        (kuruş yok, ayırıcı yok, para birimi yok)
 *
 * Ve ekranın başka yerleri `etiket` basmaya devam ettiği için **aynı sayfada
 * iki farklı para biçimi** olur. Kullanıcı hangisine güveneceğini bilemez;
 * daha kötüsü "85625" bir TUTAR olarak okunabilir ve kuruşlar kaybolur.
 *
 * Hiçbir test bunu yakalamıyordu. Frontend ölçmüş ve iddiasını şöyle yazmış:
 * *"tooltipte ham sayı var mı — OLMAMALI: false"* — bu dosya o iddiayı kapıya
 * çeviriyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SINIR, DÜRÜSTÇE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Kaynak taraması: `content` propunun VAR olduğunu ve özel tooltip'in
 * `etiket` bastığını kanıtlıyor. Tooltip'in çalışma zamanında gerçekten o
 * dizeyi gösterdiğini kanıtlamıyor — bunun için grafiğin tembel yığını inmiş
 * hâlde bir tarayıcı adımı gerekir ve `ssr: false` olduğu için ölçüm
 * kırılgandır (yığın inene kadar DOM'da grafik yok). Kaynak düzeyinde kapı,
 * gerilemenin GERÇEKLEŞEN biçimini (prop kaldırma) tam olarak yakalıyor.
 */

const KOK = resolve(__dirname, '..', '..');
const GRAFIK = 'src/components/panel/yillik-grafik.tsx';

const kod = readFileSync(join(KOK, GRAFIK), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/.*$/gm, ' ');

/**
 * `TooltipIcerik` bileşeninin gövdesi.
 *
 * ⚠️ İLK KURULUM FAZLASINI ALIYORDU: sınırı "sonraki `\nfunction`" ile
 * arıyordum, oysa sonraki tanım `export default function YillikGrafik` — desen
 * eşleşmedi ve gövde GRAFİĞİN İÇİNE kadar uzadı. Sonuç: grafiğin meşru
 * `dataKey="gelir.deger"` satırları "tooltip `deger` basıyor" gibi okundu ve
 * kapı YANLIŞ SEBEPLE kırmızı oldu.
 *
 * Sahte pozitif, sahte negatif kadar pahalı: kapıyı "zaten yanlış ölçüyor"
 * diye gevşetmeye davet eder. Sınır artık sözdizimine değil BİÇİME bağlı —
 * satır başındaki kapanış ayracı (`\n}`), yani işlevin kendi sonu.
 */
function tooltipGovdesi(): string {
  const basla = /function\s+TooltipIcerik\s*\(/.exec(kod);
  if (!basla) return '';

  const kalan = kod.slice(basla.index);
  const kapanis = kalan.indexOf('\n}');
  return kapanis === -1 ? kalan : kalan.slice(0, kapanis + 2);
}

describe('§5.2 — tooltip ham sayı basmıyor', () => {
  it('önkoşul — grafik okundu ve özel tooltip bileşeni var', () => {
    // Çapa: dosya taşınır ya da bileşen yeniden adlandırılırsa aşağıdaki
    // iddialar "desen yok" diye boş gövdede yeşil kalırdı.
    expect(kod).toContain('recharts');
    expect(tooltipGovdesi().length, '`TooltipIcerik` bulunamadı').toBeGreaterThan(80);
  });

  it('⚠️ `Tooltip` ÖZEL içerikle kullanılıyor — varsayılana düşmüyor', () => {
    /*
     * Asıl gerileme kapısı. `content` propu kaldırıldığında Recharts kendi
     * tooltip'ini çizer ve `dataKey`in sayısal değerini yazar.
     */
    expect(
      kod,
      '`Tooltip` `content` propu olmadan kullanılıyor — Recharts VARSAYILAN ' +
        'tooltip`i devreye girer ve `dataKey`in HAM SAYISAL değerini yazar ' +
        '(`85625`, kuruş/ayırıcı/para birimi yok). Aynı sayfada iki farklı ' +
        'para biçimi oluşur.',
    ).toMatch(/<Tooltip[^>]*content=\{<TooltipIcerik/);
  });

  it('özel tooltip `etiket` basıyor', () => {
    const govde = tooltipGovdesi();

    // İki satır da gösteriliyor: tahsil edilen ve ödenen.
    expect(govde, 'tooltip `gelir.etiket` basmıyor').toMatch(/gelir\.etiket/);
    expect(govde, 'tooltip `gider.etiket` basmıyor').toMatch(/gider\.etiket/);
  });

  it('⚠️ özel tooltip `deger`i HİÇ basmıyor — geometri alanı ekrana çıkmaz', () => {
    /*
     * Negatif iddia, yukarıdaki iki pozitifle birlikte anlam taşıyor
     * (§8.18 dersi): tek başına, tooltip'i tamamen boşaltan bir düzenleme de
     * yeşil kalırdı.
     */
    const govde = tooltipGovdesi();

    expect(
      govde.match(/\.deger\b/g) ?? [],
      'tooltip `deger` alanını basıyor — gösterilen sayı `paraBicim`den değil ' +
        'ham `number`dan geliyor.',
    ).toEqual([]);
  });

  it('`deger` yalnızca GEOMETRİDE kullanılıyor — `dataKey` ve eksen', () => {
    /*
     * Pozitif tarafın tamamlayıcısı: alan var olmaya devam ediyor ve işini
     * yapıyor. Bu iddia olmadan "deger hiç kullanılmıyor" hâli de yeşil
     * kalırdı — yani çubuk yüksekliğini kaybetmiş bir grafik.
     */
    expect(kod, 'çubuk yüksekliği `deger`den gelmiyor').toMatch(/dataKey="gelir\.deger"/);
    expect(kod).toMatch(/dataKey="gider\.deger"/);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · desenler gerçekten ısırıyor', () => {
  const ozelTooltip = (k: string): boolean => /<Tooltip[^>]*content=\{<TooltipIcerik/.test(k);
  const degerBasiyor = (k: string): boolean => /\.deger\b/.test(k);

  it('`content` propu kaldırılırsa yakalanıyor', () => {
    expect(ozelTooltip('<Tooltip content={<TooltipIcerik />} cursor={{ fill: "x" }} />')).toBe(
      true,
    );
    // Gerilemenin tam biçimi: prop yok.
    expect(ozelTooltip('<Tooltip cursor={{ fill: "x" }} />')).toBe(false);
    // Başka bir içerik bileşeni de kabul edilmiyor — bildirim güncellenmeli.
    expect(ozelTooltip('<Tooltip content={<BaskaIcerik />} />')).toBe(false);
  });

  it('tooltipte `deger` kullanımı yakalanıyor, `etiket` sayılmıyor', () => {
    expect(degerBasiyor('<p>Tahsil edilen: {nokta.gelir.deger}</p>')).toBe(true);
    expect(degerBasiyor('<p>Tahsil edilen: {nokta.gelir.etiket}</p>')).toBe(false);
  });
});
