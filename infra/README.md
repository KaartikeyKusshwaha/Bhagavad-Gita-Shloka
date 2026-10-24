# Oracle deployment and operating notes

Expanded library release: commit `32a0b11d7463e4f1f59373305e93baed4f9303d2`,
CI `40140307298`, runtime SHA-256
`2ee2421cb7600e948f8b855537e12e1ce87ffc72580a2400e398f414c2fb774a`.
This supersedes the earlier three-work coverage below: the database now contains
140 works, 120,858 passages/reading blocks and 39,154 human translation records.
The original 6,936 meaning vectors remain; the new works use word/reference
retrieval. See `docs/LIBRARY_COVERAGE.md` and the latest acceptance entry.

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

Functional release: commit `236b3baf2667a19ce884b40b89b1a2f9d941dfc8`, CI run
`40128816043`. Runtime tar SHA-256:
`362535408649d419ed644879bbc5301b4ce8101364d6d18bdbd09989fe05937d`.
The final public build passed all 15 browser flows (1.9 minutes), including mobile
accessibility, comparison, graph/themes, offline network-disabled reading, history,
Study and error reports. The separate deployed model test passed semantic retrieval
of BG 2.62, cited Ask, follow-up, history reload, accessibility and source-use
exclusion (55.7 seconds). These runs overlapped.

Graph, source-count and theme queries now scan published text in batches instead
of repeatedly scanning translations for each passage. Simultaneous live backend
checks returned graph connections in 3.1 seconds, themes in 1.8 seconds and meaning
search in 11.1 seconds, all HTTP 200. Both services had zero automatic restarts.
These are observations, not latency, throughput or model-quality guarantees.

PostgreSQL reports survived service restarts and runtime upgrades. A core backup
restored to an isolated database with 7,359 passages, 1,823 translation records
and the two labelled test reports present before the final browser run. The
temporary database was removed afterward. Core backup SHA-256:
`10ed1bbc60265911df0194f32179028f04b544981b37bf946854e73366b8818c`.
It excludes rebuildable embedding data, retained in a separate verified off-host
bundle. Both core and vector copies are outside the VM and ignored by Git.
After recovery, reimport that matching vector bundle or rebuild the index.
A full database backup is also taken before each runtime upgrade; owner-managed
periodic retention is recommended.

The complete evidence ledger is in `docs/acceptance.md`. Final real-time acceptance
belongs to the owner; steps are in `docs/OWNER_TEST.md`.

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
