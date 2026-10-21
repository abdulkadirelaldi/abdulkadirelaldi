# Yayın — Coolify kurulumu (F7)

Bu belge sitenin sunucuya ilk kurulumunu adım adım anlatır. Her adımın
yanında neden orada olduğu yazıyor; üç tanesi T-070/T-071'de **gerçekten
düşerek** öğrenildi ve ⚠️ ile işaretli.

İlgili dosyalar: `Dockerfile` · `docker-compose.prod.yml` ·
`scripts/uretim-baslat.ts` · `docs/security/restore.md` (geri yükleme).

---

## 0. Önkoşullar

| | |
|---|---|
| Sunucu | ≥ 2 vCPU · ≥ 4 GB RAM · ≥ 40 GB disk · Ubuntu 22.04+ (§13) |
| Coolify | Kurulu ve panele erişim var |
| Alan adı | Satın alınmış, DNS yönetimine erişim var |
| R2 | Uygulama bucket'ı (`R2_BUCKET`) + **AYRI** bir üretim yedek bucket'ı |

> ⚠️ **ALAN ADI OLMADAN İMAJ DERLENEMEZ.** `robots.txt`, sitemap ve RSS
> derleme anında üretiliyor ve tam adres istiyor (`NEXT_PUBLIC_SITE_URL`).
> Alan adı sonradan değişirse imaj **yeniden derlenmeli** — ortam değişkenini
> değiştirmek yetmez.

---

## 1. Sırlar — üret ve sakla

Bunları **parola yöneticisinde** sakla; repoya ve sohbetlere girmezler (§8.17).

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # TOTP_ENCRYPTION_KEY   ← kaybolursa 2FA açılamaz
openssl rand -base64 32   # BACKUP_ENCRYPTION_KEY ← kaybolursa yedekler açılamaz
openssl rand -hex 24      # POSTGRES_PASSWORD
```

Yönetici şifresinin hash'i — projenin KENDİ `hashPassword`ü, yani parametreler
(§8.2: argon2id, 19 MiB, t=3) tek yerden geliyor. Depo kökünde:

```bash
node --import ./prisma/seed-register.mjs --input-type=module \
  -e "const { hashPassword } = await import('@/server/auth/password'); console.log(await hashPassword(process.argv[1]))" \
  'GÜÇLÜ-ŞİFRE'
# $argon2id$v=19$m=19456,p=1,t=3$…
```

Komut kabuk geçmişine şifreyi yazar — çalıştırdıktan sonra geçmişten sil ya da
başına bir boşluk koy (`HISTCONTROL=ignorespace`).

---

## 2. Coolify'da kaynak

1. **New Resource → Docker Compose** → bu depo, dal `main`, dosya
   `docker-compose.prod.yml`.
2. **Environment Variables** — hepsini gir:

| Değişken | Not |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://alanadi.com` — **build argümanı olarak da** işaretle |
| `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` | DB yalnızca iç ağda; port dışarı açılmıyor (§13.2) |
| `AUTH_SECRET` · `TOTP_ENCRYPTION_KEY` · `TOTP_ISSUER` | |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` | Uygulama dosyaları (kapak, CV, logo) |
| `BACKUP_R2_BUCKET` · `BACKUP_ENCRYPTION_KEY` | ⚠️ aşağıya bak |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD_HASH` · `ADMIN_NAME` | Yalnızca ilk kurulum (adım 4) |
| `RESEND_API_KEY` · `CONTACT_NOTIFY_EMAIL` · `CONTACT_FROM_EMAIL` | İsteğe bağlı — formdan gelen mesajı e-postayla bildirir (aşağıya bak) |

> ⚠️ **`ADMIN_PASSWORD_HASH` TEK TIRNAKLA.** argon2 hash'i `$` taşıyor
> (`$argon2id$v=19$m=…`). Compose tırnaksız değerdeki `$v`, `$m` parçalarını
> değişken sanıp **siliyor** — ölçüldü: 92 karakter konteynere 17 olarak
> ulaştı, hata vermeden. Değeri `'…'` içine al ya da her `$`ı `$$` yaz.
> Başlatma betiği bozuk hash'i fark edip yönetici oluşturmadan duruyor.

> ⚠️ **ÜRETİMİN AYRI YEDEK BUCKET'I OLMALI.** Yedek anahtarı güne göre
> (`yedek/aelaldi-YYYY-AA-GG.dump.enc`) ve ortamı ayırt etmiyor. Geliştirme
> ile üretim aynı bucket'ı kullanırsa aynı gün alınan geliştirme yedeği üretim
> yedeğinin **üzerine yazar** — ölçüldü (T-071 denemesi bugünkü yedeği ezdi).

