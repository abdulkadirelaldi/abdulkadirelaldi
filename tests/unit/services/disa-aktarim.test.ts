import { describe, expect, it, vi } from 'vitest';

import {
  exportBasisSchema,
  exportDatasetSchema,
  monthlyReportSchema,
  reportRangeSchema,
  transactionFilterSchema,
  yearlyReportSchema,
} from '@/lib/schemas';
import {
  CSV_BOM,
  CSV_DELIMITER,
  CSV_SEPARATOR_HINT,
  buildCsv,
  csvBoolean,
  csvMoney,
  csvText,
} from '@/server/services/_shared/csv';
import {
  EXPORT_PAGE_SIZE,
  exportCategoryBreakdownCsv,
  exportMonthlySummaryCsv,
  exportTransactionsCsv,
  exportTruncated,
} from '@/server/services/export';

import { decimal } from '../_helpers/decimal-kacak';

/**
 * CSV DIŞA AKTARIM + RAPOR DÖNEMİ ŞEMASI — T-106.
 *
 * ⚠️ BU DOSYANIN EN ÖNEMLİ BLOĞU "FORMÜL ENJEKSİYONU": zincir varsayımsal değil
 * — §6 dönüşümü ziyaretçinin gönderdiği `ContactMessage.name`i `Client.name`e
 * taşıyor ve o da CSV'nin "Müşteri" kolonuna düşüyor.
 */

/* ===========================================================================
 * CSV KODLAYICI — ölçülen kararlar
 * ======================================================================== */

