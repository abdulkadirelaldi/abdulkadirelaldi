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
