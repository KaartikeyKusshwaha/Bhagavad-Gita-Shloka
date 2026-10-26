# 018: Gemini answers and semantic claim assessment

The owner approved implementing the demonstrated Gemini assessment pipeline on
2026-10-26. This supersedes the scripture-only historical-claim limitation in
decision 017. It does not promise universal fact-checking or model training.

## Behavior

`MODEL_PROVIDER=gemini`, `GEMINI_MODEL=gemini-3.6-flash` and server-only
`GEMINI_API_KEY` select the tested free-tier provider. The catalog alone was not
proof of access: the supplied account rejected Gemini 2.5 generation and the 3.8
candidate returned high-demand errors. The 3.6 candidate completed actual answers.
The legacy Groq integration remains explicitly selectable; failures never switch
providers automatically or return successful canned assessments.

Ask uses a bounded Gemini retrieval plan and up to three short scripture searches,
with context from permitted editions. These lexical/reference queries cover the
stored collection; they do not expand the existing 6,936-vector semantic index.
Up to twelve evidence passages can support an answer. The model is instructed to
answer directly and develop complex explanations, generally 450–800 words, while
simple questions may be shorter. The response contract allows twelve paragraphs
of at most 2,400 characters. Follow-ups use bounded account conversation context,
never private notes. Conversation history is context, not independent evidence.

Verify classifies the question as scripture, historical or mixed and assesses
meaning, separately from deterministic quotation matching. The AI verdict is
supported, contradicted, mixed or insufficient_evidence relative to retrieved
sources. Compound claims require qualifications; a true central event does not
establish every precise detail. No retrieved evidence is not disproof. The UI
shows the evidence assessment as the main result, with the wording check below.

Historical Verify uses the free English Wikipedia Action API for discovery,
retrieves relevant article paragraphs linked to a specific revision, and follows
citations on selected public publisher hosts. Only fetched source content goes
to Gemini; search snippets and model memory are not evidence. Citation links are
constructed from retrieved metadata, never arbitrary model-generated URLs.
Wikipedia is secondary evidence and repeating reports are not independent
corroboration. Limited publisher coverage and unreadable reports are disclosed.
This is not a general search-engine subscription or whole-web fact checker.
No case-specific answers, source URLs or verdicts are hardcoded.

## Cost, privacy and failure behavior

Gemini uses Interactions with `store:false`, JSON Schema output, low thinking and
an 8,192-token answer budget including internal thinking. It returns an evidence
explanation, not private reasoning. Incomplete responses, provider failures,
invalid citations, unsafe output and quota errors produce explicit retryable
errors. Query planning has a separate bounded budget and timeout. No Google
Search grounding tool is requested because its API free tier is unavailable for
these models. No billing or paid tier is enabled.

Queries and selected preceding exchanges go to Gemini; Google free-tier data
terms may permit product improvement. Historical-topic keywords go to Wikipedia.
The composer and privacy page disclose this. Interaction storage settings do not
override provider policies. Public article pages alone are cached in a bounded
12-entry server-memory cache for fifteen minutes (only pages up to 750,000 characters). Search requests and private
conversation data are not cache entries. Saved replies retain source metadata,
assessment and paragraphs, not fetched report bodies. Keys remain server-only.

All external fetches require HTTPS and reviewed exact hosts, revalidate redirects,
limit bytes and time, and use an identifying Wikimedia User-Agent. No arbitrary
user URLs, private IPs, custom ports or embedded credentials are fetched. Runtime
research is bounded to two discovery searches, three articles and three reports.

## Validation

Automated contracts cover completed/incomplete provider output, quota errors,
private-thought exclusion, citation validation, long answer persistence, safe
publisher URLs, actual-page retrieval, source failures and scope routing. Browser
contracts verify saved long answers and linked sources after account history
reload. Live provider checks use the supplied key and real retrieved evidence;
temporary provider load errors remain an operational limit of the free tier.

Official references checked 2026-10-26:

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/thinking
- https://www.mediawiki.org/wiki/API:Search
- https://www.mediawiki.org/wiki/API:Parsing_wikitext
- https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
