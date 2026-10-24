#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
# A separate college demo service; do not restart or reconfigure existing apps.
test "$(uname -m)" = x86_64
test ! -e /opt/open-scripture || { echo 'Existing scripture deployment requires an upgrade procedure.'; exit 1; }
apt-get update -qq
apt-get install -y --no-install-recommends postgresql-16 postgresql-16-pgvector ca-certificates curl xz-utils
id scripture >/dev/null 2>&1 || useradd --system --home /var/lib/open-scripture --create-home --shell /usr/sbin/nologin scripture
install -d -m 755 /opt/open-scripture /opt/open-scripture-runtime
install -d -m 750 -o scripture -g scripture /var/lib/open-scripture
install -d -m 750 -o root -g scripture /etc/open-scripture
curl --fail --silent --show-error --location https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o /opt/open-scripture-runtime/SHASUMS256.txt
node_archive=$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' /opt/open-scripture-runtime/SHASUMS256.txt)
test -n "$node_archive"
curl --fail --silent --show-error --location "https://nodejs.org/dist/latest-v22.x/$node_archive" -o "/opt/open-scripture-runtime/$node_archive"
cd /opt/open-scripture-runtime
awk -v name="$node_archive" '$2 == name' SHASUMS256.txt | sha256sum --check -
tar -xJf "$node_archive" --strip-components=1 --no-same-owner
rm -- "$node_archive"
./bin/node --version
pg_conftool 16 main set listen_addresses localhost
pg_conftool 16 main set shared_buffers 32MB
pg_conftool 16 main set work_mem 2MB
pg_conftool 16 main set maintenance_work_mem 32MB
pg_conftool 16 main set max_connections 20
pg_conftool 16 main set effective_cache_size 128MB
systemctl restart postgresql@16-main
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c 'CREATE ROLE scripture LOGIN;'
runuser -u postgres -- createdb -O scripture scripture
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d scripture -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS vector;'
python3 - <<'PY'
from pathlib import Path
import secrets,subprocess,os,pwd,grp
password=secrets.token_hex(32)
subprocess.run(['runuser','-u','postgres','--','psql','-v','ON_ERROR_STOP=1'],input=f"ALTER ROLE scripture PASSWORD '{password}';\n",text=True,check=True,stdout=subprocess.DEVNULL)
path=Path('/etc/open-scripture/environment')
path.write_text('\n'.join([
    'NODE_ENV=production','HOST=127.0.0.1','PORT=3101',
    f'DATABASE_URL=postgresql://scripture:{password}@127.0.0.1:5432/scripture',
    'ADMIN_TOKEN='+secrets.token_hex(32),'RATE_LIMIT_SECRET='+secrets.token_hex(32),
    'TRUST_LOCAL_PROXY=true','NODE_OPTIONS=--max-old-space-size=256','',
]))
os.chmod(path,0o640);os.chown(path,0,grp.getgrnam('scripture').gr_gid)
PY
echo 'Dedicated Node runtime, PostgreSQL role/database, and private environment are prepared.'
