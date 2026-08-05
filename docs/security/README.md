# docs/security — Güvenlik Denetim Günlüğü

> Sahibi: **Güvenlik & Test** ajanı (PROGRAM.md §10.1).
> Bulgular başka ajanların dosyalarında olsa bile buraya yazılır; **düzeltmeyi
> Güvenlik ajanı yapmaz** — Orkestra Şefi ilgili ajana görev açar (§10.1 sınır kuralı).

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

**Önem:** Orta
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

## §8 Güvenlik Gereksinimleri — Durum Tablosu

**Ölçüm tarihi:** 2026-08-05 · **Faz:** F0 · **Son görev:** T-005

Durum kodları: ✅ sağlandı · ⚠️ kısmi · ❌ eksik · ⏳ henüz uygulanmadı (fazı gelmedi)

| # | Madde | Durum | Kanıt / Not |
| - | ----- | ----- | ----------- |
| 1 | Credentials + TOTP 2FA zorunlu | ⏳ | F1 / T-013 |
| 2 | argon2id ≥19MB / ≥2 iterasyon | ⏳ | F1 / T-013 · `argon2@0.45.1` kurulu |
| 3 | Çerez `httpOnly`/`secure`/`sameSite:lax`/7 gün | ⏳ | F1 / T-013 |
| 4 | Giriş 5/15dk/IP + 15dk kilit + log | ⏳ | F1 / T-014 |
| 5 | `middleware.ts` `/panel/*` + `/api/v1/panel/*` korur | ⚠️ | **Matcher yerinde ve test edildi**, ancak koruma şu an YALNIZCA yol tabanlı — kimlik doğrulaması YOK (Auth.js F1'de). `/panel` hâlâ herkese açık. Yetki kontrolü T-014. |
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
| 19 | Panel mutasyonları `AuditLog`'a | ⏳ | F1 / T-015 |
| 20 | Loglarda şifre/token/TOTP/tam e-posta yok | ⚠️ | Sağlık ucu §8.20'ye uyuyor (T-003b'de tarandı: altyapı izi 0 eşleşme). Merkezî bir redaksiyon yardımcısı **henüz yok** — F1'de `src/lib/security/` altına yazılacak. |
| 21 | Gece 03:00 şifreli `pg_dump` → R2, 30 gün | ⏳ | T-066 / T-073 · **Uyarı:** yol haritası F6/F7 diyor; gerçek muhasebe verisi F4'te girilmeye başlıyor. Yedeksiz geçen her F4 günü, başka kopyası olmayan mali veri riski. |
| 22 | `restore.md` + en az bir prova | ⏳ | T-066 |
| 23 | Yedek checksum doğrulaması | ⏳ | T-066 |
| 24 | `npm audit` merge kapısı | ✅ | **Kuruldu** (T-005): `.github/workflows/ci.yml` → `bagimlilik-denetimi` işi, `pnpm audit --audit-level high` (ADR-003 gereği `npm` değil `pnpm`). Yüksek **ve** kritik kapsanır. Depo şu an temiz (her seviyede 0 açık). Kapının kırmızıya döndüğü ayrı bir izole projede kanıtlandı: `lodash@4.17.11` + `minimist@1.2.0` → 9 açık (2 kritik, 3 yüksek) → **EXIT 1**. Ayrıca yabancı kilit dosyası kontrolü de aynı işte. |
| 25 | Yeni bağımlılık onay + DECISIONS kaydı | ✅ | T-004'ün 9 paketi görev kartında adı adına onaylı. **T-005 `package.json`'a hiçbir paket eklemedi** — `@lhci/cli` bilinçli olarak `pnpm dlx @lhci/cli@0.15.1` ile ephemeral çağrılıyor (yalnızca CI aracı, uygulama bağımlılığı değil; sürüm sabit, `latest` kullanılmıyor). |

**Özet:** ✅ 6 · ⚠️ 4 · ❌ 0 · ⏳ 15

✅ = 10, 14, 17, 18, 24, 25 · ⚠️ = 5, 7, 12, 20 · geri kalan 15 madde ⏳

*T-004'e göre değişim (o zaman ✅ 4 · ⚠️ 5 · ⏳ 16 idi):*
*§8.18 ⚠️→✅ (tarama kuruldu ve kanıtlandı), §8.24 ⏳→✅ (audit kapısı kuruldu).*

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
