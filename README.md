# abdulkadirelaldi.com

Kişisel site (public portföy/CV) ve tek kullanıcılı yönetim paneli — tek Next.js uygulaması.

> **Tek doğruluk kaynağı [PROGRAM.md](PROGRAM.md)'dir.** Mimari kararlar
> [docs/DECISIONS.md](docs/DECISIONS.md), durum [docs/STATUS.md](docs/STATUS.md).

## Gereksinimler

| Araç       | Sürüm                                         |
| ---------- | --------------------------------------------- |
| Node.js    | **22 LTS** — `.nvmrc` tek kaynak (ADR-008)    |
| pnpm       | 9.15.0 (`packageManager` ile sabit — ADR-003) |
| PostgreSQL | 16 (Docker)                                   |

`npm` / `yarn` kullanılmaz; `package-lock.json` ve `yarn.lock` `.gitignore`'da yasaklıdır.

> **nvm kullanıyorsanız:** Node sürümünü her değiştirdiğinizde `corepack enable`
> komutunu **tekrar çalıştırın**. corepack shim'leri sürüm başına kurulur; yeni
> sürüme geçtiğinizde `pnpm` bulunamaz ve hata mesajı (`command not found: pnpm`)
> nedenini söylemez.
>
> ```bash
> nvm use          # .nvmrc'deki sürüme geçer
> corepack enable  # pnpm shim'ini bu sürüm için kurar
> ```

## Kurulum

```bash
nvm use                    # Node 22 (.nvmrc)
corepack enable            # pnpm 9.15.0'ı packageManager alanından alır
pnpm install               # postinstall Prisma istemcisini de üretir (ADR-006)
cp .env.example .env       # değerleri doldur (§12)

# Gizli anahtarları üret ve .env'e yaz (§12, ADR-013)
openssl rand -base64 32    # AUTH_SECRET
openssl rand -base64 32    # TOTP_ENCRYPTION_KEY  ← kaybolursa 2FA secret'ları açılamaz

pnpm db:up                 # yerel PostgreSQL 16
pnpm db:migrate            # şemayı uygula
pnpm db:seed               # örnek veri + yönetici kullanıcı
pnpm dev
```

### Seed

`pnpm db:seed` **idempotenttir** — istediğiniz kadar çalıştırabilirsiniz, kayıtlar
çoğalmaz. Her girdi ilgili `createXSchema`'dan geçirilir; yani seed aynı zamanda
Zod sözleşmesinin canlı doğrulamasıdır.

Yönetici kullanıcı için `.env` içinde şunlar gerekir:

| Anahtar               | Not                                                              |
| --------------------- | ---------------------------------------------------------------- |
| `ADMIN_EMAIL`         | Zorunlu                                                          |
| `ADMIN_PASSWORD_HASH` | **Önerilen** — düz şifre hiçbir yerde bulunmaz (§12)             |
| `ADMIN_PASSWORD`      | Alternatif; seed `hashPassword` ile hash'ler, düz hâli saklanmaz |

İkisinden biri tanımlı olmalıdır. Seed çıktısı **hiçbir şifre veya secret yazdırmaz** (§8.20).

Oluşan kullanıcıda **2FA kapalıdır** (`totpConfirmedAt` boş): ilk giriş doğrulama kodu
istemez, 2FA kurulumu panelden yapılır.

`pnpm exec prisma migrate reset` seed'i otomatik çalıştırır — komut Prisma 7'de
`package.json` yerine `prisma.config.ts` içindeki `migrations.seed` alanında tanımlıdır.

Sağlık kontrolü: `curl -s localhost:3000/api/v1/health | jq`

### Yerel veritabanı

`docker-compose.dev.yml` PostgreSQL 16'yı **yalnızca localhost'a** bağlar:

|                        |                                            |
| ---------------------- | ------------------------------------------ |
| Servis / container     | `db` / `aelaldi-db-dev`                    |
| Host portu             | **5433** (container içi 5432)              |
| DB / kullanıcı / şifre | `aelaldi` / `aelaldi` / `aelaldi_dev_only` |
| Volume                 | `aelaldi_pgdata`                           |

Host portu bilerek **5433**'tür: birçok makinede sistem geneli kurulu bir PostgreSQL
5432'yi tutar. Çakışma sessizdir — container `healthy` görünür ama bağlantılar host'taki
diğer sunucuya gider ve `role "aelaldi" does not exist` gibi yanıltıcı hata alırsınız.

