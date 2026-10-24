#!/usr/bin/env bash
set -euo pipefail
curl --fail --silent http://127.0.0.1:3101/v1/health >/dev/null
python3 - <<'PY'
from pathlib import Path
from datetime import datetime,timezone
path=Path('/etc/caddy/Caddyfile');original=path.read_text()
hostname='scripture.129-225-126-21.sslip.io'
if hostname in original:
    raise SystemExit('The scripture host already exists; review before updating.')
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
Path(f'/etc/caddy/Caddyfile.before-scripture-{stamp}').write_text(original)
block='\n'+hostname+' {\n    encode zstd gzip\n    request_body {\n        max_size 64KB\n    }\n    reverse_proxy 127.0.0.1:3101\n}\n'
Path('/etc/caddy/Caddyfile.scripture-candidate').write_text(original+block)
PY
caddy validate --config /etc/caddy/Caddyfile.scripture-candidate --adapter caddyfile
install -m 644 /etc/caddy/Caddyfile.scripture-candidate /etc/caddy/Caddyfile
systemctl reload caddy
echo 'Added scripture.129-225-126-21.sslip.io while preserving existing hosts.'
