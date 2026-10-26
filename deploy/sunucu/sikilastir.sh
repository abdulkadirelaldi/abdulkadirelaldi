#!/usr/bin/env bash
# Sunucu sıkılaştırma — SUNUCUDA, root olarak, SİTE SAHİBİ çalıştırır (BİR KEZ).
#
#   ssh root@187.77.66.202 'bash -s' < deploy/sunucu/sikilastir.sh
#
# 1. SSH: şifreyle giriş KAPALI, root yalnızca anahtarla. `sshd_config.d`de İLK
#    eşleşen kazanır; 50-cloud-init.conf `PasswordAuthentication yes` diyordu ve
#    60-cloudimg'den önce okunduğu için şifreli giriş FİİLEN açıktı. 10- öneki
#    hepsinden önce okunur.
# 2. nginx: sürüm numarası yanıt başlığında gösterilmez (server_tokens off).
#    Tüm siteleri etkiler, zararsız.
#
# KİLİTLENME KORUMASI: authorized_keys boşsa hiçbir şey değişmez; sshd -t /
# nginx -t geçmezse değişiklik geri alınır. Açık oturumlar kapanmaz — bitince
# YENİ bir terminalde `ssh root@187.77.66.202` ile girişi deneyin.
set -euo pipefail

if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "authorized_keys boş — anahtarsız kalırsınız, durduruldu." >&2
  exit 1
fi

DOSYA=/etc/ssh/sshd_config.d/10-sikilastir.conf
cat > "$DOSYA" <<'CONF'
# deploy/sunucu/sikilastir.sh — şifreyle giriş kapalı, root yalnızca anahtarla.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
if ! sshd -t; then
  rm -f "$DOSYA"
  echo "sshd yapılandırması geçersiz — geri alındı." >&2
  exit 1
fi
systemctl reload ssh
echo "[ssh] etkin ayar: $(sshd -T | grep -E '^(passwordauthentication|permitrootlogin)' | tr '\n' ' ')"

if grep -qE '^\s*#\s*server_tokens off;' /etc/nginx/nginx.conf; then
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.yedek
  sed -i -E 's/^(\s*)#\s*server_tokens off;/\1server_tokens off;/' /etc/nginx/nginx.conf
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "[nginx] server_tokens off"
  else
    mv /etc/nginx/nginx.conf.yedek /etc/nginx/nginx.conf
    echo "[nginx] yapılandırma geçersiz — geri alındı." >&2
  fi
fi

# Root şifresi DEĞİŞTİRİLMEDİ (sahibinin kararı, 2026-10-26): şifreyle SSH
# kapalı olduğundan şifre SSH'tan kullanılamaz. Hâlâ geçerli olduğu tek yer
# sağlayıcının web konsolu (VNC/seri konsol).
