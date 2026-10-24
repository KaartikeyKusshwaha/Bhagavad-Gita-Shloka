# College website acceptance ledger

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
