import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ADR-039 — TÜR UYUŞMAZLIĞI GÖRÜNÜR KALIYOR (T-107c).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KARAR VE BAĞLAYICI OLAN KISMI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-039: kategori türü işlem türüyle eşleşmek zorunda DEĞİL. Gerekçe
 * ölçülmüş — kategori türü sonradan değiştirilebiliyor ve altındaki işlemler
 * kendi türünü koruyor; defterin gerçeği işlemin türü, kategori bir etiket.
 *
 * Ama kararın ikinci yarısı bağlayıcı: **uyuşmazlık GİZLENMİYOR.** Üç yerde
 * görünür olması gerekiyor ve bu dosya o görünürlüğü ölçüyor.
 *
 * ⚠️ NEDEN AYRI BİR KAPI: Backend `rapor.test.ts`te `typeMismatch`i çok iyi
 * ölçüyor — ama **servis DTO'su düzeyinde.** Alanın oradan ARAYÜZE kadar
 * gelmesi ölçülmüyordu, ve zincir üç halkalı:
 *
 *   `report.ts` (DTO) → `rapor-veri.ts` (eşleme) → `kategori-dagilimi.tsx` (rozet)
 *
 * Ortadaki eşleme sessizce kaldırılsa Backend'in bütün iddiaları yeşil kalır
 * ve kullanıcı uyuşmazlığı HİÇ GÖRMEZ. O da "sessizce yanlış kümeye yazmaya
 * geri dönmek" demek — ADR-039'un tam olarak engellediği şey.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SINIR, DÜRÜSTÇE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Bu bir KAYNAK taraması: üç halkanın VAR olduğunu kanıtlıyor, rozetin
 * gerçekten EKRANA ÇIZILDIĞINI kanıtlamıyor. Tarayıcı düzeyinde kanıt için
 * uyuşmazlık fikstürü olan bir E2E adımı gerekir; bugün yazılmadı ve sebebi
 * dürüstçe: rozet `cubuklar.some(...)` koşuluna bağlı ve koşulun kendisi
 * burada ölçülüyor, ama CSS ile gizlenmiş bir rozeti bu kapı görmez.
 *
 * ÜÇÜNCÜ GEREKSİNİM (oluşturma anında yumuşak uyarı) BUGÜN YOK ve ADR onu
 * zorunlu saymıyor. Yazıldığı gün kapısı şu olacak: uyarı GÖNDERİMİ
 * ENGELLEMİYOR — yani `disabled` ya da `preventDefault` ile bağlanmamış.
 * Bugün yazılmayan bir şey için kapı yazmıyorum (ölü kapı, ADVISORY-001'in
 * ölü override dersi).
 */

const KOK = resolve(__dirname, '..', '..');

