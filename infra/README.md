# Oracle deployment and operating notes

Public site: https://scripture.129-225-126-21.sslip.io/

The existing Ubuntu 24.04 x86_64 E2 micro at 129.225.126.21 hosts this college
website. No new paid instance, subscription or billing upgrade was created.
The user explicitly confirmed their existing Groq account is on the Free plan
and authorized its use for this project. Free API quotas can stop answers; the
website keeps source evidence available when the provider fails.

## Isolation and runtime

- `/opt/open-scripture`: verified Linux CI runtime; Node 22.23.4 is installed
  separately under `/opt/open-scripture-runtime`.
- Unix user `scripture`; independent PostgreSQL 16 database/role `scripture`,
  pg_trgm and pgvector; database listens only on loopback.
- `/etc/open-scripture/environment`: root/scripture, mode 640. Contains persistent
  database/admin/rate-limit secrets and model configuration. Never print or commit it.
- `open-scripture.service` binds 127.0.0.1:3101, with CPU and memory limits.
  Caddy terminates verified HTTPS and forwards only this hostname.
- `open-scripture-embedding.service` binds 127.0.0.1:8084. Official pinned
  Qwen3-Embedding-0.6B Q8_0 through llama.cpp b11857; one CPU thread, 50% CPU,
  850 MB memory cap, 1 GB service swap cap. The host already has 4 GB swap.
- Groq `openai/gpt-oss-20b` handles cited Ask. The key stays server-side. Strict
  output schema and application citation/quotation checks apply to its answers.
  Embedding requests do not receive the Groq credential.

Existing PolicyLens services and their data remain separate. Their two HTTPS
hosts returned 200 after adding this host. No existing application was restarted.
Local browser control remains disabled in Work settings, including Edge;
deployment used the existing verified SSH identity instead.

## Deployment procedure

Initial scripts are `oracle-prepare.sh`, `oracle-install.sh`, and
`oracle-https.sh`. They deliberately reject an existing installation rather than
overwriting it. `oracle-embedding-prepare.sh` verifies model/runtime SHA-256
digests before extracting. Install the matching service unit and verify latency
before enabling it in the website environment.

CI uploads `runtime-linux-x64` after checks and the Next production build. Download
the artifact through authenticated GitHub access, verify its metadata and tar
digest, and copy the tar to `/home/ubuntu/open-scripture-runtime.tgz`. Never put
a GitHub token in the artifact or host environment. The initial artifact came from
run 40124933398; later releases are recorded in the repository history.

For updates, run `oracle-upgrade.sh EXPECTED_TAR_SHA256` as root. It stages the
runtime, backs up the independent database, retains the previous code, restarts
only this website and checks health. If health fails it restores the previous code.
It does not silently roll back data. Review migrations and backup compatibility
before any future destructive schema change. Caddy and the model need no restart
for a website-only upgrade.

The semantic index was precomputed with the exact pinned model and indexed-text
hashes. A verified data-only transfer loaded 6,936 eligible vectors; SuttaCentral
editions are excluded. `pnpm index:embeddings` can rebuild missing/changed vectors,
but bulk inference should use a separate capable machine rather than this shared
1 GB host. Changed text cannot use a stale vector.

## Verified checks

The initial live release passed 14 public-site browser flows, including mobile
accessibility, offline network-disabled reading, history, Study and error reports.
The separate deployed model test passed semantic retrieval of BG 2.62, cited Ask,
follow-up, history reload, accessibility and source-use exclusion (48.2 seconds).
A direct embedding query returned a normalized 1024-dimensional vector in six
seconds; a direct cited Groq answer completed in 1.2 seconds. These are observations,
not latency or model-quality guarantees.

PostgreSQL report persistence survived a website-service restart. A custom-format
backup restored to an isolated test database with 7,359 passages, 1,123 original
translation records and the labelled test report; the temporary database was
removed afterward. A new backup is taken before each runtime upgrade. Keep a
verified copy off the host; owner-managed periodic retention is recommended.

Latest translation-comparison/privacy UI upgrade checks are recorded in
`docs/acceptance.md`. Final real-time acceptance belongs to the owner.

## Operations

Health: `/v1/health` reports data count, database connection, model readiness and
index coverage. Inspect `systemctl status open-scripture open-scripture-embedding`
and `journalctl -u open-scripture`; application request-body logging is disabled.
Stop only the embedding service if it causes resource pressure. Word/reference
search and reading continue; meaning search states its availability honestly.

Back up with `sudo -u postgres pg_dump -Fc scripture` into a root-only directory.
Restore to a different database first and verify counts, sources and a known
report before any disaster recovery. Browser history and learning progress stay
on the device and are not part of the server database backup.
