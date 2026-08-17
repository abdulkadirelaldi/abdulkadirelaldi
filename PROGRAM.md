# PROGRAM.md — Abdulkadir Elaldı Kişisel Site & Yönetim Paneli

> Bu dosya projenin **tek doğruluk kaynağıdır**. Tüm ajanlar her göreve başlamadan önce bu
> dosyanın ilgili bölümlerini okur. PROGRAM.md ile çelişen hiçbir kod kabul edilmez.
> Bu dosyayı yalnızca **Orkestra Şefi** ajanı düzenleyebilir.

**Versiyon:** 1.0
**Sahip:** Abdulkadir Elaldı
**Domain:** `abdulkadirelaldi.com` (public) · `panel.abdulkadirelaldi.com` veya `/panel` (özel)
**Bağlı marka:** Kıyı Medya — `kiyimedya.com`

---

## 1. Proje Tanımı

Tek bir Next.js uygulaması, iki farklı yüzü var:

**A. Public taraf** — Portföy/CV öncelikli kişisel site. Amacı: ziyaretçiye Abdulkadir'in
yetkinliğini kanıtlamak ve ticari niyeti olanı Kıyı Medya'ya yönlendirmek. Blog ve hizmet
sayfaları bu amaca hizmet eder, kendi başlarına amaç değildir.

**B. Panel** — Tek kullanıcılı (sadece site sahibi) kişisel yönetim sistemi. Modüller:
muhasebe, işler, sağlık, spor, hayat (alışkanlık/hedef/günlük) ve site içerik yönetimi.
İçerik yönetimi sayesinde public taraftaki hiçbir metin/proje koda gömülü olmaz.

### 1.1 Başarı Kriterleri

| # | Kriter | Ölçüm |
|---|--------|-------|
| K1 | Public sayfalar hızlı | LCP < 2.0s, CLS < 0.05, INP < 200ms (mobil 4G) |
| K2 | Panelden yönetilebilirlik | Public taraftaki her metin/görsel kod değişmeden güncellenebilir |
| K3 | Veri güvenliği | Panel yetkisiz erişime kapalı, tüm mutasyonlar loglanır, gece yedeği alınır |
| K4 | Kıyı Medya dönüşümü | Her proje detayı ve hizmet sayfası ölçülebilir CTA içerir |
| K5 | Erişilebilirlik | WCAG 2.1 AA; klavye ile tam gezinilebilir; `prefers-reduced-motion` desteklenir |
| K6 | Test kapsamı | `src/server` ve `src/lib` için satır kapsamı ≥ %70; kritik akışlar E2E |

### 1.2 Kapsam Dışı (v1'de YAPILMAYACAK)

Çok kullanıcılı sistem, rol yönetimi, e-ticaret/ödeme alma, e-posta pazarlama,
mobil uygulama, çoklu dil (v1 sadece TR — ama i18n altyapısı hazır bırakılır),
gerçek zamanlı işbirliği, üçüncü taraf muhasebe entegrasyonu (e-fatura vb.).

---

## 2. Teknoloji Yığını (KİLİTLİ — değiştirilemez)

| Katman | Seçim | Not |
|--------|-------|-----|
| Çalışma zamanı | **Node.js 22 LTS** | `.nvmrc` tek kaynak; Node 20 EOL (ADR-008) |
| Framework | Next.js 15, App Router, TypeScript strict | Server Components varsayılan |
| Stil | Tailwind CSS **v4** + CSS değişkenleri | Token'lar `globals.css` `@theme` bloğunda (ADR-002) |
| Tema | Kendi cookie tabanlı sağlayıcımız | `next-themes` kullanılmaz (ADR-010) |
| Animasyon | React Bits + Framer Motion | Bölüm 5 kurallarına tabi |
| DB | PostgreSQL 16 | Kendi sunucuda Docker container |
| ORM | Prisma | Ham SQL yasak (istisna: güvenlik ajanı onaylı) |
| Auth | Auth.js (NextAuth v5) — Credentials + TOTP 2FA | Tek kullanıcı |
| Şifreleme | argon2id | bcrypt kullanılmayacak |
| Doğrulama | Zod | İstemci ve sunucu aynı şemayı paylaşır |
| Form | react-hook-form + zodResolver | |
| Grafik | Recharts | Panel grafikleri |
| Dosya | Cloudflare R2 (S3 uyumlu) | Private bucket + imzalı URL |
| Mail | Resend veya SMTP (sunucu) | İletişim formu bildirimi |
| Test | Vitest + Testing Library, Playwright | |
| Lint | ESLint + Prettier + TypeScript strict | CI'da zorunlu |
| Deploy | Kendi sunucu — Coolify + Docker | Bölüm 11 |

**Yasaklar:** `any` tipi (gerekçesiz), `@ts-ignore`, `dangerouslySetInnerHTML` (sanitize
edilmemiş), client tarafında doğrudan DB erişimi, `.env` dosyasının repoya girmesi,
onaysız yeni bağımlılık eklenmesi.

---

## 3. Tasarım Sistemi

Referans yön: koyu, derin mor-lacivert zemin; mor→mavi gradient vurgular; cam etkili
kartlar; yumuşak glow. Aydınlık tema da zorunlu (kullanıcı tercihi + sistem tercihi).

### 3.1 Renk Token'ları