const kod = (yol: string): string =>
  readFileSync(join(KOK, yol), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

const RAPOR_SERVIS = kod('src/server/services/report.ts');
const RAPOR_VERI = kod('src/components/panel/rapor-veri.ts');
const DAGILIM = kod('src/components/panel/kategori-dagilimi.tsx');
const ISLEM_FORMU = kod('src/components/panel/islem-formu.tsx');

describe('ADR-039 — uyuşmazlık zinciri: DTO → eşleme → rozet', () => {
  it('önkoşul — dört kaynak da okundu', () => {
    // Yol bozulursa negatif iddialar "desen yok" diye yanlış sebeple geçer.
    expect(RAPOR_SERVIS).toContain('fetchCategoryBreakdown');
    expect(RAPOR_VERI.length).toBeGreaterThan(200);
    expect(DAGILIM).toContain('KategoriDagilimi');
    expect(ISLEM_FORMU).toContain('categoryId');
  });

  it('1/3 · DTO `typeMismatch` alanını TAŞIYOR', () => {
    expect(
      RAPOR_SERVIS,
      '`typeMismatch` DTO`dan düşürülmüş — arayüz uyuşmazlığı artık bilemez ve ' +
        'sessizce yanlış kümeye yazmaya geri dönülür (ADR-039).',
    ).toMatch(/typeMismatch\s*:\s*boolean/);
  });

  it('2/3 · eşleme alanı arayüz modeline TAŞIYOR', () => {
    /*
     * Zincirin en kırılgan halkası: burası sessizce kaldırılsa Backend`in
     * bütün `typeMismatch` iddiaları yeşil kalır ve rozet hiç çizilmez.
     */
    expect(RAPOR_VERI, '`typeMismatch` arayüz modeline eşlenmiyor — rozet verisiz kalır.').toMatch(
      /uyusmazlik\s*:\s*\w*\.?typeMismatch/,
    );
  });

  it('3/3 · rozet uyuşmazlığa BAĞLI çiziliyor', () => {
    expect(DAGILIM, 'uyuşmazlık rozeti koşula bağlı değil').toMatch(/uyusmazlik\s*&&/);
    expect(DAGILIM, 'rozet bileşeni kullanılmıyor').toContain('Badge');
  });

  it('⚠️ uyuşmazlık KOŞULSUZ gizlenmemiş — `false` sabiti ile kapatılmamış', () => {
    /*
     * Negatif iddia tek başına yetmezdi (§8.18 dersi), bu yüzden yukarıdaki
     * üç pozitif iddiayla birlikte çalışıyor. Buradaki iş, zinciri teknik
     * olarak bozmadan SUSTURAN biçimleri yakalamak.
     */
    expect(DAGILIM).not.toMatch(/uyusmazlik\s*&&\s*false/);
    expect(RAPOR_VERI).not.toMatch(/uyusmazlik\s*:\s*false\b/);
  });

  it('seçicide KATEGORİNİN TÜRÜ yazılı — kullanıcı seçerken görüyor', () => {
    /*
     * ADR-039'un ikinci görünürlük yeri. Etiket `Ad — Tür` biçiminde ve
     * arşivli olan ayrıca işaretli (T-104). Tür etiketi düşerse kullanıcı
     * gider kategorisine gelir yazdığını SEÇİM ANINDA göremez.
     */
    expect(
      ISLEM_FORMU,
      'kategori seçeneği türü yazmıyor — uyuşmazlık seçim anında görünmez',
    ).toMatch(/ISLEM_TURU_ETIKET\[\s*\w+\.type\s*\]/);
  });
});

/* ===========================================================================
 * MUTASYON — sentetik girdi (ADR-038: kimsenin dosyasına dokunulmuyor)
 * ======================================================================== */

describe('MUTASYON · zincir desenleri gerçekten ısırıyor', () => {
  const dtoVar = (k: string): boolean => /typeMismatch\s*:\s*boolean/.test(k);
  const eslemeVar = (k: string): boolean => /uyusmazlik\s*:\s*\w*\.?typeMismatch/.test(k);
  const rozetVar = (k: string): boolean => /uyusmazlik\s*&&/.test(k);

  it('DTO alanı silinirse yakalanıyor', () => {
    expect(dtoVar('  typeMismatch: boolean;')).toBe(true);
    expect(dtoVar('  categoryType: TransactionType;')).toBe(false);
    // Yalnızca yorumda geçmesi taşımak değildir.
    expect(dtoVar('  // typeMismatch ileride eklenecek')).toBe(false);
  });

  it('eşleme silinirse yakalanıyor', () => {
    expect(eslemeVar('    uyusmazlik: s.typeMismatch,')).toBe(true);
    expect(eslemeVar('    uyusmazlik: typeMismatch,')).toBe(true);
    // Sabitle kapatma: desen eşleşmiyor, yani kapı kırmızıya döner.
    expect(eslemeVar('    uyusmazlik: false,')).toBe(false);
  });

  it('rozet koşulu kaldırılırsa yakalanıyor', () => {
    expect(rozetVar('{c.uyusmazlik && (<Badge variant="warning">…</Badge>)}')).toBe(true);
    expect(rozetVar('<Badge variant="warning">…</Badge>')).toBe(false);
  });
});
