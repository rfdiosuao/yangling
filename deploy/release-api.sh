#!/usr/bin/env bash
set -euo pipefail
stage=$(realpath "${1:?staging directory required}")
case "$stage" in /tmp/yangling-release-*) ;; *) echo 'Unexpected staging directory'; exit 1 ;; esac
test -f "$stage/api/server/index.mjs"
test -f "$stage/api/server/research.mjs"
test -f "$stage/api/src/core/rag/papers.js"
test -f "$stage/yangling-api.service"
stamp=$(date +%Y%m%d-%H%M%S)
release="/opt/yangling/releases/$stamp"
backup="/var/backups/yangling/api-$stamp"
install -d -m 700 "$backup"
if [ -f /etc/systemd/system/yangling-api.service ]; then cp -a /etc/systemd/system/yangling-api.service "$backup/yangling-api.service"; fi
if [ -d /var/lib/yangling ]; then cp -a /var/lib/yangling "$backup/data"; fi
id yangling >/dev/null 2>&1 || useradd --system --home /var/lib/yangling --shell /usr/sbin/nologin yangling
install -d -m 755 "$release"
install -d -m 750 -o yangling -g yangling /var/lib/yangling
install -d -m 700 /etc/yangling
if [ ! -f /etc/yangling/api.env ]; then
  node "$stage/migrate-api-env.mjs"
fi
if [ ! -f /var/lib/yangling/config.json ] && [ -d /opt/yangling-api/data ]; then
  systemctl stop yangling-api
  cp -a /opt/yangling-api/data "$backup/legacy-data"
  cp -a /opt/yangling-api/data/. /var/lib/yangling/
  chown -R yangling:yangling /var/lib/yangling
fi
cp -a "$stage/api/." "$release/"
chmod -R a+rX "$release"
previous=$(readlink /opt/yangling/current || true)
test ! -e /opt/yangling/current || test -L /opt/yangling/current
ln -s "$release" /opt/yangling/current.next
mv -Tf /opt/yangling/current.next /opt/yangling/current
install -m 644 "$stage/yangling-api.service" /etc/systemd/system/yangling-api.service
systemctl daemon-reload
systemctl enable yangling-api >/dev/null
systemctl restart yangling-api
for attempt in 1 2 3 4 5; do
  if curl --fail --silent http://127.0.0.1:8789/api/health >/dev/null; then
    printf 'API ready: %s; previous: %s\n' "$release" "${previous:-none}"
    exit 0
  fi
  sleep 1
done
if [ -n "$previous" ]; then
  ln -s "$previous" /opt/yangling/rollback.next
  mv -Tf /opt/yangling/rollback.next /opt/yangling/current
  systemctl restart yangling-api
elif [ -f "$backup/yangling-api.service" ]; then
  cp "$backup/yangling-api.service" /etc/systemd/system/yangling-api.service
  systemctl daemon-reload
  systemctl restart yangling-api
fi
echo 'API health check failed'; exit 1
