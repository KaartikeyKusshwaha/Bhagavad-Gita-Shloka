# Human-authored acceptance sets

Do not generate expected verdicts or references with a model.
The maintainer must supply search.jsonl (50+ queries), verify.jsonl (60+ claims),
and review.json with a named reviewer and reviewed_at date.

Search records: query, expected_refs (array), category (exact, typo, Hindi, Hinglish).
Include at least ten typo, Hindi and Hinglish cases each.
Verification records: claim, expected_verdict, optional claimed_source.
Cover accurate, paraphrase, out_of_context, misattributed, mistranslated,
disputed_reading and not_found, including short coincidental phrases.

`pnpm eval` fails with exit 2 while these are absent. `--allow-pending` reports the
pending state for technical CI without claiming an editorial acceptance pass.
