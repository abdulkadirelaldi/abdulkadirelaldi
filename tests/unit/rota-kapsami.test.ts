import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { TWO_FACTOR_SETUP_PATH } from '@/lib/security/two-factor';

/**
 * ROTA ENVANTERİ × KAPI KAPSAMI — T-016b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BİR TEST, NEDEN BİR KEZLİK RAPOR DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-029d'nin kapanış sorusu şuydu: "ölçülmeyen başka yüzey var mı?" O soruyu
 * bir kez cevaplayıp rapora yazmak, cevabın YAZILDIĞI GÜN doğru olması demekti.
 * F3 panel rotalarını çoğaltacak; her yeni rota, kimsenin fark etmediği yeni
 * bir kör nokta açar. Bu, deponun defalarca gördüğü kalıbın ta kendisi:
 *
 *   - `NavItem.hazir` (T-018) — elle tutulan liste, unutulan yeni rota
 *   - BULGU-015 — `/og`, `robots.txt`, `rss.xml` hiçbir kapının uğramadığı
 *     yüzeydeydi; `/og` çalışma zamanında ÇÖKÜYORDU ve bütün kapılar yeşildi
 *   - BULGU-016 — sitemap var olmayan üç adresi bildiriyordu
 *
 * Bu yüzden kapsam kararı KODA bağlanıyor: envanter dosya sisteminden
 * TÜRETİLİYOR (elle liste yok), her rota için bir kapsam beyanı ARANIYOR ve
 * beyanların KANITI doğrulanıyor. Yeni bir rota eklendiğinde bu test kırmızı
 * olur ve ekleyen kişiden tek bir şey ister: "bu rotaya hangi kapı dokunuyor?"
 * Cevap "hiçbiri" olabilir — ama YAZILI ve GEREKÇELİ olmak zorunda.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE ÖLÇMÜYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu kapı, kapsamın YETERLİ olduğunu söylemez; kapsamın BEYAN EDİLDİĞİNİ ve
 * beyanın kanıtının hâlâ durduğunu söyler. "200 dönüyor mu" ile "doğru içeriği
 * veriyor mu" farkını her satırın `not` alanı açıkça yazar — çünkü asıl tehlike
 * kapsamsız rota değil, KAPSANDIĞI SANILAN rotadır.
 */

// ---------------------------------------------------------------------------
// 1. Envanter — dosya sisteminden türetilir
// ---------------------------------------------------------------------------

const PROJE_KOKU = path.resolve(__dirname, '../..');
const APP_KOKU = path.join(PROJE_KOKU, 'src/app');

/**
 * Rota üreten dosya adları.
 *
 * `layout`, `error`, `loading`, `not-found`, `template` BİLEREK DIŞARIDA:
 * bunlar rota değil, rotanın içinde çalışan bileşenler — kendi adresleri yok.
 * `icon.svg` / `opengraph-image.*` gibi STATİK metadata dosyaları da dışarıda:
 * onlar kod değil, derlemenin kopyaladığı varlıklar; kapı sorusu ("bu adres
 * doğru davranıyor mu") onlarda "dosya var mı"ya iner ve derleme adımı bunu
 * zaten söyler. `robots.ts` ve `sitemap.ts` ise KOD üretir, o yüzden içeride.
 */
const KOK_METADATA: Record<string, string> = {
  'robots.ts': '/robots.txt',
  'sitemap.ts': '/sitemap.xml',
};

export interface TuretilmisRota {
  readonly yol: string;
  readonly tip: 'page' | 'route' | 'metadata';
  readonly dosya: string;
}

/**
 * `src/app` ağacını gezip rota adreslerini üretir.
 *
 * Next kuralları: `(grup)` dizinleri adrese GİRMEZ, `[slug]` / `[...hepsi]` /
 * `[[...istege-bagli]]` desen olarak KORUNUR (her slug'ı ayrı rota saymak
 * anlamsız olurdu — temsilci yeterli, bkz. KAPSAM notları).
 */
