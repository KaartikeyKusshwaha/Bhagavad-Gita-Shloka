# Open Scripture

A free, open-source college website for scripture reading and quotation checking.
The former Gita lookup is preserved in `legacy/` for reference.
This is a college-project beta. The [finalized website scope](docs/FEATURE_SCOPE.md)
records the maintainer's later decisions and takes precedence over extra channels
and business operations in the original PDF.

Live website: https://open-scripture.onrender.com. Deployment uses Render Free,
Neon Free PostgreSQL and the existing protected Oracle embedding runtime;
see [deployment notes](infra/RENDER.md). Render Free can sleep while idle.

## Current working slice

- 140 works across 13 traditions: actual imported text, religion shelves, text and
  language filters, and paginated reading. See [edition coverage](docs/LIBRARY_COVERAGE.md)
  for the exact books, language availability, source limitations and search coverage.

- 700 Sanskrit Gita passages, Roman transliteration and two attributed English editions
  (Besant and Swarupananda), with optional side-by-side comparison and range labels.
- 6,236 verbatim Tanzil Uthmani Quran verses with ClearQuran English, and 423 Dhammapada
  verses (Pali and Bhikkhu Sujato's English translation), with edition-specific references.
- Next.js reader with database-derived chapter/verse counts, permalinked passages,
  surrounding context, exact/fuzzy search, wording and attribution checks.
- Full source/license records, Unicode/verbatim data checks, separate text/translation labels,
  anonymous reports and reviewer-gated public corrections.
- Strict TypeScript, Fastify REST API and OpenAPI; PostgreSQL pg_trgm/pgvector schema.
- No live scripture API calls when reading, no trackers, no generated scripture.
- Three destinations: Explore, Read, Study; one Explore composer and optional history drawer.
- Free email-or-username/password accounts with private synchronized Study dashboards, recovery
  codes and account deletion. Separate Sign in / Sign up pages route new email addresses to signup. Optional Google sign-in requires a configured OAuth client; it never silently links an existing password account. Explore, Read and Study require sign-in; a signup/signin popup protects their direct links. The default appearance is dark maroon with rose accents.
- Conversations with reopen/search/rename/delete/pause controls, real
  learning-activity calendar, read marks, streaks and saved passages. Bookmarks have
  colours and private notes; explicit read marks provide a Continue reading link.
- Optional, visible saved-conversation context for Ask. Gemini uses retrieved source
  evidence and bounded context for developed cited explanations; conversations do
  not fine-tune the model. Verify assesses meaning separately from quotation
  matching and can retrieve public historical sources through Wikipedia and
  accessible cited reports on selected publishers. Source links, coverage limits
  and qualified verdicts stay with saved answers. See [decision 018](docs/decisions/018-gemini-evidence-research.md).
- Unreviewed study translations in supported languages, requested explicitly and
  disabled for restricted sources; published human editions stay separate.
- Browser speech input with consent/transcript review and local explanation voices.
  Hide/reveal recall, word-difference feedback, spaced reviews, daily reading plans,
  and classroom sets shared as reference-only URL fragments.
- Optional connection graph/list and cross-tradition keyword trails, with source
  order kept distinct from automatic wording suggestions.
- Downloadable editions with a cached offline reader and exact/reference search.
  One attributed human recording of the complete Al-Fatiha is available online.

The original [implementation plan](docs/build-plan.md) remains a reference. See
[acceptance status](docs/acceptance.md). Existing Qwen models provide optional
meaning search and cited Ask/follow-up answers locally. Render uses the protected
Oracle Qwen embedding runtime and Gemini 3.6 Flash for Ask and Verify. Groq remains
an explicitly selectable provider; errors do not switch providers automatically.
See the deployment record for actual checks and free-tier limitations.
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
For the optional model setup, see [the model decision](docs/decisions/008-existing-local-models.md).
`pnpm test:models` exercises actual models and is separate from provider-free CI.
`pnpm check:all` additionally requires the real human evaluation sets; while those
are missing, `pnpm eval` returns exit 2. A technical CI pass does not pass those gates.

## Licensing

Code AGPL-3.0-only; original interface/notes CC BY-SA 4.0. Third-party data retains
its own license, attribution and provenance. See [licenses](docs/licenses.md).
The ancient Sanskrit text and a particular modern transcription are distinct rights.

## Deployment

[Open Scripture is hosted on Oracle](https://scripture.129-225-126-21.sslip.io/).
Verified state and operating notes are tracked in [infra/README.md](infra/README.md).
Never commit environment secrets.

The technical implementation is ready for [final owner testing](docs/OWNER_TEST.md).
