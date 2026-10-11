import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * §9/5 — "Gelir kaydı girilir → dashboard toplamına yansır" (T-107a).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA BİR SENARYO DEĞİL, BİR AÇIK BEKLEMEDİR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * §9'un son açık maddesi bu ve bugün uçtan uca YAZILAMAZ. Kart iki şeyi açıkça
 * yasakladı: yarısını yazıp diğer yarısını TODO bırakmak, ve `test.skip` /
 * `test.fixme` kullanmak (T-005b'nin "atlanan test yok" nöbeti).
 *
 * Üçüncü bir yol var ve bu dosya o: **beklemenin kendisini ölçmek.** Zincirin
 * dört halkası tek tek yoklanıyor ve BUGÜNKÜ durumları iddia ediliyor. Son
 * halka geldiği gün bu kapı KIRMIZIYA döner ve mesajı "artık §9/5'i yaz" der.
 *
 * Yani bekleme bir yorum satırı değil, bir kapı. Sessizce unutulamaz.
 * §8.13'te CSP için kurulan kalıbın aynısı: *"CSP'nin YOKLUĞU E2E ile
 * doğrulanıyor; T-060 o beklentiyi tersine çevirecek."*
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ZİNCİR VE ÖLÇÜLEN DURUM (2026-10-11)
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   1. İşlem kaydı EKRANI         → ✗ yok   (`/panel/muhasebe` yazılmadı)
 *   2. Yazma yolu (Server Action) → ✓ VAR   (`createTransactionAction`, T-101)
 *   3. Aylık toplam servisi       → ✗ yok   (`appMonthRange`in hiç çağıranı yok)
 *   4. Dashboard kartı            → ✗ yok   (T-054f bilerek yazmadı)
 *
 * Dördüncüsü bir eksik değil, bir KARAR: *"uydurma bir sayı göstermemeyi
 * tercih ediyoruz."* Yer tutucu dört kart ("Bu ay gelir 48.250,00") silindi
 * çünkü doğrulanamayan bir sayı, panelde verilmiş yanlış bir sözdür — ADR-035
 * metin kararının (T-055g) aynı ailesi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ YOKLAMA MEKANİZMASI KENDİ KENDİNİ DOĞRULUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * "Dosya yok" diyen bir yoklama, yolu yanlış yazılmışsa da "yok" der — ve
 * bütün bu dosya sahte yeşile düşer. Burada o tuzak yapısal olarak kapalı:
 * dört halkadan BİRİ (2) bugün VAR ve onun `true` çıkması iddia ediliyor.
 * Yoklama bozulursa 2. halka da `false` okunur ve kapı derhal kırılır.
 *
 * Yani çapa dışarıdan eklenmiş bir kontrol değil, zincirin kendi içinde.
 */

const KOK = resolve(__dirname, '..', '..');

const oku = (yol: string): string => {
  const tam = join(KOK, yol);
  return existsSync(tam) ? readFileSync(tam, 'utf8') : '';
};

/** Yorumlar ayıklanmış kod — niyet metinleri yoklamayı yanıltmasın (T-040). */
const kod = (yol: string): string =>
  oku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

/* ===========================================================================
 * HALKALAR
 * ======================================================================== */

/** 1 — Kullanıcının gelir kaydını GİRDİĞİ ekran. */
function islemEkraniVar(): boolean {
  return ['src/app/(panel)/panel/muhasebe/page.tsx', 'src/app/(panel)/panel/muhasebe/page.ts'].some(
    (yol) => existsSync(join(KOK, yol)),
  );
}

/** 2 — Kaydın yazıldığı Server Action. */
function yazmaYoluVar(): boolean {
  return /export\s+async\s+function\s+createTransactionAction/.test(
    kod('src/server/actions/transaction.ts'),
  );
}

/**
 * 3 — Aylık toplamı ÜRETEN bir servis.
 *
 * Ölçüt `appMonthRange`in bir ÇAĞIRANI olması: ay aralığı yardımcısı
 * `_shared/app-date.ts`te duruyor ama bugün hiçbir servis onu kullanmıyor,
 * yani "bu ayın toplamı" diye bir şey henüz üretilmiyor.
 */
export const aylikToplamDeseni = (kaynak: string): boolean => /\bappMonthRange\s*\(/.test(kaynak);

function aylikToplamVar(): boolean {
  const servisler = ['transaction.ts', 'job.ts', 'stats.ts', 'index.ts'];
  return servisler.some((ad) => aylikToplamDeseni(kod(`src/server/services/${ad}`)));
}

/**
 * 4 — Dashboard'ın GERÇEK bir gelir/gider sayısı basması.
 *
 * Ölçüt: sayfanın finans servislerinden birini İÇE AKTARMASI. Metinde
 * "gelir/gider" geçmesi yetmez — bugün tam olarak o var ve bir BEKLEME
 * notu, bir kart değil. Veri bağlantısı yoksa kart yok.
 */
export const dashboardKartDeseni = (kaynak: string): boolean =>
  /from\s+'@\/server\/services\/(transaction|job)'/.test(kaynak);

function dashboardKartiVar(): boolean {
  return dashboardKartDeseni(kod('src/app/(panel)/panel/page.tsx'));
}

describe('§9/5 — açık bekleme (son halka T-104/T-105)', () => {
  it('ÇAPA — yoklama mekanizması çalışıyor: yazma yolu VAR', () => {
    /*
     * Zincirin içindeki çapa. Bu iddia kırılırsa aşağıdaki "yok" iddialarının
     * hiçbirine güvenilemez: yolların yanlış yazıldığı ya da dosya düzeninin
     * değiştiği anlamına gelir, "yok" cevapları da o yüzden gelmiş olur.
     */
    expect(
      yazmaYoluVar(),
      '`createTransactionAction` bulunamadı — yoklama yolları bozuk olabilir, ' +
        'bu dosyadaki bütün "yok" iddiaları güvenilmez.',
    ).toBe(true);
  });

  it('ÇAPA — ay aralığı yardımcısı GERÇEKTEN var (çağıranı yok, kendisi var)', () => {
    // 3. halkanın yoklaması "çağıran var mı" diye soruyor. Yardımcının
    // kendisi de yoksa soru anlamsızdır ve `false` yanlış sebeple gelir.
    expect(
      /export function appMonthRange/.test(kod('src/server/services/_shared/app-date.ts')),
    ).toBe(true);
  });

  it('1/4 — işlem kaydı EKRANI henüz yok (T-104 bekliyor)', () => {
    expect(
      islemEkraniVar(),
      '`/panel/muhasebe` ARTIK VAR. §9/5 zincirinin ilk halkası geldi: kullanıcı ' +
        'gelir kaydını artık arayüzden girebiliyor. Senaryonun bu adımı yazılabilir — ' +
        'ama akışın NEREDEN başladığı senaryonun parçasıdır (T-039), yani adım ' +
        "ekrandan başlamalı, Server Action'a elle POST atmaktan değil.",
    ).toBe(false);
  });

  it('3/4 — aylık toplam SERVİSİ henüz yok (T-105 bekliyor)', () => {
    expect(
      aylikToplamVar(),
      'Aylık toplam üreten bir servis ARTIK VAR (`appMonthRange` çağrılıyor). ' +
        '§9/5 ölçülebilir hâle geldi: "kayıt → aylık toplam" halkası artık ' +
        'birim testiyle de, dashboard bağlandığında E2E ile de ölçülebilir.',
    ).toBe(false);
  });

  it('4/4 — dashboard gelir/gider KARTI henüz yok (T-054f BİLEREK yazmadı)', () => {
    expect(
      dashboardKartiVar(),
      'Dashboard artık bir finans servisini içe aktarıyor — yani gerçek bir ' +
        'gelir/gider sayısı basıyor. §9/5 ARTIK UÇTAN UCA YAZILABİLİR ve ' +
        'yazılmalı: `tests/e2e/` altında "gelir kaydı girilir → dashboard ' +
        'toplamına yansır". Bu kapı o gün silinir.',
    ).toBe(false);
  });

  it('§9/5 BUGÜN uçtan uca yazılamaz — ve sebebi tek bir halka değil', () => {
    /*
     * Bu iddia sayıyı kilitliyor: dört halkadan kaçı hazır. Birden fazla halka
     * eksikken "neredeyse tamam" demek, T-039'da kaçınılan hatanın aynısı.
     * Hazır halka sayısı DEĞİŞTİĞİNDE burası kırılır ve bekleme yeniden
     * değerlendirilir — tek bir halka gelince de, hepsi gelince de.
     */
    const hazir = [islemEkraniVar(), yazmaYoluVar(), aylikToplamVar(), dashboardKartiVar()].filter(
      Boolean,
    ).length;

    expect(
      hazir,
      `§9/5 zincirinde hazır halka sayısı DEĞİŞTİ (${hazir}/4). Beklemeyi yeniden ` +
        'değerlendir: hangi adım artık ölçülebilir, senaryo yazılabilir mi?',
    ).toBe(1);
  });
});

/* ===========================================================================
 * MUTASYON — halkalar GELDİĞİNDE yoklamanın gördüğünün kanıtı
 * ======================================================================== */

describe('MUTASYON · yoklama halka geldiğinde GÖRÜYOR', () => {
  /*
   * Bu blok olmadan "yok" iddiaları tek yönlü kalırdı: hiçbir şeyi
   * yakalamayan bir desenle de yeşil olurlardı. Halkaların gelişi gerçek
   * ağaçta taklit edilemez (başka ajanların dizinleri), bu yüzden desenler
   * saf işlevlere çıkarıldı ve sentetik kaynakla iki yönde sınanıyor.
   */

  it('3. halka · `appMonthRange` çağrısı yakalanıyor, TANIMI yakalanmıyor', () => {
    expect(aylikToplamDeseni('const [bas, son] = appMonthRange(gun);')).toBe(true);
    expect(aylikToplamDeseni('  const aralik = appMonthRange( bugun );')).toBe(true);

    // Yalnızca içe aktarma ya da adın geçmesi "aylık toplam üretiliyor" demek değil.
    expect(aylikToplamDeseni("import { appMonthRange } from '@/x';")).toBe(false);
    expect(aylikToplamDeseni('// appMonthRange ileride kullanılacak')).toBe(false);
  });

  it('4. halka · dashboard finans servisini İÇE AKTARINCA yakalanıyor', () => {
    expect(
      dashboardKartDeseni("import { fetchMonthly } from '@/server/services/transaction';"),
    ).toBe(true);
    expect(dashboardKartDeseni("import { fetchJobBoard } from '@/server/services/job';")).toBe(
      true,
    );

    // Bugünkü hâl: metinde "gelir/gider" geçiyor ama veri bağlantısı YOK.
    expect(dashboardKartDeseni('<span>Aylık gelir/gider</span> — finans modülü bekliyor')).toBe(
      false,
    );
    expect(dashboardKartDeseni("import { fetchSiteStats } from '@/server/services/stats';")).toBe(
      false,
    );
  });

  it('1. halka · dosya yoklaması çalışıyor — VAR OLAN bir sayfa bulunuyor', () => {
    /*
     * `existsSync` tabanlı yoklamanın çapası: var olan bir yolu bulduğu
     * gösterilmezse, "muhasebe yok" cevabı yolun yanlış yazılmasından da
     * gelebilirdi.
     */
    expect(existsSync(join(KOK, 'src/app/(panel)/panel/page.tsx'))).toBe(true);
    expect(existsSync(join(KOK, 'src/app/(panel)/panel/muhasebe/page.tsx'))).toBe(false);
  });
});