export function rotalariTuret(kok: string): TuretilmisRota[] {
  const gez = (dizin: string, parcalar: string[], derinlik: number): TuretilmisRota[] => {
    const bulunan: TuretilmisRota[] = [];

    for (const ad of readdirSync(dizin).sort()) {
      const tam = path.join(dizin, ad);

      if (statSync(tam).isDirectory()) {
        const grup = ad.startsWith('(') && ad.endsWith(')');
        bulunan.push(...gez(tam, grup ? parcalar : [...parcalar, ad], derinlik + 1));
        continue;
      }

      const uzanti = path.extname(ad);
      const taban = path.basename(ad, uzanti);

      if ((taban === 'page' || taban === 'route') && (uzanti === '.ts' || uzanti === '.tsx')) {
        const yol = `/${parcalar.join('/')}`.replace(/\/+$/, '');
        bulunan.push({
          yol: yol === '' ? '/' : yol,
          tip: taban,
          dosya: path.relative(PROJE_KOKU, tam),
        });
      } else if (parcalar.length === 0 && KOK_METADATA[ad] !== undefined) {
        bulunan.push({
          yol: KOK_METADATA[ad],
          tip: 'metadata',
          dosya: path.relative(PROJE_KOKU, tam),
        });
      }
    }

    return bulunan;
  };

  return gez(kok, [], 0);
}

// ---------------------------------------------------------------------------
// 2. Kapsam beyanı — her rota için bir satır
// ---------------------------------------------------------------------------

type KapiTuru = 'e2e' | 'sitemap-taramasi' | 'lighthouse' | 'kapsanmiyor';

interface KapsamBeyani {
  /** Bu rotaya dokunan kapılar. `kapsanmiyor` tek başına kullanılır. */
  readonly kapilar: readonly KapiTuru[];
  /**
   * Beyanın KANITI — kaynak dosyalarda birebir aranacak dizeler.
   * `e2e` için `tests/e2e/**` içinde, `sitemap-taramasi` için `sitemap.ts`
   * içinde geçmeli. Kanıt olmadan beyan, iyi niyetli bir yorumdan ibarettir.
   */
  readonly kanit: readonly string[];
  /** NE ölçülüyor, ne ölçülmüyor. Kapsanmayan rotalarda gerekçe zorunlu. */
  readonly not: string;
}

