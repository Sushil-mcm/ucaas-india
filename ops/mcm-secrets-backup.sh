#!/bin/bash
# Encrypted backup of the things that are NOT in git and cannot be rebuilt:
# credentials, and the web server configuration for all 34 sites.
#
# WHY ENCRYPTED, WHEN THE DESTINATIONS ARE ALREADY PRIVATE
# Because "private" means "several people and several tokens". The repository is
# read by teams and by deploy keys, and git history is permanent - a credential
# committed once stays in that history forever, even if the file is deleted the
# next day. Encrypting first means every copy is useless to whoever gets it.
#
# WHERE THE PASSPHRASE LIVES, AND WHY THAT IS NOT CIRCULAR
# On this box, root-only, next to the plaintext it protects. That sounds
# pointless and is not: anyone who can read the passphrase here can already read
# the original files here. What it protects is every copy that LEAVES this box -
# the two backup servers and GitHub - where the passphrase does not go.
# The owner keeps a second copy off-server. Without that, losing this box loses
# the ability to decrypt, which would defeat the whole exercise.
#
# The readable archive is never written to disk: tar streams straight into gpg.

set -uo pipefail

PASSFILE=/root/.mcm-secrets-passphrase
STAGE=/root/.mcm-secrets-stage
OUT_DIR=/root/mycountrymobile-web/secrets-backup
OUT="$OUT_DIR/secrets.tar.gz.gpg"
DESTS="mcm-switch mcm-ucaas3"
REMOTE_DIR=/var/backups/mcm-web-repo
LOG=/var/log/mcm-secrets-backup.log
API_HOSTS="mcm-new mcm-switch"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

[ -s "$PASSFILE" ] || { log "FAIL: no passphrase at $PASSFILE"; exit 1; }

rm -rf "$STAGE"
mkdir -p "$STAGE"
chmod 700 "$STAGE"
mkdir -p "$OUT_DIR"

# 1. This box: the portal environment files, and every site's nginx config.
if [ -d /etc/mycountrymobile-web ]; then
  cp -a /etc/mycountrymobile-web "$STAGE/etc-mycountrymobile-web"
fi
mkdir -p "$STAGE/nginx"
cp -aL /etc/nginx/sites-enabled "$STAGE/nginx/sites-enabled" 2>/dev/null
cp -a /etc/nginx/conf.d "$STAGE/nginx/conf.d" 2>/dev/null

# 2. The API servers: the genuinely dangerous ones - the database password, the
#    token signing secret, the encryption secret. Fetched over ssh and encrypted
#    here; never written in the clear anywhere but the machine they live on.
for h in $API_HOSTS; do
  d="$STAGE/api-$h"
  mkdir -p "$d"
  for svc in default-api campaign-api tenant-api; do
    ssh -o BatchMode=yes -o ConnectTimeout=15 "$h" \
      "cat /var/www/prod/$svc/.env 2>/dev/null" > "$d/$svc.env" 2>/dev/null
    [ -s "$d/$svc.env" ] || rm -f "$d/$svc.env"
  done
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$h" \
    "cat /opt/fs-configuration-manager/.env 2>/dev/null" \
    > "$d/fs-configuration-manager.env" 2>/dev/null
  [ -s "$d/fs-configuration-manager.env" ] || rm -f "$d/fs-configuration-manager.env"
done

FILES=$(find "$STAGE" -type f | wc -l)

# 3. Straight from tar into gpg, so no readable archive ever touches the disk.
if tar -C "$STAGE" -czf - . \
    | gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
          --passphrase-file "$PASSFILE" -o "$OUT.tmp"; then
  mv -f "$OUT.tmp" "$OUT"
  chmod 600 "$OUT"
  log "encrypted ok: $FILES files, $(du -h "$OUT" | cut -f1)"
else
  log "FAIL: encryption failed"
  rm -f "$OUT.tmp"
  rm -rf "$STAGE"
  exit 1
fi

rm -rf "$STAGE"

# 4. Out to the two servers. GitHub picks it up through the repository backup,
#    because the encrypted file lives inside the repository.
for h in $DESTS; do
  if scp -o BatchMode=yes -o ConnectTimeout=15 -q "$OUT" "$h:$REMOTE_DIR/secrets.tar.gz.gpg"; then
    log "$h: copied"
  else
    log "$h: COPY FAILED"
  fi
done

log "done"
