# STATUS.md — Proje Durum Panosu

> Orkestra Şefi tarafından tutulur. Her ajan raporundan sonra güncellenir.
> Kaynak: `PROGRAM.md` §11 Yol Haritası.

**Son güncelleme:** 2026-08-11
**Aktif faz:** F3 — Panel Çekirdek · **F2 kapandı**
**Genel ilerleme:** 3 / 8 faz tamamlandı · ~55 görev bitti

---

## 1. Faz Özeti

| Faz | İçerik                                    | Ana ajan(lar)                 | Durum       |
| --- | ----------------------------------------- | ----------------------------- | ----------- |
| F0  | Temel — kurulum, token, tema, iskelet, CI | Backend + Frontend + Güvenlik | 🟢 **Tamam** |
| F1  | Veri & Auth                               | Backend                       | 🟢 **Tamam** |
| F2  | Public İskelet                            | Frontend                      | ⚪ Bekliyor |
| F3  | Panel Çekirdek                            | Backend + Frontend            | 🔵 Aktif    |
| F4  | İş & Muhasebe                             | Backend + Frontend            | ⚪ Bekliyor |
| F5  | Sağlık, Spor, Hayat                       | Backend + Frontend            | ⚪ Bekliyor |
| F6  | Sertleştirme                              | Güvenlik & Test               | ⚪ Bekliyor |
| F7  | Yayın                                     | Hepsi                         | ⚪ Bekliyor |

Durum kodları: ⚪ Bekliyor · 🔵 Aktif · 🟡 Kısmen · 🟢 Tamamlandı · 🔴 Engellendi

---

## 2. Faz Kırılımı ve Bağımlılık Sırası

### F0 — Temel 🟢 **KAPANDI**

