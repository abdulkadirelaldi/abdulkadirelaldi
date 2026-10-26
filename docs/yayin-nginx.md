# Yayın — paylaşımlı sunucu (nginx + Docker)

Site **187.77.66.202** üzerinde, `https://abdulkadirelaldi.com` adresinde yayında
(2026-10-22). Bu belge o kurulumu ve sonraki güncellemeleri anlatır.
Coolify kurulumu için `docs/yayin.md`; bu sunucu için **o yol kullanılmıyor**.

## Neden Coolify değil

Sunucu boş değil: Kıyı Medya'nın ve müşterilerin ~20 sitesi nginx üzerinden
80/443'te, ayrıca **mailcow** e-posta sunucusu çalışıyor. Kaynak dar: 1 CPU,
3,8 GB RAM; boş bellek ~1 GB.

- Coolify 80/443'ü kendi vekiliyle ister → nginx ile çakışır, **bütün müşteri
  siteleri düşer**. Tek başına 1–2 GB bellek ister.
- Next.js derlemesi 1 CPU'da dakikalar sürer ve o sırada diğer siteler yavaşlar.

Bunun yerine sunucudaki diğer uygulamalarla (askarmedikal.com) aynı düzen:
uygulama Docker'da, **yalnızca 127.0.0.1**'e açık; dışarıya mevcut nginx,
sertifika certbot. İmajlar geliştirme makinesinde derlenip hazır gönderilir.

## Yerleşim

| Ne | Nerede |
|---|---|
| Compose, sırlar, yedek betiği | `/opt/aelaldi/` (`.env` chmod 600, yalnızca root) |
| Uygulama | konteyner `aelaldi-uygulama-1` → `127.0.0.1:3400` |
| Veritabanı | konteyner `aelaldi-db-1`, birim `aelaldi_pgdata`, port dışarı kapalı |
| nginx | `/etc/nginx/sites-available/abdulkadirelaldi.com` (depoda `deploy/sunucu/`) |
| Sertifika | `/etc/letsencrypt/live/abdulkadirelaldi.com/` — certbot otomatik yeniler |
| Yerel yedek | `/opt/aelaldi/yedek/` — her gece 03:15, 14 gün |

**Bellek sınırları** (`deploy/sunucu/docker-compose.yml`): uygulama 512 MB,
veritabanı 256 MB. Taşma kendi konteynerimizde kalır; çekirdeğin müşterinin
e-posta sürecini öldürmesine yol açmaz.

**IP güvenliği:** nginx `X-Forwarded-For`'u ziyaretçinin değeriyle **değiştirir**
(`$remote_addr`), eklemez. Uygulama ilk değeri okuduğu için eklemek, giriş
kilidini ve form hız sınırını sahte başlıkla atlatılabilir yapardı.

## Yeni sürüm yayınlama

Geliştirme makinesinde, `main` güncel ve temizken:

```bash
deploy/sunucu/gonder.sh
```

Dal `origin`e itilmiş olmalı. İmajlar GitHub Actions'ta amd64 için derlenir
(`.github/workflows/imaj.yml`, ~birkaç dk; aynı commit zaten derlendiyse
yeniden derlenmez), betik yapıtı indirip ssh ile sunucuya yükler, göçleri
uygular, uygulamayı yeniden başlatır (birkaç saniyelik kesinti). GitHub'ın
sunucuya erişimi yok. GitHub erişilemezse yedek yol `YEREL=1 deploy/sunucu/gonder.sh`
(bu Mac'te QEMU — 10–30 dk; Mac uykuya geçerse takılır, `caffeinate -i` ile çalıştırın).

⚠️ Betik çalışırken `gonder.sh` dosyasını düzenlemeyin: bash betiği satır
satır okur, çalışan gönderim sözdizimi hatasıyla yarıda kalır.

Kontrol:
`curl -s https://abdulkadirelaldi.com/api/v1/health`.

İçerik dosyaları (`scripts/icerik/*`) değiştiyse ardından:

```bash
ssh root@187.77.66.202 'cd /opt/aelaldi && docker compose exec -T araclar \
  node --import ./scripts/yedek-register.mjs scripts/icerik-yukle.ts && docker compose restart uygulama'
```

## Panel yöneticisi — BİR KEZ, site sahibi yapar

Şifre kimseye söylenmez, sohbete yazılmaz; sunucuda gizli girişle okunur:

```bash
ssh root@187.77.66.202
cd /opt/aelaldi
read -rsp "Panel şifresi: " ADMIN_PASSWORD; echo
docker compose exec -T -e ADMIN_PASSWORD="$ADMIN_PASSWORD" araclar \
  node --import ./scripts/yedek-register.mjs scripts/uretim-baslat.ts
unset ADMIN_PASSWORD
# [baslat] yönetici: oluşturuldu · profil: zaten vardı
```

Sonra `https://abdulkadirelaldi.com/giris` → e-posta + şifre → panel 2FA
kurulumunu zorunlu açar; **kurtarma kodlarını kaydet**.

## R2 (dosya yükleme ve uzak yedek)

Kapak, CV ve logo yükleme R2 ister. Cloudflare → R2 → **yeni** API anahtarı
(eskisi sızmıştı) + iki bucket: uygulama ve **ayrı** üretim yedeği. Değerleri
`/opt/aelaldi/.env`e sunucuda yaz (`nano`), sonra:

```bash
cd /opt/aelaldi && docker compose up -d
```

Uzak şifreli yedek için cron'a ekle (`crontab -e`):

```
0 3 * * * cd /opt/aelaldi && docker compose exec -T araclar node --import ./scripts/yedek-register.mjs scripts/yedek-al.ts >> /var/log/aelaldi-yedek.log 2>&1
```

## Sırlar

`/opt/aelaldi/.env` sunucuda `openssl rand` ile üretildi; hiçbir yere
yazdırılmadı. **`TOTP_ENCRYPTION_KEY` ve `BACKUP_ENCRYPTION_KEY`i parola
yöneticisine kopyala** — kaybolursa 2FA ve şifreli yedekler açılamaz:
`ssh root@187.77.66.202 cat /opt/aelaldi/.env`.

## Geri yükleme (yerel yedekten)

```bash
cd /opt/aelaldi
docker compose stop uygulama
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < yedek/aelaldi-YYYY-AA-GG.dump
docker compose start uygulama
```