const KAPSAM: Record<string, KapsamBeyani> = {
  '/': {
    kapilar: ['e2e', 'lighthouse', 'sitemap-taramasi'],
    kanit: ["page.goto('/')", "absoluteUrl('/')"],
    not: 'En yoğun ölçülen yüzey: duman testi (tek h1, klavye odağı), güvenlik başlıkları, üç Lighthouse profili ve WebGL doğrulaması.',
  },
  '/giris': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/giris')"],
    not: 'Auth paketinin tamamı buradan geçiyor: kilitleme, TOTP, kurtarma kodu, yönlendirme (§8.1–8.4).',
  },
  '/panel': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel')"],
    not: 'Oturumsuz erişim → /giris (§9 senaryo 4); oturumlu erişim auth paketinde. İÇERİK doğrulanmıyor — F3 panel görevlerinin işi.',
  },
  '/panel/ayarlar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/ayarlar')"],
    not: '§8.1 kapısı: 2FA kurulmamış oturum buraya giremiyor, güvenlik sayfasına yönleniyor.',
  },
  '/panel/ayarlar/guvenlik': {
    kapilar: ['e2e'],
    kanit: ['TWO_FACTOR_SETUP_PATH'],
    not: 'Adres e2e içinde düz metin değil, `src/lib/security/two-factor` sabitinden geliyor; sabitin bu rotaya çözüldüğü aşağıda ayrıca doğrulanıyor.',
  },
  '/panel/desenler': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-031/T-032 ile PARALEL eklendi; kapsamı o görevlerin kararı. Bu satır bilerek "kapsanmıyor" diyor — F3 panel rotaları için ilk örnek: rota var, kapı yok, ve bu artık GÖRÜNÜR. NOT: rota o görevlerle birlikte gelmezse bu satır "ölü beyan" dalını kırmızıya çevirir; doğru tepki satırı SİLMEKTİR.',
  },
  '/panel/icerik/projeler': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/icerik/projeler')", 'selectOption({ label: alanlar.durum })'],
    not: "§9/6: panelden proje yayınlanıyor ve public tarafta göründüğü doğrulanıyor; T-044g'de liste artık TÜM DURUMLARI okuduğu için (ENGEL-1 kapandı) taslak satırı da bu listede görülüyor. ÖLÇÜLMEYEN: sayfa boyutu SABİT 25, adresten verilemiyor — kaynak tüketimi denenmedi; arşivleme düğmesi, tablo sıralaması ve `?durum=` sekmelerinin süzme doğruluğu (birim testlerinde).",
  },
  '/panel/icerik/deneyim': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-034 ile eklendi. Deneyim kaydının public karşılığı bir SAYFA değil, `/hakkimda` ve `/cv` içindeki bölümler; §9'un yedi senaryosundan hiçbiri bu akışı istemiyor. Proje ekranının §9/6 kapsamı aynı `panel-form` + action + ADR-029 zincirini zaten ölçüyor — ikinci bir kopyası, aynı mekanizmayı iki yerde bakım gerektirirdi. Deneyim için ayrı bir senaryo açılırsa (F4) burası e2e'ye çevrilir.",
  },
  '/panel/mesajlar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/mesajlar?gorunum=hepsi')", '[data-mesaj-satir]'],
    not: "§9/2'nin DÖRDÜNCÜ HALKASI (T-043g): ziyaretçinin gönderdiği mesaj bu listede satır olarak görünüyor, satır `preview` taşıyor ve tam gövdeyi TAŞIMIYOR, okunmamış rozeti sayıyor. Ayrıca §8.20/ADR-020 sınırı: liste yükünde `ip`/`userAgent` YOK — bağımsız olarak ölçüldü (`panel-mesaj-kvkk.spec.ts`). Adres `?gorunum=hepsi` seçildi: süzmeyen görünüm, iddiayı spam puanına bağlamaktan kurtarıyor. ÖLÇÜLMEYEN: `perPage` adresten verilemiyor (sabit 25), sayfa boyutu üzerinden kaynak tüketimi denenmedi; altı görünümün (`gelen`/`okunmamis`/`spam`/`supheli`/`arsiv`/`hepsi`) süzme doğruluğu birim testlerinde, burada değil; sıralama ve sayfalama ölçülmüyor.",
  },
  '/panel/mesajlar/[id]': {
    kapilar: ['e2e'],
    kanit: ['/panel/mesajlar/${mesajId}', 'E2E-KVKK-SONDA-UA-4B71'],
    not: "Tam gövde burada görünüyor (listede yalnızca 160 karakterlik `preview`) ve §8.20/ADR-020 sınırının ÖLÇÜLEN hâli kayıtlı: `ip`/`userAgent` bu rotanın RSC yükünde 'Göster/Gizle' düğmesi KAPALIYKEN de var — düğme bir yetki sınırı değil, perde. ÖLÇÜLMEYEN: var olmayan kimlikle 404 dışındaki davranış; kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI, sınanmadı); yazma eylemleri (`markRead`/`markSpam`/`archive`/`unarchive`/`convertMessageToJob`) — yetki ve denetim kaydı Backend'in birim testlerinde, E2E'de tetiklenmiyor.",
  },
  '/panel/icerik/projeler/yeni': {
    kapilar: ['e2e'],
    kanit: [
      "getByRole('link', { name: 'Yeni proje' })",
      // Regex kaçışlı hâliyle aranıyor: kanıt, kaynakta GERÇEKTEN geçen dize
      // olmak zorunda — "olması gereken" hâli değil.
      String.raw`projeler\/yeni$`,
    ],
    not: "T-043f'te ekleme LİSTE İÇİ FORM olmaktan çıkıp bu rotaya taşındı; §9/6 paketi artık buradan geçiyor (liste → 'Yeni proje' bağlantısı → form → `createProjectAction` → listeye dönüş). Kimlik zinciri: `(panel)` düzeni + ara katman, çerezsiz istek 307 → /giris. ÖLÇÜLMEYEN: slug çakışmasının BU ROTADAKİ hâli (T-034'te liste içi formda ölçülmüştü, taşınmadan sonra tekrarlanmadı); kapak eki (`coverAttachmentId`) seçimi; MDX içeriğinin render doğruluğu.",
  },
  '/panel/icerik/projeler/[id]': {
    kapilar: ['e2e'],
    kanit: [
      "selectOption({ label: 'Yayında' })",
      "getByRole('button', { name: 'Kaydet', exact: true })",
    ],
    not: "§9/6'NIN LİTERAL HÂLİ burada ölçülüyor (T-044g): taslak panelden açılıp yayına alınıyor ve public taraf ANINDA görüyor — `updateProjectAction` yolunun ADR-029 etiket hesabı, ekleme yolundan AYRI olarak mutasyonla sınandı. Okuma `fetchProjectForPanel` (önbeleksiz, tüm durumlar). ÖLÇÜLMEYEN: var olmayan kimlikte 404 dışındaki davranış; kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI, sınanmadı — F6/T-062'ye not); arşivlenmiş kaydın 410 yerine DÜZENLENEBİLİR olması bilinçli (T-040, panelde `ContentLookup` zarfı yok) ve bu davranışın kendisi ölçülmüyor.",
  },
  '/panel/icerik/deneyim/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-043f ile eklendi. Aynı `panel-form` + Server Action + ADR-029 zinciri `projeler/yeni` tarafında ölçülüyor; ikinci bir kopya aynı mekanizmayı iki yerde bakım gerektirirdi. Deneyim kaydının public karşılığı bir SAYFA değil (`/hakkimda` ve `/cv` içindeki bölümler) ve §9'un yedi senaryosundan hiçbiri bu akışı istemiyor. Deneyim için ayrı bir senaryo açılırsa (F4) burası e2e'ye çevrilir.",
  },
  '/panel/icerik/deneyim/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-043f ile eklendi; gerekçe `deneyim/yeni` satırıyla aynı. Bu modelde `status` YOK — yani `projeler/[id]`de ölçülen taslak→yayın geçişinin karşılığı burada bulunmuyor, kopyalanacak senaryo da yok. Silme (`deleteExperienceAction`) liste rotasından tetikleniyor ve denetim kaydı SİLİNEN SATIRIN TAMAMINI taşıyor — bkz. BULGU-019.',
  },
  '/blog': {
    kapilar: ['sitemap-taramasi'],
    kanit: ["absoluteUrl('/blog')"],
    not: 'YALNIZCA "yaşıyor mu" (200). Liste içeriği, sıralama ve sayfalama ölçülmüyor.',
  },
  '/blog/[slug]': {
    kapilar: ['sitemap-taramasi'],
    kanit: ['`/blog/${entry.slug}`'],
    not: "Yayınlanmış her yazı sitemap üzerinden çekiliyor; taslak/zamanlanmış yazılar sitemap'te olmadığı için kapsam dışı (ADR-019 gereği öyle olmalı).",
  },
  '/cv': {
    kapilar: ['sitemap-taramasi'],
    kanit: ["absoluteUrl('/cv')"],
    not: 'YALNIZCA 200. PDF/yazdırma davranışı ölçülmüyor.',
  },
  '/hakkimda': {
    kapilar: ['sitemap-taramasi'],
    kanit: ["absoluteUrl('/hakkimda')"],
    not: 'YALNIZCA 200.',
  },
  '/hizmetler': {
    kapilar: ['sitemap-taramasi'],
    kanit: ["absoluteUrl('/hizmetler')"],
    not: 'YALNIZCA 200.',
  },
  '/iletisim': {
    kapilar: ['sitemap-taramasi', 'e2e'],
    kanit: ["absoluteUrl('/iletisim')", "page.goto('/iletisim')"],
    not: "§9/2 (T-039): gerçek tarayıcıdan form dolduruluyor, kayıt DB'de ve panelin okuma yolunda doğrulanıyor. Panel mesaj kutusu EKRANI henüz yok — zincirin son halkası açık bekleme (bkz. `iletisim-akisi.spec.ts` başlığı).",
  },
  '/projeler': {
    kapilar: ['sitemap-taramasi', 'e2e'],
    kanit: ["absoluteUrl('/projeler')", "request.get('/projeler')"],
    not: '§9/6 (T-039): yayınlanan projenin listede ANINDA göründüğü, taslağın ise sızmadığı ölçülüyor. Kartların düzeni ve süzgeçler ölçülmüyor.',
  },
  '/projeler/[slug]': {
    kapilar: ['sitemap-taramasi', 'e2e'],
    kanit: [
      '`/projeler/${entry.slug}`',
      "yol.startsWith('/projeler/')",
      'request.get(`/projeler/${SLUG}`)',
    ],
    not: "§9/6 (T-039): yeni yayınlanan kaydın detayı 200 dönüyor ve başlığı gövdede; taslağın detayı 404. Ayrıca sitemap taraması yayındaki her slug'ı çekiyor ve bir temsilci slug OG görselinde kullanılıyor. Sayfa düzeni ölçülmüyor.",
  },
  '/api/auth/[...nextauth]': {
    kapilar: ['e2e'],
    kanit: ["'/api/auth/csrf'"],
    not: 'Uç doğrudan bir kez (csrf) çağrılıyor; asıl kapsam dolaylı — bütün giriş/çıkış akışı bu işleyiciden geçiyor.',
  },
  '/api/v1/health': {
    kapilar: ['e2e'],
    kanit: ["request.get('/api/v1/health')", "expect(govde.data.db).toBe('up')"],
    not: "§13.6 sözleşmesi (200 + zarf + dört alan) ve §8.20 sızıntı kontrolü T-016b'de eklendi; başlık/matcher sınırı zaten security-headers.spec.ts'te.",
  },
  '/api/v1/iletisim': {
    kapilar: ['e2e'],
    kanit: ["request.post('/api/v1/iletisim'", "request.get('/api/v1/iletisim')"],
    not: 'Ucun SUNULDUĞU, jeton verdiği ve geçersiz gövdeyi §7.2 zarfıyla reddettiği ölçülüyor. Başarılı gönderim bilerek E2E dışında: kayıt yazar ve bildirim tetikler; kuralları birim testlerinde.',
  },
  '/og/[[...parts]]': {
    kapilar: ['e2e'],
    kanit: ["request.get('/og')", "'/og/proje/boyle-bir-proje-yok-12345'"],
    not: 'PNG imzası + IHDR boyutu doğrulanıyor; bilinmeyen slug bayt bayt varsayılanla karşılaştırılıyor (BULGU-015).',
  },
  '/robots.txt': {
    kapilar: ['e2e'],
    kanit: ["request.get('/robots.txt')"],
    not: 'İçerik doğrulanıyor: `Disallow: /panel` (§8.7) ve text/plain.',
  },
  '/rss.xml': {
    kapilar: ['e2e'],
    kanit: ["request.get('/rss.xml')"],
    not: 'Gerçek XML ayrıştırıcısıyla doğrulanıyor.',
  },
  '/sitemap.xml': {
    kapilar: ['e2e'],
    kanit: ["request.get('/sitemap.xml')"],
    not: 'Hem kendisi (geçerli XML) hem bildirdiği HER adres (200) doğrulanıyor — sitemap bu kapının hem konusu hem aracı.',
  },
};

