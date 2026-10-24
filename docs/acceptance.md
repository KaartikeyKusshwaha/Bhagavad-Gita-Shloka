# College website acceptance ledger

The later user-approved scope in [FEATURE_SCOPE.md](FEATURE_SCOPE.md) controls delivery. The PDF remains reference material; its business formation, reviewer organisations, WhatsApp, MCP, extensions and separate Android app are excluded. Automated checks do not constitute scholarly approval.

| User functionality | Current evidence | Remaining limits |
| --- | --- | --- |
| Simple website | Explore / Read / Study; responsive built-site flows and accessibility scans | Final owner usability test |
| Multi-faith reading | 700 Gita with two English editions and comparison, 6,236 Quran Arabic, 423 Dhammapada Pali/English; actual chapter/verse counts, references, context | Further traditions use labelled free source hosts |
| Source integrity | License records, bundle hashes, all-passage markup checks, verbatim Tanzil line hash | Independent printed-edition review not claimed |
| Exact/fuzzy/semantic search | Real PostgreSQL/PGlite tests; deployed Qwen index of 6,936 eligible passages and actual live browser test | Meaning quality experimental; SuttaCentral excluded from models |
| Quotation checks | Exact wording and attribution checks with visible evidence | No automatic theological/contextual certainty |
| Ask/follow-up | Actual local Qwen and deployed Groq answers, previous-question/passage context, reload and history test | Free-tier quotas; owner quality assessment |
| Browser voice | Consent and transcript-before-send test; local device explanation voices | Actual microphone/language/device quality needs owner testing |
| Human audio | One licensed complete Al-Fatiha recording, scope/source labels, live playback at 49.824 seconds | Further recordings and recitation review |
| Graph/themes | Graph/list, filter, preview/follow; cited cross-tradition keyword trails | No scholarly xref dataset imported; adjacency and suggestions labelled |
| Study | Real daily plan, explicit completion, word-order quiz, recall alignment, spaced review, progress | Device-local data; no pronunciation assessment |
| Classroom/sharing | Reference-only share links, recipient reconstruction, print view, attributed PNG | No class-management system or accounts |
| History/tracker | Reopen/search/rename/delete/pause; real-action heatmap/streaks; keyboard/mobile checks | No cloud sync; storage eviction possible |
| Offline | Downloaded edition/source pack; actual network-disabled reload, exact/reference search and navigation fallback | Audio, Ask, reports and external hosts need internet |
| Deployment | Oracle HTTPS, separate Node/PostgreSQL service, full 14-flow deployed browser run, live model browser run, persistence through restart, successful isolated backup restore | Latest comparison/privacy UI upgrade validation in progress; final owner test |

Checkpoint baseline: 28 backend/unit tests, 14 previously passing deployed browser flows, one new comparison browser flow under validation, and a separate passing deployed actual-model Ask/semantic browser test. CI tests PostgreSQL 16, repeated migrations, imports, data integrity and the production build. Inspect the latest run output before claiming a fresh pass.

The optional human benchmark remains unprovided. pnpm eval reports pending and exits 2 without real reviewed files; CI uses --allow-pending and claims no score. Do not fabricate scripture samples or human reviews. Final real-time acceptance belongs to the owner.

Gita edition decisions: Besant 1922 chapter 13 verses 2–35 map to platform BG 13.1–34. Printed marker errors are parsed from adjacent source numbering without generating words. Quran display strings preserve downloaded Unicode order; normalization is a separate search column. Full provenance and decisions are under docs/decisions.
