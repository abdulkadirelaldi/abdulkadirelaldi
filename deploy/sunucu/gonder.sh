#!/usr/bin/env bash
# Yeni sürümü yayına al — GELİŞTİRME MAKİNESİNDE çalışır (bkz. docs/yayin-nginx.md).
#
#   deploy/sunucu/gonder.sh            # GitHub'da derle + gönder + göç + yeniden başlat
#   YEREL=1 deploy/sunucu/gonder.sh    # yedek yol: bu Mac'te QEMU ile derle (yavaş)
#
# 1. İki imaj linux/amd64 için GitHub Actions'ta derlenir (.github/workflows/imaj.yml;
#    benzetim yok, katman önbelleği var). Sunucuda derlenmez: 1 CPU, orada
#    derlemek müşteri sitelerini dakikalarca yavaşlatırdı.
# 2. `docker load` ssh üzerinden — kayıt defteri (registry) yok, GitHub'ın
#    sunucuya hiçbir erişimi yok.
# 3. Sunucuda `goc` göçleri uygular, `uygulama` yeni imajla kalkar.
#    Kesinti: konteynerin yeniden başlama süresi (birkaç saniye).
set -euo pipefail

SUNUCU=${SUNUCU:-root@187.77.66.202}
SITE_URL=${SITE_URL:-https://abdulkadirelaldi.com}
cd "$(dirname "$0")/../.."

if [ -n "$(git status --porcelain -- src prisma scripts package.json pnpm-lock.yaml Dockerfile)" ]; then
  echo "Kaydedilmemiş değişiklik var — yayına yalnızca commit'lenmiş kod çıkar." >&2
  exit 1
fi
SURUM=$(git rev-parse --short=9 HEAD)

if [ "${YEREL:-}" = 1 ]; then
  for hedef in uygulama araclar; do
    docker buildx build --platform linux/amd64 --target "$hedef" \
      --build-arg NEXT_PUBLIC_SITE_URL="$SITE_URL" \
      -t "aelaldi-$hedef:$SURUM" -t "aelaldi-$hedef:latest" --load .
  done
  docker save "aelaldi-uygulama:$SURUM" "aelaldi-uygulama:latest" \
    "aelaldi-araclar:$SURUM" "aelaldi-araclar:latest" | gzip -1 | ssh "$SUNUCU" 'gunzip | docker load'
else
  # GitHub yalnızca İTİLMİŞ commit'i derleyebilir.
  DAL=$(git rev-parse --abbrev-ref HEAD)
  git fetch -q origin "$DAL"
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$DAL")" ]; then
    echo "HEAD origin/$DAL ile aynı değil — önce git push." >&2
    exit 1
  fi
  SHA=$(git rev-parse HEAD)
  bul() {
    gh run list --workflow imaj.yml --branch "$DAL" --limit 20 \
      --json databaseId,headSha,conclusion,status \
      -q "[.[] | select(.headSha == \"$SHA\") | select($1)][0].databaseId // empty"
  }
  # Bu commit zaten derlendiyse yeniden derleme.
  KOSU=$(bul '.conclusion == "success"')
  if [ -z "$KOSU" ]; then
    gh workflow run imaj.yml --ref "$DAL"
    for _ in $(seq 30); do
      KOSU=$(bul '.status != "completed"')
      [ -n "$KOSU" ] && break
      sleep 4
    done
    [ -n "$KOSU" ] || { echo "Tetiklenen koşu bulunamadı." >&2; exit 1; }
    echo "[gonder] derleniyor: $(gh run view "$KOSU" --json url -q .url)"
    gh run watch "$KOSU" --exit-status --interval 15 >/dev/null
  fi
  # Yapıt (~500 MB) diske İNDİRİLMEDEN akıtılıyor: zip → bsdtar → ssh. Diski
  # dolu bir geliştirme makinesinde `gh run download` yarıda kalıyordu
  # (2026-10-26). Zip sıkıştırmasız (imaj.yml: compression-level 0); bsdtar
  # boyutu baştan bilinmeyen kaydı da akış halinde okuyabiliyor, funzip okuyamıyor.
  YAPIT=$(gh api "repos/{owner}/{repo}/actions/runs/$KOSU/artifacts" \
    -q ".artifacts[] | select(.name == \"imajlar-$SURUM\") | .id")
  [ -n "$YAPIT" ] || { echo "Yapıt bulunamadı: imajlar-$SURUM" >&2; exit 1; }
  # Yapıtı SUNUCU doğrudan GitHub'dan indirir (2026-10-28). Önce imaj Mac
  # üzerinden akıyordu: ev bağlantısının YÜKLEME hızı (bir gün ~1,7 MB/sn, ertesi
  # gün ~70 KB/sn) gönderimi 5 dakikadan 2 saate çıkarabiliyordu. Sunucuya
  # kalıcı jeton KONMUYOR: GitHub yapıt adresi, ~1 dakika geçerli ve yalnızca bu
  # dosyayı okuyan imzalı bir adrese yönlendiriyor; o adres ssh'ın standart
  # girdisinden geçiyor (Mac'te komut satırında görünmez). Sunucuda unzip yok,
  # zip python3 ile açılıyor. 60 sn boyunca 10 KB/sn altına düşen indirme
  # kesilir ve zincir hata verir — eksik imaj yüklenmez, canlı sürüm değişmez.
  DEPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  IMZALI=$(printf 'header = "Authorization: Bearer %s"\n' "$(gh auth token)" \
    | curl -fsS -K - -o /dev/null -w '%{redirect_url}' \
      "https://api.github.com/repos/$DEPO/actions/artifacts/$YAPIT/zip")
  [ -n "$IMZALI" ] || { echo "Yapıt indirme adresi alınamadı." >&2; exit 1; }
  printf '%s' "$IMZALI" | ssh "$SUNUCU" 'set -euo pipefail
    adres=$(cat)
    zip=$(mktemp /tmp/aelaldi-imaj.XXXXXX)
    trap "rm -f \"$zip\"" EXIT
    curl -fsSL --speed-limit 10240 --speed-time 60 -o "$zip" "$adres"
    python3 -c "import shutil, sys, zipfile; shutil.copyfileobj(zipfile.ZipFile(sys.argv[1]).open(\"imajlar.tar.gz\"), sys.stdout.buffer)" "$zip" \
      | gunzip | docker load'
fi

# Eski sürümler: güncel + bir önceki (geri dönüş için) kalır, gerisi silinir.
# Her sürüm ~2,6 GB; disk müşteri siteleri ve mailcow ile paylaşılıyor.
ssh "$SUNUCU" "cd /opt/aelaldi && docker compose up -d --remove-orphans && \
  for r in aelaldi-uygulama aelaldi-araclar; do \
    docker images \$r --format '{{.Tag}}' | grep -vx latest | tail -n +3 | xargs -r -I{} docker rmi \$r:{} >/dev/null; \
  done; docker image prune -f >/dev/null"
echo "[gonder] $SURUM yayında — kontrol: curl -s $SITE_URL/api/v1/health"
