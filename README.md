# Open Scripture

A free, open-source college website for scripture reading and quotation checking.
The former Gita lookup is preserved in `legacy/` until the M2 acceptance checks pass.
This is an implementation in progress. The [finalized website scope](docs/FEATURE_SCOPE.md)
records the maintainer's later decisions and takes precedence over extra channels
and business operations in the original PDF.

## Current working slice

- 700 Sanskrit Gita passages, Roman transliteration and 700 Annie Besant translations.
- 6,236 verbatim Tanzil Uthmani Quran verses (Arabic only), and 423 Dhammapada
  verses (Pali and Bhikkhu Sujato's English translation), with edition-specific references.
- Next.js reader with database-derived chapter/verse counts, permalinked passages,
  surrounding context, exact/fuzzy search, wording and attribution checks.
- Full source/license records, Unicode/verbatim data checks, separate text/translation labels,
  anonymous reports and reviewer-gated public corrections.
- Strict TypeScript, Fastify REST API and OpenAPI; PostgreSQL pg_trgm/pgvector schema.
- No live scripture API calls when reading, no trackers, no generated scripture.
- Three destinations: Explore, Read, Study; one Explore composer and optional history drawer.
- Browser-local conversations with reopen/search/rename/delete/pause controls, real
  learning-activity calendar, read marks, streaks and saved passages.
- Browser speech input with consent/transcript review and local explanation voices.
  Hide/reveal recall, word-difference feedback, spaced reviews, daily reading plans,
  and classroom sets shared as reference-only URL fragments.
- Optional connection graph/list and cross-tradition keyword trails, with source
  order kept distinct from automatic wording suggestions.
- Downloadable editions with a cached offline reader and exact/reference search.
  One attributed human recording of the complete Al-Fatiha is available online.

The original [implementation plan](docs/build-plan.md) remains a reference. See
[acceptance status](docs/acceptance.md). Semantic retrieval, meaning-based verdicts,
additional imported editions, generated cited answers, semantic retrieval and live
deployment remain unfinished.
MCP, WhatsApp and separate client apps are excluded by the maintainer's later scope.
Human evaluations, printed-edition samples and named reviewers are not fabricated.

## Run locally

Node 22 and pnpm 11.25.0:

```powershell
corepack enable
pnpm install --frozen-lockfile
$env:DATABASE_MODE='pglite'
pnpm db:migrate
pnpm ingest all
pnpm dev
```

Open http://127.0.0.1:3100. Explicit embedded PostgreSQL is for local development.
Alternatively set DATABASE_URL for PostgreSQL 16 with pg_trgm and pgvector.
Connection failure never selects a different database.

```sh
POSTGRES_PASSWORD=local-development-password docker compose -f infra/docker-compose.yml up -d
```

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm data:check`, `pnpm build`.
Start the app, then `pnpm test:e2e` for Chromium regression tests.
Offline tests require the built shell: stop dev, run `pnpm build`, then
`pnpm preview` with local PGlite configured. Preview binds to loopback only;
deployment uses `pnpm start` and requires PostgreSQL.
`pnpm check:all` additionally requires the real human evaluation sets; while those
are missing, `pnpm eval` returns exit 2. A technical CI pass does not pass those gates.

## Licensing

Code AGPL-3.0-only; original interface/notes CC BY-SA 4.0. Third-party data retains
its own license, attribution and provenance. See [licenses](docs/licenses.md).
The ancient Sanskrit text and a particular modern transcription are distinct rights.

## Deployment

Render/Oracle deployment preparation and verified live state are tracked in
[infra/README.md](infra/README.md). No deployment is claimed until HTTPS and the
live data/report persistence checks pass. Never commit environment secrets.