describe('CSV kodlayıcı', () => {
  it('BOM + `sep=;` satırı + CRLF', () => {
    const belge = buildCsv(['A', 'B'], [['1', '2']]);

    // Excel UTF-8'i BOM olmadan tahmin eder ve Türkçe karakterlerde yanılır.
    expect(belge.startsWith(CSV_BOM)).toBe(true);
    expect([...Buffer.from(CSV_BOM, 'utf8')]).toEqual([0xef, 0xbb, 0xbf]);
    // Ayırıcı okuyucunun YERELİNDEN bağımsız olsun.
    expect(belge.slice(1).startsWith(`${CSV_SEPARATOR_HINT}\r\n`)).toBe(true);
    expect(belge.endsWith('\r\n')).toBe(true);
    expect(belge).toContain('A;B');
  });

  it('ayırıcı `;` — ondalık virgülle çakışmasın', () => {
    /*
     * ÖLÇÜLDÜ: `Intl.NumberFormat('tr-TR')` ondalık `,` kullanıyor ve
     * `"1234,50"` VİRGÜL ayırıcılı bir CSV'de iki hücreye bölünür.
     */
    expect(CSV_DELIMITER).toBe(';');
    expect(csvMoney('1234.50')).toBe('1234,50');
    expect(csvMoney('1234.50').split(CSV_DELIMITER)).toHaveLength(1);
  });

  it('⚠️ para dönüşümü TAMAMEN DİZE — `Number` yolu YOK', () => {
    /*
     * ADR-014/D ile çatışma GÖRÜNÜRDE: çözüm, sayıya hiç çevirmemek. Değişen
     * tek şey ondalık ayırıcı karakteri; kuruş hassasiyeti korunuyor.
     */
    expect(csvMoney('0.01')).toBe('0,01');
    expect(csvMoney('-500.00')).toBe('-500,00');
    // `Number()` yolundan geçseydi bu değer kuruş kaybederdi.
    expect(csvMoney('12345678901.99')).toBe('12345678901,99');
    // Binlik ayırıcı EKLENMİYOR — nokta hem binlik hem ondalık okunabilirdi.
    expect(csvMoney('1234567.50')).not.toContain('.');
  });

  it('`null` tutar BOŞ HÜCRE — `0,00` DEĞİL', () => {
    // Bir tabloda `0,00` toplamlara girer, boş hücre girmez (ADR-014 ayrımı).
    expect(csvMoney(null)).toBe('');
    expect(csvMoney(undefined)).toBe('');
    expect(csvMoney('')).toBe('');
  });

  it('tırnaklama RFC 4180 — ayırıcı, tırnak ve satır sonu', () => {
    expect(csvText('a;b')).toBe('"a;b"');
    expect(csvText('a"b')).toBe('"a""b"');
    expect(csvText('a\nb')).toBe('"a\nb"');
    expect(csvText('sade')).toBe('sade');
    expect(csvText(null)).toBe('');
  });

  it('Türkçe karakterler bozulmadan geçiyor', () => {
    expect(csvText('Şişli Ağaçlı İğne ÖÇÜ')).toBe('Şişli Ağaçlı İğne ÖÇÜ');
  });

  it('boole Türkçe okunuyor', () => {
    expect(csvBoolean(true)).toBe('Evet');
    expect(csvBoolean(false)).toBe('Hayır');
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * ⚠️⚠️ FORMÜL ENJEKSİYONU
   * ──────────────────────────────────────────────────────────────────────── */

  it('⚠️ formül önekleri TEK TIRNAKLA etkisizleştiriliyor', () => {
    for (const tehlikeli of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\tx', '\rx']) {
      expect(csvText(tehlikeli), `${JSON.stringify(tehlikeli)} korunmadı`).toContain("'");
      expect(csvText(tehlikeli).replace(/^"?'/, '').replace(/"$/, '')).toBe(tehlikeli);
    }
  });

  it('⚠️ `=HYPERLINK(...)` metne çevriliyor VE tırnaklanıyor', () => {
    // Önek tırnaklamadan ÖNCE eklenmeli, yoksa `'` tırnakların içinde kalır ve
    // tablo programı onu veri sanar.
    const sonuc = csvText('=HYPERLINK("http://kotu";"tikla")');
    expect(sonuc.startsWith(`"'=`)).toBe(true);
    expect(sonuc).toContain('""http://kotu""');
  });

  it('⚠️ TUTAR hücrelerine formül koruması UYGULANMIYOR — negatifler sayı kalmalı', () => {
    /*
     * `-500,00` tire ile başlıyor. `csvText`ten geçirilseydi `'-500,00` olurdu
     * ve tablo programı onu METİN sayardı — bütün toplamlar bozulurdu. Bu
     * yüzden tutarlar ayrı bir yoldan (`csvMoney`) geçiyor.
     */
    expect(csvMoney('-500.00')).toBe('-500,00');
    expect(csvMoney('-500.00')).not.toContain("'");
    expect(csvText('-500,00')).toBe("'-500,00"); // karşıtlık: metin yolu korur
  });

  it('zararsız metin DOKUNULMADAN geçiyor', () => {
    for (const temiz of ['Kıyı Medya', 'FTR-001', '2026-03-10', 'Gelir']) {
      expect(csvText(temiz)).toBe(temiz);
    }
  });
});

/* ===========================================================================
 * DIŞA AKTARIM — hangi kolonlar, hangi esas
 * ======================================================================== */

function islem(ek: Record<string, unknown> = {}) {
  return {
    id: 'trx_1',
    type: 'INCOME' as const,
    amount: decimal('2500'),
    currency: 'USD' as const,
    fxRate: decimal('34.25'),
    baseAmount: decimal('85625'),
    date: new Date('2026-03-10T00:00:00.000Z'),
    categoryId: 'cat_1',
    jobId: 'job_1',
    clientId: 'cli_1',
    method: 'BANK_TRANSFER' as const,
    isPaid: true,
    paidAt: null,
    invoiceNo: 'FTR-001',
    sourceRecurringId: null,
    createdAt: new Date('2026-03-10T09:00:00.000Z'),
    updatedAt: new Date('2026-03-11T09:00:00.000Z'),
    description: 'Birinci taksit',
    category: { name: 'Proje Geliri' },
    job: { title: 'Kurumsal site' },
    client: { name: 'Kıyı Medya' },
    ...ek,
  };
}

function islemIstemci(satirlar: unknown[] = [islem()]) {
  const findMany = vi.fn().mockResolvedValue(satirlar);
  return { client: { transaction: { findMany } } as never, findMany };
}

const FILTRE = transactionFilterSchema.parse({ from: '2026-03-01', to: '2026-03-31' });

describe('exportTransactionsCsv', () => {
  it('⚠️ ESAS KOLON BAŞLIĞINDA yazılı', async () => {
    const { client } = islemIstemci();

    const nakit = await exportTransactionsCsv(FILTRE, 'cash', client);
    expect(nakit.content).toContain('TRY Karşılığı (tahsil/ödenmiş)');

    const tahakkuk = await exportTransactionsCsv(FILTRE, 'accrual', client);
    expect(tahakkuk.content).toContain('TRY Karşılığı (kesilen/doğan)');
  });

  it('⚠️ ESAS DOSYA ADINDA da yazılı', async () => {
    const { client } = islemIstemci();

    expect((await exportTransactionsCsv(FILTRE, 'cash', client)).filename).toBe(
      'islemler_2026-03-01_2026-03-31_nakit.csv',
    );
    expect((await exportTransactionsCsv(FILTRE, 'accrual', client)).filename).toContain(
      '_tahakkuk.csv',
    );
  });

  it('dosya adı ASCII — Türkçe karakter YOK', async () => {
    const { client } = islemIstemci();
    const dto = await exportTransactionsCsv(FILTRE, 'cash', client);

    // `Content-Disposition` ASCII dışı karakterlerde ek kodlama gerektiriyor.
    expect(dto.filename).toMatch(/^[a-z0-9_.-]+$/);
  });

  it('⚠️ NAKİT esası `isPaid: true` filtresini ZORLUYOR', async () => {
    // Kullanıcı `isPaid: false` seçip "nakit" isterse çelişkili dosya doğardı.
    const { client, findMany } = islemIstemci();
    await exportTransactionsCsv(transactionFilterSchema.parse({ isPaid: 'false' }), 'cash', client);

    expect(findMany.mock.calls[0]?.[0].where.isPaid).toBe(true);
  });

  it('tahakkuk esası çağıranın filtresine DOKUNMUYOR', async () => {
    const { client, findMany } = islemIstemci();
    await exportTransactionsCsv(
      transactionFilterSchema.parse({ isPaid: 'false' }),
      'accrual',
      client,
    );

    expect(findMany.mock.calls[0]?.[0].where.isPaid).toBe(false);
  });

  it('⚠️ §8.20 — MÜŞTERİ ADI var, e-posta/telefon/not YOK', async () => {
    /*
     * Ölçüt denetim kaydının ölçütünden FARKLI ve yeniden türetildi: burada soru
     * gizlilik değil AMACA UYGUNLUK. `clientName` muhasebe kaydının kendisi;
     * iletişim bilgisi amaca katkısı olmadan dosyayla birlikte uygulamadan
     * ÇIKARDI (e-postaya eklenir, muhasebeciye gider).
     */
    const { client } = islemIstemci();
    const dto = await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(dto.content).toContain('Kıyı Medya');
    expect(dto.content).toContain('Müşteri');
    // Müşterinin iletişim alanları kolon olarak da YOK.
    expect(dto.content).not.toContain('E-posta');
    expect(dto.content).not.toContain('Telefon');
    expect(dto.content).not.toMatch(/\bNot\b/);
  });

  it('`description` ve `invoiceNo` ÇIKIYOR — denetim kaydından farklı karar', async () => {
    const { client } = islemIstemci();
    const dto = await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(dto.content).toContain('Birinci taksit');
    expect(dto.content).toContain('FTR-001');
  });

  it('`currency` ve `fxRate` ÇIKIYOR — ADR-014, kaydın kendi gerçeği', async () => {
    const { client } = islemIstemci();
    const dto = await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(dto.content).toContain('USD');
    expect(dto.content).toContain('34,25000000');
    expect(dto.content).toContain('85625,00');
  });

  it('⚠️ ZİYARETÇİ KAYNAKLI müşteri adı formül olarak çalışmıyor', async () => {
    /*
     * GERÇEK ZİNCİR: iletişim formuna `=HYPERLINK(...)` yazan biri →
     * `findOrCreateClientForMessage` → `Client.name` → CSV "Müşteri" kolonu.
     */
    const { client } = islemIstemci([
      islem({ client: { name: '=HYPERLINK("http://kotu";"tikla")' } }),
    ]);
    const dto = await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(dto.content).toContain(`"'=HYPERLINK`);
    // Ham formül hücre başında DEĞİL.
    expect(dto.content).not.toContain(';=HYPERLINK');
  });

  it('`rowCount` veri satırını sayıyor — başlık ve `sep=` hariç', async () => {
    const { client } = islemIstemci([islem(), islem({ id: 'trx_2' })]);
    const dto = await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(dto.rowCount).toBe(2);
    // BOM + sep + başlık + 2 veri + son CRLF
    expect(dto.content.trimEnd().split('\r\n')).toHaveLength(4);
  });

  it('boş sonuç BAŞLIKLI dosya veriyor — boş dosya değil', async () => {
    const { client } = islemIstemci([]);
    const dto = await exportTransactionsCsv(FILTRE, 'cash', client);

    expect(dto.rowCount).toBe(0);
    expect(dto.content).toContain('Tarih;Tür;Kategori');
  });

  it('⚠️ SAYFALAMA YOK, üst sınır var ve AŞILDIĞINDA sessiz kalmıyor', async () => {
    const { client, findMany } = islemIstemci();
    await exportTransactionsCsv(FILTRE, 'accrual', client);

    expect(findMany.mock.calls[0]?.[0].take).toBe(EXPORT_PAGE_SIZE);
    expect(findMany.mock.calls[0]?.[0].skip).toBeUndefined();

    // Eksik dosya sessiz bir veri kaybı olurdu; `exportTruncated` uyarıyor.
    expect(exportTruncated({ filename: 'x', content: '', rowCount: EXPORT_PAGE_SIZE })).toBe(true);
    expect(exportTruncated({ filename: 'x', content: '', rowCount: 5 })).toBe(false);
  });

  it('defter KRONOLOJİK — en eski üstte', async () => {
    const { client, findMany } = islemIstemci();
    await exportTransactionsCsv(FILTRE, 'accrual', client);

    // Ekran listesi `desc`; defter `asc` — iki yüzey, iki soru.
    expect(findMany.mock.calls[0]?.[0].orderBy).toEqual([{ date: 'asc' }, { createdAt: 'asc' }]);
  });
});

/* ===========================================================================
 * KATEGORİ DAĞILIMI + AYLIK ÖZET
 * ======================================================================== */

describe('exportCategoryBreakdownCsv', () => {
  const ARALIK = reportRangeSchema.parse({ from: '2026-03-01', to: '2026-03-31' });

  function kategoriIstemci() {
    const groupBy = vi.fn().mockResolvedValue([
      {
        categoryId: 'cat_1',
        type: 'INCOME' as const,
        isPaid: true,
        _sum: { baseAmount: decimal('1000') },
        _count: 2,
      },
      {
        categoryId: 'cat_1',
        type: 'INCOME' as const,
        isPaid: false,
        _sum: { baseAmount: decimal('500') },
        _count: 1,
      },
    ]);
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: 'cat_1', name: 'Yazılım', type: 'EXPENSE' as const }]);
    return { client: { transaction: { groupBy }, transactionCategory: { findMany } } as never };
  }

  it('⚠️ esas HANGİ KOLONU taşıdığını söylüyor', async () => {
    const { client } = kategoriIstemci();

    const nakit = await exportCategoryBreakdownCsv(ARALIK, 'cash', client);
    expect(nakit.content).toContain('Tahsil Edilen (TRY)');
    expect(nakit.content).toContain('1000,00'); // collected

    const tahakkuk = await exportCategoryBreakdownCsv(ARALIK, 'accrual', client);
    expect(tahakkuk.content).toContain('Kesilen (TRY)');
    expect(tahakkuk.content).toContain('1500,00'); // invoiced
  });

  it('⚠️ `typeMismatch` DOSYAYA giriyor (ADR-039) — gizlenmiyor', async () => {
    // Kategori GİDER, işlemler GELİR: meşru ama açıklanmalı.
    const { client } = kategoriIstemci();
    const dto = await exportCategoryBreakdownCsv(ARALIK, 'accrual', client);

    expect(dto.content).toContain('Tür Uyuşmazlığı');
    expect(dto.content).toContain('Evet');
    // İŞLEMİN türü ve KATEGORİNİN türü ayrı kolonlar.
    expect(dto.content).toContain('İşlem Türü');
    expect(dto.content).toContain('Kategori Türü');
  });
});

