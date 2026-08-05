# STATUS.md — Proje Durum Panosu

> Orkestra Şefi tarafından tutulur. Her ajan raporundan sonra güncellenir.
> Kaynak: `PROGRAM.md` §11 Yol Haritası.

**Son güncelleme:** 2026-08-05
**Aktif faz:** F0 — Temel
**Genel ilerleme:** 0 / 8 faz tamamlandı

---

## 1. Faz Özeti

| Faz | İçerik                                    | Ana ajan(lar)                 | Durum       |
| --- | ----------------------------------------- | ----------------------------- | ----------- |
| F0  | Temel — kurulum, token, tema, iskelet, CI | Backend + Frontend + Güvenlik | 🔵 Aktif    |
| F1  | Veri & Auth                               | Backend                       | ⚪ Bekliyor |
| F2  | Public İskelet                            | Frontend                      | ⚪ Bekliyor |
| F3  | Panel Çekirdek                            | Backend + Frontend            | ⚪ Bekliyor |
| F4  | İş & Muhasebe                             | Backend + Frontend            | ⚪ Bekliyor |
| F5  | Sağlık, Spor, Hayat                       | Backend + Frontend            | ⚪ Bekliyor |
| F6  | Sertleştirme                              | Güvenlik & Test               | ⚪ Bekliyor |
| F7  | Yayın                                     | Hepsi                         | ⚪ Bekliyor |

Durum kodları: ⚪ Bekliyor · 🔵 Aktif · 🟡 Kısmen · 🟢 Tamamlandı · 🔴 Engellendi

---

## 2. Faz Kırılımı ve Bağımlılık Sırası

### F0 — Temel 🔵

