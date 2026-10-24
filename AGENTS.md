# Open Scripture college website

The latest user-approved scope is in docs/FEATURE_SCOPE.md. The PDF in
docs/build-plan.md is the original reference; subsequent user instructions take
precedence. This is an overhaul of the existing college project, not a new business.

## Product rules

- Website only. Three main destinations: Explore, Read, Study. Keep one focused
  task on screen; contextual tools and history open on demand. Do not add MCP,
  WhatsApp, a separate extension or a separate Android application.
- Integrate free scripture sources where reuse is permitted. A source catalogue
  or external link is not a completed searchable corpus. State actual coverage.
- Preserve original text and edition attribution. Never generate missing scripture
  or silently machine-translate it. The maintainer now explicitly permits optional
  machine-assisted study translations: label them unreviewed, keep them separate
  from human editions, and honor each source's model/derivative restrictions.
  Show evidence before AI interpretation.
- Distinguish exact wording, suggested similarity and sourced cross-references.
  Do not claim automatic scholarly certainty or rank religious traditions.
- Use available models and services; no paid subscription or hosting upgrade
  without a user-approved budget. Surface provider failures honestly.
- User-requested Explore history and Study activity stay in this browser by
  default. Support pausing, deleting and clearing. Do not send raw history to
  analytics or add account/cloud synchronization without user authorization.
- Activity reflects real submitted queries and explicit read/practice actions;
  never seed fake streaks or count page loads as learning.

## Working practices

Use Node 22, pnpm, Next.js, Fastify and PostgreSQL. Production database connection
failure must stop startup; explicit PGlite mode is for local development/tests.
Meaningful checks: pnpm typecheck, pnpm lint, pnpm test, pnpm data:check, pnpm build,
and pnpm test:e2e against an owned local server. Never build and run Next dev in
the same .next directory simultaneously. Browser tests use isolated profiles.
Do not manufacture human-written evaluation sets or printed-edition signoff.
Do not commit secrets, personal history, local databases or generated test reports.
