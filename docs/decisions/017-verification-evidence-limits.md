# Verification when the retrieved texts cannot assess a claim

The owner reported a failed Verify request about a modern television programme and
an alleged archaeological discovery. A real Groq reproduction returned a paragraph
explaining that the retrieved scripture could not assess this historical claim,
with an empty citation list. The ordinary cited-answer validator correctly refused
to publish that paragraph, but the product showed an unhelpful citation error.

Verify now requests one of two distinct model responses. An assessment of scripture
has evidence-cited paragraphs and no unresolved field. An evidence-limit result has
no asserted scripture paragraphs and an unresolved object with an exact excerpt of
the submitted claim and the model's explanation of the evidence limit. It may not
mix these forms. The excerpt must occur in the actual input, invented quotations
and references are rejected, and links/markup are not accepted. Positive scripture
assessments retain their original citation checks. The provider schema also requires
at least one citation for each evidence paragraph.

The model is instructed to describe only the supplied evidence and the kind of
additional evidence required. It must not turn model memory into historical proof
or attach unrelated passages as citations to an unresolved claim. A quoted title
introduced by “titled”, “entitled”, “called” or “named” is no longer extracted as an
alleged scripture quotation for retrieval.

Explore labels this result “Not established from these texts”. Its real model
explanation is shown, related passages start collapsed, and history preserves the
explanation on reload and across account synchronization. The wording-match result
remains separate. The composer states that this tool cannot independently establish
modern historical events; no general web fact-checking service is claimed.

No fallback was added. Provider failures, malformed assessments and ungrounded
citations remain errors. If retrieval finds no passages, a configured provider must
still produce a validated evidence-limit explanation. Restricted editions are not
sent to the model. Ordinary Ask responses retain the cited-answer contract.

Tests cover the original empty-citation failure, invalid claim excerpts, invented
quotes, conflicting response forms, absent evidence, source restrictions, quoted
titles and saved UI history. Separate live tests exercise real Groq verification,
cited follow-ups, account history and meaning retrieval. Schema reference:
https://console.groq.com/docs/structured-outputs (checked 2026-10-26).
