# Render migration

The requested target is a separate Render Free Node web service in Singapore,
with persistent PostgreSQL on Neon Free. `render.yaml` records the configuration;
it does not prove that a deployment exists. Deployment and migration verification
must be recorded after the service is live.

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
An embedding URL pointing at `127.0.0.1` on Oracle cannot be reused on Render.
Resolve and test the embedding service separately before claiming parity.

Render Free sleeps after 15 minutes idle and shares 750 monthly instance hours
across the workspace. SentinelOps already exists in this workspace. Do not change
its service or select a paid plan. Render Free PostgreSQL expires after 30 days;
it is unsuitable for this project's persistent account database. Neon currently
lists a no-card Free plan with 1 GB per project and 100 CU-hours per month.
Recheck the account's actual limits during setup. No paid plan is authorized.

References checked 2026-10-26: https://render.com/docs/free,
https://render.com/docs/blueprint-spec, https://render.com/docs/node-version,
https://neon.com/pricing.
