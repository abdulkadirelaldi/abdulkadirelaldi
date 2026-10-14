import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ADR-040 — ELLE TETİKLEMEYİ GÜVENLİ KILAN KISIT (T-109g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DENETİM SONUCU: KARAR SAĞLAM, ÖNCÜLÜ KORUMASIZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tests/unit/services/tekrarlayan.test.ts` (Backend) tekrarlayan üretimi çok
 * iyi ölçüyor — çift basış sıfır kayıt, kısmi üretimde yalnızca eksikler,
 * `skipDuplicates` yarışta fırlatmıyor, yıl sınırı, beş basamaklı yıl,
 * catch-up üst sınırı, TRY dışı şablonun atlanıp RAPORLANMASI. Denetledim;
 * `nextRunAt` kararı da sağlam ve gerekçesi ölçülebilir:
 *
 *   Oluşumlar DAİMA `startDate` çapasından hesaplanıyor ve üretilmiş
 *   `periodKey`ler çıkarılıyor. Yani bayat bir `nextRunAt` üretimi
 *   GECİKTİREBİLİR ama çift kayıt, atlanmış dönem ya da yanlış tarih
 *   ÜRETEMEZ — kendi kendini onaran yazma (T-100'ün `baseAmount` soyu).
 *   "Üç ay basılmazsa ÜÇ kayıt" kararı bundan çıkıyor: atlamak defterden
 *   kayıt düşürmek olurdu.
 *
 * ⚠️ ÖLÇÜLMEYEN ŞEY, ve Backend'in KENDİ YORUMU teşhisi veriyor
 * (`tekrarlayan.test.ts:194`):
 *
 *   > "Çıkarma bir OPTİMİZASYON; gerçek güvence
 *   >  `@@unique([sourceRecurringId, periodKey])`"
 *
 * Yani elle tetiklemeyi güvenli kılan şey servis mantığı DEĞİL, veritabanı
 * kısıtı. Ve o kısıtı hiçbir iddia okumuyordu: Backend'in testleri TAKLİT
 * istemci kullanıyor, dolayısıyla kısıt şemadan silinse de hepsi yeşil kalır.
 * `skipDuplicates` da kısıt olmadan atlayacak bir şey bulamaz — sessizce çift
 * kayıt yazılır ve çift kayıt DEFTERDE ikiye katlanmış bir giderdir.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ŞEMA YETMEZ — GÖÇ DE ÖLÇÜLÜYOR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `schema.prisma` bir NİYET dosyası; veritabanının gerçeği göçlerde. Şemaya
 * `@@unique` yazıp göç üretmemek sessiz bir sapma sınıfı: dosya kısıtı iddia
 * eder, veritabanında kısıt YOKTUR. Bu yüzden ikisi ayrı ölçülüyor.
 *
 * Canlı veritabanı burada ölçülmüyor (birim testi DB'siz koşuyor — vitest
 * sözleşmesi). T-109g'de elle doğrulandı: `pg_indexes` çıktısında
 * `transaction_sourceRecurringId_periodKey_key` duruyor.
 */

const KOK = resolve(__dirname, '..', '..');

const SEMA = readFileSync(join(KOK, 'prisma/schema.prisma'), 'utf8');

/* ===========================================================================
 * SAF ÇEKİRDEK — mutasyon sentetik girdiyle sınanıyor (ADR-038)
 * ======================================================================== */

/** Model bloğunun gövdesi. */
export function modelGovdesi(sema: string, model: string): string {
  return new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(sema)?.[1] ?? '';
}

/** Gövdede `@@unique([a, b])` bildirimi var mı — boşluk toleranslı. */
export function bilesikTekillikVar(govde: string, alanlar: readonly string[]): boolean {
  const desen = new RegExp(
    `@@unique\\(\\s*\\[\\s*${alanlar.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*,\\s*')}\\s*\\]`,
  );
  return desen.test(govde);
}

/** Göç SQL'lerinde karşılık gelen TEKİL dizin oluşturuluyor mu. */
export function gocteTekilDizinVar(
  sqlMetinleri: readonly string[],
  alanlar: readonly string[],
): boolean {
  return sqlMetinleri.some((sql) =>
    sql
      .split('\n')
      .some(
        (satir) =>
          /CREATE\s+UNIQUE\s+INDEX/i.test(satir) && alanlar.every((alan) => satir.includes(alan)),
      ),
  );
}

function gocSqlleri(): string[] {
  const kok = join(KOK, 'prisma/migrations');
  return readdirSync(kok, { withFileTypes: true })
    .filter((girdi) => girdi.isDirectory())
    .map((girdi) => join(kok, girdi.name, 'migration.sql'))
    .map((yol) => {
      try {
        return readFileSync(yol, 'utf8');
      } catch {
        return '';
      }
    })
    .filter((metin) => metin.length > 0);
}

const ALANLAR = ['sourceRecurringId', 'periodKey'] as const;

describe('ADR-040 — tekrarlayan üretimin tekillik ÖNCÜLÜ', () => {
  const govde = modelGovdesi(SEMA, 'Transaction');
  const gocler = gocSqlleri();

  it('önkoşul — şema ve göçler okundu', () => {
    /*
     * Çapa. Model adı değişir ya da göç dizini taşınırsa aşağıdaki iddialar
     * "bulunamadı" diye kırılır; bu iddia hangi sebeple kırıldığını ayırıyor.
     */
    expect(govde.length, '`Transaction` modeli şemada bulunamadı').toBeGreaterThan(200);
    expect(govde, 'model gövdesi yanlış okundu').toContain('sourceRecurringId');
    expect(gocler.length, 'göç dosyası bulunamadı').toBeGreaterThan(0);
  });

  it('⚠️ ŞEMA `@@unique([sourceRecurringId, periodKey])` bildiriyor', () => {
    expect(
      bilesikTekillikVar(govde, ALANLAR),
      'Bileşik tekillik şemadan KALKMIŞ. Elle tetiklemeyi güvenli kılan şey bu ' +
        'kısıt — servisin "üretilmiş dönemleri çıkarma" mantığı bir OPTİMİZASYON ' +
        '(Backend`in kendi yorumu böyle diyor). Kısıt yoksa `skipDuplicates` ' +
        'atlayacak bir şey bulamaz ve iki kez tetiklemek DEFTERE çift gider yazar.',
    ).toBe(true);
  });

  it('⚠️ GÖÇ de tekil dizini oluşturuyor — şema niyet, göç gerçek', () => {
    /*
     * Şemaya `@@unique` yazıp göç üretmemek sessiz bir sapma: dosya kısıtı
     * iddia eder, veritabanında kısıt yoktur ve bütün testler yeşil kalır.
     */
    expect(
      gocteTekilDizinVar(gocler, ALANLAR),
      'Hiçbir göç `(sourceRecurringId, periodKey)` için TEKİL dizin oluşturmuyor. ' +
        'Şema dosyası kısıtı iddia ediyor olabilir ama veritabanında KISIT YOK — ' +
        'şema bir niyet dosyası, veritabanının gerçeği göçlerde.',
    ).toBe(true);
  });

  it('yıl sınırı sabiti ADR-040 gerekçesini TAŞIYOR', () => {
    /*
     * Sınırın DEĞERİ değil, gerekçesinin yazılı olması ölçülüyor:
     * `buildPeriodKey` dört basamaklı yıl varsayıyor ve yıl 10000'in yıllık
     * anahtarı meşru yıl 1000 ile ÇAKIŞIYOR (T-108g ölçümü). Gerekçe
     * kaybolursa sınır bir gün "keyfî" diye gevşetilir.
     */
    const servis = readFileSync(join(KOK, 'src/server/services/recurring-transaction.ts'), 'utf8');

    expect(servis, 'yıl sınırı sabiti yok').toMatch(/MAX_PERIOD_YEAR\s*=\s*9999/);
    expect(
      servis,
      'sınırın gerekçesi (`buildPeriodKey` dört basamak varsayıyor) yazılı değil',
    ).toMatch(/dört basamaklı yıl/i);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038)
 * ======================================================================== */

describe('MUTASYON · çekirdek gerçekten ısırıyor', () => {
  const ORNEK_SEMA = [
    'model Ornek {',
    '  id String @id',
    '  sourceRecurringId String?',
    '  periodKey String?',
    '',
    '  @@unique([sourceRecurringId, periodKey])',
    '  @@index([periodKey])',
    '}',
  ].join('\n');

  it('bileşik tekillik bulunuyor — boşluk toleranslı', () => {
    const govde = modelGovdesi(ORNEK_SEMA, 'Ornek');
    expect(bilesikTekillikVar(govde, ['sourceRecurringId', 'periodKey'])).toBe(true);
    expect(
      bilesikTekillikVar('  @@unique([ sourceRecurringId , periodKey ])', [
        'sourceRecurringId',
        'periodKey',
      ]),
    ).toBe(true);
  });

  it('⚠️ kısıt KALDIRILIRSA yakalanıyor', () => {
    const bozuk = ORNEK_SEMA.replace('  @@unique([sourceRecurringId, periodKey])\n', '');
    expect(bilesikTekillikVar(modelGovdesi(bozuk, 'Ornek'), ALANLAR)).toBe(false);
  });

  it('⚠️ TEK ALANLI tekillik bileşik SAYILMIYOR', () => {
    // İnce gerileme: `@@unique([periodKey])` bileşik kısıtın yerini tutmaz —
    // aynı dönem anahtarı FARKLI şablonlar için meşrudur.
    const tekAlan = ORNEK_SEMA.replace(
      '@@unique([sourceRecurringId, periodKey])',
      '@@unique([periodKey])',
    );
    expect(bilesikTekillikVar(modelGovdesi(tekAlan, 'Ornek'), ALANLAR)).toBe(false);
  });

  it('`@@index` tekillik SAYILMIYOR', () => {
    // `@@index([sourceRecurringId, periodKey])` performans içindir, kısıt değil.
    const yalnizIndex = ORNEK_SEMA.replace(
      '@@unique([sourceRecurringId, periodKey])',
      '@@index([sourceRecurringId, periodKey])',
    );
    expect(bilesikTekillikVar(modelGovdesi(yalnizIndex, 'Ornek'), ALANLAR)).toBe(false);
  });

  it('göç taraması TEKİL dizini arıyor, sıradan dizini DEĞİL', () => {
    const tekil = ['CREATE UNIQUE INDEX "x" ON "transaction"("sourceRecurringId", "periodKey");'];
    const sirali = ['CREATE INDEX "x" ON "transaction"("sourceRecurringId", "periodKey");'];

    expect(gocteTekilDizinVar(tekil, ALANLAR)).toBe(true);
    expect(gocteTekilDizinVar(sirali, ALANLAR)).toBe(false);
    // İki alan AYNI satırda olmalı — ayrı dizinler bileşik kısıt değildir.
    expect(
      gocteTekilDizinVar(
        [
          'CREATE UNIQUE INDEX "a" ON "transaction"("sourceRecurringId");',
          'CREATE UNIQUE INDEX "b" ON "transaction"("periodKey");',
        ],
        ALANLAR,
      ),
    ).toBe(false);
  });
});
