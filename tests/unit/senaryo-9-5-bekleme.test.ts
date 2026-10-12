import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

/**
 * ⚠️ YOKLAMA T-102'DE GENİŞLETİLDİ — KÖR NOKTASI ÖLÇÜLEREK BULUNDU.
 *
 * Önceki hâli DÖRT DOSYA ADI sayıyordu:
 * `['transaction.ts', 'job.ts', 'stats.ts', 'index.ts']`.
 *
 * T-102 aylık toplam servisini yazdı ve doğru mimari yere koydu:
 * `services/report.ts` (dönem bazlı toplamlar ne `Transaction`ın ne `Job`un bir
 * alanı; `stats.ts`in kendisi de ADR-027 türetilmiş SİTE istatistikleri için
 * ayrı bir modül — yani "türetilmiş okuma kendi modülünde" bu depoda zaten
 * kurulu kalıp). Dosya listesinde olmadığı için YOKLAMA GÖRMEDİ:
 *
 *   report.ts      → `appMonthRange(` × 2   ✅ halka GERÇEKTEN hazır
 *   transaction.ts → 0 · job.ts → 0 · stats.ts → 0 · index.ts → 0
 *
 * Yani kapı 3. halkayı "yok" okumaya devam ediyordu. ⚠️ ATEŞLENMEYEN BİR KAPI,
 * KIRMIZIYA DÖNEN BİR KAPIDAN DAHA KÖTÜ: bekleme sessizce bayatlar.
 *
 * Kök neden, bu deponun defalarca adını koyduğu sınıf: yoklama izlediği şeyi
 * ÖLÇMEK yerine NEREDE OLACAĞINI MODELLİYORDU (T-050'nin dersi). Yeni hâli
 * `src/server/services/**` altındaki TÜM `.ts` dosyalarını tarıyor — "aylık
 * toplam üreten bir servis var mı" sorusunun gerçek karşılığı. Yeni bir servis
 * dosyası eklendiğinde liste güncellemek de gerekmiyor.
 *
 * ⚠️ BEKLENEN SAYI T-107b'DE 1 → 3 YAPILDI (Güvenlik kararı). Ölçümü düzeltmek
 * Backend'in işiydi, beklemenin ne anlama geldiğine karar vermek Güvenlik'in:
 * üç halka hazır, eksik olan TEK ŞEY toplamın bir ekrana ulaşması.
 */
function servisDosyalari(): string[] {
  const dizin = join(KOK, 'src/server/services');
  const toplanan: string[] = [];

  const gez = (goreli: string): void => {
    for (const ad of readdirSync(join(dizin, goreli))) {
      const yol = goreli ? `${goreli}/${ad}` : ad;
      if (statSync(join(dizin, yol)).isDirectory()) gez(yol);
      else if (ad.endsWith('.ts')) toplanan.push(`src/server/services/${yol}`);
    }
  };
  gez('');

  return toplanan;
}

