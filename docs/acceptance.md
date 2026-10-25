# College website acceptance ledger

## Required Groq assessments and reading sessions · 26 October 2026

Deployed functional commit `05675a52b99797272210fef73f487306bbf7c056`.
Technical checks run `40236872973` passed lint, TypeScript, 48 code/API tests,
source integrity, production build and all 23 browser flows (1.1 minutes).
Source checks retain 120,858 passages and 39,154 human translation records;
independent editorial signoff remains pending.

Live Groq `openai/gpt-oss-20b` returned 200 with validated evidence IDs for
Gita claim verification, Genesis creation verification, an Ask question and a
follow-up about avoiding work. Measured requests took 19.8, 1.6, 1.7 and 1.9
seconds respectively during deployment warmup; these are observations, not SLAs.
The final public browser checks passed both real Verify/history and account-saved
reading minutes, pause/hidden-tab exclusion, bookmarks and reader preferences
(20.4 seconds). An earlier smoke test ran during the restart and could not read
health capabilities; it was rerun successfully after the upgrade reported healthy.
The temporary smoke account that could not delete during restart was subsequently
identified by its exact QA username and name and deleted using its own password.

Artifact `12615541909`, ZIP SHA-256
`6e1af70b1f552e3a67a2dfcd783b94cba3b2b08affbaa05f41714c42097c4c07`.
Runtime SHA-256
`b6cdaa4ee04ef1801d3505c29bd396ec6632e5ab89f5fbb4f37d53fb6c6d4c8c`.
A database backup preceded the upgrade. Previous code retained at
`/opt/open-scripture-previous-20261025T215919Z`. Post-upgrade health returned 200
with actual AI readiness and indexed coverage. Final owner acceptance remains pending.

## Expanded library release · 25 October 2026

Commit `32a0b11d7463e4f1f59373305e93baed4f9303d2` passed Technical checks
run `40140307298`: lint, TypeScript, 33 automated tests, full database/source
integrity, production build and 18 browser flows (42.2 seconds). The source gate
also passed. Database checks report 140 works, 120,858 passages/reading blocks and
39,154 human translation records. Exact coverage and source limitations are in
[LIBRARY_COVERAGE.md](LIBRARY_COVERAGE.md).

Live Oracle checks opened real passages from all 12 newly represented traditions
alongside the existing Islamic collection. Groq returned a cited Genesis 1.1
answer, a cited follow-up, and a separately labelled unreviewed Hindi study
translation. The existing live model browser regression passed in 54.3 seconds,
covering meaning search, cited Gita follow-ups, history reload, accessibility and
restricted-source exclusion. These are technical checks, not translation-quality
or theological validation. Final owner acceptance remains pending.

The initial VM import completed, but statistics maintenance exceeded the standard
10-second query limit once and caused one startup restart. Maintenance now has a
transaction-local 120-second timeout; public query limits remain unchanged.
Follow-ups reuse cited evidence and selected-work fuzzy filters apply before
ranking. No paid service or hosting upgrade was added.

The later user-approved scope in [FEATURE_SCOPE.md](FEATURE_SCOPE.md) controls delivery. The PDF remains reference material; its business formation, reviewer organisations, WhatsApp, MCP, extensions and separate Android app are excluded. Automated checks do not constitute scholarly approval.