/**
 * Kapıların bilerek çağırdığı, VAR OLMAYAN adresler.
 *
 * `/api/v1/panel/islem` hiç yazılmadı ve yazılmayacak: ara katman
 * `matcher`'ının `/api/v1/panel/*` kolunu sınamak için kullanılan bir sonda.
 * Rota olmadığı için envanterde çıkmaz; burada beyan edilmezse bir gün biri
 * "bu uç nerede?" diye arar ve bulamaz. BULGU-016'nın aynadaki görüntüsü:
 * orada sitemap var olmayan adresi BİLDİRİYORDU, burada kapı var olmayan
 * adrese İSTEK ATIYOR — ikisi de bilinçli olduğu sürece sorun değil, yazılı
 * olmadığı sürece tuzak.
 */
const SANAL_ROTALAR: Record<string, string> = {
  '/api/v1/panel/islem': 'Ara katman matcher sınırı sondası — böyle bir rota YOK, olmamalı.',
};

// ---------------------------------------------------------------------------
// 3. Kanıt kaynakları
// ---------------------------------------------------------------------------

function dosyalariTopla(kok: string, uzanti: string): string[] {
  const bulunan: string[] = [];
  const gez = (d: string): void => {
    for (const ad of readdirSync(d)) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (tam.endsWith(uzanti)) bulunan.push(tam);
    }
  };
  gez(kok);
  return bulunan;
}

