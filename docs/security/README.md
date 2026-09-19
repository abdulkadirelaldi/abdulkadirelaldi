# docs/security — Güvenlik Denetim Günlüğü

> Sahibi: **Güvenlik & Test** ajanı (PROGRAM.md §10.1).
> Bulgular başka ajanların dosyalarında olsa bile buraya yazılır; **düzeltmeyi
> Güvenlik ajanı yapmaz** — Orkestra Şefi ilgili ajana görev açar (§10.1 sınır kuralı).

---

## ⚠️ R21 — AÇIKLAMA KURALI (repo PUBLIC)

**Depo herkese açık:** `github.com/abdulkadirelaldi/abdulkadirelaldi`

`docs/**` klasörünün tamamı — STATUS, ADR'ler, görev kartları ve **bu dosya** —
internetteki herkes tarafından okunabilir. Bu, bulgu yazımını doğrudan değiştirir:
**henüz düzeltilmemiş bir açığın istismar ayrıntısı, saldırgana yazılmış hazır
tarif demektir.** Bulgunun kendisi düzeltmeden önce görünür olduğu sürece,
ayrıntısı da görünürdür.

### Düzeltilmemiş bulgu (AÇIK) — yazılabilecekler

| Yazılır | Yazılmaz |
| ------- | -------- |
| Başlık | Somut istismar senaryosu |
| Önem derecesi | Yeniden üretme adımları (PoC) |
| PROGRAM.md maddesi | Kesin dosya/satır numarası |
| Etkilenen alan (kabaca: "panel oturum katmanı") | Yük (payload), örnek istek, atlatma tekniği |
| Sorumlu ajan | Sızan değerin kendisi |
| Durum ve hedef görev no | Açığın hangi koşulda tetiklendiği |

Açık bir bulguda "Ne oluyor" bölümü **tek cümlelik ve soyut** tutulur:
> *"Panel oturum doğrulamasında bir atlatma yolu var. Ayrıntı düzeltmeden sonra
> eklenecek (bkz. R21)."*

### Düzeltilmiş bulgu (KAPALI) — tam ayrıntı yazılır

Düzeltme merge edildikten **sonra** istismar senaryosu, dosya/satır ve kök neden
eklenir. Amaç kurumsal hafıza: aynı hata ikinci kez yapılmasın. Kapanmış bir
açığın ayrıntısı artık saldırgana bir şey kazandırmaz.

### Bu kural neyi değiştirmez

- İç iletişim kısıtlanmaz: ayrıntı **rapor metninde** Orkestra Şefi'ne tam olarak
  iletilir; kısıtlama yalnızca **depoya yazılan** metin içindir.
- Bulgunun varlığı gizlenmez. Açık bir güvenlik borcunu STATUS'ta saklamak,
  ayrıntısını yazmaktan daha tehlikelidir.
- Geçmiş bulgular (BULGU-001…004) bu kuraldan **etkilenmez**: hepsi kapalı ya da
  istismar edilebilir bir açık değil. Aşağıdaki ayrıntılar bilinçli olarak duruyor.

> **Ek uyarı — git geçmişi geri alınamaz.** Bir ayrıntı bir kez commit edilirse
> sonradan silmek yetmez; geçmişte kalır. Kural yazarken uygulanır, sonradan değil.

---

## Bu klasör ne içerir

| Yol | İçerik | Durum |
| --- | ------ | ----- |
| `README.md` | Denetim günlüğü, bulgu kayıtları, §8 durum tablosu | Bu dosya |
| `findings/` | Uzun soluklu bulgular için ayrı dosyalar (bulgu büyüdükçe buraya taşınır) | Boş |
| `restore.md` | Yedekten geri yükleme prosedürü (§8.22) | ⏳ T-066 |

## Denetim kütüğü