Tüm renkler CSS değişkeni olarak tanımlanır. **Hiçbir bileşende hex kodu doğrudan yazılmaz.**

```css
/* Koyu tema (varsayılan) */
--bg-base:      #0A0A12;  /* sayfa zemini */
--bg-surface:   #12121F;  /* kart zemini */
--bg-elevated:  #1A1A2E;  /* modal, dropdown */
--border:       #262640;  /* kart kenarı — dekoratif */
--border-hover: #3A3A5C;
--border-strong: #64649D; /* etkileşimli denetim kenarı — WCAG 1.4.11, 3:1 */

--text-primary: #ECECF5;
--text-body:    #B4B4CC;
--text-muted:   #8383A0;

--accent:       #7756FF;  /* ana mor */
--accent-hover: #6B49F5;
--accent-soft:  #A78BFA;  /* açık mor, vurgu metni */
--accent-blue:  #1C6AFF;  /* gradient ikinci durak */
--accent-glow:  rgba(119, 86, 255, 0.28);

--success:      #34D399;
--warning:      #FBBF24;
--danger:       #F87171;
--info:         #60A5FA;

/* Aydınlık tema — aynı isimler, .light sınıfı altında */
--bg-base:      #F8F8FC;
--bg-surface:   #FFFFFF;
--bg-elevated:  #FFFFFF;
--border:       #E4E4F0;
--border-hover: #CFCFE4;
--border-strong: #8A8ABC;
--text-primary: #14142B;
--text-body:    #4A4A66;
--text-muted:   #686885;

/* Aydınlık temada DEĞİŞEN vurgu ve durum renkleri.
   --accent, --accent-hover, --accent-blue aynı kalır; aşağıdakiler kalamaz:
   koyu temanın parlak değerleri beyaz üzerinde 1.57–2.77:1 veriyor, yani okunmuyor. */
--accent-soft:  #6B3BF7;  /* açık mor beyaz üzerinde okunmaz — koyulaşmak zorunda */
--success:      #197352;
--warning:      #845F02;
--danger:       #C60A0A;
--info:         #0760CF;
```

**Kontrast, tasarım tercihi değil kabul şartıdır (§1.1 K5).** Yukarıdaki değerler
T-002b'de her iki tema için ölçülerek çözülmüştür; normal metin ≥ 4.5:1, büyük metin
ve etkileşimli denetim kenarları ≥ 3:1. Bir token değiştirilecekse **önce ölçülür**.
Rozet ve yarı saydam zeminlerde (`bg-<renk>/12`) hesap **bileşik zemine** göre yapılır,
saf beyaza/siyaha göre değil — aradaki fark AA'yı kaçırmaya yetiyor.

**Kenar token'ları ayrımı:** `--border` dekoratiftir (kart, ayraç) ve §3.3'ün "çok yumuşak
kenar" yönünü korur. `--border-strong` yalnızca **etkileşimli denetimlerde** (input,
textarea, select) kullanılır — WCAG 1.4.11 bunlar için 3:1 ister.

**Gövde metni içi bağlantılar renk dışında bir işaretle de ayrılır** (alt çizgi). Kural
`globals.css`'te `p a` seçicisine bağlıdır — bileşen yazarının hatırlamasına bırakılmaz.
`<p>` dışındaki satır içi bağlantılar `.link` sınıfını kullanır. Navigasyon, alt bilgi
ve buton görünümlü bağlantılar bu kuralın dışındadır: konumları zaten bağlantı olduklarını söyler.

**Hex yasağının kapsamı:** Yasak **bileşenler ve stil kodu** içindir — renk her zaman
CSS değişkeni üzerinden gelir. Tek istisna, çerçevenin ham değer dayattığı **metadata
alanlarıdır** (örn. `viewport.themeColor`): bunlar `layout.tsx` içinde, ilgili token'a
işaret eden bir yorumla, tek yerde yazılır.

**Gradient:** `linear-gradient(135deg, var(--accent) 0%, var(--accent-blue) 100%)`
Sadece birincil butonlarda, aktif nav göstergesinde ve isim vurgusunda kullanılır.
Kart zemininde gradient kullanılmaz.

### 3.2 Tipografi

| Rol | Font | Kullanım |
|-----|------|----------|
| Display | **Space Grotesk** (600/700) | Başlıklar (h1–h3), isim, bölüm başlıkları |
| Body | **Inter** (400/500/600) | Paragraf, buton, form, nav |
| Utility | **JetBrains Mono** (400/500) | Sayılar, para birimi, tarih, etiket, kod |

**`next/font/local` ile yüklenir** — `.woff2` dosyaları repoda barındırılır (ADR-031;
derleme ağa bağımlı olmasın ve çalışma zamanında üçüncü tarafa istek gitmesin).
`display: swap`, sadece `latin` + `latin-ext` subset (Türkçe karakterler için
`latin-ext` **zorunlu**). Üç font da SIL Open Font License; lisans dosyaları repoda tutulur.

**Tip ölçeği (rem):** 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 1.875 / 2.25 / 3 / 3.75
Başlıklarda `letter-spacing: -0.02em`, gövde metninde `line-height: 1.7`.

Panelde tüm sayısal veri (tutar, kilo, set, tarih) JetBrains Mono ile sekmeli rakam
(`font-variant-numeric: tabular-nums`) kullanır — sütunlar hizalı dursun.

### 3.3 Layout & Boşluk