`.env` içindeki bağlantı dizesi:

```
DATABASE_URL=postgresql://aelaldi:aelaldi_dev_only@127.0.0.1:5433/aelaldi?schema=public
```

Durdurma: `docker compose -f docker-compose.dev.yml down`
Verisiyle birlikte silme: `... down -v`

### Prisma 7 notları

- Bağlantı dizesi `schema.prisma` içinde **değildir** (v7'de `datasource.url` kaldırıldı);
  `prisma.config.ts` içinde yaşar.
- Prisma 7 CLI `.env`'i kendiliğinden yüklemez; `prisma.config.ts` bunu
  `process.loadEnvFile()` ile yapar.
- Üretilen istemci **TypeScript kaynağıdır** ve `src/server/generated/prisma/` altına
  yazılır. Bu klasör `.gitignore`'dadır; `postinstall` her `pnpm install`'da üretir
  (ADR-006), yani CI ve taze klon ek adım istemez.
- `prisma.config.ts` içindeki `datasource` **koşulludur**: `DATABASE_URL` yoksa
  aktarılmaz. Böylece `.env` bulunmayan ortamlarda (CI, Docker build) `prisma generate`
  ve dolayısıyla `pnpm install` çalışmaya devam eder.

## Komutlar

| Komut               | Ne yapar                                           |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Geliştirme sunucusu (http://localhost:3000)        |
| `pnpm build`        | Üretim derlemesi — `output: 'standalone'`          |
| `pnpm start`        | Derlenmiş uygulamayı çalıştırır                    |
| `pnpm lint`         | ESLint, sıfır uyarı toleransı (`--max-warnings=0`) |
| `pnpm typecheck`    | `tsc --noEmit`, strict                             |
| `pnpm format`       | Prettier ile biçimlendirir                         |
| `pnpm format:check` | Biçim denetimi (yazmaz)                            |
| `pnpm test`         | Vitest birim testleri — _T-004'te kurulacak_       |
| `pnpm test:e2e`     | Playwright E2E — _T-004'te kurulacak_              |
| `pnpm db:up`        | Yerel PostgreSQL 16'yı başlatır                    |
| `pnpm db:down`      | Yerel PostgreSQL'i durdurur                        |
| `pnpm db:migrate`   | `prisma migrate dev`                               |
| `pnpm db:generate`  | `prisma generate`                                  |
| `pnpm db:studio`    | Prisma Studio                                      |
| `pnpm db:seed`      | Örnek veri + yönetici kullanıcı (idempotent)       |

Commit öncesi zorunlu (§10.5): `pnpm lint && pnpm typecheck && pnpm test`

## Klasör yapısı (§4.3)

```
src/
  app/
    (public)/          public route group
    (panel)/panel/     panel route group (korumalı)
    api/v1/            route handler'lar
    layout.tsx page.tsx globals.css
  components/{ui,reactbits,public,panel}/
  server/{actions,services}/     DB erişimi YALNIZCA services/ içinde (§7.4)
  lib/{schemas,utils,security}/  schemas/ = Zod sözleşmesi (§7.3)
  types/
prisma/{schema.prisma,migrations/}
tests/{unit,e2e}/
docs/
```

## Ajan mülkiyeti (§10.1)

| Ajan            | Yollar                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------- |
| Orkestra Şefi   | `PROGRAM.md`, `docs/**`                                                                      |
| Backend         | `prisma/**`, `src/server/**`, `src/app/api/**`, `src/lib/schemas/**`, `src/types/**`         |
| Frontend        | `src/app/(public)/**`, `src/app/(panel)/**`, `src/components/**`, `public/**`, `globals.css` |
| Güvenlik & Test | `tests/**`, `middleware.ts`, `src/lib/security/**`, `docs/security/**`, CI                   |

Bir ajan başkasının dosyasını değiştirmez; ihtiyaç Orkestra Şefi'ne bildirilir.

## Notlar

- **Tailwind v4, CSS-first (ADR-002):** `tailwind.config.ts` **yoktur ve oluşturulmaz**.
  Token'lar `src/app/globals.css` içindeki `@theme` bloğunda yaşar.
- **Bağımlılıklar (ADR-004):** F0–F2 için gereken tüm paketler T-001'de tek seferde
  kuruldu. Yeni bağımlılık Orkestra Şefi onayı + ADR gerektirir (§8.25).
