import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * CSV KOLONU DOĞRU YOLDAN GEÇİYOR — METİN KORUNUR, TUTAR KORUNMAZ (T-109g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DENETİM: BACKEND NE ÖLÇTÜ, NE ÖLÇÜLMEDİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/unit/services/disa-aktarim.test.ts` (Backend) formül enjeksiyonunu
 * çok iyi ölçüyor ve İKİ YOLUN KARŞITLIĞINI sabitliyor:
 *
 *   `csvText`  → `=`, `+`, `-`, `@`, TAB, CR ile başlayan hücre TEK TIRNAKLA
 *                öneklenir (önek TIRNAKLAMADAN ÖNCE — sıra ölçülmüş)
 *   `csvMoney` → koruma UYGULANMAZ, çünkü `-500,00` tire ile başlıyor ve
 *                öneklenirse tablo programı onu SAYI olarak okumaz; bütün
 *                toplamlar bozulur
 *
 * Uçtan uca zincir de ölçülü: ziyaretçinin iletişim formundan gelen
 * `Client.name` CSV'nin "Müşteri" kolonuna çıkıyor ve formül olarak
 * ÇALIŞMIYOR. Denetledim — doğru ve yeterli.
 *
 * ⚠️ ÖLÇÜLMEYEN ŞEY: **YENİ BİR KOLONUN YANLIŞ YOLDAN GEÇMESİ.**
 *
 * Backend'in iddiaları biçimlendiricilerin DAVRANIŞINI ve bir kolonun
 * (`Müşteri`) uçtan uca davranışını sabitliyor. Ama kolon listesi büyüdüğünde:
 *
 *   METİN kolonu `csvMoney`den geçerse → enjeksiyon GERİ GELİR. Hiçbir iddia
 *     kırılmaz: `Müşteri` kolonu hâlâ korunuyor, yeni kolon korunmuyor.
 *   TUTAR kolonu `csvText`ten geçerse → her NEGATİF tutar `'` öneki alır ve
 *     tablo programında toplamlar bozulur. Yine hiçbir iddia kırılmaz.
 *
 * İkisi de tek karakterlik düzenleme (`csvText` ↔ `csvMoney`) ve ikisinin de
 * sonucu sessiz. Bu kapı kolonları ADLARIYLA yollarına bağlıyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÜÇÜNCÜ RİSK: KOLON KAYMASI
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `headers` ve satır dizisi PARALEL iki liste. Birine kolon eklenip diğerine
 * eklenmezse dosya kayar: her hücre bir sonraki başlığın altına düşer. Tutar
 * `Yöntem` kolonunda görünür, açıklama `Fatura No`da. Dosya açılır, hata
 * vermez, yanlıştır. Uzunluk eşitliği bu yüzden ayrıca ölçülüyor.
 */

const KOK = resolve(__dirname, '..', '..');

const KAYNAK = readFileSync(join(KOK, 'src/server/services/export.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/.*$/gm, ' ');

/* ===========================================================================
 * SAF ÇEKİRDEK — mutasyon sentetik girdiyle sınanıyor (ADR-038)
 * ======================================================================== */

/** `const <ad> = [ … ]` bloğunun içeriği. */
export function diziGovdesi(kaynak: string, degisken: string, baslangic = 0): string {
  const basla = new RegExp(`const\\s+${degisken}\\s*=[^[]*\\[`).exec(kaynak.slice(baslangic));
  if (!basla) return '';

  const acilis = baslangic + basla.index + basla[0].length;
  let derinlik = 1;
  let i = acilis;
  while (i < kaynak.length && derinlik > 0) {
    if (kaynak[i] === '[') derinlik++;
    else if (kaynak[i] === ']') derinlik--;
    i++;
  }
  return kaynak.slice(acilis, i - 1);
}

/**
 * Başlık adları — koşullu ve DEĞİŞKENE atanmış başlıklar dahil.
 *
 * ⚠️ İLK KURULUM İKİ BİÇİMİ DE YANLIŞ OKUYORDU ve kapı ikisini de yakaladı:
 *
 *   1. `basis === 'cash' ? 'A' : 'B'` → ilk dizeyi alıyordum, o da `'cash'`
 *      oluyordu. Yani başlık listesine `cash` diye bir kolon giriyordu.
 *      Düzeltme: koşullu parçada `?`TEN SONRAKİ dize alınıyor.
 *
 *   2. `tutarBasligi` → başlık bir DEĞİŞKEN (kategori dağılımında). Dizi
 *      içinde dize yok, yani kolon hiç sayılmıyordu ve uzunluk eşitliği
 *      yanlış kırılıyordu. Düzeltme: tanım BİR ADIM geriye çözülüyor.
 *
 * Koşullu başlığın iki dalı AYNI kolondur (aynı biçimlendiriciden geçer), bu
 * yüzden `?` dalı temsilci olarak alınıyor — ikisi de sayılsaydı uzunluk
 * eşitliği yanlış kırılırdı.
 */
export function basliklar(govde: string, kaynak = ''): string[] {
  return govde
    .split(/,(?![^[]*\])/)
    .map((parca) => parca.trim())
    .filter((parca) => parca.length > 0)
    .map((parca) => {
      // (1) Koşullu: `?`ten sonraki ilk dize.
      const soruIsareti = parca.indexOf('?');
      const aranan = soruIsareti >= 0 ? parca.slice(soruIsareti) : parca;
      const dize = /'([^']*)'/.exec(aranan)?.[1];
      if (dize) return dize;

      // (2) Değişken: tanımını bir adım geriye çöz.
      const tanimlayici = /^([A-Za-z_]\w*)$/.exec(parca)?.[1];
      if (!tanimlayici || !kaynak) return '';

      const tanim = new RegExp(`const\\s+${tanimlayici}\\s*=([^;]*);`).exec(kaynak)?.[1] ?? '';
      const tanimSoru = tanim.indexOf('?');
      const tanimAranan = tanimSoru >= 0 ? tanim.slice(tanimSoru) : tanim;
      return /'([^']*)'/.exec(tanimAranan)?.[1] ?? '';
    })
    .filter((ad) => ad.length > 0);
}

