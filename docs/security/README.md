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

**Son gözden geçirme:** 2026-08-22 · **Sonraki:** 2026-11-22 (istisnanın bitişi)

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
| **A · Kilit tazeleme** | Üst paketin ilan ettiği aralık yamalı sürümü **zaten kapsıyor** (ör. `^3.3.17` ⊇ 3.3.18) | `pnpm update <paket> --recursive`. Override'a gerek yok. Tek risk: kilit yeniden sabitlenince geri gelmesi — bu yüzden `pnpm audit` CI'da koşmalı (koşuyor). |
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

## §8 Güvenlik Gereksinimleri — Durum Tablosu

**Ölçüm tarihi:** 2026-08-11 · **Faz:** F1 (kapandı) · **Son görev:** T-005b

Durum kodları: ✅ sağlandı · ⚠️ kısmi · ❌ eksik · ⏳ henüz uygulanmadı (fazı gelmedi)

| # | Madde | Durum | Kanıt / Not |
| - | ----- | ----- | ----------- |
| 1 | Credentials + TOTP 2FA; kurulum ilk girişte zorunlu | ✅ | **Mekanizma** (T-016): doğru TOTP → panel, yanlış kod reddediliyor, kurtarma kodu çalışıyor ve tüketiliyor. **Zorunluluk kapısı** (T-019): `tfa !== true` olan oturum panelin hiçbir bölümüne giremiyor, `/panel/ayarlar/guvenlik`'e yönleniyor; kurulum ekranı muaf (döngü yok), panel API'si `403 FORBIDDEN`, çıkış yolu açık, ara katman DB'ye bakmıyor. **Besleme** (T-013e): jeton `tfa` taşıyor — girişte ve kurulum sonrası tazelemede yazılıyor, değer **veritabanından** okunuyor. **Geçiş penceresi kapatıldı** (T-019b): alan yoksa da kuruluma yönlendiriliyor. Uçtan uca ölçüldü: 2FA'sız gerçek giriş → kurulum ekranı; 2FA'lı gerçek giriş → panel. Kapı devre dışı bırakılınca **18 birim testi kırılıyor**. |
| 2 | argon2id ≥19MB / ≥2 iterasyon | ⏳ | F1 / T-013 · `argon2@0.45.1` kurulu |
| 3 | Çerez `httpOnly`/`secure`/`sameSite:lax`/7 gün | ⏳ | F1 / T-013 |
| 4 | Giriş 5/15dk/IP + 15dk kilit + log | ✅ | **Uçtan uca çalışıyor.** "log" → `LoginAttempt` her denemeyi yazıyor (T-013b). "kilit" → politika `src/lib/security/rate-limit.ts` (eşikler tek sabitte: 5 deneme / 15 dk pencere / 15 dk kilit, 20 birim testi), giriş akışına T-013c'de bağlandı, **T-016'da gerçek tarayıcıyla doğrulandı**: 5. yanlış şifrede `lockedUntil` yazılıyor, kilitliyken doğru şifre bile reddediliyor, 4 denemede kilitlenmiyor. BULGU-005 kapandı. |
| 5 | `middleware.ts` `/panel/*` + `/api/v1/panel/*` korur | ✅ | **T-014 ile gerçek koruma kuruldu.** `/panel/*` oturumsuzken `/giris`'e yönlenir (307), `/api/v1/panel/*` §7.2 zarfıyla **401 JSON** döner. Oturum `getToken` ile **kriptografik olarak doğrulanır** (çerez varlığı yeterli değil), Edge'de çalışır. `AUTH_SECRET` yoksa **kapalı yönde başarısız olur**. 32 test. §8.6 uyarısı için aşağıya bakın. |
| 6 | Her Server Action ayrıca `auth()` | ⏳ | F1 / T-015 · Henüz Server Action yok |
| 7 | Panel `X-Robots-Tag: noindex, nofollow` + robots.txt disallow | ⚠️ | **Başlık ✅** — birim + E2E ile doğrulandı, gerçek sunucu yanıtında ölçüldü. **`robots.txt` ❌** — henüz yok, T-028 (Backend) kapsamında; `/panel` için `Disallow` içermeli. |
| 8 | Her girdi Zod ile (Server Action parametreleri dahil) | ⏳ | F1 / T-011 · `zod@4.4.3` kurulu |
| 9 | MDX/HTML `rehype-sanitize` | ⏳ | F2 / T-025 · `rehype-sanitize@6.0.0` kurulu |
| 10 | Prisma dışı SQL yok; `$queryRaw` onaya tabi | ✅ | El yazımı `$queryRaw`/`$executeRaw`/`*Unsafe` **çağrısı yok** (tarandı; tek eşleşmeler üretilmiş istemcinin tip tanımları ve `db.ts`'teki açıklama satırı). `pingDatabase()` bilinçli olarak `pool.connect()` kullanıyor — ham SQL'e hiç gerek kalmadı (T-003b K2). |
| 11 | Yükleme doğrulaması, ≤10MB, private R2, imzalı URL | ⏳ | F3 / T-037 |
| 12 | HTTPS + HSTS | ⚠️ | **Mantık ✅ ve test edildi**: yalnızca üretim + HTTPS'te ekleniyor, yerelde eklenmiyor. `preload` **bilerek YOK** — geri alınamaz ve `panel.` alt alan adı kararı (Q1) verilmedi. F7/T-072'de eklenecek. Gerçek TLS F7. |
| 13 | CSP nonce tabanlı, script'te `unsafe-inline` yok | ⏳ | **F6 / T-060 — bilinçli erteleme.** React Bits (§5) kurulmadan CSP yazmak F2'de ya çöker ya taviz verdirir (STATUS.md R1). CSP'nin **yokluğu** E2E ile doğrulanıyor; T-060 o beklentiyi tersine çevirecek, yani sessizce unutulamaz. |
| 14 | `X-Frame-Options` / `nosniff` / `Referrer-Policy` / `Permissions-Policy` | ✅ | Dördü de `src/lib/security/headers.ts` içinde tek noktada; `/` ve `/panel` gerçek yanıtlarında ölçüldü. `X-Powered-By` de kapalı (`next.config.ts`). |
| 15 | İletişim formu 3/saat + honeypot + zaman tuzağı | ⏳ | F2 / T-027 |
| 16 | Yükleme uçları 10/dk | ⏳ | F3 / T-037 |
| 17 | `.env` repoya girmez, `.env.example` tam | ✅ | `.gitignore:22-24` — `.env` ve `.env.*` yasaklı, `.env.example` istisna. `.env.example` §12'nin anahtarlarını değersiz listeliyor (T-001 doğrulaması). |
| 18 | `NEXT_PUBLIC_` içinde sır yok, CI'da taranır | ✅ | **Otomatik tarama kuruldu** (T-005): `tests/unit/public-env.test.ts` — üç katman: (a) `.env.example`, (b) çalışma ortamı `process.env`, (c) `.next/` derleme çıktısı. `pnpm test` içinde koştuğu için hem yerelde hem CI'da otomatik. **Dedektör kendini kanıtlıyor**: 10 ekili sahte sır (GitHub/AWS/Stripe/JWT/argon2/PEM/bağlantı dizesi) yakalanıyor, meşru URL'ler yanlış pozitif vermiyor. Fiilen doğrulandı: `.env.example`'a `NEXT_PUBLIC_GITHUB_TOKEN=ghp_…` ekildi → hat **KIRMIZI**, geri alındı → **YEŞİL**. |
| 19 | Panel mutasyonları `AuditLog`'a | ⚠️ | **Merkezî yardımcı geldi** (T-015): `src/server/services/_shared/audit.ts` → `writeAuditLog`, `diff` üzerinde otomatik redaksiyonla (§8.20). Kullananlar: 2FA eylemleri (`actions/totp.ts`) ve hesap kilidi (ADR-022 — denemeler `LoginAttempt`'e, sonuçlar `AuditLog`'a). Kilit kaydı T-016'da üretim yolunda **fiilen tetiklendi**. ⚠️ kalma sebebi: içerik/muhasebe mutasyonları henüz yazılmadı (F3–F5), yani "tüm mutasyonlar" ölçülemiyor. |
| 20 | Loglarda şifre/token/TOTP/tam e-posta yok | ⚠️ | Sağlık ucu §8.20'ye uyuyor (T-003b'de tarandı: altyapı izi 0 eşleşme). Merkezî bir redaksiyon yardımcısı **henüz yok** — F1'de `src/lib/security/` altına yazılacak. |
| 21 | Gece 03:00 şifreli `pg_dump` → R2, 30 gün | ⏳ | T-066 / T-073 · **Uyarı:** yol haritası F6/F7 diyor; gerçek muhasebe verisi F4'te girilmeye başlıyor. Yedeksiz geçen her F4 günü, başka kopyası olmayan mali veri riski. |
| 22 | `restore.md` + en az bir prova | ⏳ | T-066 |
| 23 | Yedek checksum doğrulaması | ⏳ | T-066 |
| 24 | `npm audit` merge kapısı | ✅ | **Kuruldu** (T-005): `.github/workflows/ci.yml` → `bagimlilik-denetimi` işi, `pnpm audit --audit-level high` (ADR-003 gereği `npm` değil `pnpm`). Yüksek **ve** kritik kapsanır. Depo şu an temiz (her seviyede 0 açık). Kapının kırmızıya döndüğü ayrı bir izole projede kanıtlandı: `lodash@4.17.11` + `minimist@1.2.0` → 9 açık (2 kritik, 3 yüksek) → **EXIT 1**. Ayrıca yabancı kilit dosyası kontrolü de aynı işte. **T-005c — kapı gerçek bir advisory'de tetiklendi ve tuttu:** `nanoid` GHSA-2v37-7h3g-55p8 (Yüksek, geçişli, 9 yol) kodda hiçbir değişiklik yokken hattı kırmızıya çevirdi; `pnpm.overrides` ile kapandı, EXIT 0. Artık yalnızca izole projede değil, **kendi deposunda** kanıtlı. Tekrarlayan advisory'ler için oyunkitabı yazıldı (kaldırma koşulu + altı aylık gözden geçirme dahil). **T-029c — kapı artık HAFTALIK da koşuyor** (`schedule: '17 6 * * 1'`, Pazartesi 09:17 TRT): advisory'ler kod değişmeden yayınlandığı için yalnızca push/PR'da koşan bir denetim, sessiz geçen bir hafta boyunca yüksek bir açığı fark etmez. Zamanlanmış koşumda diğer iki iş `if: github.event_name != 'schedule'` ile atlanır. **T-005d — kapı ikinci kez tetiklendi ve bu kez düzeltilemedi:** `deepmerge-ts` GHSA-ggr8-5vv4-36mx (Yüksek, geçişli, 3 yol, hepsi `prisma` CLI zinciri). Yama majör sınırının ötesinde ve üst paket sürümü tam sabitliyor → oyunkitabı **katman D**. Kapı artık `pnpm audit --json` çıktısını okuyan bir betikten geçiyor: yalnızca **süreli ve kayıtlı** istisnalar tolere ediliyor (ADVISORY-002, bitiş **2026-11-22**), süre dolunca / yol değişince / istisna gereksizleşince kapı **kırmızı**. Altı kırılma dalının hepsi mutasyonla ayrı ayrı doğrulandı. `pnpm.auditConfig` bilerek kullanılmadı — süresizdir. |
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
