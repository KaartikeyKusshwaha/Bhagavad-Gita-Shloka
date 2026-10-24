## Page 1
Codex Build Plan: Open Scripture Platform
Oct 23, 2026  ·  @KK
1. Mission and ground rules
Codex must build a free, open-source, non-profit platform where anyone can read a
scripture, verify a quote, and understand it, in their own language. These rules override
every other instruction in this plan.
1 . The platform is non-profit and open to all: no paywall, no ads, no tracking for profit, no
account needed to read or verify.
2. License of the code: AGPL-3.0. License of our own content (UI strings, original notes):
CC BY-SA 4.0. Third-party texts keep their own licenses (see rule 7).
3. Text first: the scripture text and its citation are always shown before any AI
explanation.
4. The AI never writes, completes or invents scripture. Every quoted string in any AI
output must exist verbatim in the database, or the output is discarded.
5. No rulings, no ranking of religions, no polemic or attack content, no claims of which
tradition is true.
6. Every tradition is treated with the same code path and the same tone. No tradition
gets special-case prompts that favour or disfavour it.
7. Each text and translation has a license record (license, source URL, commercial-use
flag, attribution, retrieval date). A text without a record is never published.
8. Never depend on a live third-party API at request time. Import data, store it in our own
database, and keep the source URL.
9. Voice and personal data: opt-in, minimal retention, deletable. No synthetic voice for
sacred recitation; use licensed human recitations only.
1 0. Distress queries (self-harm, abuse, crisis) show help resources first, before any text.
1 1 . Work in small milestones (section 6). After each one: run tests, update docs, commit.
Do not start the next milestone with failing tests.
1 2. If a decision is ambiguous, write the options in docs/decisions/NNN-title.md , pick
the simplest one that follows rules 1 to 10, and continue.
Codex Build Plan: Open Scripture Platform
Page 1 of 25

## Page 2
2. Current repo state (read from the repo, one commit)
The repo KaartikeyKusshwaha/Bhagavad-Gita-Shloka  is tiny: 8 files, about 6 KB of code,
one commit ("Prepared for Vercel deployment"). It is a Gita-only lookup page.
File What it does Decision
index.js  (1.5 KB) Express 5 server, ES modules. GET /
renders the form. POST /data  calls
https://geeta-
api.vercel.app/shlok/{chapter}
or /{chapter}/{verse}  with axios
and renders the result. Error text:
"Verse does not exist for this
chapter."
Replace. Logic moves
to apps/api  and
reads our own
database, not a live
third-party API.
views/index.ejs Two dropdowns (18 chapters; verses
1 to 78 for every chapter, which is
wrong for most chapters), shows
item.number , item.text ,
item.meaning .
Replace with the
Next.js web app. Keep
the idea: chapter and
verse pickers, but
verse count must
come from the
database.
public/layout.css  (2.4
KB)
Simple styling for the form and
boxes.
Remove after the new
UI exists. Reuse
colour ideas only.
public/HareKrishna.jpg Header photo. Keep in
assets/legacy/ ,
check its license or
remove. Do not ship a
photo of unknown
origin.
package.json name srimad-bhagavad-gita , deps
axios , ejs , express , license field
ISC.
Replace with a pnpm
workspace root.
License becomes
AGPL-3.0.
vercel.json Routes everything to index.js  with
@vercel/node .
Delete. Deploy config
is rewritten in M0.
Codex Build Plan: Open Scripture Platform
Page 2 of 25

## Page 3
Problems Codex must fix, not copy:
The verse dropdown offers 78 verses for every chapter, so most picks return an error.
The site depends on geeta-api.vercel.app  at request time. If it goes down, the
product is down. It also has no license record.
There is no <title> , no search, no tests, no README, no license file, no error handling
beyond one message, no rate limiting.
Keep the one thing that works: pick chapter, pick verse (or all verses), see Sanskrit and
meaning. This becomes the first screen of the Gita reader and its test case.
First commit of the work: move the old code to legacy/  (do not delete yet), so the old
behaviour stays runnable until M2 passes, then delete legacy/  in M2.
3. Target architecture and tech stack
One engine, many front doors. Costs stay low because the data is ours, static pages are
cached, and models run behind a swappable layer.
File What it does Decision
.gitignore node_modules, .env, logs, dist, build. Keep and extend.
package-lock.json npm lockfile. Delete; use pnpm-
lock.yaml .
Codex Build Plan: Open Scripture Platform
Page 3 of 25

## Page 4
target architecture · 4 front doors, 1 API, 1 database
Layer Choice Why
Language TypeScript, Node 22, pnpm
workspaces
One language end to end; you
already know JavaScript.
Web Next.js App Router, PWA, Tailwind Server-rendered verse pages are
fast and shareable.
API Fastify, Zod, OpenAPI Typed, small, easy to document.
Database Postgres 16, pgvector, pg_trgm Exact, fuzzy and semantic
search in one place; no extra
search service.
Embeddings BAAI/bge-m3  (multilingual) in a
small worker
Open weights, handles Hindi,
Arabic, English.
LLM Provider interface in
packages/llm ; any hosted or
open-weight model
Swap by config; non-profit
credits can be used.
Codex Build Plan: Open Scripture Platform
Page 4 of 25