const E2E_KAYNAK = dosyalariTopla(path.join(PROJE_KOKU, 'tests/e2e'), '.ts')
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const SITEMAP_KAYNAK = readFileSync(path.join(PROJE_KOKU, 'src/app/sitemap.ts'), 'utf8');

/** `lighthouserc.json` → ölçülen adreslerin yol kısmı. */
const LIGHTHOUSE_YOLLARI = (
  JSON.parse(readFileSync(path.join(PROJE_KOKU, 'lighthouserc.json'), 'utf8')) as {
    ci: { collect: { url: string[] } };
  }
).ci.collect.url.map((u) => new URL(u).pathname);

// ---------------------------------------------------------------------------
// 4. Kapı
// ---------------------------------------------------------------------------

describe('rota envanteri × kapı kapsamı', () => {
  const envanter = rotalariTuret(APP_KOKU);
  const envanterYollari = envanter.map((r) => r.yol).sort();
  const beyanYollari = Object.keys(KAPSAM).sort();

  it('envanter dosya sisteminden türetiliyor ve boş değil', () => {
    expect(envanter.length).toBeGreaterThan(10);
    // Elle liste tutulsaydı bu satır anlamsız olurdu; türetildiği için
    // envanterin kendisi de bir ölçüm.
    expect(envanterYollari).toContain('/');
    expect(envanterYollari).toContain('/sitemap.xml');
  });

  /**
   * ASIL KAPI. Yeni bir rota eklendiğinde (F3 panel rotaları) burası kırmızı
   * olur ve tek bir şey ister: kapsam beyanı. "Kapsanmıyor" da geçerli bir
   * cevaptır — gerekçesi yazıldığı sürece.
   */
  it('her rota bir kapsam beyanı taşıyor', () => {
    const beyansiz = envanterYollari.filter((yol) => KAPSAM[yol] === undefined);

    expect(
      beyansiz,
      `KAPSAM beyanı olmayan rota(lar):\n${beyansiz
        .map((y) => `  ${y}  →  ${envanter.find((r) => r.yol === y)?.dosya ?? ''}`)
        .join(
          '\n',
        )}\n\ntests/unit/rota-kapsami.test.ts → KAPSAM'a satır ekleyin: hangi kapı dokunuyor, kanıtı ne, ne ÖLÇÜLMÜYOR.`,
    ).toEqual([]);
  });

  /**
   * Ters yön: silinen rotanın beyanı da silinmeli. Ölü satır bırakmak,
   * `pnpm.overrides`'ta ölü override bırakmakla aynı sınıf hata (ADVISORY-001
   * dersi): bir gün "bu kapsanıyor" diye okunur.
   */
  it('artık var olmayan rota için beyan kalmamış', () => {
    const olu = beyanYollari.filter((yol) => !envanterYollari.includes(yol));

    expect(olu, `Rotası silinmiş KAPSAM satırı: ${olu.join(', ')}`).toEqual([]);
  });

  it('kapsanmayan rotalar GEREKÇELİ', () => {
    const gerekcesiz = Object.entries(KAPSAM)
      .filter(([, b]) => b.kapilar.includes('kapsanmiyor') && b.not.trim().length < 20)
      .map(([yol]) => yol);

    expect(gerekcesiz, `Gerekçesiz "kapsanmiyor": ${gerekcesiz.join(', ')}`).toEqual([]);
  });

  it('her beyan en az bir kapı ve (kapsanıyorsa) kanıt bildiriyor', () => {
    const bozuk = Object.entries(KAPSAM)
      .filter(
        ([, b]) =>
          b.kapilar.length === 0 || (!b.kapilar.includes('kapsanmiyor') && b.kanit.length === 0),
      )
      .map(([yol]) => yol);

    expect(bozuk, `Kapısız ya da kanıtsız beyan: ${bozuk.join(', ')}`).toEqual([]);
  });
});