| User functionality          | Current evidence                                                                                                                                                                                   | Remaining limits                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Simple website              | Explore / Read / Study; responsive built-site flows and accessibility scans                                                                                                                        | Final owner usability test                                             |
| Multi-faith reading         | 700 Gita with two English editions and comparison, 6,236 Quran Arabic, 423 Dhammapada Pali/English; actual chapter/verse counts, references, context                                               | Further traditions use labelled free source hosts                      |
| Source integrity            | License records, bundle hashes, all-passage markup checks, verbatim Tanzil line hash                                                                                                               | Independent printed-edition review not claimed                         |
| Exact/fuzzy/semantic search | Real PostgreSQL/PGlite tests; deployed Qwen index of 6,936 eligible passages and actual live browser test                                                                                          | Meaning quality experimental; SuttaCentral excluded from models        |
| Quotation checks            | Exact wording and attribution checks with visible evidence                                                                                                                                         | No automatic theological/contextual certainty                          |
| Ask/follow-up               | Actual local Qwen and deployed Groq answers, previous-question/passage context, reload and history test                                                                                            | Free-tier quotas; owner quality assessment                             |
| Browser voice               | Consent and transcript-before-send test; local device explanation voices                                                                                                                           | Actual microphone/language/device quality needs owner testing          |
| Human audio                 | One licensed complete Al-Fatiha recording, scope/source labels, live playback at 49.824 seconds                                                                                                    | Further recordings and recitation review                               |
| Graph/themes                | Graph/list, filter, preview/follow; cited cross-tradition keyword trails                                                                                                                           | No scholarly xref dataset imported; adjacency and suggestions labelled |
| Study                       | Real daily plan, explicit completion, word-order quiz, recall alignment, spaced review, progress                                                                                                   | Device-local data; no pronunciation assessment                         |
| Classroom/sharing           | Reference-only share links, recipient reconstruction, print view, attributed PNG                                                                                                                   | No class-management system or accounts                                 |
| History/tracker             | Reopen/search/rename/delete/pause; real-action heatmap/streaks; keyboard/mobile checks                                                                                                             | No cloud sync; storage eviction possible                               |
| Offline                     | Downloaded edition/source pack; actual network-disabled reload, exact/reference search and navigation fallback                                                                                     | Audio, Ask, reports and external hosts need internet                   |
| Deployment                  | Oracle HTTPS, separate Node/PostgreSQL service, all 15 deployed browser flows, actual-model browser run, persistence through upgrades, successful isolated core-backup restore and off-host copies | Final owner test                                                       |

Final technical checkpoint: functional commit `236b3baf2667a19ce884b40b89b1a2f9d941dfc8`, CI run `40128816043` passed TypeScript, ESLint, 28 backend/unit tests, repeated PostgreSQL 16 migrations, imports, data integrity, production build and 15 browser flows. The final public deployment passed all 15 browser flows in 1.9 minutes and its separate actual-model Ask/semantic flow in 55.7 seconds. These two public runs overlapped. Live database: 7,359 passages, 1,823 translation records, 6,936 vectors and three explicitly labelled test reports. Both services remained active with zero automatic restarts; the two pre-existing application hosts still returned 200.

Live simultaneous backend checks returned graph connections in 3.1 seconds, cross-tradition theme results in 1.8 seconds and meaning results in 11.1 seconds, all HTTP 200. The small free VM is suitable for the college demo; these measurements are not throughput or latency guarantees. The selected-edition PNG was also downloaded from the public site and visually checked for text, translator and source credits.

The restored off-host core backup contains all passages/translations and the two test reports present before the last browser run. Rebuildable vectors are excluded from that core backup and retained in a separate checksum-verified off-host bundle. No private environment credentials are in the repository. Owner steps are in [OWNER_TEST.md](OWNER_TEST.md).

The optional human benchmark remains unprovided. pnpm eval reports pending and exits 2 without real reviewed files; CI uses --allow-pending and claims no score. Do not fabricate scripture samples or human reviews. Final real-time acceptance belongs to the owner.

Gita edition decisions: Besant 1922 chapter 13 verses 2–35 map to platform BG 13.1–34. Printed marker errors are parsed from adjacent source numbering without generating words. Quran display strings preserve downloaded Unicode order; normalization is a separate search column. Full provenance and decisions are under docs/decisions.

## Reader accounts deployed, 2026-10-25

Functional release `b115a8ec4756201f3cc90e1661724067413ed150` adds free private
username/password accounts at `/account`, with personal Study dashboards and
synchronized bookmarks/notes, deliberate reading progress and places, reading plans,
revision cards, activity and saved Explore conversations. Guest import is explicit.
Recovery uses a one-time code rather than email. Live account deletion cascades to
sessions and private saved data; historical database backups require retention care.

CI run 40197918356 passed lint, strict types, 37 code/API tests, migrations, source/data
checks, production build and all 19 browser tests. Runtime artifact 12600219871 was
verified before extraction: ZIP SHA-256
`4646a738545e78cde30fac1918ff7e716b5a794a9ef98588b921733bfbb73b09`;
runtime tar SHA-256
`5984ffb4556e81a3d7a89be9cf5440ebf83bc27bb5d069de8f60cd361d8da12f`.
The upgrade took a database backup and retained previous code at
`/opt/open-scripture-previous-20261025T133646Z` before starting the healthy release.