| #     | Görev                                                                                              | Ajan            | Bağımlılık          | Durum     |
| ----- | -------------------------------------------------------------------------------------------------- | --------------- | ------------------- | --------- |
| T-001 | Next.js 15 iskeleti, TS strict, toolchain, tüm F0 bağımlılıkları, klasör yapısı, `.env.example`    | Backend         | —                   | 🟢 Tamam  |
| T-002 | Tasarım token'ları, fontlar, tema anahtarı, public/panel layout iskeletleri, temel UI primitifleri | Frontend        | T-001               | 🟢 Tamam  |
| T-003 | Prisma bağlantısı, dev Postgres compose, ilk migration                                             | Backend         | T-001               | 🟡 Kısmen |
| T-003b | Sürücü adaptörü, `src/server/db.ts`, `/api/v1/health`, `postinstall`                              | Backend         | T-003 + ADR-005     | 🟢 Tamam  |
| T-004 | Vitest + Playwright iskeleti, `src/middleware.ts`, güvenlik başlıkları                             | Güvenlik & Test | T-003b              | 🟢 Tamam  |
| T-003c | **BULGU-002** düzeltmesi — `pg` havuzunu tembel kur (`.env`'siz build)                            | Backend         | T-004 bulgusu       | 🟢 Tamam  |
| T-005 | GitHub Actions CI + Lighthouse CI + Node 22 sabitlemesi                                            | Güvenlik & Test | T-003c              | 🟢 Tamam  |
| T-002b | **BULGU-003** — erişilebilirlik eşiği (kontrast + bağlantı ayırt edilebilirliği)                  | Frontend        | T-005 bulgusu       | 🟢 Tamam  |
| T-006 | Depo GitHub'a taşındı, ilk CI koşusu yeşil, `main` koruması aktif                                  | Orkestra Şefi   | T-005               | 🟢 Tamam  |
| T-006b | CI takip düzeltmeleri: `actions/*@v5`, Lighthouse artifact yolu                                   | Güvenlik & Test | T-006               | ⚪ Sırada |

**Fiilen yürüyen sıra:** T-001 → (T-002 ∥ T-003) → T-003b → T-004 → T-003c → T-005 → (T-002b ∥ T-006)

**F0 kabul kapısı — güncel durum:**

| Kriter | Durum |
| ------ | ----- |
| `pnpm lint && typecheck && test && build` temiz | ✅ Node 22 altında doğrulandı |
| `pnpm test:e2e` — 24/24 | ✅ masaüstü + mobil |
| Koyu/aydınlık tema, FOUC yok | ✅ sunucuda basılıyor, 4 senaryo test edildi (ADR-010) |
| `/api/v1/health` DB'ye bağlanıyor | ✅ 200/503 ölçüldü |
| CI yeşil | ✅ GitHub'da gerçek koşu `31002868890` — üç iş de yeşil |
| §1.1 K5 — WCAG AA | ✅ **A11y 1.00**, iki temada (T-002b) |
| `main` dal koruması | ✅ ruleset `20455952` — Kapı + §8.24 zorunlu |

**F0 KAPANDI (2026-08-05).** Artık kalan tek F0 kalemi T-006b — CI takip düzeltmeleri, engelleyici değil.

---

### F1 — Veri & Auth 🟢 **KAPANDI (2026-08-10)**

| #     | Görev                                                                                     | Ajan     | Bağımlılık   |
| ----- | ----------------------------------------------------------------------------------------- | -------- | ------------ |
| T-010 | Tam Prisma şeması (§6 + **§6.1**) + migration + `next-themes` kaldırma — 🟢 **Tamam**    | Backend  | T-003b, ADR-013…021 |
| T-011 | Zod şema kütüphanesi — 25 varlık, 251 test — 🟢 **Tamam**                                  | Backend  | T-010        |
| T-012 | `seed.ts` — 21 varlık, idempotent, hepsi Zod'dan geçiyor — 🟢 **Tamam**                   | Backend  | T-010, T-011, T-013a |
| T-013a | Kripto primitifleri — 51 test, kapsam %100 satır — 🟢 **Tamam**                            | Backend  | T-011        |
| T-013b | Auth.js v5 bağlantısı — 36 test, 7 senaryo — 🟢 **Tamam**                                  | Backend  | T-013a       |
| T-014 | Panel koruması + kilitleme politikası + `AuditLog` kilit kaydı — 🟢 **Tamam** (§8.5 ✅)   | Güvenlik | T-013b   |
| T-015 | Servis katmanı temeli — 8 yardımcı, 149 test, kapsam %90.08 — 🟢 **Tamam**                | Backend  | T-011, T-013c |
| T-016 | Auth E2E — 12 senaryo, `code` regresyonu kilitlendi — 🟢 **Tamam**                        | Güvenlik | T-013c, T-018b |
| T-005b | Auth E2E CI'da koşuyor — **atlanan 0** — 🟢 **Tamam**                                      | Güvenlik | T-016        |
| T-003d | BULGU-007 + **üretim havuz sızıntısı** — 🟢 **Tamam** (30.63 sn → 0.18 sn)                | Backend  | T-016        |
| T-017 | `/giris` sayfası — iki adımlı akış — 🟢 **Tamam** (akış T-013c ile çalışır hâle gelecek)  | Frontend | T-013b       |
| T-013c | P0 blokerler — üçü de kapandı, 404 test — 🟢 **Tamam**                                     | Backend | T-014, T-017 |
| T-036 | 2FA kurulum ekranı — 🟢 **Tamam** (T-018b ile bağlandı)                                    | Frontend | T-013c       |
| T-015b | TOTP Server Action'ları — 49 test, kapsam %94.44 — 🟢 **Tamam**                            | Backend | T-015        |
| T-018b | `guvenlik/page.tsx` bağlandı — akış uçtan uca çalışıyor — 🟢 **Tamam**                     | Frontend | T-015b       |
| T-018 | `/panel/ayarlar` + QR kalıcı doğrulama testi — 🟢 **Tamam** (ADR-024 şartı karşılandı)     | Frontend | T-036        |
| T-019 | §8.1 kapısı — kuruldu ve kanıtlandı — 🟢 **Tamam**                                         | Güvenlik | T-018b       |
| T-013e | BULGU-008 — JWT `tfa` alanı + oturum tazeleme — 🟢 **Tamam**                               | Backend  | T-019        |
| T-019b | Geçiş penceresi kapatıldı — **§8.1 ✅** — 🟢 **Tamam**                                     | Güvenlik | T-013e       |
| T-036c | Oturum tazeleme + çıkış düğmesi — 🟢 **Tamam** (PR #4)                                     | Frontend | T-013e       |

**Sıra:** T-010 ✅ → T-011 ✅ → T-013a ✅ → T-013b ✅ → (T-012 ✅ ∥ T-014 ✅ ∥ T-017 ✅) → T-013c ✅ → (**T-015 ∥ T-036 ∥ T-016**) → F1 kapanış
**F1 KABUL KONTROLÜ — Orkestra Şefi, 2026-08-10**

| Şart | Durum | Kanıt |
| ---- | ----- | ----- |
| Yanlış şifre reddediliyor | ✅ | T-016 E2E; kullanıcı numaralandırma koruması ayrıca ölçüldü (mesaj **ve** süre) |
| 2FA zorunlu | ✅ | Zincirin üç halkası ayrı ayrı ölçüldü: kapı (18 test, devre dışı bırakılınca kırılıyor) · besleme (T-013e, jeton gerçek istekle çözüldü) · pencere (T-019b, `null` reddediliyor) |
| `/panel` girişsiz erişilemiyor | ✅ | T-014; oturum kriptografik doğrulanıyor, uydurma JWE geçmiyor |
| Her mutasyon `AuditLog`'a yazıyor | ✅ *(F1 kapsamında)* | `writeAuditLog` + redaksiyon; F1'de yazılan **tüm** mutasyonlar (2FA eylemleri, hesap kilidi) yazıyor. "Tüm panel mutasyonları" F3–F5'te **her görevde denetlenecek süreklilik maddesi** — F1 borcu değil |

**Ölçülen:** 687 birim + 53 E2E · kapsam %94.06 · `lint`/`typecheck`/`build` EXIT 0 ·
`.env`'siz build EXIT 0 · §8: ✅ 9 · ⚠️ 4 · ⏳ 12

**F1'den devreden iki borç (F2'ye girmeden kapatılacak):**
1. **T-005b** — auth E2E CI'da koşmuyor. §8.1 kapısı ve dört `code` regresyon kilidi
   **merge kapısında tutmuyor**, yalnızca yerelde. *Yerel bir kilit, kilit değildir.*
2. **BULGU-007'nin cron tarafı** — `closeDatabase()` hazır, cron'lara bağlanması F7 öncesi.

---

### F2 — Public İskelet 🟢 **KAPANDI (2026-08-28)**

**F2 KABUL KONTROLÜ — Orkestra Şefi**

| Kriter | Kanıt |
| ------ | ----- |
| §4.1'in public rotaları | ✅ `/` `/hakkimda` `/projeler` `/projeler/[slug]` `/blog` `/blog/[slug]` `/hizmetler` `/iletisim` `/cv` — dokuzu da 200 |
| React Bits, §5.2 sert kuralları | ✅ 11 bileşen · sayfa başına tek WebGL · Aurora **beş** durumda yüklenmiyor |
| ADR-026 — gerçek veriden okuma | ✅ altı içerik servisi |
| ADR-011 — açık önbellekleme | ✅ `unstable_cache` + `revalidateTag`, ADR-029 kuralıyla |
| SEO altyapısı | ✅ sitemap (10 adres, e2e ile 200 doğrulanıyor) · robots · RSS · dinamik OG |
| §1.1 K1 — hız | ✅ mobil 93–96 · masaüstü 100 · CLS 0 |
| §1.1 K5 — WCAG AA | ✅ A11y 100 · kontrast iki temada ölçülü |
| §1.1 K4 — Kıyı Medya CTA | ✅ `data-cta`/`data-hizmet`/`data-kaynak` |
| §9 — Lighthouse | ✅ **merge kapısı**, eşikler `error` |
| İletişim formu | ✅ §8.15 hız sınırı · honeypot · zaman tuzağı · uçtan uca ölçüldü |

**1093 birim + 85 E2E · §8: ✅ 10 · ⚠️ 6 · ❌ 0 · ⏳ 9** *(PR #13 sonrası)*

**§9 senaryoları: 5 kapalı · 1 kısmi · 1 açık** *(T-044g sonrası; F3 başında 2 kapalıydı)*
Kapalı: **1** (ana sayfa → kart → detay → CTA, T-044g) · **2** (form → panel, T-043g) ·
3 (giriş+2FA) · 4 (girişsiz /panel → login) · **6** (yayınla → public'te görün —
T-039 mutasyonla, **literal DRAFT→PUBLISHED hâli T-044g'de**).
Kısmi: **7** (mobilde geçiyor, panel gezinme iddiaları yazılmadı — tek specle kapanır,
sayacı 6'ya çıkarır). Açık: **5** (finans, F4/F5).

**Açık borçlar (F3 boyunca):**
1. **T-037** — imzalı URL'ler gelmeden tüm kapaklar yer tutucu; `LogoLoop` bölümü kapalı.
   **Beş şey bunu bekliyor:** proje kapakları, galeri, blog kapakları, CV indirme, müşteri logoları
2. **Dolu silah → T-043f** — panel okuma yolu yazıldı ama bağlanmadı; sabit `status`
   hâlâ yerinde *(ayrıntı F3 tablosunda)*
3. **Arşivlenen adres 410 değil 200 dönüyor** — Next 15.5 sınırı (T-024); panel metni
   gerçeğe çekildi, engel kalkınca güncellenecek
4. **ADVISORY-002** — 2026-11-22'de kendini hatırlatacak; T-042g ölçtü: `@prisma/config@7.10.0`
   hâlâ `deepmerge-ts@7.1.5` sabitliyor, `prisma@latest` artık `8.0.0-rc.14`
5. **`latest` etiketi kararlı değil** — `prisma` → 8.0.0-rc.14, `vitest` → 5.0.0,
   `next` → 16.3.4 (biz 15.5.25). `nanoid` → 6.0.1 ile aynı sınıf tuzak. F6'nın
   Prisma 8 / Next 16 görevlerinden önce yazılı olmalı (T-043g)
6. **Yerel Docker kararsızlığı** — bu turda **beşinci** kez düştü; `colima` Mac uykuya
   geçince duruyor. Ölçüm görevlerinin başında `colima start && pnpm db:up` refleks olmalı
7. **Şifre değiştirmek ele geçirilmiş oturumu KAPATMIYOR** (BULGU-020) — ADR-013 JWT
   seçti. T-044g ölçtü: ara katmana `db` eklenince build **EXIT 1**
   (`UnhandledSchemeError`); depoda **üç** `await auth()` var ve `(panel)` altındaki
   tek çağıran `ayarlar/guvenlik` — **panel düzeni çağırmıyor.** Yani `auth()` kontrolü
   yazmaları kapatır, **okumaları kapatmaz**. Kontrolün sorgu maliyeti p50 0,49 ms;
   asıl bedel "normal istek yolu DB'ye gitmez" özelliğinin kaybı.
   → **T-046** (A: ömür 7g→24s hemen · B: `writesValidFrom`, yazmalar · C: okumalar F6'ya)
8. **`redactAuditDiff` ada bağlı** (ADR-034) — üç bağımsız ölçümle sabitlendi.
   Sınırı "yalnızca üst seviye" değil, **tam olarak ad bilgisi**:
   `{deleted:{passwordHash}}` maskeleniyor, `{deleted:{yeniSifre}}` sızıyor.
9. **BULGU-019** — silme eylemleri `diff: { deleted: before }` ile satırın tamamını
   yazıyor. Bugün sızıntı yok; kalıp **alan seçimini modele devrediyor**, yarınki bir
   sütun diff'e otomatik girer ve tip sistemi göremez → T-046
10. **§9/7 kısmi** — panelin mobil gezinme iddiaları yazılmadı; tek specle kapanır

*Kapanan borçlar: `readingMinutes` yazma yolu (T-031) · rota envanteri ↔ kapı kapsamı
(T-016b) · sunucu-only şema alanı konvansiyonu (T-031) · ENGEL-1 sunucu yarısı (T-040) ·
`tags.ts` yanlış gerekçesi (T-040) · düzenlemede boş MDX (T-040, tek kayıt okuma).*

*Kapanan borçlar: `readingMinutes` yazma yolu (T-031) · rota envanteri ↔ kapı kapsamı
(T-016b) · sunucu-only şema alanı konvansiyonu (T-031, `serverInterpreted`).*

| #     | Görev                                                                      | Ajan     | Bağımlılık   |
| ----- | -------------------------------------------------------------------------- | -------- | ------------ |
| T-020 | React Bits kurulumu + Aurora — 11 bileşen, `ogl` — 🟢 **Tamam** (PR #5)   | Frontend | T-002        |
| T-030 | **İçerik servisleri** (`Profile`/`Project`/`Post`/`Experience`/`Skill`/`Service`) — **F3'ten öne alındı, ADR-026** | Backend | T-015 |
| T-029a | Lighthouse'a masaüstü + koyu tema profili (T-020b/ENGEL-1)               | Güvenlik | T-020b       |
| T-021 | Ana sayfa: Hero, Hakkımda, Yetenekler (statik veri)                        | Frontend | T-020        |
| T-022 | Ana sayfa: Öne çıkan projeler, Hizmetler, İletişim bölümü + Kıyı Medya CTA | Frontend | T-021        |
| T-023 | `/hakkimda`, `/cv` (print stylesheet)                                      | Frontend | T-021        |
| T-024 | `/projeler`, `/projeler/[slug]` — filtre + detay şablonu                   | Frontend | T-020        |
| T-025 | `/blog`, `/blog/[slug]` — MDX render + `rehype-sanitize`                   | Frontend | T-020        |
| T-026 | `/hizmetler`, `/iletisim` (form UI, henüz submit yok)                      | Frontend | T-020        |
| T-027 | İletişim formu route handler + rate limit + honeypot + mail bildirimi      | Backend  | T-011, T-026 |
| T-028 | SEO: `sitemap.xml`, `robots.txt`, `rss.xml`, dinamik OG görseli            | Backend  | T-021        |
| T-029 | Lighthouse + axe denetimi, §5 sert kural kontrolü                          | Güvenlik | T-021…T-026  |

**Sıra:** T-020 ✅ → (**T-030 ∥ T-021 ∥ T-029a**) → T-022 → (T-023 ∥ T-024 ∥ T-025 ∥ T-026) → (T-027 ∥ T-028) → T-029

**F2 kabul kapısına ADR-026 ile eklenen madde:** public veri erişimi **açık önbelleklemeyle**
(`unstable_cache` + `revalidateTag`) yazılmış olmalı — ADR-011'in dinamik render'ı kabul
ederken karşılığında şart koştuğu koruma.

---

### F3 — Panel Çekirdek 🔵

| #      | Görev                                                                             | Ajan               | Bağımlılık   |
| ------ | --------------------------------------------------------------------------------- | ------------------ | ------------ |
| T-030  | İçerik servisleri: `Profile`, `Project`, `Post`, `Experience`, `Skill`, `Service` | Backend            | T-015        |
| T-031  | İçerik Server Actions + `AuditLog` + etiket düşürme — 🟢 **Tamam** (PR #12)       | Backend            | T-030        |
| T-032  | Panel layout: Sidebar, Topbar, breadcrumb, desenler — 🟢 **Tamam** (PR #12)       | Frontend           | T-002, T-013 |
| T-016b | Rota kapsamı kapısı — 🟢 **Tamam** (PR #12)                                       | Güvenlik           | T-032        |
| T-034  | `/panel/icerik/{projeler,deneyim}` CRUD — 🟢 **Tamam** (PR #13)                   | Frontend           | T-031, T-032 |
| T-038  | Mesaj kutusu okuma + durum eylemleri + §6 dönüşümü — 🟢 **Tamam** (PR #13)        | Backend            | T-027, T-032 |
| T-039  | E2E §9/6 kapandı, §9/2 ekran bekliyor — 🟢 **Tamam** (PR #13)                     | Güvenlik           | T-034, T-038 |
| T-040  | Panel okuma servisi (tüm durumlar + `status` DTO) — 🟢 **Tamam** (PR #13)         | Backend            | T-038        |
| T-041f | Mesaj kutusu **ekranı** + dönüşüm — 🟢 **Tamam** (PR #13)                         | Frontend           | T-038        |
| T-042g | §8.24: üç yeni yüksek danışma kapatıldı — 🟢 **Tamam** (PR #13)                   | Güvenlik           | —            |
| T-043g | Rota kapsamı + §9/2'nin dördüncü halkası — 🟢 **Tamam** (PR #13)                  | Güvenlik           | T-041f       |
| T-043f | Panel ekranları bağlandı, dolu silah boşaltıldı — 🟢 **Tamam** (PR #13)           | Frontend           | T-040        |
| T-042s | Şifre değiştirme sunucu yarısı — 🟢 **Tamam** (PR #13)                            | Backend            | T-013b       |
| T-044g | Dört rota beyanı + ADR-034 yayılımı + §9/1 — 🟢 **Tamam** (PR #13)                | Güvenlik           | T-043f       |
| T-046  | Oturum geçersizleştirme (A/B) + şifre hız sınırı + BULGU-019 — **P0**              | Backend            | T-044g       |
| T-035  | `/panel/icerik/blog` — MDX editör + önizleme                                      | Frontend           | T-043f       |
| T-036b | `/panel/icerik/profil` — hero metni, bio, sosyaller, CV dosyası                   | Frontend           | T-031, T-032 |
| T-033  | Panel dashboard — özet kartlar (`CountUp`), bugünün planı                         | Frontend           | T-040        |
| T-042f | Şifre değiştirme ekranı                                                           | Frontend           | T-042s       |
| T-037  | R2 yükleme ucu + imzalı URL + dosya doğrulayıcı (§8.11) — 🔴 **R2 hesabı bekliyor** | Backend + Güvenlik | T-015        |
| T-045  | Önbellek granülasyonu: detay girdilerinden `localeTag` çıkarma — **F3 sonrası**    | Backend            | T-040        |

**Sıra:** T-030 ✅ → T-031 ✅ → T-032 ✅ → (T-034 ✅ ∥ T-038 ✅ ∥ T-039 ✅) →
(T-040 ✅ ∥ T-041f ✅ ∥ T-042g ✅) → (**T-043g ∥ T-043f ∥ T-042s**) →
(T-035 ∥ T-042f ∥ T-033 ∥ T-036b) → T-037 → F3 kapanış → T-045

**T-043f neden P0 — "dolu silah" (Orkestra Şefi ölçümü, 2026-09-15):**
Depoda bugün canlı bir hata **yok** ve tehlike tam olarak bu.
`panel/icerik/projeler/page.tsx:5` hâlâ `getPublishedProjects` okuyor;
`projeler-ekrani.tsx:184` hâlâ `status: ContentStatus.PUBLISHED` **sabit yazıyor**.
İkisi birbiriyle tutarlı, kimse zarar görmüyor.

T-040 `fetchProjectsForPanel`'i yazdı. **İmportu değiştirmek tek satırlık, apaçık
doğru görünen bir değişiklik** — ve o satır tek başına değiştiği anda bir taslağı
düzenleyip kaydetmek onu sessizce yayına alır. Hiçbir test kırmızıya dönmez.
Bu yüzden iki yarı **aynı görevde ve aynı turda**; bölünürse arada kalan tur
sessiz veri kaybının penceresi olur.

**T-045 (Backend'in önerisi, kabul edildi, ertelendi):** `cached.ts`'te detay
girdilerinden `localeTag`'i çıkarmak aşırı geçersizleştirmeyi giderir (A'yı
düzenlemek B'nin sayfasını düşürmez) ve `slugTag`'i yük taşıyan hâle getirir.
Public önbellek davranışını değiştirdiği için **kendi ölçüm görevini hak ediyor**
ve bu turda Frontend'in ölçüm görevi var (ADR-023: iki ölçüm görevi paralel koşamaz).

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

### BULGU-013 — `lighthouse` işinde veritabanı yok (Orkestra Şefi, 2026-08-14)

**Önem:** Yüksek · **Sorumlu:** Güvenlik & Test · **Görev:** T-029c

`lighthouse` işi ayrı runner'da koşuyor ve `services:` bloğu **yok** — Postgres yok,
`db:seed` yok. ADR-026 ile ana sayfa gerçek veriden okumaya başlayınca `getProfile`
satır bulamayıp fırlatıyor (ADR-017) → sayfa **500** → Lighthouse denetlemeyi reddediyor
(`Status code: 500`, koşu `31814208273`).

**Kimsenin hatası değil, ADR-026'nın öngörülmemiş yan etkisi:** ölçüm işi de veriye
bağımlı hale geldi. `kapi` işinde DB var (T-005b) ama işler ayrı runner'da.

**Not:** T-023'ün eklediği `error.tsx` ziyaretçiye düzgün bir hata sayfası gösteriyor
ama HTTP durumu **500 kalıyor** — doğru davranış; Lighthouse'un reddi de doğru.

### T-005c / T-023 kabul doğrulaması (Orkestra Şefi, 2026-08-14)

**783 test · `audit` EXIT 0 · `Kapı` ve `§8.24` CI'da yeşil.**

**T-005c — `pnpm audit`'in yeşil olması sürümün doğru olduğunu göstermiyor.** İlk override
`">=3.3.18"` sessizce **6.0.1**'e çözüldü: üç majör atlama ve **CJS→ESM kopuşu**. `postcss`
`require('nanoid/non-secure')` yapıyor; yerelde Node 22.23 tolere etti ama `engines.node`
alt sınırımız `>=22.11.0` ve o yetenek 22.11'de yok — **beyan ettiğimiz asgari Node'da
postcss zinciri kırılırdı ve hiçbir kapımız görmezdi.** `pnpm why` ile yakalandı, üst sınır
eklendi. K2: *"aracın kendisine de ölçüm gözüyle bak"* bir kez daha karşılığını verdi.

Oyunkitabının en değerli maddesi: **katman seçimi ölçütü maruziyet değil, majör sınırı.**
Aynı majörde override doğru (ucuz, tersine çevrilebilir, üst paket güncellenince
gereksizleşir); majör atlıyorsa override **yanlış cevap** — kırılma denetimin göremediği
yerde çıkar. Ve *"ölü bir override, yaşayan bir açığı taşıyabilir"* — kaldırma koşulu
zorunlu tutuldu.

K3 (kendi ölçüm hatasını raporlaması: `node_modules` içinde `pnpm install` koşturup yanlış
kilit yazması) ve bundan bir oyunkitabı adımı türetmesi doğru refleks.

**T-023 — LCP teşhisi ölçüm modelini sorguladı.** Raporlanan 3.0 s "render delay",
Lighthouse'un **Lantern simülasyonu artefaktıymış**: gerçek kısıtlamayla LCP = FCP = 828 ms.
Ajan Lighthouse kaynağını okuyup mekanizmayı çıkardı (`getFirstPaintBasedGraph` cutoff'u
gözlenen LCP; localhost belgeyi 40 ms'te verdiği için tüm başlangıç JS'i o pencereye
düşüyor). **Fontlar ve render-blocking CSS suçlu değilmiş** — ENGEL-3'ün üç turdur taşınan
hipotezi çürütüldü.

Yine de tek gerçek kaldıraç olan "ilk 150 ms'e giren bayt" azaltıldı: `framer-motion`
başlangıç paketinden çıktı (168 → 127 kB), mobilde beş efekt yüklenmiyor. Mobil
90/91/92 → **92/92/92**, kritik JS 139 kB'a sabitlendi. **Denenip ölçüyle geri alınanlar
da kodda tablo hâlinde duruyor** — bölümleri Sunucu Bileşeni yapmak (RSC yükü belgeyi
11→19 kB büyütüyor) ve `preload: false` (FCP 907→1359).

**İki gerçek hata:** (1) `IntersectionObserver` yalnızca `entries[0]`'a bakıyordu; hızlı
kaydırmada öğe iki eşiği aynı karede geçince **altı bölüm kalıcı olarak gizli kalıyordu**.
(2) `TiltedCard`'ın statik dalı `gorsel` prop'unu yok sayıp `src=""` basıyordu — **hareket
tercihi kapalı kullanıcı kırık kutu görüyordu**, ve mobil de artık o dala düştüğü için
kapsam genişlemişti.

**Boş veritabanı ayrı bir DB açılarak sınandı** (paylaşılan geliştirme DB'sine
dokunulmadan) ve `error.tsx` eklendi.

### T-036c / T-005b kabul doğrulaması (Orkestra Şefi, 2026-08-11) — **F1 merge edildi**

**`main` = `e5dec94`.** PR #2 merge edildi, PR #1 kapatıldı (içeriği F1 dalındaydı).
T-036c ayrı dalda: **PR #4**.

**T-036c — yayınladığım sözleşme yanlıştı.** T-013e'nin `await update()` örneğini
doğrulamadan aktardım. `next-auth/react` argümansız çağrıda yalnızca GET yapıyor; POST
gitmediği için `jwt` callback'i `trigger: 'update'` ile çalışmıyor ve **kapı açılmıyor.**
Doğrusu `update({})` — gövdenin *içeriği* önemsiz (sunucu değeri DB'den okuyor) ama
*varlığı* POST'u tetikleyen şey. **Belirti sessiz: hata yok, sadece kapı açılmıyor.**
Ajan kaynağı okuyup ölçtü (`react.js:336`) ve gerekçeyi koda yorum olarak yazdı — bir
sonraki geliştirici `{}`'yi gereksiz sanıp silmesin diye.

**K2/K3 doğru sıralama kararları:** kodlar önce, tazeleme sonra (tazeleme hatası tek
gösterimlik kurtarma kodlarını yutmamalı); yönlendirme `confirm`'de değil "Bitir"de
(aksi hâlde kod ekranı hiç görünmez, T-036'nın "kaydettiğini onaylamadan kapanmaz"
kuralı çiğnenirdi). **K4:** yenilemede tazeleme gerekmediği **ölçüldü**, varsayılmadı.
**K5:** `SessionProvider` kök layout'ta değil bu sayfada — kökte olsaydı her public sayfa
oturum istemcisini indirip `/api/auth/session`'a istek atardı (K1/LCP bedeli).

**T-005b — kilit artık merge kapısında tutuyor.** CI'da auth E2E koşuyor:
**53 passed, atlanan 0** (önce 34 + 19 skipped). Kanıt PR'ıyla ölçüldü (koşu `31494718996`):
bozuk commit lint'ten, typecheck'ten ve **687 birim testinden geçti**, yalnızca E2E kırdı.
T-016'nın iddiası merge kapısında birebir doğrulandı.

**İlk deneme geçersizdi ve ajan bunu kayda geçirdi** (`31494544593`): `extends` kaldırılınca
kullanılmayan import kaldı ve kırmızıyı **lint** verdi — iş kırmızıydı ama ölçülmek istenen
şey ölçülmemişti. İkinci denemede gerçek hata kuruldu. Bu ayrımı yapmak, "kırmızı gördüm,
tamam" demekten farklı.

**Kabul edilen kararlar:** **K1 (`DATABASE_URL` iş düzeyinde değil, yalnızca üç adımda —
iş düzeyine koymak BULGU-002'nin canlı gerileme nöbetini sessizce düşürürdü; "yeni bir
yetenek eklerken var olan bir nöbeti düşürmemek")**, K2 (`migrate deploy`, `migrate dev`
değil — sonuncusu CI'da veritabanını sıfırlayabilir), **K3 (atlanan test nöbeti — Playwright
atlanan testlerde sıfır olmayan çıkış kodu vermiyor; DB bir gün sessizce düşerse paket
kendini atlar ve koşum yeşil kalırdı. "Bulguyu kapatmak yetmez, geri gelme yolunu da
kapatmak gerekir")**, K4 (CI kimlikleri açıkça sahte — public depoda `AUTH_SECRET=` satırı
ileride gerçek sızıntı sanılabilir), K5.

**T1 kabul edildi ve kaydedildi:** §8.18 derleme çıktısı taraması `DATABASE_URL` açısından
boşta — iki gereksinim (tarama vs BULGU-002 nöbeti) çelişiyor ve nöbet tercih edildi.
**F6/T-062'de yeniden değerlendirilecek.**

### T-013e / T-019b kabul doğrulaması (Orkestra Şefi, 2026-08-10) — **F1 KAPANDI**

**687 test · kapı temiz.** `requiresTwoFactorSetup` son hâli ve `two-factor.ts` md5
(`fc0afebfaf6b9affcb9ed3ed0430ffab`) depoda doğrulandı.

**T-019b/K3 bu projenin en değerli bulgularından biri.** Üç E2E testi **vakum hâlinde
yeşildi**: `toHaveURL(/\/panel/)` deseni kurulum ekranına (`/panel/ayarlar/guvenlik`) de
uyuyor. Kapı devreye girince "doğru şifre → `/panel`" adlı test aslında **kurulum ekranına
varıp yeşil kalmaya devam etti** — adı yalan söyleyen bir test. Ajan "19 passed" gördüğü
hâlde durup baktığı için çıktı.

> **"Yeşil bir paket, doğru şeyi ölçtüğünün kanıtı değil."**

Bu cümle F2'den itibaren her test görevinin kartına referans olarak girecek.

**K1'in gerekçesi de kayda değer:** `null`'ın artık kapıyı **kapatması**, yalnızca "alan
artık var" diye değil — *"bir kontrolün, beslendiği verinin yokluğunda açılması değil
kapanması gerekir."* Alanı yazan kod bir gün sessizce bozulursa kapı da sessizce açılırdı.
T-019'daki geçici davranış o gün doğruydu (2FA'sı kurulu kullanıcıyı kilitlememek için),
bugün değil — bağlam değişince kararı gözden geçirmek doğru refleks.

**K5:** Backend'in beslemesini **kabul etmeden önce doğrulaması** — özellikle
`refreshTwoFactorClaim`'in değeri DB'den okuduğu. `update()` gövdesi istemcinin denetiminde;
oradan okunsaydı kullanıcı `{ tfa: true }` göndererek kendi kapısını açardı. İki ajanın
birbirinin çıktısını körlemesine kabul etmemesi, bu yapının asıl faydası.

**T-013e kararları:** K1 (jeton mantığı `credentials.ts`'e — `auth.ts` test edilemiyor),
**K2 (`update` dalı değeri DB'den okuyor)**, K3, **K4 (`as any` yerine tip artırması; alan
**opsiyonel** — zorunlu yapmak geçiş penceresinde var olmayan bir garantiyi tipte varmış
gibi gösterirdi)**, K5, K6 (`TWO_FACTOR_CLAIM` sabiti tüketildi, `'tfa'` elle yazılmadı).

**Açılan/kalan:** T1 (`src/server/db.ts` biçimlendirme) → T-036c ile birlikte Backend'e
iletilecek küçük iş · T2 → BULGU-007 cron tarafı F7 · **T3 → T-005b, F2 öncesi zorunlu**.

### T-003d kabul doğrulaması (Orkestra Şefi, 2026-08-10) — **ikinci bulgu daha ciddiydi**

**671 test · kapı temiz.** `getPool()` düzeltmesi depoda doğrulandı.

BULGU-007 (kısa ömürlü betikler 30 sn fazladan yaşıyor) kapandı: **30.63 sn → 0.18 sn**.
Ama asıl bulgu, onu ararken çıkan ikinciydi:

> **Üretimde her sağlık kontrolü bir havuz sızdırıyordu.** `getPool()`'un üretim dalı
> havuzu **hiçbir yere yazmıyordu** — `if (process.env.NODE_ENV !== 'production')` koşulu
> yalnızca `globalThis`'e yazmayı atlıyor sanılmıştı, oysa üretimde **hiç önbellekleme
> yoktu.** `pingDatabase()` her sağlık kontrolünde çağrılıyor ve Coolify + Uptime Kuma
> (§13.6–13.7) saniyeler arayla yokluyor. Ölçüldü: 5 çağrı → **6 bağlantı** (üretim),
> düzeltmeden sonra **2**. Havuzlar `idleTimeoutMillis` boyunca yaşadığı için üretimde
> birikir ve `max_connections` (100) sınırına dayanırdı — o noktada uygulama **hiç
> bağlanamaz** hâle gelirdi.

BULGU-007 kısa ömürlü betikleri etkiliyordu; bu, **uzun ömürlü üretim sunucusunu** etkiliyordu
ve yalnızca üretimde görünürdü. Backend bunu kendi T-003c hatası olarak açıkça sahiplendi:
"o zaman yalnızca hot reload'ı ölçmüştüm, üretim dalını ölçmemiştim."

**BULGU-007'nin bir varsayımı da düzeltildi:** "seed de aynı gecikmeyi yaşıyor olmalı"
denmişti; seed kendi havuzunu kurup `pool.end()` çağırdığı için zaten hızlıydı. Backend
ölçtü, varsaymadı (ADR-023). Yine de ortak havuza geçirdi — seed'in havuzu **ayarsızdı**
(`max`, `idleTimeoutMillis`, `connectionTimeoutMillis` uygulanmıyordu).

**Kabul edilen kararlar:** K1 (`process.exit()` kullanılmadı — semptomu gizler, uçuştaki
yazmaları keser), K2 (`closeDatabase()` proxy'ye dokunmuyor — dokunsaydı olmayan bir
istemciyi kurar ve "hiç kurulmadıysa no-op" garantisini bozardı), K3, K4, K5, K6.

### T-019 kabul doğrulaması — 🟡 Kısmen (dürüst değerlendirme)

**662 birim + 53 E2E.** Kapı kuruldu, döngü koruması, `403`, çıkış yolu, DB'siz çalışma —
hepsi var ve **devre dışı bırakılarak kanıtlandı** (12 birim + E2E bloğu kırıldı, `md5`
ile geri yüklendi).

**§8.1'i ✅ yapmaması doğru karardı.** Görev kartım "⚠️→✅ olmalı" diyordu; ajan uymadı ve
haklı: kapı `tfa` alanını okuyor ama giriş akışı alanı jetona koymuyor, yani **bugün gerçek
bir kullanıcı 2FA'sız panele girebiliyor.** "✅ demek, çalışmayan bir korumayı çalışıyor
göstermek olurdu." Kabul kriterimi kriterin amacına tercih etti — doğru olan buydu.

**Kabul edilen kararlar:** **K1 (`null` ile `false` ayrı durumlar — `null`'ı "kurulu değil"
saysaydı, 2FA'sı zaten kurulu bir kullanıcı kurulum ekranına **kalıcı olarak kilitlenirdi**,
çünkü jetonu alanı hiçbir zaman kazanmayacaktı; R3'ten daha kötü bir sonuç)**, **K2 (geçiş
penceresi güvenlik gevşetmesi değil — alanı taşımayan jeton yalnızca `AUTH_SECRET`'i bilen
tarafça üretilebilir, saldırgan alanı "düşürerek" kapıyı atlayamaz)**, K3 (karar mantığı
saf modülde), **K4 (muafiyet segment sınırında — `/panel/ayarlar/guvenlik-yedek` yanlışlıkla
muaf olsaydı oraya konacak her sayfa kapıyı sessizce atlardı)**, K5 (`403` vs `401` —
"yeniden giriş" ile "kurulumu tamamla" farklı şeyler), K6.

**JWT seçim gerekçesi ikna edici:** ayrı çerez istemci tarafından `tfa=1` yazılarak
atlatılabilirdi — yetkilendirme kararını istemci kontrolündeki bir girdiye bağlamak kabul
edilemez. Middleware'de DB sorgusu Edge'de mümkün değil (T-014/K1) ve her isteğe gidiş-dönüş
eklerdi.

**Açılan görevler:** BULGU-008 → **T-013e** (Backend) · T2 → **T-019b** (geçiş penceresinin
kaldırılması; **rapor notu değil görev olarak** açıldı — unutulursa pencere kalıcılaşır) ·
T3 → çıkış düğmesi, T-036'nın devamı olarak Frontend'e.

### T-016 kabul doğrulaması (Orkestra Şefi, 2026-08-10)

**641 birim + 46 E2E testi · kapsam %93.75 · kapı temiz.** `src/server/auth.ts`'in birebir
geri yüklendiği depoda doğrulandı (`extends CredentialsSignin` yerinde), `LockoutClient`
düzeltmesi uygulanmış.

**Regresyon kilidi gerçekten tutuyor — ölçülerek kanıtlandı.** `extends Error`'a geri
döndürülüp **dört kodun dördü de ayrı ayrı kırdırıldı**, sonra md5 ile geri yüklendiği
gösterildi. T-018'in QR hatalarını geri koyup ölçmesiyle aynı disiplin.

**Kabul edilen kararlar:** **K1 (TOTP hesaplayıcısı `otplib` kullanmıyor — aynı kütüphaneyle
hem üretip hem doğrulasaydı, kütüphane yanlış davransa bile test yeşil kalırdı; RFC'nin
resmî vektörleri "doğrulayanı kim doğruluyor" sorusunu cevaplıyor)**, K2 (`tsconfig.e2e.json`
— E2E'ye özgü bir sorunun bedelini tüm derlemeye ödetmemek), **K3 (DB işleri ayrı süreçte —
alternatifi kriptografiyi test tarafında ikinci kez yazmaktı; biçim değişince sessizce
yanlış veri üretirdi)**, **K4 (`auth.spec.ts` mobilde koşmuyor — paylaşılan tek DB satırında
iki proje paralel koşunca biri ötekinin 2FA'sını kapatıyor; "retry ile örtmek yanlış olurdu,
sorun kararsızlık değil paylaşılan durum")**, K5, K6, K7 (T-015/T3 taşıması yapılmadı —
`src/lib/security/**` → `src/server/services/**` bağımlılığı kurardı; kabul edildi).

**`LockoutClient` düzeltmesinin yan faydası:** `diff`'e artık `Date` veya sınıf örneği
konulamıyor — sessizce `{}` olarak serileşip denetim kaydını boşaltırdı. Tip daraltması
bir hatayı da kapatmış.

**T4 — şeffaflık takdir edildi.** Backend'in dosyasını geçici değiştirmek regresyon kanıtı
için zorunluydu; md5 ile geri yüklendiğini göstermek doğru davranış.

### §8.1 karara bağlandı (T-016/T2) — PROGRAM.md güncellendi

Özgün metin "2FA v1'de **zorunlu olarak açık gelir**" diyordu. Seed'in 2FA'yı açık üretmesi
teknik olarak mümkün ama **secret'ı kimse bilmediği için kilitlenme üretirdi** (R3).
Zorunluluk **kurulum anına taşındı, gevşetilmedi**: `totpConfirmedAt` boşken panel her
istekte kurulum ekranına yönlendirir, kurulum tamamlanmadan panel kullanılamaz. → **T-019**

**T3 → T-005b açıldı.** Auth E2E CI'da koşmuyor; yani bu görevin kapattığı regresyon kilidi
**merge kapısında henüz tutmuyor.** Yerel bir kilit, kilit değildir.

**T1 → T-003d açıldı** (BULGU-007, `closeDatabase()`). §13.5'in gece cron'ları kısa ömürlü —
her biri 30 sn fazladan yaşarsa yedek penceresi kayar.

### T-015b / T-018 / T-018b kabul doğrulaması (Orkestra Şefi, 2026-08-10)

**627 test geçiyor · lint / typecheck / build EXIT 0 · `.env`'siz build de EXIT 0.**
`guvenlik/page.tsx` bağlı olduğu depoda doğrulandı. **E1 kapandı** — Backend'in
çalıştıramadığı build'i Orkestra Şefi koşturdu, iki senaryoda da EXIT 0.

**T-015b kararları:** **K1 (hız sınırı sayacı `AuditLog`'da, `LoginAttempt`'te değil —
kurulum sırasında kodu yanlış giren dürüst bir kullanıcı, 2FA'yı henüz kuramamışken kendi
hesabını kilitlemiş olurdu; eşik yine Güvenlik'in sabitinden, ikinci sihirli sayı yok)**,
**K4 (`enabled` ölçütü `totpConfirmedAt` — iki yerde farklı ölçüt "ekranda açık, girişte
kapalı" tutarsızlığı üretirdi)**, K5, K6 (yanlış kodda secret korunuyor), K7, K8.

**K2 karara bağlandı — ayrı `AuditAction` değeri eklenmiyor.** `LOGIN_FAILED` +
`diff.context` yeterli; migration maliyeti gerekçelendirilemez. Hoş bir kapanış oldu:
ADR-022 `LOGIN_FAILED`'i kullanılmayan enum değeri olarak bırakmış ve bunu "küçük bir koku"
diye kabul etmiştim — artık gerçek bir kullanımı var.

**T-018 → ADR-024 GEÇERLİ.** K1 şartı gerçekten karşıladı: altın vektörler **referans
uygulamadan** üretildi, kendi çıktısından değil. Kendi çıktısını mühürleseydi test yalnızca
"bugün ne üretiyorsan onu üretmeye devam et" der ve **mevcut bir hatayı sonsuza kadar doğru
sayardı.** İki hatayı geri koyup **17 testin kırıldığını ölçmesi** kanıtın kendisi.
K3 de doğru: kodlayıcının yerleştirme mantığını testte ikinci kez yazmak, aynı yanlış
anlamayı iki yere kopyalama riski taşırdı.

**T-018b — zincirin her halkası farklı uygulama.** QR bağımsız çözücüyle (jsQR) okundu →
`otpauth://` ayrıştırıldı → **sıfırdan yazılmış** RFC 6238 uygulamasıyla kod üretildi
(projenin `otplib`'i kullanılmadı) → sunucu kabul etti. O uygulama önce **RFC 6238'in
resmî test vektörleriyle** doğrulandı. Bu, ADR-024'ün pratikteki sınavı.

**K4 (test sonrası 2FA sıfırlandı) doğru ve önemliydi:** koşum bitince kullanıcıda 2FA açık,
secret'ı yalnızca test harness'ı biliyor, kurtarma kodları hiçbir yere kaydedilmemişti.
Bu hâlde bırakmak **site sahibini kendi panelinden kilitlerdi.** "Sahte bir açık durum
güvenlik değil, kilitlenme üretir" — doğru muhakeme.

**ENGEL-3 kabul edildi:** fiziksel cihaz sınavı yapılmadı ve bu dürüstçe raporlandı.
Site sahibinin ilk kurulumu kendi telefonuyla yapması bunu doğal olarak kapatır.

### T-015 kabul doğrulaması (Orkestra Şefi, 2026-08-10)

**149 yeni test · toplam 553 · `src/server` kapsamı %90.08** (kriter ≥%85) ·
`_shared` %99.41. Kapı temiz, `.env`'siz de.

**Yakalanan hata ADR-016'nın tam hedefindeydi:** `appDayToDate('2026-02-30')` sessizce
**2026-03-02** üretiyordu. `new Date('2026-02-30T00:00:00Z')` fırlatmıyor, **taşırıyor** —
ve regex biçimi doğruladığı için geçiyordu. Yani takvimde olmayan bir gün geçerli ama
yanlış bir tarihe dönüşüp kayıt başka güne yazılabilirdi. Gidiş-dönüş karşılaştırmasıyla
kapatıldı.

**Kabul edilen kararlar:** K1 (konum → ADR-016 revize edildi, aşağı bak), **K2
(`Intl.DateTimeFormat` — elle UTC+3 eklenmedi; sabit ofset 2016 öncesi tarihlerde yanlış
olurdu ve yaz saati geçişlerini kaçırırdı)**, K3, K4 (yarım-yukarı yuvarlama — tek
kullanıcılı bir defterde okul yuvarlaması beklenen davranış), K5 (`DecimalLike` yapısal
arayüz — modül üretilen istemciden bağımsız), **K6 (redaksiyonda döngüsel referans koruması
— kendine referans veren bir `diff` denetim kaydını değil **sunucuyu** düşürürdü)**,
**K7 (PR hesabı DAİMA sıfırdan — "daha ağırsa güncelle" mantığı düzeltme ve silmeyi kaçırır;
ADR-021'in kapatmak istediği sessiz hata tam olarak buydu)**, K8, **K9 (barrel sözleşme
testi — barrel'in çalıştırılabilir satırı yok, yani kapsam onu göstermez; bir yardımcı
yeniden adlandırılırsa hata F3/F4/F5'e kadar görünmez kalırdı)**.

**Konvansiyonun en değerli maddesi:** `AuditLog` ve `revalidatePath` **serviste değil,
Server Action'da.** Servis yeniden kullanılabilir kalmalı — cron ve seed de çağıracak,
onların denetim ve önbellek ihtiyacı farklı. Bu ayrım F3–F5'te onlarca dosyayı etkileyecek.

**T1 → ADR-016 revize edildi.** Yardımcı `services/_shared/app-date.ts`'te kalıyor.
**Bağlayıcı ek kural:** Frontend kendi gün yardımcısını **yazmaz**; ihtiyaç doğarsa
yardımcı ortak konuma taşınır ve iki taraf oradan içe aktarır. İki ayrı uygulama, ADR-016'nın
önlemek için var olduğu hatanın ta kendisi olurdu.

**T3 → T-016'ya opsiyonel madde olarak eklendi** (kilit kaydının `writeAuditLog`'a taşınması;
bugün doğru çalışıyor, zorunlu değil).

### T-036 kabul doğrulaması (Orkestra Şefi, 2026-08-10) — 🟡 Kısmen

Ekran tamamlandı, 37 kontrol geçti, sızıntı denetimleri temiz. **553 test geçiyor**, kapı
temiz. `src/server/actions/` **boş** olduğu depoda doğrulandı — ENGEL-1 gerçek ve F1
kapısını tutan tek engel.

**QR kodlayıcı → ADR-024.** Bağımlılık yerine kendi kodlayıcısını yazması ADR-004'e göre
onay gerektirirdi; onay turu F1'i bloke edeceği için beklemeden yazmış. **İstisna olarak
kabul edildi, kural değil.** Kodlayıcı kalıyor: kapsam dar (bayt kipi, EC-M, v1–14),
girdi öngörülebilir, ve **düz metin secret yedeği zaten var** — QR okunmazsa kullanıcı
anahtarı elle girebiliyor, yani blast radius küçük.

**Doğrulama sırasında bulduğu iki hata, kütüphane kullansa hiç öğrenilemezdi:**
format bilgisinin birinci kopyasının satır yerine **sütun 8**'e yazılması gerektiği, ve
Reed–Solomon üreteç polinomunun **katsayı sırasının ters** olması. İkincisi özellikle
sinsi: çıktı "geçerli bir QR" gibi görünüyor ama hiçbir okuyucu çözemiyor.

**ADR-024'ün şartı:** o 1080 matrislik karşılaştırma **geçici bir sayfayla** yapıldı ve
sayfa silindi — yani doğrulama **tekrarlanabilir değil.** Kalıcı teste dönüştürülmesi
şart koşuldu (T-018). Doğrulanamayan kod, doğrulanmamış koddur.

**Kabul edilen kararlar:** K2 (kurulum doğrulaması yalnızca TOTP kabul eder — kurtarma
kodu o anda henüz üretilmemiştir), K3 (QR renkleri bilerek tema dışı; okuyucular kontrasta
bakar, marka moruna boyamak okuma başarısını düşürürdü — değerler `globals.css`'te token,
bileşende hex yok), K4 (tek `<path>` — 53×53'te ~2800 DOM düğümü yerine),
**K5 (sahte veriyle çalışan önizleme KONULMADI — "güvenlik ekranının açık görünüp aslında
hiçbir şey yapmaması, hiç olmamasından kötüdür"; doğru içgüdü)**, K6 (eylemler prop olarak).

**ENGEL-4 → ADR-023 revize edildi.** Ölçüt artık mekanik: **`pnpm build` veya `pnpm start`
çalıştırmayı gerektiren her görev ölçüm görevidir.** T-036'yı "ölçüm değil" diye
işaretlemiştim çünkü E2E/Lighthouse istemiyordu — ama tarayıcıda doğrulama gerektiriyordu,
yani aynı yarışa girdi. Sınıflandırma benim takdirime bırakılmayacak.

**Açılan görevler:** ENGEL-1 → **T-015b** (Backend) · ENGEL-2 → **T-019** (Güvenlik) ·
ENGEL-3 + ADR-024 şartı → **T-018** (Frontend) · ENGEL-5 → `regenerateBackupCodes`
**opsiyonel değil, zorunlu** (T-015b kapsamında; kodlar bitince kullanıcı yalnızca TOTP'ye
bağımlı kalmamalı).

### T-013c kabul doğrulaması (Orkestra Şefi, 2026-08-10)

**404 test geçiyor** (önce 344) · `lint` / `typecheck` / `build` EXIT 0. Depoda doğrulandı:
`class CredentialsError extends CredentialsSignin`, `loginCodeSchema` yayınlanmış,
boş dize `z.preprocess` ile ele alınmış.

**Dördüncü hata, ilk üçü düzeltilmeseydi hiç görünmezdi.** ENGEL-1 ve ENGEL-2 kapandıktan
sonra izole deney hâlâ `INVALID_CREDENTIALS` veriyordu: HTML formu ilk adımda alan ekranda
görünmese bile `totpCode=""` gönderiyor, boş dize ne 6 hane regex'ini ne kurtarma kodu
uzunluğunu geçiyordu. **Bu düzeltilmeseydi kabul kriterleri "geçmiş" görünürken Frontend'in
gerçek formu hâlâ çalışmayacaktı** — kriterleri sağlamak ile işi çalıştırmak arasındaki farkı
gören bir tespit.

**Kanıt izole deneyle üretildi, varsayılmadı.** Üretim derlemesine gerçek POST, `Location`
başlığından okunan `code` değerleri — altı senaryonun tamamı. Kurtarma kodu girişi uçtan uca:
`/panel`'e yönlendi, oturum çerezi oluştu, **kurtarma kodu 3 → 2 tüketildi**. Kilit yazımı
DB'den okundu: `lockedUntil` +15 dk, `AuditLog` kaydı `reason: LOGIN_RATE_LIMIT` ile düştü.

**Kabul edilen kararlar:** K1, **K2 (boş dize `z.preprocess` ile, `loginCodeSchema`'ya
`.or(z.literal(''))` eklenmedi — birleşim geçerli kod biçimlerini tanımlar, "boş = yok" ise
forma özgü bir kural; karıştırılsaydı T-036'daki doğrulama formu boş dizeyi geçerli sayardı)**,
**K3 (`fail()` kullanıcı aramasından sonra tanımlandı — var olmayan e-postada `userId: null`,
politika sayar ama yazacak kayıt bulamaz, numaralandırma sızıntısı oluşmaz)**, **K4 (adaptör
— Güvenlik'in tipini değiştirmek yerine; ayrıca `user`/`loginAttempt` **getter** olarak
tanımlandı, doğrudan yazılsaydı modül yüklenirken Prisma çözülür ve T-003c'nin `.env`'siz
derleme kazanımı kaybolurdu)**, K5, K6 (deney ortamı geri alındı).

**T1 → yeni bulgu, Güvenlik ajanına iletildi:** `LockoutClient` gerçek `PrismaClient` ile
uyumsuz (`TS2322`); kök neden `auditLog.create`'in XOR birleşimi + `InputJsonValue`.
Bugün açık yaratmıyor (adaptörle çözüldü) ama `rate-limit.ts`'i doğrudan `db` ile çağıracak
sonraki kod aynı duvara çarpar. **Politika yalnızca sahte istemcilerle test edildiği için
T-014'te görünemezdi** — bağlamaya çalışmadan fark edilemeyecek bir sınıf.

**T2 kabul edildi:** `code` ulaşımının regresyonu **E2E'ye ait**; `src/server/auth.ts`
birim testiyle sabitlenemiyor (T-013b/T3). T-016 bunu kalıcı hâle getirmeli — aksi hâlde
biri sınıfı tekrar `Error`'a çevirirse yalnızca üretimde anlaşılır.

### Q7 karara bağlandı — T-036 F1'e alındı

Frontend haklıydı: **kurtarma kodları kullanıcıya hiç gösterilmediği sürece ADR-013'ün
kurtarma yolu pratikte kullanılamaz.** Daha temeli: §8.1 "2FA v1'de zorunlu olarak açık
gelir" diyor, ama 2FA'yı **açacak ekran yok** — seed `totpConfirmedAt`'i boş bırakıyor ve
sistem şu an 2FA'sız çalışıyor. **F1'in kabul kapısı bu hâliyle dürüstçe kapanamaz.**
T-036 F3'ten F1'e alındı.

### T-012 / T-014 / T-017 kabul doğrulaması (Orkestra Şefi, 2026-08-05)

Üçü de kabul edildi. Depo durumu: **389 test geçiyor** · `lint` **EXIT 0** · `build` **EXIT 0**.

**T-012** — 21 varlık, idempotenslik üç çalıştırmayla doğrulanmış, **hepsi
`createXSchema`'dan geçiyor** (görevin varlık sebebi buydu). T-011 sözleşmesinde boşluk
çıkmadı — 21/21 ilk denemede geçti. `baseAmount = amount × fxRate` SQL ile ölçülmüş;
`Job → Transaction` türetmesi çalışıyor. K3 (Attachment üretilmedi — sahte `key` imzalı URL
istendiğinde çözülemeyen, `Restrict` yüzünden temizlenemeyen kayıt bırakırdı) doğru karar.
K4 (`computeBaseAmount` BigInt ile — kayan nokta kuruş sapması aylık toplamlarda birikir)
da öyle. T1 (`prisma.config.ts` + iki `.mjs`) onaylandı: ADR-007 zaten Backend'e veriyor ve
Prisma 7'de `prisma.seed` **okunmuyor** — eski yere yazılsaydı `migrate reset` seed'i sessizce
atlardı.

**T-014** — §8.5 **kapandı**; `/panel` F0'dan beri açıktı, artık kriptografik olarak korunuyor
(çerezin varlığı yeterli değil, `getToken` `AUTH_SECRET` ile çözüyor). 58 birim + 34 E2E testi.

> **Kabul kriterimden bilinçli sapması DOĞRUYDU ve benim kriterim yanlıştı.** `/giris`'i
> matcher **dışında** bırakmasını istemiştim; gerekçem döngü riskiydi. Koruma matcher'a değil
> `isProtectedPath()`'e bağlı olduğu için döngü zaten oluşamıyor — ve matcher dışına atılsaydı
> **sitedeki en hassas public sayfa `X-Frame-Options` ve `Referrer-Policy` olmadan servis
> edilirdi.** Kriterin amacı korunmuş, mekanizma daha güvenli.

K1 (`getToken` — Edge'de Prisma zinciri yüklenemez), **K2 (kapalı yönde başarısız —
`AUTH_SECRET` yoksa erişim reddedilir; ters tasarım yapılandırma hatasını sessiz yetki
atlatmasına çevirirdi; yerelde fiilen gözlendi)**, **K3 (çerez adı sapması teste bağlandı —
T-013a dersinin uygulanması: `session.ts` ile `auth.ts` ayrışırsa hiçbir hata çıkmaz)**,
**K4 (`/api/v1/panel/*` yönlendirilmiyor, `401` JSON dönüyor — `fetch` yönlendirmeyi sessizce
izler, çağıran HTML'i veri sanar; benim kriterim burada da gevşekti)**, K5, K6, K7 kabul edildi.

**T-017** — 27 kontrol Playwright ile geçti, Lighthouse A11y 100. Kendi kodunda **iki gerçek
güvenlik kusuru** bulup düzeltti:
- **K5:** Hidrasyon tamamlanmadan Enter'a basılınca tarayıcı yerel GET yapıyor ve **şifre
  `?password=...` olarak adres çubuğuna, geçmişe ve sunucu erişim kayıtlarına düşüyordu.**
  `<form method="post">` bu pencereyi kapattı.
- **K6:** Açık yönlendirme kontrolü `/\evil.com` ile atlatılıyordu — WHATWG URL ayrıştırıcısı
  ters bölüyü eğik çizgi sayıyor. Playwright'ta siteden gerçekten çıkıldığı görüldü; dize
  karşılaştırması URL ayrıştırmaya çevrildi.

K3 (`result.error`'ın boşluğuna bakılıyor, `result.ok`'a değil — Auth.js `ok`'u HTTP
durumundan türetiyor ve kimlik doğrulama başarısızken de `200` dönüyor) kaynak kodda
doğrulanmış. K7 (kurtarma kodu anahtarı) kabul edildi: iOS sayısal tuş takımında harf yok,
o anahtar olmadan telefonunu kaybetmiş kullanıcı mobilde kurtarma kodunu **fiziksel olarak
giremiyordu**; alan/form/gönderim tek kaldığı için ADR-013'ün "ayrı form yapma" kuralı korunuyor.

### Kapanan ve açılan kalemler

- **BULGU-006 — yanlış pozitif, kapatıldı.** `pnpm lint` **EXIT 0** olarak ölçüldü. Backend
  aynı sorunu kendi turunda K6 (`process.stdout.write`) ile zaten çözmüştü; Güvenlik ajanı
  **bayat bir ağaç durumunu** ölçmüş. → ADR-023
- **ENGEL-3 / T3 — Orkestra Şefi çözdü.** Yerel `.env`'e `AUTH_SECRET`, `TOTP_ENCRYPTION_KEY`,
  `AUTH_URL`, `TOTP_ISSUER` üretildi (`openssl rand -base64 32`). `.env` gitignore'da.
- **ENGEL-1, ENGEL-2, BULGU-005 → T-013c açıldı.** Üçü de depoda doğrulandı.
- **ENGEL-4 / T5 → ADR-023.** Ölçüm görevleri artık tek başına koşar.
- **ENGEL-5 — teyit edildi**, işlem gerekmiyor (T-014/K1'in bilinçli sapması).

### T-013b kabul doğrulaması (Orkestra Şefi, 2026-08-05)

**36 yeni test · toplam 344 · `src/server/auth/` kapsamı %100 satır.** Çerez bayrakları
depoda doğrulandı: `httpOnly` · `sameSite: lax` · `secure` (üretimde) · `maxAge` açık (§8.3).
`lint` / `typecheck` / `build` EXIT 0.

**Auth.js'in bilinmeyen anahtarı tip düzeyinde reddettiğini test etmesi** doğru refleks:
T-013a'da otplib'in sessizce yuttuğu hata sınıfının burada **imkânsız olduğunu kanıtladı**,
"muhtemelen sorun yok" demedi.

**Kabul edilen kararlar:** K1 (akış `credentials.ts`'e ayrıldı — `authorize` içine gömülseydi
test edilemezdi), **K2 (kilit kontrolü şifreden SONRA — öncesinde bakılsaydı saldırgan bir
e-postayı kilitleyip yanıta bakarak hesabın varlığını öğrenirdi)**, K3 (sabit
`DUMMY_PASSWORD_HASH` — var olmayan kullanıcıda da argon2 maliyeti ödeniyor), K4 (kurtarma
kodu TOTP ile aynı alandan), **K5 (kurtarma kodu tüketimi yazılamazsa giriş reddedilir;
`lastLoginAt`/rehash yazılamazsa engellenmez — güvenlik sınırı ile konfor ayrımı)**,
K6 (çerez bayrakları açık — §8.3 kütüphane sürüm notlarına bağlanamaz), K7 (`trustHost`
— Coolify ters vekili, §13.3), K8 (logger daraltıldı — Auth.js'in kendi logları e-posta
içerebilir), K9 (`pages.signIn: '/giris'` → T-017).

**T1 ve T3 onaylandı.** `credentials.ts` kapsam dışıydı ama gerekçesi sağlam; `auth.ts`'in
birim testi olamaması kabul edilebilir — dosya neredeyse saf yapılandırma, tek gerçek mantık
test edilebilir modüle taşınmış. Kalan doğrulama T-016 E2E'ye ait.

**T5 → ADR-022.** Sınır: **denemeler `LoginAttempt`'e, sonuçlar `AuditLog`'a.** Giriş
denemeleri `AuditLog`'a yazılmıyor (aynı olay iki yerde tutulmaz, §6); ama kilitlenme,
şifre değişikliği, 2FA açma/kapatma ve kurtarma kodu yenileme yazılıyor — `User` kaydını
değiştiriyorlar ve `LoginAttempt`'in 90 günlük temizliğinden etkilenmemeleri gerekiyor.

**T2 → T-017 açıldı** (Frontend, `/giris`). **T4 → T-014 kartına işlendi.**

### T-013a kabul doğrulaması (Orkestra Şefi, 2026-08-05)

**51 birim testi · `src/server/auth` kapsamı %100 satır** (kriter ≥%90). Toplam paket
**302 test**. Bağımsız denetim: `src/server/auth/` içinde `console.*` **yok**, `any` **yok**,
`@ts-ignore` **yok** — §8.20 ve §2 yasakları temiz. `lint` / `build` EXIT 0.

**Üç bulgunun ikisi aynı sınıftan: "uygulanmış görünen ama uygulanmayan yapılandırma."**

1. **`{ plugins: { crypto, base32 } }` sessizce yok sayılıyordu.** otplib 13'ün seçenek
   tipinde `plugins` yok; nesne atılıp kütüphane kendi varsayılanına düşüyordu. Kod kripto
   sağlayıcısını **açıkça seçiyor gibi durup seçmiyordu** ve testler geçiyordu. TypeScript
   yakaladı, çalışma zamanı yakalamadı.
2. **`epochTolerance` adım değil saniye.** `1` yazılsaydı ±1 **saniye** tolerans olurdu,
   ±1 adım değil — kullanıcıların çoğu periyot sınırında reddedilirdi.
3. **`Buffer.from(x, 'base64')` bozuk girdide fırlatmıyor.** Anahtar çözümündeki `try/catch`
   **ölü koddu ve yanlış bir doğrulama güvencesi veriyordu**; `'!!!not-base64!!!'` → 7 baytlık
   tampon. Gerçek doğrulama uzunluk kontrolüne çevrildi.

**Kabul edilen kararlar:** K1, K2 (`delta` sızdırılmıyor — kullanıcının saat kaymasını
söyler, yanıta taşımak gereksiz bilgi verir), **K3 (`consumeBackupCode` erken çıkmıyor —
tüm hash'ler doğrulanıp sonra eşleşme seçiliyor; erken çıkılsaydı "1. kodda eşleşti" ile
"hiç eşleşmedi" arasında ölçülebilir süre farkı olurdu; ~300 ms maliyet nadir akış için
kabul edildi)**, **K4 (`decryptSecret` fırlatır, `verifyPassword`/`verifyTotpToken` fırlatmaz
— bozuk şifre normal bir olay, bozuk şifreli metin kurcalama sinyali; sessizce yutulsa
saldırganın seçtiği secret kabul edilmiş olurdu)**, K5, **K6 (`needsRehash` — kriterlerde
yoktu; parametre yükseltmesi ancak doğru girişte mümkün, bu kanca olmadan yükseltme yolu
kapalı kalırdı)**, K7 (testler kendi argon2 parametresini veriyor, üretim sabiti korunuyor),
K8 (kod alfabesinden `0/O`, `1/I/L`, `2/Z`, `5/S`, `8/B` çıkarıldı — ~46 bit entropi korunuyor).

**T1 onaylandı** — README'ye `openssl rand -base64 32` bloğu eklenmesi doğru; sözleşme
maddesi zaten bunu istiyordu.

**Ölçülen:** `hashPassword` ~31,5 ms · `verifyPassword` ~30 ms · `consumeBackupCode` ~300 ms.
Normal giriş gecikmesi fark edilmez.

**T4 — Güvenlik ajanına iletilecek ders:** bir kütüphane bilinmeyen seçenek anahtarını
**sessizce yok sayabiliyor**. Denetimde "yapılandırma gerçekten uygulandı mı" sorusunun
tip düzeyinde doğrulanması T-014 ve T-062'ye not edildi.

### T-011 kabul doğrulaması (Orkestra Şefi, 2026-08-05)

**27 şema dosyası · 251 test geçiyor · `src/lib/schemas` kapsamı %100 satır** (genel %94.21).
Bağımsız koşturuldu. §1.1 K6 hedefi (%70) fazlasıyla aşıldı.

**Yakalanan hata sınıfı — ciddi:** `.partial()` Zod'da varsayılanları **kaldırmıyor**.
`updateProjectSchema.parse({ id, title })` çıktısı `status:'DRAFT'`, `tags:[]`, `featured:false`
enjekte ediyordu. Bu nesne Prisma `update`'ine verilseydi **yalnızca başlığı düzenlemek
yayındaki projeyi taslağa düşürür, etiketlerini siler, sırasını sıfırlardı.** 20 dosyanın
tamamı etkileniyordu ve hiçbir test bunu yakalamazdı — çünkü şema "geçerli" bir nesne
üretiyordu. `partialWithoutDefaults()` ile tek noktada çözülmüş, regresyon testi yazılmış.

İkinci hata da gerçek: `z.email()` `.transform()`'tan **önce** çalıştığı için kopyala-yapıştırla
gelen boşluklu e-posta reddediliyordu. Sıra düzeltildi; küçük harfe indirme ayrıca
`Client.email @unique` için de gerekli (ADR-017) — `A@b.com` ile `a@b.com` iki müşteri açmamalı.

**Kabul edilen kararlar:** K1 (enum'lar `@/types` üzerinden — şemalar `generated/**`'a uzanmıyor,
§7.4 korunuyor), K2 (`partialWithoutDefaults` tek yardımcı), K3/K4 (para `string`, negatif yok —
yön `TransactionType`'ta; iki yerde yön taşımak toplamları bozar), K5 (`socialsSchema.strict()` —
`githbu` yazım hatası sessizce düşmesin), K6 (honeypot şemanın parçası), **K7 (`emailHashSchema`
64 hex zorunlu — §8.20 ihlali kod incelemesine değil doğrulamaya bağlandı)**, K8 (`slugify()`
paylaşılan; `ı` bir aksan bileşimi değil, `normalize('NFD')` onu çözemez — sessiz hata kaynağıydı),
K9 (`z.unknown()` iki yerde gerekçeli, `any` yok), K10, K11.

**T1 — test dosyası gruplaması onaylandı.** 25 yerine 9 dosya, alan bazında. "Her varlık için
bir geçerli + bir geçersiz" kriteri karşılanıyor; 25 ayrı dosya test değeri eklemeden dosya
sayısını üçe katlardı. Bölmeye gerek yok.

### T-010 kabul doğrulaması (Orkestra Şefi, 2026-08-05)

Depoda bağımsız denetlendi — **25 model · 14 enum · 2 migration**:

| Kontrol | Sonuç |
| ------- | ----- |
| `Session` / `VerificationToken` / `Account` / `HealthCheck` | ✅ hiçbiri yok (ADR-013) |
| `fxRate` + `baseAmount` (Transaction, Job) | ✅ `Decimal(18,8)` / `Decimal(12,2)` |
| `RecurringTransaction` + `@@unique([sourceRecurringId, periodKey])` | ✅ |
| `@db.Date` | ✅ 14 alan |
| `Attachment`: `url` yok, `key @unique` + `checksum` + `width`/`height` | ✅ (ADR-018) |
| `locale String @default("tr")` — 6 içerik modeli | ✅ |
| `HabitLog.count` + `Habit.targetPerDay` | ✅ (ADR-021) |
| `lockedUntil` · `totpBackupCodes` · `emailHash` · `actorEmailHash` | ✅ |
| `next-themes` izi | ✅ `package.json` 0 · `pnpm-lock.yaml` 0 |
| `migrate status` · `.env`'li ve `.env`'siz kapı | ✅ hepsi EXIT 0 |

**K4 ONAYLANDI — `AuditLog.entity` `String` kalıyor, tek enum istisnası.** Gerekçe sağlam:
denetim kaydı model olmayan olayları da taşıyor (`LOGIN`, `EXPORT`) ve her yeni model bir
migration gerektirirdi. `Attachment.entity`'nin enum olması ise doğru — orada küme kapalı.

**T3 — 14 enumun tamamı incelendi ve onaylandı.** İtiraz yok; değerler §6 ve panel
rotalarıyla tutarlı, hepsinde `OTHER` kaçış değeri var. **Enum sözleşmesi bu andan
itibaren dondurulmuştur** — değişiklik ADR + migration + Frontend kırılması demek.

**T1 — `corepack enable` notu onaylandı.** Node sürümü değişince `pnpm` bulunamıyor ve hata
mesajı nedenini söylemiyor; nvm kullananlar için gerçek bir tuzak. README Backend'in dosyası,
T-011 kapsamında eklenmesi yetkilendirildi.

**Bu turun işlem kararı doğruydu:** şema yeniden yazılmadı. Aynı içerik için ikinci migration
üretmek zinciri kirletir ve görevin "tek migration" şartını ihlal ederdi.

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
| T-002b | Frontend | 🟢 Tamamlandı  | **A11y 0.92 → 1.00**, BP 96 → 100, Perf 91 → 92         |

### T-002b kabul doğrulaması (Orkestra Şefi, 2026-08-05) — **BULGU-003 KAPANDI**

| Kategori | Öncesi | Sonrası |
| -------- | ------ | ------- |
| Accessibility | 0.92 | **1.00** (hedef ≥0.95) |
| Best Practices | 96 | **100** |
| Performance | 91 | **92** (düşmedi) |
| `color-contrast` · `link-in-text-block` · `errors-in-console` | 0 · 0 · 0 | 1 · 1 · 1 |

Yerel kapı Node 22 altında yeniden koşturuldu: lint / typecheck / test / build → **hepsi EXIT 0**.
Token değerleri `globals.css`'te doğrulandı.

**İki gerçek teşhis:**
- **K1** — Konsol hatası favicon değil, `next/link` **prefetch**'iymiş. Tahmin etmek yerine
  Playwright ile yakalanmış: Navbar henüz var olmayan 5 rotayı önden çekiyor, beşi de 404.
- **K2** — İlk düzeltmeden sonra denetim hâlâ sıfırdı; ağ kaydından `/favicon.ico` 404'ü
  bulunmuş. `src/app/icon.svg` eklendi — Best Practices'i de 96 → 100 çıkardı.

**K3 — asıl suçlu gradientin mavi ucuydu, moru değil.** `--accent-blue` beyaz metinle
3.22:1 veriyordu. `--accent` gözle ayırt edilemeyecek kadar (#7C5CFF → #7756FF), mavi ise
belirgin koyulaştı. Yan kazanç: `text-gradient` başlığı aydınlıkta 3.04:1 → 4.35:1.

**K4 — sessiz bir boşluk kapatıldı.** §3.1 aydınlık tema için durum rengi hiç tanımlamamıştı;
koyu temanın parlak değerleri miras alınıyor ve beyaz üzerinde **1.57–2.77:1** veriyordu —
yani pratikte okunmuyorlardı. Dördü de tanımlandı.

**K5 — kapsam genişletmesi kabul edildi.** Form denetimi kenarları 1.26–1.35:1'di; WCAG
**1.4.11** etkileşimli denetimler için 3:1 istiyor — §1.1 K5 bu kalemde de sağlanmıyordu.
Yeni `--border-strong` yalnızca Input/Textarea'ya uygulandı; dekoratif kart kenarı bilinçli
olarak değiştirilmedi (1.4.11 kapsamında değil, §3.3'ün yumuşak kenar yönünü bozardı).

**K6 — alt çizgi kuralı `p a` seçicisine bağlandı, sınıfa değil.** Bileşen yazarının
hatırlamasına bırakılan bir kural F2'de kaçınılmaz olarak unutulur; navigasyon `ul > li`
içinde olduğu için doğal olarak kapsam dışında kalıyor.

**Yöntem notu (kayda değer):** Rozet zeminleri (`bg-<renk>/12`) saf beyaz değil, bileşik
zemin. İlk turda beyaza göre hesaplanmış, Lighthouse gerçek bileşik zemini gösterince
değerler yeniden çözülmüş. Bu ayrım PROGRAM.md §3.1'e kural olarak yazıldı.

**PROGRAM.md §3.1 güncellendi:** 11 token değeri, `--border-strong`, aydınlık tema durum
renkleri bloğu, kontrast ölçüm kuralı, kenar token'ları ayrımı, bağlantı kuralı.
| T-006 | Orkestra Şefi | 🟢 Tamamlandı | Push ✅ · CI yeşil ✅ · repo public ✅ · koruma aktif ✅ |
| T-006b | Güvenlik | ⚪ Sırada         | İki küçük CI düzeltmesi (aşağıda)                      |

### T-006 — Depo yayına alındı (Orkestra Şefi, 2026-08-05)

**Depo:** `github.com/abdulkadirelaldi/abdulkadirelaldi` (**private**)
**İlk commit:** `dbcd345` · 80 dosya

**Sızıntı denetimi (push öncesi):** `.env` yok, üretilen Prisma istemcisi yok, `node_modules`
yok, `.next` yok. `.env.example` içinde **değer taşıyan tek anahtar yok**. Sır imzası
taramasında çıkanların tamamı meşru: `aelaldi_dev_only` (adı gibi yalnızca yerel dev şifresi;
üretim Coolify'ın kendi kimlik bilgisini kullanacak) ve Güvenlik ajanının §8.18 testine
**bilerek ektiği** sahte sırlar.

**İlk CI koşusu (`31002868890`) — üç iş de YEŞİL:**

| İş | Süre |
| -- | ---- |
| Kapı: lint → typecheck → test → build → e2e | 1m54s |
| §8.24 · Bağımlılık denetimi | 36s |
| §9 · Lighthouse (uyarı modu) | 2m10s |

**R19 kapandı.** T-005'te doğrulanamayan `uses:` adımları (checkout, pnpm/action-setup,
setup-node, cache, upload-artifact) ilk koşuda sorunsuz çalıştı; öngörülen önbellek sırası
sorunu çıkmadı. E2E CI'da 24/24, 6.1 sn.

**İki uyarı → T-006b:**
1. `actions/checkout@v4`, `setup-node@v4`, `cache@v4`, `upload-artifact@v4`,
   `pnpm/action-setup@v4` Node 20 hedefliyor; runner bunları Node 24'e zorluyor.
   `@v5`'e yükseltilmeli — ADR-008'in "yamalı çalışma zamanı" gerekçesiyle aynı hat.
2. `No files were found with the provided path: .lighthouseci/` — Lighthouse artifact'i
   **yüklenmiyor**. T-005/K3, raporları `temporary-public-storage` yerine artifact olarak
   saklamayı seçmişti; karar doğru ama yol tutmuyor, yani rapor hiçbir yerde kalmıyor.

**Dal koruması:** private repo'da ruleset GitHub Pro istedi (`403`). **Q5 kullanıcıya soruldu
→ repo public yapıldı** (portföy projesi; §1.A'nın "yetkinliği kanıtla" amacına da hizmet ediyor,
ve sızıntı denetimi zaten temizdi).

`main` üzerinde aktif ruleset (`20455952`): `deletion` · `non_fast_forward` ·
`required_status_checks` → **Kapı** ve **§8.24 Bağımlılık denetimi** zorunlu.
`bypass_actors` boş, `current_user_can_bypass: never` — sahibi dahil kimse atlayamaz.
`lighthouse` bilerek zorunlu değil (F0'da uyarı modunda; T-029'da `error`'a çevrilecek).

**Not:** §10.5 "main dalına doğrudan push yok, her görev kendi dalında" diyor. Şu anki
ruleset durum kontrollerini zorunlu kılıyor ama **PR açmayı zorunlu kılmıyor**. `pull_request`
kuralı eklenmesi kullanıcı onayına bırakıldı — tek kişilik akışta günlük sürtünme yaratır.

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
| R11 | ~~T-010 öncesi kapatılması gereken veri modeli kararları~~ | ~~Yüksek~~ → **Kapandı** | ✅ 2026-08-05: Backend'in T-000 değerlendirmesi geldi, **30 kalem** tek turda karara bağlandı → **ADR-013…021**. Dördü kullanıcıya soruldu (para birimi, kanban, KDV, PR formülü). PROGRAM.md §6.1 bağlayıcı düzeltme tablosu eklendi. **T-010 açıldı** |
| R13 | ~~BULGU-002 — `.env` olmadan `pnpm build` düşüyor~~ | ~~Yüksek~~ → Kapandı | ✅ T-003c'de tembel havuzla çözüldü; Orkestra Şefi `.env`'siz build ile bağımsız doğruladı (EXIT 0). CI'ya gerçek `DATABASE_URL` secret'ı verme refleksi bertaraf edildi |
| R16 | ~~Tüm rotalar dinamik render'a düştü~~ | ~~Yüksek~~ → Karara bağlandı | ✅ **ADR-011**: dinamik kabul edildi. Gerekçe ölçüm: Lighthouse **Performance 91** (§9 eşiği ≥90) — dinamik render altında zaten sağlıyor. Karşılığında F2'de veri erişimi açık önbelleklemeyle (`unstable_cache` + `revalidateTag`) yazılacak; T-029'da yeniden ölçülecek |
| R16-eski | ~~(ayrıntı)~~ **Tüm rotalar dinamik render'a düştü.** T-002'de kök layout `cookies()` çağırıyor (tema FOUC'unu önlemek için) → build çıktısında `/` artık `○` (static) değil `ƒ` (dynamic). T-001'de statikti | Yüksek | **K1 (LCP < 2.0s) ve SEO doğrudan etkileniyor.** Public sayfaların statik/ISR olması F2'nin performans varsayımıydı. Üç yol var: (a) tema sınıfını nonce'lu inline script ile bas — §8.13 CSP nonce'a izin veriyor, (b) tema cookie'sini yalnızca `(panel)` layout'unda oku, public tarafı sistem temasına + CSS'e bırak, (c) dinamiği kabul et ve önbelleği başka katmanda çöz. **T-002 raporu gelince karara bağlanacak; F2 açılmadan çözülmeli** |
| R14 | ~~Node 20 EOL — yamasız çalışma zamanı~~ | ~~Yüksek~~ → Kapandı | ✅ ADR-008 uygulandı. Yerel makine **Node 22.23.2**'ye alındı (`nvm alias default 22`), tüm kapı Node 22 altında yeniden koşturuldu ve yeşil. `.nvmrc` + `engines` + CI senkronu T-005'te sabitlenecek |
| R18 | **BULGU-003** — Lighthouse A11y **0.92** (hedef ≥0.95): `color-contrast` ve `link-in-text-block` sıfır. Bağlantılar yalnızca renkle ayırt ediliyor | Orta | **Token düzeyinde** — düzeltilmezse F2'de yazılacak her sayfaya kopyalanır. §1.1 K5 (WCAG AA) şu an sağlanmıyor. T-002b açıldı; F2 başlamadan kapatılmalı |
| R19 | ~~CI GitHub'da hiç koşmadı~~ | ~~Orta~~ → Kapandı | ✅ T-006'da depo push edildi, ilk koşuda **üç iş de yeşil**. `uses:` adımları doğrulandı |
| R20 | ~~`main` dal koruması yok~~ | ~~Orta~~ → Kapandı | ✅ Repo public yapıldı, ruleset `20455952` aktif: Kapı + §8.24 zorunlu, silme ve force-push kapalı, bypass yok |
| R21 | **Repo artık public** — `PROGRAM.md`, `AJAN_PROMPTLARI.md` ve `docs/**` (STATUS, ADR'ler, güvenlik bulguları) herkese görünür | Düşük | Bilinçli karar (Q5). İçlerinde sır yok. Bundan sonra `docs/security/findings/` içine **açık bir güvenlik açığının istismar ayrıntısı yazılmamalı** — düzeltilene kadar bulgu özeti yeterli, ayrıntı düzeltmeyle birlikte eklenir |
| R19-eski | ~~(ayrıntı)~~ **CI GitHub'da hiç koşmadı.** Dizin git deposu bile değil; `uses:` adımları (checkout, pnpm/action-setup, setup-node, cache, upload-artifact) doğrulanamadı | Orta | Ajan bunu bilerek raporladı — `run:` adımlarının tamamı yerelde koşturuldu, yalnızca hazır eylemler açıkta. En olası düzeltme noktası `pnpm/action-setup` ↔ `setup-node` önbellek sırası. T-006 |
| R17 | **Geliştirme makinesinde disk %5'in altında.** `/api/v1/health` bu yüzden yerelde `503` dönüyor (`disk: critical`) — E2E logunda görünüyor | Orta | Uç doğru çalışıyor, kod sorunu değil. **Kullanıcı eylemi: makinede yer açılmalı.** Aksi hâlde yerel sağlık kontrolü kalıcı kırmızı kalır ve gerçek bir DB arızasını maskeler |
| R15 | `next start` + `output: 'standalone'` uyarı veriyor; üretim gerçekte `node .next/standalone/server.js` ile koşacak — E2E farklı sunucuyu test ediyor | Düşük | T-070'te E2E'nin standalone çıktıya karşı koşturulması değerlendirilecek (T-004 notu T5) |
| R12 | Yerel geliştirme portu 5433 (§12 metni 5432 diyor) — makinede sistem geneli Postgres varsa çakışma sessiz ve yanıltıcı | Düşük | `docker-compose.dev.yml` içinde gerekçesiyle yazılı; `.env.example` T-003b'de güncelleniyor; F0 sonu PROGRAM.md §12 notu eklenecek |
| R9  | React 19 + `framer-motion` 12 ve `recharts` 3 uyumu doğrulanmadı                                                  | Düşük  | T-002'de en az bir motion bileşeni, T-045'te bir grafik ile fiilen denenecek                                                              |

## 6. Karar Bekleyenler (kullanıcıdan)

| #   | Soru                                                                          | Ne zaman gerekli                       |
| --- | ----------------------------------------------------------------------------- | -------------------------------------- |
| Q1  | Panel adresi `panel.abdulkadirelaldi.com` (subdomain) mı, `/panel` (path) mi? | F7'den önce; F0'da `/panel` varsayıldı. HSTS `preload` da buna bağlı |
| Q2  | Mail sağlayıcı: Resend mi kendi SMTP mi?                                      | T-027                                  |
| ~~Q5~~ | ~~Dal koruması?~~ → **repo public yapıldı**, ruleset aktif                | ✅ Kapandı 2026-08-05                  |
| Q6  | §10.5 "main'e doğrudan push yok" — `pull_request` kuralı da eklensin mi? | İstediğin zaman; şu an yalnızca durum kontrolleri zorunlu |
| ~~Q7~~ | ~~T-036 F1'e mi alınsın?~~ → **alındı ve tamamlandı**  | ✅ Kapandı |
| Q8  | Şifre değiştirme F1'e mi F3'e mi? → **F3'ün ilk kalemi** (iki ajan da F1 önerdi; kapı kriterinde yok, `.env` üzerinden rotasyon yolu var) | Karar verildi |
| Q7-eski | ~~T-036 F1'e mi alınsın?~~ Kurtarma kodları kullanıcıya hiç gösterilmediği sürece ADR-013'ün kurtarma yolu pratikte kullanılamaz | T-013c sonrası |
| ~~Q3~~ | ~~Repo GitHub'da mı?~~ → **GitHub + Actions** (ADR-009)                    | ✅ Kapandı 2026-08-05                  |
| ~~Q4~~ | ~~Node sürümü?~~ → **Node 22 LTS** (ADR-008)                               | ✅ Kapandı 2026-08-05                  |
