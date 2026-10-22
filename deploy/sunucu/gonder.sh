#!/usr/bin/env bash
# Yeni sürümü yayına al — GELİŞTİRME MAKİNESİNDE çalışır (bkz. docs/yayin-nginx.md).
#
#   deploy/sunucu/gonder.sh            # derle + gönder + göç + yeniden başlat
#
# 1. İki imaj linux/amd64 için BURADA derlenir (sunucu 1 CPU; orada derlemek
#    müşteri sitelerini dakikalarca yavaşlatırdı).
# 2. `docker save | ssh docker load` — kayıt defteri (registry) gerekmiyor.
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
SURUM=$(git rev-parse --short HEAD)

for hedef in uygulama araclar; do
  docker buildx build --platform linux/amd64 --target "$hedef" \
    --build-arg NEXT_PUBLIC_SITE_URL="$SITE_URL" \
    -t "aelaldi-$hedef:$SURUM" -t "aelaldi-$hedef:latest" --load .
done

docker save "aelaldi-uygulama:$SURUM" "aelaldi-uygulama:latest" \
  "aelaldi-araclar:$SURUM" "aelaldi-araclar:latest" | gzip -1 | ssh "$SUNUCU" 'gunzip | docker load'

ssh "$SUNUCU" "cd /opt/aelaldi && docker compose up -d --remove-orphans && docker image prune -f >/dev/null"
echo "[gonder] $SURUM yayında — kontrol: curl -s $SITE_URL/api/v1/health"