| #     | Görev                                                                                              | Ajan            | Bağımlılık          | Durum     |
| ----- | -------------------------------------------------------------------------------------------------- | --------------- | ------------------- | --------- |
| T-001 | Next.js 15 iskeleti, TS strict, toolchain, tüm F0 bağımlılıkları, klasör yapısı, `.env.example`    | Backend         | —                   | 🟢 Tamam  |
| T-002 | Tasarım token'ları, fontlar, tema anahtarı, public/panel layout iskeletleri, temel UI primitifleri | Frontend        | T-001               | 🟢 Tamam  |
| T-003 | Prisma bağlantısı, dev Postgres compose, ilk migration                                             | Backend         | T-001               | 🟡 Kısmen |
| T-003b | Sürücü adaptörü, `src/server/db.ts`, `/api/v1/health`, `postinstall`                              | Backend         | T-003 + ADR-005     | 🟢 Tamam  |
| T-004 | Vitest + Playwright iskeleti, `src/middleware.ts`, güvenlik başlıkları                             | Güvenlik & Test | T-003b              | 🟢 Tamam  |
| T-003c | **BULGU-002** düzeltmesi — `pg` havuzunu tembel kur (`.env`'siz build)                            | Backend         | T-004 bulgusu       | 🟢 Tamam  |
| T-005 | GitHub Actions CI + Lighthouse CI + Node 22 sabitlemesi                                            | Güvenlik & Test | T-003c              | 🟢 Tamam  |
| T-002b | **BULGU-003** — erişilebilirlik eşiği (kontrast + bağlantı ayırt edilebilirliği)                  | Frontend        | T-005 bulgusu       | 🔵 Aktif  |
| T-006 | Depoyu GitHub'a taşı, ilk gerçek CI koşusunu izle, `main` dal koruması                            | Kullanıcı + Güvenlik | T-005          | 🔴 Kullanıcı eylemi |

**Fiilen yürüyen sıra:** T-001 → (T-002 ∥ T-003) → T-003b → T-004 → T-003c → T-005 → (T-002b ∥ T-006)

**F0 kabul kapısı — güncel durum:**

| Kriter | Durum |
| ------ | ----- |
| `pnpm lint && typecheck && test && build` temiz | ✅ Node 22 altında doğrulandı |
| `pnpm test:e2e` — 24/24 | ✅ masaüstü + mobil |
| Koyu/aydınlık tema, FOUC yok | ✅ sunucuda basılıyor, 4 senaryo test edildi (ADR-010) |
| `/api/v1/health` DB'ye bağlanıyor | ✅ 200/503 ölçüldü |
| CI yeşil | ⚠️ **yerelde yeşil, GitHub'da hiç koşmadı** → T-006 |
| §1.1 K5 — WCAG AA | ❌ **A11y 0.92, hedef ≥0.95** → T-002b |

**F0 iki maddeyle kapanıyor: T-002b (erişilebilirlik) ve T-006 (ilk gerçek CI koşusu).**

---

### F1 — Veri & Auth ⚪

| #     | Görev                                                                                     | Ajan     | Bağımlılık   |
| ----- | ----------------------------------------------------------------------------------------- | -------- | ------------ |
| T-010 | Tam Prisma şeması (§6 tüm varlıklar) + ilk migration                                      | Backend  | T-003        |
| T-011 | Zod şema kütüphanesi — `src/lib/schemas/**` tüm varlıklar                                 | Backend  | T-010        |
| T-012 | `seed.ts` — admin kullanıcı, kategoriler, örnek içerik                                    | Backend  | T-010, T-011 |
| T-013 | Auth.js v5 Credentials + argon2id + TOTP 2FA                                              | Backend  | T-010        |
| T-014 | `middleware.ts` panel koruması + `X-Robots-Tag` + giriş hız sınırı                        | Güvenlik | T-013        |
| T-015 | Servis katmanı temeli: `services/` konvansiyonu, `AuditLog` yardımcısı, hata zarfı (§7.2) | Backend  | T-011, T-013 |
| T-016 | Auth birim + E2E testleri (§9 senaryo 3, 4)                                               | Güvenlik | T-013, T-014 |

**Sıra:** T-010 → T-011 → T-013 → (T-012 ∥ T-014) → T-015 → T-016
**Kabul kapısı:** Yanlış şifre reddediliyor, 2FA zorunlu, `/panel` girişsiz erişilemiyor, her mutasyon `AuditLog`'a yazıyor.

---

### F2 — Public İskelet ⚪

| #     | Görev                                                                      | Ajan     | Bağımlılık   |
| ----- | -------------------------------------------------------------------------- | -------- | ------------ |
| T-020 | React Bits kurulum düzeni + token uyumlama (`components/reactbits/`)       | Frontend | T-002        |
| T-021 | Ana sayfa: Hero, Hakkımda, Yetenekler (statik veri)                        | Frontend | T-020        |
| T-022 | Ana sayfa: Öne çıkan projeler, Hizmetler, İletişim bölümü + Kıyı Medya CTA | Frontend | T-021        |
| T-023 | `/hakkimda`, `/cv` (print stylesheet)                                      | Frontend | T-021        |
| T-024 | `/projeler`, `/projeler/[slug]` — filtre + detay şablonu                   | Frontend | T-020        |
| T-025 | `/blog`, `/blog/[slug]` — MDX render + `rehype-sanitize`                   | Frontend | T-020        |
| T-026 | `/hizmetler`, `/iletisim` (form UI, henüz submit yok)                      | Frontend | T-020        |
| T-027 | İletişim formu route handler + rate limit + honeypot + mail bildirimi      | Backend  | T-011, T-026 |
| T-028 | SEO: `sitemap.xml`, `robots.txt`, `rss.xml`, dinamik OG görseli            | Backend  | T-021        |
| T-029 | Lighthouse + axe denetimi, §5 sert kural kontrolü                          | Güvenlik | T-021…T-026  |

**Sıra:** T-020 → T-021 → T-022 → (T-023 ∥ T-024 ∥ T-025 ∥ T-026) → (T-027 ∥ T-028) → T-029

---

### F3 — Panel Çekirdek ⚪

| #     | Görev                                                                             | Ajan               | Bağımlılık   |
| ----- | --------------------------------------------------------------------------------- | ------------------ | ------------ |
| T-030 | İçerik servisleri: `Profile`, `Project`, `Post`, `Experience`, `Skill`, `Service` | Backend            | T-015        |
| T-031 | İçerik Server Actions + `AuditLog` + `revalidatePath`                             | Backend            | T-030        |
| T-032 | Panel layout: Sidebar, Topbar, breadcrumb, boş/yükleniyor/hata desenleri          | Frontend           | T-002, T-013 |
| T-033 | Panel dashboard — özet kartlar (`CountUp`), bugünün planı                         | Frontend           | T-032, T-030 |
| T-034 | `/panel/icerik/projeler` + `/panel/icerik/deneyim` CRUD ekranları                 | Frontend           | T-031, T-032 |
| T-035 | `/panel/icerik/blog` — MDX editör + önizleme                                      | Frontend           | T-031, T-032 |
| T-036 | `/panel/icerik/profil` — hero metni, bio, sosyaller, CV dosyası                   | Frontend           | T-031, T-032 |
| T-037 | R2 yükleme ucu + imzalı URL + dosya doğrulayıcı (§8.11)                           | Backend + Güvenlik | T-015        |
| T-038 | `/panel/mesajlar` + "işe dönüştür" aksiyonu                                       | Backend + Frontend | T-027, T-032 |
| T-039 | E2E: senaryo 2 ve 6 (mesaj panele düşer, proje yayınlanır)                        | Güvenlik           | T-034, T-038 |

**Sıra:** T-030 → T-031 → T-032 → (T-033…T-036) → T-037 → T-038 → T-039

---

### F4 — İş & Muhasebe ⚪

| #     | Görev                                                                                        | Ajan     | Bağımlılık   |
| ----- | -------------------------------------------------------------------------------------------- | -------- | ------------ |
| T-040 | `Client`, `Job` servisleri + Zod şemaları                                                    | Backend  | T-015        |
| T-041 | `TransactionCategory`, `Transaction` servisleri; **Job→Transaction bağı** (§6 kritik ilişki) | Backend  | T-040        |
| T-042 | Rapor hesaplayıcıları: aylık/yıllık toplam, kategori dağılımı, bakiye                        | Backend  | T-041        |
| T-043 | `/panel/musteriler` + `/panel/isler` kanban + `/panel/isler/[id]`                            | Frontend | T-040, T-032 |
| T-044 | `/panel/muhasebe` liste + filtre + hızlı ekleme                                              | Frontend | T-041, T-032 |
| T-045 | `/panel/muhasebe/raporlar` — Recharts grafikleri                                             | Frontend | T-042        |
| T-046 | CSV/PDF dışa aktarım                                                                         | Backend  | T-042        |
| T-047 | E2E senaryo 5 + muhasebe verisi erişim denetimi                                              | Güvenlik | T-044        |

**Sıra:** T-040 → T-041 → T-042 → (T-043 ∥ T-044) → T-045 → T-046 → T-047

---

### F5 — Sağlık, Spor, Hayat ⚪

| #     | Görev                                                                        | Ajan     | Bağımlılık  |
| ----- | ---------------------------------------------------------------------------- | -------- | ----------- |
| T-050 | `HealthLog` servis + şema                                                    | Backend  | T-015       |
| T-051 | `Exercise`, `Workout`, `WorkoutSet`, `PersonalRecord` servisleri + PR hesabı | Backend  | T-015       |
| T-052 | `Habit`, `HabitLog`, `Goal`, `JournalEntry` servisleri                       | Backend  | T-015       |
| T-053 | `/panel/saglik` — giriş formu + trend grafikleri                             | Frontend | T-050       |
| T-054 | `/panel/spor` — antrenman kaydı, egzersiz kütüphanesi, PR takibi             | Frontend | T-051       |
| T-055 | `/panel/hayat` — alışkanlık, hedef, günlük                                   | Frontend | T-052       |
| T-056 | Hassas veri erişim denetimi (sağlık tabloları)                               | Güvenlik | T-053…T-055 |

**Sıra:** (T-050 ∥ T-051 ∥ T-052) → (T-053 ∥ T-054 ∥ T-055) → T-056

---

### F6 — Sertleştirme ⚪

| #     | Görev                                                                            | Ajan                | Bağımlılık   |
| ----- | -------------------------------------------------------------------------------- | ------------------- | ------------ |
| T-060 | Nonce tabanlı CSP + tüm güvenlik başlıkları (§8.12–14)                           | Güvenlik            | F2–F5        |
| T-061 | Hız sınırlama katmanı tamamlanması (§8.15–16)                                    | Güvenlik            | T-060        |
| T-062 | §8'in 25 maddesi tam denetimi + bulgu kayıtları                                  | Güvenlik            | T-060, T-061 |
| T-063 | Bulgu düzeltmeleri (Backend/Frontend'e dağıtılır)                                | Backend + Frontend  | T-062        |
| T-064 | E2E paketi tamamlanması (§9 — 7 senaryo) + kapsam ≥ %70                          | Güvenlik            | F5           |
| T-065 | Lighthouse CI eşikleri sağlanana kadar optimizasyon                              | Frontend + Güvenlik | T-064        |
| T-066 | Yedekleme betiği + `docs/security/restore.md` + **geri yükleme provası** (§8.22) | Güvenlik            | T-060        |

**Sıra:** T-060 → T-061 → T-062 → T-063 → T-064 → T-065 → T-066

---

### F7 — Yayın ⚪

| #     | Görev                                                    | Ajan          | Bağımlılık   |
| ----- | -------------------------------------------------------- | ------------- | ------------ |
| T-070 | `Dockerfile` (çok aşamalı, standalone, non-root)         | Backend       | F6           |
| T-071 | Coolify + Postgres container + volume + iç ağ            | Backend       | T-070        |
| T-072 | Domain + SSL + reverse proxy                             | Backend       | T-071        |
| T-073 | R2 bucket + gece yedek cron (03:00)                      | Güvenlik      | T-066, T-071 |
| T-074 | Uptime Kuma + `/api/v1/health` izleme + kaynak uyarıları | Güvenlik      | T-072        |
| T-075 | Yayın sonrası kabul kontrolü — K1…K6 (§1.1) ölçümü       | Orkestra Şefi | T-070…T-074  |

**Sıra:** T-070 → T-071 → T-072 → (T-073 ∥ T-074) → T-075

---

## 3. Açık Görevler

| Görev | Ajan     | Durum             | Not                                                    |
| ----- | -------- | ----------------- | ------------------------------------------------------ |
| T-001 | Backend  | 🟢 Tamamlandı     | 2026-08-04 · Orkestra Şefi doğruladı (aşağıya bak)     |
| T-002 | Frontend | ⚪ Prompt verildi | T-003 ile paralel — dosya çakışması yok                |
| T-003 | Backend  | 🟡 Kısmen         | Bağlantı/migration tamam; `db.ts` + health engellendi → T-003b |
| T-003b | Backend | 🟢 Tamamlandı     | 2026-08-04 · doğrulandı; iki gerçek hata yakalandı     |
| T-004 | Güvenlik | 🟢 Tamamlandı     | 55 test geçiyor; 2 bulgu açtı, biri yüksek             |
| T-003c | Backend | 🟢 Tamamlandı     | 2026-08-05 · `.env`'siz build EXIT 0 doğrulandı        |
| T-005 | Güvenlik | 🟢 Tamamlandı     | CI kuruldu; **GitHub'da hiç koşmadı** (E1) → T-006     |
| T-002 | Frontend | 🟢 Tamamlandı     | ADR-010 + ADR-011 ile 2 sapma karara bağlandı           |
| T-002b | Frontend | ⚪ Prompt verildi | BULGU-003 — A11y 0.92, hedef ≥0.95                     |
| T-006 | Kullanıcı | 🔴 Bekliyor      | `git init` + GitHub + ilk CI koşusu                    |

### T-003c kabul doğrulaması (Orkestra Şefi, 2026-08-05)

**BULGU-002 KAPANDI.** `.env` kaldırılıp `pnpm build` çalıştırıldı → **EXIT 0**
(düzeltme öncesi EXIT 1). Bağımsız doğrulandı.

Backend, T-003b'deki hatalı iddiasını kendi raporunda açıkça düzeltti: build'i yalnızca
"DB kapalı, `.env` yerinde" senaryosunda ölçmüş, "`.env` yok" senaryosunda ölçmemişti.
İki senaryonun farkı doğru teşhis edilmiş — birincisinde havuz kuruluyor ama bağlanamıyor,
ikincisinde havuz hiç kurulamıyor.

**Kabul edilen kararlar:** K1 (Proxy — `getDb()` fonksiyonu sözleşmeyi kırar ve F1'in her
servis dosyasına dokunurdu; görevin gerekçesi "ucuza düzelt"ti), K2 (`bind(client)` —
`$transaction` gibi `this` bağlamı isteyen API'ler bozulmasın), K3 (üretimde modül kapsamlı
istemci), K4 (`has` ve `getPrototypeOf` tuzakları — `'model' in db` sessizce yanlış
sonuç vermesin), K5 (hata mesajı ve fırlatma noktası korundu — tembellik hatayı **erteler**,
yumuşatmaz).

**Sözleşme teyidi:** `export const db: PrismaClient` ve `pingDatabase(): Promise<void>`
imzaları değişmedi; derleyiciyle iki yönlü atanabilirlik kanıtlanmış. F1 servisleri etkilenmiyor.
**Tembellik ölçümü:** `/health` çağrılmadan bağlantı sayısı **0**, ilk çağrıdan sonra **1**,
5 hot reload boyunca **1** — hem tembellik hem sızıntısızlık kanıtlandı.

### T-004 kabul doğrulaması (Orkestra Şefi, 2026-08-04)

Tüm kabul kriterleri karşılandı: 31 birim + 24 E2E testi geçiyor, `middleware.ts` %100 kapsanmış,
kapı sırası (lint → typecheck → test → build → e2e) uçtan uca doğrulandı. Kapsam eşiğinin
gerçekten bağlı olduğu `COVERAGE_ENFORCE=1` ile kanıtlanmış (EXIT 1).

**BULGU-002 (Yüksek) — Orkestra Şefi tarafından bağımsız doğrulandı ve KABUL EDİLDİ.**
`.env` kaldırılıp `pnpm build` çalıştırıldı → `Failed to collect page data for /api/v1/health`,
EXIT 1. T-003b raporundaki "`.env` olmadan build çalışır" notu hatalıydı — o ölçüm DB kapalıyken,
`.env` yerindeyken yapılmıştı. **İki farklı senaryo.** → T-003c açıldı.

**BULGU-001 (Düşük) — kabul kriteri hatası, Orkestra Şefi'nin.** "`/api/v1/health`
`X-Robots-Tag` taşımamalı" kriteri hiçbir koşulda geçemezdi: uç bu başlığı kendisi yazıyor
(T-003b, §8.7 gereği doğru davranış). Kriter **"health, ara katman başlıklarını taşımamalı"**
olarak düzeltildi; ajan kanıt olarak `X-Frame-Options` kullanmış — doğru seçim.

**Kabul edilen kararlar:** K1 (**`src/middleware.ts`** — kökteki dosya `src/` kullanan projede
sessizce yok sayılırdı; derleme çıktısı `ƒ Middleware 34.7 kB` ile doğrulanıyor. §10.1 metni
`middleware.ts` diyor, PROGRAM.md toplu güncellemesinde düzeltilecek), K2 (kapsayıcı matcher —
§8.14 public tarafa da gerekli, `next.config.ts` ortak dosya olduğu için oradan verilemedi),
K3 (E2E üretim derlemesine karşı), K4 (kapsam eşiği `COVERAGE_ENFORCE=1` ile açılıyor —
bugün zorlansa CI ilk günden kırmızı olur, kaçınılmaz sonuç eşiğin düşürülmesiydi),
K5 (bileşen testi proje bileşeni render etmiyor — T-002 devam ediyor), K6 (`jsdom@26.1.0`
sabitlendi → Q4'ü tetikledi), K7 (`skipFull` düzeltmesi).

**HSTS `preload` bilerek yok** — geri alınamaz ve Q1 (panel alt alan adı) verilmedi. F7/T-072'de.

### T-003b kabul doğrulaması (Orkestra Şefi, 2026-08-04)

Tüm kabul kriterleri karşılandı. Backend, kendi yazdığı ilk uygulamada **iki gerçek hata
yakalayıp düzeltti** — ikisi de kabul kriterlerini teknik olarak geçerdi ama yanlış olurdu:

| # | Hata | Neden kritikti |
| - | ---- | -------------- |
| 1 | `db.$connect()` ölü DB'yi yakalamıyor — DB durdurulmuşken uç 28 ms'de `200 / db:"up"` döndü | T-003 K7'de reddedilen "yanlış yeşil gösteren sağlık ucu"nun tam kendisi; Uptime Kuma (§13.7) DB çöktüğünde yeşil kalırdı. `pool.connect()` ile gerçek round-trip'e çevrildi |
| 2 | `.env` yokken `pnpm install` çöküyordu (`postinstall` → `PrismaConfigEnvError`) | ADR-006'nın çözmeyi amaçladığı sorunu daha kötü biçimde geri getiriyordu; CI, Docker build ve taze klonda `.env` yoktur → **T-004 ilk çalıştırmada düşerdi** |

**Orkestra Şefi bağımsız doğrulaması:** `.env` geçici olarak kaldırılıp `prisma generate`
çalıştırıldı → **EXIT 0**, istemci üretildi. R10 kapandı.

**Ölçülen çıktılar:** DB açık → `200` / 20 ms · DB kapalı → `503` / 9 ms.
Hata gövdesinde altyapı izi taraması 0 eşleşme (`ECONNREFUSED`/`5433`/`aelaldi` yok) — §8.20 ✅.
Her iki yanıtta `cache-control: no-store` + `x-robots-tag: noindex, nofollow` (§8.7).

**Kabul edilen kararlar:** K1 (havuz açıkça oluşturuluyor), K2 (`pool.connect()` — §8.10 ham SQL
onayına gerek kalmadı), K3 (`pingDatabase()` dar ihraç, §7.4 delinmedi), K4 (havuz da `globalThis`'te),
K5 (`server-only` kaldırıldı — ADR-005 listesinde yok, doğru), K6 (disk `critical`→503, `low`→200,
`unknown`→servis düşmez), K7 (`prisma.config.ts`'te `process.env` — ADR-007 bu dosyayı Backend'e verdi).

**Havuz ayarları (sözleşme):** `max: 10` · `idleTimeoutMillis: 30_000` · `connectionTimeoutMillis: 5_000`.
Sonuncusu kritik: `pg` varsayılanı `0` (sonsuz bekleme) olsaydı DB kapalıyken uç 503 yerine asılı kalırdı.

### T-003 kabul doğrulaması (Orkestra Şefi, 2026-08-04)

Engel bağımsız doğrulandı: `new PrismaClient()` içeren geçici bir dosya `tsc --noEmit`
altında **`TS2554: Expected 1 arguments, but got 0`** verdi. Backend'in tespiti doğru,
adaptör zorunluluğu gerçek → **ADR-005 ile onaylandı**.

| Karşılanan                                              | Karşılanmayan (→ T-003b)          |
| ------------------------------------------------------- | --------------------------------- |
| Postgres 16 container, `127.0.0.1:5433` (dışarı kapalı) | `src/server/db.ts` tekil istemci  |
| İlk migration üretildi ve uygulandı                     | `/api/v1/health` 200 gövdesi      |
| `prisma generate` + import yolu sözleşmesi yayınlandı   | `/api/v1/health` 503 gövdesi      |
| `lint` / `typecheck` / `build` (DB açık ve kapalı) temiz | `force-dynamic`                   |

**Onaylanan kapsam ekleri ve talepler:** E1 → ADR-005 · E2 → ADR-007 · E3 → ADR-006 ·
E4 (`.env.example` 5433) onaylandı, T-003b kapsamında.
**Kabul edilen kararlar:** K1 (istemci `src/server/generated/prisma/`), K2 (uzantısız import),
K3 (VCS dışı), K4 (host portu 5433), K5 (`process.loadEnvFile`), K6 (geçici `HealthCheck`),
**K7 (sağlık ucunu yarım yazmama) — doğru karar.** DB durumunu bilmeyen bir sağlık ucu,
Uptime Kuma'yı (§13.7) DB çöktüğünde yeşil gösterirdi.

### T-001 kabul doğrulaması (Orkestra Şefi, 2026-08-04)

Ajan raporu paylaşılmadı; kabul kriterleri doğrudan depo üzerinde denetlendi.

| Kriter                                                    | Sonuç                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `pnpm install` temiz, `packageManager` sabit               | ✅ `pnpm@9.15.0`                                              |
| `pnpm lint` sıfır uyarı                                    | ✅ `--max-warnings=0` ile temiz                               |
| `pnpm typecheck` temiz                                     | ✅                                                            |
| `pnpm build` başarılı, `output: 'standalone'`              | ✅ 4 statik sayfa, First Load JS 102 kB                       |
| `strict` + `noUncheckedIndexedAccess` + `@/*` alias        | ✅ (ayrıca `noImplicitOverride`, `noFallthroughCasesInSwitch`) |
| `no-explicit-any` / `ban-ts-comment` = error               | ✅ `eslint.config.mjs:50-51`                                  |
| §4.3 klasör ağacı tam                                      | ✅                                                            |
| `.env.example` §12'nin tüm anahtarlarını değersiz içeriyor | ✅ 18 anahtar, açıklama satırlarıyla                          |
| `.env` / `package-lock.json` / `yarn.lock` yok             | ✅ ayrıca `.gitignore` ile yasaklı                            |
| `tailwind.config.ts` yok (ADR-002)                         | ✅ `globals.css` yalnızca `@import 'tailwindcss';`            |

**Kapsam dışı ekler (kabul edildi):** `outputFileTracingRoot` sabitlemesi, `poweredByHeader: false`,
`productionBrowserSourceMaps: false`, `format:check` script'i, `pnpm.overrides` (postcss/sharp).
Hepsi §8 ve §13 ile uyumlu, sınır ihlali yok.

**Kurulan sürümler (dışarıya sözleşme):** next 15.5.22 · react 19.2.8 · typescript 5.9.3 ·
tailwindcss 4.3.3 · prisma & @prisma/client **7.9.1** · next-auth 5.0.0-beta.32 · **zod 4.4.3** ·
react-hook-form 7.84.0 · next-themes 0.4.6 · framer-motion 12.43.0 · recharts 3.10.1 ·
argon2 0.45.1 · otplib 13.4.1 · date-fns 4.4.0

## 4. Bekleyen Bağımlılıklar

| Bekleyen | Neyi bekliyor                     | Kim çözecek                 |
| -------- | --------------------------------- | --------------------------- |
| T-004    | Token/tema (T-002) + DB (T-003)   | Frontend + Backend          |
| T-010    | Prisma bağlantısı ve generator    | Backend (T-003)             |
| T-020    | `components/ui` primitifleri      | Frontend (T-002)            |

### T-002 kabul doğrulaması (Orkestra Şefi, 2026-08-05)

Kod diskte denetlendi ve tüm ölçülebilir kriterler karşılandı: `.tsx`/`.ts` içinde **hex yok**,
üç font `latin-ext` + `display: swap`, `.tabular`, `prefers-reduced-motion` global kuralı,
8 UI primitifi (+ bonus `Textarea`, `SkeletonText`, `buttonClasses`), iki route group layout'u.

**İki sapma karara bağlandı:**
- **K1 → ADR-010.** `next-themes` kullanılmadı. Doğrulandı: `grep -rn "next-themes" src/` **boş**.
  Paketin kaynağında cookie desteği yok ve FOUC'u inline script'le çözüyor — kabul kriteri
  (cookie tabanlı) ve §8.13 (`unsafe-inline` yasağı) ile aynı anda çelişiyordu. Kendi
  sağlayıcımız ikisini de yapısal olarak çözüyor. **`next-themes` `package.json`'dan
  kaldırılacak** — Backend'e verildi (T-010 ile).
- **Dinamik render → ADR-011.** Kabul edildi; gerekçe spekülasyon değil ölçüm.

**Kabul edilen diğer kararlar:** K2 (`src/app/page.tsx` silindi — rota çakışması), K3
(`canvas`/`line` adları — `--color-base` Tailwind'in `text-base` font boyutunu renge
çeviriyordu; ham değişken adları §3.1'deki gibi kaldı), K4 (`@theme inline`), K5 (aydınlık
`--border-hover: #CFCFE4` uyduruldu → **PROGRAM.md §3.1'e eklendi**), K6 (tip ölçeği
override edilmedi — Tailwind varsayılanı §3.2'nin birebir aynısı), K7 (panel mobil çekmecesi
T-030'a ertelendi).

**`themeColor` sorusu çözüldü:** PROGRAM.md §3.1'e istisna kuralı eklendi — hex yasağı
bileşenler ve stil kodu içindir; çerçevenin ham değer dayattığı metadata alanları
`layout.tsx`'te, token'a işaret eden yorumla yazılır. Uygulama T-002b'de.

### T-005 kabul doğrulaması (Orkestra Şefi, 2026-08-05)

CI hattı kuruldu: 3 iş, 18 adım. `.nvmrc`=22, `engines.node`=">=22.11.0" — doğrulandı.
59 birim + 24 E2E testi geçiyor. **Kapının tuttuğu 4 kasıtlı bozmayla kanıtlandı** —
"geçiyor" değil "tutuyor" gösterilmiş; doğru disiplin.

**§8 ilerlemesi:** §8.18 ⚠️→✅ (gizli bilgi taraması, ekili sırla kanıtlandı),
§8.24 ⏳→✅ (audit kapısı, kırmızıya döndüğü izole projede kanıtlandı). Özet: ✅ 6 · ⚠️ 4 · ⏳ 15.

**Kabul edilen kararlar:** K1 (`jsdom@26` korundu — `jsdom@30` `^22.22.2` isterken bizim
beyanımız `>=22.11.0`; aradaki geliştirici `engines` kapısından geçip anlaşılmaz bir hataya
çarpardı. Doğru muhakeme), K2 (`@lhci/cli` `pnpm dlx` ile sabit sürüm — `latest` her koşuda
denetlenmemiş kod indirmek olurdu, §8.25), K3 (Lighthouse raporları `filesystem`'e —
`temporary-public-storage` panel rota yapısını herkese açık bir URL'ye çıkarırdı), K4
(§8.18 bir CI betiği değil **test** — 10 ekili sahte sır yakalanıyor; "hiçbir şey bulamadım"
diyen bir tarayıcı bozuk bir tarayıcıdan ayırt edilemez), K5 (`contents: read`), K6
(audit ayrı iş — dış veri kaynağına bağlı, kod kalitesi sinyalini kirletmemeli).

**Onaylanan kapsam ekleri:** `playwright.config.ts` (CI'da `pnpm start` — E2E yeniden
derleseydi `build → test:e2e` sıralaması anlamını yitirirdi), `.gitignore` `/.lighthouseci`.

**E3 kabul edildi (bulgu değil):** SEO 0.60'ın tek sebebi T-002'nin geçici sayfasındaki
`robots: { index: false }`. T-021 gerçek ana sayfayı yazınca düzelecek.

## 5. Riskler

| #   | Risk                                                                                                             | Etki   | Azaltma                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Nonce tabanlı CSP ile React Bits WebGL/shader bileşenleri çakışabilir (§8.13 vs §5)                              | Yüksek | F2'de her React Bits bileşeni kurulurken inline script/style üretip üretmediği kontrol edilir; üretiyorsa T-060'a taşınmaz, o an çözülür |
| R2  | Tailwind v4 CSS-first yapılandırma, PROGRAM.md'de geçen `tailwind.config.ts` ile uyuşmuyor                       | Orta   | ADR-002 ile karara bağlandı; PROGRAM.md §10.1 ortak dosya listesi güncellenecek                                                          |
| R3  | Tek kullanıcılı sistemde 2FA secret kaybı → tam kilitlenme                                                       | Yüksek | F1'de kurtarma kodu üretimi T-013 kapsamına alındı; `docs/security/restore.md` bunu kapsayacak                                           |
| R4  | `Decimal(12,2)` Prisma tipi JS tarafında `Decimal` nesnesi döner; serileştirme Server Component sınırında patlar | Orta   | T-015'te DTO dönüştürme katmanı zorunlu kılınacak                                                                                        |
| R5  | Sunucu ön koşulları (§13) doğrulanmadı                                                                           | Orta   | F7 öncesi kullanıcıdan teyit alınacak                                                                                                    |
| R6  | R2 ve Resend hesapları/anahtarları henüz yok                                                                     | Düşük  | T-037 öncesi gerekli                                                                                                                     |
| R7  | **Zod 4** kuruldu; §7.3'ün varsaydığı Zod 3 API'si farklı (`errorMap` → `error`, `z.string().email()` → `z.email()`, `.default()` çıkarım davranışı) | Orta   | T-011'de şema kütüphanesi Zod 4 API'siyle yazılacak; Frontend `zodResolver` tarafında `@hookform/resolvers@5` uyumlu — T-002'de doğrulanacak |
| R8  | **Prisma 7** kırıcı değişiklikleri — sekiz kalem (T-003 raporu). En ağırı: sürücü adaptörü zorunlu | ~~Yüksek~~ → Kapandı | ✅ T-003'te tamamı haritalandı ve doğrulandı; ADR-005/006/007 ile karara bağlandı. Kalan uygulama T-003b'de |
| R10 | `postinstall` olmadan taze klonda `pnpm install && pnpm typecheck` kırılır — CI hattını düşürür | ~~Yüksek~~ → Kapandı | ✅ T-003b'de çözüldü; `prisma.config.ts` datasource'u koşullu hâle getirildi. Orkestra Şefi `.env`'siz `prisma generate` ile bağımsız doğruladı (EXIT 0) |
| R11 | T-010'a girmeden kapatılması gereken altı veri modeli kararı: A1 (Auth.js session stratejisi), A4 (kur snapshot alanları), B7 (`Job.status` ↔ kanban), C2 (etiket normalizasyonu), C6 (PR formülü) | Yüksek | Bunlar ajanların ilk değerlendirmelerinden geliyor; **Orkestra Şefi'ne henüz iletilmedi**. Tek ADR turunda kapatılacak, sonra T-010 açılacak |
| R13 | ~~BULGU-002 — `.env` olmadan `pnpm build` düşüyor~~ | ~~Yüksek~~ → Kapandı | ✅ T-003c'de tembel havuzla çözüldü; Orkestra Şefi `.env`'siz build ile bağımsız doğruladı (EXIT 0). CI'ya gerçek `DATABASE_URL` secret'ı verme refleksi bertaraf edildi |
| R16 | ~~Tüm rotalar dinamik render'a düştü~~ | ~~Yüksek~~ → Karara bağlandı | ✅ **ADR-011**: dinamik kabul edildi. Gerekçe ölçüm: Lighthouse **Performance 91** (§9 eşiği ≥90) — dinamik render altında zaten sağlıyor. Karşılığında F2'de veri erişimi açık önbelleklemeyle (`unstable_cache` + `revalidateTag`) yazılacak; T-029'da yeniden ölçülecek |
| R16-eski | ~~(ayrıntı)~~ **Tüm rotalar dinamik render'a düştü.** T-002'de kök layout `cookies()` çağırıyor (tema FOUC'unu önlemek için) → build çıktısında `/` artık `○` (static) değil `ƒ` (dynamic). T-001'de statikti | Yüksek | **K1 (LCP < 2.0s) ve SEO doğrudan etkileniyor.** Public sayfaların statik/ISR olması F2'nin performans varsayımıydı. Üç yol var: (a) tema sınıfını nonce'lu inline script ile bas — §8.13 CSP nonce'a izin veriyor, (b) tema cookie'sini yalnızca `(panel)` layout'unda oku, public tarafı sistem temasına + CSS'e bırak, (c) dinamiği kabul et ve önbelleği başka katmanda çöz. **T-002 raporu gelince karara bağlanacak; F2 açılmadan çözülmeli** |
| R14 | ~~Node 20 EOL — yamasız çalışma zamanı~~ | ~~Yüksek~~ → Kapandı | ✅ ADR-008 uygulandı. Yerel makine **Node 22.23.2**'ye alındı (`nvm alias default 22`), tüm kapı Node 22 altında yeniden koşturuldu ve yeşil. `.nvmrc` + `engines` + CI senkronu T-005'te sabitlenecek |
| R18 | **BULGU-003** — Lighthouse A11y **0.92** (hedef ≥0.95): `color-contrast` ve `link-in-text-block` sıfır. Bağlantılar yalnızca renkle ayırt ediliyor | Orta | **Token düzeyinde** — düzeltilmezse F2'de yazılacak her sayfaya kopyalanır. §1.1 K5 (WCAG AA) şu an sağlanmıyor. T-002b açıldı; F2 başlamadan kapatılmalı |
| R19 | **CI GitHub'da hiç koşmadı.** Dizin git deposu bile değil; `uses:` adımları (checkout, pnpm/action-setup, setup-node, cache, upload-artifact) doğrulanamadı | Orta | Ajan bunu bilerek raporladı — `run:` adımlarının tamamı yerelde koşturuldu, yalnızca hazır eylemler açıkta. En olası düzeltme noktası `pnpm/action-setup` ↔ `setup-node` önbellek sırası. T-006 |
| R17 | **Geliştirme makinesinde disk %5'in altında.** `/api/v1/health` bu yüzden yerelde `503` dönüyor (`disk: critical`) — E2E logunda görünüyor | Orta | Uç doğru çalışıyor, kod sorunu değil. **Kullanıcı eylemi: makinede yer açılmalı.** Aksi hâlde yerel sağlık kontrolü kalıcı kırmızı kalır ve gerçek bir DB arızasını maskeler |
| R15 | `next start` + `output: 'standalone'` uyarı veriyor; üretim gerçekte `node .next/standalone/server.js` ile koşacak — E2E farklı sunucuyu test ediyor | Düşük | T-070'te E2E'nin standalone çıktıya karşı koşturulması değerlendirilecek (T-004 notu T5) |
| R12 | Yerel geliştirme portu 5433 (§12 metni 5432 diyor) — makinede sistem geneli Postgres varsa çakışma sessiz ve yanıltıcı | Düşük | `docker-compose.dev.yml` içinde gerekçesiyle yazılı; `.env.example` T-003b'de güncelleniyor; F0 sonu PROGRAM.md §12 notu eklenecek |
| R9  | React 19 + `framer-motion` 12 ve `recharts` 3 uyumu doğrulanmadı                                                  | Düşük  | T-002'de en az bir motion bileşeni, T-045'te bir grafik ile fiilen denenecek                                                              |

## 6. Karar Bekleyenler (kullanıcıdan)

| #   | Soru                                                                          | Ne zaman gerekli                       |
| --- | ----------------------------------------------------------------------------- | -------------------------------------- |
| Q1  | Panel adresi `panel.abdulkadirelaldi.com` (subdomain) mı, `/panel` (path) mi? | F7'den önce; F0'da `/panel` varsayıldı. HSTS `preload` da buna bağlı |
| Q2  | Mail sağlayıcı: Resend mi kendi SMTP mi?                                      | T-027                                  |
| ~~Q3~~ | ~~Repo GitHub'da mı?~~ → **GitHub + Actions** (ADR-009)                    | ✅ Kapandı 2026-08-05                  |
| ~~Q4~~ | ~~Node sürümü?~~ → **Node 22 LTS** (ADR-008)                               | ✅ Kapandı 2026-08-05                  |