| Tarih | Görev | Kapsam | Sonuç |
| ----- | ----- | ------ | ----- |
| 2026-08-04 | T-004 | Test altyapısı, `src/middleware.ts`, §8.12–8.14 başlıkları, §8.7 | 2 bulgu açıldı (BULGU-001 Düşük, BULGU-002 Yüksek) |
| 2026-08-05 | T-005 | CI kapısı, §8.18 gizli bilgi taraması, §8.24 bağımlılık denetimi, §9 Lighthouse, ADR-008 sürüm sabitlemesi | **BULGU-002 kapandı.** BULGU-003 açıldı (Orta, Frontend). §8.18 ve §8.24 ilk kez fiilen uygulandı. |
| 2026-08-05 | T-006b | İlk gerçek CI koşusunun artıkları: eylem sürümleri, Lighthouse artifact yolu ve portu, koyu tema kapsamı, R21 açıklama kuralı | **BULGU-003 kapandı** (T-002b düzeltti — iki temada da A11y 100). **BULGU-004 açıldı ve aynı görevde kapandı.** R21 kuralı yazıldı. Doğrulama: CI `31011121588` (PR #1) — üç iş yeşil, Node 20 uyarısı 0, artifact 2.18 MB. |
| 2026-08-05 | T-014 | Panel koruması (§8.5), §8.4 kilitleme politikası, kilit denetim kaydı (ADR-022) | **§8.5 ✅ oldu — `/panel` artık oturumsuz erişime kapalı.** §8.4 politikası yazıldı ve test edildi ama giriş akışına **bağlanmadı** → BULGU-005. BULGU-006 (CI kapısı) açıldı. |
| 2026-08-10 | T-016 | §9/3 auth E2E, `code` regresyon kilidi, `LockoutClient` tipi, E2E yardımcıları | **§8.4 ✅ oldu** (BULGU-005 kapandı, E2E ile kanıtlandı). **BULGU-006 yanlış pozitif olarak geri çekildi** (ADR-023). **BULGU-007 açıldı** (`pg` havuzu kapanmıyor). §8.1 ve §8.19 ⏳→⚠️. |
| 2026-08-11 | T-019 | §8.1 zorunlu 2FA kurulumu kapısı (`src/middleware.ts`, `src/lib/security/two-factor.ts`) | Kapı kuruldu ve **devre dışı bırakılarak tuttuğu kanıtlandı** (12 birim + E2E kırılıyor). **BULGU-008 açıldı**: jetondaki `tfa` alanını giriş akışı henüz koymuyor, kapı üretimde tetiklenmiyor → §8.1 ⚠️ kalıyor. |
| 2026-08-11 | T-019b | Geçiş penceresinin kapatılması; Backend beslemesinin doğrulanması | **BULGU-008 kapandı**, **§8.1 ⚠️→✅**. `null` artık kuruluma yönlendiriyor (kapalı yönde başarısız). E2E'de gevşek `/\/panel/` desenleri sıkılaştırıldı — kurulum ekranı da o desene uyduğu için üç test vakum hâlinde yeşil kalıyordu. |
| 2026-08-11 | T-005b | Auth E2E'nin CI'ya alınması: Postgres servisi, migrate + seed, "atlanan test yok" nöbeti | **BULGU-009 açıldı ve aynı görevde kapandı**: auth paketi CI'da hiç koşmuyordu ("19 skipped" ile yeşil). §8.1 kapısı ve dört `code` kilidi artık merge kapısında tutuyor. |
| 2026-08-14 | T-029b | Ölçüm sunucusunun kararsızlığı: teşhis + standalone'a geçiş | **BULGU-011 açıldı ve kapandı.** `next start` gerçek Lighthouse iş yükünde 4. koşuda düşüyordu; standalone 25/25 temiz. Yan kazanç: T-029a'daki koşu değişkenliği (yayılım 32 → ≤1) ve SEO 60 → 100. Isınma isteği önerisi geri çekildi. |
| 2026-08-12 | T-029a | Lighthouse'a masaüstü + koyu profil (WebGL yolu), üç durumlu WebGL doğrulaması, koşu değişkenliği kararı | **BULGU-010 açıldı**: WebGL yolu hiçbir CI koşusunda ölçülmüyordu. Profil kuruldu ve doğrulandı; ölçüm T-021'in hero'yu bağlamasını bekliyor (kontrol kendi kendine zorunlu hâle geliyor). Değişkenliğin **ilk koşuya** ait olduğu ölçüldü; `numberOfRuns` 5, `aggregationMethod` açıkça medyan. |
| 2026-08-17 | T-029d | Ölçüm yüzeyi dışındaki SEO/OG rotaları (BULGU-015) | **BULGU-015 kapandı** — `tests/e2e/seo-routes.spec.ts`: robots.txt, sitemap.xml, rss.xml, `/og` ve `/og/proje/<slug>` artık her koşumda isteniyor. PNG imza baytlarından, XML gerçek ayrıştırıcıyla doğrulanıyor. Kapsam iki katmanlı: sözleşme testleri + sitemap taraması (yeni sayfa kendiliğinden kapsanır). Mutasyonla kanıtlandı: düzeltme öncesi font aynı render yolunda BULGU-014'ün `TypeError`'ını veriyor. **BULGU-016 açıldı** — sitemap üç adet 404 adresi bildiriyor. |
| 2026-08-16 | T-029c | Ölçüm işinin veri kurulumu (BULGU-013) + §8.24 haftalık zamanlayıcı | **BULGU-013 açıldı ve düzeltildi**: `lighthouse` işi ayrı koşucuda `services:` bloğu olmadan koşuyordu; ADR-026 sonrası `/` 500 dönüyor, üç profil düşüyor, artifact üretilmiyordu. Kendi Postgres'i kuruldu (yol **a**). İki yeni nöbet: ölçüm ön koşulu ve ayırt edicide durum kodu kontrolü — ikincisi olmadan arıza "⏳ BEKLEMEDE" diye yeşil görünüyordu. §8.24 artık **haftalık** de koşuyor (`17 6 * * 1`). |
| 2026-09-19 | T-044g | Dört rota beyanı, ADR-034 taraması, iki karar (şifre hız sınırı + oturum geçersizleştirme), §9/1 | **Kapı yeşil** — dört rota beyan edildi; ikisi (`projeler/yeni`, `projeler/[id]`) GERÇEK e2e kapsamı kazandı çünkü §9/6 paketi yeni UI'ya taşındı. **§9/6'nın LİTERAL hâli kapandı**: T-043f ENGEL-1'i kaldırınca taslak→yayın geçişi panelden ölçülebilir oldu; `updateProjectAction` yolunun ADR-029 hesabı AYRI mutasyonla sınandı (ekleme yolundan farklı: `tagTargetsFor(before, dto)`). **ADR-034 taraması:** on bir `buildDiff` + yedi elle yazılmış `diff` okundu — bugün sızıntı YOK; emniyet ağının kapsamı üçüncü kez bağımsız ölçüldü ve YENİ bilgi çıktı: iç içe/dizi içindeki BİLİNEN adlar maskeleniyor, yani sınır özyineleme değil **ad bilgisi**. **BULGU-019 açıldı**: üç silme eylemi `diff: { deleted: before }` ile satırın tamamını yazıyor — bugün public içerik, yarın eklenecek hassas bir sütun sessizce girer. **Şifre hız sınırı: GEREKLİ** — asıl gerekçe brute-force değil kaynak tüketimi (ölçüldü: argon2 doğrulaması p50 **31 ms**, ~33 deneme/sn/çekirdek, her deneme **19 MiB**). **BULGU-020 + T-046 önerisi**: ara katmanın Edge'de DB okuyamadığı derleme hatasıyla doğrulandı; panel SAYFALARININ `auth()` çağırmadığı ölçüldü (tek istisna `ayarlar/guvenlik`) — yani `auth()` içindeki bir kontrol yazmaları kapatır, **okumaları kapatmaz**. Kontrolün maliyeti p50 **0.49 ms**. Üç katmanlı öneri yazıldı. **§9/1 kapandı** → sayaç **5 kapalı / 1 kısmi / 1 açık**. |
| 2026-09-15 | T-043g | İki mesaj rotasının kapsam beyanı, §9/2'nin dördüncü halkası, KVKK sınırı, `latest` uyarısı | **§9/2 TAM KAPANDI** — T-039'da açık bekleme olarak işaretlenen tek iddia bağlandı: ziyaretçi mesajı panelde satır olarak görünüyor, liste yalnızca `preview` taşıyor (mesaj bilerek 160 karakterden uzun, kuyruk imzası listede YOK detayda VAR), rozet sayıyor. İki mutasyonla sınandı. **KVKK kararı: kabul edilebilir** — 'Göster/Gizle' bir perde, yetki sınırı değil; asıl sınır liste/detay ayrımı ve bağımsız ölçümüm onu doğruladı (liste ham gövdesinde `ip`/`userAgent` işaretleri YOK, detayda VAR). Sızıntı kontrolü mutasyonla sınandı. **Kendi testimde iki vakum yakalandı ve kayda geçti:** `request` fixture'ı çerez taşımıyor, `page.request` yönlendirme izliyor — ikisinde de 'işaret yok' sonucu giriş sayfasından geliyordu; ham gövde artık gezinme yanıtından okunuyor ve 'doğru sayfa' kontrolüyle birlikte. İki rota beyan edildi (ölçülmeyen satırlarıyla), §9 sayacı **4 kapalı / 2 kısmi / 1 açık**. `latest` etiketi uyarısı kayda geçti: `prisma@latest` → 8.0.0-rc.14 (RC!), `vitest` → 5.0.0, `next` → 16.3.4. |
| 2026-09-13 | T-042g | §8.24 üçüncü kez gerçek olayda tetiklendi: `mysql2`, `fast-uri` (×4), `js-yaml` | **Üçü de kapandı, kapı EXIT 0.** Katmanlar ölçümle seçildi: `fast-uri` ve `js-yaml` **A** (üst paket aralığı yamayı zaten kapsıyor → 3.1.7 ve 4.3.2, override YOK), `mysql2` **B** (`prisma` `"3.15.3"` diye TAM SABİTLİYOR, A imkânsız; kararlı `prisma@7.10.0` da aynı pini taşıyor, C etkisiz → `">=3.23.1 <4.0.0"` ile 3.24.4). **Maruziyet dört ölçümle belirlendi**, varsayılmadı: `Module._load` izleyicisi `generate`/`migrate`/`seed` akışlarında hiçbirini yüklemiyor, taze derlemenin `.next` çıktısında 0 dosya. `@hookform/resolvers → ajv → fast-uri` yolu görev kartında yoktu, denetim çıktısının tamamı okununca çıktı — ölçüldü, `/zod` giriş noktası `ajv`ye ulaşmıyor. **İki sessiz tuzak oyunkitabına işlendi:** `pnpm update --recursive` geçişli pakette EXIT 0 döndürüp HİÇBİR ŞEY yapmıyor (`--depth Infinity` gerekiyor), ve `">=x"` sınırsız override bir kısıttır, yükseltme emri değil — `sharp` 0.35.3'te bu yüzden donmuştu. `postcss` aynı durumdaydı, iki sınırlıya çevrildi. ADVISORY-002 istisnası doğrulandı (70 gün kaldı, kaldırma koşulu hâlâ sağlanmadı) ve kapının altı kırmızı dalı yeniden mutasyonla sınandı. |
| 2026-09-09 | T-039 | §9/6 (panelden yayınla → public'te görün) ve §9/2 (ziyaretçi mesajı → panel) uçtan uca | **§9/6 KAPANDI** — `panel-yayin.spec.ts`. Testin geçerliliği ÖNBELLEK ISITMASINA bağlı: ısıtma olmadan etiket düşürme tamamen bozulsa bile yeşil kalırdı. **Üç mutasyonla sınandı** (`tags.ts` geçici bozuldu, md5 ile geri alındı): etiket hiç düşmüyor → kırmızı, yalnızca `slugTag` düşüyor → kırmızı, yalnızca `localeTag` düşüyor → **yeşil**. Üçüncüsü beklentiyi düzeltti: detay önbellek girdisi `localeTag` de taşıdığı için `slugTag` bugün hiçbir yolda gözlemlenebilir değil — `tags.ts`'teki gerekçe fazla iddialı, düzeltmesi Backend'de; katman birim testiyle kapalı. **§9/2 üç halkası kapandı**, dördüncüsü (panel mesaj kutusu EKRANI) **açık bekleme** — `test.skip` kullanılmadı, atlanan test "atlanan test yok" nöbetini kırar. Ekranın besleneceği okuma yolu şemadan üretilen varsayılan filtreyle ölçülüyor. Zaman tuzağı ölçüldü: hızlı gönderim `puan=30 tooFast` üretiyor, beklemeli gönderim **0**. Test izolasyonu iki projede paralel koşum için süreç anahtarına çevrildi. §9: **3 kapalı, 3 kısmi, 1 açık**. |
| 2026-08-29 | T-016b | Rota envanteri × kapı kapsamı; kapsam boşluklarının kapatılması ve kalıcı kapı | 21 rota `src/app`tan **türetildi** (elle liste yok). İki boşluk kapandı: **`/api/v1/health`** §13.6 zarfı hiç doğrulanmıyordu — "durum kodunu bilerek ölçmüyoruz" gerekçesi T-005b'den beri **bayat** (CI'da artık DB var), üstelik §13.7 izlemesi tam o gövdeye bakacak; **`/api/v1/iletisim`** yalnızca birim testliydi, ucun **sunulduğu** hiç ölçülmemişti. Sağlık testi beklentisini **ölçerek seçiyor** (disk < %5 → arıza dalının sözleşmesi) — sabit `200` yerelde haksız kırmızı üretiyordu. Kalıcı kapı: `tests/unit/rota-kapsami.test.ts`, 31 test, yedi kırmızı dalı var; yeni rota beyansız kalırsa `pnpm test` düşer. Yedi mutasyonla doğrulandı (biri gerçek bir `page.tsx` eklenerek). Ters bulgu kayda geçti: `/api/v1/panel/islem` **var olmayan** bir sonda adresi — artık `SANAL_ROTALAR`'da beyanlı. |
| 2026-08-25 | T-029e | WebGL kontrolünün bayat öncülü (koşum 32828187466) + masaüstü eşiği | Kontrol **dört** koşul biliyordu, T-020c **beşincisini** (yazılım rasterleyici) eklemişti; kontrol doğru çalışıp yanlış şeyi iddia ediyordu. Artık **üç iddia** var: GPU var → `ogl` inmeli (§5.2.2) · GPU yok → **inmemeli** (T-020c, yeni — BULGU-018'in geri gelişini doğrudan yakalar) · mobilde inmemeli (§5.2.5). Koşucunun çizim gücü **ölçülüyor**: LHCI'ın ikilisi + `lighthouserc.json` bayrakları, `gpu-tespit.ts` ile aynı iki sinyal, imza listesi o dosyadan **okunuyor** (sürüklenme koruması). "headless = GPU yok" varsayımı ölçümle çürütüldü — tam Chrome `--headless=new` ile ANGLE Metal, `chrome-headless-shell` ile SwiftShader bildiriyor. Altı dal mutasyonla, ayrıca kırmızı koşumun gerçek raporlarıyla sınandı. **BULGU-018 KAPANDI** (T-020c; CI'da 60 → **100**, yayılım 0) → masaüstü tavanı 0.55 kaldırıldı, üç profil de **0.90**. |
| 2026-08-24 | T-029 | §9 eşiklerinin `error`'a çevrilmesi, ADR-030 notu, Playwright ikilileri, Docker Hub kesintisi | Eşikler profil başına ve **ölçüye dayalı** kondu: mobil perf **0.90** (ölçülen 94-95), masaüstü perf **0.55** (ölçülen 60), a11y/bp/seo **0.95** (ölçülen 100, yayılım 0). **BULGU-018 açıldı** — masaüstü WebGL profili TBT 9 990 ms / SI 11.9 s ölçüyor (GPU'suz koşucuda `ogl` yazılımla render ediliyor); görev kartındaki "masaüstü 100" rakamı **yerelde** alınmış, bayat. SEO `error` yapıldı: 91'lik yanlış pozitif **detay sayfalarında** ve ölçüm listesinde detay sayfası yok. Dokuz satırlık kırmızı/yeşil matrisi **CI'dan indirilen gerçek raporlara** karşı koşuldu. Playwright: sürüm tam sabit, ikili adımı koşulsuz — değişiklik gerekmedi. Docker Hub: kabul + yeniden koş, yeniden değerlendirme koşuluyla. |
| 2026-08-22 | T-005d | Derleme adımının `NEXT_PUBLIC_SITE_URL` eksiği (koşum 32386089662) + §8.24'te ikinci advisory | Değişken **iş düzeyinde** verildi (açıkça sahte: `https://ci-test-only.ornek.test`), `DATABASE_URL` adım düzeyinde kaldı. **BULGU-017 açıldı**: env düzelince altından ikinci arıza çıktı — `sitemap.xml`/`rss.xml` ön-render edildiği için derleme yeniden DB'ye bağımlı. **BULGU-002 nöbeti sentetik değil GERÇEK bir gerilemeyle tuttu.** **ADVISORY-002 açıldı** (`deepmerge-ts` GHSA-ggr8-5vv4-36mx): majör atlıyor + üst paket sürümü **tam sabitliyor** → override reddedildi, **katman D**, 2026-11-22'de kendiliğinden sona eren istisna. İstisna kapısının altı kırılma dalı da mutasyonla kanıtlandı. |
| 2026-08-14 | T-005c | §8.24 tetiklendi: `nanoid` GHSA-2v37-7h3g-55p8 (Yüksek, geçişli, 9 yol) | **ADVISORY-001 kapandı** — `pnpm.overrides` ile `nanoid` `>=3.3.18 <4.0.0`. Denetim EXIT 0. Açık aralık (`>=3.3.18`) sessizce **6.0.1**'e çözülüyordu (üç majör atlama, ESM-only) — ölçülerek yakalandı ve daraltıldı. **Advisory oyunkitabı yazıldı**; kalıcı override'ların birikmesine karşı kaldırma koşulu ve altı aylık gözden geçirme kuralı kondu. |

---

## BULGU-001 — `/api/v1/health` kendi `X-Robots-Tag` başlığını yazıyor; T-004 kabul kriteri bu hâliyle doğrulanamaz

**Önem:** Düşük (kabul kriteri hatası — kodda güvenlik açığı yok)
**PROGRAM.md maddesi:** §8.7
**Dosya/satır:** `src/app/api/v1/health/route.ts:106`, `src/app/api/v1/health/route.ts:139`
**Sorumlu ajan:** — (bilgilendirme; **kod değişikliği İSTENMİYOR**)

**Ne oluyor:**
T-004 görev kartı şunu şart koşuyor: *"`/api/v1/health` matcher DIŞINDA — bunu bir testle
kanıtla"* ve önerilen kanıt, ucun `X-Robots-Tag` başlığını **taşımaması**. Ancak uç bu
başlığı ara katmandan almıyor, **kendi elleriyle yazıyor** — hem 200 hem 503 yolunda.
T-003b kabul doğrulaması da bunu zaten kaydetmiş (STATUS.md: *"Her iki yanıtta
`cache-control: no-store` + `x-robots-tag: noindex, nofollow`"*).

Yani "health'te `X-Robots-Tag` yok" beklentisi **her koşulda başarısız olurdu** ve bu,
ara katmanın yanlış yapılandırıldığı izlenimi verirdi.

**Neden riskli:**
Doğrudan istismar edilebilir bir açık değil. Risk, **yanlış kanıt** riski: kriteri
harfiyen uygulayan bir test kırmızı kalır, düzeltmek için ya health ucundan doğru bir
başlık kaldırılır (uç matcher dışında olduğu için kendi korumasını kendi yazmak
zorunda — kaldırılırsa gerçek bir gerileme olur) ya da test devre dışı bırakılır.
İkisi de §8.7'yi zayıflatır.

**Önerilen çözüm:**
Kodda değişiklik yok. Kanıt olarak `X-Frame-Options` kullanılıyor — bu başlığı **yalnızca
ara katman** yazar, uç yazmaz. `tests/e2e/security-headers.spec.ts` iki yönü birden
doğruluyor:

1. `/api/v1/health` → `x-frame-options`, `permissions-policy`, `referrer-policy` **yok**
   (matcher dışında olduğunun kanıtı)
2. `/api/v1/health` → `x-robots-tag` ve `cache-control: no-store` **hâlâ var**
   (ucun kendi korumasının gerileme testi)

**Orkestra Şefi'nden istenen:** T-004 kabul kriteri listesindeki ilgili maddenin
"health `X-Robots-Tag` taşımamalı" değil **"health ara katman başlıklarını taşımamalı"**
olarak düzeltilmesi.

---

## BULGU-002 — `.env` olmadan `pnpm build` çöküyor; T-005 CI hattı ilk çalıştırmada düşer

> ## ✅ KAPANDI — 2026-08-05 (T-003c)
>
> Backend havuzu tembel kuruluma çevirdi (`src/server/db.ts` → `getPool()` /
> `resolveClient()` / `db` proxy'si). Önerilen çözümün aynısı uygulandı.
>
> **T-005'te bağımsız doğrulandı:**
> - `.env` yokken `pnpm build` → **EXIT 0** (T-004'te EXIT 1 idi)
> - CI hattının tamamı `.env` ve Postgres olmadan yeşil geçiyor
> - **Gerileme koruması:** `tests/unit/db.test.ts` — 11 test. Biri `getPool()`
>   çağrısını yeniden modül gövdesine taşırsa test anında kırmızı olur; artık
>   hatanın CI'da veya Docker derlemesinde ortaya çıkmasını beklemiyoruz.
> - Gerçek `DATABASE_URL` **CI secret'ı yapılmadı** — bulgunun asıl uyardığı
>   yanlış refleks gerçekleşmedi (ADR-009 bunu kural hâline getirdi).

**Önem:** Yüksek (kapandı)
**PROGRAM.md maddesi:** §8.17 (`.env` repoya girmez → CI'da `.env` YOKTUR), §13.1 (Docker imajı), §10.6 (DoD)
**Dosya/satır:** `src/server/db.ts:99` (`createPool()` modül yüklenirken çağrılıyor), tetikleyen: `src/server/db.ts:54-57`
**Sorumlu ajan:** **Backend**

**Ne oluyor:**
`src/server/db.ts:99` havuzu **modül içe aktarma anında** kuruyor:

```ts
const pool: Pool = globalForDb.pgPool ?? createPool();
```

`createPool()` ise `DATABASE_URL` tanımsızsa `throw` ediyor (satır 54–57). Next'in
`next build` sırasındaki **"Collecting page data"** adımı `/api/v1/health` rota modülünü
içe aktarıyor → zincir `db.ts`'e iniyor → hata fırlıyor → derleme **çöküyor**.

Ölçülen (2026-08-04, T-004 doğrulaması; `.env` geçici olarak kaldırıldı, DB durdurulmuş):

| Komut | `.env` YOK | Not |
| ----- | ---------- | --- |
| `pnpm typecheck` | ✅ EXIT 0 | |
| `pnpm lint` | ✅ EXIT 0 | |
| `pnpm test` | ✅ EXIT 0 · 31 test | T-004 kabul kriteri karşılandı |
| **`pnpm build`** | ❌ **EXIT 1** | `Failed to collect page data for /api/v1/health` |
| `pnpm build` + sahte `DATABASE_URL` | ✅ EXIT 0 | Erişilemeyen bir adres bile yeterli |

Bu, **T-003b'nin Güvenlik ajanına verdiği nota aykırı**. Not şöyleydi:
*"`.env` OLMADAN `pnpm install` + `typecheck` + `build` çalışır — doğrulandı."*
Üçünden ikisi doğru; **`build` doğru değil**. Nota güvenildiği için T-004'te bağımsız
olarak ölçüldü ve fark burada çıktı.

**Neden riskli (somut senaryo):**
T-005 CI hattı `lint → typecheck → unit → build → e2e` sırasıyla kurulacak. CI'da `.env`
**bulunmaz** — §8.17 bunu zaten yasaklıyor. Dolayısıyla:

1. T-005'in ilk çalıştırması `build` adımında düşer.
2. Aynı hata `Dockerfile` (T-070) derleme aşamasında da çıkar — üretim imajı hiç üretilemez.
3. En kötü sonuç teknik değil davranışsal: CI'yı yeşile döndürmek için en hızlı yol,
   **gerçek `DATABASE_URL`'i bir CI gizli değişkeni (secret) olarak eklemektir**. O an
   üretim veritabanı bağlantı dizesi, yalnızca derleme yapan bir işe verilmiş olur —
   §8.17/§8.20'nin sınırlamaya çalıştığı sır yayılımının ta kendisi. Derlemenin
   veritabanına hiç ihtiyacı yok; bu sırra sahip olması için hiçbir gerekçe olmamalı.

**Önerilen çözüm (kod düzeyinde):**
Havuzu **tembel** (lazy) kur — modül yüklenirken değil, ilk gerçek kullanımda:

```ts
let poolInstance: Pool | undefined;

function getPool(): Pool {
  poolInstance ??= globalForDb.pgPool ?? createPool();
  if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = poolInstance;
  return poolInstance;
}

export async function pingDatabase(): Promise<void> {
  const client = await getPool().connect();
  client.release();
}
```

`db` ihracı için de aynı desen (`getDb()`) gerekir. **Bunu yapmak için doğru an tam
şu an:** `@/server/db`'nin bugün tek tüketicisi var (`pingDatabase` → health ucu,
`src/app/api/v1/health/route.ts:7`). T-015'te servis katmanı yazıldıktan sonra aynı
değişiklik onlarca dosyaya dokunur.

Bu çözüm hızlı-başarısızlık davranışını **kaybettirmez**: `DATABASE_URL` eksikse hata
ilk sorguda yine fırlar ve `/api/v1/health` yine 503 döner — sadece derleme zamanında
değil, çalışma zamanında.

**Reddedilen alternatif:** CI'ya ve `Dockerfile`'a sahte bir `DATABASE_URL` koymak.
Derlemeyi geçirir ama sorunu gizler; `Dockerfile`'a yazılan sahte bağlantı dizesi ileride
gerçeğiyle karıştırılabilir ve yukarıdaki "gerçek sırrı CI'ya ekleme" baskısını ortadan
kaldırmaz, sadece erteler.

---

## BULGU-003 — Kontrast oranı WCAG AA'yı geçmiyor; K5 kabul kriteri şu an sağlanmıyor

> ## ✅ KAPANDI — 2026-08-05 (T-002b, Frontend)
>
> Frontend token kontrastlarını ve metin içi bağlantı ayrımını düzeltti.
> **T-006b'de bağımsız ölçüldü** (LHCI, 3 koşu × 2 tema):
>
> | Tema | A11y | Perf | Best Practices | SEO |
> | ---- | ---- | ---- | -------------- | --- |
> | Aydınlık | **100** (92 idi) | 91 | **100** (96 idi) | 60 ¹ |
> | Koyu | **100** | 91 | **100** | 60 ¹ |
>
> ¹ SEO 60 bir bulgu değil: T-002 yer tutucu sayfası `robots: { index: false }`
> taşıyor. T-021 gerçek ana sayfayı yazınca düzelir.
>
> `color-contrast`, `link-in-text-block` ve `errors-in-console` denetimlerinin
> üçü de artık geçiyor. **Gerileme koruması:** koyu tema T-006b'den itibaren
> CI'da ayrı bir Lighthouse koşusu olarak ölçülüyor — düzeltme iki yönde de
> korunuyor.

**Önem:** Orta (kapandı)
**PROGRAM.md maddesi:** §1.1 K5 (WCAG 2.1 AA), §3.1 (renk token'ları), §5.2/7 (efekt okunabilirliğin önüne geçmez)
**Dosya/satır:** `src/app/globals.css` (token değerleri) ve/veya `src/app/(public)/page.tsx`
**Sorumlu ajan:** **Frontend**

**Ne oluyor:**
T-005'te Lighthouse CI ilk kez koştu (3 koşu, mobil emülasyon). Erişilebilirlik
skoru **0.92** — §9'un istediği **≥0.95**'in altında. İki denetim sıfır aldı:

| Denetim | Skor | Anlamı |
| ------- | ---- | ------ |
| `color-contrast` | 0 | Ön plan/arka plan kontrast oranı yetersiz |
| `link-in-text-block` | 0 | Bağlantılar yalnızca RENKLE ayırt ediliyor |

Ayrıca `best-practices` içinde `errors-in-console` sıfır aldı — tarayıcı
konsoluna hata yazılıyor (ayrı, daha küçük bir konu).

**Neden riskli:**
Bu bir güvenlik açığı değil, **kabul kriteri ihlali** — ama sessizce birikme
riski yüksek. §3.1 token'ları şu anda tüm bileşenlerin temeli; kontrast sorunu
token düzeyindeyse **F2'de yazılacak her sayfaya kopyalanır** ve F6'da tek tek
düzeltilmesi gereken onlarca ihlale dönüşür. `link-in-text-block` ayrıca renk
körü kullanıcılar için gerçek bir erişim engeli: metin içindeki bağlantı
yalnızca mor tonuyla ayrılıyorsa, o kullanıcı bağlantı olduğunu hiç anlamıyor.

Ölçüm şu an **T-002'nin geçici doğrulama sayfası** üzerinde yapıldı; gerçek
ana sayfa değil. Ancak ölçülen şey büyük ölçüde token'lar ve primitifler —
yani bulgunun kaynağı geçici sayfa değil, kalıcı tasarım katmanı.

**Önerilen çözüm:**
1. `--text-muted` (#7A7A99 koyu temada) ve `--text-body` token'larının
   `--bg-surface` üzerindeki kontrast oranını ölçüp AA (normal metin 4.5:1,
   büyük metin 3:1) eşiğine çekmek.
2. Metin içi bağlantılara renk DIŞINDA bir ayırt edici eklemek —
   `text-decoration: underline` en ucuzu.
3. `errors-in-console` için konsola düşen hatanın kaynağını bulmak.

**Not:** Lighthouse F0'da **uyarı modunda** olduğu için bu bulgu CI'ı
kırmızıya çevirmiyor. F2 sonunda (T-029) `error`'a çevrilecek — o tarihe
kadar düzeltilmezse hat kırmızı olur ve F2 kapanamaz.

---

## BULGU-004 — Lighthouse raporu hiçbir yere kaydedilmiyordu; kapı sessizce boş çalışıyordu

> ## ✅ KAPANDI — 2026-08-05 (T-006b, aynı görevde)

**Önem:** Düşük (güvenlik açığı değil — **denetim kaybı**)
**PROGRAM.md maddesi:** §9, §10.6
**Dosya/satır:** `.github/workflows/ci.yml` (Lighthouse artifact adımı), `lighthouserc.json` (`upload.outputDir`)
**Sorumlu ajan:** Güvenlik & Test (kendi dosyam)

**Ne oluyordu:**
İlk gerçek CI koşusunda (`31002868890`) Lighthouse işi **yeşil** göründü ama şu
uyarıyı bıraktı:

```
##[warning]No files were found with the provided path: .lighthouseci/.
No artifacts will be uploaded.
```

Kök neden: `actions/upload-artifact`, **nokta ile başlayan dosya ve dizinleri
varsayılan olarak atlar** (`include-hidden-files: false`). LHCI raporları
gerçekten `.lighthouseci/rapor` altına yazmıştı — dosyalar vardı, ama artifact
adımı onları "gizli" sayıp görmezden geldi. Üstelik varsayılan
`if-no-files-found: warn` olduğu için adım **başarılı** sayıldı.

**Neden riskli:**
Bir istismar yolu değil, ama denetim mekanizmasının sessizce boşa çalışması.
Skorlar yalnızca koşu loglarında kalıyordu; loglar dönüşümlü olarak silinir.
T-029'da Lighthouse `error` moduna çevrildiğinde bir eşik düşerse, **neden
düştüğünü gösterecek rapor elde olmayacaktı** — yalnızca "skor 0.87" satırı.
Ayrıca T-005/K3'te raporları herkese açık depolama yerine artifact'ta tutma
kararı alınmıştı; o karar fiilen uygulanmıyordu.

Genel ders: **"yeşil" ≠ "çalıştı".** Uyarı üreten bir adım, iş yeşil olsa bile
okunmalı — ilk gerçek koşunun loglarını satır satır okumasaydım bu fark
edilmezdi.

**Uygulanan çözüm:**
1. `lighthouserc.json` → `upload.outputDir`: `.lighthouseci/rapor` → **`lighthouse-raporu/aydinlik`** (noktasız).
2. Artifact yolu `lighthouse-raporu/`; iki temanın raporu tek artifact'ta.
3. `if-no-files-found: error` — rapor üretilmezse adım artık **kırmızı**, sessiz uyarı değil.
4. `.gitignore`'a `/lighthouse-raporu` eklendi.

**Doğrulama — gerçek CI koşusu `31011121588`** (PR #1, `pull_request`):
üç iş de yeşil, `lighthouse-raporu` artifact'ı **2.18 MB** olarak yüklendi ve
her iki temanın 3'er raporunu içeriyor. Node 20 uyarı sayısı: **0** (önceki
koşuda üç işin üçünde de vardı).

---

## Ölçüm — Lighthouse, iki tema (CI `31011121588`)

Artifact'tan okunan ham skorlar (3 koşu, LHCI medyan üzerinden değerlendirir):

| Tema | `extraHeaders` | Performance | A11y | Best Practices | SEO |
| ---- | -------------- | ----------- | ---- | -------------- | --- |
| Aydınlık | `null` | 69 · 90 · 94 | **100 · 100 · 100** | 100 · 100 · 100 | 60 · 60 · 60 |
| Koyu | `{"Cookie":"ae-theme=dark"}` | 94 · 91 · 94 | **100 · 100 · 100** | 100 · 100 · 100 | 60 · 60 · 60 |

`extraHeaders` sütunu koyu tema koşusunun gerçekten koyu temayı ölçtüğünün
kanıtıdır — Lighthouse kendi ayarını rapora yazar. Ayrıca sunucunun cookie'yi
onurlandırdığı doğrudan görüldü: `Cookie: ae-theme=dark` ile
`<html … class="… dark">`, cookie'siz sınıf yok.

### ⚠️ İzlenmesi gereken: performans koşu değişkenliği

Aydınlık temada üç koşu **69 / 90 / 94** çıktı. Medyan 90 olduğu için eşik
(≥0.90) **kıl payı** geçti ve uyarı üretmedi. Ama 69'luk bir aykırı değer,
GitHub koşucusunun paylaşımlı CPU'sunda ölçümün ne kadar oynadığını gösteriyor.

**T-029 için risk:** eşikler `error`'a çevrildiğinde talihsiz bir koşu hattı
kırmızıya çevirebilir — üstelik kodda hiçbir şey değişmeden. O görevde şu
seçeneklerden biri kararlaştırılmalı: `numberOfRuns` artırmak, medyan yerine
`aggregationMethod: "optimistic"` kullanmak, ya da performans eşiğini ayrı bir
"bilgilendirici" işe taşıyıp merge kapısından çıkarmak. Erişilebilirlik, en iyi
uygulamalar ve SEO değişkenlik göstermiyor; sorun yalnızca performans.

---

## BULGU-005 — §8.4 kilitleme politikası giriş akışına bağlanmadı

> ## ✅ KAPANDI — 2026-08-10 (T-013c bağladı, T-016 uçtan uca doğruladı)
>
> Backend `authenticateUser` içindeki `fail()` yardımcısına `applyLockoutPolicy`
> çağrısını ekledi ve `AuthClient.user.update` tipini `lockedUntil` kabul edecek
> şekilde genişletti — önerilen çözümün aynısı.
>
> **T-016'da GERÇEK TARAYICIYLA doğrulandı** (`tests/e2e/auth.spec.ts`):
>
> | Ölçüm | Sonuç |
> | ----- | ----- |
> | Beş yanlış şifre → `User.lockedUntil` yazılıyor mu | ✅ `isAccountLocked()` true |
> | Kilitliyken DOĞRU şifre reddediliyor mu | ✅ `ACCOUNT_LOCKED` mesajı |
> | Dört yanlış deneme kilitlemiyor mu (eşik sınırı) | ✅ giriş başarılı |
>
> Politika artık yalnız birim testinde değil, üretim kod yolunda da çalışıyor:
> E2E kilit senaryosu, `applyLockoutPolicy` hiç çağrılmasaydı kırılırdı.
>
> **R21 notu:** Bulgu kapandığı için ayrıntı serbestçe yazılabilir hâle geldi;
> açıkken bilinçli olarak kısıtlı tutulmuştu.

**Önem:** Yüksek (kapandı)
**PROGRAM.md maddesi:** §8.4
**Etkilenen alan:** Giriş akışı — kimlik doğrulama katmanı
**Sorumlu ajan:** **Backend** (`src/server/auth/**` — Güvenlik ajanının yazma izni yok)
**Durum:** AÇIK · **Hedef görev:** Orkestra Şefi tarafından açılacak

> **R21 gereği ayrıntı kısıtlı.** Bu bulgu henüz düzeltilmedi ve depo herkese
> açık; somut istismar senaryosu, tetikleme koşulları ve saldırı hızı bilinçli
> olarak YAZILMAMIŞTIR. Düzeltme merge edildikten sonra tam gerekçe eklenecek.

**Ne oluyor (özet):**
§8.4'ün gerektirdiği kilitleme politikası T-014'te yazıldı ve 20 birim testiyle
doğrulandı (`src/lib/security/rate-limit.ts`). Ancak politikayı **çağıran bir
üretim kodu yok**: giriş akışı (`src/server/auth/credentials.ts`) Backend'in
mülkiyetindedir ve Güvenlik ajanı orayı düzenleyemez (§10.1). Dolayısıyla
§8.4'ün "log" yarısı çalışıyor (`LoginAttempt` yazılıyor), **"kilit" yarısı
henüz devrede değil.**

Bu bir gerileme değil, tamamlanmamış bir bağlantıdır: kilit daha önce de hiç
uygulanmıyordu. T-014 eksik parçayı üretti ve yerine takılmasını bekliyor.

**Gereken değişiklik (Backend, iki kalem):**

1. `AuthClient.user.update` girdi tipi `lockedUntil?: Date` kabul edecek şekilde
   genişletilir — bugün yalnızca `lastLoginAt`, `passwordHash`, `totpBackupCodes`
   yazılabiliyor, yani kilit tip düzeyinde yazılamaz durumda.
2. `authenticateUser` içindeki `fail()` yardımcısı, `recordLoginAttempt`
   çağrısından **sonra** `applyLockoutPolicy` çağırır:

```ts
import { applyLockoutPolicy } from '@/lib/security/rate-limit';

const fail = async (reason: AuthFailureReason): Promise<AuthenticateResult> => {
  await recordLoginAttempt({ ip: input.ip, emailHash, success: false }, client);

  // SIRA ÖNEMLİ: tetikleyen denemenin kendisi sayıma girmeli.
  await applyLockoutPolicy(
    { ip: input.ip, emailHash, userId: user?.id ?? null },
    { countRecentFailures: (f, since) => countRecentFailures(f, since, client), client },
    now,
  );

  return { ok: false, reason };
};
```

`applyLockoutPolicy` **asla fırlatmaz**; giriş akışının hata yolunu
değiştirmez. Kilit yazılamazsa `applied: false` döner ve loga yazar.

Kilidin **okunması** zaten hazır: `credentials.ts` `lockedUntil > now` ise
`ACCOUNT_LOCKED` dönüyor (T-013b). Bağlanması gereken tek şey yazma tarafı.

---

## NOT — `next build` sırasındaki Edge Runtime uyarısı (yanlış pozitif, doğrulandı)

T-014'ten itibaren her temiz derlemede şu uyarı çıkıyor:

```
A Node.js API is used (DecompressionStream at line: 26) which is not supported
in the Edge Runtime.
  jose/dist/webapi/lib/deflate.js → jwe_decrypt.js → @auth/core/jwt.js
  → next-auth/jwt.js → ./src/lib/security/session.ts
```

**Derlemeyi DÜŞÜRMEZ ve çalışma zamanında sorun çıkarmaz.** Bunu varsaymadık,
ölçtük — `pnpm start` altında gerçek isteklerle:

| İstek | Sonuç |
| ----- | ----- |
| `/panel` (oturumsuz) | `307 → /giris?callbackUrl=%2Fpanel` |
| `/panel` (uydurma JWE çerezi) | `307` — çözme yolu koştu, güvenli başarısız oldu |
| `/api/v1/panel/x` | `401` |
| `/giris`, `/api/auth/csrf`, `/api/v1/health`, `/` | `200` |
| Sunucu logunda `DecompressionStream`/`TypeError` | **0** |

**Neden yanlış pozitif:** `DecompressionStream` yalnızca JWE başlığında `zip`
alanı bulunan **sıkıştırılmış** jetonlarda çağrılır. Auth.js sıkıştırılmış jeton
üretmez, ayrıca sıkıştırma açma adımına **ancak çözme başarılı olduktan sonra**
gelinir — yani anahtarı bilmeyen biri o kod yoluna hiç ulaşamaz. Next'in
paketleyicisi çağrıyı statik olarak görüyor, çalışma zamanı ona hiç girmiyor.

Uyarıyı susturmak için `session.ts`'i elle `jose` çağrılarıyla yeniden yazmak
mümkündü; **yapılmadı** — kendi kriptografi kodumuzu yazmak, kozmetik bir
derleme uyarısından çok daha büyük bir risktir.

---

## BULGU-006 — `prisma/seed.ts` CI kapısını düşürüyor

> ## ❌ YANLIŞ POZİTİF — 2026-08-10, geri çekildi
>
> **Böyle bir sorun yok ve hiç olmadı.** Ölçüm bayat bir çalışma ağacı
> üzerinde yapılmıştı: Backend `console.log` çağrılarını kendi turunda
> `process.stdout.write` ile değiştirmişti (T-012/K6), ama ölçüm o
> değişiklikten önceki dosya içeriğiyle yapıldı.
>
> T-016'da tekrar ölçüldü: `pnpm lint` → **EXIT 0**, `prisma/seed.ts` kaynaklı
> uyarı **0**.
>
> **Bedeli:** Backend'e var olmayan bir iş için görev açılabilirdi. Bu, bulgu
> türleri içinde en pahalı olanı — gerçek bir ajanın gerçek zamanını harcatır
> ve raporun güvenilirliğini düşürür.
>
> **Kural hâline geldi (ADR-023 / madde 4):** başka bir ajanın alanındaki bir
> kusur raporlanmadan önce ölçüm, o anki dosya içeriğiyle **tekrarlanır**.
> Bu bulgu o kuralın doğduğu olaydır.
>
> Aşağıdaki özgün metin, kaydın dürüstlüğü için silinmeden bırakıldı.

---

### (Geri çekilen özgün bulgu metni)

**Önem:** Düşük (güvenlik açığı değil — §10.6 kapısı)
**PROGRAM.md maddesi:** §10.6
**Dosya:** `prisma/seed.ts` (henüz commit edilmemiş, T-012)
**Sorumlu ajan:** **Backend**

**Ne oluyor:**
Çalışma ağacındaki `prisma/seed.ts` **22 adet `no-console` uyarısı** üretiyor.
`pnpm lint` `--max-warnings=0` ile koştuğu için çıkış kodu **1**; yani bu dosya
commit edildiğinde CI'ın `kapi` işi ilk adımda kırmızıya döner.

Ölçüldü (T-014, Node 22):

| Kapsam | Sonuç |
| ------ | ----- |
| Depo geneli | ❌ EXIT 1 — 22 uyarı, hepsi `prisma/seed.ts` |
| `prisma/seed.ts` hariç | ✅ EXIT 0 |
| T-014'ün kendi dosyaları | ✅ EXIT 0 |

**Önerilen çözüm:** Seed betiği kullanıcıya ilerleme yazdırmak zorunda; doğru
çözüm `console.log`'ları kaldırmak değil, dosyaya sınırlı bir ESLint istisnası
tanımlamak. `eslint.config.mjs` **ortak dosyadır** — değişiklik Orkestra Şefi
onayı gerektirir. Alternatif olarak seed betiği çıktı için `console.info`
yerine `process.stdout.write` kullanabilir; bu, ortak dosyaya hiç dokunmadan
çözer ve tercih edilen yol budur.

---

## BULGU-007 — `db.$disconnect()` `pg` havuzunu kapatmıyor; kısa ömürlü her betik 30 sn asılı kalıyor

**Önem:** Orta (işletim/dağıtım — güvenlik açığı değil)
**PROGRAM.md maddesi:** §13.5 (gece cron'ları), §8.21 (yedekleme)
**Dosya:** `src/server/db.ts`
**Sorumlu ajan:** **Backend**

**Ne oluyor:**
T-016'da E2E veritabanı yardımcısı yazılırken ölçüldü: `await db.$disconnect()`
çağrıldıktan sonra bile Node süreci **tam 30 saniye** daha yaşıyor ve ancak
sonra çıkıyor.

| Ölçüm | Süre |
| ----- | ---- |
| `db-task.ts admin` (yalnız `$disconnect()` ile) | **30.28 sn** |
| Aynı iş, sonunda `process.exit(0)` ile | **0.48 sn** |

Üç ayrı komutta da sonuç 30.2–30.3 sn — tesadüf değil.

**Kök neden:** Prisma 7 sürücü adaptörü (ADR-005) kullanıldığında alttaki `pg`
havuzunu Prisma değil, `src/server/db.ts` içindeki `getPool()` oluşturuyor.
`$disconnect()` Prisma'nın kendi kaynaklarını bırakıyor ama **bu havuzu
kapatmıyor**; havuz `idleTimeoutMillis: 30_000` boyunca olay döngüsünü ayakta
tutuyor. Süre birebir o ayara eşit.

**Neden önemli:**
Uygulama sunucusu uzun ömürlü olduğu için üretimde görünmüyor. Ama §13.5'teki
**gece cron'ları kısa ömürlüdür**: `pg_dump` yedeği (§8.21), `LoginAttempt`
90 gün temizliği (ADR-013), `AuditLog` temizliği. Her biri işini bitirdikten
sonra 30 sn boşuna çalışacak. Tek başına küçük; ama cron'lar zamanlanmış
işlerdir ve "bitti sanılıp bitmemiş" süreçler, üst üste binen koşumlara ve
yanlış zaman aşımı alarmlarına yol açar. `pnpm db:seed` de aynı gecikmeyi
yaşıyor olmalı.

**Önerilen çözüm:** `src/server/db.ts` havuzu dışa açan bir kapatıcı ihraç
etsin — örneğin `export async function closeDatabase() { await getPool().end(); }`
— ve `$disconnect()` ile birlikte çağrılsın. Cron betikleri ve seed onu
kullanır.

**T-016'daki geçici çözüm:** `tests/e2e/_helpers/db-task.ts` işini bitirince
`process.exit(0)` çağırıyor. Kısa ömürlü bir CLI için doğru davranış, ama
cron betikleri için kalıcı çözüm yukarıdaki olmalı.

---

## BULGU-008 — §8.1 kapısı jetonda `tfa` alanı olmadan tam kapanmıyor

> ## ✅ KAPANDI — 2026-08-11 (T-013e bağladı, T-019b pencereyi kapattı)
>
> Backend alanı iki yolda birden yazdı: girişte `applyLoginClaims`, kurulum
> sonrası `refreshTwoFactorClaim`. Jetonun nihai şekli
> `{ sub, email, name, tfa, iat, exp, jti }` (`jti` Auth.js'in kendi alanı).
>
> **Bağımsız doğrulandı (T-019b):**
>
> | Kontrol | Sonuç |
> | ------- | ----- |
> | `applyLoginClaims` alanı yazıyor mu | ✅ `token[TWO_FACTOR_CLAIM] = user.tfa` |
> | Tazeleme değeri **veritabanından** mı okuyor | ✅ enjekte edilen okuyucu; `update()` gövdesi dikkate alınmıyor |
> | `TWO_FACTOR_CLAIM` sabiti tüketiliyor mu (dize elle yazılmamış) | ✅ `credentials.ts:2` |
> | `src/lib/security/two-factor.ts` değişmiş mi | ✅ değişmemiş — md5 `3079189a97571083f7af0cd4021fb82e` |
>
> Tazelemenin değeri istemciden değil DB'den okuması kritikti: `update()`
> çağrısına gövde iliştirilebiliyor ve o gövde istemcinin denetiminde. Oradan
> okunsaydı kullanıcı `{ tfa: true }` göndererek kendi kapısını açardı.
>
> **T-019b'de geçiş penceresi kapatıldı:** `requiresTwoFactorSetup` artık
> yalnızca `tfa === true` olduğunda geçiriyor; alan yoksa (`null`) da kuruluma
> yönlendiriyor. Gerekçe: kontrolün, beslendiği verinin yokluğunda AÇILMASI
> değil KAPANMASI gerekir.

**Önem:** Orta (kapandı)
**PROGRAM.md maddesi:** §8.1
**Etkilenen alan:** Giriş akışı — JWT üretimi
**Sorumlu ajan:** **Backend** (`src/server/auth.ts` — Güvenlik ajanının yazma izni yok)
**Durum:** AÇIK · **Talep:** T-019 raporu / T1

**Ne oluyor:**
T-019 §8.1'in kapısını `src/middleware.ts` içinde kurdu: `tfa === false` olan bir
oturum panelin hiçbir bölümüne giremez, kurulum ekranına yönlendirilir. Kapı
birim ve E2E testleriyle iki yönde de doğrulandı.

Ancak `tfa` alanını jetona **giriş akışı henüz koymuyor**. T-013b'nin yayınladığı
JWT şekli `{ sub, email, name, iat, exp }` ve `jwt` geri çağrısı yalnızca bu üç
alanı yazıyor. Alan gelene kadar gerçek girişten doğan jetonlar `tfa` taşımıyor
ve kapı **fiilen tetiklenmiyor**.

**Neden `null` şu an geçiriliyor (geçiş penceresi):**
`tfa` yokluğunu "kurulu değil" saysaydık, 2FA'sı **zaten kurulu** olan bir
kullanıcı da kurulum ekranına kilitlenirdi — jetonu alanı hiçbir zaman
kazanmayacağı için kalıcı olarak. Bu bir atlatma yolu **değildir**: alanı
taşımayan bir jeton yalnızca `AUTH_SECRET`'i bilen tarafça, yani bizim
tarafımızdan üretilebilir. Saldırgan alanı "düşürerek" kontrolü atlayamaz,
çünkü jetonu hiç üretemez. Pencere en fazla oturum ömrü kadardır (§8.3 — 7 gün).

**Gereken değişiklik (Backend, iki küçük kalem):**

1. `authorize` dönen nesneye 2FA durumu eklensin (`authenticateUser` sonucu
   `User.totpConfirmedAt`'i zaten okuyor):

```ts
return { id: result.user.id, email: result.user.email, name: result.user.name,
         tfa: result.user.twoFactorEnabled };
```

2. `jwt` geri çağrısı alanı jetona taşısın:

```ts
jwt({ token, user }) {
  if (user) {
    token.sub = user.id;
    token.email = user.email ?? undefined;
    token.name = user.name ?? undefined;
    token.tfa = user.tfa;          // ← §8.1 kapısının okuduğu alan
  }
  return token;
}
```

**§8.20 değerlendirmesi:** `tfa` **hassas değildir** — yalnızca "bu hesapta 2FA
kurulu mu" bilgisini taşır ve zaten oturumu elinde tutan tarafa görünür. Secret,
kurtarma kodu veya sayıları JWT'ye girmez.

**Kurulum tamamlandıktan sonra tazeleme (aynı talebin ikinci yarısı):**
Jeton girişte üretiliyor ve 7 gün yaşıyor. Kullanıcı 2FA kurulumunu
tamamladığında jetonu hâlâ `tfa: false` der ve kurulum ekranından çıkamaz.
Çözüm: `confirmTotpSetup` başarılı olduğunda istemci `useSession().update()`
çağırsın ve `jwt` geri çağrısı `trigger === 'update'` dalında alanı tazelesin.
Bu yapılmazsa kullanıcı çıkıp yeniden girerek de kurtulur (yeni giriş yeni jeton
üretir) — kilitlenme yok, ama akış kötü.

**Kapatıldığında yapılacak (Güvenlik):** `src/lib/security/two-factor.ts` →
`requiresTwoFactorSetup` içindeki `null` dalı kaldırılacak, `null` "kurulu değil"
sayılacak; `tests/unit/two-factor.test.ts` ve `middleware.test.ts` içindeki
"geçiş penceresi" beklentileri **tersine çevrilecek**.

---

## BULGU-009 — Auth E2E CI'da hiç koşmuyordu; kilitler merge kapısında tutmuyordu

> ## ✅ KAPANDI — 2026-08-11 (T-005b)

**Önem:** Yüksek
**PROGRAM.md maddesi:** §9, §10.6
**Dosya:** `.github/workflows/ci.yml`
**Sorumlu ajan:** Güvenlik & Test (kendi dosyam)

**Ne oluyordu:**
`tests/e2e/auth.spec.ts` veritabanı yoksa kendini atlıyor (T-016'da bilinçli
tasarım — DB gerektirmeyen paketler CI'da koşabilsin diye). CI'da Postgres
servisi yoktu, dolayısıyla paket **hiç koşmuyordu**. F1 PR'ının (#2) çıktısı:

```
34 passed
19 skipped        ← auth paketinin tamamı
```

Koşum **yeşildi**. Yani şunların hiçbiri merge kapısında tutmuyordu:
- Dört `code` regresyon kilidi (`INVALID_CREDENTIALS`, `TOTP_REQUIRED`,
  `ACCOUNT_LOCKED`, `INVALID_TOTP`) — T-016'nın varlık sebebi
- §8.1 zorunlu 2FA kurulumu kapısı — T-019/T-019b
- §8.4 hesap kilidi uçtan uca doğrulaması

**Neden bu kadar önemli:** Bu kilitlerin tamamı, "biri şu satırı değiştirirse
sessizce bozulur" sınıfı sorunlar için yazılmıştı. Yalnızca geliştirici
makinesinde koşan bir kilit, tam da korumak istediği anda — başkasının açtığı
bir PR'da — yok demektir. **Yerel bir kilit, kilit değildir.**

**Uygulanan çözüm:**
1. `kapi` işine **Postgres 16 servisi** eklendi (sağlık kontrolüyle).
2. `prisma migrate deploy` + `pnpm db:seed` adımları eklendi.
3. Kimlik değerleri **CI-yerel ve atılabilir**; gerçek `DATABASE_URL` secret'ı
   kullanılmadı (ADR-009, BULGU-002).
4. **"Atlanan test yok" nöbeti** eklendi — aşağıya bakın.

**Nöbetçi adım neden gerekli:** Playwright atlanan testler için sıfır olmayan
çıkış kodu **vermez**. Veritabanı bir gün sessizce erişilemez hâle gelirse
paket yine kendini atlar ve koşum yine yeşil olur — yani bu bulgunun aynısı
geri gelir, üstelik kimse fark etmeden. Yeni adım JSON raporundaki `skipped`
sayısını okuyup sıfır değilse işi düşürüyor. **Bulgunun kendisini kapatmak
yetmez; geri gelme yolunu da kapatmak gerekir.**

**`DATABASE_URL` bilerek iş düzeyinde DEĞİL:** yalnızca migrate/seed/e2e
adımlarına veriliyor. Böylece "üretim derlemesi" adımı `DATABASE_URL` olmadan
koşmaya devam ediyor ve **BULGU-002'nin canlı gerileme nöbeti** olarak kalıyor:
biri derlemeyi yeniden veritabanına bağımlı yaparsa CI kırmızı olur.

**Kapının tuttuğu MERGE KAPISINDA ölçüldü** — geçici bir dal ve PR ile:

| Koşum | Ne ölçüldü | Sonuç |
| ----- | ---------- | ----- |
| `31493832776` | Auth paketi CI'da koşuyor mu | ✅ `geçen=53 atlanan=0` |
| `31494544593` | (1. deneme — geçersiz) | 🔴 ama kırmızıyı **lint** verdi |
| `31494718996` | `extends CredentialsSignin` bozuk | 🔴 **kırmızıyı E2E verdi** |

**İlk denemenin neden geçersiz sayıldığı:** `extends CredentialsSignin`
kaldırılınca import kullanılmaz hâle geldi ve iş `lint` adımında düştü — yani
ölçmek istediğim şey ölçülmedi. İkinci denemede T-013b'nin anlattığı **gerçek**
hata kuruldu (sınıf `Error`'ı genişletiyor, `name` elle atanıyor). O hâlde
`lint`, `typecheck`, birim testleri ve `build` **hepsi yeşil** geçti; kırmızıyı
yalnızca E2E verdi. T-016'nın "bu gerileme yalnızca E2E ile yakalanır" iddiası
böylece merge kapısında doğrulanmış oldu.

Kanıt dalı ve PR #3 ölçüm sonrası kapatılıp silindi; `src/server/auth.ts`
birebir geri yüklendi (md5 `bc7661e532fb8a81fbce20048020dfcd`).

### Bilinen sınırlılık — §8.18 derleme çıktısı taraması hâlâ kısmen boşta

Sunucu tarafı sırların pakete sızıp sızmadığını arayan katman, yalnızca
**derleme sırasında tanımlı olan** değişkenlerin değerlerini arayabiliyor.
`AUTH_SECRET` ve `TOTP_ENCRYPTION_KEY` artık iş düzeyinde tanımlı olduğu için
derleme onları görüyor ve tarama onlar açısından anlamlı. Ancak `DATABASE_URL`
bilerek derleme adımında tanımsız (yukarıdaki BULGU-002 nöbeti), dolayısıyla
o değer için tarama boşta çalışıyor. İki gereksinim burada birbiriyle çelişiyor
ve BULGU-002 nöbeti daha değerli görüldü. F6/T-062 denetiminde yeniden
değerlendirilmeli.

**T-005d eki:** derleme adımına `NEXT_PUBLIC_SITE_URL` girdi. Bu tabloyu
değiştirmiyor — değer tanımı gereği **kamuya açık** (`NEXT_PUBLIC_` öneki
"tarayıcı paketine gömülür" demek) ve aynı testin ad/değer desenlerinden
geçiyor: `https://ci-test-only.ornek.test` ne sır ima eden bir ad taşıyor ne de
bir sır imzasına uyuyor (`public-env.test.ts` → "meşru public değerleri yanlış
pozitif vermez" bloğu aynı biçimdeki URL'leri zaten kapsıyor). Derleme
çıktısında bu değerin **bulunması beklenir**; tarama sır arıyor, adres değil.

---

## BULGU-010 — WebGL yolu ölçüm dışındaydı; profil hazır, ölçülecek sayfa henüz yok

**Önem:** Orta (kalite kapısı — güvenlik açığı değil)
**PROGRAM.md maddesi:** §5.2.2, §5.2.5, §9
**Sorumlu:** Güvenlik & Test (profil) · **Frontend** (sayfaya bağlama)
**Durum:** Profil ✅ kuruldu · Ölçüm ⏳ T-021 bekliyor

**Ne oluyordu (T-020b/ENGEL-1):**
Lighthouse'un iki profili de **mobil** emülasyonda koşuyordu (412×823). Aurora
— tek WebGL bileşenimiz — dört koşulun hepsi sağlanmadan yüklenmiyor
(`src/components/reactbits/lazy.tsx`): masaüstü (`min-width: 768px`),
`prefers-reduced-motion` yok, koyu tema, hidrasyon. Mobil emülasyonda birincisi
sağlanmadığı için `ogl` parçası **hiçbir CI koşusunda ağdan istenmedi**. Yani
§5.2'nin en pahalı dalı denetim dışındaydı.

**Yapılan:** Üçüncü profil eklendi — `preset=desktop` + `ae-theme=dark` cookie.
Emülasyonun doğru kurulduğu ölçüldü: `1350x940`, `mobile=false`,
`formFactor: desktop`, `extraHeaders` raporda görünüyor.

**Ama WebGL yine yüklenmedi — ve sebebi profil değil:**
Ölçülen sayfa `/`, Aurora'yı **mount etmiyor**. Aurora şu an yalnızca
`src/components/reactbits/galeri.tsx` içinde kullanılıyor; o da React Bits
galerisi sayfasında (`/react-bits`) ve T-021 o geçici sayfayı kaldırıp gerçek
ana sayfayı yazıyor. §5.1'e göre hero arka planı Aurora olacak.

Doğrulandı: masaüstü ve mobil profilleri **birebir aynı** JS parçalarını istedi;
Aurora'nın parçası (`369.*.js`, shader dizesi `uColorStops` ile bulundu)
ikisinde de yok.

**Kontrol ÜÇ DURUMLU ve kendi kendine sona eriyor:**

| Durum | Davranış |
| ----- | -------- |
| Aurora parçası derlemede yok | 🔴 hata — bileşen kaldırılmış, adım güncellenmeli |
| Parça var, sayfa Aurora mount ETMİYOR | ⏳ beklemede — gürültülü uyarı, iş yeşil |
| Sayfa Aurora mount EDİYOR | 🔴 masaüstü yüklemediyse hata · 🔴 mobil yüklediyse §5.2.5 ihlali |

Ayırt edici mekanik: `lazy.tsx` sarmalayıcısı `aurora-katman` sınıfını WebGL
yüklensin ya da yüklenmesin **her zaman** basıyor; CI sunucudan gelen HTML'de
bu sınıfı arıyor. **Elle çevrilecek bir bayrak yok** — T-021 hero'yu bağladığı
anda kontrol kendiliğinden zorunlu hâle geliyor. Bekleme hâlini "yeşil ve
sessiz" bırakmak, T-019b/K3'teki vakum tuzağının aynısı olurdu; bu yüzden log
gürültülü.

**§5.2.5 bugün bile ölçülüyor:** "mobilde WebGL hiç yüklenmez" kuralı her
koşumda doğrulanıyor ve geçiyor.

---

## Ölçüm — Lighthouse profilleri (CI `31579671925`, 5 koşu/profil, medyan)

| Profil | Ekran | Cookie | Perf | A11y | BP | SEO |
| ------ | ----- | ------ | ---- | ---- | -- | --- |
| `mobil-aydinlik` | 412×823 | — | 91 | **100** | **100** | 60 ¹ |
| `mobil-koyu` | 412×823 | `ae-theme=dark` | 91 | **100** | **100** | 60 ¹ |
| `masaustu-koyu` | 1350×940 | `ae-theme=dark` | **100** | **100** | **100** | 60 ¹ |

¹ SEO 60 bilinen ve beklenen: ölçülen sayfa `robots: { index: false }` taşıyan
geçici doğrulama sayfası. T-021 gerçek ana sayfayı yazınca düzelir (T-006b/E3).

### Koşu değişkenliği — T-006b'deki notun cevabı

T-006b'de aydınlık profil `69 / 90 / 94` ölçmüş, medyan 90 ile eşiği kıl payı
geçmişti ve "T-029'da `error`'a çevrilince bu değişkenlik hattı kırmızıya
çevirebilir" diye not düşmüştüm. Bu görevde 5 koşuya çıkarıldı ve **desen
netleşti**:

| Profil | Ham değerler | Yayılım |
| ------ | ------------ | ------- |
| `mobil-aydinlik` | `59, 91, 91, 90, 91` | **32** |
| `mobil-koyu` | `91, 91, 91, 91, 90` | 1 |
| `masaustu-koyu` | `100, 100, 100, 100, 100` | 0 |

**Bulgu: değişkenlik genel değil, İLK KOŞUYA ait.** Aykırı değer (59) işin ilk
Lighthouse koşusunda çıktı; aynı işte sonradan koşan iki profil neredeyse hiç
oynamadı (yayılım 1 ve 0). T-006b'deki 69 da ilk koşuydu. Yani sebep "CI
gürültülü" değil, **ölçüm ısınmadan başlıyor** — sunucunun ilk isteği,
koşucunun disk önbelleği ve JIT hepsi ilk koşuya yükleniyor.

**Kararlar:**

1. **`numberOfRuns: 3 → 5`.** 3 koşuda medyanı devirmek için iki talihsiz koşu
   yeter; 5'te üç gerekir. Ölçülen aykırı değerler (59, 69) eşiğin çok altında
   olduğu için bu fark, eşikler `error` olduğunda kırmızı ile yeşil arasındaki
   fark demek.
2. **`aggregationMethod: "median"` AÇIKÇA yazıldı.** Varsayılan zaten medyan,
   ama örtük bir varsayılana güvenmek kapıyı kütüphane sürümüne bağlar — T-013a'da
   otplib'de tam bu sınıf hata çıkmıştı.
3. **`optimistic` REDDEDİLDİ.** En iyi koşuyu almak aykırı değeri gizler, ama
   gerçek gerilemeleri de gizler. Gürültüyü susturmak için doğruyu feda etmek olurdu.
4. **T-029'a öneri:** eşikler `error`'a çevrilmeden önce **ısınma isteği**
   eklensin (ölçümden önce sayfaya bir kez gidilip atılan bir koşu). Kök nedeni
   çözen budur; 5 koşu semptomu absorbe ediyor. Bu görevde eklenmedi çünkü
   LHCI'da yerleşik karşılığı yok ve `startServerCommand`'a ısınma eklemek
   yapılandırmayı bulanıklaştırırdı — kararı T-029 versin.

---

## BULGU-011 — Ölçüm sunucusu kararsızdı: `next start` + `output: standalone`

> ## ✅ KAPANDI — 2026-08-14 (T-029b)

**Önem:** Orta (ölçüm altyapısı — güvenlik açığı değil)
**PROGRAM.md maddesi:** §9, §13.1
**Dosya:** `tests/olcum-sunucusu.mjs` (yeni), `lighthouserc.json`, `playwright.config.ts`
**Sorumlu:** Güvenlik & Test

**Ne oluyordu:** Frontend'in ölçüm turunda sunucu beş kez düştü ve bir Lighthouse
turu `CHROME_INTERSTITIAL_ERROR` ile boşa gitti (T-029/ENGEL-4). Paralel ajan yoktu.

**Teşhis — tahmin değil, ölçüm:**

Önce sentetik yük denendi (30 eşzamanlı istek): sunucu **hiç düşmedi**. Yani
"yük altında çöküyor" hipotezi yanlıştı. Sonra GERÇEK iş yükü koşuldu — Lighthouse:

| Sunucu | Gerçek Lighthouse iş yükü |
| ------ | ------------------------- |
| `next start` (output: standalone) | **4. koşuda `CHROME_INTERSTITIAL_ERROR`** |
| `node .next/standalone/server.js` | 2 tur × 5 koşu = **10/10 temiz** |
| Aynısı, 5 tur daha | **25/25 temiz** |

Next zaten HER derlemede uyarıyordu: *"`next start` does not work with
`output: standalone`. Use `node .next/standalone/server.js` instead."* T-004/T5'ten
beri not düşülen bu uyarı, düşmelerin sebebiydi.

**Çözüm:** `tests/olcum-sunucusu.mjs` — standalone sunucuyu çalıştırır ve
`next build`'in **taşımadığı** `static/` ile `public/` dizinlerini kopyalar.
Kopyalama unutulsaydı sunucu ayağa kalkar ama sayfa **stilsiz** açılır ve
Lighthouse hata vermeden anlamsız düşük skorlar üretirdi.

Hem Lighthouse hem Playwright **aynı sunucuyu** kullanıyor: ölçüm ve E2E'nin
farklı sunucu davranışları üzerinde koşması, birinde görünmeyen bir sorunun
ötekinde çıkmasına yol açardı. Ayrıca §13.1 gereği üretimde çalışacak olan da
standalone; artık test ettiğimiz şey sevk ettiğimiz şey.

### Yan bulgu — `HOSTNAME` yönlendirmeleri mutlaklaştırıyor

Standalone'a geçince `auth.spec.ts` düştü. Sebep ölçüldü:

| `HOSTNAME` | Ara katman yönlendirmesi (`/panel`, oturumsuz) |
| ---------- | ---------------------------------------------- |
| `127.0.0.1` | `http://localhost:3100/giris?...` — **MUTLAK** |
| `localhost` | `/giris?...` — göreli (ama yalnız `[::1]` dinler) |
| ayarsız (`0.0.0.0`) | `/giris?...` — göreli, her iki geri döngü de erişilebilir |

Belirli bir geri döngü adresi verildiğinde Next, göreli yönlendirmeyi mutlak
hâle getirip **`localhost`** yazıyor — istek `127.0.0.1`'e gelmiş olsa bile.
Tarayıcı o anda köken değiştiriyor, oturum çerezi gönderilmiyor ve kullanıcı
çıkış yapmış görünüyor.

`localhost`'a geçmek yönlendirmeyi düzeltti ama yalnız IPv6 geri döngüsünü
dinlediği için `127.0.0.1` istemcileri koptu — ve T-016'nın ölçerek doğruladığı
`__Secure-` çerez davranışı `127.0.0.1` kökenine bağlı. Bu yüzden `HOSTNAME`
hiç ayarlanmıyor: hem yönlendirme göreli kalıyor hem iki köken de çalışıyor.

**⚠️ Dağıtım için not (T-070/T-072):** Bu davranış üretimde de geçerli. Coolify
arkasında `HOSTNAME` belirli bir adrese sabitlenirse ara katman yönlendirmeleri
`localhost`'a mutlaklaşabilir ve giriş akışı kırılır. Dağıtım görevinde ters
vekil arkasında yönlendirmelerin göreli kaldığı **ölçülmeli**.

### Yan kazanç — T-029a'daki koşu değişkenliği ORTADAN KALKTI

T-029a'da "aykırı değer ilk koşuda çıkıyor, sunucu ısınmadan ölçüm başlıyor"
teşhisini koymuş ve T-029 için **ısınma isteği** önermiştim. O teşhis eksikmiş:
asıl sebep sunucunun kendisiydi.

| Ölçüm | Ham performans değerleri | Yayılım |
| ----- | ------------------------ | ------- |
| T-006b (`next start`, 3 koşu) | `69, 90, 94` | 25 |
| T-029a (`next start`, 5 koşu) | `59, 91, 91, 90, 91` | **32** |
| T-029a (`next start`, tekrar) | `74, 91, 91, 91, 93` | 19 |
| **T-029b (standalone, 5 tur × 5 koşu)** | `91,91,91,91,91` · `90,91,91,91,91` × 4 | **≤1** |

**Isınma isteği önerisi GERİ ÇEKİLDİ** — çözülecek bir semptom kalmadı.
`numberOfRuns: 5` yine de korunuyor: ucuz ve medyanı sağlamlaştırıyor.

### BULGU-010 KAPANDI — WebGL yolu artık gerçekten ölçülüyor

T-021 hero arka planına Aurora'yı bağladı ve T-029a'nın üç durumlu kontrolü
⏳'den ✅'e döndü. Aynı mantıkla ölçüldü (Aurora shader'ını taşıyan derleme
parçası ağ isteklerinde aranır):

| Profil | `ogl` parçası indirildi mi | Kural |
| ------ | -------------------------- | ----- |
| `masaustu-koyu` (1350×940, `ae-theme=dark`) | **evet** | §5.2.2 ✅ |
| `mobil-aydinlik` (412×823) | **hayır** | §5.2.5 ✅ |

Skorlar (5 koşu, medyan):

| Profil | Perf | A11y | BP | SEO |
| ------ | ---- | ---- | -- | --- |
| `masaustu-koyu` | **100** | 100 | 100 | 100 |
| `mobil-aydinlik` | **91** | 100 | 100 | 100 |

**Ölçüm YERELDE alındı, CI'da değil** — sebebi BULGU-012: `kapi` işi "Seed"
adımında düşüyor ve `lighthouse` işi ona bağlı (`needs: kapi`), dolayısıyla hiç
koşmuyor. Doğrulama mantığı CI'dakiyle birebir aynı; BULGU-012 kapandığında
kontrol CI'da da ✅ dönmeli ve bu **ilk ortak koşuda teyit edilmeli**.

---

## BULGU-012 — F2 dalında CI, "Seed" adımında kırık (12 Ağustos'tan beri)

**Önem:** Yüksek (merge kapısı çalışmıyor)
**PROGRAM.md maddesi:** §10.6
**Dosya:** `prisma/seed.ts` → `src/server/services/_shared/index.ts` → `content-cache.ts`
**Sorumlu ajan:** **Backend**
**Durum:** AÇIK

**Ne oluyor:**
`prisma/seed.ts`, `calculateReadingMinutes` için `@/server/services/_shared`
paketini içe aktarıyor. O paketin `index.ts` barrel dosyası `./content-cache`'i
de yeniden ihraç ediyor ve `content-cache.ts` ilk satırında `next/cache`'ten
`unstable_cache` alıyor.

Seed, Next'in paketleyicisiyle değil DÜZ NODE ile koşuyor (`prisma/seed-resolver.mjs`).
Düz Node `next/cache`'i çözemiyor:

```
ERR_MODULE_NOT_FOUND
url: '.../node_modules/next/cache'
```

**Etkisi:** `kapi` işi seed adımında düşüyor → `E2E` hiç koşmuyor → `lighthouse`
işi (`needs: kapi`) hiç koşmuyor. Yani **F2 dalında merge kapısının tamamı
ölçüm yapmıyor.**

**Ne zamandır:** Commit `d316885` (12 Ağustos). F2 dalının kendi CI koşumu
(`31593417565`, 12 Ağustos) da **aynı adımda** düşmüş — yani iki gündür kırık
ve fark edilmemiş. T-005b'nin kurduğu "atlanan test yok" nöbeti bu durumu
yakalayamıyor çünkü iş zaten daha önce düşüyor.

**Önerilen çözüm:** Seed'in ihtiyacı olan yalnızca `calculateReadingMinutes`.
Barrel yerine doğrudan modülden alınırsa `next/cache` zinciri hiç yüklenmez:

```ts
// prisma/seed.ts
import { calculateReadingMinutes } from '@/server/services/_shared/reading-time';
```

Barrel dosyalarının yan etkisi tam olarak budur: tek bir yardımcı için tüm
paketi (ve onun çalışma zamanı bağımlılıklarını) yüklemek. Aynı tuzak `db:seed`
dışında ileride yazılacak her cron betiğini de vurur (§13.5).

---

### Yan kazanç — SEO 60 → 100

T-006b'den beri "ölçülen sayfa `robots: { index: false }` taşıyan geçici
doğrulama sayfası" diye not düşülen SEO 60, T-021'in gerçek ana sayfasıyla
birlikte **100** oldu. Beklenen düzelme gerçekleşti.

---

## ADVISORY-001 — `nanoid` <3.3.18 (GHSA-2v37-7h3g-55p8, Yüksek, geçişli)

**Tarih:** 2026-08-14 · **Görev:** T-005c · **Durum:** KAPANDI (override)
**Bulan:** §8.24 kapısı — kodda değişiklik yokken kırmızıya döndü.

Bu bir bulgu değil, **dış veri kaynağı kaynaklı bir kapı tetiklenmesi**. T-005b/K6
denetimi ayrı bir iş olarak tasarlarken tam bu senaryoyu öngörmüştü: `kapi` yeşil
kaldı, yalnızca `bagimlilik-denetimi` kırmızıya döndü.

### Maruziyet — ölçüldü, varsayılmadı

Advisory'nin gerektirdiği koşul: nanoid'in **özel üretici** (custom generator) ile
`size = 0` çağrılması. Zincirdeki tek çağrı yeri:

```js
// postcss/lib/input.js
let { nanoid } = require('nanoid/non-secure')
this.id = '<input css ' + nanoid(6) + '>'
```

Varsayılan üretici, **sabit ve sıfır olmayan** boyut. Özel üretici yok. Bizim
kodumuz nanoid'i hiç çağırmıyor (`src/`, `tests/`, `prisma/` tarandı: 0 eşleşme).
**Pratik maruziyet: yok.** Buna rağmen override uygulandı — §8.24 sert bir kapı ve
"bu açık bizi etkilemiyor" gerekçesiyle kapıyı gevşetmek, bir sonraki sefer gerçek
bir açığı da elemek demektir. Bedeli olmayan bir düzeltme varken kapı tartışılmaz.

### Uygulanan çözüm

```json
"pnpm": {
  "overrides": {
    "postcss": ">=8.5.23",
    "sharp": ">=0.35.0",
    "nanoid": ">=3.3.18 <4.0.0"
  }
}
```

Yalnızca kilit dosyası değişti: `nanoid@3.3.17` → `3.3.18` (9 yolun hepsinde tek
sürüm). `postcss` 8.5.25 ve `sharp` override'ları **olduğu gibi duruyor**.

### ÜST SINIR NEDEN VAR — ölçülmüş tuzak

İlk deneme, mevcut override'ların kalıbına uyarak `">=3.3.18"` yazmaktı. Sonuç:

```
pnpm why nanoid  →  nanoid 6.0.1
```

Açık uçlu aralık en son majörü çekti — **üç majör atlama**. nanoid 4+ ESM-only:

| | `main` | `exports["./non-secure"]` |
| - | ------ | ------------------------- |
| 3.3.18 | `index.cjs` | `require` + `import` koşulları var |
| 6.0.1 | yok (`"type": "module"`) | yalnızca `default` (ESM) |

postcss ise `require('nanoid/non-secure')` yapıyor. Yerelde (Node 22.23) yine de
çalıştı — çünkü Node 22.12'den beri `require(ESM)` varsayılan olarak açık. Ama
`engines.node` alt sınırımız **`>=22.11.0`** ve o yetenek 22.11'de **yok**. Yani
denetim yeşil, testler yeşil, ama beyan ettiğimiz asgari Node'da postcss zinciri
kırılırdı — **sessiz, ölçüm dışı bir kırılma**. 22.11 yerelde koşturulup
doğrulanmadı; `engines` beyanı ile Node'un yayın notları arasındaki uyuşmazlık
tek başına üst sınırı gerekçelendirdiği için orada durduruldu.

**Ders:** override bir sürüm *tabanı* değil, bir *aralık* belirtir. Geçişli bir
paketi majör sınırının ötesine taşımak, o paketi çağıran ara paketin sözleşmesini
sessizce bozabilir. Üst sınır isteğe bağlı değil.

### Kaldırma koşulu

`postcss@8.5.26` (en son) hâlâ `nanoid: "^3.3.17"` ilan ediyor. Bu aralık **zaten
3.3.18'i kapsıyor** — yani üst paket kırık değil, yalnızca kilit dosyamız eski
sürüme sabitlenmişti. Bu, oyunkitabındaki en ucuz katman (A).

**Override şu koşulda kaldırılır:** `pnpm why nanoid` çıktısındaki tüm yollar
override olmadan `>=3.3.18` çözdüğünde. Pratikte bu, `postcss` bir sonraki kez
güncellendiğinde kendiliğinden gerçekleşir. Kontrol tek komut:

```bash
# override satırı geçici olarak çıkarılır
pnpm install --lockfile-only && pnpm why nanoid | grep -oE 'nanoid [0-9.]+' | sort -u
# hepsi >=3.3.18 ise override SİLİNİR
```

**Son gözden geçirme:** 2026-08-14 · **Sonraki:** 2027-02-14 (bkz. oyunkitabı §4)

---

## ADVISORY-002 — `deepmerge-ts` <8.0.0 (GHSA-ggr8-5vv4-36mx, Yüksek, geçişli)

**Tarih:** 2026-08-22 · **Görev:** T-005d · **Durum:** AÇIK — **süreli istisna**, bitiş **2026-11-22**
**Bulan:** §8.24 kapısı · **CVE:** CVE-2026-40345 · **Katman:** **D** (bekle + kaydet)

```
deepmerge-ts  <8.0.0   "stack exhaustion when merging recursive object graphs"
mevcut 7.1.5 · yama >=8.0.0 · 3 yol, hepsi aynı zincir:
  . > prisma@7.9.1 > @prisma/config@7.9.1 > deepmerge-ts@7.1.5
  . > @prisma/client@7.9.1 > prisma@7.9.1 > …
  . > @auth/prisma-adapter@2.11.3 > @prisma/client@7.9.1 > prisma@7.9.1 > …
```

Üç yol da tek bir gerçek bağımlılığın farklı görünümleri: `prisma` CLI'ı
(`@prisma/client` onu **isteğe bağlı peer** olarak ilan ediyor).

### Maruziyet — ölçüldü, varsayılmadı

Tetikleyici koşul: **özyinelemeli (kendine referans veren) bir nesne grafiği**
birleştirilirse yığın tükenir → DoS. Yani zararın şartı, saldırganın
birleştirilen nesneyi etkileyebilmesi.

Bizim kodumuz: `grep -rn deepmerge src/ tests/ prisma/` → **0 eşleşme**.

Ara paketteki tek çağrı yeri (`@prisma/config@7.9.1/dist/index.js:588-619`):

```js
async function loadConfigTsOrJs(configRoot, configFile) {
  const { loadConfig: loadConfigWithC12 } = await import('c12');
  const { deepmerge } = await import('deepmerge-ts');
  await loadConfigWithC12({
    cwd: configRoot, name: 'prisma', configFile,
    dotenv: false, rcFile: false, giget: false, extend: false, packageJson: false,
    merger: deepmerge, …
  });
}
```

Üç ölçüm, üçü de maruziyeti düşürüyor:

1. **Girdi bizim.** Birleştirilen tek nesne `prisma.config.ts` — depodaki,
   bizim yazdığımız dosya. Dış girdi yok.
2. **Katman zaten kapalı.** c12'nin dışarıdan katman getiren tüm yolları
   kapatılmış: `extend: false`, `rcFile: false`, `giget: false`,
   `packageJson: false`, `dotenv: false`. Yani birleştirilecek ikinci bir
   kaynak fiilen yok.
3. **Çalışma zamanında değil.** `prisma.config.ts`in kendi başlığındaki not:
   *"Bu dosya YALNIZCA Prisma CLI tarafından okunur; uygulama çalışma
   zamanında kullanılmaz."* Uygulama sunucusu bu kod yolunu hiç çalıştırmıyor
   — `generate` / `migrate` / `seed` komutları çalıştırıyor.

**Pratik maruziyet: yok.** Bir saldırganın bunu tetiklemesi için önce depoya
özyinelemeli bir `prisma.config.ts` yazabilmesi gerekirdi; o noktada yığın
tüketmekten çok daha kötü şeyler yapabilir.

### Neden override DEĞİL — oyunkitabının ölçütü uygulandı

Ölçüt maruziyet değil, **majör sınırı**: yama **8.0.0**, mevcut **7.1.5**.
Majör atlıyor → oyunkitabı katman B'yi (override) açıkça yasaklıyor. Bu vaka
onu iki ölçümle daha da güçlendiriyor:

- **Üst paket sürümü TAM SABİTLİYOR.** `@prisma/config@7.9.1` →
  `"deepmerge-ts": "7.1.5"` — aralık değil, tek sürüm. ADVISORY-001'de aşılan
  şey bayat bir aralıktı (`^3.3.17`); burada aşılacak olan **açık bir
  sözleşme**. Override, üst paketin "yalnızca bu sürümle çalıştığımı beyan
  ediyorum" demesinin üstünden geçmek olurdu.
- **Majör gerçek.** 7.1.5 → 8.0.0 diffinde dört genel dışa aktarım yeniden
  adlandırılmış: `mergeRecords`/`mergeMaps`/`mergeRecordsInto`/`mergeMapsInto`
  → `…Fast`. Bizim ihtiyacımız olan `deepmerge` duruyor, yani **çökme**
  olmayabilir. Asıl risk zaten çökme değil: `deepmerge` c12'ye **birleştirme
  semantiği** olarak veriliyor. Sessizce farklı birleşen bir config, örneğin
  `datasource.url`u düşürür ve arıza "migrate yanlış veritabanına gitti"
  biçiminde, denetimin göremediği yerde çıkar.
- ADVISORY-001'in ESM tuzağı burada **yok** (8.0.0 hem `require` hem `import`
  koşulu taşıyor). Bu, override'ı güvenli yapmaz — yalnızca bu kez kırılmanın
  yükleme anında değil, davranışta olacağını söyler. Daha kötüsü.

**Karşı argüman, kayda geçsin:** maruziyet sıfır ve kırılma görünür olurdu —
`postinstall → prisma generate`, `migrate deploy` ve `db:seed` zaten her CI
koşusunda bu kod yolunu çalıştırıyor. Yani "override'ı dene, kırılırsa kapı
söyler" savunulabilir bir pozisyon. Reddedildi: kazanç **sıfır** (ölçülmüş
maruziyet yok, yalnızca denetim çıktısı yeşile döner), risk ise sessiz
mis-merge. Denetim çıktısını yeşile boyamak için üst paketin sözleşmesini
çiğnemek, kapının amacını tersine çevirir.

### Neden C (üst paketi yükselt) DEĞİL — bugün mümkün değil

| Kanal | Sürüm | `deepmerge-ts` |
| ----- | ----- | -------------- |
| `prisma@latest` | 7.9.1 | 7.1.5 (açık) |
| en son 7.x kararlı | 7.9.1 | 7.1.5 (açık) |
| `prisma@next` | 8.0.0-rc.7 | ön sürüm — kararlı değil |

Kararlı hiçbir sürüm yamayı getirmiyor. `@prisma/config@latest` = 7.9.1 ve
hâlâ `7.1.5` sabitliyor. Bir RC'ye geçmek, denetim çıktısını temizlemek için
üretim veri katmanını yayın öncesi koda taşımak olurdu — §8.25'in tersi.

Geriye **D** kalıyor: süreli istisna + kayıt.

### İstisna nasıl uygulandı — kendi son kullanma tarihini taşıyor

`pnpm.auditConfig` ile susturma bilerek **kullanılmadı**: süresizdir, bir kez
yazılır ve ölü bir satır bir gün yaşayan bir açığı maskeler (oyunkitabı §4'ün
override'lar için söylediğinin aynısı). Bunun yerine `bagimlilik-denetimi` işi
artık `pnpm audit --json` çıktısını okuyan bir betikten geçiyor
(`.github/workflows/ci.yml`). Kapı **altı** ayrı biçimde kırmızıya döner:

| # | Koşul | Neden |
| - | ----- | ----- |
| 1 | Listede olmayan yüksek/kritik advisory | Eski davranış — kapı gevşemedi |
| 2 | İstisnanın süresi doldu (`bitis`) | İstisna unutulamaz; tarih geçince kapı durur |
| 3 | İstisna artık bildirilmiyor | Ölü satır silinsin (üst paket yamayı getirmiş demektir) |
| 4 | Advisory'nin YOLU değişti | Maruziyet ölçümü `@prisma/config` yoluna dayanıyor; başka yol = başka ölçüm |
| 5 | Paket adı beklenenden farklı | Aynı GHSA'nın başka bir pakete taşınması |
| 6 | `audit` çıktısı ayrıştırılamadı | "Bulgu yok" ile "ölçüm yapılamadı" karıştırılmasın |

**Altısı da mutasyonla kanıtlandı** (T-005d raporu, K2). Gerçek çıktıyla:
`EXIT 0`, `⏳ 92 gün kaldı`.

### Kaldırma koşulu

İstisna şu üç durumdan **biri** gerçekleşince kalkar; hangisi olursa olsun
`pnpm why deepmerge-ts` ile TÜM yollar doğrulanır (oyunkitabı §3):

1. **Kararlı `prisma`/`@prisma/config` `deepmerge-ts@>=8.0.0` getirirse** →
   sürümü yükselt, istisnayı sil. Prisma 8 bizim için de majör olduğundan
   **ADR gerekir** (Prisma 7→8 kırıcı değişiklikleri; R8'in tekrarı).
2. **7.x hattına geri taşınırsa** (ör. `@prisma/config@7.10.x` → `^8`) → bu,
   oyunkitabının **en ucuz katmanı A**'dır: yalnızca `pnpm update prisma
   --recursive`, override yok, ADR yok.
3. **Advisory geri çekilirse / seviyesi düşerse** → istisna kendiliğinden ölü
   satır olur ve kapı 3. koşuldan kırmızıya döner; satır silinir.

**Hiçbiri 2026-11-22'ye kadar gerçekleşmezse** kapı durur ve süre yalnızca
**yeniden ölçülmüş** bir gerekçeyle uzatılabilir. Süre neden üç ay: `prisma@next`
şu an rc.7 — kararlı 8.0.0 bu pencerede beklenir; beklenmezse kararı yeniden
vermek gerekir, sessizce sürüklemek değil.

**Son gözden geçirme:** 2026-09-13 (T-042g) · **Sonraki:** 2026-11-22 (istisnanın bitişi)

> **T-042g kontrolü — kaldırma koşulu HÂLÂ SAĞLANMADI.** Kararlı `prisma` hattı
> 7.10.0'a çıktı ama `@prisma/config@7.10.0` `deepmerge-ts`i yine **`7.1.5`**
> diye sabitliyor (ölçüldü: `npm view @prisma/config@7.10.0 dependencies…`).
> `prisma@latest` etiketi artık **8.0.0-rc.14**'ü gösteriyor — kararlı değil,
> ADVISORY-002'nin 1. kaldırma koşulu için beklenen sürüm o hattın **kararlı**
> yayını. İstisna geçerli, kapı onu tolere etmeye devam ediyor (70 gün kaldı).

---

## ADVISORY-003 — `mysql2` <3.23.1 (GHSA-3f6p-5ww8-9rcr Yüksek + GHSA-rgwj-5xj2-c3m3 Orta)

**Tarih:** 2026-09-13 · **Görev:** T-042g · **Durum:** KAPANDI (override)
**Katman:** **B** · **Bulan:** §8.24 kapısı (kod değişmeden kırmızı)

```
mysql2 3.15.3 → 3.24.4 · 3 yol, hepsi aynı zincir:
  . > prisma@7.9.1 > mysql2@3.15.3            (+ @prisma/client ve @auth/prisma-adapter üzerinden aynı CLI)
Yüksek: kimlik doğrulama eklentisi düşürme → `mysql_clear_password` (yama >=3.22.0)
Orta:   yama >=3.23.1
```

### Maruziyet — ÖLÇÜLDÜ, varsayılmadı

"PostgreSQL kullanıyoruz" makul bir hipotezdi; katman D "maruziyet **ölçülmüş
biçimde** yok" dediği için hipotez yeterli değildi. Dört ölçüm:

| Ölçüm | Yöntem | Sonuç |
| ----- | ------ | ----- |
| Çağrı yeri | `prisma/build/cli.js` okundu | `mysql: { async createExecutor(){ await import("mysql2/promise") } }` — **sağlayıcı dallanmasının içinde, dinamik import** |
| Şema sağlayıcısı | `prisma/schema.prisma` | `provider = "postgresql"` → o dal hiç çalışmaz |
| Gerçekten yükleniyor mu | `Module._load` izleyicisi + `prisma generate`, `prisma migrate status`, `pnpm db:seed` | **HİÇBİRİ** — mysql2 tek seferde bile yüklenmedi |
| Üretim paketinde var mı | taze `pnpm build` sonrası `.next/server` + `.next/static` taraması | **0 dosya** |

Ek olarak `prisma` bizde **`devDependencies`** içinde (`@prisma/client`'ın
*isteğe bağlı* peer'ı). Üretim kurulumunda CLI hiç inmiyor, yani mysql2 üretim
ağacında **yok**.

**Pratik maruziyet: yok.** Yine de düzeltildi — §8.24 sert kapıdır ve
ADVISORY-001'in dersi geçerli: bedeli olmayan bir düzeltme varken kapı
tartışılmaz.

### Neden B — ve neden ADVISORY-002'den farklı

| Katman | Değerlendirme |
| ------ | ------------- |
| A | **İmkânsız, ölçüldü.** `prisma` `"mysql2": "3.15.3"` diye **tam sabitliyor**; `pnpm update mysql2 --depth Infinity` sürümü kıpırdatmadı. |
| C | **Etkisiz, ölçüldü.** Kararlı en yeni `prisma@7.10.0` da `mysql2@3.15.3` sabitliyor. `prisma@8` ise RC. |
| D | Gereksiz — B'nin bedeli ölçülebilir biçimde sıfır. |
| **B** | ✅ `">=3.23.1 <4.0.0"` — iki danışmayı birden kapatır, majör sınırında durur. |

ADVISORY-002'de (deepmerge-ts) tam sabit pine rağmen override **reddedilmişti**;
burada kabul ediliyor ve fark ölçülebilir:

- `deepmerge-ts` @prisma/config'in **her CLI çağrısında** yüklenen bir
  birleştirme semantiğiydi; kırılma sessiz ve config'i bozacak türdendi.
- `mysql2` **hiçbir çağrıda yüklenmiyor** (yukarıdaki dört ölçüm). Override'ın
  değiştirdiği kod yolu, bizim asla çalıştırmadığımız bir dal.

Yani ölçüt "tam sabit pin var mı" değil, **"pin edilen kod bizde çalışıyor mu"**.
Çalışıyorsa sözleşmeyi çiğnemek risklidir; çalışmıyorsa risk yoktur.

### Doğrulama

```
pnpm why mysql2 → 3.24.4 (3 yolun ÜÇÜ de, tek sürüm)
pnpm audit --audit-level high → mysql2 satırı kalmadı (orta seviye dahil)
lint ✓ typecheck ✓ test 1093/1093 ✓ build ✓ e2e 85/85 ✓
```

### Kaldırma koşulu

`prisma` (ya da `@prisma/config`) `mysql2`yi `>=3.23.1` ilan eden bir **kararlı**
sürüm yayınladığında override silinir. Kontrol:

```bash
npm view prisma@latest dependencies.mysql2     # >=3.23.1 ilan ediyorsa
# override satırı çıkarılır → pnpm install --lockfile-only → pnpm why mysql2
```

**Sonraki gözden geçirme:** 2027-02-14 (oyunkitabı §4 — altı aylık override
taraması).

---

## ADVISORY-004 — `fast-uri` <3.1.6 (dört danışma, hepsi Yüksek)

**Tarih:** 2026-09-13 · **Görev:** T-042g · **Durum:** KAPANDI
**Katman:** **A** (kilit tazeleme — override YOK) · **Bulan:** §8.24 kapısı

```
GHSA-5jgf-p345-68v8 · GHSA-f65p-4m7j-42xc · GHSA-fph4-wmhf-6fwf · GHSA-jqff-g426-hqxp
fast-uri 3.1.5 → 3.1.7 · SSRF + host confusion · dört yol, iki farklı üst paket:
  . > prisma > @prisma/dev > @prisma/streams-local > ajv@8.20.0 > fast-uri
  . > @hookform/resolvers@5.7.1 > ajv@8.20.0 > fast-uri
```

### Maruziyet — ikinci yol görev kartında yoktu, ölçüm ortaya çıkardı

Görev kartı yalnızca `@prisma/dev` zincirini bildiriyordu. Denetim çıktısının
tamamı okununca ikinci bir yol göründü: **`@hookform/resolvers`** — ve o, `prisma`
gibi dev-only değil, **çalışma zamanı bağımlılığımız** (formlar).

| Ölçüm | Sonuç |
| ----- | ----- |
| Hangi giriş noktasını kullanıyoruz | `grep -rn "@hookform/resolvers" src/` → üç dosyanın üçü de **`@hookform/resolvers/zod`** |
| `ajv` ayrı bir giriş noktası mı | Paket her doğrulayıcı için ayrı klasör yayınlıyor (`ajv/`, `zod/`, `joi/`…); `ajv`ye yalnızca `@hookform/resolvers/ajv` içe aktarımı ulaşır |
| Üretim paketinde `ajv`/`fast-uri` izi | taze `pnpm build` → `.next/server` + `.next/static` taramasında **0 dosya** |
| `pnpm lint` sırasında yüklenen `ajv` | İzleyici: **ajv@6.15.0** (`@eslint/eslintrc`'nin bağımlılığı) — ajv 6 `fast-uri` kullanmaz |
| `prisma generate/migrate/seed` | İzleyici: `fast-uri` **hiç yüklenmedi** |

**Pratik maruziyet: yok** — ne üretim paketinde, ne CLI akışlarında.

### Neden A

`ajv@8.20.0` `fast-uri`yi **`^3.0.1`** diye ilan ediyor; 3.1.7 bu aralığın
içinde. Yani üst paket zaten bu sürümle çalışacağını beyan etmiş — override
yazmak gereksiz bir kalıcı kısıt bırakırdı. Düzeltme tek komut:

```bash
pnpm update fast-uri --depth Infinity      # --recursive DEĞİL (aşağıda gerekçe)
```

`--recursive` ile denendi ve **hiçbir şey yapmadı** (EXIT 0, boş kilit deltası) —
bu tuzak oyunkitabına işlendi.

**Majör tuzağı burada kendiliğinden kapalı:** `fast-uri`nin en yenisi **4.1.4**
ama A, `ajv`nin aralığı yüzünden 3.1.7'de durdu. Override yazsaydık o aralığı
devre dışı bırakır ve üst sınırı elle koymak zorunda kalırdık.

### Kaldırma koşulu

Yok — override yazılmadı. Kilit yeniden sabitlenirse (`pnpm install --force`,
lockfile silinmesi) sürüm geri düşebilir; koruma §8.24 kapısının kendisi ve
haftalık koşumdur.

---

## ADVISORY-005 — `js-yaml` <4.3.2 (GHSA-2883-xcg3-v3hh, Yüksek)

**Tarih:** 2026-09-13 · **Görev:** T-042g · **Durum:** KAPANDI
**Katman:** **A** (kilit tazeleme — override YOK) · **Bulan:** §8.24 kapısı

```
js-yaml 4.3.1 → 4.3.2 · `maxTotalMergeKeys` CPU tüketimini sınırlamıyor (DoS)
28 yol, hepsi tek zincirde birleşiyor: eslint@9.39.5 > @eslint/eslintrc > js-yaml
```

### Maruziyet — ölçüldü

| Ölçüm | Sonuç |
| ----- | ----- |
| Bağımlılık türü | Yalnızca `devDependencies` (eslint zinciri) — üretim ağacında yok |
| Üretim paketinde | `.next` taraması → **0 dosya** |
| `pnpm lint` (tüm depo) sırasında yükleniyor mu | `Module._load` izleyicisi → **HİÇBİRİ**; yüklenen tek hedef `ajv@6.15.0` |
| Neden yüklenmiyor | `@eslint/eslintrc` `js-yaml`ı YAML biçimli eski config dosyaları için çağırıyor; bizde **düz config** var (`eslint.config.mjs`) |
| Tetikleyici girdi | Kötü niyetli YAML gerekiyor; bizim YAML'larımız `.github/workflows/*.yml` ve onları eslint okumuyor |

**Pratik maruziyet: yok.** Düzeltildi, çünkü bedeli bir komut.

### Neden A

`@eslint/eslintrc@3.3.6` `js-yaml`ı **`^4.3.0`** ilan ediyor; 4.3.2 içeride.
`pnpm update js-yaml --depth Infinity` → 4.3.2. En yeni `js-yaml` **5.4.2**
olmasına rağmen üst paketin aralığı 4.x'te tuttu — A'nın majör bağışıklığı.

### Kaldırma koşulu

Yok — override yazılmadı.

---

## `pnpm.overrides` bloğunun bugünkü hâli (T-042g)

Dört satır, dördü de **iki sınırlı**. Altı aylık taramanın (2027-02-14) bakacağı
liste bu:

| Paket | Aralık | Çözülen | Kayıt | Kaldırma koşulu |
| ----- | ------ | ------- | ----- | --------------- |
| `postcss` | `>=8.5.28 <9.0.0` | 8.5.28 | T-005 · **T-042g'de sınırlandı** | Üst paketler (Tailwind/Next) yamalı tabanı zaten kapsıyorsa satır silinir |
| `sharp` | `>=0.35.4 <0.36.0` | 0.35.4 | Orkestra Şefi (libheif danışması) | Aynı |
| `nanoid` | `>=3.3.18 <4.0.0` | 3.3.19 | ADVISORY-001 | `postcss` `>=3.3.18` çözer hâle gelince |
| `mysql2` | `>=3.23.1 <4.0.0` | 3.24.4 | **ADVISORY-003** | `prisma` kararlı bir sürümde `>=3.23.1` ilan edince |

**`postcss` T-042g'de neden değişti:** satır `">=8.5.23"` idi — üst sınırsız ve
tabanı bayat. `sharp`ın 0.35.3'te donmasına yol açan kalıbın aynısı: kilitteki
8.5.25 kısıtı zaten sağlıyordu, dolayısıyla override hiçbir şeyi yukarı
çekmiyordu. Taban bugünkü yamalı sürüme (8.5.28) çekildi ve majör sınırı kondu.
Bu bir danışma düzeltmesi değil, **etkisiz bir override'ın onarımı** — bugün
temiz, ama yarın 8.5.23–8.5.30 aralığını kapsayan bir danışma çıksaydı satır
"düzeltilmiş" görünürken kapıyı kırmızıya bırakırdı.

**`nanoid` 3.3.18 → 3.3.19 kendiliğinden geldi:** iki sınırlı bir override,
yeniden çözüm tetiklendiğinde yamaları izler. Sınırsız olan izlemiyor — iki
satırın davranış farkı bu turda yan yana ölçüldü.

---

---

## Oyunkitabı — geçişli bağımlılıkta yüksek/kritik advisory

ADVISORY-001 sonuncusu olmayacak. Bir dahaki sefere sırayla şunlar yapılır.

### 1. Maruziyeti ölç — düzeltmeden ÖNCE

Advisory metnini oku ve **tetikleyici koşulu** çıkar (ADVISORY-001'de "özel
üretici + `size=0`"). Sonra iki soruyu ayrı ayrı cevapla:

- **Bizim kodumuz o yolu çağırıyor mu?** → `grep -rn "<paket>" src/ tests/ prisma/`
- **Ara paket o yolu çağırıyor mu?** → çağrı yerini `node_modules` içinde bul ve
  **oku**. Çağırıyorsa hangi argümanlarla?

Bu adım düzeltmeyi değiştirmez ama **aciliyeti** belirler: maruziyet varsa iş her
şeyin önüne geçer ve tek başına ele alınır; yoksa kapıyı açmak için normal sırada
yürür. "Muhtemelen etkilemiyor" bir cevap değildir — çağrı yerini gör.

**Maruziyet yoksa bile düzeltilir.** §8.24 sert kapıdır; istisna yazmak, kapıyı
bir sonraki gerçek açık için de gevşetir.

### 2. Katmanı seç — en ucuzdan başla

| Katman | Koşul | Yapılacak |
| ------ | ----- | --------- |
| **A · Kilit tazeleme** | Üst paketin ilan ettiği aralık yamalı sürümü **zaten kapsıyor** (ör. `^3.0.1` ⊇ 3.1.6) | `pnpm update <paket> --depth Infinity` — **`--recursive` DEĞİL** (T-042g'de ölçüldü, aşağıya bak). Override'a gerek yok. Tek risk: kilit yeniden sabitlenince geri gelmesi — bu yüzden `pnpm audit` CI'da koşmalı (koşuyor). |
| **B · Override** | Üst paket **yamasız bir aralık** ilan ediyor ve yamalı sürüm **aynı majör** içinde | `pnpm.overrides` → `">=<yamalı> <sonrakiMajör>"`. **ÜST SINIR ZORUNLU** (ADVISORY-001'in tuzağı). |
| **C · Üst paketi yükselt** | Yamalı sürüm **majör sınırının ötesinde** — override ara paketin sözleşmesini bozar | Üst paketi yükselt (ör. `postcss` yeni majör). ADR gerekir: majör yükseltme davranış değiştirir. |
| **D · Bekle + kaydet** | C mümkün değil (üst paket henüz yayınlamadı) **ve** maruziyet ölçülmüş biçimde yok | Bulgu kaydı aç, üst paketin issue'suna bağlan, `bagimlilik-denetimi` işine **süreli** istisna. Süresiz istisna yazılmaz. **Mekanizma ADVISORY-002'de kuruldu**: `ci.yml` → "pnpm audit … süreli istisnalarla". `pnpm.auditConfig` KULLANILMAZ — süresizdir. |

**ADVISORY-002'nin eklediği ölçüt — ÜST PAKETİN İLANINA BAK.** Katman seçerken
majör sınırından önce üst paketin `package.json`ı okunur:

- Bayat **aralık** (`^3.3.17`) → override o aralığın içinde kalarak yalnızca
  kilidi tazeler; üst paket zaten bu sürümle çalışacağını beyan etmiş (B).
- **Tam sabit sürüm** (`"deepmerge-ts": "7.1.5"`) → override, açık bir
  sözleşmenin üstünden geçmektir. Majör atlamıyor olsa bile burada durulur ve
  gerekçe yazılır.

**T-042g'nin eklediği ölçüt — TAM SABİT SÜRÜM KATMAN A'YI İMKÂNSIZ KILAR.**
ADVISORY-002 tam sabit pini "dur ve gerekçe yaz" işareti saymıştı; T-042g bunun
ölçülebilir sonucunu gösterdi: `prisma` `mysql2`'yi `"3.15.3"` diye sabitlediği
için `pnpm update mysql2 --depth Infinity` **hiçbir şey yapmıyor** (ölçüldü:
sürüm 3.15.3'te kaldı, kilit değişmedi). Yani üst paket aralık değil tek sürüm
ilan ediyorsa A denenip geçilecek bir katman değil, **elenen** bir katmandır.

---

#### ⚠️ İKİ SESSİZ TUZAK — ikisi de "düzelttim" sanısı üretir (T-042g)

**1. `pnpm update <paket> --recursive` geçişli pakette HİÇBİR ŞEY YAPMAZ.**
Ölçüldü: `pnpm update fast-uri js-yaml --recursive` → `Done in 2s`, **EXIT 0**,
sürümler 3.1.5 ve 4.3.1'de kaldı, `pnpm-lock.yaml` deltası **boş**. Sebep:
`--recursive` çalışma alanı paketlerinde *ilan edilmiş* bağımlılıkları günceller;
`fast-uri` bizim `package.json`ımızda hiç yazmıyor. Doğru komut
**`--depth Infinity`** — aynı paketlerde 3.1.7 ve 4.3.2'ye çözdü.

Bu, oyunkitabının kendi §3 kuralının neden var olduğunun kanıtı: komut EXIT 0
döndü, hiçbir uyarı basmadı ve **hiçbir şeyi değiştirmedi.** Yalnızca
`pnpm why` bunu gösterdi.

**2. `">=x"` biçimli SINIRSIZ override yükseltmez — sadece taban koyar.**
Override bir *kısıt*tır, bir *yükseltme emri* değil. Kilitteki sürüm kısıtı
zaten sağlıyorsa pnpm'in yeniden çözmek için sebebi yoktur. `sharp` override'ı
`">=0.35.0"` iken kilitteki 0.35.3 bu kısıtı sağlıyordu — ve tam da bu yüzden
danışmanın altındaki sürümde **donup kaldı**. `postcss` de aynı durumdaydı
(`">=8.5.23"`, kilitte 8.5.25).

**Kural (iki sınır birden):**

```jsonc
"paket": ">=<YAMALI sürüm> <sonrakiMajör>"   // ör. ">=3.23.1 <4.0.0"
```

- **Alt sınır = yamalı sürüm**, "bugün kurulu olan" değil. Yamalı sürümü taban
  yapmak, kilitteki eski sürümü kısıt dışı bırakır ve pnpm'i yeniden çözmeye
  **zorlar**. Tabanı eski bırakmak, override'ı sessizce etkisiz kılar.
- **Üst sınır = sonraki majör** (ADVISORY-001'in `nanoid` tuzağı).
- Yazdıktan sonra `pnpm why` ile çözülen sürüm okunur. Okumadan "düzeltildi"
  denmez.

**Katman A'nın bu tuzağa karşı doğal bağışıklığı var** ve bu, A'yı tercih
etmenin üçüncü sebebi: çözümü **üst paketin ilan ettiği aralık** sınırlar.
Ölçüldü — `fast-uri`nin en yenisi 4.1.4, `js-yaml`ınki 5.4.2 olmasına rağmen A
sırasıyla 3.1.7 ve 4.3.2'de durdu, çünkü `ajv` `^3.0.1`, `@eslint/eslintrc`
`^4.3.0` diyor. Override ise o aralığı **devre dışı bırakır**; majör sınırını
elle yazmak zorunda kalmamızın sebebi budur.

---

**Üst paketi beklemek mi, override mı?** Ölçüt maruziyet değil, **majör sınırı**.
Aynı majör içindeyse override (B) doğru cevaptır — ucuz, tersine çevrilebilir ve
üst paket güncellendiğinde kendiliğinden gereksizleşir. Majör atlıyorsa override
**yanlış** cevaptır (C'ye geç): ara paket eski majörün API'sini çağırıyor ve
kırılma çalışma zamanında, denetimin göremediği bir yerde çıkar.

### 3. Doğrula

```bash
pnpm install
pnpm why <paket>                    # TÜM yollar yamalı sürümü mü çözdü
pnpm audit --audit-level high       # EXIT 0
pnpm lint && pnpm typecheck && pnpm test
git diff pnpm-lock.yaml             # delta beklenenden BÜYÜKSE dur ve incele
```

`git diff pnpm-lock.yaml` adımı iki yöne birden bakar (T-042g): delta
**beklenenden büyükse** yan etki vardır, **boşsa düzeltme hiç uygulanmamıştır.**
Boş delta, EXIT 0 ile birlikte gelirse en tehlikeli hâldir — komut başarılı
göründü, hiçbir şey değişmedi. Değişen sürümleri tek bakışta görmek için:

```bash
git diff pnpm-lock.yaml | grep -E "^[-+]  [a-z@][^:]*:$" | sort | uniq -c
```

`pnpm why` adımı atlanamaz: `pnpm audit`'in temiz olması sürümün *beklediğin*
sürüm olduğunu göstermez (ADVISORY-001: audit 6.0.1 ile de temizdi).

Derleme etkisi olabilecek zincirlerde (postcss/Tailwind) `pnpm build` **Orkestra
Şefi tarafından** doğrulanır (ADR-023) — Güvenlik ajanı `src/**` derlemesini
kendi başına yeşil ilan etmez.

### 4. Kaldırma — override'lar birikirse bir gün gerçek açığı maskeler

Her override kaydında **kaldırma koşulu** yazılır: hangi üst paket sürümü
geldiğinde gereksizleşeceği. Koşulsuz override yazılmaz.

**Altı ayda bir** (sonraki: **2027-02-14**) `pnpm.overrides` bloğu baştan sona
gözden geçirilir. Her satır için: override geçici olarak çıkarılır,
`pnpm install --lockfile-only && pnpm why <paket>` koşulur; çözülen sürüm zaten
güvenliyse **satır silinir**.

Gerekçesi somut: override, o paket için sürüm çözümlemesini **dondurur**. Bugün
`nanoid`'i 3.3.18'e yükselten satır, yarın 3.3.25'te yayınlanacak bir açığı
düzeltmez ama `pnpm update`'in doğal yükseltmesini de engelleyebilir. Ölü bir
override, yaşayan bir açığı taşıyabilir.

### 5. Kaydet

`docs/security/README.md` → `ADVISORY-NNN` başlığı: advisory kimliği, tetikleyici
koşul, **ölçülmüş maruziyet**, seçilen katman ve gerekçesi, kaldırma koşulu, son
gözden geçirme tarihi. Denetim kütüğüne satır eklenir. R21 geçerlidir: açık
kapanmadan istismar ayrıntısı yazılmaz — advisory zaten kamuya açık olduğu için
kimliği ve tetikleyici koşulu vermek serbest, **bizim** zincirimizdeki çağrı
yerini vermek düzeltmeden önce serbest değil.

---

## BULGU-013 — Ölçüm işi veriye bağımlı hâle geldi; Lighthouse üç profilde de 500 ölçtü

**Önem:** Yüksek (merge kapısı fiilen ölçüm yapmıyor) · **Görev:** T-029c
**Durum:** DÜZELTİLDİ — CI'da doğrulanması bekleniyor (bkz. "Açık kalan")
**Sorumlu:** Güvenlik & Test (CI yapılandırması) · **Kimsenin hatası değil**

### Belirti

Koşu **31814208273**, `lighthouse` işi, ilk profilin ilk koşusunda:

```
Run #1...failed!
"runtimeError": {
  "code": "ERRORED_DOCUMENT_REQUEST",
  "message": "... (Status code: 500)"
}
```

Üç profil de düştü. `if-no-files-found: error` devreye girdi, **artifact
üretilmedi**. Yani §9 eşikleri ve BULGU-010'un WebGL doğrulaması bu koşumda
hiçbir şey ölçmedi.

### Sebep

ADR-026 ana sayfayı fixture'dan gerçek servislere bağladı. `getProfile`, profil
kaydını bulamazsa **fırlatır** — ADR-017'de profil tekil ve seed ile açılan bir
kayıt; yokluğu boş durum değil kurulum hatasıdır. (`getSkills` /
`getFeaturedProjects` / `getServices` boş dizi döner, `getSiteStats` sıfır döner;
fırlatan tek okuma `getProfile`.)

`kapi` işinde Postgres servisi ve seed var (T-005b). `lighthouse` **ayrı bir
koşucuda** çalışıyor ve `services:` bloğu yoktu — servis container'ları işler
arasında paylaşılmaz. Ölçüm işi, ADR-026'nın öngörülmemiş yan etkisiyle veriye
bağımlı hâle geldi ve kimse fark etmedi.

**Yerelde birebir yeniden üretildi** (veritabanı kapalıyken):

```
GET /       → HTTP 500
GET /panel  → HTTP 200        # ara katman DB'ye bakmıyor
  ⨯ PrismaClientKnownRequestError: Can't reach database server
    Invalid `prisma.profile.findUnique()` invocation   (P1001)
```

Seed'den sonra aynı sunucu, aynı derleme: `GET /` → **200**.

### Bağımlılık DERLEME zamanında değil, İSTEK zamanında

Kök layout `cookies()` okuyor (tema), bu da `/` rotasını dinamik render'a
çekiyor. Sonuç: `pnpm build` veritabanısız geçiyor — nitekim düşen koşumda
derleme adımı **yeşildi**, 500 ölçüm anında çıktı.

Bunun iki pratik sonucu var:

1. **BULGU-002 nöbeti `lighthouse` işinde de geçerli ve korunmalı.** Derleme
   adımına `DATABASE_URL` verilmedi; verilseydi, sayfayı statik prerender'a
   çevirip derlemeyi sessizce DB'ye bağlayan bir değişiklik fark edilmezdi.
2. **`kapi`'den `.next` artifact'i devretmek bu bulguyu ÇÖZMEZ.** Artifact
   `.next` taşır, ayakta bir Postgres taşımaz. Devir yalnızca yeniden derlemeyi
   önlerdi; 500 aynen kalırdı.

### Düzeltme

`lighthouse` işine `kapi`'dekiyle aynı veri kurulumu: Postgres 16 servisi →
`prisma migrate deploy` → `pnpm db:seed` → ölçüm. T-005b'nin kararları korundu:
`DATABASE_URL` **iş düzeyinde değil**, yalnızca ihtiyacı olan adımlarda;
`migrate dev` değil `deploy`; CI kimlikleri açıkça sahte (`ci-test-…`).

**Yan bulgu — seed'in kimlik ihtiyacı.** `prisma/seed.ts`, `ADMIN_EMAIL`
tanımsızsa "ADMIN_EMAIL tanımlı değil (§12)" diye fırlatıyor. Yalnızca
`DATABASE_URL` eklemek yetmezdi; `kapi`'nin dört sahte kimlik değişkeni de
`lighthouse` işine kopyalandı. Yerelde ölçülerek bulundu, CI'da denenerek değil.

### İki yeni nöbet — arıza bir daha aynı biçimde saklanamasın

**1 · Ölçüm ön koşulu.** Profiller başlamadan sunucu ayağa kaldırılıp `/`'ın 200
döndüğü doğrulanır; değilse iş orada durur ve sunucu logu basılır. Gerekçe:
LHCI 500'ü `ERRORED_DOCUMENT_REQUEST` diye üç ekran LHR JSON'unun ortasında
bildiriyor — bu bulguda sebebi görmek için ham log kazımak gerekti.

**2 · Ayırt edicide durum kodu kontrolü.** "Ölçülen sayfa Aurora içeriyor mu?"
adımı `aurora-katman` sınıfını arıyordu ama **durum kodunu kontrol etmiyordu**.
500 gövdesinde de o sınıf bulunmaz; yani düzeltme yapılmasaydı bu adım "sayfa
Aurora içermiyor" der, `AURORA_SAYFADA=0` yazar ve §5.2.2 doğrulaması sessizce
"⏳ BEKLEMEDE" dalına düşerdi. **Arıza varken yeşil** — T-019b/K3'teki "vakum
hâlinde yeşil" tuzağının aynısı, bu kez ölçüm hattında.

### Yerel prova — CI işinin adım adım tekrarı

Atılabilir bir Postgres 16 kümesi kuruldu; `migrate deploy` → `seed` → üç profil
→ ayırt edici → WebGL kontrolü → skor özeti, **CI'daki betiklerin aynısıyla**:

| Profil | koşu | Perf (medyan) | A11y | BP | SEO | yayılım |
| ------ | ---- | ------------- | ---- | -- | --- | ------- |
| `mobil-aydinlik` | 5/5 | **92** | 100 | 100 | 100 | 1 |
| `mobil-koyu` | 5/5 | **92** | 100 | 100 | 100 | 2 |
| `masaustu-koyu` | 5/5 | **100** | 100 | 100 | 100 | 1 |

Üçünün de çıkış kodu 0; 15 koşunun 15'i temiz; `lighthouse-raporu/` altında
**18 JSON / 13 MB** üretildi (artifact "No files were found" vermez).

BULGU-010 doğrulaması, ayırt edici artık **zorunlu** dalda:

```
ayırt edici istek → HTTP 200
AURORA_SAYFADA=1
Aurora parçası: 369.849405c07f6c28ee.js
masaüstü ogl indirdi mi : true     → §5.2.2 ✅
mobil    ogl indirdi mi : false    → §5.2.5 ✅
```

T-023 `lazy.tsx`'i değiştirmiş olmasına rağmen dört koşullu ayırt edici
**bozulmadan çalışıyor**. Skorlar T-023'ün yerel ölçümüyle (mobil ~92,
masaüstü+koyu ~100) **tam tutuyor** — sapma yok, dolayısıyla açıklanacak fark
da yok.

### Açık kalan — CI doğrulaması

Kabul kriteri "üç profili de düşmeden tamamlıyor — **gerçek koşu numarasıyla**"
karşılanamadı: aynı görev kartı ADR-028 gereği **dal açmayı ve commit atmayı
yasaklıyor**, gerçek koşu ise ancak iş akışı dosyası uzağa gidince tetiklenebilir.
Yukarıdaki prova CI adımlarının birebir tekrarıdır ama CI değildir. İlk koşumda
doğrulanması gerekenler: üç profil EXIT 0, artifact üretimi, `AURORA_SAYFADA=1`
ve süre.

---

## BULGU-015 — Dört rota ölçüm yüzeyinin tamamen dışındaydı

**Önem:** Yüksek (kapı boşluğu) · **Görev:** T-029d · **Durum:** KAPANDI

### Belirti

BULGU-014 (`/og` çalışma zamanında `TypeError` ile çöküyor) hiçbir kapıya
takılmadı:

| Kapı | Sonuç |
| ---- | ----- |
| `pnpm build` | ✅ geçti |
| 827 birim testi | ✅ geçti |
| CI `kapi` | ✅ geçerdi |

Sebep, kodun kalitesiyle ilgili değil: **hiçbir kapı o rotaya istek atmıyordu.**
E2E `/` ve `/panel`'e vuruyor, Lighthouse `/`'a. `robots.txt`, `sitemap.xml`,
`rss.xml` ve `/og` — dördü de ölçülmüyordu.

Ortak özellikleri: **çıktılarını geliştirici görmez.** OG görselini sosyal medya
botu çeker, sitemap'i arama motoru okur, RSS'i besleme okuyucu. Bozuldukları gün
kimse fark etmez — üretime bozuk gidip haftalarca öyle kalabilirlerdi.

T-019b/K3'ün kardeşi. Orada testler koşuyordu ama gevşek desenler yüzünden
yanlış şeyi doğruluyorlardı; burada testler doğru çalışıyor ama bir yüzeyi **hiç**
ölçmüyorlardı. İkisi de aynı sanının iki yüzü: *yeşil bir paket, doğru şeyin
ölçüldüğünün kanıtı değildir.*

### Kapatma — iki katman

`tests/e2e/seo-routes.spec.ts` (8 test × 2 proje = 16 koşum):

1. **Sözleşme testleri** — her rotanın biçimi: PNG imzası + IHDR boyutları,
   `DOMParser` ile XML geçerliliği, `Disallow: /panel`, `Sitemap:` bildirimi,
   RSS bağlantılarının mutlak olması, sitemap'in gizli alan bildirmemesi (§8.7).
2. **Sitemap taraması** — sitemap'teki **her** URL 200 dönmeli. Yeni sayfa
   yayına girdiğinde kapsama kendiliğinden girer.

Kapsam kararının gerekçesi ve neden ikisinin birden gerektiği dosyanın başındaki
yorumda.

### PNG doğrulaması neden başlığa bakmıyor

`Content-Type`'ı sunucu yazar. `ImageResponse` çöküp yerine bir hata gövdesi
dönse bile başlık `image/png` görünebilir — yani başlığa bakan bir test
BULGU-014'ü **yine kaçırırdı**. Doğrulama imza baytlarından yapılıyor
(`89 50 4E 47 0D 0A 1A 0A`) ve IHDR bölütünden 1200×630 okunuyor: sekiz baytlık
imza tek başına gövdenin geri kalanının anlamlı olduğunu göstermez.

### Kapının gerçekten tuttuğunun kanıtı (mutasyon)

Backend'in T-028b düzeltmesi ölçüm sırasında zaten iş ağacındaydı, yani `/og`
testi ilk koşumda **yeşil** başladı. Kırmızıyı görmek için başka bir ajanın
üzerinde çalıştığı dosyayı geri almak gerekirdi — yapılmadı. Bunun yerine iki
font, **aynı render yolundan** (`next/og` → `ImageResponse`) geçirildi:

| Font kaynağı | Sonuç |
| ------------ | ----- |
| `HEAD:src/app/og/font.ts` (düzeltme öncesi) | **ÇÖKTÜ** — `TypeError: Cannot read properties of undefined (reading '256')` |
| İş ağacı (T-028b düzeltmesi) | PNG üretildi — 15 823 bayt, imza `89504e47` |

Üstteki satır BULGU-014'ün bildirilen hatasının birebir aynısı. Hata yanıt
üretimi sırasında fırlıyor; dolayısıyla istek düzeyinde bakan her test onu
zorunlu olarak görür. **Kırmızı → yeşil geçişi kanıtlanmıştır.**

### Geçersiz çıkan ikinci mutasyon — kayda geçiyor

"Veritabanını durdur, `/og` düşsün" denendi ve **düşmedi**: `getProfile`
önbellekli (`cachedRead`) ve Next'in kalıcı önbelleği sunucu yeniden başlasa
bile cevap veriyor.

```
DB açık,   sıcak sunucu → /og 200
DB kapalı, sıcak sunucu → /og 200
DB kapalı, SOĞUK sunucu → /og 200
```

Mutasyon geçersiz, ama gözlem yararlı: OG rotası kısa bir veritabanı kesintisine
dayanıklı. Bunun ikinci yüzü de var — `/og` testi, veri katmanı bozulsa bile
önbellekten yeşil kalabilir. Test rotanın **çökmesini** yakalar, verinin
tazeliğini değil; kapsamı budur.

### CI değişikliği gerekmedi

`kapi` işi zaten `pnpm test:e2e` çağırıyor; yeni paket kendiliğinden kapıya
girdi. `ci.yml`'e dokunulmadı.

---

## BULGU-016 — `sitemap.xml` var olmayan üç adresi arama motorlarına bildiriyor

**Önem:** Orta · **Görev:** T-029d (bulan) · **Durum:** **KAPANDI** (T-028c, PR #9)
**Bulan:** BULGU-015 için yazılan sitemap taraması, **ilk koşumunda**

> **Kapanış (2026-08-22, T-005d kaydı):** Backend T-028c'de yol (b)'yi seçti —
> üç adres sitemap'ten çıkarıldı ve mutasyonla doğrulandı. Aşağıdaki metin
> bulgunun özgün hâlidir; "kırmızı" uyarısı artık geçerli değildir.

`src/app/sitemap.ts` statik listesinde `/blog` ve `/iletisim` var; `/blog/<slug>`
adresleri ise yayınlanmış yazılardan üretiliyor. Bu sayfaların hiçbiri mevcut
değil (`src/app/(public)` altında `cv`, `hakkimda`, `projeler`, `projeler/[slug]`
var; `blog` ve `iletisim` yok):

```
  200  /                                       200  /projeler/kiyi-medya-kurumsal-site
  200  /hakkimda                               200  /projeler/rezervasyon-yonetim-paneli
  200  /projeler                               404  /blog
  200  /cv                                     404  /iletisim
                                               404  /blog/nextjs-15-app-router-notlari
```

**Etki:** Sitemap "bu adresi tara" demektir; sunucunun aynı adreste 404 demesi
tarama bütçesini harcar ve sitede kırık bağlantı olduğu sinyalini verir. Aynı
`sitemap.ts` yorumu `ARCHIVED` kayıtları tam bu gerekçeyle dışarıda bırakıyor —
kural konmuş ama statik liste ve yazı akışı için uygulanmamış.

**Düzeltme iki yoldan biri:** (a) sayfalar yayına girer, (b) sayfalar hazır
olana kadar sitemap onları bildirmez. Karar Orkestra Şefi'nin.

⚠️ **Bu bulgu şu an `kapi` işini KIRMIZI yapıyor** (E2E: 67 geçti, 2 düştü —
aynı test iki projede). Kırmızı bilinçli bırakıldı: test gerçek bir kusuru
gösteriyor ve susturmak, BULGU-015'te kapatılan boşluğun aynısını yeni bir
biçimde açmak olurdu. Bir izin listesi (allowlist) ise görev kartının uyardığı
`NavItem.hazir` kalıbının ta kendisi olurdu — unutulmaya açık, elle tutulan
istisna. **F2'nin merge'ü buna bağlı; karar hızlı verilmeli.**

---

## BULGU-017 — Derleme yeniden veritabanına bağımlı: `sitemap.xml` ve `rss.xml` ön-render ediliyor

**Önem:** Yüksek (BULGU-002'nin gerilemesi; `kapi` kırmızı) · **Görev:** T-005d (bulan)
**Durum:** AÇIK — düzeltme `src/**` tarafında (Backend)
**Bulan:** BULGU-002 nöbeti — **tam olarak bunun için duruyordu**

### İki arıza üst üste duruyordu

Koşum `32386089662`'nin bildirdiği hata `NEXT_PUBLIC_SITE_URL` idi. T-005d o
değişkeni derleme adımına verdi ve derleme **yine düştü** — bu kez altındaki
ikinci arızayla:

```
### 1) env yok                    → Error occurred prerendering page "/robots.txt"
                                    Error: NEXT_PUBLIC_SITE_URL tanımlı değil…
### 2) NEXT_PUBLIC_SITE_URL var,  → Error occurred prerendering page "/sitemap.xml"
       DATABASE_URL yok             Error: DATABASE_URL tanımlı değil…
```

İlk hata ikincisini **maskeliyordu**: Next ilk ön-render hatasında derlemeyi
sonlandırıyor (`exiting the build`), yani ikinci arıza ancak birincisi düzelince
görünür hâle geldi.

### Sebep

`src/app/sitemap.ts` ve `src/app/rss.xml/route.ts` veri okuyor
(`getProjectSitemapEntries`, `getPublishedPosts`, `getProfile`) ama hiçbir
dinamiklik işareti taşımıyor. Next'in varsayılanı bu durumda **derleme anında
ön-render**: sorgu `next build` sırasında koşuyor. `src/app/robots.ts` de statik,
ama o yalnızca `absoluteUrl` çağırıyor — veriye değil, adres değişkenine bağlı.

Depodaki `dynamic` beyanları: yalnızca `src/app/api/v1/health/route.ts`.

### Neden bu bir gerileme

BULGU-002 tam olarak buydu: derleme veritabanı bağlantısı istiyordu ve `.env`
bulunmayan her ortamda (CI, Docker derleme katmanı, taze klon) çöküyordu.
T-003c havuzu tembel kuruluma çevirip düzeltmişti. F2'nin SEO rotaları bağı
**sessizce** geri getirdi — derleme adımı `DATABASE_URL`siz koştuğu için nöbet
uyandı ve gerilemeyi **aynı gün** yakaladı.

### Ölçüm — nöbetin iki yönlü kanıtı

Yerelde, CI adımının birebir tekrarı (`.env` geçici olarak kaldırıldı, çıktı
`pnpm build`):

| Durum | `NEXT_PUBLIC_SITE_URL` | `DATABASE_URL` | Sonuç |
| ----- | ---------------------- | -------------- | ----- |
| Bugünkü ağaç | yok | yok | ✗ `/robots.txt` — site adresi yok |
| T-005d'nin CI'sı | **var** | yok | ✗ `/sitemap.xml` — **DB yok** ← nöbet burada tutuyor |
| Geçici mutasyon: iki rota `force-dynamic` | var | yok | ✓ **EXIT 0** |

Üçüncü satır geçici bir ölçüm mutasyonuydu ve **geri alındı** (`git status`
temiz) — düzeltme Backend'in kararı. O koşuda çıkan rota tablosu, ilgili tüm
rotaların istek zamanına geçtiğini gösteriyor:

```
○ /robots.txt          (statik — yalnızca NEXT_PUBLIC_SITE_URL ister)
ƒ /sitemap.xml   ƒ /rss.xml   ƒ /og/[[...parts]]   ƒ /  …
```

`/og` zaten dinamikti (yakalama-tümü segment), yani derlemede veri okumuyor.

### Düzeltme — Backend

`sitemap.ts` ve `rss.xml/route.ts` istek zamanına alınmalı
(`export const dynamic = 'force-dynamic'` ya da bir `revalidate` süresi;
tercih Backend'in — ISR seçilirse ilk üretim yine derlemede koşar, o yüzden
`force-dynamic` daha güvenli). Ölçülmüş etki: iki satır, derleme EXIT 0.

### NE YAPILMAYACAK

Derleme adımına `DATABASE_URL` **verilmeyecek**. Kapıyı yeşile boyardı ve
BULGU-002 nöbetini bitirirdi: bundan sonra hiçbir kod, derlemeyi veritabanına
bağladığı için kırmızıya düşmezdi. Nöbetin değeri, tam da bugün kanıtlandığı
gibi, sessiz bağımlılığı **derleme anında** görünür kılması.

---

## Eşikler `error`'a çevrildi — §9 artık merge kapısı (T-029)

> ⚠️ **T-029e güncellemesi (2026-08-25):** aşağıdaki masaüstü rakamları
> (perf 60, eşik 0.55, türetilmiş config) **tarihsel kayıttır**. T-020c
> BULGU-018'i kapattı, profil CI'da 100 ölçtü ve masaüstü eşiği **0.90**'a
> çekilip türetme kaldırıldı. Güncel durum: "WebGL kontrolü çizim gücüne göre
> üç iddiaya çıktı (T-029e)". Mobil eşikler ve SEO kararı **değişmedi**.

**Tarih:** 2026-08-24 · **Kaynak ölçümler:** CI `32671011873` (main, PR #9 merge)
ve `32670153381` (dal) — profil başına **5 koşu, medyan**, iki koşum bağımsız.

### Ölçülen — eşiklerin dayanağı

| Profil | Ekran | Perf (ham) | A11y | BP | SEO |
| ------ | ----- | ---------- | ---- | -- | --- |
| `mobil-aydinlik` | 412×823 | **94** `[73, 94, 95, 94, 95]` | 100 | 100 | 100 |
| `mobil-koyu` | 412×823 | **95** `[95, 95, 94, 95, 95]` | 100 | 100 | 100 |
| `masaustu-koyu` | 1350×940 | **60** `[60, 60, 60, 60, 60]` | 100 | 100 | 100 |

Dal koşusu aynı deseni verdi: `95 [66,96,95,95,95]` · `95 [95,94,95,94,96]` ·
**`60 [60,60,60,60,60]`**. A11y/BP/SEO altı ölçümün hepsinde 100, yayılım 0.

⚠️ **Görev kartındaki "masaüstü 100/100/100" rakamı bayat** — o ölçüm T-029b'de
**yerelde**, GPU'lu bir makinede alınmıştı. CI'da masaüstü performansı **60** ve
**yayılım 0**: gürültü değil, tekrarlanabilir bir olgu (BULGU-018).

### Konan eşikler — profil başına, gerekçesiyle

| Profil | Perf | A11y | BP | SEO | Pay |
| ------ | ---- | ---- | -- | --- | --- |
| `mobil-aydinlik` | **0.90** | 0.95 | 0.95 | 0.95 | 4 puan |
| `mobil-koyu` | **0.90** | 0.95 | 0.95 | 0.95 | 5 puan |
| `masaustu-koyu` | **0.55** ¹ | 0.95 | 0.95 | 0.95 | 5 puan |

¹ **Hedef değil TAVAN.** §9'un masaüstü performans hedefi hâlâ 90; bugün
ölçülen 60. Eşik, bugünü geçirip **daha da kötüleşmeyi** yakalasın diye
ölçülen değerin 5 puan altına kondu. BULGU-018 kapanınca 0.90'a çekilecek.

**Kural:** her eşik = ölçülen medyan − ~5 puan, üç kategoride §9'un kendi
sayısıyla çakışıyor (0.95) çünkü ölçüm (100) onu rahatça geçiyor. Hiçbir eşik
temenniye dayanmıyor.

**Mobil payın darlığı bilinçli** (görev kartı da böyle istiyor): 94 → 90.
İlk koşu hâlâ aykırı değer üretiyor (73 ve 66 ölçüldü — T-029b standalone'a
geçince yerelde kaybolan ısınma etkisi CI'da **sürüyor**), ama 5 koşuda medyanı
devirmek için **üç** talihsiz koşu gerekir. Bugüne kadar en fazla bir tane çıktı.

### SEO — "error", çünkü yanlış pozitif bu kapıya girmiyor

Frontend'in T-025'te ölçtüğü **SEO 91** gerçek ve bilinen: Next 15.5 akışlı
metadata, `generateMetadata` sayfa gövdesiyle yarışıyor; sınırlı bot listesi
(Twitterbot/Slackbot/facebookexternalhit) metadata'yı `<head>` içinde alıyor,
Googlebot gövdede ama JS çalıştırdığı için pratikte etkilenmiyor.
`streamingMetadata: false` LCP'ye bedel yazacağı için akışlı metadata kalıyor.

**Ama o 91 DETAY SAYFALARINDA ölçüldü ve ölçüm listemizde detay sayfası yok:**
`collect.url` = `["http://127.0.0.1:3100/"]`. Ana sayfada SEO altı ölçümün
hepsinde **100, yayılım 0**. Yani SEO'yu `error` yapmak bugün ölçülmüş bir
yanlış pozitifi merge engeline **çevirmiyor** — seçenek (a) "SEO'yu warn bırak"
gerçek bir kapıyı, var olmayan bir sorun için kapalı tutmak olurdu.

**Ne zaman bozulur ve o gün ne yapılacak:** `collect.url` listesine bir detay
sayfası eklenirse eşik haksız yere kırmızıya döner. Doğru cevap kategoriyi
düşürmek (seçenek b) değil, **sorunlu denetimi tek tek hariç tutmak** (seçenek
c) — `meta-description` gibi ilgili assertion ayrıca yazılır, kategori `error`
kalır. Kural `lighthouserc.json` içine de yazıldı. Bu senaryo benzetimle
ölçüldü: SEO 91 verildiğinde eşik gerçekten kırmızıya dönüyor (aşağıdaki tablo).

### Masaüstü eşiği nasıl uygulandı — config TÜRETİLİYOR, kopyalanmıyor

LHCI eşikleri profil başına ayıramıyor: üç profilin de URL'i aynı olduğu için
`assertMatrix` işe yaramaz ve **CLI ile assertion geçersiz kılma ÇALIŞMIYOR** —
ölçüldü:

| Deneme | Sonuç |
| ------ | ----- |
| `--assert.assertions.categories:performance.minScore=0.55` | `TypeError: normalizeAssertion is not a function` ile **çöküyor** |
| `--assert.assertions.categories:performance='["error",{"minScore":0.55}]'` | **sessizce yok sayılıyor** — temel eşik uygulanmaya devam ediyor |

İkincisi daha tehlikeli: kapı gevşemiş görünmeden gevşerdi. Bu yüzden masaüstü
adımı, `lighthouserc.json`u okuyup **yalnızca performans satırını** değiştiren
bir config'i `$RUNNER_TEMP`e türetiyor. Diğer üç eşik temelden miras alınıyor;
eşikler tek kaynakta kalıyor. Türetici, temel dosyada beklediği değeri
(`["error", {minScore: 0.9}]`) bulamazsa **durur** — biri temeli değiştirirse
masaüstü türetmesi sessizce eskimesin diye. Mutasyonla doğrulandı: temel 0.85
yapıldığında türetme `EXIT 1` veriyor.

### Eşiklerin GERÇEKTEN tuttuğunun kanıtı

LHCI'ın kendi assert motoru, **CI'dan indirilen gerçek raporlara** karşı
koşuldu (`gh run download 32671011873 -n lighthouse-raporu`). Yani aşağıdaki
satırlar taklit veriyle değil, kapının merge'de göreceği veriyle üretildi:

| # | Girdi | Eşik | Sonuç |
| - | ----- | ---- | ----- |
| 1 | `mobil-aydinlik` gerçek | temel (perf 0.90) | ✅ **yeşil** |
| 2 | `mobil-koyu` gerçek | temel (perf 0.90) | ✅ **yeşil** |
| 3 | `masaustu-koyu` gerçek | türetilmiş (perf 0.55) | ✅ **yeşil** |
| 4 | `mobil-koyu` gerçek | perf **0.96**'ya çekildi | ❌ kırmızı — `found: 0.95` |
| 5 | `masaustu-koyu` gerçek | perf **0.65**'e çekildi | ❌ kırmızı — `found: 0.6` |
| 6 | `masaustu-koyu` gerçek | **temel** eşikle (0.90) | ❌ kırmızı — türetme ŞART |
| 7 | `mobil-koyu`, SEO 100→**91** | temel | ❌ kırmızı — `categories.seo` |
| 8 | `mobil-koyu`, A11y 100→**90** | temel | ❌ kırmızı — `categories.accessibility` |
| 9 | `masaustu-koyu`, BP 100→**90** | türetilmiş | ❌ kırmızı — `categories.best-practices` |

4-6 eşiği kaydırarak, 7-9 **raporun kendisini bozarak** sınıyor. İkisi birden
gerekliydi: yalnızca eşik kaydırmak, 100 ölçen üç kategorinin assertion'ının
gerçekten koştuğunu gösteremezdi (100'ün üstüne eşik konamaz). 7. satır aynı
zamanda SEO kararının bedelini sayısallaştırıyor: detay sayfası ölçüm listesine
girerse kapı **gerçekten** kırmızı olur.

Hepsi geri alındı; `lighthouserc.json` konan eşiklerle duruyor.

### Üç profil de her koşumda ölçülüyor — "error"ın yan etkisi kapatıldı

`error`'a çevirmenin fark edilmesi kolay olmayan bir bedeli vardı: ilk düşen
profil adımı sonlandırır ve **arkasındaki her şey atlanırdı** — diğer iki
profil hiç ölçülmez, skor özeti basılmaz ve §5.2.2/§5.2.5 **WebGL doğrulaması
hiç koşmazdı**. Yani "mobil performans iki puan düştü" satırı, WebGL denetimini
de sessizce kapatırdı; T-029a'nın kapattığı boşluk geri açılırdı.

Çözüm: üç ölçüm adımı `continue-on-error: true` taşıyor, **işi düşüren ayrı bir
adım** var (`§9 KAPISI`). Böylece üçü de her koşumda ölçülür, tanı çıktısının
tamamı üretilir, sonra iş kırmızı olur. Kapı gevşemiyor — yalnızca kararın
verildiği yer değişiyor, ve o yer koşum özetine (`GITHUB_STEP_SUMMARY`) profil
başına bir tablo yazıyor.

Güvenli olmasının sebebi ölçüldü: `lhci autorun`, assert düşse bile raporları
**yine yüklüyor** (`autorun.js`: collect → assert → upload → `exit 1`), yani
özet ve WebGL doğrulaması verisiz kalmıyor.

Kapı adımı üç durumla sınandı: üçü `success` → **EXIT 0**; biri `failure` →
**EXIT 1**; biri `skipped` → **EXIT 1**. Üçüncüsü bilinçli: hiç ölçülmemiş bir
profil için §9 "geçti" diyemez — T-005b'de auth paketinin kendini atlayıp
koşumu yeşil bırakmasıyla aynı sınıf hata olurdu.

### ADR-030 ve eşikler — seed büyüten görevin borcu

**ADR-030: seed bir ölçüm sözleşmesidir.** Eşikler `warn` iken seed'i büyütmek
yalnızca bir uyarı satırı üretiyordu; `error` olduğu andan itibaren
**seed verisini büyüten her görev bu kapıyı kırabilir.** Ölçülen sayfanın
içeriği (profil, yetenekler, projeler, hizmetler, istatistikler) seed'den
geliyor; sayfa büyüdükçe LCP ve TBT büyür.

Bu **bozuk bir kapı değil, gerçek bilgi**: sayfa gerçekten ağırlaşmıştır ve
kullanıcı da o ağırlığı görecektir. Kapının doğru davranışı bunu söylemektir.

**Kural:** seed'i büyüten görev, işini Lighthouse'u **yeniden ölçüp raporlamadan
tamamlanmış sayamaz.** Ölçüm düşerse iki meşru cevap vardır — sayfayı
hafifletmek ya da eşiği **yeni ölçümle ve gerekçeyle** değiştirmek. Meşru
olmayan cevap: eşiği sessizce indirmek ya da profili kapatmak.

Bugünkü pay dar (mobil 94 → 90, dört puan) ve bu bilinçli: kapının erken
konuşması, geç konuşmasından iyidir.

---

## BULGU-018 — Masaüstü WebGL profili performansı 60 ölçüyor; §9 hedefinin 30 puan altında

**Önem:** Orta (kalite kapısı — güvenlik açığı değil) · **Görev:** T-029 (bulan)
**Durum:** **KAPANDI** — T-020c (Frontend), CI'da doğrulandı · **Bulan:** eşikleri
`error`'a çevirmeden önceki doğrulama ölçümü

> **Kapanış (2026-08-25, T-029e kaydı):** Frontend, Aurora'ya **beşinci** bir
> yüklenmeme koşulu ekledi — yazılım rasterleyici (`gpu-tespit.ts`, iki sinyal:
> `failIfMajorPerformanceCaveat` + rasterleyici dizesi). GPU'suz koşucuda `ogl`
> parçası artık hiç indirilmiyor. **Koşum 32828187466'da gerçek CI koşucusunda
> ölçülen sonuç:**
>
> ```
> masaustu-koyu  performance  medyan=100  [100, 100, 100, 100, 100]  yayılım=0
> ```
>
> 60 → 100. Aşağıdaki metin bulgunun özgün hâlidir; "Frontend'e sorular"
> bölümündeki üç soru T-020c'de (3) numaralı yolla cevaplandı: düşük güçlü
> ortamda statik gradyana düşülüyor. Eşik sonucu: masaüstü tavanı (0.55)
> **kaldırıldı**, profil de 0.90'a bağlandı.

### Belirti

`masaustu-koyu` profili iki bağımsız CI koşusunda **5/5 koşuda tam 60** ölçtü
(yayılım 0). Aynı sayfa mobil profillerde 94-95.

### Sebep — ölçüldü, tahmin edilmedi

Medyan raporun metrik dökümü:

| Metrik | `mobil-koyu` | `masaustu-koyu` |
| ------ | ------------ | --------------- |
| FCP | 0.8 s | 0.2 s |
| LCP | 3.0 s | **0.6 s** |
| CLS | 0 | 0 |
| **TBT** | **80 ms** | **9 990 ms** |
| **Speed Index** | **0.8 s** | **11.9 s** |

Sayfa **anında** boyanıyor (LCP 0.6 s — mobilden beş kat iyi), sonra ana iş
parçacığı on saniye boyunca meşgul kalıyor. Yük dağılımı tek bir yeri
gösteriyor:

```
bootup-time      40 839 ms  →  chunks/2369.…js      ← Aurora/ogl parçası
                  2 031 ms  →  chunks/734.…js
ana iş parçacığı 43 149 ms  →  "other" (raster/GPU işi CPU'da)
                    888 ms  →  scriptEvaluation
```

`2369` parçası **yalnızca masaüstü profilinde** isteniyor (mobilde 20 istek,
masaüstünde 30; parça mobilde yok) — yani §5.2.5 kuralı çalışıyor ve fark tam
olarak WebGL yolundan geliyor. Koşucuda GPU yok: `ogl` yazılım rasterleyicide
(SwiftShader) çalışıyor ve maliyet CPU'ya biniyor.

### Bu bir "CI tuhaflığı" mı, gerçek bir maliyet mi — ikisi de

- **CI'ya özgü yanı:** gerçek masaüstü kullanıcıların çoğunda GPU var; orada bu
  iş GPU'ya gider ve TBT bu kadar büyümez. T-029b'de aynı profil **yerelde
  100** ölçmüştü — fark donanım.
- **Gerçek olan yanı:** GPU hızlandırması olmayan kullanıcılar var (eski
  makineler, sanal masaüstleri, sürücü kara listeleri, uzak oturumlar). Onlarda
  deneyim CI'daki ölçüme benzer. Ayrıca Aurora **sürekli** çizim yapıyor —
  sayfa görünür olduğu sürece kare üretimi durmuyor.

Bu yüzden profil kapatılmadı ve eşik "yok" yapılmadı: 0.55 tavanı, durumu
görünür tutuyor ve **daha da kötüleşirse** kapıyı kırmızıya çeviriyor.

### Frontend'e sorular (bu görevin kapsamı dışında, `src/**`)

1. Aurora sekme/bölüm görünür değilken çizimi durduruyor mu
   (`IntersectionObserver` / `visibilitychange`)?
2. Kare hızı sınırlanabilir mi (60 → 30 fps) ya da çözünürlük ölçeklenebilir mi?
3. `WEBGL_lose_context` / yazılım rasterleyici tespiti ile düşük güçlü
   cihazlarda statik gradyana düşmek §5.2'ye uygun mu?

Karar verilene kadar eşik 0.55'te kalır. **Kapandığında yapılacak:** masaüstü
performans eşiği 0.90'a çekilir ve `ci.yml`'deki türetme adımı silinir —
`lighthouserc.json` yeniden tek ve tek biçimli kaynak olur.

---

## WebGL kontrolü çizim gücüne göre üç iddiaya çıktı (T-029e)

**Tarih:** 2026-08-25 · **Tetikleyen:** koşum `32828187466` — eşikler GEÇTİ,
düşen adım "WebGL gerçekten koştu mu? (§5.2.2 / §5.2.5)".

### Kontrol çalışıyordu; ÖNCÜLÜ bayattı

```
masaüstü ogl indirdi mi : false
mobil    ogl indirdi mi : false
§5.2.2 — Sayfa Aurora içeriyor AMA masaüstü profilinde WebGL parçası indirilmedi.
```

Kontrol, T-029a'da yazıldığı hâliyle **dört** koşul biliyordu (masaüstü genişlik
/ hareket kısıtı yok / koyu tema / hidrasyon) ve bu dördü sağlanınca `ogl`
inmesini şart koşuyordu. T-020c **beşinci** koşulu ekledi: yazılım rasterleyici.
Koşucuda GPU yok, dolayısıyla `ogl`in inmemesi **doğru davranış** — kontrol
doğru çalışıp yanlış şeyi iddia etti.

Bu, T-028e'de Backend'in tek yönlü sitemap tuzağında gördüğüm desenin **ters
yönü**: orada "bildirilmeyen rota hayalet üretmediği için görünmüyordu"; burada
kontrol "ogl yüklenmeli" diyor ama **hangi koşulda** yüklenmesi gerektiğini
söylemiyordu. İki durumda da eksik olan şey aynı: iddianın **koşulu**.

### Koşucunun çizim gücü — ÖLÇÜLDÜ, varsayılmadı

Frontend'in uyarısı ("headless = GPU var varsayımı yanlış") haklıydı, ama ölçüm
daha ilginç bir şey söyledi: **cevap ikiliye ve bayraklara bağlı.** macOS/M2'de,
`gpu-tespit.ts` ile aynı iki sinyalle:

| İkili / bayraklar | `failIfMajorPerformanceCaveat` | `UNMASKED_RENDERER_WEBGL` | Karar |
| ----------------- | ------------------------------ | ------------------------- | ----- |
| Tam Chrome, `--headless=new --no-sandbox` | bağlam **verildi** | ANGLE Metal, Apple M2 | **donanim** |
| Playwright paket içi chromium, aynı bayraklar | bağlam **verildi** | ANGLE Metal, Apple M2 | **donanim** |
| `chrome-headless-shell` | bağlam verildi | **SwiftShader** (Vulkan/LLVM) | **yazilim** |
| Tam Chrome + `--disable-gpu` | bağlam **REDDEDİLDİ** | — | **yazilim** |

Yani "Playwright bu makinede hep SwiftShader bildiriyor" gözlemi, Playwright'ın
başsız modda **headless shell** ikilisini kullanmasından geliyor; aynı paketin
tam chromium ikilisi `--headless=new` ile donanım bildiriyor. Sonda bu yüzden
**LHCI'ın kullandığı ikiliyi** (`CHROME_PATH` → `google-chrome-stable` → …,
`chrome-launcher` sırası) ve **`lighthouserc.json`daki bayrakların aynısını**
kullanıyor; kendiliğinden `--disable-gpu` gibi bir bayrak eklemiyor — eklerse
kendi cevabını uydurmuş olurdu.

**CI koşucusunun ölçülen durumu: `yazilim`.** Bugünkü kanıt dolaylı ama sağlam:
koşum 32828187466'da sayfa Aurora'yı mount etti (`AURORA_SAYFADA=1`), masaüstü
profili koştu, ve `ogl` parçası **indirilmedi** — uygulamanın kendi sondası
(aynı iki sinyal) o koşucuda "yazılım" dedi. Yeni adım bunu bundan sonra
**doğrudan** ve rasterleyici dizesiyle birlikte yazacak.

### İmza listesi Frontend'in modülünden OKUNUYOR — sürüklenme koruması

Sonda, yazılım imzalarını (`swiftshader`, `llvmpipe`, `software`, `basic
render`, `mesa offscreen`, `softpipe`) `src/components/reactbits/gpu-tespit.ts`
içinden okuyor (**dosyaya dokunulmadan**, salt okuma). Kendi kopyamızı
tutsaydık listeler sessizce ayrışır ve **aynı koşucuda uygulama ile kontrol
farklı karar verirdi** — kapı, olmayan bir ihlali bildirirdi. Liste okunamazsa
adım **durur**: boş listeyle devam etmek her yazılım rasterleyiciyi "donanım"
saymak olurdu (mutasyonla doğrulandı → `EXIT 1`).

### Üç iddianın son hâli

| Koşul | İddia | Kaynak |
| ----- | ----- | ------ |
| GPU **var** (donanim) | masaüstü profilinde `ogl` **İNMELİ** | §5.2.2 — değişmedi |
| GPU **yok** (yazilim) | masaüstü profilinde `ogl` **İNMEMELİ** | T-020c — **YENİ** |
| Her koşulda | mobil profilinde `ogl` **İNMEMELİ** | §5.2.5 — değişmedi |

İkinci satır kontrolü **zayıflatmıyor, genişletiyor**: BULGU-018'in geri gelişi
(yazılım rasterleyicide Aurora'nın yeniden yüklenmesi) artık **doğrudan** ve
sebebiyle yakalanıyor. Önceden bu ancak dolaylı görülürdü — performans skoru
düşerdi ve nedeni raporun içinden kazılırdı.

Ayrıca "GPU yok" dalı, §5.2.2'nin o koşumda **ölçülmediğini** açıkça yazıyor.
Ölçülmemiş bir şeyi "doğrulandı" saymak, T-005b'de auth paketinin kendini atlayıp
koşumu yeşil bırakmasıyla aynı sınıf hata olurdu.

### Mutasyon matrisi — altı dal, altısı da sınandı

| # | Girdi | Beklenen | Sonuç |
| - | ----- | -------- | ----- |
| 1 | GPU var + masaüstünde `ogl` indi | yeşil (§5.2.2 ✅) | ✅ |
| 2 | GPU var + `ogl` **inmedi** | **kırmızı** (§5.2.2 ihlali) | ✅ exit 1 |
| 3 | GPU yok + `ogl` inmedi | yeşil (T-020c ✅) | ✅ |
| 4 | GPU yok + `ogl` **indi** | **kırmızı** (BULGU-018 geri geldi) | ✅ exit 1 |
| 5 | mobilde `ogl` indi | **kırmızı** (§5.2.5) | ✅ exit 1 |
| 6 | çizim gücü ölçülmemiş | **kırmızı** (ölçüm yok ≠ GPU yok) | ✅ exit 1 |

4 numara bu turun asıl kazancı: BULGU-018'i geri getirecek değişikliği kapıda
yakalayacak olan dal odur.

**Ayrıca gerçek veriyle oynandı:** kırmızı koşumun (`32828187466`) indirilen
raporları, ölçülen çizim gücü `yazilim` ile yeni kontrolden geçirildi →
**EXIT 0**, "T-020c doğrulandı". Yani haksız kırmızı gerçekten kalkıyor.

Sonda adımının kendi dalları da ayrı ayrı sınandı: donanım (iki ikili), yazılım
(iki sinyal: reddedilen bağlam ve SwiftShader dizesi), Chrome bulunamadı →
`EXIT 1`, imza listesi okunamadı → `EXIT 1`.

### Masaüstü eşiği: 0.55 → **0.90**, türetme kaldırıldı

**Karar: bu turda 0.90'a çekildi.** Frontend "bir tur daha izleyelim, CI donanımı
benim makinemden yavaş" diye önerdi; itiraz makul ama **artık gerçek CI rakamı
var** — beklemenin ölçeceği şey zaten ölçülmüş durumda:

| Kaynak | Profil | Perf | Yayılım |
| ------ | ------ | ---- | ------- |
| CI `32828187466` (T-020c sonrası, koşucu = yazılım) | `masaustu-koyu` | **100** | 0 (5 koşu) |
| T-029b yerel ölçüm (GPU'lu, Aurora YÜKLÜ) | `masaustu-koyu` | **100** | 0 |

İki farklı kod yolu (Aurora yüklü ve yüklü değil), iki farklı donanım, **ikisi de
100**. 0.90 her ikisini de 10 puan payla karşılıyor. 0.55'i korumak, gerekçesi
ortadan kalkmış bir gevşekliği taşımak olurdu: kapı 45 puanlık bir düşüşü
sessizce geçirirdi.

Gerçek raporlara karşı doğrulandı: `masaustu-koyu` (32828187466) + 0.90 →
**yeşil**; aynı raporlarda perf 100 → 85 yapılınca → **kırmızı**
(`expected >=0.9, found 0.85`). `mobil-koyu` gerçek raporları + 0.90 → yeşil.

Türetme adımı silindi; eşikler yine **tek dosyada**. LHCI'ın CLI ile assertion
geçersiz kılamadığı ölçümü `lighthouserc.json` içinde not olarak bıraktım — bir
gün profil başına eşik yeniden gerekirse çözüm yolu hazır olsun.

**İzleme borcu:** koşucu bir gün GPU'lu olursa ölçülen şey WebGL yoluna döner.
Bu artık sessiz bir kayma değil — "Koşucunun çizim gücü" adımı rasterleyici
dizesini her koşumda yazıyor ve iddia 1'e geçildiği log'dan görülüyor.

---

## CI ikili ve imaj kararları (T-029)

### Playwright ikilileri — CI'da sorun yok, değişiklik yapılmadı

Backend'in yerelde aldığı `Executable doesn't exist … chromium_headless_shell`
hatasının CI'da karşılığı **yok**; üç ayak da yerinde:

| Soru | Durum |
| ---- | ----- |
| Sürüm sabit mi? | ✅ `package.json` → `"@playwright/test": "1.62.1"` — aralık değil, **tam sürüm** |
| İkili indirme adımı var mı? | ✅ `ci.yml` → "Playwright tarayıcılarını kur" → `playwright install --with-deps chromium` |
| Headless shell de iniyor mu? | ✅ ölçüldü: `playwright install --dry-run chromium` üç hedef listeliyor — `chromium-1234`, `chromium_headless_shell-1234`, `ffmpeg-1011` |
| Önbellek bayatlarsa ne olur? | ✅ kurulum adımı **koşulsuz** koşuyor (`if:` yok); eksik ikiliyi kendi tamamlar |
| Sürüm yükselince önbellek? | ✅ anahtar `hashFiles('pnpm-lock.yaml')` — Playwright sürümü değişince kilit değişir, anahtar değişir, ikililer yeniden iner |

Yerelde çıkan hatanın sebebi bayat bir `~/Library/Caches/ms-playwright` idi ve
`playwright install chromium` doğru çözümdü. CI'da aynı durum kendiliğinden
düzelir çünkü kurulum adımı her koşumda çalışır.

**Tek sürtünme (kabul edildi):** önbellek anahtarı tüm kilit dosyasını
hash'lediği için Playwright ile ilgisiz bir bağımlılık değişikliği de ikilileri
yeniden indirtiyor. Anahtarı Playwright sürümüne daraltmak ek bir adım (sürümü
okuyup çıktıya yazmak) gerektirir; kazanç birkaç dakika, risk ise yanlış
anahtarla **bayat ikili** kullanmak. Yavaş ama doğru olan tercih edildi.

### Docker Hub kesintisi — kabul edildi, mühendislik yapılmadı

PR #9'da `lighthouse` işi "Initialize containers" adımında düştü:
`postgres:16-alpine` üç denemede de çekilemedi (`registry-1.docker.io` zaman
aşımı). Yeniden koşumda geçti.

**Karar: kabul et ve yeniden koş.** Gerekçe — önerilen çarelerin hiçbiri asıl
sorunu çözmüyor:

| Çare | Neden değil |
| ---- | ----------- |
| Digest ile sabitleme | **Erişilebilirliği düzeltmez.** Digest'li çekim de aynı kayıt sunucusuna gider; sunucu düşükken digest de inmez. Digest'in faydası tekrarlanabilirlik/tedarik zinciri (§8.25), bu arıza o değil. |
| İmaj önbelleği | GitHub'ın servis container'ları koşum başında çekilir; `actions/cache` bu adımın önüne giremez. Kendi elimizle Postgres kurmak (docker run + sağlık beklemesi) gerekirdi — servis bloğunun tüm faydasını kaybederiz. |
| Aynayı değiştirmek (GHCR/ECR) | Resmî `postgres` imajının birebir karşılığı değil; yeni bir tedarik zinciri kararı (§8.25) ve ADR gerektirir. Bir kesinti için fazla. |

**Arıza zaten gürültülü:** iş kırmızı olur, kimse yanlış bir yeşil görmez;
"yeniden koş" bir tıklama. **Yeniden değerlendirme koşulu:** aynı ay içinde
**ikiden fazla** koşum bu adımda düşerse karar yeniden açılır ve ilk sıradaki
seçenek "Postgres'i adım içinde, yeniden deneme ile kur" olur.

---

## Rota envanteri × kapı kapsamı (T-016b)

**Tarih:** 2026-08-29 · **Tetikleyen:** T-029d'nin kapanış sorusu — "ölçülmeyen
başka yüzey var mı?" · **Kalıcı kapı:** `tests/unit/rota-kapsami.test.ts`

### Envanter — elle liste yok

21 rota, `src/app` ağacından **türetildi** (Next kuralları: `(grup)` adrese
girmez, `[slug]` deseni korunur, `layout`/`error`/`loading` rota değildir,
`robots.ts` ve `sitemap.ts` kod ürettiği için envanterdedir; `icon.svg` gibi
statik varlıklar dışarıdadır — gerekçeleri testin başında).

### Kapsam haritası

| Rota | Kapı | Ne ölçülüyor |
| ---- | ---- | ------------ |
| `/` | E2E + Lighthouse ×3 + sitemap | Tek `h1`, klavye odağı, başlıklar, üç profil, WebGL yolu |
| `/giris` | E2E (auth) | Kilitleme, TOTP, kurtarma kodu, yönlendirme |
| `/panel` | E2E (smoke + auth) | Oturumsuz → `/giris`; oturumlu erişim. **İçerik değil** |
| `/panel/ayarlar` | E2E (auth) | §8.1 kapısı: 2FA'sız oturum giremiyor |
| `/panel/ayarlar/guvenlik` | E2E (auth) | Kurulum ekranı; adres `TWO_FACTOR_SETUP_PATH` sabitinden |
| `/panel/desenler` | **YOK** | — (T-031/T-032 paralel; beyanı yazılı) |
| `/blog`, `/cv`, `/hakkimda`, `/hizmetler`, `/iletisim`, `/projeler` | sitemap taraması | **Yalnızca 200** |
| `/blog/[slug]`, `/projeler/[slug]` | sitemap taraması (+ OG temsilci slug) | **Yalnızca 200**; her slug değil, yayındakiler |
| `/api/auth/[...nextauth]` | E2E (auth) | `csrf` doğrudan; giriş akışının tamamı dolaylı |
| `/api/v1/health` | E2E (**T-016b'de eklendi**) | §13.6 zarfı + §8.20 sızıntı + matcher sınırı |
| `/api/v1/iletisim` | E2E (**T-016b'de eklendi**) + birim | Uç sunuluyor, jeton veriyor, geçersizi §7.2 ile reddediyor |
| `/og/[[...parts]]` | E2E (seo-routes) | PNG imzası + IHDR; bilinmeyen slug bayt bayt |
| `/robots.txt`, `/rss.xml`, `/sitemap.xml` | E2E (seo-routes) | İçerik: `Disallow: /panel`, geçerli XML, bildirilen her adres 200 |

### Kapatılan iki boşluk

**1. `/api/v1/health` — öncülü bayat bir "bilerek ölçmüyoruz".**
`security-headers.spec.ts` bu uca istek atıyordu ama yalnızca başlıklara
bakıyordu; durum kodu ve gövde bilerek dışarıda bırakılmıştı:

> "Durum kodu bilinçli olarak doğrulanmıyor: DB kapalıyken 503 döner ve bu
> DOĞRU davranıştır (T-003b)."

O cümle **yazıldığı gün doğruydu** — CI'da veritabanı yoktu. T-005b Postgres'i
kapıya soktuğundan beri öncül bayat. Bu, T-029e'deki WebGL kontrolüyle aynı
sınıf: *kontrol çalışıyor, öncülü eskimiş.* §13.7'de izleme (Uptime Kuma) bu
ucun **gövdesine** bakacak; gövdeyi hiçbir kapı doğrulamıyorsa "servis ayakta"
sinyali doğrulanmamış demektir.

**2. `/api/v1/iletisim` — birim testi ucun SUNULDUĞUNU gösteremez.**
Kapsamlı birim testleri var ama hepsi işleyiciyi doğrudan çağırıyor. Yanlış
dışa aktarım adı, yanlış `runtime`, yanlış dizin — üçü de birim testlerini
yeşil bırakır. Eklenen üç test dar bir soruyu soruyor: uç gerçekten sunuluyor
mu, jeton veriyor mu (§8.15 zaman tuzağı `AUTH_SECRET` yoksa **sessizce**
kapanır), geçersiz gövdeyi §7.2 zarfıyla mı reddediyor.

**Başarılı gönderim bilerek E2E dışında:** kayıt yazar ve bildirim yolunu
tetikler; kuralları (kısıtlama, honeypot, alan doğrulama) birim testlerinde ve
orası doğru yer. Seçilen istekler sistemi **değiştirmiyor**.

### Sağlık ucunun beklentisi ORTAMA GÖRE seçiliyor

İlk yazımda test sabit `200` bekliyordu ve yerelde **kırmızı** oldu: bu
makinenin diski %98 dolu, boş oran %2.5 < %5 → uç `503` döndürüyor ve bu
**doğru davranış** (`DISK_CRITICAL_FREE_RATIO`). Sabit beklenti, kodda hiçbir
şey bozulmadan kırmızıya dönen bir kapı olurdu — "haksız düşen kapı".

Çözüm T-029e'nin GPU farkındalığıyla aynı: **önce ölç, sonra iddia seç.** Test
`statfs` ile boş disk oranını ölçüyor; %5 altındaysa **arıza dalının**
sözleşmesini (503 + `INTERNAL_ERROR` zarfı + ayrıntı sızdırmama) doğruluyor ve
sağlıklı dalın ölçülmediğini **çıktıya yazıyor**. Yan kazanç: bugüne kadar
hiçbir kapının uğramadığı arıza dalı, ilk kez gerçek bir 503 üzerinde ölçüldü.

Varsayım yazılı: ölçüm sunucusu testle **aynı makinede** koşuyor
(`playwright.config.ts` → `webServer`); uzak bir sunucuya taşınırsa bu blok
gözden geçirilmeli.

### Kapatılmayan boşluklar — gerekçeli

| Boşluk | Risk | Karar |
| ------ | ---- | ----- |
| Public sayfaların **içeriği** (`/cv`, `/hakkimda`, `/hizmetler`, `/blog`, …) | Düşük–orta: sayfa 200 döner ama boş/yanlış içerik gösterebilir | **Kapatılmadı.** İçerik iddiaları Frontend'in sayfa görevlerine ait; burada tekrarlamak ikinci bir doğruluk kaynağı yaratır ve sayfa her değiştiğinde iki yerde bakım ister. Kapsam haritası bunu "**yalnızca 200**" diye yazıyor — asıl tehlike kapsamsız rota değil, kapsandığı sanılan rotadır |
| Panel sayfalarının içeriği | Orta, ama F3'ün konusu | **Kapatılmadı.** T-031/T-032 paralel koşuyor; panel içeriği yazılmadan içerik kapısı yazmak, yazılacak şeyi tahmin etmek olurdu |
| `/panel/desenler` | Orta | **Kapatılmadı.** Paralel görevin rotası; kapsam kararı o görevin. Kapı satırı "kapsanmıyor + gerekçe" olarak **yazılı** — görünmez değil |
| `/api/auth/[...nextauth]` alt uçları (`signin`, `callback`, `session`…) | Düşük | **Kapatılmadı.** Uçların tamamı NextAuth'un kendi kodu; bizim kodumuz olan kısım (adapter, callbacks) giriş akışı E2E'siyle zaten koşuyor. Her alt ucu ayrı çağırmak kütüphaneyi test etmek olurdu |
| Dinamik rotalarda **her** slug | Düşük | **Kapatılmadı.** Sitemap taraması yayındaki tüm slug'ları zaten çekiyor; ek olarak OG testinde bir temsilci slug var. Slug başına test, içerik büyüdükçe koşum süresini doğrusal büyütürdü |

### Ters yöndeki bulgu — var olmayan bir adrese istek atan kapı

`security-headers.spec.ts` ve `auth.spec.ts`, **`/api/v1/panel/islem`** adresine
istek atıyor. Böyle bir rota **yok ve olmamalı**: ara katman `matcher`'ının
`/api/v1/panel/*` kolunu sınayan bir sonda. Bu, BULGU-016'nın aynadaki
görüntüsü — orada sitemap var olmayan adresi *bildiriyordu*, burada kapı var
olmayan adrese *istek atıyor*. İkisi de bilinçli olduğu sürece sorun değil,
**yazılı olmadığı sürece tuzak**: bir gün biri o ucu arar, bulamaz ve ya siler
ya da yazar. Artık `SANAL_ROTALAR` içinde beyan edilmiş durumda ve kapı iki
yönlü kontrol ediyor: sonda hâlâ kullanılıyor mu, ve o adres bir gün **gerçek**
olduysa beyan `KAPSAM`'a taşınmalı.

### Kalıcı kapı — `tests/unit/rota-kapsami.test.ts`

Karar: **kurulabilir ve kuruldu.** Backend'in T-030c'deki içe aktarma grafiği
kapısıyla aynı sınıf — statik, bağımlılıksız, `pnpm test` içinde koşuyor.
31 test. Kırmızıya dönme dalları:

| Dal | Ne yakalar |
| --- | ---------- |
| Beyansız rota | **F3 senaryosu**: yeni panel rotası eklendi, kimse kapsamı düşünmedi |
| Ölü beyan | Rota silindi, "kapsanıyor" satırı kaldı (ADVISORY-001'in ölü override dersi) |
| Kanıt kaynakta yok | Test silindi/yeniden yazıldı, harita "kapsanıyor" demeye devam ediyor |
| Lighthouse beyanı ≠ `lighthouserc.json` | Ölçülen URL listesi değişti, harita eskidi |
| Gerekçesiz "kapsanmıyor" | Boşluk yazılı ama sebebi yok |
| Sabit kayması | `TWO_FACTOR_SETUP_PATH` başka bir rotaya çözülüyor |
| Sanal rota gerçek oldu | `/api/v1/panel/islem` bir gün yazılırsa beyan taşınmalı |

**Neden "kanıt" alanı var:** kapsam haritası kanıtsız olsaydı bir **niyet
beyanı** olurdu — testi silen kişi haritayı güncellemez, harita "kapsanıyor"
demeye devam eder ve kapı sessizce yalan söyler. T-019b/K3'teki "vakum hâlinde
yeşil" tuzağının kapsam haritasındaki karşılığı.

Türetici ayrıca **kendini kanıtlıyor**: geçici bir kurgu ağaçta grup dizini,
dinamik segment, yakalama-tümü, metadata ve bileşen dosyaları ayırt ediliyor
(`src/**` dosyalarına dokunmadan).

### Mutasyonla doğrulama

| # | Mutasyon | Sonuç |
| - | -------- | ----- |
| 1 | `src/app/(panel)/panel/medya/page.tsx` **gerçekten** eklendi | ❌ "KAPSAM beyanı olmayan rota: `/panel/medya`" — dosya yolunu ve ne yapılacağını yazdı |
| 2 | Rotası olmayan beyan satırı eklendi | ❌ "Rotası silinmiş KAPSAM satırı" |
| 3 | Kanıt dizesi kaynakta olmayacak şekilde değiştirildi | ❌ "beyan edilen kanıt kaynaklarda YOK" |
| 4 | `/cv` satırına `lighthouse` eklendi | ❌ `['/', '/cv']` ≠ `['/']` |
| 5 | "kapsanmıyor" gerekçesi silindi | ❌ "Gerekçesiz kapsanmıyor" |
| 6 | Disk eşiği 0.001 yapıldı (sağlıklı dal zorlandı) | ❌ `Expected 200, Received 503` — sağlıklı dal iddiaları canlı |
| 7 | İletişim ucunun yolu bozuldu | ❌ "uç sunulmuyor ya da beklenmedik durum kodu: 404" |

1 numara gerçek bir dosyayla yapıldı ve geri alındı; 2-5 kapı dosyasında, 6-7
E2E dosyasında — hepsi geri alındı, `git status` yalnızca eklenen iki test
dosyasını gösteriyor.

### F3'te yeni panel rotası eklendiğinde ne olur

1. `pnpm test` **kırmızı** olur: *"KAPSAM beyanı olmayan rota: `/panel/medya` →
   `src/app/(panel)/panel/medya/page.tsx`"*.
2. Ekleyen kişi `tests/unit/rota-kapsami.test.ts` → `KAPSAM`'a bir satır yazar:
   hangi kapı dokunuyor, **kanıtı ne**, ne **ölçülmüyor**.
3. "Hiçbiri" geçerli bir cevaptır — `kapilar: ['kapsanmiyor']` + gerekçe. Boşluk
   kapanmamış olur ama **görünür** olur; kapsam kararı unutulmuş değil, verilmiş
   olur.
4. E2E kapsamı beyan edildiyse kanıt dizesi gerçekten `tests/e2e/**` içinde
   aranır — beyan tek başına yetmez.

CI değişikliği gerekmedi: `rota-kapsami.test.ts` `pnpm test` içinde,
`api-routes.spec.ts` `pnpm test:e2e` içinde kendiliğinden koşuyor.

---

## §9/6 ve §9/2 uçtan uca (T-039)

**Tarih:** 2026-09-09 · **Dosyalar:** `tests/e2e/panel-yayin.spec.ts`,
`tests/e2e/iletisim-akisi.spec.ts` · **Ölçüm:** yerel, gerçek Postgres + üretim
derlemesi, iki profilde (masaüstü + mobil), tam paket **85/85**.

### §9/6 — panelden yayınla → public'te görün

Zincir: panel formu → `createProjectAction` (auth → Zod → servis → AuditLog →
`revalidateTag`) → `/projeler` → `/projeler/<slug>`.

**Testin en kritik satırı ölçüm değil, HAZIRLIK:** proje eklenmeden önce iki
istek atılıyor.

```
GET /projeler          → liste önbelleğe girer      (content:project:tr)
GET /projeler/<slug>   → 404 SONUCU önbelleğe girer (content:project:tr:<slug>)
```

Isıtma olmadan bu test, etiket düşürme **tamamen bozulsa bile** yeşil kalırdı:
önbellekte girdi yoksa ekleme sonrası ilk okuma zaten veritabanına gider. Yani
"yeşil" olurdu ama ölçtüğü şey ADR-029 değil, önbelleğin boşluğu olurdu — görev
kartının uyardığı tuzak birebir bu. Isıtma, testi gerçekten bir kapı yapıyor.

### §9/6 mutasyon kanıtı — `src/server/actions/tags.ts` geçici olarak bozuldu

Üç mutasyon, her biri ayrı bir derleme + koşum. Dosya her seferinde md5 ile
doğrulanarak geri alındı (`6991fb038d41a089fc47bab18db592c9`, üç kez de eşleşti;
`git diff src/server/actions/tags.ts` boş).

| # | Mutasyon | Beklenen | Sonuç |
| - | -------- | -------- | ----- |
| 1 | `revalidateContent` hiçbir etiketi düşürmüyor | kırmızı | ❌ **kırmızı** — "liste BAYAT kalır ve proje bir saat görünmez" (`Expected true, Received false`) |
| 2 | `slugTag` unutuldu, `localeTag` düşüyor | kırmızı sanıyordum | ✅ **YEŞİL** — ölçüm beklentiyi düzeltti, aşağıya bak |
| 3 | `localeTag` unutuldu, `slugTag` düşüyor | kırmızı | ❌ **kırmızı** — liste bayat |

1 ve 3 numara kapının tuttuğunu gösteriyor: **`localeTag` düşürmeyi bozan her
değişiklik yakalanıyor.** Bir yayın akışının sessizce bir saatlik gecikmeye
dönüşmesi artık merge kapısına takılır.

### Ölçülen: `slugTag` bu senaryoda GÖZLEMLENEBİLİR DEĞİL

2 numaralı mutasyonun yeşil kalması bir arıza değil, ölçülmüş bir olgu ve sebebi
`cached.ts`'te yazılı: detay önbellek girdisi **üç etiketi birden** taşıyor.

```ts
tags: [entityTag('project'), localeTag('project', locale), slugTag('project', locale, slug)]
```

Yani `localeTag` düşürmek detay girdisini de düşürüyor. `contentTagsToDrop` ise
her çağrıda `localeTag`i mutlaka üretiyor (`tagTargetsFor` her zaman
`after.locale` ekliyor). Sonuç: **bugün hiçbir kod yolu `slugTag`i tek başına
düşürmüyor**, dolayısıyla `slugTag`in kaldırılması davranışı değiştirmiyor ve
hiçbir E2E bunu göremez.

Bunun iki sonucu var ve ikisi de yazılı olmalı:

1. **`tags.ts`'teki gerekçe fazla iddialı.** Yorum şöyle diyor: *"Yalnızca
   `localeTag` düşürmek yeni kaydı listede gösterir ama KENDİ SAYFASINDA bir
   saat boyunca 404 bırakır."* Ölçüm bunun tersini söylüyor — detay girdisi
   `localeTag` taşıdığı için o 404 kalmıyor. `slugTag` **savunma katmanı**
   olarak doğru (ileride yalnızca tek kaydı düşüren dar bir işlem yazılırsa
   gerekecek), ama bugünkü gerekçesi yanlış. Düzeltmesi Backend'in (`src/**`).
2. **Katman kapısız kalmıyor:** `slugTag`in üretildiğini Backend'in birim testi
   doğruluyor (`tests/unit/actions/content-tags.test.ts` → `toEqual([localeTag,
   slugTag])`). E2E'nin göremediğini birim testi görüyor; kapsam haritasının
   "hangi kapı neyi ölçüyor" ayrımı burada işe yarıyor.

**Ters yön de ölçülüyor:** TASLAK kayıt panelden eklendiğinde `/projeler`
listesinde görünmüyor ve detayı 404 dönüyor. Bu olmadan "her şeyi gösteren" bir
uygulama da yukarıdaki testi geçerdi.

### AÇIK BEKLEME — §9/6'nın literal hâli (DRAFT → PUBLISHED) → **T-044g'de KAPANDI**

> **Kapanış (2026-09-19):** T-043f panel listesini `fetchProjectsForPanel`e
> (ham, önbeleksiz, tüm durumlar) çevirdi — ENGEL-1 ortadan kalktı. Bekleyen
> iddia `panel-yayin.spec.ts`e eklendi ve `updateProjectAction` yolunun etiket
> hesabı AYRI bir mutasyonla sınandı. Aşağıdaki özgün metin, beklemenin neden
> açıldığını anlatmak için duruyor.

Senaryo "bir projeyi DRAFT'tan PUBLISHED'a çevir" diyor. **Bugün panelden
yapılamıyor:** panel listesi `getPublishedProjects` okuyor, yani taslak kayıt
eklendiği anda listeden kayboluyor ve düzenlenecek satır kalmıyor (Frontend'in
kendi notu: `panel/icerik/projeler/page.tsx` → ENGEL-1). Bu bir test kısıtı
değil, **ürün kısıtı**.

Ölçülen yol, aynı zincirden geçen ve bugün yapılabilen yol: panelden doğrudan
"Yayında" durumunda kayıt açmak. Etiket hesabı ekleme ve güncellemede aynı
(`revalidateContent` + `tagTargetsFor`), yani sınanan mekanizma değişmiyor.
**Panel tüm durumları listeleyebildiği gün** eklenecek adım tek satır: listeden
taslağı aç, durumu "Yayında" yap, aynı üç iddiayı tekrarla.

### §9/2 — ziyaretçi mesajı: üç halka kapalı, dördüncüsü bekliyor

| # | Halka | Durum |
| - | ----- | ----- |
| 1 | `/iletisim` formu (gerçek tarayıcı) | ✅ ölçülüyor |
| 2 | `POST /api/v1/iletisim` | ✅ ölçülüyor |
| 3 | `ContactMessage` kaydı | ✅ ölçülüyor (ad/e-posta/mesaj birebir, `isSpam=false`, `spamScore=0`, okunmamış, arşivsiz, `userAgent` yazılı) |
| 4 | Panel mesaj kutusu **EKRANI** | ⏳ AÇIK BEKLEME (T-039'da) → **T-043g'de KAPANDI**, bkz. aşağıdaki T-043g bölümü |

Dördüncü halka için **elden gelen son adım ölçülüyor**: ekranın besleneceği
okuma yolu (`fetchContactMessages`, T-038) mesajı gerçekten görüyor mu? Filtre
elle yazılmıyor, `contactMessageFilterSchema.parse({})` ile üretiliyor — yani
ölçülen filtre, ekranın kullanacağı varsayılan filtrenin ta kendisi. Ekran
yazıldığında geriye tek iddia kalıyor: "liste bu satırı gösteriyor mu".

**Yarım bırakılan kısım TODO DEĞİL:** `test.skip`/`test.fixme` kullanılmadı —
atlanan test CI'daki "atlanan test yok" nöbetini (T-005b) kırmızıya çevirir ve
haklı olarak: atlanan test, unutulmuş bir kapıdır. Bekleme bu kayıtta ve spec
başlığında yazılı.

**Zaman tuzağı testin parçası:** Playwright formu milisaniyelerde doldurur;
beklemeseydik §8.15'in `tooFast` sinyali tetiklenir ve test gerçek bir
ziyaretçinin yaşamadığı yolu ölçerdi. Ölçüldü — ilk denemede jetonu alıp anında
gönderen ikinci istek sunucu logunda `spam sinyali … puan=30, sinyaller=tooFast`
üretti; bekleme eklendikten sonra puan **0**. `spamScore === 0` iddiası bu
yüzden değerli: honeypot ya da zaman tuzağı yanlış pozitif üretmeye başlarsa
kayıt yine açılır ama panelde **spam kutusuna** düşerdi — kapı bunu yakalar.

### Test izolasyonu — iki projede paralel koşan paket

İlk yazımda temizlik ortak `e2e-t039` önekine dayanıyordu. `fullyParallel: true`
ve yerelde birden çok işçi olduğu için bu, **bir projenin `afterAll`ının diğer
projenin hâlâ kullandığı kaydı silmesi** demekti — sıraya bağlı, açıklaması zor
kırılma sınıfı (`clearAllLoginAttempts` notundaki hatanın aynısı). Anahtar
süreç kimliği + zaman damgasına çevrildi; `globalTeardown` ortak öneke bakan
emniyet ağı olarak kaldı ve her koşumda `artık proje: 0, mesaj: 0` yazıyor.

Temizlik neden şart: ADR-030 seed'i **ölçüm sözleşmesi** sayıyor. Test verisi
depoda kalsaydı `/projeler` koşum başına bir çöp kayıt biriktirir ve bir gün
Lighthouse ölçümünün girdisi olurdu.

### §9'un yedi senaryosu — bugünkü tablo

| # | Senaryo | Durum | Kanıt / eksik |
| - | ------- | ----- | ------------- |
| 1 | Ana sayfa → proje → detay → Kıyı Medya CTA | ⚠️ **kısmi** | Ana sayfa (duman) ve detay (sitemap taraması + §9/6) ölçülüyor; **karttan detaya tıklama ve CTA zinciri ölçülmüyor** |
| 2 | İletişim formu → mesaj panele düşer | ⚠️ **kısmi** | Üç halka kapalı; **panel ekranı bekliyor** |
| 3 | Yanlış şifre / doğru şifre + 2FA | ✅ kapalı | `auth.spec.ts` (T-016) |
| 4 | Girişsiz `/panel` → login | ✅ kapalı | `smoke.spec.ts` + `auth.spec.ts` |
| 5 | Panelden gelir kaydı → dashboard toplamı | ❌ açık | Finans modülü F4/F5'te; ölçülecek akış henüz yok |
| 6 | Panelden proje yayınla → public'te görün | ✅ **kapalı (T-039)** | `panel-yayin.spec.ts`, üç mutasyonla sınandı |
| 7 | Mobil görünümde ana sayfa ve panel kullanılabilir | ⚠️ **kısmi** | Ana sayfa mobil profilde ölçülüyor; **panel formu artık mobilde de koşuyor** (§9/6 ve §9/2 `mobile-chrome`'da geçti) ama panelin gezinme/kullanılabilirlik iddiaları yazılmadı |

**Sayı: 3 kapalı, 3 kısmi, 1 açık.** T-039 öncesi 2 kapalıydı (3 ve 4).
*(T-043g bu tabloyu güncelledi — güncel sayaç aşağıdaki T-043g bölümünde.)*

---

## §9/2'nin dördüncü halkası kapandı + KVKK sınırı (T-043g)

**Tarih:** 2026-09-15 · **Dosyalar:** `tests/e2e/iletisim-akisi.spec.ts` (genişletildi),
`tests/e2e/panel-mesaj-kvkk.spec.ts` (yeni) · **Ölçüm:** yerel, gerçek Postgres +
üretim derlemesi, iki profilde.

### Zincirin son halkası

T-039'da **açık bekleme** olarak işaretlenen tek iddia bağlandı: ziyaretçinin
gönderdiği mesaj artık panelde **görüldüğü** için kapalı sayılıyor.

| Ne | Nasıl ölçülüyor |
| -- | --------------- |
| Satır DOM'da | `[data-mesaj-satir][data-mesaj-id="<id>"]` — **bileşik** seçici |
| Liste yalnızca önizleme taşıyor | Mesaj bilerek 160 karakterden uzun; kuyruğundaki imza listede **yok**, detayda **var** |
| Okunmamış rozeti | `/\d+ okunmamış/` görünür |
| Tam gövde | Satıra tıklanıp `/panel/mesajlar/<id>`'ye gidiliyor |

**Bileşik seçici bilinçli:** `[data-mesaj-satir]` ve `[data-mesaj-id]` ayrı ayrı
sorulsaydı, kimliği taşıyan başka bir düğüm (ileride bir önizleme kartı) testi
yanlışlıkla yeşil tutabilirdi. İkisinin **aynı düğümde** olması iddianın kendisi.

**Mesaj neden uzatıldı:** kısa bir gövdede `preview` ile tam metin aynı dizeye
eşit olurdu; "listede önizleme, detayda tam gövde" iddiası iki farklı sözleşmeyi
aynı veriyle doğrulamış, yani hiçbir şey ölçmemiş olurdu.

**`?gorunum=hepsi` — Frontend'in önerisi, kabul edildi.** `gelen` görünümü spam
olmayanları süzüyor; iddia oraya bağlansaydı `spamScore` hesabı bozulduğunda
**iki** kırmızı çıkardı ("mesaj listede yok" + "spamScore ≠ 0") ve asıl sebep
ikinci satırda kalırdı. Süzmeyen görünüm iki arızayı iki ayrı yerde tutuyor.
`spamScore === 0` iddiası T-039'daki gerekçesiyle korunuyor.

**Mutasyonla doğrulandı:**

| # | Mutasyon | Sonuç |
| - | -------- | ----- |
| 1 | Liste `?gorunum=arsiv`'e çevrildi (mesaj orada değil) | ❌ kırmızı — "gönderilen mesaj panel listesinde görünmeli" |
| 2 | "Liste tam gövdeyi taşımalı" diye ters çevrildi | ❌ kırmızı — `preview` sözleşmesi iddiası canlı |

### KVKK / RSC yükü — Frontend'in düzeltmesi hakkındaki karar

Frontend kendi yorumunun yanlış olduğunu ölçüp raporladı: "Göster/Gizle" düğmesi
bir **yetki sınırı değil**; veri prop olarak geçtiği için `ip`/`userAgent` detay
rotasının RSC yükünde düğme kapalıyken de duruyor.

**Kendi ölçümüm (ikinci ölçüm, `panel-mesaj-kvkk.spec.ts`):**

| Nerede | `userAgent` işareti | `ip` işareti |
| ------ | ------------------- | ------------ |
| Liste rotasının ham gövdesi (`?gorunum=hepsi`) | **yok** | **yok** |
| Detay rotasının ham gövdesi (düğme KAPALI) | **var** | var |
| Detay ekranı, düğme kapalı | görünmüyor | görünmüyor |
| Detay ekranı, "Göster" sonrası | görünüyor | görünüyor |

Ölçüm gerçek kişisel veriyle yapılmıyor: mesaj `User-Agent: E2E-KVKK-SONDA-…` ve
`X-Forwarded-For: 203.0.113.42` (RFC 5737 belgeleme bloğu) başlıklarıyla
gönderiliyor, aranan dizeler testin ürettiği uydurma değerler. `127.0.0.1`
seçilmedi — temel adres olduğu için sayfada başka sebeple geçerdi.

**KARAR: kabul edilebilir.** Gerekçe üç maddede:

1. **Yetki sınırı doğru yerde.** Detay rotası kimliği doğrulanmış + 2FA geçmiş
   tek kullanıcıya açık; o kullanıcı veriyi görmeye zaten yetkili. §8.20'nin
   konusu yetkisiz tarafa sızıntıdır ve burada yetkisiz taraf yok.
2. **Asıl sınır liste/detay ayrımı ve o GERÇEKTEN duruyor** — `LIST_SELECT` iki
   sütunu hiç çekmiyor, bağımsız ölçümüm bunu doğruladı. Yüzlerce satırlık bir
   listede KVKK alanlarını taşımamak, veri minimizasyonunun uygulandığı yer.
3. **Düğmenin işi perde olmak ve bunu yapıyor.** Omuz üstünden bakış / ekran
   paylaşımı gerçek bir risk; çözümü de ekranda göstermemek.

**Ama bir şart var ve kapıya yazıldı:** düğmeye "veriyi getirir" anlamı
yüklenemez. Testteki iddia bu yüzden "detay yükünde **BEKLENİYOR**" diye yazıldı
— ölçülen gerçeği kapıya yazmak, uygulamanın yapmadığı bir sözü kapıya yazmanın
yerine geçiyor. Biri yarın veriyi gerçekten sunucuda tutmak isterse (ayrı bir
Server Action ile istek üzerine getirmek) bu satır kırmızıya döner ve kararın
yeniden verilmesi gerektiğini söyler.

**Kapıya bağlanan asıl şey:** Backend bir gün `LIST_SELECT`e `ip` eklerse liste
yükünde sızıntı başlar ve **hiçbir birim testi bunu görmezdi** — DTO tipleri
derlenmeye devam ederdi. Artık E2E görüyor.

**Mutasyonla doğrulandı (sızıntı kontrolünün gerçekten gördüğü):** liste
kontrolü, işaretin GERÇEKTEN bulunduğu gövdeye (detay) çevrildiğinde ❌ kırmızı
— "LİSTE yükünde userAgent var — `LIST_SELECT` sınırı delinmiş".

### Kendi testimde yakalanan vakum — iki yanlış deneme kayda geçiyor

Sızıntı kontrolü ilk iki yazımda **vakumda yeşildi** ve bunu ancak "bu gövde
gerçekten bizim satırımızı içeriyor mu" kontrolü ortaya çıkardı:

| Deneme | Neden hiçbir şey ölçmüyordu |
| ------ | --------------------------- |
| `request` fixture'ı ile ham istek | Tarayıcının çerezlerini taşımıyor → panel isteği `/giris`e yönleniyor, "işaret yok" sonucu **giriş sayfasından** geliyordu |
| `page.request` ile ham istek | Yönlendirmeleri İZLİYOR → oturum geçmese bile `/giris` gövdesiyle **200** dönüyor; durum kodu kontrolü bu yüzden yetmiyor |

Çözüm: ham gövde **gezinme yanıtından** okunuyor (`response.text()`), üstüne iki
kontrol daha — `page.url()` hâlâ `/panel/mesajlar` mı, ve gövde mesaj kimliğini
içeriyor mu. "Aranan şeyin bulunmaması" ancak doğru sayfaya bakıldığında
anlamlı; kişisel veri sızıntısını ölçtüğünü sanan ama giriş sayfasına bakan bir
kapı, olmamasından daha kötüdür.

Yan not: ilk "doğru sayfa" işareti olarak ekrandaki bir metin ("okunmamış")
denendi ve tutmadı — RSC yükünde Türkçe karakterler `\uXXXX` kaçışlarıyla
taşınıyor. Ham gövdede düz metin aramak yanıltıcı; kimlik (ASCII) doğru işaret.

### §9'un yedi senaryosu — T-043g sonrası

| # | Senaryo | Durum | Kanıt / eksik |
| - | ------- | ----- | ------------- |
| 1 | Ana sayfa → proje → detay → Kıyı Medya CTA | ✅ **kapalı (T-044g)** | `ziyaretci-akisi.spec.ts` — zincir + CTA sözleşmesi, mutasyonla sınandı |
| 2 | İletişim formu → mesaj panele düşer | ✅ **kapalı (T-043g)** | `iletisim-akisi.spec.ts` — dört halka, iki mutasyon |
| 3 | Yanlış şifre / doğru şifre + 2FA | ✅ kapalı | `auth.spec.ts` |
| 4 | Girişsiz `/panel` → login | ✅ kapalı | `smoke.spec.ts` + `auth.spec.ts` |
| 5 | Panelden gelir kaydı → dashboard toplamı | ❌ açık | Finans modülü F4/F5'te |
| 6 | Panelden proje yayınla → public'te görün | ✅ kapalı (T-039) | `panel-yayin.spec.ts`, üç mutasyon |
| 7 | Mobil görünümde ana sayfa ve panel kullanılabilir | ⚠️ kısmi | §9/2 ve §9/6 `mobile-chrome`'da da koşuyor; panelin gezinme/kullanılabilirlik iddiaları yazılmadı |

**Sayı: 4 kapalı, 2 kısmi, 1 açık.** (T-039 sonrası 3 kapalıydı.)
*(T-044g bu tabloyu güncelledi — güncel sayaç aşağıda.)*

### ⚠️ `latest` etiketi "kararlı" demek DEĞİL — üç canlı örnek

`pnpm.overrides` tablosunun yanında duran bu uyarı, ADVISORY-001'in `nanoid`
tuzağının genelleştirilmiş hâli: orada açık uçlu bir aralık **6.0.1**'e
çözülmüştü (üç majör atlama, ESM-only). Aynı sınıf tuzak bugün **dist-tag**
üzerinden karşımızda — 2026-09-13 ölçümü:

| Paket | Bizde | `latest` | Not |
| ----- | ----- | -------- | --- |
| `prisma` | 7.9.1 | **8.0.0-rc.14** | `latest` bir **RC**'yi gösteriyor; kararlı hat `prev: 7.10.0` |
| `vitest` | 4.1.11 | **5.0.0** | T-042g'de Orkestra Şefi yamalı yama sürümüne sabitledi |
| `next` | 15.5.25 | **16.3.4** | 16'ya geçiş ayrı bir görev (F6) |

**Kural:** `pnpm add <paket>@latest` / `pnpm update <paket>` bir güvenlik
düzeltmesi için yazılmaz. Danışma kapatılırken hedef sürüm **yamalı sürümdür**,
`latest` değil; ve yazıldıktan sonra `pnpm why` ile çözülen sürüm okunur.
`prisma@latest`in bir RC'yi göstermesi bunun neden kural olması gerektiğini tek
başına anlatıyor: tek bir komut, üretim veri katmanını yayın öncesi koda taşırdı.

Bu uyarı ADVISORY-002'nin kaldırma koşuluyla da doğrudan ilgili: oradaki "kararlı
Prisma 8" beklentisi, `latest` etiketine bakarak **yanlışlıkla sağlanmış**
sayılabilirdi.

---

## ADR-034 taraması: `buildDiff` başka nereden sızabilir (T-044g)

**Tarih:** 2026-09-19 · **Sonuç:** bugün sızıntı **yok**; bir risk kalıbı var
(**BULGU-019**) · **Yöntem:** on bir `buildDiff` çağrı yeri + `buildDiff`
kullanmayan yedi elle yazılmış `diff` tek tek okundu, sonra emniyet ağının
davranışı **çalıştırılarak** ölçüldü.

### Emniyet ağının gerçek kapsamı — üçüncü bağımsız ölçüm

Backend ve Orkestra Şefi ayrı ayrı ölçtü; ben de kendi sondamla ölçtüm.
Yeni bilgi: **iç içe ve dizi içindeki BİLİNEN adlar maskeleniyor** (özyineleme
çalışıyor, döngü koruması var) — yani ADR-034'ün sınırı "yalnızca en üst
seviye" değil, tam olarak **ad bilgisi**:

| Girdi | Çıktı | Yorum |
| ----- | ----- | ----- |
| `{ password, passwordHash }` | `[REDACTED]` ×2 | bilinen ad ✓ |
| `{ deleted: { passwordHash } }` | `{"deleted":{"passwordHash":"[REDACTED]"}}` | **iç içe de maskeleniyor** ✓ |
| `{ rows: [{ token }] }` | `[REDACTED]` | dizi içinde de ✓ |
| `{ yeniSifre, pass }` | **sızıyor** | bilinmeyen ad ✗ |
| `{ note: 'sifre: …' }` | **sızıyor** | değere gömülü ✗ |
| `{ deleted: { yeniSifre } }` | **sızıyor** | iç içe + bilinmeyen ad ✗ |
| döngüsel yapı | `[REDACTED]` | sonsuz döngüye girmiyor ✓ |

Bu ölçüm ADR-034'ü **doğruluyor ve daraltıyor**: sorun özyineleme eksikliği
değil, adın bilinmesi gerekliliği. `REDACTED_KEYS` listesine bakmadan alan adı
seçen herkes, farkında olmadan ağın dışına çıkabiliyor.

### Bugünkü çağrı yerleri — hiçbiri sır taşımıyor

| Yol | Diff'e giren | Değerlendirme |
| --- | ------------ | ------------- |
| `project` / `post` (create/update/archive) | `slug`, `locale`, `title`, `status` | Kimlik alanları; MDX içeriği **bilerek dışarıda** |
| `experience` / `service` / `skill` (create/update) | `organization`/`role`/tarihler, `title`/`ctaUrl`/`order`, `name`/`category`/`level` | Public içerik |
| `contact-message` (durum eylemleri) | `isRead`, `isSpam`, `repliedAt`, `archivedAt` | **Yalnızca durum** — gövde/e-posta girmiyor ✓ |
| `job` (dönüşüm) | `contactMessageId`, `jobTitle`, `jobStatus`, `clientId`, `clientCreated` | Ad/e-posta **açık gerekçeyle** dışarıda ✓ |
| `totp` (üç eylem) | `context`, sayaçlar | Secret/kod girmiyor ✓ |
| `password` | `{ context: 'CHANGE_PASSWORD', changed: 'passwordHash' }` | `buildDiff` **bilerek kullanılmamış** ✓ |
| `profile` | `headline`, `location`, **`socials`** | ⚠️ `socials` serbest biçimli JSON — bkz. BULGU-019 |

---

## BULGU-019 — Silme denetimlerinde `diff: { deleted: before }` satırın TAMAMINI yazıyor

**Önem:** Düşük (bugün sızıntı yok, gelecek riski) · **Görev:** T-044g (bulan)
**Durum:** AÇIK — düzeltme sahibi **Backend** · **İlgili:** ADR-034

`experience`, `skill` ve `service` silme eylemleri denetim kaydına **silinen
satırın tamamını** yazıyor:

```ts
diff: { deleted: before }
```

Gerekçesi yazılı ve **makul**: "`buildDiff(before, {})` boş bir fark üretirdi;
burada saklanmak istenen 'ne değişti' değil 'ne kayboldu' — denetim kaydı bu
eylemde kaydın TEK kalan izi." Aynı şekilde `profile` eyleminde serbest biçimli
`socials` alanı diff'e giriyor.

**Bugün sorun değil:** üç model de public içerik taşıyor (yetenek adı, hizmet
başlığı, deneyim kaydı) ve ölçüm iç içe bilinen adların maskelendiğini gösterdi.

**Riskin kendisi gelecekte:** bu kalıp, ADR-034'ün "sır diff'e hiç konmaz"
kuralını **alan seçimini modele devrederek** uyguluyor. Bu modellerden birine
yarın bir `apiAnahtari`, `webhookSecret` ya da serbest metin `not` alanı
eklendiğinde:

- yeni alan `REDACTED_KEYS` listesinde **olmayacak** (ada bağlılık),
- silme diff'i onu **otomatik olarak** taşıyacak (alan listesi yok, tüm satır var),
- ve hiçbir test bunu görmeyecek — tip sistemi de görmez, çünkü `before` zaten
  o modelin tipinde.

Yani ADR-034'ün "iki kez kuruldu" dediği varsayım burada **üçüncü kez**
kurulmaya hazır duruyor.

**Öneri (düzeltme Backend'in):** silme diff'i de tıpkı create/update yolları
gibi **alanları tek tek** saysın (`{ deleted: { id, name, category, level } }`).
Aynı gerekçeyi ("ne kayboldu") korur, ama alan seçimini **açık** hâle getirir —
yeni bir sütun eklendiğinde denetim kaydına sessizce girmez. `profile.socials`
için de aynı soru sorulmalı: serbest JSON diff'e girmeli mi, yoksa yalnızca
anahtar adları mı yazılmalı?

---

## Şifre değiştirme hız sınırı — KARAR: GEREKLİ (T-044g)

**Karar:** evet, sınır konmalı. **Ama asıl gerekçe brute-force değil.**

### Tehdit modeli — neyin sınırlandığı önemli

Bu uç kimliği doğrulanmış oturum ister; saldırgan zaten paneldeyse "şifreyi
tahmin etmesi" yeni bir yetki kazandırmaz. İki gerçek gerekçe var:

**1. KAYNAK TÜKETİMİ — ölçüldü.** §8.2 gereği `argon2id` bilerek pahalı
(`memoryCost` 19 MiB, `timeCost` 3). Yanlış şifre doğrulamasının maliyeti:

```
p50 = 31 ms/deneme   →  ~33 deneme/saniye/çekirdek
her deneme 19 MiB bellek ayırıyor  →  50 eşzamanlı istek ≈ 1 GB
```

Tek bir oturum, sınırsız döngüyle üretim kutusunun (Coolify, birkaç vCPU)
CPU'sunu ve belleğini doyurabilir. §8.15'in iletişim formuna hız sınırı koyma
gerekçesi **birebir aynıdır** ve orada saldırgan kimliksizdi bile.

**2. Yetki yükseltme.** Çalınmış bir oturumla mevcut şifre tahmin edilirse
saldırgan şifreyi değiştirir ve **asıl sahibi kilitler**. "Oturumu var, zaten her
şeyi yapabilir" doğru değil: hesabın kalıcı kontrolü ayrı bir eşik.

### Önerilen politika

| Boyut | Değer | Gerekçe |
| ----- | ----- | ------- |
| Sayaç anahtarı | **kullanıcı** (IP değil) | `LoginAttempt` IP başına §8.4'ün kaynağı; kullanıcı kendi girişinden kilitlenmemeli (Backend'in notu doğru) |
| Kaynak | `AuditLog`: `LOGIN_FAILED` + `diff.context = 'CHANGE_PASSWORD'` | Backend zaten yazıyor; yeni tablo/kolon gerekmiyor |
| Eşik / pencere | **5 başarısız / 15 dk** | `TOTP_SETUP_RATE_LIMIT` ile aynı kalıp — üçüncü bir eşik sayısı icat etmemek |
| Aşımda | §7.2 zarfı + `RATE_LIMITED`, denetim kaydı | Sessiz başarısızlık teşhisi zorlaştırır |
| Sıfırlama | Başarılı değişiklikten sonra pencere temizlenir | Meşru kullanıcı hata yapıp sonra doğrusunu girdiğinde cezalandırılmasın |

**Sınırın kendisi de ölçülmeli:** eşiğin 6. denemede tuttuğunu ve 5.'de
tutmadığını gösteren bir sınır testi (§8.4'ün "dört deneme kilitlemez" testinin
kardeşi) — o test olmadan eşik bir temenni olur.

**Uygulama Backend'in** (`src/**` bu görevin kapsamı dışında).

---

## BULGU-020 — Şifre değişikliği ele geçirilmiş oturumu KAPATMIYOR

**Önem:** Orta · **Görev:** T-044g (ölçen) · **Durum:** AÇIK — **T-046'nın gövdesi**
**PROGRAM.md:** §8.3 · **İlgili ADR:** 013 (JWT), 011

Şifre değiştirmek, dağıtılmış JWT'leri geçersiz kılmıyor: sunucuda oturum kaydı
yok, jeton kendi kendini doğruluyor. Çalınan bir çerez, şifre değişse bile
**ömrü dolana kadar (7 gün) geçerli.**

Backend kolon **eklemedi** ve bu doğruydu: hiçbir şeyin okumadığı bir
`sessionsValidFrom` kolonu, oturumların kapatıldığı **yanılsamasını** üretirdi —
bu depoda tekrar eden en pahalı hata sınıfı (T-018 `NavItem.hazir`, BULGU-010'un
"vakumda yeşil" dalı).

### Ölçümler — öneriyi bunlar şekillendiriyor

**1. Ara katman Edge'de ve veritabanını GERÇEKTEN okuyamıyor.** Geçici olarak
`src/middleware.ts` içine `db` içe aktarıldı ve derleme denendi:

```
Module build failed: UnhandledSchemeError: Reading from "node:crypto" …
Module build failed: UnhandledSchemeError: Reading from "node:fs" …   (os, path, module)
> Build failed because of webpack errors
```

T-014/K1 doğrulandı (mutasyon geri alındı, md5 eşleşiyor). Ara katmanda
`sessionsValidFrom` kontrolü **mümkün değil**; `middleware.ts`te `runtime` beyanı
da yok, yani Edge varsayılanı geçerli.

**2. Panel SAYFALARI `auth()` çağırmıyor.** Ölçüldü: tüm depoda üç `await auth()`
var (`actions/_shared.ts` → `currentActorId`, `actions/totp.ts`, bir de örnek
kod bloğu). `(panel)` altındaki **tek** çağıran `ayarlar/guvenlik`. Panel düzeni
de çağırmıyor.

> **Bunun sonucu, Backend'in "kısmi" dediği şeyin tam tanımı:** `auth()` içine
> konacak bir kontrol **YAZMALARI** kapatır (tüm Server Action'lar
> `currentActorId`den geçiyor), **OKUMALARI kapatmaz** — panel sayfaları
> yalnızca ara katmanla korunuyor ve ara katman DB okuyamıyor. Çalınan jetonla
> panel **okunmaya devam eder**.

**3. Kontrolün maliyeti küçük ama mimari özelliği değiştiriyor.** Gerekecek
asgari sorgu yerel olarak ölçüldü (200 koşu, ısınma hariç):

```
p50 = 0.49 ms   p95 = 0.92 ms   p99 = 1.29 ms
```

Mutlak maliyet düşük; asıl bedel "normal istek yolu veritabanına gitmez"
özelliğinin (ADR-011/ADR-013) kaybı.

### T-046 için öneri — üç katman, ikisi hemen

**(A) Oturum ömrünü kısalt — HEMEN, en ucuz.** §8.3'ü 7 günden **24 saate**
çekmek maruziyet penceresini 7×24 saatten 24 saate indirir; kod değişikliği tek
sabit, ölçüm gerektirmez, hiçbir yeni sorgu getirmez. Tek bedeli: kullanıcı daha
sık giriş yapar — **tek kullanıcılı bir panelde** kabul edilebilir. Bu, tek
başına bile boşluğu %85 daraltır.

**(B) `sessionsValidFrom` + `auth()` kontrolü — DÜRÜSTÇE "KISMİ".** Kolon
eklenir, jeton `iat`i ondan eskiyse `currentActorId` `null` döner. **Kapsamı
yazılı olmalı:** yazmalar kapanır, okumalar kapanmaz. Kolonun adı bile bunu
söylemeli (`writesValidFrom` gibi) ya da kayıt bunu açıkça yazmalı — aksi hâlde
Backend'in kaçındığı yanılsama geri gelir.

**(C) Okumaları da kapatmak — pahalı, F6'ya.** İki yolu var ve ikisi de bedelli:
panel sayfalarının her birine `auth()` eklemek (unutulabilir, kapı gerekir), ya
da ara katmanı Node çalışma zamanına almak (Next 15.5'te deneysel). İkincisi
seçilirse kontrol **yalnızca `isPanelPath` için** koşmalı: matcher neredeyse tüm
yolları kapsıyor ve public sayfalara istek başına bir sorgu eklemek ADR-011'in
tüm önbellekleme çabasını geri alırdı.

**Sıra önerisi:** (A) bu turdan sonraki ilk fırsatta · (B) T-046'da, kapsamı
yazılı olarak · (C) F6/T-060 civarında, CSP işiyle birlikte.

**Ölçülmeyen:** üretim kutusunda sorgu gecikmesi (yerel ölçüm 0.49 ms; Coolify
iç ağında farklı olabilir) ve Node ara katmanının soğuk başlatma maliyeti.

---

## §9 sayacı — T-044g sonrası: **5 kapalı · 1 kısmi · 1 açık**

| # | Senaryo | Durum | Kanıt / eksik |
| - | ------- | ----- | ------------- |
| 1 | Ana sayfa → proje → detay → Kıyı Medya CTA | ✅ **kapalı (T-044g)** | `ziyaretci-akisi.spec.ts`; kart slug'ı seed'den okunuyor, CTA `data-proje` ile tıklanan projeye bağlanıyor, `target`/`rel` sözleşmesi ve gerçek tıklama ölçülüyor |
| 2 | İletişim formu → mesaj panele düşer | ✅ kapalı (T-043g) | `iletisim-akisi.spec.ts`, dört halka |
| 3 | Yanlış şifre / doğru şifre + 2FA | ✅ kapalı | `auth.spec.ts` |
| 4 | Girişsiz `/panel` → login | ✅ kapalı | `smoke.spec.ts` + `auth.spec.ts` |
| 5 | Panelden gelir kaydı → dashboard toplamı | ❌ açık | Finans modülü F4/F5'te |
| 6 | Panelden proje yayınla → public'te görün | ✅ kapalı (T-039) + **literal hâli T-044g** | `panel-yayin.spec.ts`: ekleme yolu, taslak sızıntısı, **ve artık DRAFT→PUBLISHED geçişi** |
| 7 | Mobil görünümde ana sayfa ve panel kullanılabilir | ⚠️ kısmi | §9/1, §9/2 ve §9/6 `mobile-chrome`'da da geçiyor; panelin gezinme/kullanılabilirlik iddiaları hâlâ yazılmadı |

### §9/1 — dış bağlantı ölçülürken üçüncü tarafa istek atılmıyor

CTA gerçekten tıklanıyor (öznitelik doğru olup bağlantının tıklanamaz olması
mümkün: üstte bir katman, `pointer-events: none`), ama `kiyimedya.com`a giden
istek yerel bir taslak yanıtla karşılanıyor. İki sebep: üçüncü tarafın sitesini
her CI koşumunda yoklamak doğru değil, ve o site yavaşladığında **bizim
kapımız** kırmızıya dönerdi.

`abort()` önce denendi ve yetmedi — iptal edilen gezinme sekmeyi
`chrome-error://chromewebdata/` adresinde bırakıyor, yani istenen adres
kayboluyor ve iddia ölçemeyeceği bir şeye bakıyordu. Bunun yerine **isteğin
kendisi kaydediliyor** (tarayıcının gerçekten o adrese gittiğinin kanıtı).

`rel="noopener"` iddiası biçimsel değil güvenlik iddiasıdır: `target="_blank"`
ile açılan sayfa `window.opener` üzerinden bizi başka bir adrese yönlendirebilir
(tabnabbing). Öznitelik silindiğinde hiçbir şey görünür biçimde bozulmaz — tam
da kapıya yazılması gereken sınıf.

**Mutasyon:** kart seçicisi "Tüm projeler" bağlantısına çevrildi → ❌ kırmızı
("kart kendi projesinin detayına gitmeli"), yani zincir gerçekten ölçülüyor.

---

## §8 Güvenlik Gereksinimleri — Durum Tablosu

**Ölçüm tarihi:** 2026-09-19 · **Faz:** F3 (sürüyor) · **Son görev:** T-044g
· **Dağılım:** ✅ 10 · ⚠️ 6 · ❌ 0 · ⏳ 9

> T-039'da üç satır **bayat çıktığı için** güncellendi (6, 8 ve 15): ikisi
> "henüz Server Action yok" diyordu, oysa action'lar T-031'de gelmişti. Tablo
> da kod gibi eskiyor; her turda dokunulan maddeler yeniden okunuyor.

Durum kodları: ✅ sağlandı · ⚠️ kısmi · ❌ eksik · ⏳ henüz uygulanmadı (fazı gelmedi)

| # | Madde | Durum | Kanıt / Not |
| - | ----- | ----- | ----------- |
| 1 | Credentials + TOTP 2FA; kurulum ilk girişte zorunlu | ✅ | **Mekanizma** (T-016): doğru TOTP → panel, yanlış kod reddediliyor, kurtarma kodu çalışıyor ve tüketiliyor. **Zorunluluk kapısı** (T-019): `tfa !== true` olan oturum panelin hiçbir bölümüne giremiyor, `/panel/ayarlar/guvenlik`'e yönleniyor; kurulum ekranı muaf (döngü yok), panel API'si `403 FORBIDDEN`, çıkış yolu açık, ara katman DB'ye bakmıyor. **Besleme** (T-013e): jeton `tfa` taşıyor — girişte ve kurulum sonrası tazelemede yazılıyor, değer **veritabanından** okunuyor. **Geçiş penceresi kapatıldı** (T-019b): alan yoksa da kuruluma yönlendiriliyor. Uçtan uca ölçüldü: 2FA'sız gerçek giriş → kurulum ekranı; 2FA'lı gerçek giriş → panel. Kapı devre dışı bırakılınca **18 birim testi kırılıyor**. |
| 2 | argon2id ≥19MB / ≥2 iterasyon | ⏳ | F1 / T-013 · `argon2@0.45.1` kurulu |
| 3 | Çerez `httpOnly`/`secure`/`sameSite:lax`/7 gün | ⏳ | F1 / T-013 |
| 4 | Giriş 5/15dk/IP + 15dk kilit + log | ✅ | **Uçtan uca çalışıyor.** "log" → `LoginAttempt` her denemeyi yazıyor (T-013b). "kilit" → politika `src/lib/security/rate-limit.ts` (eşikler tek sabitte: 5 deneme / 15 dk pencere / 15 dk kilit, 20 birim testi), giriş akışına T-013c'de bağlandı, **T-016'da gerçek tarayıcıyla doğrulandı**: 5. yanlış şifrede `lockedUntil` yazılıyor, kilitliyken doğru şifre bile reddediliyor, 4 denemede kilitlenmiyor. BULGU-005 kapandı. |
| 5 | `middleware.ts` `/panel/*` + `/api/v1/panel/*` korur | ✅ | **T-014 ile gerçek koruma kuruldu.** `/panel/*` oturumsuzken `/giris`'e yönlenir (307), `/api/v1/panel/*` §7.2 zarfıyla **401 JSON** döner. Oturum `getToken` ile **kriptografik olarak doğrulanır** (çerez varlığı yeterli değil), Edge'de çalışır. `AUTH_SECRET` yoksa **kapalı yönde başarısız olur**. 32 test. §8.6 uyarısı için aşağıya bakın. |
| 6 | Her Server Action ayrıca `auth()` | ⚠️ | **Satır bayattı — Server Action'lar T-031'de geldi.** `src/server/actions/*` hepsi `currentActorId()` ile başlıyor ve oturum yoksa servise HİÇ gitmeden `UNAUTHORIZED` dönüyor; Backend'in birim testi bunu TÜM içerik action'ları için tek tek dolaşıyor (`tests/unit/actions/content-actions.test.ts` → "oturum YOKSA hepsi UNAUTHORIZED döner ve servise HİÇ gitmez"). **T-039'da yetkili yol uçtan uca ölçüldü**: gerçek oturumla panelden proje yayınlandı, kayıt DB'ye düştü. ⚠️ kalma sebebi: oturumSUZ bir action çağrısı gerçek tarayıcıyla ölçülmedi — birim testi taklit (`auth` mock'lu) üzerinden konuşuyor. |
| 7 | Panel `X-Robots-Tag: noindex, nofollow` + robots.txt disallow | ⚠️ | **Başlık ✅** — birim + E2E ile doğrulandı, gerçek sunucu yanıtında ölçüldü. **`robots.txt` ❌** — henüz yok, T-028 (Backend) kapsamında; `/panel` için `Disallow` içermeli. |
| 8 | Her girdi Zod ile (Server Action parametreleri dahil) | ⚠️ | **Satır bayattı.** Action'lar ham girdiyi `parseOrFail(<şema>, raw)` ile geçiriyor (§7.1 sırası: auth → Zod → servis → AuditLog → revalidateTag) ve `/api/v1/iletisim` ucu da aynı şemayı kullanıyor. **T-039'da uçtan uca ölçüldü**: panel formundan geçen kayıt DB'ye doğru alanlarla yazıldı; bozuk gövde `400 VALIDATION_ERROR` ile reddedildi (`api-routes.spec.ts`, T-016b). ⚠️ kalma sebebi: altı varlığın tamamı için şema kapsamı birim testlerinde; E2E yalnızca `Project` ve `ContactMessage` yollarını ölçüyor. |
| 9 | MDX/HTML `rehype-sanitize` | ⏳ | F2 / T-025 · `rehype-sanitize@6.0.0` kurulu |
| 10 | Prisma dışı SQL yok; `$queryRaw` onaya tabi | ✅ | El yazımı `$queryRaw`/`$executeRaw`/`*Unsafe` **çağrısı yok** (tarandı; tek eşleşmeler üretilmiş istemcinin tip tanımları ve `db.ts`'teki açıklama satırı). `pingDatabase()` bilinçli olarak `pool.connect()` kullanıyor — ham SQL'e hiç gerek kalmadı (T-003b K2). |
| 11 | Yükleme doğrulaması, ≤10MB, private R2, imzalı URL | ⏳ | F3 / T-037 |
| 12 | HTTPS + HSTS | ⚠️ | **Mantık ✅ ve test edildi**: yalnızca üretim + HTTPS'te ekleniyor, yerelde eklenmiyor. `preload` **bilerek YOK** — geri alınamaz ve `panel.` alt alan adı kararı (Q1) verilmedi. F7/T-072'de eklenecek. Gerçek TLS F7. |
| 13 | CSP nonce tabanlı, script'te `unsafe-inline` yok | ⏳ | **F6 / T-060 — bilinçli erteleme.** React Bits (§5) kurulmadan CSP yazmak F2'de ya çöker ya taviz verdirir (STATUS.md R1). CSP'nin **yokluğu** E2E ile doğrulanıyor; T-060 o beklentiyi tersine çevirecek, yani sessizce unutulamaz. |
| 14 | `X-Frame-Options` / `nosniff` / `Referrer-Policy` / `Permissions-Policy` | ✅ | Dördü de `src/lib/security/headers.ts` içinde tek noktada; `/` ve `/panel` gerçek yanıtlarında ölçüldü. `X-Powered-By` de kapalı (`next.config.ts`). |
| 15 | İletişim formu 3/saat + honeypot + zaman tuzağı | ✅ | **Üçü de kurulu ve ölçüldü.** *Honeypot:* `website` alanı dolu gelirse mesaj SAKLANIR ama `honeypotHit`/`isSpam` işaretlenir (birim: `tests/unit/api/iletisim.test.ts`). *Zaman tuzağı:* `CONTACT_TIME_TRAP.minFillSeconds = 3`; **T-039'da canlı ölçüldü** — jetonu alıp anında gönderen istek sunucu logunda `spam sinyali … puan=30, sinyaller=tooFast` üretti, üç saniye bekleyen gerçek ziyaretçi akışında puan **0**. *Saatlik sınır:* IP başına 3 (`CONTACT_RATE_LIMIT`), aşımda `429` + `Retry-After`. **T-039 yanlış pozitif yönünü de ölçtü**: meşru ziyaretçi spam'e düşmüyor (`isSpam=false`, `spamScore=0`) ve ikinci meşru mesaj reddedilmiyor — sınırın gereğinden dar olmadığı gösterildi. **E2E'de ölçülmeyen tek dal:** 429'un kendisi. Ölçmek için üç kayıt daha yazmak gerekirdi; eşik saf politika ve birim testlerinde kapalı — kapıya değeri kadar bedel ödetilmedi. |
| 16 | Yükleme uçları 10/dk | ⏳ | F3 / T-037 |
| 17 | `.env` repoya girmez, `.env.example` tam | ✅ | `.gitignore:22-24` — `.env` ve `.env.*` yasaklı, `.env.example` istisna. `.env.example` §12'nin anahtarlarını değersiz listeliyor (T-001 doğrulaması). |
| 18 | `NEXT_PUBLIC_` içinde sır yok, CI'da taranır | ✅ | **Otomatik tarama kuruldu** (T-005): `tests/unit/public-env.test.ts` — üç katman: (a) `.env.example`, (b) çalışma ortamı `process.env`, (c) `.next/` derleme çıktısı. `pnpm test` içinde koştuğu için hem yerelde hem CI'da otomatik. **Dedektör kendini kanıtlıyor**: 10 ekili sahte sır (GitHub/AWS/Stripe/JWT/argon2/PEM/bağlantı dizesi) yakalanıyor, meşru URL'ler yanlış pozitif vermiyor. Fiilen doğrulandı: `.env.example`'a `NEXT_PUBLIC_GITHUB_TOKEN=ghp_…` ekildi → hat **KIRMIZI**, geri alındı → **YEŞİL**. |
| 19 | Panel mutasyonları `AuditLog`'a | ⚠️ | **Merkezî yardımcı geldi** (T-015): `src/server/services/_shared/audit.ts` → `writeAuditLog`, `diff` üzerinde otomatik redaksiyonla (§8.20). Kullananlar: 2FA eylemleri (`actions/totp.ts`), hesap kilidi (ADR-022) ve F3'ten beri tüm içerik/mesaj/iş eylemleri. Kilit kaydı T-016'da üretim yolunda **fiilen tetiklendi**. ⚠️ **ADR-034 (T-044g):** `redactAuditDiff` bir **EMNİYET AĞI**, koruma değil — ada bağlı çalışır. Asıl kural: sır `diff`e HİÇ KONMAZ. T-044g taraması: `buildDiff` kullanan on bir çağrı yerinin hiçbiri bugün sır taşımıyor, ama üç silme eylemi SİLİNEN SATIRIN TAMAMINI yazıyor (**BULGU-019**). ⚠️ kalma sebebi: muhasebe mutasyonları henüz yazılmadı (F4–F5). |
| 20 | Loglarda şifre/token/TOTP/tam e-posta yok | ⚠️ | Sağlık ucu §8.20'ye uyuyor (T-003b'de tarandı: altyapı izi 0 eşleşme) ve bu T-016b'de **kapıya bağlandı** (`api-routes.spec.ts` → bağlantı dizesi / yığın izi / dosya yolu / ortam değişkeni adı desenleri). `writeAuditLog` `diff` üzerinde otomatik redaksiyon yapıyor (T-015) — ama **ADR-034'ten sonra bu bir KORUMA değil EMNİYET AĞIDIR** ve belgede artık öyle anılıyor: ada bağlı çalıştığı için bilmediği adı ({`yeniSifre`}, {`pass`}) ve masum bir anahtarın DEĞERİNE gömülü sırrı geçirir (üç ayrı ajan ölçtü, aynı sonuç). **T-043g — YANIT YÜKÜ de artık ölçülüyor:** KVKK kapsamındaki `ip`/`userAgent` yalnızca detay rotasının yükünde; liste rotasının ham gövdesinde ikisi de YOK (`panel-mesaj-kvkk.spec.ts`, bağımsız ikinci ölçüm, mutasyonla sınandı). ⚠️ kalma sebebinin GÜNCEL hâli (T-044g): T-043g'de "merkezî redaksiyon yardımcısı yok" yazmıştım; yardımcı aslında var (`redactAuditDiff`) ve asıl gerekçe **ADR-034**: redaksiyon **ada bağlı**, yani bilinmeyen alan adlarını ve değere gömülü sırları yakalayamaz. Bunu bir "koruma" saymak, tam da ADR-034'ün yasakladığı güven. Ayrıca uygulama loglarının (`console.error` vb.) kendisi için hâlâ merkezî bir redaksiyon yok. |
| 21 | Gece 03:00 şifreli `pg_dump` → R2, 30 gün | ⏳ | T-066 / T-073 · **Uyarı:** yol haritası F6/F7 diyor; gerçek muhasebe verisi F4'te girilmeye başlıyor. Yedeksiz geçen her F4 günü, başka kopyası olmayan mali veri riski. |
| 22 | `restore.md` + en az bir prova | ⏳ | T-066 |
| 23 | Yedek checksum doğrulaması | ⏳ | T-066 |
| 24 | `npm audit` merge kapısı | ✅ | **Kuruldu** (T-005): `.github/workflows/ci.yml` → `bagimlilik-denetimi` işi, `pnpm audit --audit-level high` (ADR-003 gereği `npm` değil `pnpm`). Yüksek **ve** kritik kapsanır. Depo şu an temiz (her seviyede 0 açık). Kapının kırmızıya döndüğü ayrı bir izole projede kanıtlandı: `lodash@4.17.11` + `minimist@1.2.0` → 9 açık (2 kritik, 3 yüksek) → **EXIT 1**. Ayrıca yabancı kilit dosyası kontrolü de aynı işte. **T-005c — kapı gerçek bir advisory'de tetiklendi ve tuttu:** `nanoid` GHSA-2v37-7h3g-55p8 (Yüksek, geçişli, 9 yol) kodda hiçbir değişiklik yokken hattı kırmızıya çevirdi; `pnpm.overrides` ile kapandı, EXIT 0. Artık yalnızca izole projede değil, **kendi deposunda** kanıtlı. Tekrarlayan advisory'ler için oyunkitabı yazıldı (kaldırma koşulu + altı aylık gözden geçirme dahil). **T-029c — kapı artık HAFTALIK da koşuyor** (`schedule: '17 6 * * 1'`, Pazartesi 09:17 TRT): advisory'ler kod değişmeden yayınlandığı için yalnızca push/PR'da koşan bir denetim, sessiz geçen bir hafta boyunca yüksek bir açığı fark etmez. Zamanlanmış koşumda diğer iki iş `if: github.event_name != 'schedule'` ile atlanır. **T-005d — kapı ikinci kez tetiklendi ve bu kez düzeltilemedi:** `deepmerge-ts` GHSA-ggr8-5vv4-36mx (Yüksek, geçişli, 3 yol, hepsi `prisma` CLI zinciri). Yama majör sınırının ötesinde ve üst paket sürümü tam sabitliyor → oyunkitabı **katman D**. Kapı artık `pnpm audit --json` çıktısını okuyan bir betikten geçiyor: yalnızca **süreli ve kayıtlı** istisnalar tolere ediliyor (ADVISORY-002, bitiş **2026-11-22**), süre dolunca / yol değişince / istisna gereksizleşince kapı **kırmızı**. Altı kırılma dalının hepsi mutasyonla ayrı ayrı doğrulandı. `pnpm.auditConfig` bilerek kullanılmadı — süresizdir. **T-042g — kapı ÜÇÜNCÜ kez gerçek bir olayda tetiklendi ve üçünde de doğru davrandı:** iki günlük boşlukta yayımlanan danışmalar (`mysql2`, `fast-uri`×4, `js-yaml`; ayrıca Orkestra Şefi'nin kapattığı iki KRİTİK `next` RCE'si) kod değişmeden hattı kırmızıya çevirdi. Üçü de kapatıldı (A/A/B), kapı **EXIT 0**. Mekanizmanın kendisi de sınandı: `deepmerge-ts` istisnası tolere edildi (70 gün kaldı) ve altı kırmızı dal (istisnasız advisory · süresi dolmuş istisna · ölü istisna · değişmiş yol · yanlış paket · ayrıştırılamayan çıktı) mutasyonla yeniden doğrulandı. |
| 25 | Yeni bağımlılık onay + DECISIONS kaydı | ✅ | T-004'ün 9 paketi görev kartında adı adına onaylı. **T-005 ve T-006b `package.json`'a hiçbir paket eklemedi** — `@lhci/cli` bilinçli olarak `pnpm dlx @lhci/cli@0.15.1` ile ephemeral çağrılıyor (yalnızca CI aracı, uygulama bağımlılığı değil; sürüm sabit, `latest` kullanılmıyor). **T-006b:** tüm GitHub eylemleri Node 24 hedefleyen güncel kararlı majora taşındı — `checkout@v7`, `setup-node@v7`, `cache@v6`, `upload-artifact@v7`, `pnpm/action-setup@v6`. Yamasız çalışma zamanı bırakmama gerekçesi ADR-008 ile aynı hat. |

**Özet:** ✅ 9 · ⚠️ 4 · ❌ 0 · ⏳ 12

✅ = 1, 4, 5, 10, 14, 17, 18, 24, 25 · ⚠️ = 7, 12, 19, 20 · geri kalan 12 madde ⏳

*T-019'a göre değişim: **§8.1 ⚠️→✅** — BULGU-008 kapandı, kapı üretimde tetikleniyor.*

### §8.1 — zincirin tamamı kapalı

PROGRAM.md §8.1, T-016/T2 önerisi kabul edilerek düzeltildi: zorunluluk
gevşetilmedi, **kurulum anına taşındı**. Zincirin üç halkası da yerinde:

| Halka | Nerede | Durum |
| ----- | ------ | ----- |
| `tfa !== true` → panelin hiçbir bölümü kullanılamaz | `src/middleware.ts` | ✅ |
| Kurulum ekranı muaf — döngü yok | `two-factor.ts` | ✅ |
| `/api/v1/panel/*` → `403 FORBIDDEN` (yönlendirme değil) | `src/middleware.ts` | ✅ |
| Çıkış yolu açık — kurulum zorunlu ama hapis değil | matcher dışı `/api/auth/*` | ✅ |
| Ara katman DB'ye bakmıyor (Edge — T-014/K1) | `session.ts` | ✅ |
| Jeton `tfa` taşıyor (giriş + tazeleme, değer DB'den) | `src/server/auth/**` (T-013e) | ✅ |
| Alan yoksa kapı KAPANIR (geçiş penceresi kapalı) | `two-factor.ts` (T-019b) | ✅ |

**Neden ✅ hak edildi:** Her halka ayrı ayrı ölçüldü, yalnız "kod yazıldı" diye
işaretlenmedi. Kapı devre dışı bırakılınca **18 birim testi** kırılıyor; gerçek
tarayıcıda 2FA'sız giriş kurulum ekranına, 2FA'lı giriş panoya varıyor.
E2E'deki gevşek `/\/panel/` desenleri de sıkılaştırıldı — kurulum ekranı da
`/panel/...` altında olduğu için o desen iki varış noktasına birden uyuyor ve
testler yanlış yere varsa bile yeşil kalırdı.

### §8.6 — ara katmanın NE GARANTİ ETMEDİĞİ

§8.5'in ✅ olması §8.6'yı karşılamaz; ikisi ayrı maddedir ve **§8.6 hâlâ ⏳**.

`src/middleware.ts` bir **kolaylık katmanıdır**, yetkilendirme sınırı değil.
Söylediği tek şey: istekte `AUTH_SECRET` ile çözülebilen bir oturum jetonu var.

**Söylemedikleri:**

| Soru | Ara katman bilir mi? |
| ---- | -------------------- |
| Kullanıcı hâlâ var mı? | ❌ JWT bağımsızdır, kullanıcı silinse de 7 gün geçerli (ADR-013) |
| Hesap kilitli mi (`lockedUntil`)? | ❌ DB'ye bakmaz |
| 2FA tamamlanmış mı? | ✅ **Biliyor** — jetondaki `tfa` alanından (T-019 + T-013e). Bu, listedeki tek istisna: değer girişte ve tazelemede DB'den yazıldığı için ara katman DB'ye bakmadan karar verebiliyor. |
| Bu kayda erişim hakkı var mı? | ❌ Kayıt bazlı yetki hiç sorulmaz |

Ayrıca **Server Action'lar matcher'dan geçmez** — kendi başlarına birer HTTP
ucudur ve ara katman onları hiç görmez. Bu yüzden §8.6 değişmeden yürürlüktedir:
**her Server Action ve her Server Component kendi `auth()` kontrolünü ayrıca
yapar.** Bir Server Action'da `auth()` çağrısını "middleware zaten koruyor"
gerekçesiyle atlamak, korumasız bir uç bırakır.

### `jsdom` sürüm notu — ADR-008 sonrası güncel karar

T-004'te açılan soru ADR-008 ile kapandı: proje **Node 22 LTS**'e geçti
(yerelde `v22.23.2`, `.nvmrc` = `22`, `engines.node` = `">=22.11.0"`).

ADR-008 `jsdom` sabitlemesinin kaldırılmasını T-005'in kararına bıraktı.
**Sabitleme KORUNDU (`jsdom@26.1.0`)** — gerekçe:

`jsdom@30` `engines: ^22.22.2 || ^24.15.0 || >=26.0.0` istiyor. Bizim
`engines.node` ise `">=22.11.0"`. Yani **Node 22.11–22.21 aralığı bizim
beyanımıza uyuyor ama jsdom 30'a uymuyor.** O aralıktaki bir geliştirici (veya
ileride o aralığa sabitlenmiş bir koşucu) `engines` kapısından geçer, sonra
bileşen testleri anlaşılmaz bir `webidl` hatasıyla çöker. `jsdom@26` ise
`node >=18` istiyor — beyan ettiğimiz aralığın **tamamını** kapsıyor.

Yükseltme ancak `engines.node` de `">=22.22.2"` yapılırsa tutarlı olur; bu
ADR-008'in yazdığı değeri değiştirmek demek, dolayısıyla Orkestra Şefi kararı.
Şu hâliyle bir eksiklik yok: `jsdom@26` Node 22 üzerinde sorunsuz çalışıyor
(31 birim + bileşen testi yeşil).

### Sürüm senkronu nasıl korunuyor (ADR-008)

Üç kaynak var ve CI **her koşuda** aynı olduklarını doğruluyor:

| Kaynak | Değer | Kim okur |
| ------ | ----- | -------- |
| `.nvmrc` | `22` | `nvm use` / `fnm`, GitHub Actions `node-version-file` |
| `package.json` → `engines.node` | `">=22.11.0"` | pnpm kurulum kapısı |
| Çalışan Node | `v22.23.2` | — |

`.github/workflows/ci.yml` → **"Sürüm senkronu"** adımı üçünün ana sürümünü
karşılaştırır ve saparsa işi düşürür. Fiilen doğrulandı: `.nvmrc` geçici olarak
`20` yapıldı → adım **EXIT 1** (`ADR-008 ihlali: .nvmrc (20) ile engines (22)
ana sürümü farklı`), geri alındı → **EXIT 0**.

T-070'te `Dockerfile` taban imajı (`node:22-alpine`) bu üçlüden sapmamalı;
Docker'ın kendi kontrolü o görevde eklenecek.