- Boşluk skalası 4px tabanlı: 4, 8, 12, 16, 24, 32, 48, 64, 96
- Public içerik genişliği `max-w-6xl` (1152px), metin blokları `max-w-2xl`
- Bölüm dikey boşluğu: mobil 64px, masaüstü 96px
- Köşe yarıçapı: kart 16px, buton 12px, input 10px, rozet 999px
- Kart: `bg-surface` + 1px `border` + `backdrop-blur-sm` + çok yumuşak iç gölge
- Kırılma noktaları: 640 / 768 / 1024 / 1280 (Tailwind varsayılanı)

### 3.4 Hareket

- Süre: mikro etkileşim 150ms, giriş 400ms, sayfa geçişi 300ms
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- **`prefers-reduced-motion: reduce` aktifse:** tüm React Bits animasyonlu bileşenleri
  statik fallback'e düşer, WebGL arka planlar hiç yüklenmez. Bu opsiyonel değil.

---

## 4. Bilgi Mimarisi

### 4.1 Public Rotalar

```
/                    Ana sayfa — Hero, Hakkımda, Yetenekler, Öne Çıkan Projeler, Hizmetler, İletişim
/hakkimda            Uzun biyografi, deneyim/eğitim zaman çizelgesi, CV indirme
/projeler            Filtrelenebilir proje listesi (etiket + teknoloji)
/projeler/[slug]     Proje detayı — problem, çözüm, stack, görseller → Kıyı Medya CTA
/blog                Yazı listesi, etiket filtresi
/blog/[slug]         Yazı detayı, içindekiler, okuma süresi
/hizmetler           Verilen hizmetler → her biri Kıyı Medya'ya yönlendirir
/iletisim            Form + doğrudan iletişim bilgileri
/cv                  Yazdırılabilir tek sayfa CV (print stylesheet)
/rss.xml /sitemap.xml /robots.txt /og/[...]  (dinamik OG görseli)
```

### 4.2 Panel Rotaları (`/panel`, tamamı korumalı)

```
/panel                    Dashboard — aylık gelir/gider, aktif işler, bugünün planı, sağlık özeti
/panel/muhasebe           İşlem listesi, filtre, hızlı ekleme
/panel/muhasebe/raporlar  Aylık/yıllık grafik, kategori dağılımı, CSV/PDF dışa aktarım
/panel/muhasebe/kategoriler
/panel/isler              İş kartları (kanban 5 kolon: aday → teklif → aktif → teslim → iptal, ADR-017)
/panel/isler/[id]         İş detayı + bağlı ödemeler + müşteri
/panel/musteriler
/panel/saglik             Kilo, uyku, su, ölçüm girişi + trend grafikleri
/panel/spor               Antrenman kaydı, egzersiz kütüphanesi, PR takibi
/panel/hayat              Alışkanlık takibi, hedefler, günlük
/panel/icerik/projeler    Portföy projesi CRUD
/panel/icerik/blog        Yazı CRUD (MDX editör + önizleme)
/panel/icerik/profil      Hero metni, biyografi, sosyal linkler, CV dosyası
/panel/icerik/deneyim     Deneyim/eğitim CRUD
/panel/mesajlar           İletişim formu kutusu → "işe dönüştür" aksiyonu
/panel/ayarlar            Şifre, 2FA, tema, yedek durumu, denetim kaydı
```

### 4.3 Klasör Yapısı

```
src/
  app/
    (public)/            # public route group — layout: Navbar + Footer
    (panel)/panel/       # panel route group — layout: Sidebar + Topbar
    api/v1/              # route handlers (public form, webhook, cron, upload)
    layout.tsx globals.css
  components/
    ui/                  # temel primitifler (Button, Card, Input, Badge, Dialog…)
    reactbits/           # React Bits'ten kurulan bileşenler (dokunulmuş sürümler)
    public/              # public sayfalara özel bloklar (Hero, ProjectCard…)
    panel/               # panele özel bloklar (StatCard, DataTable, ChartX…)
  server/
    actions/             # Server Actions (panel mutasyonları)
    services/            # iş mantığı — DB erişimi burada
    auth.ts db.ts
  lib/
    schemas/             # Zod şemaları (frontend + backend ortak sözleşme)
    utils/ constants.ts  # formatlar, para birimi, tarih
  types/                 # paylaşılan tipler
prisma/schema.prisma prisma/seed.ts prisma/migrations/
tests/unit/ tests/e2e/
docs/STATUS.md docs/DECISIONS.md docs/tasks/ docs/security/
```

---

## 5. React Bits Kullanım Kuralları

Kurulum **daima TypeScript + Tailwind varyantı** ile yapılır. Kayıt ucundan dosya
içeriği alınır ve elle yerleştirilir:

```bash
curl -s https://reactbits.dev/r/<BilesenAdi>-TS-TW   # dosya içeriği JSON olarak döner
```

> **Neden `npx shadcn add` değil (T-020/ENGEL-4):** Projede `components.json` yok;
> `shadcn init` yapılandırma dosyası ekler ve **bağımlılıkları onay almadan
> `package.json`'a yazar** — ADR-004'ü delerdi. Kayıt ucu aynı dosyaları düz JSON olarak
> veriyor. Sonuç §5'in tarif ettiğiyle aynı (kod repoya kopyalanır ve bizim olur),
> ama `package.json` denetimi ajanda kalır.

