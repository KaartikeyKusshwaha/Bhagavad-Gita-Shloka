# Browser speech and device-local learning

Keep the three main destinations. Voice controls open only when requested;
practice is collapsed inside a passage; Study tools select one task at a time.
No account, new bot, institution workflow or paid speech API.

SpeechRecognition starts only on a click. Prefer `processLocally` when supported.
Otherwise require a checkbox disclosing the browser provider's online processing.
No audio uploads to this app. Stop at 60 seconds, abort on unmount, show errors,
and put recognized text into an editable field. Never auto-submit a transcript.
Browser/model/language availability is not claimed from mocked browser tests.

SpeechSynthesis speaks explanations using localService device voices only. It
does not synthesize sacred texts or recitations. Devices without a suitable voice
show a useful message. Actual human sacred audio remains a separate integration.

Recall compares normalized word sequences with edit alignment. Show omissions,
substitutions and additions, not a pronunciation/theological score. Preserve
Devanagari vowel signs. Ignore Arabic vowel marks/tatweel and Latin accents only
in comparison/search; never alter displayed scripture. User self-ratings schedule
10-minute retry or 1/3/7/14/30/60-day review. No authoritative mastery claim.

Reading plans advance through actual passage ordinals, up to a user-selected daily
count. Explicit completion adds real read activity. No penalty or automatic
activity on a missed day. Revision and plan state use a separate validated local
storage key and can be removed from the UI. Corrupt data is not overwritten.

Classroom sets select up to ten saved references and eight questions. The share
link contains a validated UTF-8 JSON URL fragment (no scripture copies or user
account), and the recipient resolves those references through the same reader API.
This avoids public database records and anonymous-edit/delete tokens. The title
and questions are visible to anyone holding the link. No personal data requested.
Print view retains the source credits and questions.

Technical tests cover text alignment, scheduling, multilingual lesson roundtrip,
transcript-before-send, real plan completion/reload, revision persistence and a
shared classroom link with accessibility scanning. Owner microphone/voice quality
and final real-time acceptance remain pending.
