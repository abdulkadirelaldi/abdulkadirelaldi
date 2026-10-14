import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appMonthRange } from '@/server/services/_shared/app-date';
import { buildPeriodKey } from '@/server/services/_shared/period-key';

/**
 * YIL SINIRI KEYFÎ DEĞİL — ANAHTAR BİÇİMİNİ KORUYOR (T-108g).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇÜLDÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `monthlyReportSchema`/`yearlyReportSchema` yılı `1000–9999` ile sınırlıyor
 * (T-106, Backend). Bir
 * kapı "aralık doğru" diyebilirdi; o, sınırın DEĞERİNİ kopyalamak olurdu ve
 * sınır bir gün gevşetilirse kapı sessizce birlikte gevşerdi.
 *
 * Bu kapı sınırın SEBEBİNİ ölçüyor: `buildPeriodKey` dönem anahtarını DİZE
 * DİLİMLEMESİYLE kuruyor —
 *
 *     MONTHLY → `day.slice(0, 7)`   (`2026-05-01` → `2026-05`)
 *     YEARLY  → `day.slice(0, 4)`   (`2026-05-01` → `2026`)
 *
 * yani **dört basamaklı yıl VARSAYIYOR.** Varsayım bozulduğunda hata vermiyor,
 * sessizce bozuk anahtar üretiyor. Ölçüldü:
 *
 *   yıl 2026  → `2026-05` · `2026`     ✅
 *   yıl 1000  → `1000-05` · `1000`     ✅ (alt sınır)
 *   yıl 99    → `99-05-0` · `99-0`     ❌ bozuk
 *   yıl 10000 → `10000-0` · **`1000`** ⚠️ BOZUK VE ÇAKIŞIYOR
 *
 * ⚠️ SON SATIR EN TEHLİKELİSİ: yıl 10000'in yıllık anahtarı `1000` oluyor —
 * **meşru yıl 1000'in anahtarıyla aynı.** ADR-015 tekrarlayan işlem
 * idempotanslığını `(sourceRecurringId, periodKey)` BİLEŞİK ANAHTARI üzerinde
 * kuruyor; çakışan bir anahtar, bir dönemin kaydının BAŞKA bir dönemin
 * kaydının üzerine `upsert` edilmesi demek. Sessiz veri kaybı, ve defterde.
 *
 * Yani `1000–9999`, `slice()` tabanlı anahtar kurmanın doğru kaldığı TAM
 * aralık. Sınır bir gün gevşetilecekse önce `buildPeriodKey` dizeden değil
 * sayıdan anahtar kurmalı — bu kapı o sıralamayı zorunlu kılıyor.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BU KAPININ ÖLÇMEDİĞİ ŞEY — ve neden şimdi yazılmadı
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `?yil=99&ay=5` adresinin ne döndüğü BURADA ölçülmüyor: rapor sayfası
 * şemayı HENÜZ BAĞLAMADI (Frontend T-108f, paralel) ve kendi
 * ölçümü daha kötü bir şey söylüyor — adres 200 dönüyor ama **2026 verisi**
 * gösteriyor, yani adres ile içerik sessizce ayrışıyor.
 *
 * Bağlandığında kapı iki şey ekleyecek: geçersiz dönem 200 DÖNMÜYOR, ve
 * gösterilen dönem adresteki dönem. Bugün yazmak, var olmayan bir bağlantıyı
 * ölçmek olurdu (ölü kapı — ADVISORY-001'in dersi). ⏳ T-109.
 */

const KOK = resolve(__dirname, '..', '..');
const SEMA = readFileSync(join(KOK, 'src/lib/schemas/report.ts'), 'utf8');

/** Dönem anahtarının İYİ BİÇİMLİ olduğu tek tanım — `YYYY-MM` ve `YYYY`. */
const AYLIK_BICIM = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const YILLIK_BICIM = /^\d{4}$/;

/** Verilen yıl için ay ve yıl anahtarlarını üretir. */
function anahtarlar(yil: number, ay = 5): { aylik: string; yillik: string; gun: string } {
  const aralik = appMonthRange(yil, ay);
  return {
    gun: aralik.from,
    aylik: buildPeriodKey('MONTHLY', aralik.from),
    yillik: buildPeriodKey('YEARLY', aralik.from),
  };
}

