# DECISIONS.md — Mimari Karar Kayıtları (ADR)

> Format: **Bağlam → Karar → Sonuçlar → Alternatifler ve neden reddedildi** (PROGRAM.md §14).
> PROGRAM.md'de yazan bir şey değişecekse **önce buraya ADR yazılır**, sonra PROGRAM.md güncellenir.
> Yalnızca Orkestra Şefi yazar.

| # | Karar | Tarih | Durum |
|---|-------|-------|-------|
| ADR-001 | Teknoloji yığını kilidi | 2026-08-04 | Kabul edildi |
| ADR-002 | Tailwind CSS v4 — CSS-first yapılandırma | 2026-08-04 | Kabul edildi |
| ADR-003 | Paket yöneticisi: pnpm | 2026-08-04 | Kabul edildi |
| ADR-004 | F0'da tüm bağımlılıklar tek elden kurulur | 2026-08-04 | Kabul edildi |
| ADR-005 | Prisma 7 sürücü adaptörü — `@prisma/adapter-pg` + `pg` | 2026-08-04 | Kabul edildi |
| ADR-006 | Üretilen Prisma istemcisi VCS'e girmez, `postinstall` ile üretilir | 2026-08-04 | Kabul edildi |
| ADR-007 | `prisma.config.ts` Backend mülkiyetindedir | 2026-08-04 | Kabul edildi |
| ADR-008 | Node.js 22 LTS'e yükselme — Node 20 EOL | 2026-08-05 | Kabul edildi |
| ADR-009 | Repo GitHub'da, CI GitHub Actions ile | 2026-08-05 | Kabul edildi |
| ADR-010 | Kendi cookie tabanlı tema sağlayıcısı — `next-themes` kullanılmaz | 2026-08-05 | Kabul edildi |
| ADR-011 | Dinamik render kabul edilir; önbellek veri katmanında çözülür | 2026-08-05 | Kabul edildi |
| ADR-012 | Veri bağımsız F2 hazırlığı F1 ile paralel yürüyebilir | 2026-08-05 | Kabul edildi |
| ADR-013 | Auth: JWT session, TOTP kurtarma kodu, `LoginAttempt` tablosu | 2026-08-05 | Kabul edildi |
| ADR-014 | Para birimi: kur snapshot'ı; KDV/stopaj v1 kapsamı dışı; `Decimal` → `string` DTO | 2026-08-05 | Kabul edildi |
| ADR-015 | Tekrarlayan işlem ayrı model + idempotent üretim | 2026-08-05 | Kabul edildi |
| ADR-016 | Gün semantiği `@db.Date`, tek zaman dilimi yardımcısı | 2026-08-05 | Kabul edildi |
| ADR-017 | İlişki ve bütünlük düzeltmeleri; `Job.status` ↔ kanban eşlemesi | 2026-08-05 | Kabul edildi |
| ADR-018 | Dosya yönetimi: URL saklanmaz, `Attachment` tek mekanizma | 2026-08-05 | Kabul edildi |
| ADR-019 | İçerik modeli: `locale`, yayın durumu, `viewCount`, etiketler | 2026-08-05 | Kabul edildi |
| ADR-020 | Enum sözleşmesi ve `AuditLog` redaksiyonu | 2026-08-05 | Kabul edildi |
| ADR-021 | Spor & hayat: PR tekrar bazında, `Habit` sayaç tabanlı | 2026-08-05 | Kabul edildi |
| ADR-022 | `LoginAttempt` denemeleri, `AuditLog` sonuçları kaydeder | 2026-08-05 | Kabul edildi |
| ADR-023 | Ölçüm görevleri tek başına koşar — paralel derleme yasağı | 2026-08-05 · **rev. 2026-08-10** | Kabul edildi |
| ADR-024 | Kendi QR kodlayıcımız — dar kapsam, kalıcı doğrulama şartıyla | 2026-08-10 | Kabul edildi |
| ADR-025 | React Bits bağımlılıkları: `ogl` onaylandı, `gsap` reddedildi | 2026-08-11 | Kabul edildi |
| ADR-026 | F2 public sayfaları gerçek veriden okur; içerik servisleri F3'ten öne alındı | 2026-08-11 | Kabul edildi |
| ADR-027 | İstatistikler türetilir, elle girilmez | 2026-08-12 | Kabul edildi |
| ADR-028 | Dal ve commit disiplini: tur başına tek PR, Orkestra Şefi commit'ler | 2026-08-14 | Kabul edildi |
| ADR-029 | `revalidateTag` tam dize eşleşir; her seviye ayrı düşürülür | 2026-08-14 | Kabul edildi |

---

## ADR-001 — Teknoloji Yığını Kilidi

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
Proje iki farklı yüzü olan tek bir uygulama: SEO ve performans önceliğinin yüksek olduğu
public bir portföy sitesi (§1.A) ve tek kullanıcılı, veri yoğun, hassas veri (muhasebe,
sağlık) tutan bir yönetim paneli (§1.B). Barındırma kendi sunucumuzda, Coolify + Docker ile
yapılacak (§13) — yani satıcıya özel (vendor-specific) çalışma zamanlarına bağlanılamaz.
Ekip tek kişilik; bu yüzden bakım yükünü düşük tutan, tek dilli (TypeScript) ve tek
depoda toplanan bir yığın gerekiyor.

### Karar
PROGRAM.md §2'deki yığın **kilitlenmiştir** ve şu gerekçelerle seçilmiştir:

| Seçim | Gerekçe |
|-------|---------|
| **Next.js 15 App Router + TS strict** | Tek kod tabanında hem statik/ISR public sayfalar hem korumalı panel. Server Components varsayılan olduğu için panel sorguları istemciye sızmaz. Server Actions, panel mutasyonları için ayrı bir API katmanı yazma zorunluluğunu kaldırır (§7.1). |
| **PostgreSQL 16 (kendi sunucu, Docker)** | İlişkisel model (§6) yoğun bağlantılı: `Job → Transaction`, `ContactMessage → Job`. `Decimal(12,2)` para desteği ve gerçek transaction garantisi şart. Kendi sunucuda tutmak, hassas sağlık/muhasebe verisini üçüncü tarafın dışında bırakır. |
| **Prisma, ham SQL yasak** | Tip güvenli sorgu, migration geçmişi, tek noktadan şema. Ham SQL yasağı, enjeksiyon yüzeyini pratikte sıfırlar (§8.10). |
| **Auth.js v5 Credentials + TOTP** | Tek kullanıcılı sistemde OAuth sağlayıcıya bağımlılık gereksiz risk. TOTP, harici servis olmadan ikinci faktör verir. |
| **argon2id (bcrypt değil)** | Argon2id bellek-zor (memory-hard); GPU ile paralel kırmaya bcrypt'ten dayanıklı. Tek hesabın korunması kritik olduğu için en güçlü seçenek alınmıştır (§8.2). |
| **Zod, istemci+sunucu ortak** | Doğrulama kuralı tek yerde yaşar; frontend ile backend'in kural kayması (drift) yapısal olarak engellenir (§7.3). Şema dosyalarının mülkiyeti Backend'dedir. |
| **Tailwind + CSS değişkenleri** | İki tema (koyu varsayılan + aydınlık zorunlu) tek token setiyle yönetilir; bileşende hex yazmak yasaklanınca tema tutarlılığı derleme zamanı yerine kural düzeyinde garanti altına alınır (§3.1). |
| **React Bits + Framer Motion** | Görsel iddia public tarafın satış argümanı. Ancak §5.2 sert kurallarıyla sınırlandırılır: panelde WebGL yok, sayfa başına 1 shader, `prefers-reduced-motion` fallback zorunlu. |
| **Cloudflare R2 (private + imzalı URL)** | S3 uyumlu, çıkış ücreti yok; hem varlıklar hem gece yedeği aynı depoda (§8.21). |
| **Vitest + Playwright** | Vitest Vite tabanlı, Next 15 ile hızlı; Playwright §9'daki 7 senaryonun tamamını (mobil görünüm dahil) tek araçla kapsar. |
| **Coolify + Docker (kendi sunucu)** | Vercel'e özgü kısıtlar (cron sınırı, uzun süren işler, DB'nin ayrı satıcıda olması) elenir. `pg_dump` cron'u ve Postgres aynı makinede olduğu için yedekleme basitleşir. |

### Sonuçlar
- **Olumlu:** Tek dil, tek repo, tek deploy hedefi. Veri tamamen kendi kontrolümüzde. Zod sözleşmesi sayesinde Backend ve Frontend ajanları birbirinin kodunu görmeden entegre olabilir.
- **Olumsuz / kabul edilen maliyet:** Sunucu bakımı (yama, disk, izleme) bize ait. `output: 'standalone'` Docker imajı ve migration akışı elle kurulmalı. Auth.js v5 belgeleri hâlâ hareketli — kırıcı değişiklik riski F1'de takip edilecek.
- **Zorunlu kıldığı kurallar:** `any` / `@ts-ignore` yasak; DB erişimi yalnız `src/server/services/`; her Server Action kendi `auth()` kontrolünü yapar; onaysız bağımlılık eklenmez.

### Alternatifler ve neden reddedildi
- **Astro + ayrı panel uygulaması** — Public taraf için daha hafif olurdu, ama iki uygulama iki deploy, iki auth, iki tip katmanı demek. K2 (panelden yönetilebilirlik) tek uygulamada çok daha ucuz.
- **Vercel + Neon/Supabase** — Kurulumu en hızlı seçenek; reddedildi çünkü hassas sağlık ve muhasebe verisi üçüncü tarafa çıkar, cron/yedekleme satıcı sınırlarına takılır ve §13'teki kendi sunucu kararıyla çelişir.
- **Drizzle ORM** — Daha ince bir katman ve SQL'e yakın; reddedildi çünkü Prisma'nın migration ve şema araçları tek kişilik bakımda daha az hata üretiyor, `Decimal` desteği olgun.
- **bcrypt** — Yaygın ve yeterli sayılır; reddedildi çünkü argon2id bellek-zor ve tek hesabın korunmasında ölçülebilir biçimde üstün.
- **Clerk / Auth0** — Kurulum kolaylığı var; reddedildi çünkü tek kullanıcı için aylık maliyet ve dış bağımlılık anlamsız, ayrıca kimlik verisi dışarı çıkar.
- **MongoDB** — Reddedildi: §6'daki model ilişkisel ve para hesabı `Decimal` gerektiriyor; belge veritabanı burada yanlış araç.

---

## ADR-002 — Tailwind CSS v4, CSS-first Yapılandırma

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
PROGRAM.md §2 "Tailwind CSS + CSS değişkenleri" diyor, §10.1 ise ortak dosyalar arasında
`tailwind.config.ts` sayıyor. Tailwind v4 yapılandırmayı JS dosyasından CSS'e taşıdı
(`@import "tailwindcss"` + `@theme`). Next.js 15 ile kurulan yeni projeler varsayılan
olarak v4 gelir. §3.1 zaten "tüm renkler CSS değişkeni olarak tanımlanır, hiçbir bileşende
hex yazılmaz" diyor — bu, v4'ün çalışma biçimiyle birebir örtüşüyor.

### Karar
Tailwind CSS **v4** kullanılır. Tasarım token'ları `src/app/globals.css` içinde `@theme`
bloğunda tanımlanır; `tailwind.config.ts` dosyası **oluşturulmaz**.
`globals.css` bundan böyle §10.1 anlamında **ortak dosyadır**: sahibi Frontend ajanıdır,
başka bir ajanın değişiklik ihtiyacı Orkestra Şefi üzerinden yürür.

### Sonuçlar
- Token'lar tek dosyada (`globals.css`) yaşar; §3.1'in "hex yasak" kuralı tek yerden denetlenebilir.
- PROGRAM.md §10.1'deki ortak dosya listesinden `tailwind.config.ts` çıkarılıp yerine `globals.css` konacak. *(PROGRAM.md güncellemesi F0 sonunda toplu yapılacak.)*
- v4 için PostCSS eklentisi `@tailwindcss/postcss` olur; eski `tailwindcss` + `autoprefixer` ikilisi kullanılmaz.

### Alternatifler ve neden reddedildi
- **Tailwind v3'e sabitlemek** — PROGRAM.md metnine harfiyen uyardı; reddedildi çünkü yeni projede geriye dönük sürüm sabitlemek, ilk günden teknik borç yaratır ve v3'ün JS config'i §3.1'in CSS değişkeni felsefesiyle gereksiz bir ikinci kaynak oluşturur.
- **v4 ama `@config` ile JS dosyası kullanmak** — İki yapılandırma kaynağı demek; token'ın nerede tanımlı olduğu belirsizleşir.

---

## ADR-003 — Paket Yöneticisi: pnpm

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
PROGRAM.md §10.5 commit öncesi komutları `pnpm lint && pnpm typecheck && pnpm test`
olarak yazıyor, ancak §5'teki React Bits kurulum komutu `npx shadcn@latest` kullanıyor.
Paket yöneticisi hiçbir yerde açıkça kilitlenmemiş.

### Karar
Paket yöneticisi **pnpm**'dir. `package.json` içinde `packageManager` alanı ile sürüm
sabitlenir, `pnpm-lock.yaml` repoya girer. React Bits kurulumu §5'teki komutla
(`npx shadcn@latest add ...`) yapılmaya devam eder — bu komut yalnızca dosya kopyalar,
paket yöneticisi seçimini etkilemez.

### Sonuçlar
- CI, Docker imajı ve tüm ajan promptları `pnpm` kullanır; `npm install` çalıştırılmaz.
- İçerik adresli depo sayesinde Docker build katmanları ve disk kullanımı daha verimli.
- `npm-shrinkwrap.json` / `package-lock.json` repoda bulunursa CI hata verir.

### Alternatifler ve neden reddedildi
- **npm** — En yaygın ve sıfır kurulum; reddedildi çünkü §10.5 zaten pnpm yazıyor ve tek kaynakta tutarlılık, marjinal kurulum kolaylığından değerli.
- **bun** — Daha hızlı; reddedildi çünkü Prisma ve Next 15 üretim derlemesiyle uyum riski var, tek kişilik bakımda hata ayıklama maliyeti yüksek.

---

## ADR-004 — F0'da Tüm Bağımlılıklar Tek Elden Kurulur

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
`package.json` §10.1'e göre ortak dosya. F0'da Backend (Prisma, Auth.js, Zod) ve Frontend
(next-themes, Framer Motion, react-hook-form) aynı anda bağımlılık eklemek isterse
`package.json` ve lock dosyasında çakışma çıkar. Ajanlar birbirinin çalışmasını görmüyor,
bu yüzden çakışmayı çözecek bir merci yok.

