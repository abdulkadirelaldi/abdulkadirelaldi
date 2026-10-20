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
  '/panel/ayarlar/sifre': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-054f ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `getTotpStatus()` (2FA açık mı — doğrulama kodu alanı buna göre çiziliyor), yazma TEK Server Action `changePasswordAction`. E2E'ye alınmadı çünkü ölçülecek yeni mekanizma arayüzde DEĞİL: şifre değiştirmenin tamamı — yanlış mevcut şifre, TOTP gerekliliği, hız sınırı, ADR-035 oturum geçersizleştirme ve denetim kaydının şifre TAŞIMAMASI — `tests/unit/actions/sifre-degistirme.test.ts` ve `tests/unit/auth/change-password.test.ts` tarafından ölçülüyor; arayüz yalnızca `fields` anahtarlarını alanların altına basıyor ve o eşleme `panel-form` kabuğunda tek yerde. ÖLÇÜLMEYEN: (1) ADR-035'in BAĞLAYICI METNİ ekranda birebir duruyor mu — metin `sifre-formu.tsx`te `ADR_035_MESAJ` sabitinde ve hiçbir kapı onu dizeyle karşılaştırmıyor; 'Tüm cihazlardan çıkış yapıldı' gibi yasak bir cümleye kayması testle yakalanmaz. (2) `RATE_LIMITED` yanıtının `fields`i YOK, yani mesaj GENEL uyarı olarak çıkıyor; bu dalın ekranda gerçekten alan altına DÜŞMEDİĞİ denenmedi. (3) 2FA KAPALI hesapta `totpCode` alanı hiç çizilmiyor ve `gorunmezAlanlar` ile form düzeyine yükseltiliyor — sunucunun o alana hata basıp basmadığı (teorik olarak basamaz) ölçülmedi. (4) Başarıdan sonra formun temizlendiği (`temizle: true`, şifre alanları ekranda kalmasın) doğrulanmadı.",
  },
  '/panel/ayarlar/denetim': {
    /*
     * ⚠️ KAPI ALANLARI T-054g'DE GÜVENLİK TARAFINDAN GÜNCELLENDİ.
     *
     * ADR-036 beyanın `not` metnini rotayı ekleyene bırakıyor ve o metne
     * DOKUNULMADI. `kapilar`/`kanit` ise beyanın kapı tarafı: T-054g'de bu
     * rotaya bir E2E paketi yazıldı (`panel-denetim-diff.spec.ts`) ve satır
     * `kapsanmiyor` demeye devam ediyordu. Kendi yazdığım kapıyı bildirmemek,
     * haritayı kendi ölçtüğü şeye kör bırakmak olurdu.
     *
     * `not` içindeki "ÖLÇÜLMEYEN (1)" satırı artık GEÇERSİZ — iddia edilen
     * boşluk (ham `diff`in arayüzde/yanıt gövdesinde doğrulanmaması) ölçüldü
     * ve kapatıldı. Metnin güncellenmesi beyan sahibinin (Frontend);
     * gerekçesi docs/security/README.md → "ADR-036 ikinci beyan denetimi".
     */
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/ayarlar/denetim')"],
    not: "T-054f ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `fetchAuditLog` SERVİSTEN doğrudan, Server Action'dan DEĞİL — yeniden ihraç edilmesi denetim kaydının tamamını kimlik doğrulamasız bir POST ucuna çevirirdi ve bu ayrı bir kapı tarafından kaynaktan taranıyor. Filtre `auditLogFilterSchema`'dan geçiyor (adres çubuğu kullanıcı girdisi, ADR-032); ters aralık reddedilince süzgeçsiz ilk sayfaya düşülüyor ve kullanıcıya SÖYLENİYOR. ⚠️ ADR-034 SINIRI ARAYÜZDE: ekran `diff.fields` (alan ADLARI) ve `diff.values` (yalnızca `SHOWN_DIFF_VALUE_KEYS`) basıyor; ham `diff` DTO'da hiç yok, yani 'arayüz süzsün' demek tipi değiştirmeyi gerektirir. `ip` listede (karşılaştırmalı değeri var), `userAgent` DTO'da HİÇ SEÇİLMİYOR — bu yüzden DETAY ROTASI YAZILMADI, çağıranı olmazdı. ÖLÇÜLÜYOR (T-054g, `panel-denetim-diff.spec.ts`): `diff` değerlerinin yanıt gövdesine girmediği ARTIK ARAYÜZDEN ölçülüyor — bu satır T-054f'te 'ölçülmeyen' diyordu ve T-055f'te düzeltildi. Paket bir sonda satırı yazıp hem belgeyi hem RSC uçuş yükünü tarıyor: ADR-034'ün iki sızıntı sınıfının (`yeniSifre` adlı alan, masum adın içindeki değer) DEĞERLERİ gövdede YOK, ALAN ADLARI ise VAR — yani bilgi kaybı olmadan değer sızıntısı kapalı. Üç çapası da var (sonda satırı yükte, kimliği yükte, beyaz listedeki değer yükte), yani negatif iddialar boşa koşamıyor. `fields`/`values` dışına çıkan bir düzenleme artık sessiz kalmaz. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 50, adresten verilemiyor — kaynak tüketimi denenmedi. (2) `entity`, `entityId`, `actorId` filtreleri sözleşmede VAR ama arayüzde YÜZEYLENMEDİ: tek kullanıcılı sistemde `actorId` ayırt etmiyor, diğer ikisi için kullanıcı akışı yok; yüzeylendiğinde burası güncellenmeli. (3) Tarih aralığının `to` DAHİL olduğu etiketle söyleniyor ama sınır davranışı (o günün son anı) arayüzden ölçülmedi — servis birim testlerinde.",
  },
  '/panel/musteriler': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-103 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `fetchClientsForPanel` (ham, önbeleksiz); yazma liste satırından `archiveClientAction` (iki yönlü: `isArchived` boole). Filtre `clientFilterSchema`'dan geçiyor (adres çubuğu kullanıcı girdisi, ADR-032). ⚠️ VARSAYILAN GÖRÜNÜM ARŞİVİ GİZLEMİYOR — `isArchived` alanı HİÇ verilmiyor, T-038'in kararı Backend T-100'de korundu ve arayüz bunu kullanıcıya da yazıyor. Bu, iş formundaki müşteri seçicisinin ihtiyacının TERSİ (`isler/yeni` ve `isler/[id]` satırlarına bakınız). E2E'ye alınmadı çünkü ölçülecek yeni mekanizma yok: `VeriTablosu` + görünüm sekmeleri + `Sayfalama` + `ArsivleDugmesi` kalıbı içerik ekranlarında ölçülüyor. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 25, adresten verilemiyor — kaynak tüketimi denenmedi. (2) `jobCount` sütunu 'bu kayıt neden silinemiyor' sorusunun cevabı; sayının DOĞRULUĞU (FK bağımlısıyla tutarlılığı) servis birim testlerinde, arayüzden ölçülmedi. (3) Arşivden geri alma satırdan yapılıyor ve onay İSTEMİYOR (arşivleme istiyor) — geri almanın yıkıcı olmaması gerekçesi ölçülmedi, karar olarak duruyor. (4) Dört görünümün (`hepsi`/`aktif`/`arsiv`/`kiyi-medya`) süzme doğruluğu birim testlerinde, burada değil.",
  },
  '/panel/musteriler/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-103 ile eklendi. Okuma yok; yazma `createClientAction`. Gerekçe `icerik/*/yeni` satırlarıyla aynı: aynı `panel-form` + Server Action zinciri `projeler/yeni` tarafında uçtan uca ölçülüyor. ÖLÇÜLMEYEN: (1) `email` BENZERSİZ (mesajdan otomatik müşteri açma bu alanla `upsert` ediyor) — çakışma hâlinde kullanıcıya ne göründüğü ölçülmedi; şema `fields.email` döndürürse alana basılır ama bu dal denenmedi. (2) Telefon biçim doğrulamasının arayüzdeki hâli ölçülmedi.',
  },
  '/panel/musteriler/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-103 ile eklendi. Okuma `fetchClientForPanel` TEK KAYIT — `notes` YALNIZCA burada geliyor, liste DTO'su taşımıyor; formu listeden beslemek kaydetmenin `notes`u silmesi olurdu (T-043f'te proje MDX'inde ölçülen kusurun aynı sınıfı). Yazma `updateClientAction`. `isArchived` BU FORMDA YOK ve olmamalı: arşivleme ayrı bir eylem ve `updateClientAction` o alanı hiç almıyor. ÖLÇÜLMEYEN: (1) Var olmayan kimlikte 404 dışı davranış. (2) Kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI). (3) `notes`un kaydedilip geri okunduğu uçtan uca denenmedi.",
  },
  '/api/v1/panel/eklenti': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-037f ile eklendi (ADR-044). Kimlik İKİ KATMAN: ara katman `/api/v1/panel/*`ı oturumsuz 401'e çeviriyor (§8.5) + uçta `currentActorId` (§8.6, ADR-035/B). Sıra: kimlik → boyut (`Content-Length`, gövde OKUNMADAN) → §8.16 hız → form şeması → hedef varlığı (ADR-018) → `storeAttachment`: baytlar YAZMADAN ÖNCE doğrulanıyor (boyut, sihirli bayt, ADR-043), anahtar sunucuda. DB düşerse nesne hemen siliniyor. Birim: `tests/unit/api/eklenti-yukleme.test.ts` (route'un kendisi, gerçek `FormData` ile). ÖLÇÜLDÜ YERELDE, CI'DA DEĞİL (2026-10-20, tek seferlik paket, gerçek bucket): kapak seçici ve galeriden yükleme, public proje sayfasında görselin gerçekten çizilmesi (`naturalWidth` 64), oturumsuz 200, CSP ihlali 0, panelden silme; ayrıca ÖNBELLEK: önbellekli public sayfa ekleme sonrası 0→1, silme sonrası 1→0. CI'da R2 anahtarı yok ve 'atlanan test yok' nöbeti koşullu atlamayı kabul etmiyor. ÖLÇÜLMEYEN: (1) Yukarıdakinin CI'da tekrarı. (2) `Content-Length` yalan söyleyen 10 MB+ gövde `formData()` ile belleğe alınıyor; asıl sınır baytta — bellek tepe değeri ölçülmedi.",
  },
  '/api/v1/dosya/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-037f ile eklendi (ADR-044). Eklentiyi R2'den okuyup AYNI KÖKENDEN sunuyor — HTML'de imzalı adres yok, CSP `img-src 'self'` kalıyor, ADR-018'in önbellek çatışması doğmuyor. VARSAYILAN REDDET: yalnızca `PROJECT`/`POST`/`PROFILE` herkese açık (`public, immutable` — içerik değişmez); makbuz/iş/müşteri yalnızca oturumla (`private, no-store`, noindex) ve oturumsuz istek 404 alıyor (401 varlığı söylerdi). ETag = sağlama; eşleşirse 304 ve R2 okunmuyor. Kimlik dar karakter kümesinden geçmeyen istek veritabanına gitmiyor. Birim: `eklenti-yukleme.test.ts`. ÖLÇÜLMEYEN: (1) Taslak bir projenin kapağı kimliği bilen birine açık — kimlik tahmin edilemez (cuid) VARSAYILDI; yayın durumuna bağlamak ek sorgu ister. (2) Büyük dosyada bellek: nesne tamamen okunup veriliyor (akış değil); 10 MB üst sınırla kabul.",
  },
  '/panel/saglik': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/saglik'"],
    not: "ÖLÇÜLÜYOR (T-116, `panel-kisisel.spec.ts`): dört trend grafiğinin (Kilo/Uyku/Dinlenik nabız/Adım) çizildiği ve sayfanın 360 px'te yatay taşmadığı, iki projede. T-113 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. İKİ AYRI OKUMA: `fetchHealthTrend` (ARTAN, aralığın tamamı, `TREND_MAX_DAYS` tavanlı) grafikler için, `fetchHealthLogs` (en yeni önce, sayfalı 20) liste için — sayfalı listeden grafik çizmek yalnızca ilk sayfayı çizerdi. Üçüncü okuma `findHealthLogIdByDay(bugün)` üst çubuktaki 'Bugünü kaydet / düzenle' düğmesini seçiyor (günde tek kayıt). `?aralik=` KAPALI KÜME (30/90/365), tanınmayan değer 90'a düşüyor — `TREND_MAX_DAYS` adresten delinemez (ADR-032). Yazma liste satırından `deleteHealthLogAction`. Grafikler RECHARTS DEĞİL: bağımlılıksız SVG (`trend-grafigi.tsx`), çünkü `agir-yigin-tembel` kapısı Recharts'ı tek bileşene bağlıyor ve tek serili çizgi 109 kB'ı haklı çıkarmıyor. ÖLÇÜLMEYEN: (1) Grafik geometrisi (eksen adımları, boş ölçünün nokta ÜRETMEMESİ) birim testinde değil, yalnızca tarayıcıda gözle doğrulandı. (2) Sayfa boyutu SABİT 20. (3) 'Bugün' sunucuda `appToday()` ile İstanbul gününe göre — gece 00:00–03:00 sınırı arayüzden denenmedi, servis birim testlerinde.",
  },
  '/panel/saglik/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/saglik/yeni'"],
    not: "ÖLÇÜLÜYOR (T-116): virgüllü ölçü (`82,5`) NOKTALI kaydedilip düzenlemede `82,50` okunuyor; aynı güne ikinci kayıt CONFLICT'i 'O günün kaydını düzenle' bağlantısına dönüşüp mevcut kayda götürüyor. T-113 ile eklendi. Okuma yok; gün varsayılanı SUNUCUDA `appToday()` — istemcide `new Date()` gece yarısından sonra üç saat boyunca DÜNÜ önerirdi. Yazma `createHealthLogAction`. Aynı güne ikinci kayıt CONFLICT dönüyor ve `fields.existingId` formda 'O günün kaydını düzenle' bağlantısına çevriliyor (kimlik formun alanı değil, kabuk basmazdı). Ölçüler DİZE gidiyor; `ONDALIK_YA_DA_YOK` yalnızca virgülü noktaya çeviriyor. ÖLÇÜLMEYEN: (1) CONFLICT bağlantısının uçtan uca davranışı; eylem dalı birim testinde (`saglik-actions.test.ts`). (2) `ONDALIK_YA_DA_YOK`un birden fazla virgül içeren girdide davranışı — şema reddediyor, mesajın alan altına düştüğü denenmedi.",
  },
  '/panel/saglik/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-113 ile eklendi. Okuma `fetchHealthLogById` TEK KAYIT; yoksa 404. Yazma `updateHealthLogAction` + `deleteHealthLogAction`. Silme onayı değerlerin HİÇBİR YERDE kalmadığını söylüyor — T-110 kararı (denetim kaydına yalnızca gün yazılıyor); `deneyim`deki 'denetim kaydında görünmeye devam eder' metni burada yalan olurdu, bu yüzden onay metni çağırandan geliyor (`kalici-sil-dugmesi.tsx`). ÖLÇÜLMEYEN: (1) BOŞALTMAK SİLİYOR (önceden silmiyordu): temizlenebilir sütunlar güncellemede `null` kabul ediyor ve form dolu iken boşaltılan alanı `null`a çeviriyor (`bosaltilanlariNullYap`) — ÖLÇÜLÜYOR, `panel-kisisel.spec.ts`: kilo boşaltılıp kaydediliyor, yenilemeden sonra boş, uyku yerinde; mutasyonla eski kusur geri üretildi. (2) Tarihi başka bir kayda ait güne çekmek CONFLICT veriyor; mesajın alan altına düştüğü arayüzden denenmedi.",
  },
  '/panel/spor': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-114 ile eklendi. `(panel)` kimlik zinciri + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `fetchWorkouts` (ham, önbelleksiz; sıra gün AZALAN + `createdAt` AZALAN — `date` `@unique` değil). Yazma YOK — silme bilinçli olarak detayda (cascade + rekor hesabı satırdaki küçük bir düğmeye sığmıyor). Sayfa `workoutFilterSchema`'dan geçiyor (ADR-032). `SporSekmeleri` kütüphane ve rekorlara tek giriş noktası. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 20. (2) `setCount`un doğruluğu servis testlerinde, arayüzden ölçülmedi. (3) `type`/`from`/`to` süzgeçleri şemada var ama arayüzde yok.",
  },
  '/panel/spor/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/yeni'"],
    not: "ÖLÇÜLÜYOR (T-116): 'Antrenmanı aç' başarıda `/panel/spor/<id>` detayına düşüyor; detayda set eklemek rekor bildirimi üretiyor ve antrenmanı SİLMEK o rekoru rekor listesinden DÜŞÜRÜYOR (cascade + yeniden hesap, gerçek veritabanıyla). T-114 ile eklendi. Okuma yok; gün varsayılanı sunucuda `appToday()` (ADR-016). Yazma `createWorkoutAction`; başarıda `/panel/spor/<id>`e geçiyor (set girişi orada). ÖLÇÜLMEYEN: (1) Gece 00:00–03:00 gün önerisi ölçülmedi (`saglik/yeni` ile aynı mekanizma).",
  },
  '/panel/spor/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-114 ile eklendi. Okuma `fetchWorkoutById` (setleriyle) + `fetchExercises({isArchived:false, perPage:100})` (yeni set seçicisi) + setlerin işaret ettiği ama aktif listede olmayan her egzersiz için `fetchExerciseById` (arşivli harekete ait set düzenlenirken bağ kopmasın — `islem-formu.tsx` dersi). Yazma `updateWorkoutAction`, `deleteWorkoutAction` (onay setlerin silineceğini ve rekorların yeniden hesaplanacağını söylüyor), `createWorkoutSetAction`, `updateWorkoutSetAction`, `deleteWorkoutSetAction`; set eylemlerinin rekor sonucu `role="status"` ile gösteriliyor. CONFLICT (`setNo`) `fields.setNo` ile alana basılıyor; `workoutId` `gorunmezAlanlar`da. ÖLÇÜLMEYEN: (1) Rekor yeniden hesabının doğruluğu servis testlerinde, ekrandan ölçülmedi. (2) CONFLICT dalı arayüzde denenmedi. (3) Arşivli egzersizin \'(arşivli)\' seçenek olarak görünmesi denenmedi. (4) Ağırlık/RPE/süre/not boşaltmak artık SİLİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi, sağlık ekranında ölçülen aynı mekanizma. (metinde yazılı). (5) Seçici tavanı 100 egzersiz.',
  },
  '/panel/spor/egzersizler': {
    kapilar: ['e2e'],
    kanit: ['page.goto(`/panel/spor/egzersizler?'],
    not: "ÖLÇÜLÜYOR (T-116): `?q=` araması tek satıra daralıyor ve satırdan arşivleme onaylı çalışıyor. T-114 ile eklendi. Okuma `fetchExercises` (`exerciseFilterSchema`'dan geçiyor, ADR-032; `q` + `gorunum` + `sayfa`). ⚠️ VARSAYILAN GÖRÜNÜM ARŞİVİ GİZLEMİYOR (servisin `isArchived` varsayılanı yok, korundu). Yazma satırdan `archiveExerciseAction` (iki yönlü; arşivleme onaylı, geri alma onaysız — müşteriler kararı). SİLME YOK (Restrict FK; eylem yazılmadı). ÖLÇÜLMEYEN: (1) Üç görünümün süzme doğruluğu servis testlerinde. (2) `q` büyük/küçük harf duyarsızlığı Türkçe İ/ı için denenmedi. (3) Sayfa boyutu SABİT 25.",
  },
  '/panel/spor/egzersizler/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/egzersizler/yeni'"],
    not: 'ÖLÇÜLÜYOR (T-116): egzersiz ekleme kütüphaneye dönüyor ve hareket set seçicisinde görünüyor. T-114 ile eklendi. Okuma yok; yazma `createExerciseAction`, başarıda kütüphaneye dönüyor. `name @unique` CONFLICT`i `fields.name` ile alana basılıyor. ÖLÇÜLMEYEN: (1) CONFLICT dalı arayüzde denenmedi. (2) Adın büyük/küçük harf farkıyla ikinci kez eklenebilmesi — veritabanı kuralı, ölçülmedi.',
  },
  '/panel/spor/egzersizler/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-114 ile eklendi. Okuma `fetchExerciseById` + `fetchRecordsForExercise` (sayfasız, `reps` artan). Yazma `updateExerciseAction`; `isArchived` formda YOK (arşivleme ayrı eylem, listeden). ÖLÇÜLMEYEN: (1) Kas grubu değişikliğinin eski setleri yeniden gruplaması (yardım metninde yazılı) ölçülmedi. (2) Geçersiz kimlikte 404 dışı davranış.',
  },
  '/panel/spor/rekorlar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/spor/rekorlar'"],
    not: "ÖLÇÜLÜYOR (T-116): set sonrası rekor satırı `100,5` ile görünüyor; antrenman silinince satır KALKIYOR. T-114 ile eklendi. Okuma `fetchPersonalRecords` (sıra servisin: egzersiz, `reps` artan) + süzgeç seçicisi için `fetchExercises({perPage:100})` — ARŞİV DAHİL (geçmişi okuyor; set seçicisinin tersi). `?egzersiz=` `personalRecordFilterSchema.safeParse` ile doğrulanıyor (ADR-032); geçersiz değer süzgeçsiz listeye düşüyor ve ekran bunu söylüyor. SALT OKUNUR (PR türetilmiş, ADR-021). `workoutSetId === null` 'kaynaksız' rozetiyle görünür. ÖLÇÜLMEYEN: (1) Kaynak antrenmana bağlantı YOK (set→antrenman çözen servis okuması yok). (2) Süzgeç seçicisi tavanı 100.",
  },
  '/panel/hayat': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat'"],
    not: "ÖLÇÜLÜYOR (T-116): bugünün hücresi `aria-pressed` false→true, YENİLEMEDEN SONRA da true (kalıcı yazma, iyimser değil); ikinci tık false ve o da kalıcı; ızgara 360 px'te sayfayı taşırmıyor (T-116'da 252 px taşıyordu — kaydırma kabında `relative` eksikti). T-115 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. ÜÇ PARALEL OKUMA: `fetchHabitWeek(gün)` (pazartesi başlangıçlı 7 gün + bugünden geriye 400 günlük seri penceresi), `fetchGoals({status:'ACTIVE', perPage:5})`, `fetchJournalEntries({perPage:5})` — liste DTO'su, `content` TAŞIMIYOR. `?hafta=` `dayDateSchema.safeParse` ile doğrulanıyor; geçersiz ya da GELECEKTEKİ gün `appToday()`ye düşüyor (ADR-032). Yazma panodaki hücrelerden `toggleHabitDayAction` (aç/kapa ya da +1) ve `setHabitDayCountAction` (sayaçlı alışkanlıkta −1 düzeltme). Hücre İYİMSER güncelleniyor, sunucunun döndürdüğü `count` ile kesinleşiyor, hatada geri dönüyor + `FormAlert`; seri iyimser HESAPLANMIYOR, başarıdan sonra `router.refresh()`. Gelecek günler devre dışı. İstekteki hücre kilitli (aynı sekmede çift tık yarışı kapalı). ÖLÇÜLMEYEN: (1) İyimser güncellemenin GERİ ALMA dalı tarayıcıda denenmedi. (2) Başka sekmeden gelen eşzamanlı artırma yarışı (servis kabul etti) arayüzden denenmedi. (3) Ekran okuyucu duyurusu (`aria-pressed`) gerçek bir okuyucuyla denenmedi. (4) Gece 00:00–03:00 'bugün' sınırı arayüzden denenmedi.",
  },
  '/panel/hayat/aliskanliklar': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat/aliskanliklar'"],
    not: 'ÖLÇÜLÜYOR (T-116): listeden kayda geçiş ve kayıt ekranından arşivleme. T-115 ile eklendi. Okuma `fetchHabits` (ham, önbeleksiz, sayfa boyutu SABİT 25); filtre `habitFilterSchema`dan geçiyor. Görünüm KAPALI KÜME: hepsi (arşiv DAHİL — T-038/musteriler kararı) / panoda (`isActive && !isArchived`) / ara verildi (`!isActive && !isArchived`) / arşiv. Yazma satırdan `archiveHabitAction` iki yönlü — arşivle onaylı, arşivden çıkar onaysız. SİLME YOK (`HabitLog` CASCADE geçmişi götürürdü) ve ekran bunu yazıyor. ÖLÇÜLMEYEN: (1) Dört görünümün süzme doğruluğu yalnızca `buildHabitWhere` birim testlerinde. (2) Arşivden çıkarmanın onaysız olması karar, ölçülmedi.',
  },
  '/panel/hayat/aliskanliklar/yeni': {
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/hayat/aliskanliklar/yeni'"],
    not: 'ÖLÇÜLÜYOR (T-116): alışkanlık ekleme listeye dönüyor ve panoda görünüyor. T-115 ile eklendi. Okuma yok; yazma `createHabitAction`. `panel-form` + Server Action zinciri `projeler/yeni`de uçtan uca ölçülüyor. ÖLÇÜLMEYEN: (1) `color` #RRGGBB hatasının alan altına düştüğü arayüzden denenmedi. (2) `icon` serbest metin/emoji — 255 karakter üst sınırı dışında doğrulama yok.',
  },
  '/panel/hayat/aliskanliklar/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-115 ile eklendi. Okuma `fetchHabitById` TEK KAYIT; yoksa 404. Arşivlenmiş alışkanlık da açılıyor (arşivden çıkarmanın ikinci yolu). Yazma `updateHabitAction` + `archiveHabitAction`. ÖLÇÜLMEYEN: (1) `targetPerDay` ve `color` boşaltılınca artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi, sağlık ekranında ölçülen aynı mekanizma. (sayaçlı alışkanlık aç/kapa türüne dönemez); ekranda yazıyor. (2) `targetPerDay` değişince geçmişin yeniden yorumlanması (servis kararı) arayüzden denenmedi.',
  },
  '/panel/hayat/hedefler': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-115 ile eklendi. Okuma `fetchGoals` (sayfa boyutu SABİT 25); filtre `goalFilterSchema`dan geçiyor — durum sekmeleri KAPALI KÜME, `?q=` düz GET formu. Şema reddederse aramasız listeye düşülüyor ve ekranda SÖYLENİYOR. Kalan gün rozeti yalnızca ACTIVE/PAUSED hedefte (kapalı hedefte 'gecikti' yanlış alarm olurdu). Yazma satırdan `deleteGoalAction` (GERÇEK silme, FK yok). ÖLÇÜLMEYEN: (1) `kalanGunMetni` metin dönüşümü birim testinde değil. (2) Arama Türkçe İ/ı davranışı denenmedi.",
  },
  '/panel/hayat/hedefler/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-115 ile eklendi. Okuma yok; yazma `createGoalAction`. Durum 'Ulaşıldı'ya çekilince ilerleme istemcide 100'e getiriliyor (servisin (a) yorumu); şemanın çapraz kuralı istemcide `progress` alanına basıyor. ÖLÇÜLMEYEN: (1) `description` denetim kaydına değeriyle girmiyor (yalnızca `changed`) — eylem birim testinde, arayüzden değil.",
  },
  '/panel/hayat/hedefler/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-115 ile eklendi. Okuma `fetchGoalById` TEK KAYIT; yoksa 404. Yazma `updateGoalAction` + `deleteGoalAction` (onay 'Vazgeçildi' durumunu hatırlatıyor). Ulaşılmış hedefin ilerlemesini düşürmek önce istemci şemasında `progress` hatası; istemci atlatılırsa sunucunun VALIDATION_ERROR'u `fields.progress` ile AYNI alana düşüyor. ÖLÇÜLMEYEN: (1) Sunucu dalı (`GoalRuleError`) arayüzden hiç tetiklenmedi — istemci şeması önce yakalıyor; eylem birim testinde. (2) `targetDate` boşaltılınca artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi. (kısmi şema); ekranda yazıyor.",
  },
  '/panel/hayat/gunluk': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-115 ile eklendi. Okuma `fetchJournalEntries` (sayfa boyutu SABİT 20) — liste DTO'su `excerpt` + `truncated` taşıyor, TAM METİN TAŞIMIYOR. Filtre `journalEntryFilterSchema`dan geçiyor: `?q=` (başlık+içerik) düz GET formu, `?etiket=` (tam eşleşme) etiket bağlantılarından; reddedilirse süzgeçsiz liste + ekranda uyarı. Yazma YOK (silme kaydın kendi ekranında). ÖLÇÜLMEYEN: (1) İçerikte `contains` aramasının 100.000 karakterlik kayıtlarda sorgu maliyeti ölçülmedi. (2) Etiket büyük/küçük harf duyarlılığı arayüzden denenmedi.",
  },
  '/panel/hayat/gunluk/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-115 ile eklendi. Okuma yok; gün varsayılanı SUNUCUDA `appToday()`. Yazma `createJournalEntryAction`. Etiketler ekranda virgüllü METİN, formda DİZİ (`etiketleriAyir`): boş parça atılır, tekrar teke iner, uzunluk KESİLMEZ (sınırı `tagsSchema` söyler). ÖLÇÜLMEYEN: (1) Öğe düzeyi sunucu hatası (`tags.3`) form düzeyine düşer — denenmedi. (2) Denetim kaydına yalnızca gün + alan adları girdiği eylem birim testinde, arayüzden değil.',
  },
  '/panel/hayat/gunluk/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-115 ile eklendi. Okuma `fetchJournalEntryById` TEK KAYIT, TAM METİN yalnızca burada; yoksa 404 — formu liste özetinden beslemek metni 240 karaktere keserdi. `metadata.title` SABİT, kaydın başlığı sekmeye/geçmişe sızmıyor. Yazma `updateJournalEntryAction` + `deleteJournalEntryAction`; silme onayı içeriğin hiçbir yerde saklanmadığını söylüyor. ÖLÇÜLMEYEN: (1) `mood` 'Girilmedi'ye çekilince artık TEMİZLENİYOR (`bosaltilanlariNullYap`); bu ekranda arayüzden ölçülmedi. (kısmi şema); ekranda yazıyor. (2) Kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI).",
  },
  '/panel/isler': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-103 ile eklendi. İKİ GÖRÜNÜM TEK ROTA: varsayılan KANBAN (`fetchJobBoard`), `?gorunum=liste` ile tablo (`fetchJobsForPanel`, sayfalı). Kimlik zinciri diğer panel rotalarıyla aynı. Yazma kanban kartından `changeJobStatusAction`. ⚠️ KANBAN KALIPTA YOK, yeni desen — durum değiştirme YEREL `<select>`, sürükle-bırak DEĞİL; üç gerekçe `is-kanban.tsx`te (erişilebilirlik borcu · Backend'in `truncated` kararı sürüklemeyi anlamsız kılıyor · hedef açık). `truncated` DÜRÜSTÇE gösteriliyor ('50 / 1240') ve 'tamamını listede gör' bağlantısı liste görünümüne gidiyor — kesmenin zorunlu kıldığı kaçış. İSTEMCİDE YENİDEN SIRALAMA YOK (T-052'nin dersi): kolon listesi ÜST SINIRLA KESİLMİŞ, sıralamak 'kolonun en yakın teslimi' sorusunu bozardı. ÖLÇÜLDÜ (T-103): `truncated` dalı 60 kayıtlık bir LEAD kolonu fikstürüyle uçtan uca denendi — sayaç '50 / 60' yazıyor, 50 kart çiziliyor, 'Bu kolonun ilk 50 kaydı gösteriliyor' uyarısı görünüyor ve kaçış bağlantısı `/panel/isler?gorunum=liste&durum=lead`e gidip GERÇEK toplamı (60 iş, 3 sayfa) kesmeden listeliyor. Yani eksik veri tam sanılamıyor. KAPI YOK: dalı kaldıran bir düzenleme sessiz kalır ve sonucu kullanıcının eksik listeyi tam sanması olur — E2E adayı. ÖLÇÜLMEYEN: (1) Durum değiştirme sonrası kartın SUNUCU SIRALAMASIYLA yeni kolonuna yerleştiği `router.refresh()`e dayanıyor; yarış (iki sekmeden aynı işi taşımak) denenmedi. (2) Liste görünümünde tutar sütununun sıralaması DİZE karşılaştırması — farklı para birimlerinde anlamlı bir büyüklük sırası vermiyor ve bu bilinçli (ADR-014/D aritmetiği yasaklıyor); hassas sıralama gerekirse sunucuda yapılmalı. (3) Sayfa boyutu SABİT 25.",
  },
  '/panel/isler/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-103 ile eklendi. Okuma `fetchClientsForPanel({ isArchived: false })` — SEÇİCİ İÇİN, AÇIKÇA. ⚠️ Backend'in bağlayıcı uyarısı: müşteri LİSTESİNİN varsayılanı arşivi gizlemiyor ama SEÇİCİ gizlemek ZORUNDA, yoksa arşivlenmiş müşteriler yeni iş için seçilebilir çıkar. `isArchived` burada verilmezse sessizce arşiv dahil gelir. Yazma `createJobAction`. `baseAmount` FORMDA YOK — sunucuda türetiliyor, alan koymak kaydetmede sessizce üzerine yazılan bir alan göstermek olurdu. KDV/stopaj alanı YOK (ADR-014/B8, v1 kapsamı dışı) ve not da yok. ÖLÇÜLMEYEN: (1) `isFxRateConsistent` dalı (TRY'de kur 1.0 olmak zorunda, diğerlerinde olamaz) — `fields.fxRate` alana basılıyor ama bu dal ARAYÜZDEN denenmedi; şema birim testlerinde ölçülü. (2) Seçici ÜST SINIRI 100 müşteri; 100'den fazla müşteride seçicinin eksik kaldığı davranış ölçülmedi ve kullanıcıya SÖYLENMİYOR — bilinen sınır. (3) `startDate > dueDate` çapraz kuralının arayüzdeki hâli denenmedi.",
  },
  '/panel/isler/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-103 ile eklendi. Okuma `fetchJobForPanel` (TEK KAYIT: `description`, `client`, `sourceMessage`) + seçici için `fetchClientsForPanel({ isArchived: false })`. ⚠️ ARŞİVLİ MÜŞTERİ ↔ BAĞLI İŞ ÇÖZÜMÜ BURADA: seçici aktifleri getiriyor, form kaydın KENDİ müşterisi arşivliyse onu seçeneklere EK OLARAK koyup '(arşivli)' işaretiyle çiziyor. Çözüm olmasa `<select>` değeri eşleşmez, tarayıcı ilk seçeneğe düşer ve KAYDETMEK işi BAŞKA BİR MÜŞTERİYE bağlardı — sessiz veri kaybı. `JobPanelDto.client.isArchived` tam bunun için var. TUTAR İKİ YERDE: `agreedAmount` formda düzenlenebilir (kaydın kendi gerçeği), `baseAmount` SALT OKUNUR ve etiketli (TRY karşılığı); kanban ve liste yalnızca `agreedAmount` gösteriyor. `sourceMessage` GÖVDE TAŞIMIYOR (§8.20) — tam metin için mesaj rotasına bağlantı var ve o rota gerçekten mevcut. ÖLÇÜLMEYEN: (1) Arşivli müşteri çözümü bu turda ÖLÇÜLDÜ (fikstürle) ama bir KAPI yok: çözümü kaldıran bir düzenleme sessiz kalır ve sonucu veri kaybı olur — E2E adayı olarak en yüksek değerli satır bu. (2) Var olmayan kimlikte 404 dışı davranış. (3) Kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI). (4) `Job` SİLME bu turda YOK (Backend eylemi yazmadı) — ölü düğme konmadı; silme geldiğinde burası güncellenmeli. ⚠️ BAĞLI ÖDEMELER T-108f'DE EKLENDİ (§4.2'nin üçüncü parçası; kod T-101'den beri vardı, yol yoktu): okuma `fetchTransactionsForPanel({ jobId, page: 1, perPage: ODEME_UST_SINIR })` — sabit `is-gorunumleri.ts`te (SUNUCU OKUYABİLEN modül) çünkü `'use client'` taşıyan `is-odemeleri.tsx`ten okunduğunda paketleyici onu istemci başvuru VEKİLİYLE değiştiriyor ve sunucuda `take: [object Function]` / `skip: NaN` ile Prisma patlıyor; lint ve `tsc` bu sınıf hatayı GÖRMÜYOR, ölçümde 500 olarak yakalandı. SAYFALAMA YOK ve bu bilinçli — liste `IsBakiye`nin dört toplamıyla TUTMAK zorunda, o toplamlar ise `fetchJobFinancials`ın `groupBy`ından geliyor; kesilmiş bir liste toplamları tutmayan bir liste olurdu. İKİ OKUMA AYRIŞABİLİR ve ayrışırsa EKRANDA söyleniyor: satır sayısı `transactionCount`a eşit değilse `role='alert'` ile 'yukarıdaki toplamlara güvenme' yazılıyor. Satır tutarı `amount` + kaydın KENDİ birimi (`baseAmount` değil); dört toplam TRY karşılığı üzerinden ve bu fark kartın altında yazılı. İşlem SİLME yok (T-104'ün kararı), yalnızca düzenleme bağlantısı. ÖLÇÜLMEYEN (5): Liste ile dört toplamın GERÇEKTEN tuttuğu bu turda fikstürle ölçüldü ama kapı yok; ayrışma uyarısının kendisi de hiç tetiklenmedi (500'ü aşan bir iş fikstürü kurulmadı) — yani uyarı metni ölçülmemiş bir yolda duruyor.",
  },
  '/panel/muhasebe': {
    /*
     * ⚠️ KAPI ALANLARI T-107c'DE GÜNCELLENDİ (Güvenlik).
     *
     * ADR-036 `not` metnini rotayı ekleyene bırakıyor ve o metne DOKUNULMADI.
     * `kapilar`/`kanit` beyanın kapı tarafı: §9/5 senaryosu
     * (`tests/e2e/panel-gelir-rapor.spec.ts`) bu rotayı artık geziyor ve satır
     * `kapsanmiyor` demeye devam ediyordu. Kendi yazdığım kapıyı bildirmemek,
     * haritayı kendi ölçtüğü şeye kör bırakırdı (T-054g'nin sekizinci dalı
     * bunu zaten kırmızıya çevirdi).
     *
     * §9/5 senaryosu listeyi hem akışın BAŞLANGICI olarak ("Yeni işlem" bağlantısı) hem kaydın yazıldığının çapası olarak kullanıyor.
     */
    kapilar: ['e2e'],
    kanit: ["page.goto('/panel/muhasebe')"],
    not: "T-104 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma `fetchTransactionsForPanel` + süzgeç açılır listesi için `fetchTransactionCategoriesForPanel` (ARŞİV DAHİL — süzgecin işi geçmişi okumak ve arşivli kategoriye bağlı eski işlemler duruyor). Yazma yok. Filtre `transactionFilterSchema`'dan geçiyor; ters aralık reddedilince süzgeçsiz ilk sayfaya düşülüyor ve kullanıcıya SÖYLENİYOR. ⚠️ HİÇBİR SÜTUN İSTEMCİDE SIRALANMIYOR ve bu Backend'in bağlayıcı notu: sıralama `date desc, createdAt desc` ve ikincil anahtar ZORUNLU — `date` bir GÜN, aynı güne düşen işlemlerde tek anahtarla sayfalama kararsız olur ve aynı kayıt iki sayfada görünebilir; istemci `createdAt`i sütun olarak görmediği için o sıralamayı üretemez. `siralamaDegeri` hiçbir sütunda verilmiyor, yani tıklanıp hiçbir şey yapmayan başlık da yok. ⚠️ SİLME DÜĞMESİ YOK: Backend eylemi yazmadı ('bir işlemi silmek defteri geriye dönük değiştirmektir'); yanlış giriş düzeltilir. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 25, adresten verilemiyor. (2) `sort` parametresi şemada var ama arayüzden açılmıyor (hep `desc`) — ters sıralamanın sayfalama kararlılığı denenmedi. (3) `q`, `method`, `currency`, `clientId`, `jobId` filtreleri sözleşmede VAR ama arayüzde YÜZEYLENMEDİ; `jobId` özellikle eksik ve iş bakiyesindeki bağlantı bu yüzden işe göre süzemiyor (metin bunu söylüyor). (4) Beş görünümün süzme doğruluğu birim testlerinde. ⚠️ T-109f'TE İKİ YENİ MEKANİZMA BAĞLANDI. (1) CSV İNDİRME: `exportCsvAction` (Backend T-109b) + istemcide `Blob` + `URL.createObjectURL`; `src/app/api/**` altında ROTA YOK ve bu bilinçli — `CsvExportDto.content` bir DİZE olduğu için akıtacak bir şey yok, üstelik bir GET rotası dosyayı adresi bilen herkese açılabilir bir URL'e çevirirdi. `basis` ZORUNLU ve arayüz VARSAYILAN VERMİYOR (nakit/tahakkuk aynı sorunun iki cevabı değil, iki ayrı soru); seçimsiz basılırsa düğme devre dışı bırakılmıyor (T-018) — basılıyor ve sebep söyleniyor. `truncated` zarfın içinde geliyor ve indirmeden SONRA kalıcı bir uyarı olarak gösteriliyor. ÖLÇÜLDÜ (gerçek tarayıcı, Playwright indirme olayı): dosya adı ASCII (`islemler_tum_tarihler_nakit.csv`), TEK UTF-8 BOM (EF BB BF — arayüz ikinci bir BOM eklemiyor, servis zaten koyuyor), CRLF, üç küme de iniyor. Süzgeç DOSYAYA OLDUĞU GİBİ geçiyor ama SAYFA NUMARASI geçmiyor: kullanıcı süzgecin TAMAMINI indiriyor (`EXPORT_PAGE_SIZE` 10.000), ekrandaki 25'lik sayfayı değil. (2) ADR-040 TEKRARLAYAN KALEMLER: `fetchDueRecurringSummary` okuması + `processRecurringAction`. Kart LİSTEDEN ÖNCE çünkü ADR-040 'sessiz değil' diyor ve üretim ELLE tetikleniyor — basmayı unutan kullanıcının defteri eksik kalır. ⚠️ `dueCount` ENGELLİ ŞABLONLARI DA SAYIYOR ve sayı olduğu gibi basılmıyor: işlenebilir ve engelli AYRI gösteriliyor, engellinin sebebi yazılı (TRY dışı / tanınmayan kural / yıl sınırı). Aksi hâlde ekran '3 kalem bekliyor' der, kullanıcı basar, sıfır kayıt oluşur ve sayı 3'te kalırdı. ⚠️ BİR METİN KUSURU ÖLÇÜMDE YAKALANDI VE DÜZELTİLDİ: dallanma önce `dueCount === 0` ileydi; işlenebilir kalem bitip engelliler kalınca kart '0 kalem işlenmeyi bekliyor · 0 dönem kayıt üretecek' yazdı, yani SIFIRI bir ölçüm gibi sundu (T-104'ün '0,00 ₺' dersi). Dallanma `islenebilirSayi`e taşındı, üç durum üç ayrı cümle. Düğme yalnızca işlenebilir kalem varken var — devre dışı değil, gizli değil, YOK; basılacak bir şey olmadığı söyleniyor. Sonuç bildirimi SAYI söylüyor ('10 kayıt oluşturuldu'), çünkü yalnız 'işlendi' demek ikinci basışı davet ederdi. ÖLÇÜLDÜ: 1 kalem/10 dönem → 10 kayıt; İKİ SEKME ile bayat ekrandan ikinci basış → yeni kayıt YOK (15 kayıt, 25 değil) ve ekranda 'hiçbir kayıt oluşturulmadı'. ⚠️ T-109h'DE İKİ ÖLÇÜM BORCU KAPANDI. (a) KESİLME: 10.405 satırlık fikstürle ölçüldü — dosyaya 10.000 satır girdi, 405 satır düştü ve indirmeden SONRAKİ `truncated` uyarısı doğru göründü. AMA ÖLÇÜM BİR YALAN BULDU: panel indirmeden ÖNCE 'Bu süzgeçteki işlemlerin tamamı (10405 satır)' diyordu — tutulamayacak bir söz, ve kullanıcı o söze güvenip dosyayı muhasebecisine yollayabilirdi. Sayı da üst sınır da BAŞTAN biliniyordu; sınır aşılıyorsa panel artık açılır açılmaz uyarıyor ve 'tamamı' sözünü HİÇ vermiyor. `EXPORT_PAGE_SIZE` sunucu sayfasından PROP olarak geçiyor — istemci bileşeni onu kendisi içe aktarsaydı Prisma'ya bağlı servis modülü istemci paketine girerdi. İki dal da ölçüldü: 10.405 satır → önceden uyarı VAR, 'tamamı' sözü YOK; 175 satır → uyarı yok, 'tamamı (175 satır)' sözü var ve tutuluyor. (b) `skippedDuplicateCount > 0` DALI ÖLÇÜLDÜ — T-104'ün iki sekmeli CONFLICT kalıbının aynısı, ama bir ayrımla: TEK BAĞLAMDA iki sekme YETMİYOR, çünkü Next'in sunucu eylemi kuyruğu paylaşılıyor ve çağrılar SIRAYA giriyor (ikinci koşu şablonu artık vadeli görmüyor, `consideredTemplates` sıfır). İKİ AYRI BAĞLAM (aynı kullanıcı, dizüstü + telefon) gerçek yarışı üretti: bağlam 1 '82 kayıt oluşturuldu', bağlam 2 'Yeni kayıt oluşmadı: bu dönemler zaten işlenmişti (82 dönem atlandı)'. Veritabanı 82 satır / 82 benzersiz `periodKey` — çift kayıt YOK.",
  },
  '/panel/muhasebe/yeni': {
    /*
     * ⚠️ KAPI ALANLARI T-107c'DE GÜNCELLENDİ (Güvenlik).
     *
     * ADR-036 `not` metnini rotayı ekleyene bırakıyor ve o metne DOKUNULMADI.
     * `kapilar`/`kanit` beyanın kapı tarafı: §9/5 senaryosu
     * (`tests/e2e/panel-gelir-rapor.spec.ts`) bu rotayı artık geziyor ve satır
     * `kapsanmiyor` demeye devam ediyordu. Kendi yazdığım kapıyı bildirmemek,
     * haritayı kendi ölçtüğü şeye kör bırakırdı (T-054g'nin sekizinci dalı
     * bunu zaten kırmızıya çevirdi).
     *
     * §9/5 senaryosu formu arayüzden dolduruyor (tür, tarih, kategori, tutar) — akış ekrandan başlıyor (T-039).
     */
    kapilar: ['e2e'],
    kanit: ['/panel/muhasebe/yeni'],
    not: "T-104 ile eklendi. Okuma `fetchTransactionCategoriesForPanel({ isArchived: false })` — SEÇİCİ İÇİN, AÇIKÇA — ve `fetchJobsForPanel`. Yazma `createTransactionAction`. ⚠️ Backend'in bağlayıcı notu: kategori LİSTESİNİN varsayılanı arşivi gizlemiyor ama SEÇİCİ gizlemek ZORUNDA, yoksa arşivleme anlamını yitirir. HIZLI EKLEME varsayılanları: tarih bugün, yöntem havale, ödenmiş işaretli — en sık girilen hâl. `baseAmount` FORMDA YOK (sunucuda türetiliyor). ÖLÇÜLMEYEN: (1) `isFxRateConsistent` dalı arayüzden denenmedi (şema birim testlerinde ölçülü). (2) Kategori/iş seçicisi ÜST SINIRI 100; aşıldığında seçici eksik kalır ve kullanıcıya SÖYLENMİYOR — bilinen sınır, T-103'teki müşteri seçicisiyle aynı. (3) KATEGORİ TÜRÜ İŞLEM TÜRÜYLE EŞLEŞMEK ZORUNDA DEĞİL: şema bunu dayatmıyor, yani gelir işlemine gider kategorisi bağlanabilir ve sunucu kabul eder; arayüz engellemiyor (uydurma kural koymamak için) ama seçeneklerde türü YAZIYOR. Bu davranışın bilinçli olduğu ölçülmedi, karar olarak duruyor. (4) Aktif kategori HİÇ YOKSA form kaydedilemez ve uyarı gösteriliyor; o dal arayüzden denenmedi.",
  },
  '/panel/muhasebe/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-104 ile eklendi. Okuma `fetchTransactionForPanel` (TEK KAYIT — `description` yalnızca burada) + seçici için aktif kategoriler ve işler. Yazma `updateTransactionAction`. ⚠️ ARŞİVLİ KATEGORİ ↔ BAĞLI İŞLEM ÇÖZÜMÜ BURADA, T-103'teki müşteri kalıbı çoğaltıldı: seçici aktifleri getiriyor, form kaydın kategorisi aktif listede YOKSA onu seçeneklere EK OLARAK koyup '(arşivli)' işaretiyle çiziyor. Çözüm olmasa `<select>` değeri eşleşmez, tarayıcı ilk seçeneğe düşer ve KAYDETMEK işlemi BAŞKA BİR KATEGORİYE bağlardı. ⚠️ RİSK MÜŞTERİDEN YÜKSEK: `categoryId` ZORUNLU, yani 'kategori yok' seçeneği bile yok ve ilk seçenek her zaman geçerli bir kategori — müşteride ilk sırada duran 'Müşteri yok' tamponu burada YOK. SİLME YOK. ÖLÇÜLMEYEN: (1) Arşivli kategori çözümü bu turda ÖLÇÜLDÜ (fikstürle) ama bir KAPI yok: çözümü kaldıran bir düzenleme sessiz kalır ve sonucu defterin kırılımının bozulması olur — T-103'teki arşivli müşteri satırıyla birlikte en yüksek değerli E2E adayı. (2) Var olmayan kimlikte 404 dışı davranış. (3) Kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI).",
  },
  '/panel/muhasebe/kategoriler': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-104 ile eklendi. Okuma `fetchTransactionCategoriesForPanel` ARŞİV DAHİL (varsayılan, `isArchived` verilmiyor) — bu ekranın işi kategorileri YÖNETMEK ve arşivlenmiş olanı göremezse kullanıcı geri de alamaz. Yazma satırdan `archiveTransactionCategoryAction` (iki yönlü boole). ARŞİVLE ≠ SİL: `transactionCount` 'neden silinemiyor' sorusunun cevabı ve Backend İKİ BAĞI TOPLUYOR (işlemler + tekrarlayan şablonlar) — bir kategori yalnızca şablonlarda kullanılıyorsa da silinemez. RENK bir VERİ, token değil (§3.1): değer veritabanından geliyor ve `style` ile çiziliyor; §3.1'in hex yasağı SABİT renkler için. ÖLÇÜLMEYEN: (1) Sayfa boyutu SABİT 50. (2) `type` filtresi şemada var, arayüzde yüzeylenmedi (sıralama zaten `type asc` ile gruplanmış geliyor). (3) Arşivden geri alma onay İSTEMİYOR (arşivleme istiyor) — asimetrinin gerekçesi karar olarak duruyor, ölçülmedi.",
  },
  '/panel/muhasebe/kategoriler/yeni': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-104 ile eklendi. Okuma yok; yazma `createTransactionCategoryAction`. RENK alanı `type="color"` DEĞİL metin: şema `#RRGGBB` istiyor, `<input type="color">` tarayıcıya göre farklı biçim verebiliyor ve BOŞ BIRAKILAMIYOR (her zaman bir renk döndürür) — oysa alan opsiyonel. Önizleme kutusu yalnızca GEÇERLİ altı haneli hex\'te çiziliyor; yarım yazılmış bir değer tarayıcıda farklı bir renge çözülür ve kaydedilecek olandan farklı bir şey gösterirdi. ÖLÇÜLMEYEN: (1) Renk biçim hatasının arayüzdeki hâli denenmedi. (2) `icon` alanı bugün HİÇBİR YERDE çizilmiyor ve bunu kullanıcıya yardım metninde söylüyoruz; T-105\'te kullanılırsa burası güncellenmeli.',
  },
  '/panel/muhasebe/kategoriler/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-104 ile eklendi. Okuma `fetchTransactionCategoryForPanel`; yazma `updateTransactionCategoryAction`. `isArchived` BU FORMDA YOK ve olmamalı: arşivleme ayrı bir eylem ve `updateTransactionCategoryAction` o alanı hiç almıyor (T-103'te müşteri formunda verilen kararın aynısı). ÖLÇÜLMEYEN: (1) Kategori TÜRÜNÜ değiştirmek bağlı kayıtların kırılımını değiştirir; form bunu yardım metninde söylüyor ama davranışın kendisi (eski işlemlerin raporlamada nereye düştüğü) ölçülmedi — T-105'in konusu. (2) Var olmayan kimlikte 404 dışı davranış. (3) Kimlik numaralandırma.",
  },
  '/panel/muhasebe/raporlar': {
    /*
     * ⚠️ KAPI ALANLARI T-107c'DE GÜNCELLENDİ (Güvenlik).
     *
     * ADR-036 `not` metnini rotayı ekleyene bırakıyor ve o metne DOKUNULMADI.
     * `kapilar`/`kanit` beyanın kapı tarafı: §9/5 senaryosu
     * (`tests/e2e/panel-gelir-rapor.spec.ts`) bu rotayı artık geziyor ve satır
     * `kapsanmiyor` demeye devam ediyordu. Kendi yazdığım kapıyı bildirmemek,
     * haritayı kendi ölçtüğü şeye kör bırakırdı (T-054g'nin sekizinci dalı
     * bunu zaten kırmızıya çevirdi).
     *
     * §9/5 senaryosu aylık toplamı ÖNCE/SONRA okuyup farkın girilen tutara eşit olduğunu ölçüyor.
     */
    kapilar: ['e2e'],
    kanit: ['Tahsil edilen'],
    not: "T-105 ile eklendi (ADR-036). Kimlik zinciri `(panel)` düzeni + ara katman + §8.1 2FA kapısı; `robots: noindex/nofollow/nocache`. Okuma DÖRT paralel servis: `fetchMonthlyReport`, `fetchYearlyReport`, `fetchCategoryBreakdown(aylik.range)`, `fetchOutstandingSummary`. Yazma YOK — bu bir okuma yüzeyi. ⚠️ §9/5'İN DÖRDÜNCÜ HALKASI BURADA: Güvenlik'in ölçtüğü ince ayrım 'dashboard kartı yok' değil, 'muhasebe ekranının toplamı SATIR SAYISI, para toplamı değil'di; bu sayfa ilk kez gerçek bir para toplamı ekrana getiriyor, yani `senaryo-9-5-bekleme.test.ts` artık tamamen kırmızıya dönüyor ve senaryo yazılabilir (T-107c). ⚠️ İKİ ESAS AYRI BLOKLARDA ve her başlık hangi esasa baktığını YAZIYOR (nakit: `collected`/`paid`/`net.cash` · tahakkuk: `invoiced`/`incurred`/`net.accrual`); arayüz ÇIKARMA YAPMIYOR, `net` sunucudan geldiği gibi basılıyor — Backend'in `net`i döndürme sebebi tam bu riski arayüze taşımamaktı. ⚠️ ADR-039 GÖRÜNÜR: `typeMismatch` taşıyan satırlar kategori dağılımında rozetle işaretli ve altta ne demek olduğu yazılı; satır anahtarı (kategori, İŞLEM TÜRÜ) çifti olduğu için bir kategori iki satır üretebiliyor. §5.2: Recharts `next/dynamic` + `ssr:false` ile TEMBEL; iskelet grafikle aynı yükseklikte (`h-80`). ⚠️ YAZDIRMA T-108f'DE BAĞLANDI: PDF tarayıcının yazdırmasıyla üretiliyor (PDF kitaplığı YOK — §5.2 eşiğini tek başına aşardı ve grafiği ikinci bir kod yolundan çizmek `rapor-veri.ts`te kapatılan ayrışma riskini geri açardı). Kabuk (`Topbar`, `Sidebar`, dönem seçicileri, 'Muhasebeye dön') `data-yazdirmada-gizle` ile gizli; kâğıda özel bir `<h1>` dönemi yazıyor, yani her iki ortamda TEK görünür `<h1>` kalıyor. ⚠️ GRAFİK İÇİN YAZDIRMA KURALI YOK VE BU BİR ÖLÇÜM SONUCU: önce 'ResponsiveContainer yazdırmada yeniden ölçmez, SVG ekran genişliğiyle gidip A4'te kesilir' varsayımıyla `.recharts-wrapper{width:100%}` + `svg.recharts-surface{max-width:100%;height:auto}` yazıldı. VARSAYIM YANLIŞTI: yazdırma düzeni gerçekten yeniden ölçüyor (kenar menü gizlendiği için içerik GENİŞLİYOR) ve kural kusurun kendisi oldu — kural açıkken yazdırmada sarmalayıcı 0×320 / SVG 0×0, yani grafik HİÇ YOK; kural kaldırılınca 1182×320 ve PDF'te on iki ayın tamamı, gösterge, doku yerinde. Kural kaldırıldı, gerekçesi `globals.css`te yazılı. Hiçbir derleme kapısı bu çökmeyi görmedi; yalnızca PDF çıktısına bakmak gösterdi. (b) Yığın inmeden yazdırılırsa kâğıda İSKELET gidiyordu ve on iki gri çubuk VERİ gibi okunuyordu; iskeletin görsel kısmı yazdırmada gizlendi ve yerine 'veri eksik değil, çizim tamamlanmamıştı' diyen yalnızca-kâğıt bir cümle kondu. ÖLÇÜLMEYEN: (1) Dönem doğrulaması T-108f'de `monthlyReportSchema`ya (T-106) BAĞLANDI ve sınır dışı adresler artık ekranda şemanın kendi mesajlarıyla bildiriliyor — önceki beyanımdaki 'ŞEMA YOK' artık geçersiz. Geçersiz adres yine bugünün dönemine düşüyor (ekran kullanılamaz kalmasın) ve bu DAVRANIŞIN kendisi kapı ile korunmuyor: bildirimi kaldıran bir düzenleme adres ile içeriğin sessizce ayrışmasına döner. (5) YAZDIRMA ÇIKTISI HİÇ KAPI İLE KORUNMUYOR: `@media print` kuralları ne birim ne E2E testinde okunuyor; Lighthouse ekran ortamını ölçüyor. Yazdırma kusurları bu turda Chrome'un ortam taklidiyle ÖLÇÜLDÜ ama bir sonraki düzenlemede sessizce geri gelebilir. (6) CSV DIŞA AKTARIM HÂLÂ YOL AÇMIYOR: `exportTransactionsCsv`/`exportCategoryBreakdownCsv`/`exportMonthlySummaryCsv` servisleri var ve test ediliyor, çağıran yok. Bu turda düğme KONMADI — eylemi (`src/server/actions/export.ts`) Backend yazacak; ölü düğme koymak T-018'in dersine aykırı olurdu (raporun 'Engeller / talepler' bölümüne yazıldı). (2) Kategori dağılımı AYLIK aralığı kullanıyor, yıllık dağılım yüzeylenmedi. (3) Grafiğin çizdiği sayı ile yazılan sayının ayrışmadığı bu turda ÖLÇÜLDÜ (tooltip `etiket`ten, geometri `deger`den, ikisi aynı dizeden) ama KAPI YOK: tooltip'i Recharts'ın varsayılanına çeviren bir düzenleme sessiz kalır ve iki biçim ayrışır. (4) Recharts yığınının açılışta inmediği ÖLÇÜLDÜ (chunk listesiyle) ama kapı yok; `dynamic`i statik içe aktarıma çeviren bir düzenleme yalnızca Lighthouse'ta görünür. ⚠️ T-109f: İKİ CSV İNDİRME BAĞLANDI ve TEK düğme altında birleştirilmedi — ekrandaki iki tablo iki FARKLI aralığa bakıyor (kategori dağılımı SEÇİLİ AYA `aylik.range`, aylık özet BÜTÜN YILA). Tek düğme kullanıcının hangi dönemi indirdiğini bilmemesi demekti ve dosya muhasebeciye gidiyor. İkisi de `data-yazdirmada-gizle` taşıyor (T-108f'in yazdırma sözleşmesi — kâğıtta 'indir' düğmesi anlamsız). ÖLÇÜLDÜ: `kategori-dagilimi_2026-03-01_2026-03-31_tahakkuk.csv` ve `aylik-ozet_2026_nakit.csv`, ikisi de ASCII ad, tek BOM, CRLF; başlık satırları ekrandaki sütunlarla eşleşiyor.",
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
  '/panel/icerik/blog': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-047 ile eklendi. Okuma `fetchPostsForPanel`, YAZMA YOK, filtre `postFilterSchema`'dan geçiyor (adres çubuğu kullanıcı girdisidir — ADR-032). Kimlik zinciri `projeler`/`deneyim` ile AYNI: `(panel)` düzeni + ara katman, çerezsiz istek 307 → /giris, oturum + 2FA; `robots: noindex/nofollow/nocache`. E2E'ye alınmadı çünkü aynı liste kalıbı (`VeriTablosu` + `?durum=` sekmeleri + sayfalama) `projeler` tarafında ölçülüyor. ÖLÇÜLMEYEN: sayfa boyutu SABİT 25, adresten verilemiyor; sıralama ve süzme doğruluğu (birim testlerinde).",
  },
  '/panel/icerik/blog/yeni': {
    kapilar: ['e2e'],
    kanit: ["'/panel/icerik/blog/yeni'"],
    not: "ÖLÇÜLÜYOR (T-060, `csp.spec.ts`): MDX editörü nonce'lu CSP altında İHLALSİZ yükleniyor — Zod 4'ün `eval` yoklaması burada ölçüldü ve `jitless` ile kapatıldı. T-047 ile eklendi; yazma `createPostAction`. Gerekçe `deneyim/yeni` ile aynı: aynı `panel-form` + Server Action + ADR-029 zinciri `projeler/yeni` tarafında uçtan uca ölçülüyor ve `post.ts` action'ları `project.ts`in birebir kardeşi (etiket hesabı dahil). ÖLÇÜLMEYEN: slug çakışmasının bu rotadaki hâli; MDX ÖNİZLEMESİNİN İSTEMCİ TARAFI KAYNAK TÜKETİMİ — önizleme derleyicisi tarayıcıda koşuyor, derleme bombası/özyinelemeli yapı denenmedi (sunucu etkilenmiyor; kabul edilen risk, gerekçesi docs/security/README.md'de).",
  },
  '/panel/icerik/blog/[id]': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: 'T-047 ile eklendi. Okuma `fetchPostForPanel` (MDX + `coverAttachmentId`), yazma `updatePostAction` + `archivePostAction`. Arşivlenmiş yazı burada 410 DEĞİL, düzenlenebilir — panelde `ContentLookup` zarfı yok (T-040, bilinçli) ve bu davranışın kendisi ölçülmüyor. Taslak→yayın geçişinin ADR-029 tarafı `projeler/[id]`de ölçülüyor; `post` aynı `revalidateContent` + `tagTargetsFor` yolunu kullanıyor. ÖLÇÜLMEYEN: var olmayan kimlikte 404 dışı davranış; kimlik numaralandırma (cuid tahmin edilemez VARSAYILDI); istemci tarafı önizleme kaynak tüketimi (yukarıdaki satırla aynı).',
  },
  '/panel/icerik/profil': {
    kapilar: ['kapsanmiyor'],
    kanit: [],
    not: "T-036b ile eklendi (ADR-036: beyanı rotayı yazan ajan doldurur). TEKİL VARLIK — liste yok, `[id]` yok, `yeni` yok; `Profile` dil başına tek satır (ADR-017) ve seed ile açılıyor, bu yüzden adres parametre taşımıyor. Okuma `fetchProfile` (ham, önbeleksiz) Server Component içinde; yazma TEK Server Action `saveProfileAction` (`upsert`, denetim kaydına `CREATE`/`UPDATE`). Kimlik zinciri diğer panel rotalarıyla AYNI: `(panel)` düzeni + ara katman, çerezsiz istek ölçüldü → 307 /giris?callbackUrl=%2Fpanel%2Ficerik%2Fprofil, oturum + 2FA; `robots: noindex/nofollow/nocache`. E2E'ye alınmadı çünkü ölçülecek yeni mekanizma yok: `panel-form` + Server Action + ADR-029 zinciri `projeler/yeni` ve `projeler/[id]`de uçtan uca ölçülüyor, profilde durum/arşiv/sayfalama hiç yok. `socials` şemasının `.strict()` davranışı birim testlerinde. ÖLÇÜLMEYEN, DÖRT BAŞLIK: (1) `locale` form gövdesinde GİZLİ alan olarak gidiyor ve eylem onu `where` anahtarı sayıyor — başka bir dil değeri gönderip BAŞKA BİR SATIRA yazma denenmedi; bugün tek dil (`tr`) var, ikinci satır yok, ama ikinci dil geldiğinde bu bir YETKİ sorusu olur. (2) `socials` sütunu veritabanında serbest `Json` ve okuma tarafı doğrulamadan tipe daraltıyor; veritabanına elle BEKLENMEYEN bir anahtar konup formun ne yaptığı denenmedi — form alan alan okuduğu için o anahtarı taşımıyor (yani `.strict()` reddi tetiklenmez) ama KAYDETMEK O ANAHTARI SİLER ve bu davranış ölçülmedi. (3) Profil kaydı yoksa `fetchProfile` fırlatıyor ve `(panel)/error.tsx` devreye giriyor; seed'siz kurulumda bu yol denenmedi (mesaj `pnpm db:seed` diyor, sır sızdırmıyor). (4) `avatarAttachmentId`/`cvAttachmentId` GİZLİ alanlardan geliyor; var olmayan ya da BAŞKASINA AİT bir eklenti kimliği gönderilerek FK davranışı denenmedi — T-037'de yükleme bağlanınca bu doğrudan bir YETKİ sorusuna dönüşecek ve o turda burası e2e'ye çevrilmeli.",
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

  /**
   * TERS YÖN — "kapsanmiyor" diyen rota ASLINDA kapsanıyor olabilir mi?
   *
   * Yukarıdaki dallar haritanın FAZLA iddia etmesini engelliyor: "kapsanıyor"
   * diyen bir satırın kanıtı kaynakta gerçekten duruyor mu. T-054g'de aynanın
   * öteki yüzü açıktaydı ve somut olarak gerçekleşti: `/panel/ayarlar/denetim`
   * için bir E2E paketi yazıldı, beyan `kapsanmiyor` demeye devam etti ve
   * HİÇBİR KAPI kırmızıya dönmedi.
   *
   * Bunun bedeli "yanlış ama zararsız bir satır" değil. Harita, ölçülmeyen
   * yüzeyi görünür kılmak için var (T-016b); EKSİK iddia eden bir satır o
   * paketi SAHİPSİZ gösterir, ve bir gün "bu rota zaten kapsanmıyor" diye
   * okuyan biri paketi silerse hiçbir şey ses çıkarmaz. Kapsamı eksik bildirmek,
   * fazla bildirmekten daha sessiz bir yanlıştır.
   *
   * SINIR EŞLEŞMESİ ZORUNLU: düz alt dize araması `/panel/ayarlar` satırını
   * `/panel/ayarlar/denetim` gezinmesiyle eşleştirir ve her ebeveyn yolu
   * yanlışlıkla suçlardı. Yolun ardından tırnak, `?` veya `#` gelmesi şart.
   */
  it('"kapsanmiyor" diyen rotaya E2E gezinmesi YOK', () => {
    const celiskili = Object.entries(KAPSAM)
      .filter(([yol, b]) => {
        if (!b.kapilar.includes('kapsanmiyor')) return false;
        const desen = new RegExp(`${yol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=['"\`?#])`);
        return desen.test(E2E_KAYNAK);
      })
      .map(([yol]) => yol);

    expect(
      celiskili,
      `Bu rotalar "kapsanmiyor" diyor ama E2E kaynağında geziliyor: ${celiskili.join(', ')}\n` +
        'Paket yazıldıysa KAPSAM satırı da kapıyı ve kanıtı bildirmeli — yoksa harita ' +
        'kendi ölçtüğü şeyi görmüyor demektir.',
    ).toEqual([]);
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
