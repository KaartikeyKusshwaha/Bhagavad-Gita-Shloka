#!/usr/bin/env bash
set -euo pipefail
test -x /opt/open-scripture-runtime/bin/node
test -s /home/ubuntu/open-scripture-runtime.tgz
test ! -e /opt/open-scripture/package.json || { echo 'An existing deployment needs the upgrade procedure.'; exit 1; }
tar -xzf /home/ubuntu/open-scripture-runtime.tgz -C /opt/open-scripture --no-same-owner
install -d -o scripture -g scripture -m 750 /opt/open-scripture/apps/web/.next/cache
install -m 644 /home/ubuntu/open-scripture.service /etc/systemd/system/open-scripture.service
systemctl daemon-reload
systemctl enable --now open-scripture
echo 'Website service started on loopback port 3101. HTTPS is configured after health checks.'
