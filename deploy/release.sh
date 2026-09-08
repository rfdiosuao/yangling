#!/usr/bin/env bash
set -euo pipefail
stage=$(realpath "${1:?staging directory required}")
case "$stage" in /tmp/yangling-release-*) ;; *) echo 'Unexpected staging directory'; exit 1 ;; esac
root=/var/www/yangling
nginx_config=$(readlink -f /etc/nginx/sites-enabled/yangling)
test -f "$stage/site/index.html"
test -f "$stage/nginx-yangling.conf"
stamp=$(date +%Y%m%d-%H%M%S)
backup="/var/backups/yangling/$stamp"
mkdir -p "$backup"
cp "$root/index.html" "$backup/index.html"
cp "$root/sw.js" "$backup/sw.js"
cp "$nginx_config" "$backup/nginx.conf"
# Install assets before changing the entry document; retain old hashed assets.
for dir in assets icons prototype mediapipe mediapipe-wasm; do
  test ! -d "$stage/site/$dir" || cp -a "$stage/site/$dir/." "$root/$dir/"
done
chmod -R a+rX "$root/assets" "$root/icons" "$root/prototype" "$root/mediapipe" "$root/mediapipe-wasm"
install -m 644 "$stage/site/manifest.webmanifest" "$root/manifest.webmanifest"
install -m 644 "$stage/nginx-yangling.conf" "$nginx_config"
if ! nginx -t; then
  cp "$backup/nginx.conf" "$nginx_config"
  exit 1
fi
systemctl reload nginx
install -m 644 "$stage/site/index.html" "$root/index.html.next"
mv "$root/index.html.next" "$root/index.html"
install -m 644 "$stage/site/sw.js" "$root/sw.js"
printf 'Deployed; rollback files: %s\n' "$backup"