**Bundle eşiği gzip olarak okunur (T-020):** §5.2.6'daki 40KB, **gzip** boyutudur.
Next'in derleme çıktısı ve projenin tüm ölçümleri gzip; minify rakamıyla karşılaştırmak
yanlış alarm üretir (Aurora minify 44.3 KB, gzip 12.8 KB).

Kurulan dosyalar `src/components/reactbits/` altına taşınır ve tasarım token'larıyla
uyumlu hale getirilir (hardcoded renkler `var(--accent)` vb. ile değiştirilir).
React Bits MIT + Commons Clause lisanslıdır; kod repoya kopyalanır ve bizim olur.

### 5.1 Bileşen Haritası (public taraf)

| Yer | Bileşen | Ayar |
|-----|---------|------|
| Hero arka plan | `Aurora` (mor tonlu) | Sadece masaüstü **+ koyu tema**, lazy, opacity ≤ 0.5 — ADR-025, T-020b ölçümü |
| Hero isim | **`BlurText`** | SplitText `gsap` istiyor — ADR-025 |
| Hero ünvan | `RotatingText` | "Full Stack Developer" / "Yazılım Mühendisi" |
| Rozet ("Full Stack Developer") | `ShinyText` | |
| Birincil butonlar | `StarBorder` | Gradient kenar |
| Sosyal ikonlar | `GlassIcons` | |
| Navigasyon | `GooeyNav` | Aktif bölüm göstergesi |
| Bölüm girişleri | **`framer-motion` `whileInView`** | AnimatedContent `gsap` istiyor — ADR-025 |
| Yetenek kartları | `SpotlightCard` | Hover'da mor spotlight |
| Proje ızgarası | **`TiltedCard`** | ChromaGrid `gsap` istiyor — ADR-025 |
| İstatistikler ("2+ yıl") | `CountUp` | Görünür olunca tetiklenir |
| İletişim bölümü | **`SpotlightCard` ızgarası** | MagicBento `gsap` istiyor — ADR-025 |
| Kıyı Medya müşteri logoları | `LogoLoop` | Hizmetler sayfası |
| Tıklama efekti | `ClickSpark` | Sadece masaüstü, isteğe bağlı |

### 5.2 Sert Kurallar

1. **Panelde ağır efekt yok.** Panelde yalnızca `CountUp`, `AnimatedList`, `SpotlightCard`
   kullanılabilir. WebGL/shader tabanlı hiçbir bileşen panele girmez — panel bir çalışma
   aracı, gösteri alanı değil.
2. **Sayfa başına en fazla 1 WebGL bileşeni.** Ana sayfada bu hakkı hero arka planı kullanır.
3. Tüm React Bits bileşenleri `next/dynamic` ile `ssr: false` yüklenir ve iskelet
   (skeleton) fallback'i olur — CLS oluşturmaları yasak.
4. `prefers-reduced-motion` aktifse animasyon yerine son kare/statik içerik gösterilir.
5. Mobilde (<768px) WebGL arka planlar hiç yüklenmez; yerine statik CSS gradient.
6. Bir bileşen bundle'a 40KB'den fazla ekliyorsa Orkestra Şefi'ne bildirilir, onaysız kalmaz.
7. Efekt hiçbir zaman okunabilirliğin önüne geçmez: metin üstündeki arka plan katmanının
   kontrast oranı AA'yı bozuyorsa efekt kısılır.

---

## 6. Veri Modeli

Prisma şeması aşağıdaki varlıkları içerir. Tüm modellerde `id` (cuid), `createdAt`,
`updatedAt` bulunur. Para birimi alanları `Decimal(12,2)`, varsayılan `TRY`.

**Kimlik & sistem**
- `User` — email, passwordHash, name, totpSecret, totpEnabled, lastLoginAt
- `Session`, `VerificationToken` — Auth.js standardı
- `AuditLog` — actorId, action, entity, entityId, diff (Json), ip, userAgent
- `Attachment` — key (R2), url, mime, size, entity, entityId

**Site içeriği**
- `Profile` — headline, subtitle, bio, location, availability, avatarUrl, cvUrl, socials (Json)
- `Skill` — name, category, level (0–100), iconKey, order
- `Project` — slug, title, summary, content (MDX), coverUrl, gallery, tags[], stack[],
  liveUrl, repoUrl, clientName, featured, order, status (DRAFT/PUBLISHED), publishedAt
- `Post` — slug, title, excerpt, content, coverUrl, tags[], status, publishedAt,
  readingMinutes, viewCount
- `Experience` — organization, role, type (WORK/EDUCATION), startDate, endDate, current, description
- `Service` — title, description, iconKey, ctaUrl, order
- `ContactMessage` — name, email, phone, subject, message, sourcePage, ip, isRead,
  isSpam, convertedJobId

**İş & muhasebe**
- `Client` — name, company, email, phone, notes, isKiyiMedya
- `Job` — title, clientId, status (LEAD/PROPOSAL/ACTIVE/DELIVERED/CANCELLED),
  startDate, dueDate, deliveredAt, agreedAmount, currency, description, contactMessageId
- `TransactionCategory` — name, type (INCOME/EXPENSE), color, icon
- `Transaction` — type, amount, currency, date, categoryId, jobId?, clientId?,
  description, method, isPaid, paidAt, invoiceNo, attachmentId?, isRecurring, recurrenceRule

