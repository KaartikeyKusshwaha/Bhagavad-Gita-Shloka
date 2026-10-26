# Render deployment

Live site: https://open-scripture.onrender.com (service `srv-dbfhsp0ae00c7385lq2g`).
The initial deployment, `dep-dbfhsp8ae00c7385lrm0`, runs commit
`99ee9c0fa0865d93b1de12d44aba0cdb3becf2fd`. Both the service and the Neon database
were created on Free plans in Singapore. The old Oracle website URL redirects here;
its web service is stopped and disabled, and its database backup is retained.
Oracle continues to run the existing Qwen embedding model behind a separate HTTPS
gateway. Only authenticated health and embedding requests are allowed; no public
model UI or inference endpoint is exposed. Groq continues to handle Ask/Verify.

Migration preserved 140 works, 120,858 passages, 39,154 translations, all 3 accounts,
private reading records, 6,936 vectors, 2 cached WAVs and speech usage counters.
Database TLS certificate validation was checked. Statistics were refreshed after
restore. A final private-data synchronization preceded redirecting the old URL.
Fourteen live Edge browser checks passed on the initial Render deployment. Both
audio providers returned migrated cache HITs with byte-identical SHA-256 hashes.

The Verify evidence-limit fix is live at application commit
`a140e22317b5f3dfa92444a66d6829cac8a3067e`, Render deploy
`dep-dbfig4ec6qcc739rhc9g`, completed 2026-10-26 at 15:46:59 IST. CI run
`40304358650` passed 62 unit/API tests and all 27 browser flows. The public site
was tested using the Edge browser extension with an isolated QA account. The
reported historical claim returned a real model evidence-limit explanation that
survived a full reload of account history. Real semantic retrieval found BG 2.62;
Groq's initial BG 2.47 answer and contextual follow-up both cited that passage.

After redeployment, English and Sanskrit audio returned HIT with the same bytes
as before migration: SHA-256 `029a9198aeeca8695cafbcd055c7ecdf8ea4d261565be859bcb665e1d4a5e536`
and `455d5f8d1d9401a307b3c9354e0466db67a94fe2c4bb090571c77923bd737a0c`.
The replay check left provider counters unchanged. Owner pronunciation review is
still required; playable synthesized audio is not editorial or liturgical signoff.

`render.yaml` records the reproducible service configuration. Secrets remain in the
hosting environment and ignored local migration files, never in this repository.

Use the existing `codex/open-scripture-platform` branch. Node is pinned to
22.23.4, and Corepack uses the package's pinned pnpm version. The custom Fastify
server serves both `/v1/` and Next pages. Do not deploy only the frontend.
The host must bind `0.0.0.0`, and Render supplies `PORT`. Health is `/v1/health`.
Render's forwarded-header handling is already enabled when `RENDER` is set.

Keep database credentials and provider keys in Render environment variables.
Import the existing PostgreSQL database with accounts, private reader data,
source records, vectors, speech cache and provider usage counters intact. Use TLS
with certificate validation for the external connection. Preserve the provider
limits; a hosting migration must not reset lifetime speech usage.

Before switching the advertised URL, check database row counts, sign-up/sign-in,
member-only routes, Next reading progress, bookmarks and Study grid persistence,
cited Groq responses and original-language audio. Confirm existing cached audio
returns the same bytes after a service restart without increasing provider usage.
An embedding URL pointing at `127.0.0.1` cannot be reused on Render. The protected
HTTPS gateway was tested with a real 1,024-dimensional response and public health
reports both semantic retrieval and Groq ready. Keep its server-only credential.

Render Free sleeps after 15 minutes idle and shares 750 monthly instance hours
across the workspace. SentinelOps already exists in this workspace. Do not change
its service or select a paid plan. Render Free PostgreSQL expires after 30 days;
it is unsuitable for this project's persistent account database. Neon currently
lists a no-card Free plan with 1 GB per project and 100 CU-hours per month.
Recheck the account's actual limits during setup. No paid plan is authorized.

References checked 2026-10-26: https://render.com/docs/free,
https://render.com/docs/blueprint-spec, https://render.com/docs/node-version,
https://neon.com/pricing.
