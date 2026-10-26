# Stack and deployment

Retain TypeScript/pnpm, Next.js App Router, Fastify and PostgreSQL.
One Fastify process serves the API and Next.js on Render on one origin.
Production requires an explicit DATABASE_URL; connection failures stop startup.
Use PostgreSQL 16 with pg_trgm and pgvector. Docker Compose remains reproducible.
Docker is absent on the operator's Windows machine. Local SQL tests use explicit
PGlite with actual pg_trgm/vector extensions. This does not prove the Docker or
PostgreSQL 16 gate; CI must record that gate separately.

Human evaluation data, printed-edition sample signoff, advisory reviewers and
language approvals cannot be manufactured. Track those as pending acceptance;
never generate expected verdicts and claim human review.