### Karar
F0'ın ilk görevinde (T-001) **Backend ajanı, F0–F2 için gereken tüm bağımlılıkları tek
seferde kurar**. Sonraki görevlerde hiçbir ajan `package.json`'a doğrudan dokunmaz;
yeni bağımlılık ihtiyacı raporun "Engeller / talepler" bölümünde Orkestra Şefi'ne bildirilir,
o da ADR yazıp kurulum için ayrı görev açar (§8.25).

### Sonuçlar
- Lock dosyası çakışması yapısal olarak imkânsız hale gelir.
- Kurulan ama F2'ye kadar kullanılmayan paketler olur — kabul edilen maliyet; `pnpm` ile disk etkisi ihmal edilebilir.
- Her yeni bağımlılık bir ADR bırakır; §8.25 denetlenebilir hale gelir.

### Alternatifler ve neden reddedildi
- **Her ajan kendi bağımlılığını kursun** — Doğal görünüyor; reddedildi çünkü paralel çalışan iki ajan lock dosyasını kaçınılmaz olarak çakıştırır ve bunu çözmek elle birleştirme (merge) gerektirir.
- **Orkestra Şefi kursun** — §10.1'e aykırı: Orkestra Şefi kod ve yapılandırma yazmaz.

---

## ADR-005 — Prisma 7 Sürücü Adaptörü: `@prisma/adapter-pg` + `pg`

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 raporu, engel E1 · **İlgili risk:** R8

### Bağlam
ADR-004 gereği bağımlılıklar T-001'de tek seferde kuruldu ve sonraki görevlerde yeni paket
eklenmesi yasaklandı. T-003'te bu kuralın öngörmediği bir durum çıktı: Prisma **7.9.1**,
v6'dan farklı olarak `new PrismaClient()` çağrısını argümansız kabul etmiyor.
Üretilen tipteki `PrismaClientOptions` tam olarak iki seçenekli bir birleşim:

```ts
PrismaClientOptions = PrismaClientOptionsWithAccelerateUrl | PrismaClientOptionsWithAdapter
```

Orkestra Şefi tarafından depoda bağımsız doğrulandı — `new PrismaClient()` içeren bir dosya
`tsc --noEmit` altında `TS2554: Expected 1 arguments, but got 0` veriyor. Yani bu bir tercih
değil, derleme zamanı zorunluluğu. `src/server/db.ts` ve `/api/v1/health` bu yüzden yazılamadı;
F1'in tamamı (servis katmanı, auth, tüm mutasyonlar) bu bağlantıya bağlı olduğu için engel kritik.

İki yoldan biri seçilmek zorunda:
- `accelerateUrl` — Prisma'nın ücretli bulut bağlantı havuzu servisi
- `adapter` — yerel sürücü adaptörü; PostgreSQL için `@prisma/adapter-pg`, o da `pg`'ye bağlı

### Karar
**Sürücü adaptörü yolu seçilmiştir.** Şu üç paket kurulur:

| Paket | Tür | Gerekçe |
|-------|-----|---------|
| `@prisma/adapter-pg` | dependency | Prisma 7'de PostgreSQL çalışma zamanı bağlantısı için zorunlu |
| `pg` | dependency | Adaptörün peer bağımlılığı |
| `@types/pg` | devDependency | `pg` kendi tiplerini taşımıyor; §2 "strict, `any` yasak" kuralı için gerekli |

ADR-004'ün "yeni bağımlılık eklenmez" kuralı **kaldırılmaz**; bu, kuralın kendi öngördüğü
istisna yoluyla (rapor → Orkestra Şefi onayı → ADR) işletilmiş bir eklemedir. Kurulumu
Backend ajanı T-003b görevinde yapar.

### Sonuçlar
- **Olumlu:** F1 açılabilir hale gelir. Bağlantı havuzu bizim kontrolümüzde kalır; Coolify'daki Postgres container'ına doğrudan bağlanılır (§13.2). Adaptör, `DATABASE_URL`'i olduğu gibi kullanır — §12'ye yeni anahtar gerekmez.
- **Olumsuz / kabul edilen maliyet:** İki yeni çalışma zamanı bağımlılığı ve `pg` üzerinden gelen geçişli paketler. `pg` havuz ayarları (`max`, `idleTimeoutMillis`) artık bizim sorumluluğumuzda — T-003b'de açıkça ayarlanacak, varsayılana bırakılmayacak. `npm audit` yüzeyi bir miktar genişler (§8.24 CI adımı bunu zaten yakalar).
- Üretim `Dockerfile`'ı (T-070) `pg`'nin yerel bağımlılık gerektirmediğini doğrulamalı — `pg` saf JS'tir, sorun beklenmiyor.

### Alternatifler ve neden reddedildi
- **Prisma Accelerate (`accelerateUrl`)** — Kurulumu tek satır; **reddedildi** çünkü ADR-001'in temel kararıyla doğrudan çelişir: hassas muhasebe ve sağlık verisi üçüncü tarafın bağlantı havuzundan geçerdi, üstelik ücretli bir dış bağımlılık ve tek kullanıcılı bir panel için tamamen gereksiz.
- **Prisma 6'ya geri dönmek** — R8'in tüm kırıcı değişikliklerini ortadan kaldırırdı; **reddedildi** çünkü T-003'ün çalışan migration zinciri, `prisma.config.ts` ve generator yapılandırması yeniden yazılırdı ve projeye ilk haftasında bilerek eskimiş bir major sürüm sabitlenmiş olurdu.
- **`@prisma/adapter-pg` yerine `postgres.js` tabanlı bir adaptör** — **reddedildi** çünkü Prisma'nın PostgreSQL için birinci parti ve belgelenmiş adaptörü `adapter-pg`; alternatifi seçmek destek yüzeyini daraltır, karşılığında hiçbir şey kazandırmaz.

---

## ADR-006 — Üretilen Prisma İstemcisi VCS'e Girmez, `postinstall` ile Üretilir

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 kararı K3, talep E3 · **Etkilenen:** T-004 (CI), T-070 (Dockerfile)

### Bağlam
Prisma 7 generator'ı TypeScript **kaynağı** üretiyor ve çıktı yolu açıkça verilmek zorunda.
Backend bu çıktıyı `src/server/generated/prisma/` altına koyup `.gitignore`'a ekledi.
Doğru karar — üretilmiş kaynak sürüm kontrolüne girmez. Ancak bir yan etkisi var: taze bir
klonda `pnpm install && pnpm typecheck` kırılır, çünkü istemci henüz yoktur. Şu anda hiçbir
dosya istemciyi import etmediği için sorun görünmüyor; T-003b'de `db.ts` yazılır yazılmaz
ortaya çıkacak ve **Güvenlik ajanının CI hattını (T-004) ilk çalıştırmada düşürecek**.

### Karar
Üretilen istemci `.gitignore`'da kalır. `package.json`'a `postinstall: "prisma generate"`
eklenir; böylece istemcinin varlığı kurulum adımının garantisi olur. Yanında geliştirici
kolaylığı script'leri de eklenir:

```json
"db:up":       "docker compose -f docker-compose.dev.yml up -d",
"db:down":     "docker compose -f docker-compose.dev.yml down",
"db:migrate":  "prisma migrate dev",
"db:generate": "prisma generate",
"db:studio":   "prisma studio",
"postinstall": "prisma generate"
```

Bu değişikliği Backend ajanı T-003b'de yapar — `package.json` ortak dosyadır, işbu ADR onayıdır.