**Sağlık & spor**
- `HealthLog` — date (unique), weightKg, bodyFatPct, sleepHours, waterMl, restingHr, steps, mood (1–5), note
- `Exercise` — name, muscleGroup, equipment
- `Workout` — date, type (GYM/CARDIO/KAYAK/OTHER), durationMin, feeling, note
- `WorkoutSet` — workoutId, exerciseId, setNo, reps, weightKg, rpe
- `PersonalRecord` — exerciseId, weightKg, reps, date

**Hayat**
- `Habit` — name, targetPerWeek, color, icon, isActive
- `HabitLog` — habitId, date, done
- `Goal` — title, description, category, targetDate, progress (0–100), status
- `JournalEntry` — date, title, content, mood, tags[]

**Kritik ilişki:** `Job → Transaction`. Bir işe ödeme girildiğinde otomatik olarak
gelir tablosuna düşer. Aynı veri iki yere girilmez. `ContactMessage → Job` dönüşümü de
tek tıkla yapılır: gelen mesajdan iş kartı oluşturulur, müşteri kaydı otomatik açılır.

### 6.1 Bağlayıcı Düzeltmeler (T-000 değerlendirmesi → ADR-013…021)

Yukarıdaki liste v1.0'ın ilk taslağıdır. Backend'in şema öncesi değerlendirmesi 30 kalemde
tutarsızlık veya boşluk buldu; hepsi karara bağlandı. **Çelişki hâlinde aşağıdaki tablo
geçerlidir.** Gerekçeler `docs/DECISIONS.md`'de.