describe('ADR-015 — yıl sınırı anahtar biçimini koruyor', () => {
  it('önkoşul — şema okundu ve sınır orada', () => {
    /*
     * Çapa: şema taşınır ya da sınır kaldırılırsa aşağıdaki iddialar neyi
     * koruduğunu kaybeder.
     *
     * ⚠️ AD NOTU: görev kartı şemayı `reportPeriodSchema` diye anıyor; gerçekte
     * İKİ şema var (`monthlyReportSchema`, `yearlyReportSchema`) ve Backend'in
     * gerekçesi yazılı — tek şemada opsiyonel bir `month`, "ay verilmezse
     * yıllık rapor" demek olurdu ve iki farklı raporu tek tipte karıştırırdı.
     * Kapı karttaki adı değil ÖLÇÜLEN adı kullanıyor.
     */
    expect(SEMA).toContain('monthlyReportSchema');
    expect(SEMA).toContain('yearlyReportSchema');
    expect(SEMA, 'yıl alt sınırı şemada yok').toMatch(/\.min\(\s*1000\b/);
    expect(SEMA, 'yıl üst sınırı şemada yok').toMatch(/\.max\(\s*9999\b/);
  });

  it('SINIR İÇİNDE anahtarlar iyi biçimli — iki uç dahil', () => {
    for (const yil of [1000, 2026, 9999]) {
      const { aylik, yillik } = anahtarlar(yil);
      expect(aylik, `yıl ${yil}: aylık anahtar bozuk (${aylik})`).toMatch(AYLIK_BICIM);
      expect(yillik, `yıl ${yil}: yıllık anahtar bozuk (${yillik})`).toMatch(YILLIK_BICIM);
    }
  });

  it('⚠️ ALT SINIRIN ALTINDA anahtar SESSİZCE bozuluyor', () => {
    /*
     * Hata fırlatılmıyor — bu yüzden sınır şemada olmak zorunda. `99`
     * `?yil=99` adresinden gelebilecek en sıradan değer.
     */
    const { gun, aylik, yillik } = anahtarlar(99);

    expect(gun, 'ölçümün önkoşulu: iki basamaklı yıl gün dizesine giriyor').toBe('99-05-01');
    expect(
      aylik,
      `yıl 99 aylık anahtarı bozuk DEĞİL (${aylik}) — sınırın sebebi kalkmış olabilir`,
    ).not.toMatch(AYLIK_BICIM);
    expect(yillik).not.toMatch(YILLIK_BICIM);
  });

  it('⚠️⚠️ ÜST SINIRIN ÜSTÜNDE yıllık anahtar ÇAKIŞIYOR — veri kaybı sınıfı', () => {
    /*
     * Sınırın en güçlü gerekçesi. `slice(0, 4)` yıl 10000'den `1000` üretiyor:
     * MEŞRU bir yılın anahtarıyla aynı. ADR-015 idempotanslığı bu anahtara
     * dayandığı için, biri diğerinin üzerine yazar.
     */
    const asiri = anahtarlar(10000);
    const mesru = anahtarlar(1000);

    expect(asiri.aylik).not.toMatch(AYLIK_BICIM);
    expect(
      asiri.yillik,
      'yıl 10000 artık yıl 1000 ile ÇAKIŞMIYOR — `buildPeriodKey` dizeden ' +
        'anahtar kurmayı bırakmış olabilir; öyleyse sınır gevşetilebilir ve ' +
        'bu kapı güncellenmeli.',
    ).toBe(mesru.yillik);
    // Çakışma iddiasının vakum olmadığının kanıtı: meşru anahtar İYİ biçimli.
    expect(mesru.yillik).toMatch(YILLIK_BICIM);
  });

  it('`buildPeriodKey` hâlâ DİZE DİLİMLEMESİYLE kuruyor — varsayımın kaynağı', () => {
    /*
     * Kapının önermesi burada. Uygulama bir gün sayıdan anahtar kurmaya
     * geçerse dört basamak varsayımı kalkar, yukarıdaki iki "bozuk" iddiası
     * kırılır ve mesajları sınırın gevşetilebileceğini söyler. Önermeyi
     * ölçmeden bırakmak, kapıyı bayat bir gerekçenin üzerinde bırakırdı
     * (ADR-037).
     */
    const kaynak = readFileSync(
      join(KOK, 'src/server/services/_shared/period-key.ts'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, ' ');

    expect(kaynak, 'aylık anahtar artık dilimlemeyle kurulmuyor').toMatch(/slice\(0,\s*7\)/);
    expect(kaynak, 'yıllık anahtar artık dilimlemeyle kurulmuyor').toMatch(/slice\(0,\s*4\)/);
  });
});
