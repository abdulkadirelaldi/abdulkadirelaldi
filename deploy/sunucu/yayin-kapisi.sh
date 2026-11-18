#!/usr/bin/env bash
# YAYIN KAPISI (ADR-055) — GitHub Actions'ın sunucuda çalıştırabildiği TEK program.
#
# Kurulum: /usr/local/bin/ae-yayin-kapisi (root, 0755). authorized_keys satırı:
#   restrict,command="/usr/local/bin/ae-yayin-kapisi" ssh-ed25519 AAAA… github-actions-aelaldi
# `restrict`: pty, port/agent/X11 yönlendirme yok. `command=`: istemcinin istediği komut
# yok sayılır, bu betik koşar; istenen komut SSH_ORIGINAL_COMMAND'da gelir ve aşağıdaki dört
# fiilden biri değilse reddedilir. Bu sunucuda 20+ müşteri sitesi var: anahtar sızsa bile
# yalnızca aelaldi imajı yüklenip /opt/aelaldi yeniden başlatılabilir.
#
# BİLEREK YOK: compose yazma. Compose ile konteynere `/` ya da docker.sock bağlanabilir — o
# hâlde kapı köke açılan kapı olurdu. Compose yalnızca Mac'ten (gonder.sh) eşitlenir; Actions
# yalnızca özetini karşılaştırır ve farklıysa durur.
set -euo pipefail
umask 077

DIZIN=/opt/aelaldi
ONEK=aelaldi-
read -r -a ARG <<<"${SSH_ORIGINAL_COMMAND:-}"
FIIL=${ARG[0]:-}
SURUM=${ARG[1]:-}

surum_dogrula() {
  [[ "$SURUM" =~ ^[0-9a-f]{9}$ ]] || { echo "kapı: geçersiz sürüm" >&2; exit 2; }
}

case "$FIIL" in
  yukle)
    # Standart girdi: gzip'li `docker save` arşivi. Yüklemeden ÖNCE bütün etiketler denetlenir:
    # başka projenin adıyla (ör. sahinsamet-uygulama:latest) imaj yüklenemez.
    # Sıkıştırılmış hâliyle saklanır (~500 MB; açılmışı ~2,6 GB — disk 8 GB boş ve müşteri
    # siteleriyle paylaşılıyor). Etiketler akıştan okunur, sonra aynı dosya yüklenir.
    gecici=$(mktemp /tmp/ae-kapi.XXXXXX)
    trap 'rm -f "$gecici"' EXIT
    head -c 3000000000 >"$gecici"
    python3 - "$gecici" "$ONEK" <<'PY'
import json, sys, tarfile
# Docker etiketi iki yerden okuyabilir: manifest.json (RepoTags) ve OCI index.json
# (`io.containerd.image.name` / `org.opencontainers.image.ref.name`). İkisi de denetlenir.
yol, onek = sys.argv[1], sys.argv[2]
etiketler, manifest_var = [], False
with tarfile.open(yol, mode="r|gz") as t:
    for uye in t:
        if uye.name in ("manifest.json", "index.json", "repositories"):
            veri = json.load(t.extractfile(uye))
            if uye.name == "manifest.json":
                manifest_var = True
                etiketler += [e for m in veri for e in (m.get("RepoTags") or [])]
            elif uye.name == "index.json":
                for m in veri.get("manifests", []):
                    for k, v in (m.get("annotations") or {}).items():
                        if k == "io.containerd.image.name":
                            etiketler.append(v.removeprefix("docker.io/library/"))
            else:
                etiketler += [f"{r}:{tag}" for r, tags in veri.items() for tag in tags]
if not manifest_var:
    sys.exit("kapı: manifest.json yok")
if not etiketler or any(not e.startswith(onek) for e in etiketler):
    sys.exit(f"kapı: izin verilmeyen etiket(ler): {etiketler}")
print("kapı: etiketler uygun:", ", ".join(sorted(set(etiketler))))
PY
    gunzip -c "$gecici" | docker load
    ;;
  compose-ozeti)
    sha256sum "$DIZIN/docker-compose.yml" | cut -d' ' -f1
    ;;
  yedek)
    surum_dogrula
    cd "$DIZIN" && mkdir -p yedek
    docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      >"yedek/goc-oncesi-$SURUM.tmp"
    mv "yedek/goc-oncesi-$SURUM.tmp" "yedek/goc-oncesi-$SURUM.dump"
    find yedek -name 'goc-oncesi-*' -mtime +7 -delete
    echo "kapı: yedek alındı ($SURUM)"
    ;;
  baslat)
    surum_dogrula
    cd "$DIZIN"
    docker image inspect "${ONEK}uygulama:$SURUM" >/dev/null || { echo "kapı: imaj yok" >&2; exit 3; }
    docker compose up -d --remove-orphans
    for r in "${ONEK}uygulama" "${ONEK}araclar"; do
      docker images "$r" --format '{{.Tag}}' | grep -vx latest | tail -n +3 |
        xargs -r -I{} docker rmi "$r:{}" >/dev/null || true
    done
    docker image prune -f >/dev/null || true
    echo "kapı: başlatıldı ($SURUM)"
    ;;
  *)
    echo "kapı: izin verilmeyen işlem" >&2
    exit 1
    ;;
esac