| Alan | Karar | ADR |
|------|-------|-----|
| `Session`, `VerificationToken` | **Kaldırıldı.** Auth.js v5 + Credentials yalnızca JWT ile çalışır; adapter kullanılmaz | 013 |
| `User` | `totpBackupCodes` (argon2id hash'li), `totpConfirmedAt`, `lockedUntil` eklendi; `totpSecret` **şifreli** saklanır | 013 |
| `LoginAttempt` | **Yeni model** — §8.4'ün "log" gereği bellekte karşılanamaz. Tablo Backend'in, politika Güvenlik'in | 013 |
| `Transaction`, `Job` | `fxRate` + `baseAmount` eklendi. **Tüm toplamlar `baseAmount` üzerinden** | 014 |
| KDV / stopaj | **v1 kapsamı dışı.** Tahsilat ve bakiye `Transaction` toplamından türetilir, sütun tutulmaz | 014 |
| Para alanları | Servis sınırında `Decimal` değil **`string`** döner | 014 |
| `Transaction.isRecurring`, `recurrenceRule` | **Kaldırıldı.** Yeni `RecurringTransaction` modeli + `@@unique([sourceRecurringId, periodKey])` | 015 |
| Gün alanları | `HealthLog/HabitLog/Transaction/Workout/JournalEntry.date` → **`@db.Date`**; gün hesapları tek zaman dilimi yardımcısından geçer | 016 |
| `ContactMessage.convertedJobId` | **Kaldırıldı.** Tek yön: `Job.contactMessageId @unique` | 017 |
| `Client.email` | **`@unique`** — otomatik müşteri açma `upsert` ile | 017 |
| Referans veriler | `isArchived` + `onDelete: Restrict`. **Muhasebede hard delete yok** | 017 |
| `Job.status` ↔ kanban | Enum aynen kalır; panoda **beş kolon**: Aday → Teklif → Aktif → Teslim → İptal. §4.2'nin üç kolonlu tarifi bununla değişti | 017 |
| `Profile` | Tekil: sabit `id: "singleton"` + `upsert` | 017 |
| `Attachment.url` | **Kaldırıldı** — §8.11 ile çelişiyordu. `key @unique` + `checksum` + `width`/`height` + `uploadedById`; imzalı URL istek anında üretilir | 018 |
| `Transaction.attachmentId` | **Kaldırıldı.** Tek mekanizma: polimorfik `Attachment` + `@@index([entity, entityId])` | 018 |
| `coverUrl` / `avatarUrl` / `cvUrl` / `gallery` | `Attachment` FK'sine bağlandı (`onDelete: Restrict`); `gallery` **ilişkidir**, scalar değil | 018 |
| İçerik modelleri | `locale String @default("tr")`, slug kısıtları `@@unique([slug, locale])` (§1.2 i18n altyapısı) | 019 |
| `status` (içerik) | `DRAFT` · `SCHEDULED` · `PUBLISHED` · `ARCHIVED`. `ARCHIVED` slug'ı korur ve **410** döner | 019 |
| `Post.viewCount` | Doğrudan sütun **değil** — ADR-011 önbelleğiyle çelişirdi. Ayrılıyor, uygulaması F3 | 019 |
| `tags[]` | v1'de **scalar kalır** (bilinçli takas: yeniden adlandırma toplu update ister) | 019 |
| Kategorik alanlar | Hepsi **enum**; değerleri T-010'da Backend yayınlar (§7.3 sözleşmesi) | 020 |
| `AuditLog` | Alan adı bazlı **redaksiyon zorunlu** (§8.20); `actorId onDelete: SetNull` + `actorEmailHash`; IP 90 gün | 020 |
| `ContactMessage` | `repliedAt`, `archivedAt`, `honeypotHit`, `spamScore` eklendi | 020 |
| `PersonalRecord` | **Tekrar bazında**: `@@unique([exerciseId, reps])`. Tahmini 1RM kullanılmaz. `workoutSetId` ile kaynağa bağlı, türetilmiş veri | 021 |
| `HabitLog.done` | **`count Int @default(1)`** oldu; `Habit.targetPerDay` eklendi | 021 |
| İndeksler | Asgari set ADR-017'de listelendi. `HabitLog` üzerindeki `@@unique([habitId, date])` **eksikti** — çift kayıt mümkündü | 017 |

---

## 7. API & Sunucu Sözleşmesi

### 7.1 Ne zaman ne kullanılır

- **Panel mutasyonları** → Server Actions (`src/server/actions/`). Her action:
  `auth()` kontrolü → Zod parse → servis çağrısı → `AuditLog` → `revalidatePath`.
- **Panel okuma** → Server Component içinde doğrudan servis çağrısı.
- **Public form / yükleme / cron / webhook** → Route Handler (`app/api/v1/...`).

### 7.2 Yanıt Formatı (route handler'lar için)

```ts
// Başarılı
{ ok: true, data: T }
// Hatalı
{ ok: false, error: { code: string, message: string, fields?: Record<string, string> } }
```

Hata kodları: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`,
`RATE_LIMITED`, `CONFLICT`, `INTERNAL_ERROR`. HTTP durum kodu koda uygun olur.
Sunucu hataları kullanıcıya asla stack trace göstermez; loga yazılır, kullanıcıya
düzeltici mesaj döner.

### 7.3 Zod Sözleşmesi

Her varlık için `src/lib/schemas/<entity>.ts` içinde: `createXSchema`, `updateXSchema`,
`xFilterSchema` ve türetilmiş tipler (`z.infer`). **Bu dosyalar backend ajanının
mülkiyetindedir, frontend ajanı sadece tüketir.** Frontend form doğrulaması aynı şemayı
kullanır — iki yerde ayrı kural yazılmaz.

### 7.4 Servis Katmanı

DB erişimi yalnızca `src/server/services/` içinde olur. Route handler ve Server Action
ham Prisma çağrısı yapmaz. Böylece test edilebilirlik ve yetki kontrolü tek noktada kalır.

---

## 8. Güvenlik Gereksinimleri

Bunlar "iyi olur" değil, **kabul şartıdır**. Güvenlik ajanı bunları maddede madde denetler.

**Kimlik doğrulama**
1. Tek kullanıcı, Credentials + TOTP 2FA. **2FA kurulumu ilk girişte zorunludur:** seed
   kullanıcıyı 2FA'sız açar (kurulmamış bir authenticator kullanıcıyı kendi panelinden
   kilitler — bkz. R3), ancak `totpConfirmedAt` boşken panel her istekte kurulum ekranına
   yönlendirir. Kurulum tamamlanmadan panelin hiçbir bölümü kullanılamaz.
   *(Düzeltme 2026-08-10, T-016/T2: özgün metin "zorunlu olarak açık gelir" diyordu; seed'in
   2FA'yı açık üretmesi teknik olarak mümkün ama secret'ı kimse bilmediği için kilitlenme
   üretirdi. Zorunluluk kurulum anına taşındı, gevşetilmedi.)*
2. argon2id ile şifre hash'i, memory ≥ 19MB, iterations ≥ 2
3. Oturum çerezleri: `httpOnly`, `secure`, `sameSite: lax`, 7 gün
4. Giriş denemesi: IP başına 15 dakikada 5; aşımda 15 dk kilit + log

**Erişim kontrolü**
5. `middleware.ts` `/panel/*` ve `/api/v1/panel/*` yollarını korur
6. Her Server Action kendi içinde ayrıca `auth()` kontrolü yapar (middleware'e güvenilmez)
7. Panel yanıtlarında `X-Robots-Tag: noindex, nofollow`; `robots.txt`'te `/panel` disallow

**Girdi & çıktı**
8. Her girdi Zod ile doğrulanır — Server Action parametreleri dahil
9. MDX/HTML çıktısı `rehype-sanitize` ile temizlenir
10. Prisma dışında SQL yok; `$queryRaw` kullanımı güvenlik ajanı onayı gerektirir
11. Dosya yükleme: uzantı + MIME + magic byte kontrolü, ≤ 10MB, sadece izinli tipler,
    R2 private bucket, erişim imzalı URL ile (TTL 15 dk)

**Aktarım & başlıklar**
12. HTTPS zorunlu, HSTS (`max-age=63072000; includeSubDomains; preload`)
13. CSP nonce tabanlı — `unsafe-inline` script yasak (WebGL/shader'lar buna uydurulur)
14. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` kısıtlı

**Hız sınırlama**
15. İletişim formu: IP başına saatte 3, ayrıca honeypot alanı + zaman tuzağı
16. Yükleme uçları: dakikada 10

**Gizli bilgiler & kayıt**
17. `.env` repoya girmez; `.env.example` tüm anahtarları değersiz listeler
18. `NEXT_PUBLIC_` ile başlayan hiçbir değişkende sır bulunmaz (CI'da taranır)
19. Tüm panel mutasyonları `AuditLog`'a yazılır
20. Loglarda şifre, token, TOTP secret, tam e-posta ASLA görünmez

**Yedek & kurtarma**
21. Her gece 03:00 `pg_dump` → R2, 30 gün saklama, şifreli
22. Geri yükleme prosedürü `docs/security/restore.md`'de yazılı ve **en az bir kez test edilmiş**
23. R2'ye yüklenen yedeğin bütünlüğü checksum ile doğrulanır

**Bağımlılıklar**
24. `npm audit` yüksek/kritik açıkla merge yok
25. Yeni bağımlılık Orkestra Şefi onayı + `docs/DECISIONS.md` kaydı gerektirir

---

## 9. Test Gereksinimleri

**Birim (Vitest)** — servis katmanı, Zod şemaları, hesaplama yardımcıları
(para formatı, aylık toplam, PR hesabı, okuma süresi). Kapsam ≥ %70.

**Bileşen (Testing Library)** — form doğrulama hataları, boş durum ekranları,
tema değişimi, klavye erişimi.

**E2E (Playwright)** — asgari senaryolar:
1. Ziyaretçi ana sayfayı açar, projeye tıklar, detay görür, Kıyı Medya CTA'sı çalışır
2. Ziyaretçi iletişim formunu doldurur → mesaj panele düşer
3. Yanlış şifreyle giriş başarısız, doğru şifre + 2FA ile başarılı
4. Giriş yapmadan `/panel` → login'e yönlenir
5. Panelden gelir kaydı eklenir → dashboard toplamı güncellenir
6. Panelden proje yayınlanır → public sayfada görünür
7. Mobil görünümde ana sayfa ve panel kullanılabilir

**Performans** — Lighthouse CI: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
SEO ≥ 95 (public sayfalar).

---

## 10. Çalışma Protokolü (4 Ajan)

### 10.1 Roller ve Dosya Mülkiyeti

| Ajan | Sahip olduğu yollar | Yazma izni |
|------|--------------------|------------|
| **Orkestra Şefi** | `PROGRAM.md`, `docs/**` | Sadece dokümantasyon — **kod yazmaz** |
| **Backend** | `prisma/**`, `prisma.config.ts`, `docker-compose*.yml`, `src/server/**`, `src/app/api/**`, `src/lib/schemas/**`, `src/types/**` | Kod |
| **Frontend** | `src/app/(public)/**`, `src/app/(panel)/**`, `src/app/(auth)/**`, `src/app/layout.tsx`, `src/components/**`, `src/app/globals.css`, `public/**` | Kod |
| **Güvenlik & Test** | `tests/**`, `src/middleware.ts`, `src/lib/security/**`, `docs/security/**`, `.github/**`, `.nvmrc`, `vitest.config.ts`, `playwright.config.ts`, `lighthouserc.json` | Kod + rapor |

**Sınır kuralı:** Bir ajan başkasının dosyasını değiştirmez. İhtiyaç varsa Orkestra
Şefi'ne **değişiklik talebi** açar, o da ilgili ajana görev yazar. Bu kural projenin
tutarlılığını koruyan tek mekanizmadır, esnetilmez.

**Ortak dosyalar** (`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`):
değişiklik önce Orkestra Şefi'ne bildirilir; onay bir ADR veya görev kartıyla verilir.

> **F0 düzeltmeleri** — kök dizindeki `middleware.ts` yolu `src/` kullanan projede sessizce
> yok sayılır; doğru yol `src/middleware.ts`'tir (T-004/K1). `tailwind.config.ts` ortak dosya
> listesinden çıkarıldı: Tailwind v4 ile bu dosya hiç oluşturulmuyor, token'lar `globals.css`
> içinde `@theme` bloğunda yaşıyor ve dosyanın sahibi Frontend'dir (ADR-002).

### 10.2 Görev Akışı

```
Kullanıcı → Orkestra Şefi'ne ne istediğini söyler
Orkestra Şefi → Görev kartı (docs/tasks/T-XXX.md) + kopyalanabilir PROMPT üretir
Kullanıcı → Promptu ilgili ajana yapıştırır
Ajan → İşi yapar, standart RAPOR formatında döner
Kullanıcı → Raporu Orkestra Şefi'ne yapıştırır
Orkestra Şefi → STATUS.md'yi günceller, bir sonraki promptu üretir
```

### 10.3 Görev Kartı Formatı

```markdown
## T-042 — [Başlık]
**Ajan:** Backend | **Öncelik:** P1 | **Bağımlılık:** T-038
**PROGRAM.md referansı:** §6 Veri Modeli, §7.3 Zod Sözleşmesi
**Amaç:** (1–2 cümle, neden yapıldığı)
**Kapsam:** Dokunulacak dosyalar (liste)
**Kapsam dışı:** Dokunulmayacaklar (liste)
**Kabul kriterleri:**
- [ ] Ölçülebilir madde
- [ ] Ölçülebilir madde
**Test:** Hangi testler yazılacak/geçmeli
```

### 10.4 Ajan Rapor Formatı (zorunlu)

```markdown
## RAPOR — T-042 — [Ajan Adı]
**Durum:** Tamamlandı | Kısmen | Engellendi
**Yapılanlar:** (madde madde)
**Oluşturulan/değişen dosyalar:** (yol listesi)
**Dışarıya sözleşme:** (diğer ajanların bilmesi gereken tip/şema/endpoint imzaları)
**Testler:** (yazılan testler, sonuç)
**Kararlar:** (verilen teknik kararlar + gerekçe)
**Engeller / talepler:** (başka ajandan istenen şey)
**Sonraki öneri:** (bir sonraki mantıklı adım)
```

### 10.5 Git Düzeni

- Dal adları: `feat/T-042-transaction-service`, `fix/…`, `chore/…`
- Commit: Conventional Commits — `feat(muhasebe): işlem servisi ve zod şeması`
- `main` dalına doğrudan push yok; her görev kendi dalında
- Her commit öncesi: `pnpm lint && pnpm typecheck && pnpm test`

### 10.6 Tamamlanma Tanımı (DoD)

Bir görev şunların hepsi sağlanmadan "tamamlandı" sayılmaz:
TypeScript hatasız · ESLint uyarısız · ilgili testler yazılmış ve geçiyor ·
PROGRAM.md ile çelişmiyor · mobil ve masaüstünde çalışıyor · klavyeyle erişilebilir ·
boş/yükleniyor/hata durumları var · rapor formatında teslim edilmiş.

---

## 11. Yol Haritası

| Faz | İçerik | Ana ajan |
|-----|--------|----------|
| **F0 — Temel** | Next.js kurulumu, Tailwind token'ları, fontlar, tema anahtarı, klasör iskeleti, Prisma bağlantısı, `.env.example`, CI | Backend + Frontend |
| **F1 — Veri & Auth** | Tam Prisma şeması, migration, seed, Auth.js + 2FA, middleware koruması, temel servis katmanı | Backend |
| **F2 — Public İskelet** | Ana sayfa, hakkımda, projeler, blog, hizmetler, iletişim — **gerçek veriden** (ADR-026), React Bits entegrasyonu | Frontend + Backend |
| **F3 — Panel Çekirdek** | Panel layout, dashboard, içerik yönetimi (proje/blog/profil), mesaj kutusu | Backend + Frontend |
| **F4 — İş & Muhasebe** | Müşteri, iş kartları, işlem, kategori, raporlar, CSV/PDF dışa aktarım | Backend + Frontend |
| **F5 — Sağlık, Spor, Hayat** | Ölçüm girişi, antrenman kaydı, PR, alışkanlık, hedef, günlük + grafikler | Backend + Frontend |
| **F6 — Sertleştirme** | Güvenlik denetimi, CSP, hız sınırlama, E2E paketi, Lighthouse, yedekleme betiği, geri yükleme provası | Güvenlik & Test |
| **F7 — Yayın** | Coolify kurulumu, Docker, Postgres container, R2, domain + SSL, cron yedek, izleme | Hepsi |

Bir faz bitmeden sonraki faza geçilmez. Faz sonunda Orkestra Şefi kabul kontrolü yapar.

---

## 12. Ortam Değişkenleri

```env
# Uygulama
NEXT_PUBLIC_SITE_URL=https://abdulkadirelaldi.com
NEXT_PUBLIC_KIYI_MEDYA_URL=https://kiyimedya.com
NODE_ENV=production

# Veritabanı
# Yerel geliştirmede host portu 5433'tür (5432 değil): geliştirme makinesinde sistem
# geneli kurulu bir PostgreSQL 5432'yi tutabilir ve çakışma sessizdir — container
# "healthy" görünür ama bağlantılar diğer sunucuya gider. Bkz. docker-compose.dev.yml.
DATABASE_URL=postgresql://user:pass@127.0.0.1:5433/aelaldi

# Auth
AUTH_SECRET=
AUTH_URL=https://abdulkadirelaldi.com
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
TOTP_ISSUER=Abdulkadir Elaldı Panel
# TOTP secret'larını uygulama seviyesinde şifreler (ADR-013). Kaybolursa 2FA
# secret'ları açılamaz — BACKUP_ENCRYPTION_KEY ile aynı ciddiyette saklanmalı.
TOTP_ENCRYPTION_KEY=

# Depolama (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

# Mail
RESEND_API_KEY=
CONTACT_NOTIFY_EMAIL=

# Yedekleme
BACKUP_ENCRYPTION_KEY=
BACKUP_R2_BUCKET=
```

---

## 13. Dağıtım

Kendi sunucu, **Coolify** üzerinden. Bileşenler:

1. `Dockerfile` — çok aşamalı build, `output: 'standalone'`, non-root kullanıcı
2. PostgreSQL container — kalıcı volume, sadece iç ağa açık (port dışarı kapalı)
3. Coolify otomatik SSL (Let's Encrypt) + reverse proxy
4. Git push → otomatik build & deploy
5. Cron: her gece 03:00 `pg_dump | gzip | age -e | rclone → R2`
6. Sağlık kontrolü: `/api/v1/health` — DB bağlantısı + disk kontrolü
7. İzleme: Uptime Kuma (aynı sunucuda) + Coolify kaynak uyarıları

**Sunucu ön koşulları:** ≥ 2 vCPU, ≥ 4GB RAM, ≥ 40GB disk, Ubuntu 22.04+, Docker, root erişimi.
Bunlar sağlanmıyorsa Orkestra Şefi'ne bildirilir.

---

## 14. Karar Kaydı

Mimari kararlar `docs/DECISIONS.md` içinde ADR formatında tutulur:
`Bağlam → Karar → Sonuçlar → Alternatifler ve neden reddedildi`.
PROGRAM.md'de yazan bir şey değişecekse önce ADR yazılır, sonra PROGRAM.md güncellenir.
