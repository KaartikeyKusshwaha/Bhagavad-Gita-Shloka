# Original-source speech and Next reading progress

The owner explicitly requests language-trained TTS only: no replacement human
recordings, translation speech or wrong-language voices. The reader's human-audio
and translation-playback controls are removed. Explanation speech in Explore is
separate and remains device-local.

Eligible original text is synthesized server-side through Cartesia Sonic 3.6
(`sonic-3.6-2026-08-27`), or YourVoic Aura Prime for Sanskrit. Cartesia voices must
be public, active, have the exact source language, and declare a native locale for
that language. Sanskrit is explicitly checked against YourVoic's Aura Prime
language list and its Sanskrit voice catalogue; it is sent with `language=sa`.
The UI makes no claim of reviewed liturgical pronunciation or Vedic svaras.

Only stored, approved source passage IDs and validated voice choices are accepted.
The browser cannot send arbitrary text, substitute a translation, select an
unlisted voice or change the model. Unknown languages, no-generative-AI sources,
verbatim-restricted sources and blocks longer than 4,000 characters are declined.
Unsupported speech fails clearly without falling back to a device or Hindi voice.
Keys are server-only environment values, absent from source control and browser
payloads. Both provider credentials were checked directly against their APIs.

Authenticated endpoints:

- `GET /v1/speech/options?passage_id=…` returns eligibility and matching voices.
- `POST /v1/speech/original` takes `{passage_id,voice_id?}` and returns WAV bytes.

The player loads voices only when opened and generates speech only after a click.
It provides native/provider-listed voice selection, normal audio playback/seek,
replay, playback speed and explicit retry. Browser blob URLs are released on change
and unmount. Source attribution and a synthetic-audio label remain visible.

Migration 009 stores generated WAV bytes in PostgreSQL, so cache survives restarts
and deployments. Its SHA-256 key includes provider/model, voice, locale, source
checksum, original text and generation settings. Changed editions invalidate the
cache. Concurrent identical requests share one generation promise. Cache hits
neither generate audio nor consume the local character budget; X-Speech-Cache
reports HIT or MISS. Caching is shared only for published source audio; private
notes, user text and conversation history are never synthesized or cached here.

Two generations may run concurrently. POST calls require a website header and
same-origin checks, and are limited to 12/minute. Persistent atomic reservations
cap Cartesia at 18,000 characters per UTC month and YourVoic at 2,000 lifetime
characters by default, below the reported 20K monthly / 2,500 free account credits.
Limits can be lowered via environment variables. Failed attempts conservatively
retain their reservation, since upstream charging may have occurred. No account
upgrade, top-up, automatic purchase or overage setting is enabled. These caps do
not promise that credits used elsewhere in the same provider account remain free.
Quota exhaustion blocks new generation while existing cached audio remains usable.

Next now marks the passage being left read, adds one read event per passage/day,
flushes the account save before navigation, and preserves an error if saving fails.
It does not mark the destination read on page load. Chapter page advancement records
the last displayed passage rather than claiming the whole chapter was read. The
optional foreground reading-minute timer remains distinct.

Validation includes actual audio responses from Cartesia (English, Hindi, Hebrew)
and YourVoic (Sanskrit), provider payload/caching/restriction/budget tests, and
browser audio decoding/playback, replay, account grid persistence and navigation.
Native pronunciation and religious recitation quality still require owner review.

Provider references:

- https://docs.cartesia.ai/api-reference/tts/bytes
- https://docs.cartesia.ai/api-reference/voices/list
- https://yourvoic.com/api/docs/api-reference