A live isolated-browser account test passed (30.5 seconds), including explicit guest
import, second-browser access to bookmarks, reading progress, plans and history,
sign-out isolation and permanent deletion. Its test account was removed. The live
search assertion allows 20 seconds for a cold Oracle request; this is a test deadline,
not a response-time guarantee. The service had zero automatic restarts and a measured
memory peak of 268,955,648 bytes after the first live account exercise. Final owner
acceptance remains pending.

## Email access deployed, 2026-10-25

Release `7dce1f1a294ce4f765d87a199593a889403a795d` adds independent Sign in / Sign up
links and routes, email/password registration, and email-first routing to signup
for unused addresses. Username accounts remain compatible. CI 40204480488 passed
41 code/API tests, source checks, build and 20 browser tests (49.3 seconds); the
local full browser suite also passed 20 tests. Two public-site account tests passed
in 1.1 minutes, covering signup, email routing, existing-email signin, wrong-password
handling, cross-browser saved data, guest import, signout and deletion.

Oracle runtime SHA-256:
`8afe421705354705cb6a6c6eece1dbd69355205b54dd308c0cb47e7aa45d2b89`.
CI ZIP artifact 12603246980 SHA-256:
`41e9102d29cf63589c50cf864ac9cc47932be59b62eaca291a8bbdad64a67c5b`.
The upgrade took a database backup; previous code is retained at
`/opt/open-scripture-previous-20261025T150249Z`. Health passed with zero automatic
restarts at verification. Google OAuth code and protocol tests are included but
Google is not enabled in production: project `open-scripture` was created without
billing, then browser access was disabled before the consent form and OAuth client
could be completed. No Google login success is claimed.

## Visible startup access and reader profiles deployed, 2026-10-25

Functional commit `419a43b62607bcc5378e19f9f7ba3bdb1dd497b1` adds the startup guest
welcome card with distinct Sign up, Sign in and Continue as guest controls. The
choice to continue as a guest lasts for the browser session; header account links
remain available. Signed-in users have an explicit Profile menu, identity details,
dashboard/account links and signout. Study and account pages show a profile card.

CI 40206913723 passed 41 code/API tests and all 21 browser tests (49.8 seconds),
including startup access, profile details, private synchronization and mobile axe
checks. Six focused local tests passed. All three live account tests passed in
1.4 minutes after deployment. Runtime SHA-256:
`2e8ea2a5d28e26d79b6e7ea90e57a0f454a1033b560111e13792675f1bc270c0`.
Artifact 12603829386 ZIP SHA-256:
`8df82c24785517f4272d7417df7bf420e8c96673fcdba45c4ac6581293afac1e`.
The upgrade took a database backup and retained previous code at
`/opt/open-scripture-previous-20261025T153208Z`. Google sign-in remains disabled
per the owner's instruction to finish email access only.

## Member access and maroon palette deployed, 2026-10-25

Functional release `30356a0836d204fd037f763d81ffc61b80bafbef` requires sign-in for
Explore, Read and Study and their reader API endpoints in website mode. Guests
are redirected to the native signup/signin dialog; protected page content is not
served behind it. Reader responses are no-store. Deep maroon/red is the default
appearance; a light rose alternative remains in Reading settings.

CI 40209465987 passed 42 code/API tests, source checks, production build and all
21 browser checks (50.4 seconds). The local browser run passed 20 checks and its
remaining keyboard timing check passed after explicitly waiting for account load.
All three public-site account/access tests passed in 48.7 seconds, including direct
URL/API denial, signup/signin, cross-browser private data, signout, maroon palette
and mobile accessibility. Test accounts were cleaned up.

Runtime SHA-256: `7f5c4b3cc1aa95e02d5f157b46abafe96c97b796a71a07d1690cf5b70221bdc7`.
Artifact 12604318811 ZIP SHA-256:
`503ae43232059a45c8c0357149b412667991130a57f09ab6b2486aa7df599837`.
A database backup preceded the upgrade. Previous code is retained at
`/opt/open-scripture-previous-20261025T160442Z`. Public health returned 200; the
service had zero automatic restarts at verification. Already downloaded public
copies cannot be revoked through website authentication; see decision 014.