### Sonuçlar
- Taze klon, CI ve Docker build'i tek yoldan çalışır: `pnpm install` istemciyi de üretir.
- `postinstall`, şema olmadan çalışırsa hata verir; `prisma/schema.prisma` repoda olduğu için bu durum oluşmaz.
- T-004 CI hattı `pnpm install` sonrası ayrıca `prisma generate` çağırmak zorunda **değildir** — çağırsa da zararsızdır.
- T-070 Dockerfile'ında `postinstall` build aşamasında çalışır; üretim imajında `prisma` CLI'ın bulunması gerekir (çok aşamalı build'de build katmanında yeterli).

### Alternatifler ve neden reddedildi
- **Üretilen istemciyi repoya commit'lemek** — CI'da hiçbir ek adım gerekmezdi; **reddedildi** çünkü binlerce satır türetilmiş kod her şema değişikliğinde diff'i kirletir ve şema ile istemcinin sessizce uyumsuz kalması mümkün hale gelir.
- **Her ajanın/CI adımının elle `prisma generate` çağırması** — **reddedildi** çünkü unutulabilir bir adım; unutulduğunda alınan hata (`Cannot find module`) nedeni belirsiz görünür ve zaman kaybettirir.

---

## ADR-007 — `prisma.config.ts` Backend Mülkiyetindedir

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 raporu, kapsam eki E2

### Bağlam
Prisma 7, `datasource` bloğundaki `url` alanını kaldırdı; migrate ve introspect komutlarının
kullandığı bağlantı dizesi artık `prisma.config.ts` içinde yaşıyor. Bu dosya olmadan hiçbir
migrate komutu çalışmıyor ve CLI onu **proje kökünde** arıyor — `prisma/` altına taşınamıyor.
Kök dizinde durduğu için PROGRAM.md §10.1'in yol tabanlı mülkiyet tablosunda karşılığı yok;
T-003 görev kartında da listeli değildi, Backend bilgilendirme notuyla oluşturdu.

### Karar
`prisma.config.ts` **Backend ajanının** mülkiyetindedir — `prisma/**` ile aynı kategoride sayılır,
kök dizinde durması bunu değiştirmez. Ortak dosya olarak işaretlenmez; Backend onay almadan
düzenleyebilir. PROGRAM.md §10.1 tablosuna Backend satırına eklenecek
*(PROGRAM.md güncellemesi F0 sonunda toplu yapılacak).*

Dosyanın içindeki `process.loadEnvFile()` çözümü de onaylanmıştır: Prisma 7 CLI `.env`'i
kendiliğinden yüklemiyor ve Node 20.12+ yerleşiği bunu ek bağımlılık olmadan karşılıyor
(`dotenv` kurulsaydı ADR-004 ihlali olurdu).

### Sonuçlar
- Backend, migration yapılandırmasını tek başına yönetebilir; her değişiklik için Orkestra Şefi'ne uğramaz.
- Güvenlik ajanı bu dosyayı denetim kapsamında sayar (bağlantı dizesi ve `.env` yükleme mantığı §8.17/§8.20 ile ilgilidir) ama **düzenleyemez** — bulgu açar.
- §10.1 tablosu kök dizindeki dosyalar için eksik kalıyor; F0 sonu PROGRAM.md güncellemesinde `prisma.config.ts` ve `docker-compose.dev.yml` Backend'e, `next.config.ts` ortak dosyalara açıkça yazılacak.

### Alternatifler ve neden reddedildi
- **Ortak dosya ilan etmek** — Kökte durduğu için ilk bakışta tutarlı görünürdü; **reddedildi** çünkü içeriği tamamen Prisma'ya özgü ve yalnızca Backend'i ilgilendiriyor. Ortak ilan etmek, her migration ayarı için gereksiz bir onay turu yaratırdı.
- **Güvenlik ajanına vermek** (bağlantı dizesi içeriyor diye) — **reddedildi** çünkü dosya sır tutmuyor, `.env`'den okuyor; mülkiyeti şemayla birlikte tutmak tutarlılığı korur.

---

## ADR-008 — Node.js 22 LTS'e Yükselme (Node 20 EOL)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-004 notu T3, karar K6 · **İlgili risk:** R14

### Bağlam
Depo `engines: ">=20.11.0"` ile açıldı ve geliştirme makinesi Node 20.20 kullanıyor.
T-004'te bunun ilk somut bedeli ödendi: `jsdom@30` Node ≥22.22 istediği için kurulamadı
ve Güvenlik ajanı `jsdom@26.1.0`'a sabitlemek zorunda kaldı (K6).

Asıl mesele sürüm sabitlemesi değil: **Node 20'nin destek penceresi Nisan 2026'da kapandı.**
Bugün (2026-08-05) itibarıyla güvenlik yaması almıyor. §8'in tamamı yamalanmış bir çalışma
zamanı varsayıyor; §8.24 "yüksek/kritik açıkla merge yok" diyor ama çalışma zamanının kendisi
yamasızsa bu kapı anlamını yitirir.

Ayrıca T-004 haklı olarak şuna işaret etti: CI (T-005) ve Docker taban imajı (T-070) sürümü
**bağımsız** seçerse "yerelde çalışıyor, CI'da çalışmıyor" sınıfı hatalar çıkar. Sürüm tek
yerden sabitlenmeli.

### Karar
Proje **Node.js 22 LTS**'e yükselir. Üç yer birlikte sabitlenir ve birbirinden sapamaz:

| Yer | Ne yapılır | Kim |
|-----|-----------|-----|
| `package.json` → `engines.node` | `">=22.11.0"` | Güvenlik (T-005, yetkilendirildi) |
| `.nvmrc` | `22` | Güvenlik (T-005) |
| GitHub Actions `setup-node` | `node-version-file: .nvmrc` | Güvenlik (T-005) |
| `Dockerfile` taban imajı | `node:22-alpine` | Backend (T-070) |

`.nvmrc` tek kaynak; CI onu okur, Docker'ın oradan sapması T-070'te denetlenir.
Yükseltme sonrası `jsdom` sabitlemesi (T-004/K6) kaldırılabilir — zorunlu değil, T-005'in kararı.

**Kullanıcı eylemi gerekli:** yerel makinede Node 22 kurulmalı (`nvm install 22` / `fnm use 22`).
T-005 bundan önce koşturulmamalı, yoksa `engines` kapısı yerel kurulumu reddeder.

### Sonuçlar
- **Olumlu:** Yamalanmış çalışma zamanı; §8.24'ün kapısı anlamlı hale gelir. `jsdom` gibi modern paketler sürüm düşürmeden kurulur. Node 22 LTS penceresi projeyi F7'nin epey ötesine taşır.
- **Olumsuz / kabul edilen maliyet:** Yerelde tek seferlik kurulum. `pnpm install` bir kez yeniden koşacak; `argon2` ve `pg` yerel derleme gerektirmediği için sürpriz beklenmiyor (T-003b'de `pg`'nin saf JS olduğu doğrulanmıştı).
- Node 24 değerlendirildi ve **F7'ye ertelendi**: dağıtım öncesi taban imaj seçimi yeniden gözden geçirilecek.

### Alternatifler ve neden reddedildi
- **Node 20'de kalmak** — Hiçbir şey değişmez, hemen ilerlenir; **reddedildi** çünkü EOL bir çalışma zamanını üretime çıkarmak §8'in tamamıyla çelişir ve karar F7'de, geri dönüşü daha pahalıyken yine karşımıza çıkardı.
- **Node 24 LTS** — En uzun destek penceresi; **şimdilik reddedildi** çünkü Node 22'ye göre sahada daha az denenmiş ve F0'ın ortasında sürpriz uyumsuzluk riskini almanın karşılığı yok. F7'de yeniden değerlendirilecek.
- **Sürümü sabitlemeyip yalnızca `jsdom`'u düşürmek** — Semptomu geçirir, nedeni bırakır; **reddedildi** çünkü aynı çatışma her modern pakette tekrar çıkar.

---

## ADR-009 — Repo GitHub'da, CI GitHub Actions ile

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** Q3 · **Bağlayan:** T-005, T-071

### Bağlam
PROGRAM.md §10.5 dal ve commit düzenini tanımlıyor, §13.4 "Git push → otomatik build & deploy"
diyor, ama barındırmanın nerede olduğu hiçbir yerde yazmıyor. T-005'in (CI hattı) tamamı buna
bağlı: §8.18 (gizli bilgi taraması), §8.24 (`npm audit` kapısı) ve §9 (Lighthouse CI eşikleri)
bir CI koşucusu olmadan uygulanamaz.

### Karar
Repo **GitHub**'da barınır, CI **GitHub Actions** ile kurulur. Hattın sırası §10.5 ve §10.6'dan
türetilir ve T-004'te uçtan uca doğrulanmış hâliyle sabitlenir:

```
pnpm install → lint → typecheck → test (kapsam) → build → test:e2e
```

Herhangi biri düşerse merge yok (§10.6). Coolify, GitHub'dan otomatik deploy çeker (§13.4).

CI ortamı hakkında T-003b/T-004'te doğrulanan gerçekler hatta yazılıdır:
- `.env` **yok** (§8.17) — `pnpm install` ve `pnpm build` bunu tolere etmeli (T-003c'nin konusu)
- `pnpm install` sonrası ayrıca `prisma generate` çağırmaya gerek yok (ADR-006)
- `pnpm build` DB'ye bağlanmaz → CI'da Postgres servisi başlatmaya gerek yok
- Yalnızca `pnpm db:migrate` çalıştıran bir iş eklenirse DB gerekir

### Sonuçlar
- §8.18 (gizli bilgi taraması) ve §8.24 (`npm audit` kapısı) hazır eylemlerle kurulabilir; Lighthouse CI'ın resmî GitHub entegrasyonu var (§9).
- `main` dalı korumaya alınır: doğrudan push yok, hat yeşil olmadan merge yok (§10.5).
- **Gerçek `DATABASE_URL` asla CI secret'ı yapılmaz.** Derlemenin DB'ye ihtiyacı yoktur; bunu secret'a çevirmek T-004'ün BULGU-002'de işaret ettiği tam olarak yanlış refleksti. Migration çalıştıran bir iş eklenirse ayrı ve dar yetkili bir bağlantı dizesi kullanılır.
- Kod GitHub'da barınacağı için `.env`'in repoya hiç girmemesi (§8.17) artık yalnızca hijyen değil, dış maruziyet meselesi.

### Alternatifler ve neden reddedildi
- **Kendi sunucuda Gitea + Coolify build hook** — Tam kontrol ve hiçbir dış bağımlılık; **reddedildi** çünkü Lighthouse CI, `npm audit` kapısı ve gizli bilgi taraması elle kurulurdu ve tek kişilik bakımda bu adımlar ilk sıkışıklıkta atlanır. Ayrıca kod zaten public bir portföy projesi.
- **CI'ı tamamen Coolify build hook'una gömmek** — Tek yerde toplanırdı; **reddedildi** çünkü kapı deploy anında çalışırdı: hatayı merge'den önce değil, dağıtım sırasında görürdük — §10.6'nın amacının tersi.

---

## ADR-010 — Kendi Cookie Tabanlı Tema Sağlayıcısı (`next-themes` Kullanılmaz)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002 raporu, karar K1

### Bağlam
T-002'nin kabul kriteri açıktı: tema anahtarı **cookie tabanlı** olacak, `localStorage`
değil, ve **FOUC olmayacak**. Frontend ajanı `next-themes@0.4.6`'nın kaynağını inceleyip
iki yapısal engel buldu:

1. `next-themes` yalnızca `localStorage.getItem/setItem` kullanıyor — cookie desteği yok,
   kaynak kodda "cookie" kelimesi hiç geçmiyor. Kriter bu paketle **karşılanamıyor**.
2. FOUC'u bir **inline `<script>`** ile çözüyor. §8.13 `unsafe-inline` script'i yasaklıyor;
   bu yol seçilseydi F6/T-060'ta nonce borcu doğardı — CSP'yi bileşene uydurmak yerine
   bileşeni CSP'ye uydurmak zorunda kalırdık.

`next-themes` ADR-004 kapsamında T-001'de kurulmuştu; o an bu iki kısıt bilinmiyordu.

### Karar
`next-themes` **kullanılmaz**. Yerine ~90 satırlık kendi sağlayıcımız kullanılır:

| | |
|---|---|
| Cookie | `ae-theme` · `path=/` · `max-age=31536000` · `SameSite=Lax` · `Secure` (yalnız HTTPS) |
| Değerler | `'light' \| 'dark' \| 'system'` |
| `<html>` sınıfı | `light` / `dark` / (system'de sınıf yok) |
| FOUC | Sunucuda basılır — inline script **yok**, nonce gerekmiyor |
| JS kapalıyken | `@media (prefers-color-scheme: light)` devreye girer |
| API | `useTheme() → { theme, resolvedTheme, setTheme }` |

`next-themes` paketi `package.json`'dan **kaldırılır** — kullanılmayan bir bağımlılık
gereksiz saldırı yüzeyi ve sonraki bir ajan için yanıltıcı bir sinyaldir. Kaldırma işi
Backend'e verilir (T-010 ile birlikte); Frontend ADR-004 gereği `package.json`'a dokunmadı — doğru davranış.

### Sonuçlar
- **Olumlu:** Her iki kriter de yapısal olarak sağlanıyor — FOUC "önlenmiş" değil, mümkün değil. §8.13 borcu doğmuyor. Kötü niyetli cookie değeri (`<script>alert(1)</script>`) güvenli düşüşle sınıfsız kalıyor; test edilmiş.
- **Olumsuz / kabul edilen maliyet:** ~90 satır kendi kodumuz; `next-themes`'in sistem tercihi dinleyicisi, çoklu sekme senkronizasyonu gibi olgunlaşmış ayrıntılarını kendimiz taşıyoruz. `resolvedTheme` ilk render'da `undefined` — sunucu sistem tercihini bilemez, bu kaçınılmaz ve tüketiciler bunu hesaba katmalı.
- Bu karar ADR-011'i doğrudan tetikledi: cookie'yi kök layout'ta okumak tüm rotaları dinamik render'a çekti.

### Alternatifler ve neden reddedildi
- **`next-themes`'i `localStorage` ile kullanmak** — Paket hazır ve olgun; **reddedildi** çünkü kabul kriteriyle doğrudan çelişir ve `localStorage` sunucuda okunamadığı için FOUC ancak inline script'le önlenir — yani ikinci sorunu da beraberinde getirir.
- **`next-themes` + nonce'lu inline script** — Teknik olarak mümkün; **reddedildi** çünkü F6'ya kadar taşınacak bir CSP borcu yaratır ve çözdüğü sorun (cookie desteği) yine çözülmemiş kalır.
- **Tema anahtarını tamamen kaldırıp yalnızca `prefers-color-scheme`'e güvenmek** — En basit yol; **reddedildi** çünkü §3'ün "kullanıcı tercihi **+** sistem tercihi" gereğini karşılamaz.

---

## ADR-011 — Dinamik Render Kabul Edilir; Önbellek Veri Katmanında Çözülür

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002 raporu · **İlgili risk:** R16

### Bağlam
ADR-010'un sonucu olarak kök layout tema cookie'sini `cookies()` ile okuyor. Next 15'te bu
çağrı **tüm rotaları** statik üretimden çıkarıyor: T-001'de `○ /` (static) olan build çıktısı
artık `ƒ /` (dynamic). §1.1 K1 (LCP < 2.0s) ve SEO doğrudan bu katmana bakıyordu.

Karar spekülasyonla değil ölçümle veriliyor: T-005'te Lighthouse ilk kez koştu ve
**Performance 91** ölçtü — §9 eşiği ≥ 90 zaten sağlanıyor, üstelik dinamik render altında.

Ayrıca §13'te CDN yok; sayfalar kendi sunucumuzdan servis ediliyor. Statik üretimin asıl
kazancı bu mimaride "dosyayı diskten ver" değil, "**veriyi tekrar tekrar sorgulama**".

### Karar
Dinamik render **kabul edilir**. Statik üretimi geri kazanmak için tema mimarisi bozulmaz.

Karşılığında bir koruma zorunlu kılınır: **F2'den itibaren public sayfaların veri erişimi
açık önbellekleme ile yazılır** — `unstable_cache` (veya güncel eşdeğeri) + etiket tabanlı
`revalidateTag`. Panelden içerik yayınlandığında ilgili etiket geçersizleştirilir (§7.1'in
`revalidatePath` akışıyla birlikte). Böylece her istekte DB'ye gidilmez; asıl maliyet kalemi
kapatılır.

Karar **T-029'da yeniden ölçülür**: gerçek ana sayfa ve gerçek içerikle Lighthouse tekrar
koşacak. Performance < 90'a düşerse bu ADR yeniden açılır.

### Sonuçlar
- **Olumlu:** Tema mimarisi (ADR-010) bozulmadan kalıyor; FOUC ve CSP borcu üretilmiyor. Ölçülen performans eşiği zaten sağlıyor.
- **Olumsuz / kabul edilen maliyet:** Her istek sunucuda render ediliyor (küçük sayfada birkaç ms). ISR'ın "sayfayı tamamen hazır tut" kazancından vazgeçiliyor. Önbellekleme artık **açık bir sorumluluk** — unutulursa her ziyaret DB'ye gider. Bu yüzden F2 görev kartlarına kabul kriteri olarak yazılır, ajanın hatırlamasına bırakılmaz.
- Panel tarafı zaten dinamik olmalıydı (kişiye özel veri) — orada kayıp yok.

### Alternatifler ve neden reddedildi
- **Tema sınıfını nonce'lu inline script ile basmak** — Statik üretim geri gelir, FOUC yine olmaz; **reddedildi** çünkü §8.13'e bir nonce borcu yaratır ve ADR-010'un tam olarak kaçındığı yere geri döner. Ölçülen Performance 91 iken bu takası yapmanın karşılığı yok.
- **Cookie'yi yalnızca `(panel)` layout'unda okumak** — Public taraf statik kalırdı; **reddedildi** çünkü açıkça tema seçmiş bir ziyaretçi public sayfada ilk boyamada yanlış temayı görürdü — yani FOUC'u kaldırmayıp yalnızca yerini değiştirirdi.
- **Cookie'yi kaldırıp yalnızca `prefers-color-scheme`** — §3'ün kullanıcı tercihi gereğini karşılamaz (ADR-010'da da reddedilmişti).

---

## ADR-012 — Veri Bağımsız F2 Hazırlığı F1 ile Paralel Yürüyebilir

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002b sonrası Frontend'in boşta kalması · **İlgili risk:** R11

### Bağlam
PROGRAM.md §11 net: *"Bir faz bitmeden sonraki faza geçilmez."* Kural, kararsız bir temelin
üstüne inşa etmeyi engellemek için var ve F0 boyunca değerini kanıtladı.

Ancak F0 kapanırken şu tablo oluştu: F1'in ilk görevi T-010 (tam §6 Prisma şeması) **R11
yüzünden açılamıyor** — beş veri modeli kararı (A1, A4, B7, C2, C6) kullanıcıdan gelmedi.
Bu arada Frontend'in sıradaki işi T-020 (React Bits kurulumu ve token uyumlaması) veri
katmanına **hiç dokunmuyor**: bileşenleri `src/components/reactbits/` altına alıp sabit
renklerini token'larla değiştirmek, `next/dynamic` ile sarmak ve bundle etkisini ölçmek.
Kuralı harfiyen uygularsak Frontend, hiçbir teknik bağımlılığı olmayan bir beklemeye girer.

### Karar
§11'in faz sırası kuralı **korunur**, dar bir istisnayla: bir sonraki fazın görevlerinden
**mevcut fazın çıktılarına sıfır bağımlılığı olanlar** paralel yürütülebilir. Koşullar:

1. Görev, açık fazın hiçbir çıktısını (şema, tip, servis, endpoint) tüketmez.
2. Görev, açık fazın ajanlarıyla **dosya kesişimi** yaratmaz (§10.1).
3. Paralel yürütme kararını Orkestra Şefi verir ve görev kartında **açıkça** belirtir.
4. **Faz kabul kapısı değişmez:** F1, kendi kabul kriterleri sağlanmadan kapanmaz;
   paralel yürüyen F2 görevi F1'i "kapanmış" saydırmaz.

İlk uygulama: **T-020**, F1/T-010 ile paralel.

### Sonuçlar
- **Olumlu:** Bir ajanın, kendisini ilgilendirmeyen bir karar beklerken boşta kalması önlenir. T-020'nin erken yapılması F2'nin en büyük bilinmeyenini (React Bits bundle maliyeti, §5.2.6'nın 40KB eşiği) öne çeker — geç öğrenilmesi pahalı bir bilgi.
- **Olumsuz / kabul edilen maliyet:** "Faz" kavramı bir miktar bulanıklaşır; STATUS.md'de hangi görevin hangi faza ait olduğu ve neden paralel koştuğu açıkça yazılmazsa takip zorlaşır. Bu yüzden 3. koşul (görev kartında açık beyan) zorunlu tutuldu.
- Kural **kötüye kullanılmaya açıktır**: "bu da bağımsız sayılır" diyerek fazlar iç içe geçebilir. 1. ve 2. koşul bunu sınırlıyor; şüphe varında paralel yürütülmez.

### Alternatifler ve neden reddedildi
- **§11'i harfiyen uygulayıp Frontend'i bekletmek** — En temiz disiplin; **reddedildi** çünkü beklemenin teknik bir gerekçesi yok; gerekçe yalnızca kuralın lafzı. Kuralın amacı (kararsız temel üstüne inşa etmemek) T-020'de zaten ihlal edilmiyor.
- **§11'i tamamen kaldırıp serbest paralellik** — **reddedildi** çünkü faz kapıları F0'da işe yaradı: her fazın sonunda yapılan kabul kontrolü BULGU-002 ve BULGU-003 gibi kalemleri yakaladı. Kapıyı kaldırmak bu mekanizmayı da kaldırır.
- **F1'i R11 olmadan başlatmak** — **reddedildi** çünkü T-010 tam şemayı yazacak; beş karar sonradan gelirse şema ve migration ikinci kez yazılır. Backend bunu dört raporda üst üste uyardı.

---

## ADR-013 — Auth: JWT Session, TOTP Kurtarma Kodu, `LoginAttempt` Tablosu

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A1, A2, A3 · **İlgili risk:** R3

### Bağlam
Backend'in T-000 değerlendirmesi üç kalemde şemanın kendi içinde tutarsız olduğunu gösterdi:

- **A1:** §2 "Credentials + TOTP" diyor, §6 ise "`Session`, `VerificationToken` — Auth.js standardı".
  Auth.js v5'te Credentials provider **yalnızca JWT** session stratejisiyle çalışır; PrismaAdapter'ın
  DB session'ı Credentials ile kullanılamaz. Adapter ayrıca `Account`, `User.emailVerified`,
  `User.image` alanlarını zorunlu kılar — §6'da yoklar. Yani §6 çalışmayacak bir şema tarif ediyor.
- **A2:** §8.1 2FA'yı zorunlu açık getiriyor, ama kurtarma kodu yok. Tek kullanıcılı sistemde
  telefon kaybı = panele tam kilitlenme; tek çıkış DB'ye elle müdahale. R3 bunu F0'da zaten
  risk olarak kaydetmişti. Ayrıca `totpSecret` düz metin saklanırsa DB yedeği (§8.21) sızdığında
  ikinci faktör tamamen değersizleşir.
- **A3:** §8.4 "IP başına 15 dakikada 5 deneme, aşımda 15 dk kilit + **log**" istiyor ama
  karşılığı bir model yok. Bellek içi sayaç Docker yeniden başlatmada sıfırlanır — gereksinim
  sağlanmış görünür, sağlanmaz.

### Karar
**A1 — JWT stratejisi.** `session: { strategy: 'jwt' }`. `Session` ve `VerificationToken`
modelleri şemadan **çıkarılır**; `Account` eklenmez. PrismaAdapter kullanılmaz — tek kullanıcılı
Credentials akışında hiçbir şey kazandırmıyor. Oturum çerezi §8.3'teki bayrakları taşır
(`httpOnly`, `secure`, `sameSite: lax`, 7 gün).

**A2 — Kurtarma kodları ve şifreli secret.** `User` şu alanları kazanır:
`totpBackupCodes String[]` (her biri **argon2id ile hash'li** — düz saklanmaz),
`totpConfirmedAt DateTime?` (kurulum tamamlanmadan 2FA zorunlu sayılmaz),
`totpSecret` **uygulama seviyesinde şifreli** saklanır (yeni env anahtarı: `TOTP_ENCRYPTION_KEY`).
Kod bir kez kullanılır ve tüketilir. Kurtarma prosedürü `docs/security/restore.md`'ye yazılır (§8.22).

**A3 — `LoginAttempt` tablosu + sınır.** Model **Backend'in** (`prisma/**`):
`ip`, `emailHash` (ham e-posta değil — §8.20), `success`, `createdAt`, `@@index([ip, createdAt])`.
Sayma ve kilitleme **mantığı** Güvenlik ajanının (`src/lib/security/**`); okuma/yazma
Backend'in yazdığı bir servis üzerinden yapılır. Yani: **tablo ve servis Backend, politika Güvenlik.**
Kilit durumu ayrıca `User.lockedUntil DateTime?` ile taşınır.

### Sonuçlar
- §6'nın çalışmayan kısmı düzeltildi; F1 baştan yazılmaktan kurtuldu.
- Şema küçüldü: iki model eksildi, adapter bağımlılığı kalktı.
- **Yeni env anahtarı** `TOTP_ENCRYPTION_KEY` — §12'ye eklenecek. Kaybolursa 2FA secret'ları açılamaz; `BACKUP_ENCRYPTION_KEY` ile aynı ciddiyette saklanmalı.
- JWT ile "oturumu sunucudan sonlandırma" doğrudan mümkün değil. Tek kullanıcı için kabul edilebilir; gerekirse token `iat` + `User.sessionsValidFrom` karşılaştırmasıyla toplu geçersizleştirme eklenir (v1'de yok).
- `LoginAttempt` büyür: 90 günden eski kayıtlar gece işiyle temizlenir (§8 KVKK yönü, C10 ile birlikte).

### Alternatifler ve neden reddedildi
- **PrismaAdapter + DB session** — §6'nın lafzına uyardı; **reddedildi** çünkü Auth.js v5'te Credentials ile teknik olarak çalışmıyor. Lafza uymak için çalışmayan kod yazılmaz.
- **Kurtarma kodu yerine "e-posta ile sıfırlama"** — **reddedildi** çünkü e-posta hesabı ele geçirilirse 2FA tamamen atlanır; ikinci faktörün amacını ortadan kaldırır.
- **Hız sınırlamayı bellekte tutmak** — Basit ve hızlı; **reddedildi** çünkü §8.4 açıkça **log** istiyor ve yeniden başlatmada sıfırlanan bir sayaç denetlenebilir değil.

---

## ADR-014 — Para Birimi: Kur Snapshot'ı; KDV/Stopaj v1 Kapsamı Dışı; `Decimal` → `string` DTO

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A4, B8, D · **İlgili risk:** R4

### Bağlam
**A4:** `Transaction.amount Decimal(12,2)` + `currency` var, kur alanı yok. USD bir tahsilat
girildiğinde "aylık gelir toplamı" — §9'un **test edilmesini istediği** hesaplama — matematiksel
olarak üretilemiyor. Kritik olan şu: kur **işlem anına** aittir; sonradan eklenirse geçmiş
kayıtlara doğru kur atanamaz, yani veri kurtarılamaz hale gelir.

**B8:** `agreedAmount` var ama kısmi ödeme, kalan bakiye, KDV, stopaj yok.

**D:** Prisma `Decimal`, JS tarafında `Decimal.js` nesnesi döner ve Server Component →
Client Component sınırında **serialize edilemez** — frontend çalışma zamanı hatası alır.
R4 bunu F0'da risk olarak kaydetmişti.

### Karar
**A4 — Kur snapshot'ı (kullanıcı onayı ile).** `Transaction` ve `Job` şu alanları kazanır:
`fxRate Decimal(18,8)` (işlem anındaki kur, TRY bazlı) ve `baseAmount Decimal(12,2)` (TRY karşılığı).
**Tüm toplama, raporlama ve grafik `baseAmount` üzerinden yapılır**; `amount` + `currency`
yalnızca kaydın kendi gerçeğini gösterir. TRY işlemlerde `fxRate = 1.0`, `baseAmount = amount`.

**B8 — KDV ve stopaj v1 kapsamı dışı (kullanıcı onayı ile).** §1.2 zaten e-fatura
entegrasyonunu kapsam dışı bırakıyor. `agreedAmount` brüt tutardır. **Tahsil edilen ve kalan
bakiye ayrı sütun olarak tutulmaz** — bağlı `Transaction` toplamından türetilir. Tek doğruluk
kaynağı korunur; iki yerde tutulup birbirini tutmayan tutar sorunu doğmaz.

**D — DTO sınırında `string`.** Servis katmanı dışarıya `Decimal` **döndürmez**; para alanları
DTO sınırında `string`'e çevrilir (`amount: string`). Bu, Backend'in Frontend'e verdiği
sözleşmenin parçasıdır ve T-015'te dönüştürme yardımcısı olarak yazılır. Formatlama
(binlik ayracı, para simgesi) Frontend'in işidir ve `src/lib/utils` içindeki ortak
formatlayıcıdan geçer.

### Sonuçlar
- Çok para birimli toplamlar ilk günden doğru; geçmiş veri kurtarılabilir kalıyor.
- Kur kaynağı v1'de **elle girilir** (otomatik kur servisi entegrasyonu yok — §1.2 ruhuna uygun). Panelde işlem eklenirken kur alanı görünür ve zorunludur; TRY seçiliyse 1.0 ile gizlenir.
- `baseAmount` türetilmiş bir alandır ama **saklanır** — hesaplanarak tutulsaydı geçmiş kurları yeniden bulmak gerekirdi.
- KDV kararı geri dönülebilir: `vatRate` sonradan nullable eklenebilir, geçmiş veriyi bozmaz. Bu yüzden v1'de dışarıda bırakmak ucuz.
- R4 kapanır; `Decimal` sızıntısı yapısal olarak engellenir.

### Alternatifler ve neden reddedildi
- **Yalnızca TRY, `currency` alanını kaldır** — En basit; **reddedildi** çünkü kullanıcı yabancı para birimiyle iş aldığını belirtti ve sonradan eklemek geçmiş veriye kur atama sorunu doğurur.
- **Kuru işlem anında saklamak yerine sorgu anında hesaplamak** — **reddedildi** çünkü geçmiş kurları güvenilir biçimde geri getirmek dış servis ve tarih bazlı sorgu gerektirir; üstelik rapor her koşuda farklı sonuç verirdi.
- **`Job` üzerinde `paidAmount` / `remainingAmount` sütunları** — Sorguyu basitleştirirdi; **reddedildi** çünkü aynı bilgi iki yerde tutulur ve er geç birbirini tutmaz. §6'nın "aynı veri iki yere girilmez" ilkesiyle çelişir.
- **`Decimal` yerine tamsayı kuruş** — Serileştirme sorununu da çözerdi; **reddedildi** çünkü §6 açıkça `Decimal(12,2)` diyor ve tamsayı kuruş her okuma/yazmada dönüştürme hatası riski taşır.

---

## ADR-015 — Tekrarlayan İşlem Ayrı Model + Idempotent Üretim

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A5

### Bağlam
§6'da `Transaction.isRecurring` + `recurrenceRule` var; ama `nextRunAt`, `lastGeneratedAt`
ve üretilen kayıtta kaynağa referans yok. §13.5 gece cron'u tanımlıyor. Cron iki kez
çalışırsa (yeniden deneme, dağıtım sırasında çakışma, elle tetikleme) **çift kayıt** oluşur
ve muhasebe sessizce bozulur. Sessiz bozulma, gürültülü hatadan çok daha pahalıdır — çünkü
aylar sonra fark edilir ve hangi kaydın fazladan olduğu belli olmaz.

Ayrıca şablon ile üretilen kaydı aynı tabloda tutmak kavramsal olarak yanlış: şablon bir
**kural**, üretilen ise bir **olay**. Aynı tabloda durunca her sorguya `isRecurring = false`
filtresi eklemek gerekir ve bu filtre er geç unutulur.

### Karar
Şablon ayrı bir modele taşınır: **`RecurringTransaction`** — `type`, `amount`, `currency`,
`categoryId`, `description`, `method`, `recurrenceRule`, `nextRunAt`, `lastGeneratedAt`,
`isActive`, `startDate`, `endDate?`.

Üretilen `Transaction` kaydı `sourceRecurringId String?` taşır ve idempotanslık
**veritabanı düzeyinde** garanti edilir:

```
@@unique([sourceRecurringId, periodKey])
```

`periodKey` üretim dönemini temsil eden deterministik bir dize (örn. `2026-08`).
Cron ikinci kez çalışırsa ikinci ekleme **unique ihlaliyle reddedilir** — uygulama mantığına
güvenilmez. `Transaction.isRecurring` ve `recurrenceRule` alanları kaldırılır.

### Sonuçlar
- Çift kayıt uygulama hatasıyla değil, veritabanı kısıtıyla engellenir. Cron'un "en az bir kez" garantisi yeterli hale gelir; "tam bir kez" garantisi aranmaz.
- Şablon düzenlemek geçmiş kayıtları etkilemez — doğru davranış: geçen ayın kirası değişmez.
- `periodKey` üretim kuralı servis katmanında tek bir yardımcıda toplanır ve birim testi yazılır (§9 "hesaplama içeren her fonksiyon test edilir").
- Bir dönem bilerek atlanmak istenirse `lastGeneratedAt` ileri alınır; ek alan gerekmez.

### Alternatifler ve neden reddedildi
- **Aynı tabloda `isRecurring` bayrağıyla devam** — §6'nın önerdiği yol; **reddedildi** çünkü şablonu olaydan ayırmıyor, her sorguya filtre borcu yüklüyor ve idempotanslık için doğal bir anahtar bırakmıyor.
- **Idempotanslığı uygulama katmanında kontrol etmek** (`önce sorgula, yoksa ekle`) — **reddedildi** çünkü eşzamanlı iki çalıştırmada yarış koşuluna açık; veritabanı kısıtı bu sınıf hatayı tamamen kapatır.
- **Tekrarlayan işlemleri hiç üretmemek, sorgu anında hesaplamak** — **reddedildi** çünkü gerçekleşmemiş bir ödeme ile gerçekleşmiş bir ödeme muhasebede aynı şey değildir; kayıt üretmek doğru modeldir.

---

## ADR-016 — Gün Semantiği `@db.Date`, Tek Zaman Dilimi Yardımcısı

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A6

### Bağlam
`HealthLog.date`, `HabitLog.date`, `Transaction.date`, `Workout.date`, `JournalEntry.date`
"gün" semantiği taşıyor — saat bilgisi anlamsız. `DateTime` olarak tutulursa Europe/Istanbul
(UTC+3) altında **00:00–03:00 arasında girilen kayıtlar bir önceki güne düşer**.

Somut sonuçları: `HealthLog.date` unique kısıtı beklenmedik biçimde çakışır ya da çakışmaz;
gece 01:00'de girilen bir alışkanlık kaydı önceki güne yazılır ve streak hesabı bozulur;
§9'un test edilmesini istediği "aylık toplam" ay sınırında yanlış sonuç verir. Bu hatalar
gündüz test edildiğinde **hiç görünmez** — en kötü hata sınıfı.

### Karar
Gün semantiği taşıyan tüm alanlar **`@db.Date`** olur (saat bileşeni yok).
Gerçek bir zaman damgası gereken alanlar (`createdAt`, `paidAt`, `deliveredAt`, `lastLoginAt`,
`publishedAt`) `DateTime` kalır — bunlar an bildirir, gün değil.

Gün bazlı tüm hesaplamalar (ay başı/sonu, hafta başlangıcı, streak, "bugün") **tek bir
zaman dilimi yardımcısından** geçer, sabit `Europe/Istanbul`.

> **Konum revizyonu (2026-08-10, T-015/K1):** Yardımcı `src/server/services/_shared/app-date.ts`
> içinde uygulandı — `src/lib/utils/date.ts` değil. Gerekçe: gün hesabı bugün yalnızca sunucu
> tarafında kullanılıyor ve `src/lib/utils/` Frontend'in dizini. İçerik ve davranış bu ADR'ye
> birebir uyuyor.
> **Bağlayıcı kural:** Frontend **kendi gün yardımcısını yazmaz.** Tarih seçici veya "bugün"
> gibi bir ihtiyaç doğarsa yardımcı ortak bir konuma (`src/lib/utils/date.ts`) taşınır ve iki
> taraf da oradan içe aktarır. İki ayrı uygulama, bu ADR'nin önlemek için var olduğu hatanın
> ta kendisidir.
Servislerde doğrudan `new Date()` ile gün hesabı yapılmaz. Bu yardımcı birim testi yazılan
ilk fonksiyonlardan biridir ve testler **ay sınırı, yıl sınırı ve 00:00–03:00 aralığını**
açıkça kapsar.

### Sonuçlar
- Sınıf olarak bir hata ailesi kapanır; üstelik F1'de, veri birikmeden.
- `HealthLog.date` üzerindeki unique kısıt artık gerçekten "günde bir kayıt" anlamına gelir.
- Yardımcı tek nokta olduğu için yaz saati veya zaman dilimi değişikliği tek yerden ele alınır.
- Maliyet: her gün bazlı sorguda yardımcıyı kullanma disiplini. Kod incelemesinde ve §9 testlerinde denetlenir.

### Alternatifler ve neden reddedildi
- **`DateTime` bırakıp saati 00:00'a normalize etmek** — **reddedildi** çünkü normalizasyonu **hangi** zaman diliminde yaptığın sorusu duruyor; veritabanı tipiyle garanti edilen bir şeyi uygulama disiplinine bırakmak, unutulmaya açık.
- **Her şeyi UTC'de tutup görüntülemede çevirmek** — Yaygın bir yaklaşım; **reddedildi** çünkü "gün" burada bir an değil, kullanıcının yaşadığı takvim günü. UTC'ye çevirmek sorunun kendisini üretiyor.
- **Zaman dilimini kullanıcı ayarı yapmak** — **reddedildi**: tek kullanıcılı sistem, sabit tek zaman dilimi (§1.2 çoklu kullanıcıyı kapsam dışı bırakıyor).

---

## ADR-017 — İlişki ve Bütünlük Düzeltmeleri; `Job.status` ↔ Kanban Eşlemesi

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** B1, B2, B6, B7, C5, C8

### Bağlam
Backend altı ayrı bütünlük açığı buldu. Ortak noktaları: hepsi veri birikmeden düzeltilirse
bedava, biriktikten sonra veri temizliği gerektirir.

### Karar

**B1 — Çift yönlü FK tek yöne indirilir.** `ContactMessage.convertedJobId` **kaldırılır**;
yalnızca `Job.contactMessageId String? @unique` kalır. İki nullable FK, birbirini
göstermeyen iki kayıt üretebilir ve hangisinin doğru olduğu belirsizleşir. Ters yön ilişki
üzerinden okunur.

**B2 — `Client.email String? @unique`.** §6 "mesajdan müşteri kaydı otomatik açılır" diyor;
dedupe olmadan aynı kişi üç kez yazarsa üç müşteri oluşur ve müşteri bazlı muhasebe bozulur.
Otomatik açma akışı **upsert** ile çalışır.

**B6 — Referans verilerde silme yasak, arşivleme var.** `TransactionCategory`, `Exercise`,
`Client`, `Habit` şu alanı kazanır: `isArchived Boolean @default(false)`. Bağlı FK'ler
`onDelete: Restrict`. **Muhasebe kayıtlarında hard delete hiçbir koşulda yapılmaz.**
Panelde "sil" eylemi arşivler; arşivlenmiş kayıt yeni seçim listelerinde görünmez, geçmiş
kayıtlarda görünmeye devam eder.

**B7 — Beş kolonlu kanban (kullanıcı onayı ile).** `Job.status` enum'u §6'daki gibi kalır:
`LEAD` · `PROPOSAL` · `ACTIVE` · `DELIVERED` · `CANCELLED`. Panoda **beşi de kolondur**:
Aday → Teklif → Aktif → Teslim → İptal. §4.2'deki üç kolonlu tarif bu karara göre güncellenir.
Enum ile kolon arasında eşleme katmanı **yoktur** — enum değeri kolonun kendisidir.
Mobilde pano yatay kaydırılır.

**C5 — İndeks ve unique politikası.** Asgari set T-010'da yazılır:
`Post.slug @unique` · `Project.slug @unique` · `@@index([status, publishedAt])` ·
`Transaction: @@index([date, type])`, `@@index([jobId])`, `@@index([categoryId])` ·
`Attachment: @@index([entity, entityId])` · `HabitLog: @@unique([habitId, date])` ·
`WorkoutSet: @@unique([workoutId, exerciseId, setNo])` · `LoginAttempt: @@index([ip, createdAt])`.
`HabitLog` üzerindeki unique **eksikti** — şu hâliyle aynı güne çift kayıt mümkündü.

**C8 — `Profile` tekilliği.** Sabit `id: "singleton"` + `upsert`. İki `Profile` satırı
oluşabilmesi, public tarafın hangisini göstereceğini belirsiz bırakırdı.

### Sonuçlar
- Belirsiz durumlar veritabanı düzeyinde imkânsız hale gelir; uygulama mantığına güven azalır — istenen budur.
- `onDelete: Restrict` panelde "silinemiyor" hatası üretebilir; bu yüzden arşivleme akışı **T-040/T-041'de UI olarak** karşılanmalı, yoksa kullanıcı çıkmaza düşer. Görev kartlarına kriter olarak yazılacak.
- PROGRAM.md §4.2 ve §6 bu kararlara göre güncellenir.

### Alternatifler ve neden reddedildi
- **Çift yönlü FK'yi tutup uygulama katmanında senkron tutmak** — **reddedildi**: iki kaydın tutarlılığını her yazma yolunda garanti etmek gerekir; biri unutulur.
- **Soft delete yerine hard delete + `onDelete: SetNull`** — **reddedildi** çünkü geçmiş bir işlemin kategorisinin `null`'a düşmesi muhasebe raporunu sessizce bozar.
- **Üç kolonlu kanban (§4.2'ye sadık)** — **reddedildi** (kullanıcı kararı): `LEAD` ve `CANCELLED` için kalıcı bir eşleme katmanı gerekirdi ve iptal edilen işler gözden kaybolurdu.

---

## ADR-018 — Dosya Yönetimi: URL Saklanmaz, `Attachment` Tek Mekanizma

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** B3, B4, B5

### Bağlam
**B4 en ciddisi:** `Attachment.url` alanı §8.11 ile doğrudan çelişiyor. §8.11 private bucket
ve 15 dakikalık imzalı URL istiyor. Kalıcı bir `url` sütunu ya **yanlıştır** (süresi dolmuş,
çalışmaz) ya da **tehlikelidir** (public URL saklanmış demektir, yani bucket private değil).
İkisi de kabul edilemez.

**B3:** İki dosya mekanizması yan yana duruyor — `Attachment.entity/entityId` polimorfik ve
`Transaction.attachmentId` gerçek FK. Ayrıca bir işleme genelde birden çok belge iliştirilir
(fatura + dekont); tekil FK yetersiz.

**B5:** `coverUrl`, `avatarUrl`, `cvUrl`, `gallery` düz string. Dosya silindiğinde kırık
link oluşur, kullanılmayan dosya tespiti imkânsız. `Project.gallery` tipi hiç tanımlı değil.

### Karar
**URL saklanmaz.** `Attachment.url` **kaldırılır**. Saklanan: `key String @unique` (R2 nesne
anahtarı), `mime`, `size`, `checksum` (§8.23 bütünlük doğrulaması aynı mekanizmayı kullanır),
`width Int?` / `height Int?` (görsel için — Frontend'in `next/image` ile CLS'i önlemesi
şart, §5.2.3), `uploadedById`, `entity`, `entityId`.
İmzalı URL **istek anında** anahtardan üretilir, TTL 15 dk (§8.11).

**Tek mekanizma:** `Transaction.attachmentId` **kaldırılır**. Tüm ekler polimorfik
`Attachment` üzerinden bağlanır, `@@index([entity, entityId])` ile. Bir işleme birden çok
belge iliştirilebilir. Yetim dosyalar için gece temizlik işi (§13.5 cron'una eklenir).

**Kapak görselleri FK kazanır:** `Project.coverAttachmentId`, `Post.coverAttachmentId`,
`Profile.avatarAttachmentId`, `Profile.cvAttachmentId` — hepsi `onDelete: Restrict`.
Kullanılan bir dosya silinemez. `Project.gallery` **ilişkidir**, scalar değil: polimorfik
`Attachment` kayıtları `entity: "Project"` ile bağlanır ve `order` alanıyla sıralanır.

### Sonuçlar
- §8.11 yapısal olarak sağlanır: saklanan hiçbir şey doğrudan erişim vermiyor.
- Kırık link sınıfı hata kapanır (`Restrict`), yetim dosya tespiti mümkün hale gelir (`key` unique + entity indeksi).
- `width`/`height` saklanması Frontend'in CLS borcunu ortadan kaldırır — §5.2.3 "CLS oluşturmaları yasak" kuralı için gerçek bir dayanak.
- **Maliyet:** her görsel gösteriminde imzalı URL üretimi gerekir. Public sayfalarda bu, ADR-011'in önbellekleme katmanıyla birlikte düşünülmeli — imzalı URL'nin TTL'i önbellek süresinden kısaysa bozuk görsel çıkar. **T-037'nin kabul kriteri olarak yazılacak.**
- Polimorfik ilişkide FK yok; bütünlük uygulama katmanında korunur. Kabul edilen takas — alternatifi her varlık için ayrı ek tablosu.

### Alternatifler ve neden reddedildi
- **`url` alanını tutup imzalı URL'yi oraya yazmak** — **reddedildi**: 15 dakikada bayatlar; saklamak anlamsız.
- **Her varlık için ayrı ek tablosu** (`ProjectAttachment`, `TransactionAttachment`…) — Gerçek FK ve cascade verirdi; **reddedildi** çünkü §6'daki varlık sayısıyla çarpılınca şema şişer ve her yeni varlık yeni tablo gerektirir.
- **`gallery`'yi `String[]` bırakmak** — **reddedildi**: dosya yaşam döngüsünün dışında kalır, silinen görsel sessizce kırılır.

---

## ADR-019 — İçerik Modeli: `locale`, Yayın Durumu, `viewCount`, Etiketler

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C1, C2, C3, C4

### Bağlam
Dört kalem de "şimdi ucuz, sonra pahalı" sınıfında — ama biri bilinçli olarak **ertelenmeye**
değer, bu yüzden dördü birlikte ele alınıyor.

### Karar

**C1 — `locale` şimdi eklenir.** §1.2 "v1 sadece TR, ama **i18n altyapısı hazır bırakılır**"
diyor. İçerik modelleri (`Project`, `Post`, `Experience`, `Service`, `Skill`, `Profile`)
`locale String @default("tr")` alır; slug kısıtları `@@unique([slug, locale])` olur.
Sonradan eklemek migration + **tüm sorguların** değişmesi demek; şimdi eklemek neredeyse bedava.

**C4 — Yayın durumu genişletilir.** `status` enum'u: `DRAFT` · `SCHEDULED` · `PUBLISHED` ·
`ARCHIVED`. `SCHEDULED` ileri tarihli yayın için (`publishedAt` gelecekte), `ARCHIVED`
yayından kaldırma için — **slug korunur ve `410 Gone` döner**, `404` değil. Sitemap ve RSS
yalnızca `PUBLISHED` **ve** `publishedAt <= now()` olanları içerir.

**C3 — `viewCount` ayrılır.** Doğrudan sütun her görüntülemede `UPDATE` demek; bu hem
write amplification yaratır hem ADR-011'in önbellek katmanıyla çelişir (her okuma bir yazma
tetiklerse önbelleğin anlamı kalmaz). Sayaç ayrı bir modele taşınır (`PostView` veya
periyodik toplama); `Post.viewCount` **türetilmiş** okunur. Uygulama F3'e (T-035) bırakılır —
v1'de sayaç olmaması kabul edilebilir, yanlış mimari kurmak değil.

**C2 — Etiketler v1'de scalar kalır.** `tags String[]` §6'daki gibi durur. Gerekçe: §4.1
yalnızca **etiket filtresi** istiyor, etiket sayfası veya etiket yönetimi istemiyor (§1.2
kapsamı dar tutuyor). Normalize `Tag` modeli yeniden adlandırma ve sayım kazandırırdı ama
v1'de karşılığı olmayan bir karmaşıklık. **Takas açıkça kabul edilmiştir:** etiket yeniden
adlandırmak toplu `update` gerektirir. Etiket sayfası (`/blog/etiket/[slug]`) istenirse
ADR yeniden açılır ve `Tag` modeline geçilir.

### Sonuçlar
- `locale` bugün hiçbir şey yapmıyor ama gelecekteki en pahalı migration'lardan birini bugünden ucuzlatıyor.
- `ARCHIVED` + `410` SEO açısından doğru davranış: arama motoruna "bu içerik kalıcı olarak kaldırıldı" der; `404` "bulunamadı, belki geri gelir" der.
- `SCHEDULED` yayın için gece cron'una bir iş daha eklenir (§13.5) veya sorgu anında `publishedAt <= now()` ile çözülür — **sorgu anında çözmek tercih edilir**, cron gerektirmez.
- `viewCount`'un F3'e ertelenmesi, F2'de public blog sayfasında görüntüleme sayısı **gösterilmeyeceği** anlamına gelir. Bilinçli.

### Alternatifler ve neden reddedildi
- **`locale`'i sonraya bırakmak** — **reddedildi**: §1.2 zaten altyapının hazır bırakılmasını istiyor ve maliyeti bugün sıfıra yakın.
- **`Tag` modelini şimdi kurmak** — Yeniden adlandırma ve sayım kazandırırdı; **reddedildi** çünkü v1'de bunları kullanacak bir ekran yok ve her yazı/proje sorgusuna bir join ekler.
- **`viewCount`'u sütun olarak tutup periyodik yazmak** — **reddedildi**: yine de her okumada bir sayaç artırımı gerekir; asıl sorun yazma değil, okuma yolunun yazma yapması.

---

## ADR-020 — Enum Sözleşmesi ve `AuditLog` Redaksiyonu

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C9, C10, C11

### Bağlam
**C9:** `Transaction.method`, `Goal.status`, `Goal.category`, `Workout.feeling`,
`HealthLog.mood`, `Experience.type`, `Skill.category` — string mi enum mu belirsiz. §7.3
bunların Frontend'in tükettiği sözleşme olduğunu söylüyor; sonradan değişmesi migration **ve**
Frontend kırılması demek.

**C10:** `AuditLog.diff` Json alanı `ContactMessage` mutasyonunda **ham e-postayı** taşır.
§8.20 "loglarda tam e-posta ASLA görünmez" diyor — yani mevcut tasarım §8.20'yi ihlal ediyor.
Ayrıca `actorId` FK'sinin silme davranışı ve IP saklama süresi (KVKK) tanımsız.

**C11:** `ContactMessage`'da `repliedAt`, `archivedAt`, `honeypotHit`, `spamScore` yok —
"mesaj kutusu" (§4.2) bunlarsız yalnızca okundu/okunmadı olur.

### Karar

**C9 — Hepsi enum, T-010'da tanımlanır.** Serbest metin bırakılan hiçbir kategorik alan
kalmaz. `Transaction.method`: `CASH` · `BANK_TRANSFER` · `CREDIT_CARD` · `OTHER`.
`Goal.status`: `ACTIVE` · `PAUSED` · `ACHIEVED` · `ABANDONED`. `Experience.type`:
`WORK` · `EDUCATION` (§6'da zaten var). `Workout.feeling` ve `HealthLog.mood`: 1–5 **`Int`**
kalır (ölçek, kategori değil) ama Zod şemasında `min(1).max(5)` ile bağlanır.
`Skill.category` ve `Goal.category` enum olur; değerleri T-010'da Backend önerir, sözleşme
olarak raporlanır. **Enum değerleri Backend mülkiyetindedir ve raporda açıkça yayınlanır** (§7.3).

**C10 — Redaksiyon servis katmanında zorunlu.** `AuditLog` yazan tek bir yardımcı olur ve
`diff` alanı **alan adı bazlı redaksiyondan** geçer: `password`, `passwordHash`, `totpSecret`,
`totpBackupCodes`, `token`, `email` → maskelenir (`email` için yalnızca alan adı ve
`emailHash` tutulur). `actorId` `onDelete: SetNull` + `actorEmailHash` snapshot.
IP kayıtları **90 gün** sonra gece işiyle temizlenir; `AuditLog`'un kendisi korunur.
Redaksiyon yardımcısı §9 gereği birim testi yazılan fonksiyonlardan biridir ve testleri
**her maskelenecek alan adı için** ayrı assert içerir.

**C11 — İş akışı alanları eklenir.** `ContactMessage`: `repliedAt DateTime?`,
`archivedAt DateTime?`, `honeypotHit Boolean @default(false)`, `spamScore Int?`.
`honeypotHit` §8.15'in honeypot alanının sonucunu saklar — spam olarak işaretlenen mesaj
silinmez, ayrılır.

### Sonuçlar
- Frontend, enum değerlerini rapordan okuyarak kırılmadan entegre olur; §7.3'ün amacı korunur.
- §8.20 ihlali F1'de, ilk `AuditLog` yazılmadan kapanır — sonradan düzeltmek geçmiş logları temizlemeyi gerektirirdi.
- Redaksiyon tek noktada olduğu için Güvenlik ajanı denetlerken tek dosyaya bakar.
- Maliyet: enum değişikliği migration gerektirir. Bu yüzden T-010'da değerler dikkatle seçilmeli; "diğer" değeri olan enum'lara `OTHER` eklenmiştir.

### Alternatifler ve neden reddedildi
- **Kategorik alanları `String` bırakmak** — Esnek görünür; **reddedildi** çünkü yazım hatası veri kalitesini sessizce bozar ve Frontend'in hangi değerleri bekleyeceği hiçbir zaman netleşmez.
- **Redaksiyonu log yazarken değil, okurken yapmak** — **reddedildi**: hassas veri diske yazılmış olur; yedeğe (§8.21) de girer.
- **Spam mesajları silmek** — **reddedildi**: yanlış pozitif durumunda gerçek bir müşteri kaybedilir; ayırmak yeterli.

---

## ADR-021 — Spor & Hayat: PR Tekrar Bazında, `Habit` Sayaç Tabanlı

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C6, C7

### Bağlam
**C6:** `PersonalRecord` türetilmiş bir veri ama kaynağı yok — `workoutSetId` referansı
olmadığı için antrenman silinince veya düzeltilince PR tutarsız kalır. Daha temel sorun:
**PR tanımı yok.** 100kg×1 mi 80kg×10 mu daha iyi? §9 bu hesabın test edilmesini istiyor
ama test edilecek kural tanımlı değil.

**C7:** `Habit.targetPerWeek` haftalık, `HabitLog.done` günlük **Boolean**. Günde birden çok
kez yapılan alışkanlıklar (su içmek, kitap okumak) modellenemiyor.

### Karar

**C6 — Tekrar bazında ayrı PR (kullanıcı onayı ile).** Her tekrar sayısı için ayrı rekor
tutulur: `@@unique([exerciseId, reps])`. Yani 1RM, 3RM, 5RM, 10RM ayrı ayrı izlenir.
Tahmini 1RM formülü (Epley/Brzycki) **kullanılmaz** — karşılaştırma tahmine değil gerçek
performansa dayanır.

`PersonalRecord` kaynağına bağlanır: `workoutSetId String? @unique`, `onDelete: SetNull`.
PR **türetilmiş** veridir: bir `WorkoutSet` eklendiğinde/düzeltildiğinde/silindiğinde ilgili
`(exerciseId, reps)` için yeniden hesaplanır. Hesaplayıcı servis katmanında tek bir
fonksiyondur ve §9 gereği birim testi yazılır — testler **silme ve düzeltme** senaryolarını
da kapsar, yalnızca ekleme değil.

**C7 — `HabitLog.count Int @default(1)`.** `done Boolean` kaldırılır; "yapıldı" artık
`count > 0` demektir. `Habit.targetPerDay Int?` eklenir (günlük hedefi olanlar için,
örn. 8 bardak su); `targetPerWeek` korunur (haftada kaç gün). Hafta başlangıcı ve streak
hesabı **ADR-016'nın zaman dilimi yardımcısından** geçer — aksi hâlde gece yarısı girilen
kayıt streak'i sessizce kırar.

### Sonuçlar
- PR karşılaştırması dürüst: "80kg×10 yaptım" bir 1RM tahminine çevrilmeden kendi kategorisinde değerlendirilir.
- PR'ın türetilmiş olduğu açıkça kabul edildiği için kaynak veri düzeltildiğinde tutarsızlık kalmaz — F5'in en olası sessiz hatası kapanır.
- `count` modeli hem Boolean hem sayaç ihtiyacını karşılar; Boolean'a dönmek gerekirse `count > 0` yeterli.
- Maliyet: PR yeniden hesaplama her set mutasyonunda tetiklenir. Tek kullanıcılı sistemde ihmal edilebilir.

### Alternatifler ve neden reddedildi
- **Tahmini 1RM (Epley)** — Tek bir güç eğrisi ve güzel bir trend grafiği verirdi; **reddedildi** (kullanıcı kararı) çünkü yüksek tekrarlarda tahmin belirgin sapar ve "rekor" olması gereken şey tahmine dönüşür.
- **İkisini birden saklamak** — En zengin veri; **reddedildi** çünkü iki hesaplayıcı, iki test seti ve iki kez bozulma ihtimali demek. Gerekirse tahmini 1RM sonradan **türetilerek** gösterilebilir, saklanması gerekmiyor.
- **`PersonalRecord`'u hiç saklamayıp sorgu anında hesaplamak** — **reddedildi**: PR tarihi ("ne zaman kırdın") kayıt gerektirir, ayrıca her grafik için tüm set geçmişini taramak gerekirdi.

---

## ADR-022 — `LoginAttempt` Denemeleri, `AuditLog` Sonuçları Kaydeder

**Durum:** Kabul edildi · 2026-08-05 · **Tetikleyen:** T-013b notu T5

### Bağlam
`AuditAction` enum'unda `LOGIN`, `LOGIN_FAILED`, `LOGOUT` değerleri var (T-010) ama T-013b
giriş olaylarını `AuditLog`'a yazmadı ve haklı bir soru sordu: §8.19 "tüm panel mutasyonları
loglanır" diyor; giriş bir panel mutasyonu mu?

İki tablo arasında gerçek bir örtüşme var. Yanlış cevap iki yönde de maliyetli:
- **İkisine de yazmak** → aynı olay iki yerde tutulur; §6'nın "aynı veri iki yere girilmez"
  ilkesiyle çelişir ve iki kayıt er geç birbirini tutmaz.
- **Hiçbirine yazmamak** → `LoginAttempt` 90 günde temizleniyor (ADR-013). Hesap kilitlenmesi
  gibi güvenlik açısından kalıcı olması gereken bir olay o pencerede kaybolur.

### Karar
Sınır **olay ile durum değişikliği** arasına çizilir:

| Tablo | Ne kaydeder | Saklama |
|-------|-------------|---------|
| `LoginAttempt` | Her giriş **denemesi** — başarılı ve başarısız. Hız sınırlamanın veri kaynağı | 90 gün, sonra temizlenir |
| `AuditLog` | Denemenin yol açtığı **kalıcı durum değişikliği** | Süresiz |

`AuditLog`'a yazılacak giriş kaynaklı olaylar: **hesap kilitlenmesi** (`lockedUntil` yazıldığında),
**şifre değişikliği**, **2FA etkinleştirme/devre dışı bırakma**, **kurtarma kodlarının
yeniden üretilmesi**. Bunlar `User` kaydını değiştirdiği için zaten §8.19'un kapsamındadır.

Başarılı ve başarısız **denemeler** `AuditLog`'a yazılmaz. `LOGIN` ve `LOGIN_FAILED` enum
değerleri korunur ama v1'de kullanılmaz; kaldırmak migration gerektirir ve F6 denetimi
(T-062) aksini kararlaştırırsa yeniden eklemek gerekirdi.

Kilitlenme kaydını yazmak **T-014'ün** işidir — `lockedUntil`'i yazan taraf orasıdır (ADR-013).

### Sonuçlar
- Her olay tek yerde; iki kaydın çelişmesi mümkün değil.
- Kalıcı olması gereken güvenlik olayları 90 günlük temizlikten etkilenmiyor.
- Kural tek cümleyle ifade edilebilir: **denemeler `LoginAttempt`'e, sonuçlar `AuditLog`'a.** Sonraki ajanların hatırlaması kolay.
- `LOGIN`/`LOGIN_FAILED` kullanılmayan enum değerleri olarak kalıyor — küçük bir koku, kabul edildi.

### Alternatifler ve neden reddedildi
- **Her giriş denemesini `AuditLog`'a da yazmak** — En eksiksiz iz; **reddedildi** çünkü aynı olayı iki yerde tutar ve `AuditLog` tek kullanıcılı bir sistemde hızla giriş gürültüsüyle dolar; asıl amacı olan içerik ve muhasebe mutasyonlarını okunamaz hale getirir.
- **`LoginAttempt`'i hiç temizlememek** — Tek tablo yeterdi; **reddedildi** çünkü IP kayıtlarının süresiz tutulması KVKK açısından gereksiz veri saklamaktır (ADR-020 ile aynı gerekçe).
- **`LOGIN`/`LOGIN_FAILED` enum değerlerini kaldırmak** — Temizlik olurdu; **reddedildi** çünkü migration maliyeti var ve T-062 denetimi bu kararı gözden geçirebilir.

---

## ADR-023 — Ölçüm Görevleri Tek Başına Koşar (Paralel Derleme Yasağı)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-017 → ENGEL-4, T-014 → T5, T-012 → BULGU-006'nın yanlış pozitif çıkması

### Bağlam
ADR-012 ile paralel çalışmayı açtım ve üç ajan aynı anda koştu. Dosya kesişimi olmadı —
ama **paylaşılan çalışma ağacı** üzerinden üç ayrı sorun çıktı:

1. **T-017:** Doğrulama sırasında sunucu üç kez "Could not find a production build" ile öldü;
   `/giris` bir ara 404 verdi. Kod hatası değil, yarış durumu — başka bir ajan aynı anda
   `pnpm build` çalıştırıp `.next`'i siliyordu. Bir Lighthouse koşusunu da düşürdü.
2. **T-014:** `pnpm build` üç temiz derlemede bir `ENOENT .next/server/pages-manifest.json`
   veriyor. CI'da (Linux, izole) hiç görülmedi.
3. **T-014 → BULGU-006:** `prisma/seed.ts`'in 22 `no-console` uyarısı üretip CI'ı düşüreceği
   bildirildi. **Doğrulandı: `pnpm lint` şu an EXIT 0.** Backend aynı sorunu kendi turunda
   K6 ile (`process.stdout.write`) zaten çözmüştü; Güvenlik ajanı **bayat bir ağaç durumunu**
   ölçmüştü. Yani paralellik yalnızca koşumları düşürmüyor, **var olmayan bulgu da ürettiriyor.**

Üçünün ortak kökü aynı: `.next/` tek ve paylaşımlı; `pnpm build`, `pnpm start`, `test:e2e`
ve Lighthouse hepsi onu yazıyor veya okuyor.

### Karar
Paralel çalışma **korunur** (ADR-012 geçerli), ancak **ölçüm görevleri tek başına koşar.**

**Ölçüm görevi (rev. 2026-08-10):** `pnpm build` veya `pnpm start` **çalıştırmayı
gerektiren** her görev. Ölçüt mekaniktir, Orkestra Şefi'nin takdirine bırakılmaz.

> **İkinci revizyon (2026-08-12, T-021/ENGEL-4 — üçüncü tekrar):** Ölçüm görevinin *kendisi*
> yalnız koşmak yetmiyor. Backend'in T-030'u paralel çalışırken bir `typecheck` koşumu yarım
> yazılmış dosya yüzünden kırıldı ve bir Lighthouse turu bayat/dev derleme ölçüp
> **perf 46–62, TBT 2.490 ms** gibi anlamsız rakamlar verdi (`unminified-javascript` uyarısı
> ele verdi). Kural genişletildi: **bir ölçüm görevi koşarken hiçbir ajan `pnpm build`
> üretmez** — kendi görevi ölçüm olmasa bile. Derleme üreten her ajan, ölçüm görevi
> dağıtılmadan önce işini bitirmiş veya commit'lemiş olmalıdır.
>
> **Neden ilk kez revize edilmişti:** T-036'yı "ölçüm görevi değil" diye işaretledim çünkü E2E veya
> Lighthouse istemiyordu. Ama tarayıcıda doğrulama gerektiriyordu, yani `pnpm start`
> çalıştırdı ve T-015 ile aynı yarışa girdi — sunucu iki kez bayat `.next` servis etti.
> Frontend haklı olarak ölçütün "build/start gerektiriyor mu" olması gerektiğini söyledi.
> **Bir görev tarayıcıda elle doğrulama istiyorsa ölçüm görevidir.**

Kurallar:
1. Orkestra Şefi aynı anda **en fazla bir** ölçüm görevi dağıtır; diğer paralel görevler
   ölçüm gerektirmeyenlerden seçilir.
2. Ölçüm görevi dağıtıldığında görev kartında **"ÖLÇÜM GÖREVİ — tek başına koşar"** ibaresi bulunur.
3. Bir ajan beklenmedik bir derleme/sunucu hatası görürse **önce paralel koşum olup
   olmadığını sorar**, sonra bulgu açar. `.next` kaynaklı `ENOENT` ve "production build
   not found" hataları varsayılan olarak yarış durumu sayılır.
4. **Bulgu açmadan önce ağacın güncelliği doğrulanır.** Başka bir ajanın alanındaki bir
   kusur raporlanacaksa, ölçüm o anki dosya içeriğiyle tekrarlanır — BULGU-006 bu adım
   atlandığı için açıldı.

### Sonuçlar
- **Olumlu:** Ölçüm sonuçları güvenilir hale gelir. Yanlış pozitif bulgular — ki en pahalı türdendir, çünkü gerçek bir ajanın gerçek zamanını harcatır — büyük ölçüde önlenir.
- **Olumsuz / kabul edilen maliyet:** Paralellik daralır. F2'de Lighthouse ve E2E görevleri sıraya girer, bu da fazın toplam süresini uzatır. Kabul edildi: yanlış ölçüm, yavaş ölçümden pahalı.
- macOS'a özgü `ENOENT` (T-014/T5) bu kuralla büyük ölçüde kaybolmalı; kaybolmazsa gerçek bir sorun olarak yeniden açılır — şimdi ayırt edilebilir hale geldi.

### Alternatifler ve neden reddedildi
- **Her ajana ayrı git worktree / ayrı `.next`** — Sorunu kökten çözerdi; **reddedildi** çünkü ajanlar aynı çalışma dizinini paylaşan ayrı oturumlar olarak kurgulandı (AJAN_PROMPTLARI.md) ve worktree yönetimi kullanıcıya günlük yük bindirirdi.
- **Paralelliği tamamen kapatmak** — En basit; **reddedildi** çünkü ADR-012'nin çözdüğü sorun (bir ajanın kendisini ilgilendirmeyen bir kararı beklemesi) geri gelirdi. Sorun paralellik değil, paylaşılan `.next`.
- **`.next` yerine ajan başına dizin (`distDir`)** — `next.config.ts` ortak dosya; her ajanın onu değiştirmesi gerekirdi ve CI ile üretim yapılandırması da ayrışırdı.

---

## ADR-024 — Kendi QR Kodlayıcımız (Dar Kapsam, Kalıcı Doğrulama Şartıyla)

**Durum:** Kabul edildi · 2026-08-10 · **Tetikleyen:** T-036/K1

### Bağlam
2FA kurulum ekranı QR kod gerektiriyor. ADR-004 yeni bağımlılığı Orkestra Şefi onayına
bağlıyor; görev kartı da "kütüphane gerekiyorsa **talep et**, kurma" diyordu. Frontend
talep etmek yerine kodlayıcıyı kendisi yazdı — gerekçesi: onay turu F1'i bir ADR boyunca
bloke ederdi ve QR bu ekranın ana gereksinimi.

Kapsam bilinçle dar tutulmuş: yalnızca bayt kipi, EC seviyesi M, sürüm 1–14
(`otpauth://` URI'leri ~90–160 bayt). Genel amaçlı bir kütüphane değil.

Doğrulama ciddi yapılmış: v1–14 kapasite tabloları referansla karşılaştırılmış (14/14),
1080 rastgele matris bit-bit kıyaslanmış, çizilen görüntü **bağımsız bir çözücüyle (jsQR)**
okutulmuş. Bu sırada **iki gerçek kodlayıcı hatası** bulunmuş; ikisi de gözle fark edilemezdi:

1. Format bilgisinin birinci kopyası satır 8 yerine sütun 8'e yazılmalıydı.
2. Reed–Solomon üreteç polinomunun katsayı sırası tersti — EC kod sözcükleri sessizce
   bozuluyordu. Çıktı "geçerli bir QR" gibi görünüyor ama hiçbir okuyucu çözemiyordu.

### Karar
Kendi kodlayıcımız **kalınır**, iki şartla:

1. **Doğrulama kalıcı hale getirilir.** 1080 matrislik karşılaştırma geçici bir sayfayla
   yapıldı ve o sayfa silindi — yani doğrulama **tekrarlanabilir değil**. Referans vektörler
   `tests/unit/` altında kalıcı bir teste dönüştürülecek. Bir doğrulama tekrarlanamıyorsa
   yarın için hiçbir şey garanti etmez.
2. **Kapsam genişlerse karar yeniden açılır.** Kodlayıcı yalnızca `otpauth://` URI'leri
   içindir. Başka bir yerde QR gerekirse (paylaşım linki, vCard, ödeme) bu ADR yeniden
   değerlendirilir ve muhtemelen `qrcode` bağımlılığına geçilir.

Gerekçe: bağımlılık eklememenin karşılığı burada gerçek. Blast radius küçük — kodlayıcı
tek ekranda kullanılıyor, girdi biçimi öngörülebilir ve **düz metin secret yedeği zaten var**
(QR okunmazsa kullanıcı anahtarı elle girebiliyor). Buna karşılık, çalışan ve doğrulanmış
kodu söküp yerine bağımlılık koymak saf değişiklik gürültüsü olurdu.

### Sonuçlar
- Bir bağımlılık eksik; §8.24 denetim yüzeyi büyümüyor.
- **Kodlayıcının bakımı bize ait.** Kabul edilen maliyet; dar kapsam bunu yönetilebilir kılıyor.
- 1. şart yerine getirilmezse bu ADR geçersizdir — doğrulanamayan kod, doğrulanmamış koddur.
- T-036'nın gösterdiği bir şey daha var: **kendi yazdığı kodu referansa karşı sınayan bir ajan, kütüphane kullansa hiç öğrenemeyeceği iki hatayı buldu.** Bu, kendi kodumuzu yazmanın yan faydası değil, doğrulamanın faydası.

### Alternatifler ve neden reddedildi
- **`qrcode` bağımlılığı eklemek** — Sıfır bakım, olgun kod; **reddedildi** çünkü çalışan ve bit düzeyinde doğrulanmış bir uygulama zaten var ve sökmek karşılığı olmayan bir değişiklik olurdu. Kapsam genişlerse yeniden değerlendirilecek.
- **Frontend'i durdurup ADR turu yapmak** — Sürece uygun olurdu; **reddedildi** çünkü F1'in tek kalan ekranı bir onay turu boyunca beklerdi ve sonuç muhtemelen aynı olurdu. Ancak bu bir **istisna**, kural değil: bağımlılık kararları normalde Orkestra Şefi'ne gelir.
- **Sunucuda QR üretip görsel olarak göndermek** — Bağımlılığı sunucuya taşırdı; **reddedildi** çünkü secret'ı bir görsel URL'sine taşımak §8.11 ve §8.20 açısından daha kötü.

---

## ADR-025 — React Bits Bağımlılıkları: `ogl` Onaylandı, `gsap` Reddedildi

**Durum:** Kabul edildi · 2026-08-11 · **Tetikleyen:** T-020/ENGEL-1

### Bağlam
React Bits bileşenlerinin 10'u projedeki `framer-motion` ile çalıştı; 6'sı yeni bağımlılık
istedi. Frontend hiçbirini kurmadı (ADR-004) ve **ölçtü** — kararın rakamla verilmesi için:

| Paket | Açtığı | gzip | Kurulmazsa kaybedilen |
|-------|--------|------|----------------------|
| `ogl` | Aurora | **12.8 KB** | Hero'nun WebGL arka planı — §5.1'in tek WebGL hakkı |
| `gsap` + `@gsap/react` | AnimatedContent/ScrollReveal, MagicBento, SplitText, ChromaGrid | **27.4 KB** | Bölüm giriş animasyonları, İletişim bento'su |

Aynı turda T-000'deki kendi uyarısını da düzeltti: "Aurora ~45–50KB, eşiği aşıyor" demişti;
44.3 KB **minify** rakamıymış, gzip'te 12.8 KB. Ayrıca §5.2.6'nın 40KB eşiğinin **gzip**
olarak okunması gerektiğini tespit etti — projenin ve Next'in tüm rakamları gzip.

### Karar

**`ogl` onaylandı (12.8 KB gzip).** Aurora, §5.1'in ana sayfaya tanıdığı **tek WebGL hakkını**
kullanıyor ve hero'nun görsel kimliği. 12.8 KB, §5.2.6'nın eşiğinin üçte biri. Üstelik
§5.2.5 gereği **mobilde ve `prefers-reduced-motion`'da hiç yüklenmiyor** — yani maliyeti
yalnızca masaüstü ve hareket tercihi açık kullanıcılar ödüyor.

**`gsap` reddedildi (27.4 KB gzip).** Açtığı dört bileşenden üçünün karşılığı zaten var:
- Bölüm girişleri → `framer-motion` `whileInView` (bağımlılıksız, ~15 satır)
- `SplitText` → `BlurText` (kuruldu)
- `ChromaGrid` → `TiltedCard` (kuruldu)

Geriye yalnızca **MagicBento** kalıyor. 27.4 KB, tek bir bölüm ızgarası için pahalı.
**İletişim bölümü `SpotlightCard` ızgarasıyla yapılır** — bileşen zaten kurulu ve §5.1
onu "hover'da mor spotlight" için tanımlıyor; bento hissi token'larla kurulabilir.

PROGRAM.md §5.1 bu kararlara göre güncellendi: `TiltedCard`, `BlurText`, `framer-motion
whileInView`, `SpotlightCard` ızgarası.

### Sonuçlar
- **Olumlu:** Tek yeni bağımlılık, 12.8 KB, koşullu yüklenen. Animasyon çalışma zamanı tek (`framer-motion`) — `motion@13` kurulsaydı ikinci bir çalışma zamanı gelirdi (T-020/K1).
- **Olumsuz / kabul edilen:** MagicBento'nun tam görsel karşılığı yok; `SpotlightCard` ızgarası daha sade duracak. §5.1'den bilinçli sapma.
- `ogl` ile birlikte Aurora'nın **en kötü kare kontrast ölçümü zorunlu hale geliyor** (§5.2.7) — arka plan hareket ettiği için ortalama değil, kare kare örnekleme. T-020b'nin kabul kriteri.
- `gsap` kararı geri dönülebilir: MagicBento'nun görsel değeri F2'de somutlaşır ve karşılığı yetersiz görülürse ADR yeniden açılır.

### Alternatifler ve neden reddedildi
- **`ogl`'i de reddedip hero'yu statik gradientle bırakmak** — En az bağımlılık; **reddedildi** çünkü §1.A public tarafın amacını "yetkinliği kanıtlamak" olarak tanımlıyor ve hero o iddianın taşıyıcısı. 12.8 KB, üstelik mobilde hiç yüklenmiyor.
- **`gsap`'i de onaylayıp §5.1'e harfiyen uymak** — Sapma olmazdı; **reddedildi** çünkü 27.4 KB'nin karşılığı tek bir bölüm ızgarası ve diğer üç kullanımın bedelsiz karşılığı var. §5.1 bir harita, dokunulmaz bir sözleşme değil — §5.2'nin sert kuralları (bundle, CLS, hareket tercihi) ondan önce gelir.
- **`motion@13` kurmak** — React Bits'in importları onu istiyordu; **reddedildi** (T-020/K1): `framer-motion`'ın yeni adı, API uyumlu, kurulsa iki çalışma zamanı olurdu.

---

## ADR-026 — F2 Public Sayfaları Gerçek Veriden Okur; İçerik Servisleri Öne Alındı

**Durum:** Kabul edildi · 2026-08-11 · **Tetikleyen:** T-021 öncesi veri kaynağı sorusu

### Bağlam
§11, F2'yi "Ana sayfa, hakkımda, projeler, blog, hizmetler, iletişim — **statik veriyle**"
diye tanımlıyor. Gerekçesi anlaşılır: görsel düzen, performans ve React Bits kurallarını
veri katmanı gürültüsü olmadan oturtmak.

Ama iki şey değişti:

1. **ADR-011 zaten aksini varsayıyor.** Dinamik render kabul edilirken karşılığında
   *"F2'den itibaren public sayfaların veri erişimi açık önbellekleme ile yazılır"*
   şart koşulmuştu. F2 statik veriyle giderse bu şart ölçülemez ve ADR-011'in koruması
   F3'e ertelenir — yani en kritik anda, gerçek veri geldiğinde, hiç sınanmamış olur.
2. **F1 beklenenden fazlasını teslim etti.** Şema, seed (21 varlık, gerçekçi içerik),
   servis konvansiyonu ve sekiz paylaşılan yardımcı hazır. İçerik servisleri (T-030)
   bu konvansiyonun mekanik uygulaması.

Statik veriyle gitmek, F2'nin her sayfasının F3'te veri erişimi için **yeniden yazılması**
demek. Aynı sayfayı iki kez yazmanın karşılığı yok.

### Karar
**F2 public sayfaları gerçek veriden okur.** İçerik servisleri (`Profile`, `Project`,
`Post`, `Experience`, `Skill`, `Service` — eski T-030) **F3'ten F2'ye alınır.**

Frontend'i bloke etmemek için **sözleşme-önce** kalıbı uygulanır — T-036'da bir kez
işe yaradı ve o görevde "eylemler geldiğinde bileşende hiçbir değişiklik gerekmedi":

1. Backend DTO şekillerini **önce yayınlar** (tip olarak, uygulama olmadan)
2. Frontend sayfaları o tiplere karşı yazar; veri geçici bir **fixture**'dan gelir,
   ama fixture **DTO ile aynı şekilde** olmak zorundadır
3. Servisler teslim edilince fixture yerini servis çağrısına bırakır — bölüm başına bir satır

**Panel CRUD ekranları F3'te kalır.** Yani F2 sonunda içerik DB'den geliyor ama henüz
yalnızca seed ile değişiyor; K2 ("panelden yönetilebilirlik") tam olarak F3'te sağlanır.
Değişen, **tesisatın doğru kurulması** — sayfa yeniden yazılmıyor.

### Sonuçlar
- **Olumlu:** Sayfalar bir kez yazılıyor. ADR-011'in önbellekleme şartı F2'de fiilen sınanıyor. `unstable_cache` + `revalidateTag` deseni F3'ün CRUD ekranları gelmeden önce oturuyor.
- **Olumsuz / kabul edilen:** F2 artık Frontend'in tek başına yürüttüğü bir faz değil — Backend de içinde. §11 tablosu buna göre güncellendi. Fixture aşaması bir senkronizasyon noktası: fixture DTO'dan **saparsa** değişim mekanik olmaz. Bu yüzden fixture'ın tipi Backend'in yayınladığı tipten türetilmek zorunda, elle yazılmış bir kopya olamaz.
- F2'nin kabul kapısına yeni madde: **public veri erişimi açık önbelleklemeyle yazılmış olmalı** (ADR-011'in karşılığı).

### Alternatifler ve neden reddedildi
- **§11'e sadık kalıp statik veriyle gitmek** — Faz sırası bozulmazdı; **reddedildi** çünkü her sayfa iki kez yazılırdı ve ADR-011'in koruması hiç sınanmadan F3'e ertelenirdi.
- **F2'yi bekletip önce T-030'u yapmak** — Sözleşme-önce gerektirmezdi; **reddedildi** çünkü Frontend bir tur boşta kalırdı ve ADR-012'nin çözdüğü sorun geri gelirdi.
- **Fixture'ları kalıcı tutup veri bağlamayı F3'e bırakmak** — En az koordinasyon; **reddedildi** çünkü aynı ikiye-yazma sorunu, yalnızca adı değişmiş olur.

---

## ADR-027 — İstatistikler Türetilir, Elle Girilmez

**Durum:** Kabul edildi · 2026-08-12 · **Tetikleyen:** T-021/ENGEL-2 (T-000'den beri açık)

### Bağlam
Ana sayfada §5.1'in `CountUp` ile gösterdiği istatistikler var ("2+ yıl", proje sayısı vb.).
`ProfileDto` böyle bir alan taşımıyor ve soru T-000'den beri cevapsız: bu sayılar nereden
gelecek? İki yol vardı — `Profile`'a `stats Json` eklemek (migration) veya mevcut veriden
türetmek.

Aynı turda Frontend, benzer bir soruyu kendi başına doğru cevaplamıştı: `Skill.level`
yüzdesi DTO'da var ama **gösterilmiyor**, çünkü *"React %87" gibi uydurma kesinlik güven
kaybettirir* (T-021/K6). İstatistikler için de aynı mantık geçerli — hatta daha güçlü:
elle girilen bir "12 proje" sayısı, gerçek proje sayısı 9'a düştüğünde **yalan olur** ve
kimse fark etmez.

### Karar
**İstatistikler mevcut veriden türetilir.** `Profile`'a `stats` alanı **eklenmez**;
şema değişmez.

| Gösterilen | Kaynak |
|------------|--------|
| Deneyim yılı | En erken `Experience.startDate`'ten bugüne |
| Proje sayısı | `PUBLISHED` ve `publishedAt <= now()` olan `Project` sayısı |
| Müşteri / iş sayısı | `Client` veya `DELIVERED` `Job` sayısı (F4'te bağlanır) |

**Kural:** *türetilemeyen bir istatistik sayfada yer almaz.* Bir sayıyı göstermek için
elle girmek gerekiyorsa, o sayı ya gerçek veriden çıkarılabilir hale getirilir ya da
gösterilmez.

Hesaplayıcı `src/server/services/_shared/` altında yaşar ve §9 gereği birim testi yazılır
(sınır durumları: hiç `Experience` yok, hiç yayınlanmış proje yok, yıl dönümü sınırı —
ADR-016'nın zaman dilimi yardımcısı kullanılır).

### Sonuçlar
- **Olumlu:** Sayılar her zaman doğru; bayatlamıyor. Şema değişmiyor, migration yok. `CountUp`'ın gösterdiği şey gerçek bir ölçüm oluyor — §1.A'nın "yetkinliği kanıtlamak" amacıyla tutarlı.
- **Olumsuz / kabul edilen:** Anlatı esnekliği yok — "50+ mutlu müşteri" gibi bir sayı, karşılığı veride yoksa yazılamaz. Bu bir kısıt değil, kararın amacı.
- Müşteri/iş istatistiği F4'e kadar bağlanamaz; o zamana kadar iki istatistik gösterilir. Eksik bir kart göstermek, uydurma bir sayı göstermekten iyidir.
- `Hakkimda` bileşeninin `istatistikler` prop'u kalkar; veri servisten gelir.

### Alternatifler ve neden reddedildi
- **`Profile.stats Json`** — Panelden serbestçe düzenlenebilirdi; **reddedildi** çünkü gerçekle bağı kopuk bir sayı üretir ve bayatladığında sessizce yanlış olur. §8.19'un denetlediği türden bir mutasyon da değil — kimse "istatistik güncellendi" logunu okumaz.
- **Sabit değerler koda gömmek** — En hızlı; **reddedildi**: §1.1 K2 ("public taraftaki her metin kod değişmeden güncellenebilir") ile doğrudan çelişir.
- **Türetilenler + elle girilen karışık** — Esneklik verirdi; **reddedildi** çünkü ziyaretçi hangisinin ölçüm hangisinin iddia olduğunu ayırt edemez; karışım her iki sayının da güvenilirliğini düşürür.

---

## ADR-028 — Dal ve Commit Disiplini: Tur Başına Tek PR, Orkestra Şefi Commit'ler

**Durum:** Kabul edildi · 2026-08-14 · **Tetikleyen:** T-030/E2, T-030b/E1, T-029b/T4 — **üç kez ısırdı**

### Bağlam
§10.5 "her görev kendi dalında" diyor. Bu kural **tek checkout paylaşan paralel ajanlarla
uygulanamıyor** ve üç kez somut zarar verdi:

1. **T-030/E2:** Backend dal açamadı, iş ağaçta kaldı.
2. **T-030b/E1:** Aynı sorun tekrar; Backend dal değiştirse T-029b'nin koşan ölçümünü bozacaktı.
3. **T-029b/T4:** Güvenlik'in dalı Frontend'in gönderilmemiş commit'i üzerine kuruldu;
   push edilince **Frontend'in işi Güvenlik'in dalına gitti**. Ajan bunu fark edip PR açmadı
   ve CI'ı `workflow_dispatch` ile tetikledi — doğru davranış, ama iş akışını tıkadı.

Ayrıca T-020'de Frontend commit'lemeyi unuttu ve iş `main` üzerinde kaldı; T-021'in commit'i
T-029a'nın dalına düştü. Kural, uygulanamadığı için sürekli ihlal ediliyor.

### Karar
**Ajanlar dal açmaz, commit atmaz, push etmez.** Görevlerini bitirir, çalışma ağacında
bırakır ve raporlar. **Orkestra Şefi commit'ler, dallar ve PR açar.**

Kurallar:
1. Bir turda dağıtılan görevler **kesişmeyen dosyalara** dokunur (§10.1 zaten bunu istiyor).
2. Tur bitince Orkestra Şefi işi **tek dalda** toplar ve **tek PR** açar. PR başlığı turu
   tanımlar, gövdesi görevleri ayırır.
3. **Orkestra Şefi PR'ın CI sonucunu görmeden bir sonraki turu dağıtmaz.** BULGU-012 iki
   gün fark edilmedi çünkü bu adım yoktu.
4. Ajanlar `pnpm build`'i yalnızca ölçüm görevindeyse çalıştırır (ADR-023); derleme
   doğrulaması Orkestra Şefi'nde.

§10.5'in "her görev kendi dalında" maddesi **"her tur kendi dalında"** olarak güncellenir.

### Sonuçlar
- **Olumlu:** Dal çakışması yapısal olarak imkânsız. Ajanlar git durumunu düşünmüyor. PR'lar tur bazında anlamlı bir bütün oluşturuyor (F1 böyle merge edildi ve okunabilir bir PR çıktı).
- **Olumsuz / kabul edilen:** Commit granülaritesi kaba — bir PR birden çok görev içerir ve `git bisect` çözünürlüğü düşer. Kabul edildi: paralel ajan akışında alternatifi çalışmayan bir kural.
- **Yeni sorumluluk:** CI sonucunu izlemek Orkestra Şefi'nin turu kapatma adımıdır, isteğe bağlı değil.
- `git worktree` değerlendirildi ve reddedildi (aşağıda); ileride ajanlar ayrı çalışma dizinlerine taşınırsa bu ADR yeniden açılır.

### Alternatifler ve neden reddedildi
- **Ajan başına `git worktree`** — Gerçek izolasyon verirdi; **reddedildi** çünkü AJAN_PROMPTLARI.md ajanları aynı dizini paylaşan ayrı oturumlar olarak kurguluyor ve worktree yönetimi kullanıcıya günlük yük bindirir. `.next/` çakışmasını da çözmez (ADR-023 ayrı sorun).
- **§10.5'i harfiyen uygulamakta ısrar** — **reddedildi**: üç kez denendi, üçünde de kural bozuldu. Uygulanamayan bir kural, disiplin değil gürültü üretir.
- **Ajanlar commit'ler ama push etmez** — Yarı yol; **reddedildi** çünkü asıl çakışma `git checkout` anında oluyor (T-030b/E1), commit'te değil.

---

## ADR-029 — `revalidateTag` Tam Dize Eşleşir; Her Seviye Ayrı Düşürülür

**Durum:** Kabul edildi · 2026-08-14 · **Tetikleyen:** T-030b, Ölçüm 2

### Bağlam
Önbellek etiketleri hiyerarşik **görünen** bir adlandırma kullanıyor:

```
content:project · content:project:tr · content:project:tr:kiyi-medya
```

Backend, Next 15.5.22'nin kaynağını okuyarak eşleşmenin **tam dize** olduğunu ölçtü
(`tags-manifest.external.js:26` — `Map` araması). Yani `revalidateTag('content:project')`
`content:project:tr` taşıyan bir girdiye **dokunmaz**. Hiyerarşi bir isimlendirme kuralı;
geçersizleştirme hiyerarşik değil.

Aynı ölçüm, T-030'da bırakılmış **gerçek bir hatayı** açığa çıkardı: liste okumalarında
`tags` sarmalama anında bir kez hesaplanıyor ve `tr` sabit yazılıyordu. `getSkills('en')`
ayrı bir önbellek girdisine düşüyor ama `content:skill:tr` etiketiyle işaretleniyordu —
yani **İngilizce içerik panelden düzenlenir, kaydedilir, sitede değişmezdi** ve bir saat
sonra emniyet ağı dolunca kendiliğinden düzelirdi. *Bazen çalışan* bir bayatlama: hata
ayıklaması en zor sınıf.

### Karar
**Kural:** Bir önbellek girdisi, kendisini düşürebilecek **tüm** etiketleri taşımak
zorundadır. Etiket adlandırmasındaki hiyerarşi okunabilirlik içindir, geçersizleştirme
mekanizması değildir.

**F3'ün Server Action'ları için bağlayıcı:**
- İçerik **eklendi/silindi** → `localeTag(entity, locale)` düşürülür (liste ve sayılar değişti)
- İçerik **düzenlendi** → `localeTag` **ve** `slugTag` birlikte düşürülür
- **Durum değişti** (`DRAFT`→`PUBLISHED`, →`ARCHIVED`) → `localeTag` **mutlaka** düşürülür.
  Yalnızca `slugTag` düşürmek `publishedProjects` istatistiğini bayat bırakır.

**Yapısal koruma:** Etiketler sarmalama anında değil, **çağrı argümanlarından** hesaplanır.
`cachedRead` tek sarmalayıcıdır ve `describe` fonksiyonunu **zorunlu** kılar — sabit etiket
dizisi yazmak artık derlenmiyor. Kural yorumla değil tiple korunuyor.

### Sonuçlar
- **Olumlu:** Dil bazlı bayatlama sınıfı kapandı ve tekrarı derleme hatası veriyor. Regresyon testi **mutasyonla** doğrulandı (eski hâl geri konup testin kırıldığı görüldü).
- **Olumsuz / kabul edilen:** Server Action'lar birden çok `revalidateTag` çağırmak zorunda; unutulan bir seviye bayat içerik bırakır. Bu yüzden kural bir kod yorumunda değil ADR'de — F3'ün her CRUD görev kartına referans verilecek.
- Bugün tek dil (`tr`) olduğu için etkisi yoktu; **F3'te ikinci dil eklendiği anda** ortaya çıkardı.

### Alternatifler ve neden reddedildi
- **Tek düz etiket kullanmak** (`content:project`) — Hiyerarşi sorununu yok ederdi; **reddedildi** çünkü tek bir yazının düzenlenmesi tüm proje listesini ve istatistiği düşürürdü; önbelleğin faydası büyük ölçüde kaybolur.
- **İki sarmalayıcı** (biri sabit etiketli, biri dinamik) — Basit kullanım için kısa yol verirdi; **reddedildi**: hatanın tekrarına davetiye. Tek sarmalayıcı + zorunlu `describe`, yanlış kullanımı imkânsız kılıyor.
- **Kuralı yorumda bırakmak** — **reddedildi**: T-019b/K3'ün gösterdiği gibi, hatırlanması gereken kurallar unutulur. Tip ve ADR birlikte korur.