/**
 * BEYAN ÇÜRÜYEBİLİR — kanıt dizeleri kaynakta gerçekten duruyor mu?
 *
 * Bu blok olmasaydı kapsam haritası bir NİYET BEYANI olurdu: testi silen kişi
 * haritayı güncellemez, harita "kapsanıyor" demeye devam eder ve kapı sessizce
 * yalan söyler. T-019b/K3'teki "vakum hâlinde yeşil" tuzağının kapsam
 * haritasındaki karşılığı.
 */
describe('kapsam beyanlarının kanıtı hâlâ duruyor', () => {
  for (const [yol, beyan] of Object.entries(KAPSAM)) {
    if (beyan.kapilar.includes('kapsanmiyor')) continue;

    it(`${yol} — kanıt kaynakta bulunuyor`, () => {
      const eksik: string[] = [];

      for (const kanit of beyan.kanit) {
        const e2eVar = E2E_KAYNAK.includes(kanit);
        const sitemapVar = SITEMAP_KAYNAK.includes(kanit);

        if (!e2eVar && !sitemapVar) eksik.push(kanit);
      }

      expect(
        eksik,
        `${yol} için beyan edilen kanıt kaynaklarda YOK: ${eksik.join(' | ')}\n` +
          'Test silindiyse/yeniden yazıldıysa KAPSAM satırı da güncellenmeli.',
      ).toEqual([]);
    });
  }

  it('lighthouse beyanı `lighthouserc.json` ile uyuşuyor', () => {
    const beyanEdilen = Object.entries(KAPSAM)
      .filter(([, b]) => b.kapilar.includes('lighthouse'))
      .map(([yol]) => yol)
      .sort();

    expect(beyanEdilen).toEqual([...LIGHTHOUSE_YOLLARI].sort());
  });

  it('/panel/ayarlar/guvenlik sabiti hâlâ o rotaya çözülüyor', () => {
    // Kanıt dizesi bir SABİT ADI olduğu için, sabitin değeri kaymışsa kanıt
    // "duruyor" görünür ama yanlış rotayı gösterir. Bu satır o boşluğu kapatır.
    expect(TWO_FACTOR_SETUP_PATH).toBe('/panel/ayarlar/guvenlik');
  });

  it('sanal rotalar hâlâ kapılarda kullanılıyor', () => {
    const kayip = Object.keys(SANAL_ROTALAR).filter((yol) => !E2E_KAYNAK.includes(yol));

    expect(kayip, `Sanal rota beyanı var ama kapıda kullanılmıyor: ${kayip.join(', ')}`).toEqual(
      [],
    );
  });

  it('sanal rotaların gerçekten karşılığı YOK', () => {
    const envanterYollari = rotalariTuret(APP_KOKU).map((r) => r.yol);
    const gerceklesen = Object.keys(SANAL_ROTALAR).filter((yol) => envanterYollari.includes(yol));

    expect(
      gerceklesen,
      `Sanal sayılan rota artık GERÇEK: ${gerceklesen.join(', ')} — beyan KAPSAM'a taşınmalı.`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Türeticinin kendini kanıtlaması
// ---------------------------------------------------------------------------

/**
 * "Hiçbir rota bulamadım" diyen bozuk bir türetici ile gerçekten temiz bir
 * envanter, sonuçlarına bakarak ayırt edilemez (public-env.test.ts'teki aynı
 * gerekçe). Bu blok türeticiyi, kuralları bilerek zorlayan bir kurgu ağaca
 * karşı koşturur — `src/**` dosyalarına DOKUNMADAN.
 */
describe('türetici kendini kanıtlıyor', () => {
  it('Next kurallarını uyguluyor: grup, dinamik, yakalama-tümü, metadata, bileşen', () => {
    const kok = mkdtempSync(path.join(tmpdir(), 'rota-envanteri-'));

    const yaz = (goreli: string, icerik = 'export default null;\n'): void => {
      const tam = path.join(kok, goreli);
      mkdirSync(path.dirname(tam), { recursive: true });
      writeFileSync(tam, icerik);
    };

    yaz('(pazarlama)/page.tsx'); //                     → /            (grup adrese girmez)
    yaz('(pazarlama)/blog/[slug]/page.tsx'); //         → /blog/[slug] (desen korunur)
    yaz('(pazarlama)/layout.tsx'); //                   → rota DEĞİL
    yaz('(pazarlama)/error.tsx'); //                    → rota DEĞİL
    yaz('(pazarlama)/loading.tsx'); //                  → rota DEĞİL
    yaz('panel/ayarlar/page.tsx'); //                   → /panel/ayarlar
    yaz('api/v9/deneme/route.ts'); //                   → /api/v9/deneme
    yaz('og/[[...parts]]/route.tsx'); //                → /og/[[...parts]]
    yaz('robots.ts'); //                                → /robots.txt
    yaz('sitemap.ts'); //                               → /sitemap.xml
    yaz('icon.svg', '<svg/>'); //                       → rota DEĞİL (statik varlık)
    yaz('yardimci.ts'); //                              → rota DEĞİL
    yaz('panel/parcalar/tablo.tsx'); //                 → rota DEĞİL (page/route değil)

    const bulunan = rotalariTuret(kok)
      .map((r) => r.yol)
      .sort();

    expect(bulunan).toEqual(
      [
        '/',
        '/api/v9/deneme',
        '/blog/[slug]',
        '/og/[[...parts]]',
        '/panel/ayarlar',
        '/robots.txt',
        '/sitemap.xml',
      ].sort(),
    );
  });

  it('EKİLEN rotayı yakalar — kapı gerçekten kapanıyor', () => {
    /*
     * F3'ün senaryosu: biri `src/app/(panel)/panel/medya/page.tsx` ekliyor.
     * Türetici onu görmezse kapının tamamı boşa çalışır. Ekili rota kurgu
     * ağaçta üretiliyor; asıl `KAPSAM` karşılaştırması yukarıdaki blokta
     * gerçek envanterle koşuyor.
     */
    const kok = mkdtempSync(path.join(tmpdir(), 'rota-ekili-'));
    const yaz = (goreli: string): void => {
      const tam = path.join(kok, goreli);
      mkdirSync(path.dirname(tam), { recursive: true });
      writeFileSync(tam, 'export default null;\n');
    };

    yaz('(panel)/panel/page.tsx');
    const oncesi = rotalariTuret(kok).map((r) => r.yol);

    yaz('(panel)/panel/medya/page.tsx');
    const sonrasi = rotalariTuret(kok).map((r) => r.yol);

    expect(oncesi).not.toContain('/panel/medya');
    expect(sonrasi).toContain('/panel/medya');

    // Ve beyansız kalırdı — kapının kırmızı olma sebebi tam olarak bu.
    expect(KAPSAM['/panel/medya']).toBeUndefined();
  });
});