/** Satır dizisindeki biçimlendirici adları, SIRAYLA. */
export function bicimlendiriciler(govde: string): string[] {
  return [...govde.matchAll(/\b(csvText|csvMoney|csvBoolean)\s*\(/g)].map((m) => m[1] ?? '');
}

/* ===========================================================================
 * BİLDİRİM — hangi kolon TUTAR yolundan geçer
 * ======================================================================== */

/**
 * `csvMoney` kullanan kolonlar. Liste KİLİTLİ.
 *
 * Bir kolonun bu listeye girmesi "formül koruması UYGULANMIYOR" demek, yani
 * bilinçli bir güvenlik kararı. Listeye ad eklemek ya da listeden ad çıkarmak
 * kapıyı kırmızıya çevirir ve yazarını gerekçe yazmaya zorlar.
 */
const TUTAR_KOLONLARI = [
  /* işlem defteri */
  'Tutar',
  'Kur',
  'TRY Karşılığı (tahsil/ödenmiş)',
  /* kategori dağılımı — başlık `tutarBasligi` değişkeninden geliyor */
  'Tahsil Edilen (TRY)',
  /* aylık özet */
  'Gelir — Tahsil Edilen (TRY)',
  'Gider — Ödenen (TRY)',
  'Net — Nakit (TRY)',
];

/*
 * ⚠️ BU LİSTEYİ İLK SEFERDE UYDURDUM ve kapının "ölü satır" iddiası yakaladı:
 * `Tahsil Edilen`, `Kesilen`, `Ödenen`, `Doğan`, `Net (Nakit)`, `Net
 * (Tahakkuk)`, `Toplam` diye adlar yazmıştım — hiçbiri dosyada yoktu. Gerçek
 * adlar ölçülüp konuldu.
 *
 * Kendi kuralımı kendime uygulamak: liste ELLE YAZILIYOR çünkü "hangi kolon
 * tutar yolundan geçer" bir KARAR, türetilecek bir olgu değil — ama adların
 * kendisi ÖLÇÜLÜR. İkisini karıştırmak, bildirimi tahmine dayandırmak olurdu.
 *
 * Koşullu başlıkların `?` dalı temsilci: `nakit ? 'Gelir — Tahsil Edilen
 * (TRY)' : 'Gelir — Kesilen (TRY)'` tek kolondur ve iki dalı AYNI
 * biçimlendiriciden geçer.
 */

interface Disaaktarim {
  islev: string;
  basliklarDegiskeni: string;
  satirDegiskeni: string;
}

const DISAAKTARIMLAR: Disaaktarim[] = [
  { islev: 'exportTransactionsCsv', basliklarDegiskeni: 'headers', satirDegiskeni: 'rows' },
  { islev: 'exportCategoryBreakdownCsv', basliklarDegiskeni: 'headers', satirDegiskeni: 'rows' },
  { islev: 'exportMonthlySummaryCsv', basliklarDegiskeni: 'headers', satirDegiskeni: 'rows' },
];

/** Bir dışa aktarımın başlık ↔ biçimlendirici eşleşmesi. */
function eslesme(islev: string): { ad: string; bicim: string }[] {
  const islevBasi = new RegExp(`function\\s+${islev}\\s*\\(`).exec(KAYNAK)?.index ?? -1;
  if (islevBasi < 0) return [];

  const bas = diziGovdesi(KAYNAK, 'headers', islevBasi);
  const satir = diziGovdesi(KAYNAK, 'rows', islevBasi);

  const adlar = basliklar(bas, KAYNAK);
  const bicimler = bicimlendiriciler(satir);

  return adlar.map((ad, i) => ({ ad, bicim: bicimler[i] ?? '(eksik)' }));
}

describe('§8.20 / formül enjeksiyonu — kolon YOLU bildirimli', () => {
  it('önkoşul — üç dışa aktarım da ayıklanabiliyor', () => {
    /*
     * Çapa. Ayıklama boşalırsa aşağıdaki iddialar boş kümede yeşil kalır —
     * T-107a'da kendi kapımda yakaladığım hâlin aynısı (`\\bDto\\b` vakumu).
     */
    for (const d of DISAAKTARIMLAR) {
      const e = eslesme(d.islev);
      expect(e.length, `${d.islev}: kolon ayıklanamadı`).toBeGreaterThan(2);
      expect(
        e.every((k) => k.bicim !== '(eksik)'),
        `${d.islev}: bazı kolonların biçimlendiricisi okunamadı`,
      ).toBe(true);
    }

    // Bilinen bir kolon gerçekten görülüyor mu.
    expect(eslesme('exportTransactionsCsv').map((k) => k.ad)).toContain('Müşteri');
  });

  it('⚠️ BAŞLIK ve SATIR dizileri AYNI uzunlukta — kolon kayması yok', () => {
    for (const d of DISAAKTARIMLAR) {
      const islevBasi = new RegExp(`function\\s+${d.islev}\\s*\\(`).exec(KAYNAK)?.index ?? 0;
      const adlar = basliklar(diziGovdesi(KAYNAK, d.basliklarDegiskeni, islevBasi), KAYNAK);
      const bicimler = bicimlendiriciler(diziGovdesi(KAYNAK, d.satirDegiskeni, islevBasi));

      expect(
        bicimler.length,
        `${d.islev}: ${adlar.length} başlık ama ${bicimler.length} hücre. Dosya KAYAR — ` +
          'her hücre bir sonraki başlığın altına düşer. Dosya açılır, hata vermez, yanlıştır.',
      ).toBe(adlar.length);
    }
  });

  it('⚠️ TUTAR yolundan geçen kolonlar BİLDİRİMLE AYNI', () => {
    /*
     * Asıl kapı. `csvMoney` formül korumasını UYGULAMIYOR (bilinçli: negatif
     * tutar öneklenirse sayı olmaktan çıkar). O yüzden hangi kolonun bu
     * yoldan geçtiği bir güvenlik kararıdır ve kilitli olmalı.
     */
    const tutarYolunda = DISAAKTARIMLAR.flatMap((d) =>
      eslesme(d.islev)
        .filter((k) => k.bicim === 'csvMoney')
        .map((k) => k.ad),
    );

    const beklenmeyen = [...new Set(tutarYolunda)].filter((ad) => !TUTAR_KOLONLARI.includes(ad));

    expect(
      beklenmeyen,
      `Bu kolonlar \`csvMoney\`den geçiyor ama bildirimde YOK: ${beklenmeyen.join(', ')}\n` +
        '`csvMoney` formül korumasını UYGULAMIYOR. Bir METİN kolonu bu yoldan ' +
        'geçerse enjeksiyon geri gelir ve Backend`in mevcut iddiaları kırılmaz ' +
        '(onlar `Müşteri` kolonunu ölçüyor). Kolon gerçekten tutar ise ' +
        '`TUTAR_KOLONLARI`na ekle.',
    ).toEqual([]);
  });

  it('⚠️ bildirilen her TUTAR kolonu `csvText`ten GEÇMİYOR', () => {
    /*
     * Ters yön: tutar kolonu metin yoluna kaydırılırsa her NEGATİF değer `'`
     * öneki alır ve tablo programında toplamlar bozulur. Tek karakterlik
     * düzenleme, sessiz sonuç.
     */
    const metinYolunda = DISAAKTARIMLAR.flatMap((d) =>
      eslesme(d.islev)
        .filter((k) => k.bicim === 'csvText' && TUTAR_KOLONLARI.includes(k.ad))
        .map((k) => `${d.islev} → ${k.ad}`),
    );

    expect(
      metinYolunda,
      `Bildirilen tutar kolonu METİN yolundan geçiyor: ${metinYolunda.join(', ')}\n` +
        'Negatif tutarlar TEK TIRNAK öneki alır ve tablo programı onları SAYI olarak ' +
        'okumaz — bütün toplamlar bozulur.',
    ).toEqual([]);
  });

  it('bildirim ÖLÜ SATIR taşımıyor — kullanılmayan kolon adı yok', () => {
    /*
     * Ölü bildirim bir gün gerçek bir kararı maskeler (ADVISORY-001`in ölü
     * override dersi). Bu iddia T-109g`de bir kez ateşlendi ve listeyi
     * ÖLÇÜLEN kolon adlarına göre düzelttim — tahminle yazdığım adlar
     * dosyada yoktu.
     */
    const tumKolonlar = new Set(DISAAKTARIMLAR.flatMap((d) => eslesme(d.islev).map((k) => k.ad)));
    const olu = TUTAR_KOLONLARI.filter((ad) => !tumKolonlar.has(ad));

    expect(olu, `Bildirimde olup dosyada OLMAYAN kolon adları: ${olu.join(', ')}`).toEqual([]);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · çekirdek gerçekten ısırıyor', () => {
  const ORNEK = [
    'function exportOrnekCsv() {',
    "  const headers = ['Tarih', 'Müşteri', 'Tutar'] as const;",
    '  const rows = kayitlar.map((k) => [csvText(k.date), csvText(k.name), csvMoney(k.amount)]);',
    '}',
  ].join('\n');

  it('başlık ve biçimlendirici SIRAYLA eşleşiyor', () => {
    const bas = diziGovdesi(ORNEK, 'headers');
    const satir = diziGovdesi(ORNEK, 'rows');

    expect(basliklar(bas)).toEqual(['Tarih', 'Müşteri', 'Tutar']);
    expect(bicimlendiriciler(satir)).toEqual(['csvText', 'csvText', 'csvMoney']);
  });

  it('METİN kolonu `csvMoney`ye kaydırılırsa yakalanıyor', () => {
    // Enjeksiyonun geri gelme biçimi: tek karakterlik düzenleme.
    const bozuk = ORNEK.replace('csvText(k.name)', 'csvMoney(k.name)');
    const bicimler = bicimlendiriciler(diziGovdesi(bozuk, 'rows'));
    const adlar = basliklar(diziGovdesi(bozuk, 'headers'));

    const tutarYolunda = adlar.filter((_, i) => bicimler[i] === 'csvMoney');
    expect(tutarYolunda).toContain('Müşteri');
  });

  it('KOLON KAYMASI yakalanıyor — başlık eklenip hücre eklenmezse', () => {
    const bozuk = ORNEK.replace(
      "['Tarih', 'Müşteri', 'Tutar']",
      "['Tarih', 'Müşteri', 'Yöntem', 'Tutar']",
    );

    expect(basliklar(diziGovdesi(bozuk, 'headers'))).toHaveLength(4);
    expect(bicimlendiriciler(diziGovdesi(bozuk, 'rows'))).toHaveLength(3);
  });

  it('KOŞULLU başlık TEK kolon sayılıyor', () => {
    /*
     * `basis === 'cash' ? 'A' : 'B'` biçimi gerçek dosyada var. İki dize
     * saysaydı uzunluk eşitliği YANLIŞ kırılır ve kapı susturulmaya davet
     * ederdi (sahte pozitif — T-108g dersi).
     */
    const kosullu = "const headers = ['Tarih', basis === 'cash' ? 'A (nakit)' : 'A (tahakkuk)'];";
    expect(basliklar(diziGovdesi(kosullu, 'headers'))).toEqual(['Tarih', 'A (nakit)']);
  });
});