## Page 5
Principle: scripture text is served from the database and cached at the edge; only verify,
ask and speech calls cost money.
4. Repository layout to create
One monorepo (pnpm workspaces, TypeScript everywhere). Create exactly these folders
in M0; fill them in later milestones.
/
├ ─ AGENTS.md                 # section 14, pasted verbatim
├ ─ README.md  LICENSE (AGPL-3.0)  CODE_OF_CONDUCT.md  CONTRIBUTING.md
SECURITY.md
├ ─ legacy/                   # old index.js, views/, public/ (deleted in M2)
├ ─ apps/
│  ├ ─ web/                   # Next.js (App Router) PWA: reader, search,
verify, listen
│  ├ ─ api/                   # Fastify REST API, OpenAPI at /openapi.json
│  ├ ─ whatsapp/              # WhatsApp bot (M7)
│  └─ extension/             # browser extension (M8)
├ ─ packages/
│  ├ ─ db/                    # SQL migrations, typed queries (Drizzle or
Kysely)
│  ├ ─ ingest/                # one importer per source, license gate,
checksums
│  ├ ─ search/                # exact, fuzzy (trigram), semantic (pgvector)
search
│  ├ ─ verify/                # claim parsing, matching, verdicts, quote-
exists check
│  ├ ─ llm/                   # provider abstraction, prompts, guardrails
│  ├ ─ speech/                # STT, TTS, translation, transliteration
adapters
Layer Choice Why
Speech and
translation
Bhashini, IndicTrans2, IndicXlit,
Shruti, Whisper
Open or free for non-commercial
use; see section 9.
Hosting Docker Compose on one small
VPS, plus a CDN in front
Cheapest path; move to
managed services only when
traffic needs it.
CI GitHub Actions Free for open source.
Codex Build Plan: Open Scripture Platform
Page 5 of 25

