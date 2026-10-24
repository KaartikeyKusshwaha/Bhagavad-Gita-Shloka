#!/usr/bin/env bash
set -euo pipefail
# Pass the SHA-256 of the CI runtime tar, verified after the authenticated download.
digest=${1:?Pass the expected runtime SHA-256}
[[ "$digest" =~ ^[a-f0-9]{64}$ ]] || exit 1
printf '%s  /home/ubuntu/open-scripture-runtime.tgz\n' "$digest" | sha256sum -c -
test -f /opt/open-scripture/package.json
test ! -e /opt/open-scripture-next
stamp=$(date -u +%Y%m%dT%H%M%SZ)
previous="/opt/open-scripture-previous-$stamp"
install -d -m 755 /opt/open-scripture-next
tar -xzf /home/ubuntu/open-scripture-runtime.tgz -C /opt/open-scripture-next --no-same-owner
test -f /opt/open-scripture-next/apps/web/.next/BUILD_ID
install -d -o scripture -g scripture -m 750 /opt/open-scripture-next/apps/web/.next/cache
install -d -m 700 /var/backups/open-scripture
sudo -u postgres pg_dump -Fc scripture > "/var/backups/open-scripture/pre-upgrade-$stamp.dump"
chmod 600 "/var/backups/open-scripture/pre-upgrade-$stamp.dump"
systemctl stop open-scripture
mv /opt/open-scripture "$previous"
mv /opt/open-scripture-next /opt/open-scripture
systemctl start open-scripture
for attempt in $(seq 1 45); do
    if curl --max-time 5 --fail --silent http://127.0.0.1:3101/v1/health >/dev/null; then
        echo "Upgrade healthy. Previous code: $previous"
        exit 0
    fi
    sleep 2
done
systemctl stop open-scripture
mv /opt/open-scripture "/opt/open-scripture-failed-$stamp"
mv "$previous" /opt/open-scripture
systemctl start open-scripture
echo 'Upgrade health failed; previous code restored. Database backup retained; no automatic data rollback.' >&2
exit 1