describe('exportMonthlySummaryCsv', () => {
  function yilIstemci() {
    const groupBy = vi.fn().mockResolvedValue([
      {
        date: new Date('2026-03-10T00:00:00.000Z'),
        type: 'INCOME' as const,
        isPaid: true,
        _sum: { baseAmount: decimal('1000') },
        _count: 1,
      },
    ]);
    const findMany = vi.fn().mockResolvedValue([]);
    return { client: { transaction: { groupBy }, transactionCategory: { findMany } } as never };
  }

  it('ON İKİ ay satırı — hareketsiz aylar da', async () => {
    const { client } = yilIstemci();
    const dto = await exportMonthlySummaryCsv(2026, 'cash', client);

    expect(dto.rowCount).toBe(12);
    expect(dto.content).toContain('2026-01');
    expect(dto.content).toContain('2026-12');
  });

  it('⚠️ net ESASLA EŞLEŞTİRİLMİŞ — dosyada çapraz çıkarma yok', async () => {
    const { client } = yilIstemci();

    expect((await exportMonthlySummaryCsv(2026, 'cash', client)).content).toContain(
      'Net — Nakit (TRY)',
    );
    expect((await exportMonthlySummaryCsv(2026, 'accrual', client)).content).toContain(
      'Net — Tahakkuk (TRY)',
    );
  });

  it('⚠️ TOPLAM SATIRI YOK — sıralamada veriye karışırdı', async () => {
    const { client } = yilIstemci();
    const dto = await exportMonthlySummaryCsv(2026, 'cash', client);

    expect(dto.content).not.toContain('TOPLAM');
    expect(dto.rowCount).toBe(12); // 12 ay, 13. satır yok
  });
});