## Page 6
│  ├ ─ mcp-server/            # MCP tools exposing search, verify, context
│  └─ shared/                # types, language codes, tradition ids, i18n
strings
├ ─ data/
│  ├ ─ sources/               # one YAML per source: license, url, attribution
│  ├ ─ canonical-samples/     # known verses used by tests (e.g. Gita 2.47)
│  └─ eval/                  # verify test set: claims plus expected verdicts
├ ─ docs/                     # decisions/, governance.md, licenses.md, api.md
├ ─ infra/                    # docker-compose.yml, Dockerfiles, deploy notes
└─ .github/workflows/        # ci.yml (lint, typecheck, test), data-check.yml
Codex tasks for M0 on layout:
1 . Create the root package.json  with "private": true , a pnpm-workspace.yaml
listing apps/*  and packages/* , and a root tsconfig.base.json  (strict mode on).
2. Add ESLint, Prettier and Vitest at the root with one shared config.
3. Move index.js , views/ , public/  into legacy/ ; delete vercel.json  and package-
lock.json .
4. Add one package.json  per workspace folder with a placeholder index.ts  and one
passing test.
5. Add .github/workflows/ci.yml  running pnpm install --frozen-lockfile , pnpm
lint , pnpm typecheck , pnpm test .
6. Add LICENSE , README.md  (what it is, how to run it, how to contribute), and
AGENTS.md .
5. Data model (Postgres 16 with pgvector and pg_trgm)
One schema for every tradition. Write these as SQL migrations in
packages/db/migrations/ , in this order.
Table Key fields Purpose
traditions id, slug (hinduism, islam, christianity,
sikhism, judaism, buddhism, jainism,
zoroastrianism, taoism,
confucianism, shinto, bahai, lds,
other), name, board_status
One row per tradition.
Codex Build Plan: Open Scripture Platform
Page 6 of 25

## Page 7
Table Key fields Purpose
sources id, tradition_id, name, url, license,
license_url, commercial_ok (bool),
attribution, retrieved_at, checksum,
version, status (draft, approved,
blocked)
License record. Nothing is
published unless status =
approved.
works id, tradition_id, slug, title,
original_lang, canon_order
A book: Bhagavad Gita, Quran,
Gospel of John, Guru Granth
Sahib, Dhammapada.
divisions id, work_id, parent_id, kind (chapter,
surah, sutta, book, ang), number,
title
Tree of sections inside a work.
passages id, work_id, division_id, ref
(canonical string like BG 2.47 ),
ordinal, original_text, original_script,
transliteration
The verse itself. ref  is unique
per work.
translations id, passage_id, source_id, lang,
translator, text, is_machine (bool)
Many translations per passage.
Machine translations are
flagged.
commentaries id, passage_id, source_id, author,
tradition_school, lang, text
Separate layer, never mixed into
translations.
audio id, passage_id, source_id, reciter,
lang, url, duration_ms, license
Human recitations only.
embeddings passage_id, translation_id, model,
vector (1024)
Semantic search. Rebuilt when
the model changes.
xrefs from_passage_id, to_passage_id,
kind (parallel, quotes, theme),
source_id
Cross-reference graph.
themes id, slug, name_en, name_hi Topics like karma, charity,
forgiveness.
passage_themes passage_id, theme_id, weight Theme tags.
verify_logs id, created_at, claim_hash, verdict,
lang, no raw text unless user opts in
Aggregate stats only.
Codex Build Plan: Open Scripture Platform
Page 7 of 25

## Page 8
Rules for the migrations:
1 . Add a GIN trigram index on passages.original_text  and on translations.text ,
and a full-text index per language.
2. Add a unique index on (work_id, ref)  and on (passage_id, source_id, lang,
translator) .
3. Add an HNSW index on embeddings.vector  using cosine distance.
4. Add a database check: a row in translations  or commentaries  cannot reference a
source whose status is not approved  when the published  view is queried. Create a
view published_translations  for this and make the API read only from the views.
5. Store text as NFC-normalized Unicode. Store the original and the normalized-for-
search form in separate columns ( text , text_norm : lowercase, diacritics stripped,
whitespace collapsed).
6. Add a seed script that loads the 18 Gita chapters from the legacy API as the first
fixture, with a license record for the source; mark it draft  until the license is
confirmed.
7. Add data/canonical-samples/*.json  with at least 5 known verses per loaded work,
copied by a human from a printed edition; ingestion tests compare against them.
6. Milestones M0 to M9 (build in this order)
Each milestone lists numbered tasks, the files to touch, and a done check. Do not skip the
done check.
M0. Foundation (the repo skeleton)
1 . Do the layout tasks from section 4.
Table Key fields Purpose
reports id, passage_id, kind (error, license,
bias), message, status
Report-an-error button.
corrections id, passage_id, report_id, before,
after, approved_by, date
Public corrections page.
misquotes id, claim_text, claimed_work,
verdict, evidence_passage_ids,
published (bool)
Public misquote tracker.
Codex Build Plan: Open Scripture Platform
Page 8 of 25

## Page 9
2. Add infra/docker-compose.yml  with Postgres 16 (pgvector image) and the API.
3. Add packages/db  with a migration runner and migration 001 (traditions, sources,
works, divisions, passages, translations).
4. Add docs/decisions/001-stack.md  recording the stack from section 3.
Files: root configs, packages/db/** , infra/** , .github/workflows/ci.yml . Done
when: pnpm install && pnpm test && docker compose up -d && pnpm db:migrate  all
succeed on a clean clone, and CI is green.
M1. Gita data from our own database
1 . Write packages/ingest/src/sources/gita-api.ts : fetch chapters 1 to 18 and every
verse from the same API the legacy app used ( https://geeta-
api.vercel.app/shlok/{chapter}/{verse} ), once, at import time, with a 500 ms delay
between calls and a local cache in data/cache/ .
2. Normalize to NFC, fill passages  (ref BG {chapter}.{verse} ) and translations , and
write the sources  row with status draft .
3. Add a second Gita source with a clear license (the Gita API repo gita/bhagavad-gita-
api  data, or DharmicData under ODbL) and record its license in data/sources/*.yml .
4. Add the license gate: pnpm ingest publish <source>  fails unless license ,
license_url , attribution  and retrieved_at  are filled; only then set status
approved .
5. Add data/canonical-samples/gita.json  with BG 2.47, 2.48, 4.7, 9.22 and 18.66 typed
in by a human; add a test that compares them to the database.
Files: packages/ingest/** , data/sources/** , data/canonical-samples/** . Done
when: 700 Gita verses exist, SELECT count(*) FROM passages WHERE ref LIKE 'BG %'
returns 700, and the sample test passes.
M2. API plus the Gita reader (replaces the old app)
1 . Build apps/api  with the endpoints in section 7 for works , passages , search/exact .
2. Build apps/web : home page, work page, chapter page, verse page with Sanskrit,
transliteration, and a translation picker. The verse count per chapter comes from the
API, which fixes the 78-verse bug.
3. Add the verse URL pattern /read/{work-slug}/{ref} , for example /read/bhagavad-
gita/BG-2.47 , so each verse is shareable.
4. Add a footer on every page: source name, license, and a report-an-error link.
Codex Build Plan: Open Scripture Platform
Page 9 of 25

## Page 10
5. Reproduce the old behaviour: pick chapter and verse (or all verses) and see Sanskrit
and meaning. Delete legacy/ .
Files: apps/api/** , apps/web/** , delete legacy/** . Done when: Lighthouse
accessibility score is 95 or higher on the verse page and the old flow works with 18
chapters and correct verse counts.
M3. Search (exact, fuzzy, semantic)
1 . Implement exact search: normalized phrase match on text_norm
( packages/search/src/exact.ts ).
2. Implement fuzzy search with pg_trgm  similarity (threshold 0.35), so "karmanye
vadhikaraste" finds BG 2.47.
3. Implement semantic search: embed all passages and translations with a multilingual
embedding model (default BAAI/bge-m3 , run locally through a worker, behind the llm
provider interface), store in embeddings , query with cosine distance.
4. Merge the three result lists with reciprocal rank fusion and return the top 10 with a
match_type  per hit.
5. Support English, Hindi and Hinglish queries. Add Hinglish-to-Devanagari transliteration
before search (see section 9).
6. Add the search box to the web app with filters for tradition and work.
Files: packages/search/** , packages/llm/src/embed.ts ,
apps/api/src/routes/search.ts , apps/web/app/search/** . Done when: the eval set
data/eval/search.jsonl  (50 queries with expected refs) reaches recall@5 of 0.8 or
better.
M4. Verify engine (the core feature)
1 . Implement the six steps in section 8 inside packages/verify .
2. Add POST /v1/verify  and the web page /verify  with one text box ("Paste what you
heard") and a result card: verdict badge, the verse text first, surrounding verses, then
the short explanation.
3. Add the quote-exists check as the last step; if it fails, return only the retrieved text and
no explanation.
4. Add data/eval/verify.jsonl  with at least 60 claims (accurate, paraphrase, out of
context, misattributed, not found) and expected verdicts.
Codex Build Plan: Open Scripture Platform
Page 10 of 25

## Page 11
Files: packages/verify/** , packages/llm/** , apps/api/src/routes/verify.ts ,
apps/web/app/verify/** , data/eval/verify.jsonl . Done when: verdict accuracy is
0.85 or better on the eval set and zero answers contain a quote that is missing from the
database.
M5. More traditions (one importer per source)
1 . Add importers in this order: Quran (a license-clear text such as Quran Foundation or
Tanzil with approved terms), Bible (a public-domain edition such as the WEB through
Free Use Bible API data), Guru Granth Sahib (BaniDB or Shabad OS), Sefaria (only texts
whose per-text license allows reuse), Dhammapada and a first set of suttas
(SuttaCentral, respecting their no-LLM-training request: use for search and display
only), Tao Te Ching and Analects (Chinese Text Project or public-domain editions).
2. Each importer must fill sources , pass the license gate, pass at least 5 canonical
samples, and ship a one-page docs/sources/<name>.md  listing license terms and any
display rules.
3. Apply display rules in code. For the Quran: render the Arabic and translation in a
separate, clearly marked block and never inside AI text.
4. Mark any tradition without an approved advisory reviewer as beta  in the UI.
Files: packages/ingest/src/sources/*.ts , data/sources/*.yml , docs/sources/*.md .
Done when: five traditions are searchable and verifiable, and each has a passing canonical
sample test.
M6. Context, compare and cross-reference
1 . Add the context view: for any verse, show the previous and next 5 verses and the
chapter summary.
2. Add side-by-side translations (up to 4) and a commentary layer with a visible label
"Commentary, not scripture".
3. Add xrefs  import for known parallels and a graph view of related verses across
works.
4. Add theme browsing: pick a theme such as forgiveness and see passages across
traditions, with equal weight per tradition.
Done when: the verse page shows context, translations, commentary and related verses
without layout shift, and a test confirms commentary is never rendered inside the
scripture block.
Codex Build Plan: Open Scripture Platform
Page 11 of 25

## Page 12
M7. Voice, translation and WhatsApp
1 . Build everything in section 9: voice search, listen mode, explanation translation,
transliteration.
2. Build apps/whatsapp  using the WhatsApp Business Cloud API: text and voice-note in,
short verdict plus citation and link out.
3. Add share cards: a PNG of verse plus citation plus verdict, 1080 by 1080 pixels, with the
source name and license printed on it.
Done when: a Hindi voice note asking about a verse returns the right verse and a Hindi
explanation, and the card renders with correct text.
M8. Extension, offline and Android
1 . Build apps/extension  (Manifest V3): select text on any page, right-click, "Verify with
Scripture Platform", show the result in a side panel.
2. Add PWA offline packs: download one work (for example the Gita, about 2 MB per
language) for offline reading and exact search.
3. Wrap the PWA as an Android app with Capacitor or a Trusted Web Activity.
Done when: the extension verifies a selected quote on a news page, and the Gita works
with airplane mode on.
M9. Community, scholars and scale
1 . Build the report-an-error flow end to end: button, reports  table, admin review page,
corrections  public page.
2. Build the ask-a-scholar queue: a user question goes to a named reviewer for that
tradition, and the answer is published with the reviewer's name.
3. Build the public misquote tracker (published only after two reviewers sign off).
4. Add the sermon and video checker: paste a YouTube link, fetch captions (not audio),
list claims, verify each, produce a report.
5. Add classroom tools: reading plans, shareable lesson sets, no student accounts
needed.
6. Add an admin dashboard for aggregate stats (no personal data).
Done when: a reviewer can approve a correction and it shows on the public corrections
page within one minute.
Codex Build Plan: Open Scripture Platform
Page 12 of 25

## Page 13
7. API specification (REST, versioned under /v1)
Use Fastify with Zod schemas; generate OpenAPI from them. No auth for reads. Rate limit:
60 requests per minute per IP, 600 per day for verify and ask. All responses are JSON with
Cache-Control  set for static data.
Method and path Input Output
GET /v1/traditions none list of traditions with
work counts
GET /v1/works?tradition= tradition slug works
GET /v1/works/{slug}/divisions none chapter list with
verse counts
GET /v1/passages/{work}/{ref} lang , translations
(comma list)
verse, translations,
source and license
for each
GET
/v1/passages/{work}/{ref}/context
before , after  (default
5)
neighbouring verses
and division
summary
GET
/v1/passages/{work}/{ref}/related
none xrefs and theme
matches
GET /v1/search q , mode  (exact, fuzzy,
semantic, all),
tradition , lang ,
limit
hits with
match_type , score,
citation
POST /v1/verify claim ,
claimed_source? , lang
verdict, matched
passages, context,
explanation,
quote_check: pass
POST /v1/ask question ,
traditions? , lang
cited answer; every
claim has a passage
id
POST /v1/speech/stt audio (max 60 s), lang? transcript, detected
language
Codex Build Plan: Open Scripture Platform
Page 13 of 25

## Page 14
Response rules:
1 . Every passage object includes ref , work , tradition , source.name ,
source.license , source.url .
2. translate  refuses to translate scripture text. It accepts kind: explanation  only.
Scripture is shown in its original and in approved human translations.
3. Errors use { "error": { "code": "...", "message": "..." } }  with 400, 404, 429
or 500.
4. The MCP server in packages/mcp-server  exposes search_passages , get_passage ,
get_context , verify_claim  and list_traditions , calling the same internal
functions as the API.
8. Verify engine specification
Build packages/verify  as a pure pipeline of six functions. Each returns a typed object so
each can be unit-tested alone.
Method and path Input Output
GET /v1/speech/tts passage_id , lang licensed human
recitation URL, or
404 if none exists
POST /v1/translate text , from , to , kind
(explanation only)
machine translation,
is_machine: true
POST /v1/transliterate text , from , to transliterated text
POST /v1/reports passage_id , kind ,
message
report id
GET /v1/corrections none published
corrections
GET /v1/misquotes none published misquote
entries
GET /v1/health none version, data version,
database status
Codex Build Plan: Open Scripture Platform
Page 14 of 25

## Page 15
1 . parseClaim(input) : detect the language; extract the quoted string, the claimed work
or tradition ("the Gita says", "in the Quran"), and the claimed ref if any ("verse 2.47").
Output: {quote, claimedWork?, claimedRef?, lang} .
2. searchThreeWays(claim) : run exact, fuzzy and semantic search from
packages/search . If a claimed work exists, search it first and then all works.
3. fetchBest(hits) : take the best 3 matches; for each load the passage, 5 verses before
and after, and all approved translations.
4. assignVerdict(claim, matches) : choose exactly one label from the table below. Use
deterministic rules first (string similarity), and the LLM only to decide between close
labels.
5. explain(claim, verdict, matches) : the LLM writes at most 120 words. It may quote
only text passed to it. Prompt template: "Using only the passages below, say in plain
words how the claim relates to them. Do not add any quotation that is not in the
passages. Do not give a religious ruling."
6. quoteExistsCheck(explanation, db) : extract every quoted string in the explanation
(text inside quotes or blockquotes); each must be a substring of a passage or
translation in the database after normalization. If any fails, drop the explanation and
return only the retrieved text with the message "Explanation withheld: could not verify
its quotes."
Verdict Rule of thumb
Accurate Quote matches a passage or an approved
translation at 0.95 similarity or higher, and the work
matches the claim.
Paraphrase Meaning matches (semantic score high) but
wording differs; show the real wording.
Out of context Words exist, but the surrounding verses change or
reverse the meaning; show the context.
Misattributed The text exists in a different work or tradition than
claimed.
Mistranslated The claimed English wording differs from the
original in a way that changes meaning; show the
original and two other translations.
Codex Build Plan: Open Scripture Platform
Page 15 of 25

## Page 16
Output contract:
{
  "verdict": "out_of_context",
  "matches": [{ "ref": "BG 2.47", "work": "bhagavad-gita", "text": "...",
"translations": [] }],
  "context": { "before": [], "after": [] },
  "explanation": "...",
  "quote_check": "pass",
  "coverage_note": "Searched 5 traditions, 14 works."
}
Rules:
The UI shows verdict and text before explanation, always.
"Not found" must carry the coverage_note , so users know what was searched.
Never output a verdict about a person ("this preacher lies"). Verdicts apply to the
claim only.
Log only claim hash, verdict and language unless the user opts in to help improve the
system.
9. Voice and translation pipeline
Build packages/speech  with one interface per capability and several providers behind
each. The app code never calls a provider directly.
Verdict Rule of thumb
Disputed reading Scholars or schools read the passage differently;
show at least two commentary views, labelled by
school.
Not found No match above threshold in any loaded work. Say
"not found in the texts we have loaded", never
"false".
Codex Build Plan: Open Scripture Platform
Page 16 of 25

## Page 17
interface SttProvider { transcribe(audio: Buffer, hint?: LangCode):
Promise<{text: string; lang: LangCode; confidence: number}> }
interface TtsProvider { speak(text: string, lang: LangCode): Promise<{url:
string}> }   // explanations only
interface TranslateProvider { translate(text: string, from: LangCode, to:
LangCode): Promise<string> }
interface TranslitProvider { convert(text: string, from: Script, to: Script):
Promise<string> }
Tasks:
1 . Write the four interfaces and a registry.ts  that picks a provider by language and by
health, with a 3-second timeout and automatic fallback to the next provider.
Capability First choice (free or
open)
Fallback Notes
Speech to text
(Hindi, English,
Hinglish)
Bhashini ASR
(needs developer
registration)
Shruti offline model,
Whisper small
12 Indian languages
on Bhashini. Test
each language
before enabling it.
Translation of
explanations
IndicTrans2 (MIT, 22
scheduled Indian
languages), self-
hosted
Bhashini translation Label every output
"Machine
translation". Never
translate scripture
itself.
Transliteration IndicXlit (MIT, 21
languages incl.
Sanskrit)
rule-based Hinglish to
Devanagari map
Used for Hinglish
search and for
showing Sanskrit in
the reader's script.
Text to speech for
explanations
Bhashini TTS,
IndicF5 where its
license allows
browser
speechSynthesis
Explanation text
only.
Sacred recitation
audio
Licensed human
recordings in the
audio  table
none If none exists, show
no play button.
Never use a
synthetic voice for
scripture.
Codex Build Plan: Open Scripture Platform
Page 17 of 25

## Page 18
2. Add caching: key = hash of (text, from, to, provider version); store in Postgres or on
disk; never re-translate the same text.
3. Voice search: the web app has a microphone button (MediaRecorder, max 30 seconds)
that sends audio to /v1/speech/stt , shows the transcript for confirmation, then
searches. Never search without showing the transcript first.
4. Listen mode: play the human recitation, then read the translation aloud with TTS, verse
by verse; add a speed control.
5. Explanation language: a language menu on the verify result and Q&A answers
translates only the explanation text; the verse and its approved translations stay as
they are.
6. Transliteration toggle on every verse: original script, Roman, or the user's script.
7. Language quality gate: a language is switched on in the menu only after a native
reviewer signs off a 50-sentence test set stored in data/eval/lang/<code>.jsonl .
Until then it shows as "beta".
8. WhatsApp voice notes: download the note, convert to wav with ffmpeg, run STT, reply
with text and an audio explanation.
9. Privacy: audio is processed and deleted within 24 hours (default: immediately);
transcripts are not stored unless the user opts in; add DELETE /v1/me/data  for opted-
in users.
1 0. Known limits to document in docs/speech.md : Sanskrit speech-to-text and text-to-
speech are still experimental, so Sanskrit audio search is off by default; Quran verse
identification from audio is a later task (use a dedicated model), not part of M7.
10. Additional large-scale features and where each fits
Because the platform is free and open to all, these features extend reach without adding
cost to the user. Build each only after its milestone is done.
Feature What Codex builds Milestone
Share cards PNG with verse, citation, verdict,
license; a /card/{id}  route
M7
Verse-from-audio ("Shazam for
scripture")
Start with the Quran using an open
Quran recitation model; return the
surah and ayah with a confidence
score; below threshold, say "not sure"
after M9
Codex Build Plan: Open Scripture Platform
Page 18 of 25

## Page 19
Feature What Codex builds Milestone
Live sermon checker Paste a YouTube link, read captions, list
quotable claims, verify each, produce a
report. Captions only, no audio storage
M9
Voice-to-voice interpreter Speak in one language, get the verified
explanation spoken in another, using
STT, translate, TTS in order
after M9
Camera and OCR Photo of a printed page; OCR with
Tesseract (Hindi, Sanskrit, Arabic,
English); search the recognized text;
show the verse and its context
after M8
Recitation and memorization
coach
Show a verse, user recites, STT
compares word by word, highlights
mistakes; spaced-repetition schedule
stored on device only
after M9
Cross-reference graph xrefs  plus a graph page; parallels
across works with equal presentation
for each tradition
M6
Public misquote tracker A page of widely shared false or out-
of-context quotes with verdict and
evidence; two reviewers sign off
before publishing
M9
Ask-a-scholar escalation Button on any answer sends it to a
named reviewer queue; answers
published with reviewer name and
school
M9
Guided reading plans 7, 30, 90 day plans per work; shareable
link; no account
M9
Classroom mode Teacher creates a lesson set (verses
plus questions) and shares a link;
students need no login
M9
Offline packs Per-work downloadable pack with text,
search index and audio; service worker
M8
Codex Build Plan: Open Scripture Platform
Page 19 of 25

## Page 20
Build order for these extras: share cards, interfaith comparison, offline packs, OCR,
sermon checker, recitation coach, voice-to-voice, verse-from-audio.
For each extra, Codex adds a docs/features/<name>.md  describing inputs, outputs,
privacy impact and test steps.
11. Safety, licensing and neutrality rules enforced in code
These are code checks with tests, not guidelines. Put them in
packages/llm/src/guardrails.ts  and packages/ingest/src/licenseGate.ts .
1 . License gate: publishing a source fails without license, license URL, attribution and
retrieval date. A CI job data-check.yml  fails if any published  row points to a non-
approved source.
2. Quote-exists check: every quoted string in AI output must be found in the database
(section 8, step 6).
Feature What Codex builds Milestone
Low-bandwidth mode Text only page under 50 KB, works on
2G
M2 onward
Accessibility Screen reader tested, high-contrast
theme, dyslexia-friendly font option,
large-text mode, keyboard navigation
every
milestone
Interfaith comparison Pick a theme (forgiveness, charity,
death) and show passages from each
tradition in equal-size cards,
alphabetical by tradition
M6
Developer platform Public API docs, MCP server, SDKs for
JavaScript and Python, open data
dumps with licenses
M4 onward
Data quality dashboard Public page showing sources, licenses,
last update, known gaps, open
correction reports
M5 onward
Translations of the UI Translate interface strings into the 22
Indian languages plus Arabic, Spanish,
French, Indonesian; review by native
speakers before enabling
M7
Codex Build Plan: Open Scripture Platform
Page 20 of 25

## Page 21
3. No scripture generation: system prompts say "quote only from the provided passages".
A test feeds a prompt that asks the model to write a new verse and expects a refusal.
4. Tradition parity test: run the same 20 neutral questions against every loaded tradition
and compare length, hedging and tone scores; fail the build if any tradition differs by
more than 20 percent.
5. No rulings: a classifier or rule list blocks answers that say what is permitted or
forbidden for a person (fatwa, halakhic or similar rulings) and replaces them with the
relevant text plus "Ask a qualified scholar of your tradition" and a link to the ask-a-
scholar queue.
6. No ranking and no polemic: block prompts that ask which religion is best or that ask for
attacks on a faith; return a neutral message and an offer to compare texts on a theme
instead.
7. Distress routing: if a query mentions self-harm, abuse or crisis, show local help
resources first (country list in packages/shared/helplines.ts , reviewed yearly),
then offer reading.
8. Layer labels: every block on screen is tagged Primary text, Translation, Commentary, or
AI explanation (machine-generated), with a distinct style; commentary and AI text are
never visually merged with scripture. The UI test checks that the label exists next to
each block.
9. Source display rules: per-source rules are in data/sources/*.yml  ( display_rules )
and enforced by the web renderer, for example the Quran rule above.
1 0. Machine translation labels: any output with is_machine: true  shows "Machine
translation, may contain errors" and a report button.
1 1 . Report and correct: every page has a report link; reports are visible to reviewers within
one minute; corrections are public.
1 2. Privacy: no third-party trackers or ad scripts; analytics are self-hosted and aggregate
(Plausible or Umami); a test scans the built HTML for external script domains and fails
on any not on an allow-list.
1 3. Rate limits and abuse: per-IP limits, a request size cap, and a block on automated
scraping of full texts beyond the open data dumps.
1 4. Reviewer gates: a tradition shows as beta  until at least one named reviewer from that
tradition has approved its samples and prompts.
Codex Build Plan: Open Scripture Platform
Page 21 of 25

## Page 22
12. Testing and acceptance criteria
A milestone is done only when all its checks pass in CI.
Milestone Required checks
M0 Clean clone installs, builds, tests and migrates; CI
green; lint and typecheck clean
M1 700 Gita verses; canonical samples equal DB;
license gate rejects a source with a missing field
(negative test)
M2 Old flow works; every chapter shows its correct
verse count; Lighthouse accessibility 95 or higher;
page under 100 KB without images; footer shows
source and license
M3 Search eval recall@5 of 0.8 or better; typo, Hinglish
and Hindi queries each have at least 10 passing
cases; p95 latency under 500 ms on a 50,000-
passage database
M4 Verify eval accuracy of 0.85 or better; 0 quotes
missing from the DB in 500 generated answers;
"not found" always includes the coverage note;
explanation never appears before the text
M5 Per tradition: 5 canonical samples pass; license
record complete; display rules test passes; beta
flag set where no reviewer exists
M6 Commentary never rendered inside a scripture
block; xref links resolve; theme page shows equal
card sizes for each tradition
M7 STT word error rate under 20 percent on the 50-
sentence test set for each enabled language;
translated explanations carry the machine label;
audio deleted within 24 hours (test with a fake
clock)
Codex Build Plan: Open Scripture Platform
Page 22 of 25

## Page 23
General test rules:
1 . Unit tests with Vitest for every function in packages/* ; end-to-end tests with
Playwright for the web app (home, read, search, verify, report).
2. Every bug fix adds a failing test first.
3. Run the eval sets in CI on each pull request that touches packages/verify ,
packages/search  or packages/llm , and post the score in the pull request; a drop of
more than 3 points fails the check.
4. Keep data/eval/  human-written; never generate expected verdicts with a model.
5. Add a pnpm check:all  script that runs lint, typecheck, unit tests, end-to-end tests,
evals and the data check.
13. Open source, governance and non-profit setup
Codex builds the repo files; KK does the legal and people steps. Items marked (KK) are
not for Codex.
1 . Codex: add LICENSE  (AGPL-3.0), CONTRIBUTING.md  (setup, branch names, commit
style, how to add a source), CODE_OF_CONDUCT.md , SECURITY.md  (private reporting
address), issue templates (bug, data error, new source, new language) and a pull
request template with a license-and-sources checklist.
2. Codex: add docs/governance.md : roles (maintainer, tradition reviewer, language
reviewer, translator), how decisions are made (public issues, a 7-day comment window
for data and policy changes), and how a reviewer is added or removed.
3. Codex: add docs/licenses.md , generated from data/sources/*.yml , listing every
source, license and display rule; rebuild on each release.
Milestone Required checks
M8 Extension passes a manual test on three news
sites; offline pack opens with the network off;
Android build installs
M9 Report to correction path works end to end;
misquote entry cannot publish with fewer than two
approvals; sermon report lists each claim with a
verdict
Codex Build Plan: Open Scripture Platform
Page 23 of 25

## Page 24
4. Codex: add docs/open-data.md  and a script that exports only texts whose license
allows redistribution as dated dumps (JSON and SQLite) with a manifest.
5. (KK) Choose a legal home: a registered non-profit (in India a Section 8 company or a
public charitable trust) or fiscal sponsorship through an open-source foundation; this
decides who can accept grants and donations.
6. (KK) Form an advisory board per tradition with at least one named reviewer each;
publish names and the scope of what each reviews. Start with the Gita and the Quran,
where the first data goes live.
7. (KK) Funding without ads or paywalls: grants, donations, university and institutional
partnerships, compute credits from cloud and AI providers, and volunteer translators.
Publish a yearly transparency report with income and spending.
8. (KK) Request written permission where licenses require it: Quran Foundation or
AlQuran.cloud terms, Sunnah.com, Bahai Reference Library, 84000, Sefaria per-text
terms; save replies in docs/permissions/ .
9. Codex: add a public status page, a roadmap page generated from GitHub milestones,
and a good-first-issue  label for each tradition and language so volunteers can start.
1 0. Codex: keep running costs low: static pages cached at the edge, the database on one
small server, embeddings computed once, translations and audio cached, rate limits on
LLM calls, and a monthly budget alert in infra/README.md .
14. AGENTS.md (paste into the repo root)
# AGENTS.md
## Project
Open, non-profit scripture study and verification platform. Users read texts
from many traditions, verify quotes they hear, and get cited, neutral
explanations in their own language. Repo started as a Gita-only lookup app
(see legacy/).
## Hard rules (never break)
1. Text first: show scripture and citation before any AI explanation.
2. AI never writes or completes scripture. Every quoted string in AI output
must exist in the database; if not, discard the explanation.
3. No rulings, no ranking of religions, no polemic. Same code path and tone
for every tradition.
4. Every source has a license record and status approved before publishing.
No license, no publish.
Codex Build Plan: Open Scripture Platform
Page 24 of 25

## Page 25
5. Never call third-party scripture APIs at request time. Import, store,
cite.
6. Never use synthetic voices for sacred recitation. Translate explanations
only, never scripture.
7. Keep scripture, translation, commentary and AI explanation visually and
structurally separate and labelled.
8. Minimal personal data: no trackers, no ads, audio deleted within 24 hours.
9. Distress queries show help resources first.
## Stack
TypeScript, pnpm workspaces, Next.js (web), Fastify (api), Postgres 16 with
pgvector and pg_trgm, Vitest, Playwright, Docker Compose.
## Layout
apps/web, apps/api, apps/whatsapp, apps/extension; packages/db, ingest,
search, verify, llm, speech, mcp-server, shared; data/sources, canonical-
samples, eval; docs; infra.
## Commands
- pnpm install
- pnpm dev (web and api)
- pnpm db:migrate
- pnpm ingest <source>
- pnpm check:all (lint, typecheck, tests, evals, data check)
## Workflow
- Follow the milestone order in docs/build-plan.md (M0 to M9). Do not start
the next milestone until the done check passes.
- Small commits, one task each. Message style: type(scope): summary.
- Add or update tests with every change. Fix bugs with a failing test first.
- When a decision is ambiguous, write docs/decisions/NNN-title.md with
options and the choice, then continue.
- Never edit data/eval or data/canonical-samples with model output; humans
write them.
- Do not commit secrets. Use .env.example for keys.
## Definition of done
Code, tests, docs updated, CI green, license records complete for any new
data, no new external scripts on pages.
To use: copy the block into AGENTS.md , copy this document into docs/build-plan.md ,
then tell Codex: "Read AGENTS.md and docs/build-plan.md. Start M0."
Codex Build Plan: Open Scripture Platform
Page 25 of 25