function aylikToplamVar(): boolean {
  return servisDosyalari().some((yol) => aylikToplamDeseni(kod(yol)));
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

describe("§9/5 — zincir gerileme kapısı (bekleme T-107c'de kapandı)", () => {
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

  it('1/4 — işlem kaydı EKRANI ✅ GELDİ (T-104)', () => {
    /*
     * T-107b'de kapı tasarımı gereği öttü. `/panel/muhasebe` yazıldı: kullanıcı
     * gelir kaydını artık ARAYÜZDEN girebiliyor, yani senaryonun ilk adımı
     * gerçek akıştan başlatılabilir — T-039'un kuralı (akışın nereden başladığı
     * senaryonun parçasıdır) artık karşılanabilir durumda.
     */
    expect(
      islemEkraniVar(),
      '`/panel/muhasebe` KAYBOLDU — halka geri gitti, bekleme yeniden değerlendirilmeli.',
    ).toBe(true);
  });

  it('3/4 — aylık toplam SERVİSİ ✅ GELDİ (T-102 · `report.ts`)', () => {
    /*
     * `services/report.ts` → `fetchMonthlyReport` / `fetchYearlyReport`.
     * Bu halkanın gelişi kapının YOKLAMASINDAKİ bir kör noktayı da açığa
     * çıkardı: dört servis dosyası adını ELLE yazmıştım ve `report.ts` listede
     * olmadığı için yoklama onu görmüyordu. Düzeltildi (artık `services/**`
     * taranıyor) ve ders kayda geçti — aynı turda "listeyi elle yazma,
     * kaynaktan türet" yazdığım hâlde bu dosyada dört ad sabitlemiştim.
     */
    expect(
      aylikToplamVar(),
      'Aylık toplam üreten servis KAYBOLDU — `appMonthRange` çağıranı yok.',
    ).toBe(true);
  });

  it('4/4 — toplam EKRANA ULAŞTI ✅ (T-105 · `/panel/muhasebe/raporlar`)', () => {
    /*
     * T-107c'de geldi ve BEKLEME BİTTİ. Eksik halkanın adı T-107b'de
     * düzeltilmişti: sorun "dashboard kartı yok" değildi — muhasebe
     * listesindeki `toplam` SATIR SAYISI'ydı. §9/5'in "toplam" dediği şey
     * artık rapor ekranında ve senaryo tek parça yazıldı.
     */
    expect(
      dashboardKartiVar(),
      'Toplamı basan ekran KAYBOLDU — §9/5 senaryosu artık ölçemez.',
    ).toBe(true);
  });

  it('⚠️ DÖRT HALKA DA HAZIR — ve senaryo YAZILDI', () => {
    /*
     * ═══════════════════════════════════════════════════════════════════
     * BU DOSYA ARTIK BİR BEKLEME DEĞİL, BİR GERİLEME KAPISI
     * ═══════════════════════════════════════════════════════════════════
     *
     * T-107a'da kurulduğunda iddia `toBe(1)` idi ve mesajı "beklemeyi yeniden
     * değerlendir" diyordu. Üç turda 1 → 3 → 4 oldu; her seferinde kapı
     * tasarımı gereği öttü ve beklemenin bayatlamasını engelledi.
     *
     * Bekleme bittiğine göre dosyanın işi değişti: artık ZİNCİRİN
     * ÇÖZÜLMEDİĞİNİ ölçüyor. Bir halka kaybolursa (ekran silinir, servis
     * yeniden adlandırılır) burası kırılır ve E2E paketinin neden ölçemez
     * hâle geldiğini TEK CÜMLEYLE söyler — Playwright hatasını okumaya
     * gerek kalmadan.
     *
     * Senaryo dosyasının varlığı da kilitli: silinmesi, dört turluk bir
     * beklemenin sessizce boşa gitmesi olurdu.
     */
    const hazir = [islemEkraniVar(), yazmaYoluVar(), aylikToplamVar(), dashboardKartiVar()].filter(
      Boolean,
    ).length;

    expect(hazir, '§9/5 zincirinde bir halka KAYBOLDU').toBe(4);

    const senaryo = join(KOK, 'tests/e2e/panel-gelir-rapor.spec.ts');
    expect(existsSync(senaryo), '§9/5 E2E paketi silinmiş — senaryo artık ölçülmüyor').toBe(true);

    const kaynak = readFileSync(senaryo, 'utf8');
    // Akışın EKRANDAN başladığı da kilitli (T-039): paket bir gün Server
    // Action'a doğrudan POST atmaya çevrilirse burası söyler.
    expect(kaynak, 'senaryo "Yeni işlem" bağlantısından başlamıyor').toContain(
      "name: 'Yeni işlem'",
    );
    expect(kaynak, 'senaryo rapor ekranını okumuyor').toContain('Tahsil edilen');
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
    /*
     * ⚠️ NEGATİF ÖRNEK T-107b'DE DEĞİŞTİ. Eskiden `muhasebe/page.tsx` idi ve
     * halka geldiğinde bu mutasyon testi kırıldı — yani negatif örneğini
     * BEKLENEN BİR DEĞİŞİKLİĞE bağlamak, mekanizma kanıtını o değişiklikte
     * çöpe atıyor. Artık asla var olmayacak sentetik bir yol kullanılıyor;
     * mekanizma kanıtı halkaların gelişinden BAĞIMSIZ.
     */
    expect(existsSync(join(KOK, 'src/app/(panel)/panel/__olmayan-ekran__/page.tsx'))).toBe(false);
  });
});
