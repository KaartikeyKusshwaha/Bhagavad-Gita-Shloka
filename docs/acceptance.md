# Acceptance evidence and remaining scope

The table below tracks the original PDF. The latest college-website scope in
[FEATURE_SCOPE.md](FEATURE_SCOPE.md) supersedes its excluded channels and business
operations. Technical checks do not prove editorial, language, human-review or
deployment requirements. Current history/activity checks are in tests/e2e/explore-study.spec.ts.

| Milestone | Evidence so far | Remaining acceptance |
| --- | --- | --- |
| M0 | workspace, strict TS, Fastify/Next production build, SQL migration tests | clean PostgreSQL 16 CI, Compose startup, governance files |
| M1 | 700 verses and 700 human translations; complete source records; negative license checks | independent printed-edition samples; legacy draft archive; human signoff |
| M2 | local reader flow, per-chapter counts, context, source footer and report API | Lighthouse >=95, low-bandwidth/page weight, deployed browser checks; retain legacy until passed |
| M3 | exact, pg_trgm fuzzy, Roman Sanskrit matching | BGE-M3 worker/1024 vectors, RRF integration, Hindi/Hinglish expansion, 50-case human eval and 50k performance gate |
| M4 | six pipeline boundaries, exact/misattributed wording checks, quote guard | full semantic verdicts, LLM integration, 60 human claims, 500-output quote audit |
| M5 | shared multi-tradition schema | source importers, licenses, per-work samples and five searchable traditions |
| M6 | ±5 passages of context, translation layer | additional translations, commentary, themes and xrefs with reviewed sources |
| M7 | refusal states for unavailable providers | actual speech/translation providers, native language evaluation, licensed human audio, WhatsApp and share cards |
| M8 | pending | extension, offline packs, Android build and required device/manual checks |
| M9 | durable reports and named-reviewer correction API | reviewer UI/appointments, correction e2e, dual approval tracker, scholar queue, caption reports, lessons and aggregate admin UI |

The maintainer's non-profit legal setup, permissions and appointment of people are
explicit owner tasks in the plan. No endorsement or legal formation is claimed.

## Imported-edition decisions

- Sanskrit/IAST: attributed Sanatan CC BY-SA structured copy of Sanskrit Wikisource.
- English: parsed directly from Wikisource's Besant 1922 discourse pages, rather than
  filling the 53 missing translations in the bulk mirror with generated text.
- Chapter 13 uses the 700-verse reference system. Besant 13.2–35 maps to BG 13.1–34.
- Printed marker errors (3.42, 10.31, 17.19, 18.14 and 18.32) are parsed using their
  existing text and adjacent Sanskrit numbers. No verse wording is generated.
- A markup leakage bug was caught in mobile QA and fixed using BeautifulSoup;
  all 700 translations now receive a negative markup/metadata regression check.