> **İletişim bildirimi (isteğe bağlı).** resend.com'da hesap aç → **Domains**'te
> alan adını doğrula (DNS'e verdiği TXT/MX kayıtlarını ekle) → **API Keys**'ten
> anahtar al. `RESEND_API_KEY`, `CONTACT_NOTIFY_EMAIL` (mesajın gideceği adres)
> ve `CONTACT_FROM_EMAIL` (ör. `Site <site@alanadi.com>`) gir. Boş bırakılırsa
> hiçbir şey kırılmaz: mesajlar panelde, okunmamış rozetiyle durur.

3. **Domains:** `uygulama` servisine alan adını ver, port `3000`. Coolify
   Let's Encrypt sertifikasını kendisi alır.
4. **Deploy.** Sıra kendiliğinden: `db` sağlıklı → `goc` göçleri uygular ve
   çıkar → `uygulama` başlar. `uygulama` için Docker sağlık kontrolü
   `/api/v1/health`e bakar.

---

## 3. DNS

Alan adının DNS'inde `A` kaydı → sunucunun IP'si (gerekirse `www` için de).
Yayılmayı bekle, sonra Coolify'da sertifikanın alındığını gör.

---

## 4. İlk kurulum — BİR KEZ

Coolify → kaynak → `araclar` servisi → **Terminal**:

```bash
node --import ./scripts/yedek-register.mjs scripts/uretim-baslat.ts
# [baslat] yönetici: oluşturuldu · profil: oluşturuldu
```

Neden şart: boş veritabanında ana sayfa **500** veriyor (profil satırı yok,
BULGU-013) — ölçüldü; betikten sonra 200. Betik idempotent: tekrar
çalıştırmak var olan yöneticinin şifresine ve profile **dokunmaz**.

> ⚠️ `prisma/seed.ts`i üretimde **ÇALIŞTIRMA** — demo müşteri, iş, işlem ve
> sağlık kayıtları basar.

Ardından sitenin gerçek içeriği (profil, yetenekler, deneyim, ödüller, projeler —
kaynak `scripts/icerik/abdulkadir.ts`, CV ve portfolyodan):

```bash
node --import ./scripts/yedek-register.mjs scripts/icerik-yukle.ts
# [icerik] profil: güncellendi · yetenek: 44 yazıldı · deneyim: 17 yazıldı · proje: 8 yazıldı
```

İdempotent; kapaklara, avatara ve CV dosyasına dokunmaz. Yeni içerik önbellek
süresi dolunca görünür — hemen görmek için `uygulama` servisini yeniden başlat.
Kapak görsellerini, 3B avatarı ve CV PDF'ini panelden yükle.

Sonra: `ADMIN_PASSWORD_HASH`i ortam değişkenlerinden kaldırabilirsin.

---

## 5. Gece yedeği — Scheduled Task

Coolify → kaynak → **Scheduled Tasks → Add**:

| | |
|---|---|
| Container | `araclar` |
| Frequency | `0 3 * * *` (Europe/Istanbul — konteyner `TZ` taşıyor) |
| Command | `node --import ./scripts/yedek-register.mjs scripts/yedek-al.ts` |

Bir kez elle çalıştır ve çıktıda `[yedek] … dump: … şifreli: …` gör.
Saklama 30 gün, budama kendiliğinden (§8.21).

---

## 6. İlk giriş ve doğrulama

1. `https://alanadi.com/giris` → yönetici e-postası + şifre.
2. Panel **2FA kurulumunu zorunlu** açar (§8.1) — telefonla kur, **kurtarma
   kodlarını kaydet**.
3. Profil, projeler, hizmetler — içeriği panelden gir.

Kontrol listesi:

- [ ] `https://alanadi.com/api/v1/health` → `{"ok":true,"data":{"db":"up",…}}`
- [ ] Ana sayfa, `/blog`, `/projeler` açılıyor; stiller yüklü
- [ ] `/panel` oturumsuz → `/giris`
- [ ] Yanıt başlıklarında `Content-Security-Policy` ve `Strict-Transport-Security`
- [ ] Panelden bir görsel yükle → public sayfada görünüyor
- [ ] Zamanlanmış yedek bir kez elle çalıştı, R2'de nesne var
- [ ] `docs/security/restore.md` → bir **geri yükleme provası** (§8.22)

---

## 7. İzleme

Uptime Kuma (aynı sunucuda, §13.7): HTTP monitörü
`https://alanadi.com/api/v1/health`, aralık 60 sn, `ok:true` anahtar
kelimesi. Disk %90 üstünde uç `503` döner (`disk: critical`).

---

### Ziyaretçi analitiği (isteğe bağlı) — Umami

Çerez kullanmaz (onay bandı gerekmez), veri kendi sunucunda kalır.

1. Coolify → **New Resource → Service → Umami** → alan adı `analiz.alanadi.com`.
2. Umami paneli → **Websites → Add** → site adresi → **Website ID**'yi kopyala.
3. Uygulamanın ortam değişkenleri: `UMAMI_URL=https://analiz.alanadi.com`,
   `UMAMI_SITE_ID=<id>` → yeniden başlat (derleme GEREKMEZ — çalışma anında okunuyor).
4. Kontrol: sayfa kaynağında `script.js`, yanıt başlığında
   `connect-src 'self' https://analiz.alanadi.com`.

Kıyı Medya düğmeleri (`data-umami-event="kiyi-medya"`, `"proje-detay"`) Umami'de
olay olarak görünür — hangi hizmet ve projenin yönlendirdiği ayrı ayrı.

## 8. Sonra (alan adı kesinleşince)

- **HSTS `preload`** — §8.12 bunu istiyor; geri alınması aylar sürer, bu yüzden
  alan adı ve alt alan adları kesinleşince `src/lib/security/headers.ts` →
  `HSTS_VALUE`e eklenir ve hstspreload.org'a başvurulur.
- `docs/STATUS.md` → F7 kabul kontrolü (K1…K6, §1.1).
