#!/usr/bin/env bash
# MASA MAC KÖPRÜSÜ KURULUMU (ADR-049 M6) — bu Mac'te bir kez:
#   bash kopru/mac/kur.sh <aemk_anahtar> [panel_adresi]
# Panelde Masa → "Ses kayıtları → yazı (Mac)" → "Anahtar üret" komutu bu satırı verir.
# Yeniden çalıştırılabilir: anahtarı yeniler, servisi yeniden başlatır.
set -euo pipefail

ANAHTAR=${1:?Kullanım: kur.sh <aemk_anahtar> [panel_adresi]}
URL=${2:-https://abdulkadirelaldi.com}
[[ "$ANAHTAR" == aemk_* ]] || { echo "Anahtar aemk_ ile başlamalı." >&2; exit 1; }

KLASOR="$HOME/Library/Application Support/masa-kopru"
MODEL="$KLASOR/models/ggml-large-v3-turbo.bin"
AYAR="$HOME/.config/aelaldi/masa-kopru.json"
ETIKET=com.aelaldi.masa-kopru
PLIST="$HOME/Library/LaunchAgents/$ETIKET.plist"
GUNLUK="$HOME/Library/Logs/masa-kopru.log"

command -v ffmpeg >/dev/null || { echo "ffmpeg yok: brew install ffmpeg" >&2; exit 1; }
command -v whisper-cli >/dev/null || { echo "whisper-cli yok: brew install whisper-cpp" >&2; exit 1; }
NODE=$(command -v node) || { echo "node yok" >&2; exit 1; }

mkdir -p "$KLASOR/models" "$(dirname "$AYAR")" "$HOME/Library/LaunchAgents"
if [ ! -s "$MODEL" ]; then
  echo "Whisper modeli indiriliyor (~1,6 GB)…"
  curl -fL --retry 3 -o "$MODEL.part" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin"
  mv "$MODEL.part" "$MODEL"
fi

cp "$(dirname "$0")/masa-kopru.mjs" "$KLASOR/masa-kopru.mjs"
umask 077
printf '{"url":"%s","anahtar":"%s","model":"%s","whisper":"%s"}\n' \
  "$URL" "$ANAHTAR" "$MODEL" "$(command -v whisper-cli)" > "$AYAR"
chmod 600 "$AYAR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$ETIKET</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$KLASOR/masa-kopru.mjs</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$GUNLUK</string>
  <key>StandardErrorPath</key><string>$GUNLUK</string>
</dict></plist>
PLIST

launchctl bootout "gui/$(id -u)/$ETIKET" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Kuruldu. Günlük: $GUNLUK"
echo "Durdurmak: launchctl bootout gui/\$(id -u)/$ETIKET"
