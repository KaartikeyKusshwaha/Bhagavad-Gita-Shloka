# Deployment status and operating notes

Target: Render or Oracle, as requested. Deployment is not yet verified.
Render was signed in during initial discovery. Local browser access was subsequently
disabled in Work settings, preventing dashboard actions. No Render API credential is
configured locally. The previously known Oracle VM at 129.225.76.232 timed out on SSH.
Neither existing application has been modified.

Production requires PostgreSQL 16 with pg_trgm and pgvector, DATABASE_URL,
ADMIN_TOKEN, RATE_LIMIT_SECRET, HOST=0.0.0.0 and PORT set by the host.
Use certificate-verified TLS for external database connections. Never disable TLS
verification. Migrations and first seed run before serving. Back up before upgrades.

Render build: `corepack enable && pnpm install --frozen-lockfile && pnpm build`.
Start: `pnpm start`. Health path: `/v1/health`.
Render free compute may sleep; its free PostgreSQL expires after 30 days. Choose a
durable external database or explicitly treat that database as a dated pilot.

Oracle: separate Unix service/user, PostgreSQL database/role and loopback listener;
HTTPS through a reverse proxy. Do not reuse another application's database or keys.
Keep daily pg_dump backups off the host and test restoration to an isolated database.

Do not enable paid services or billing upgrades without an explicit budget.
Budget alerts should be set at the hosting account's monthly free-tier limit or at
an owner-approved amount. No unattended paid worker or spend is configured.