/* ===========================================================================
 * ⚠️ RAPOR DÖNEMİ ŞEMASI — ÖLÇÜLEN 500'ÜN KAPISI
 * ======================================================================== */

describe('rapor dönemi şeması', () => {
  it('⚠️ `?month=99` REDDEDİLİYOR — 500 yerine alan hatası', () => {
    const sonuc = monthlyReportSchema.safeParse({ year: '2026', month: '99' });

    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues[0]?.path).toEqual(['month']);
  });

  it('URL dizeleri sayıya çevriliyor (`z.coerce`)', () => {
    expect(monthlyReportSchema.parse({ year: '2026', month: '3' })).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it('sessiz dönüşüm YOK — `abc`, `""`, ondalık reddediliyor', () => {
    /*
     * `z.coerce.boolean()`in tersine `z.coerce.number()` sessiz değil:
     * `"abc"` → NaN ve `.int()` reddediyor, `""` → 0 ve `min` reddediyor.
     */
    for (const kotu of ['abc', '', '2026.5', '-1']) {
      expect(monthlyReportSchema.safeParse({ year: kotu, month: '3' }).success, kotu).toBe(false);
    }
  });

  it('⚠️ YIL SINIRI 1000–9999 — ÖLÇÜLEN teknik gerçek', () => {
    /*
     * Ölçüm: 999 ve 10000 için `appDayToDate` FIRLATIYOR, ve daha kötüsü
     * `buildPeriodKey` SESSİZCE bozuk anahtar üretiyor (`"999-03-"`,
     * `"10000-0"`) çünkü `day.slice(0, 7)` dört basamaklı yıl varsayıyor.
     * ADR-015'in idempotanslığı o biçime bağlı.
     */
    expect(yearlyReportSchema.safeParse({ year: '1000' }).success).toBe(true);
    expect(yearlyReportSchema.safeParse({ year: '9999' }).success).toBe(true);
    expect(yearlyReportSchema.safeParse({ year: '999' }).success).toBe(false);
    expect(yearlyReportSchema.safeParse({ year: '10000' }).success).toBe(false);
  });

  it('sınır değerleri kabul ediliyor — ay 1 ve 12', () => {
    expect(monthlyReportSchema.safeParse({ year: '2026', month: '1' }).success).toBe(true);
    expect(monthlyReportSchema.safeParse({ year: '2026', month: '12' }).success).toBe(true);
    expect(monthlyReportSchema.safeParse({ year: '2026', month: '0' }).success).toBe(false);
    expect(monthlyReportSchema.safeParse({ year: '2026', month: '13' }).success).toBe(false);
  });

  it('`month` AYRI ŞEMADA — yıllık rapor onu istemiyor', () => {
    // Tek şemada opsiyonel `month`, hangi raporun istendiğini ÇALIŞMA
    // ZAMANINDA anlamayı gerektirirdi.
    expect('month' in yearlyReportSchema.parse({ year: '2026' })).toBe(false);
    expect(monthlyReportSchema.safeParse({ year: '2026' }).success).toBe(false);
  });

  it('TERS aralık reddediliyor — sessizce boş liste dönmüyor', () => {
    const sonuc = reportRangeSchema.safeParse({ from: '2026-03-31', to: '2026-03-01' });

    expect(sonuc.success).toBe(false);
    expect(sonuc.error?.issues[0]?.path).toEqual(['to']);
  });

  it('⚠️ `basis` ZORUNLU — varsayılan yok', () => {
    /*
     * Varsayılan vermek, kullanıcının SEÇMEDİĞİ bir esası ona atfetmek olurdu
     * ve dosya bir muhasebeciye gidiyor.
     */
    expect(exportBasisSchema.safeParse(undefined).success).toBe(false);
    expect(exportBasisSchema.safeParse('cash').success).toBe(true);
    expect(exportBasisSchema.safeParse('accrual').success).toBe(true);
    expect(exportBasisSchema.safeParse('gelir').success).toBe(false);
  });

  it('veri kümesi üç değerle sınırlı', () => {
    expect(exportDatasetSchema.options).toEqual(['transactions', 'categories', 'monthly']);
  });
});
