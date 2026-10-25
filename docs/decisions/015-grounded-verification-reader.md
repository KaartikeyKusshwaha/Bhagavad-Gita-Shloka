# Required AI assessment and a focused reader

The owner requires real Groq-backed Ask and Verify responses, rather than successful
canned or source-only substitutions when inference fails. This supersedes earlier
optional-AI/fallback behavior. Search remains actual database search.

Verify retrieves the cited reference first and keeps it visible. Previously it could
append a reference after ten lexical hits, then discard it when taking three results.
Reference questions now avoid a full-library similarity scan. Cross-library reference
parsing supports the expanded catalogue. Quotation matching remains deterministic;
a separate Groq assessment relates the claim to actual stored passages and nearby
context. Every AI paragraph requires permitted evidence IDs, checked quotations and
valid cited references. Missing evidence is an unresolved result, not proof of falsehood.
Source restrictions still apply. The model does not establish theological truth.

Missing configuration, connection failure, provider quota, contention and invalid
citations fail explicitly with a 503 error. No substitute AI answer is published or
saved as a successful turn. The website preserves the input and offers Retry request.
The first submission now visibly shows work in progress and can be stopped. The
browser allows 90 seconds for Ask/Verify, covering the bounded provider request.
Three chat requests may be in flight, with an explicit busy error at capacity.

The reader keeps its maroon theme but uses a continuous book surface, comfortable
serif translation text, adjustable size, original-plus-translation or translation-first
views, and a focus mode that removes contents navigation. Original texts, edition
credits and bookmark notes remain available. Bookmarks, colours and private notes
sync to the signed-in account. Presentation choices are stored locally.

The activity grid previously counted explicit actions only, not time spent reading.
An optional Start reading session timer now saves each completed active minute as
a distinct `reading` activity. It excludes hidden/unfocused tabs, pauses and intervals
after two minutes without interaction. It uses clamped elapsed time to avoid counting
suspended timer jumps. Minutes appear separately from passages marked read in Study;
each contributes to the grid. Partial minutes end when leaving the page. This measures
foreground engagement, not comprehension. No activity is generated on page load.

Translations can be read aloud with a matching local device voice, speed controls,
pause/resume and stop. This is labelled synthetic reading, never human recitation.
The same option applies to permitted, labelled unreviewed study translations. No
remote speech provider is silently used. Voice/language availability depends on the
user's device; unsupported languages show a concrete installation message.

Validation includes API tests for mandatory AI failures, synthetic provider tests for
grounding/reference retention and source restrictions, browser tests for a real live
Verify response, saved history, active/pause/hidden-tab session behavior, persisted
minutes, bookmarks, reading preferences and mobile overflow. Synthetic provider tests
are explicitly fixtures and do not substitute for the deployed Groq smoke test.
