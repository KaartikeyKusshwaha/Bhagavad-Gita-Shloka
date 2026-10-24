# Offline editions and licensed human audio

Offline download packs are created from the current published database views.
The pack contains actual passage counts, chapter information, human translations
and shared source records; attribution and the complete Tanzil notice remain in
the pack. Validate counts, unique IDs, work ownership and every source reference
before storing. Do not normalize displayed strings. No audio is downloaded.

Store packs in browser IndexedDB only after a versioned service worker has cached
the built offline reader and its assets. Build generates a revision from Next's
static assets and embeds it in the worker. Cache the generic offline page and
static interface files, never personalized routes, Ask responses or report bodies.
Failed online navigation redirects to the cached offline reader. The client can
select a saved edition/chapter, search exact wording/reference, page through text,
bookmark and mark read, and remove a download. Browser eviction remains possible;
show the saved date and offer online updates. No account or subscription.

`pnpm preview` serves the built web application on loopback with the explicitly
configured local database, allowing real network-disabled browser testing.
`pnpm start` retains the production PostgreSQL and persistent-secret requirements.
The local preview cannot be bound to an external interface.

One human Al-Fatiha recording by Adeel Shaikh is sourced from the original Commons
file page, licensed CC BY-SA 4.0. Retain its license, author, source URL, duration,
upstream SHA-1 and unmodified-recording notice. The approved audio record is tied
to Quran 1:1 with a conspicuous complete-surah scope, not a verse alignment claim.
The player and audio URL are not attached until opened; preload is none. Media
access is restricted to the pinned Wikimedia host in the CSP and ingestion schema.
Other passages do not imply a recording exists. Original recording quality and
recitation review remain part of owner acceptance.

Evidence: a built-site Chromium run downloaded the Gita, disabled all browser
networking, reloaded the offline reader and retrieved BG 2.47 by reference and
English phrase. An isolated muted Chromium playback loaded the live human FLAC
with readyState 4 and duration 49.824 seconds. This proves playback, not scholarly
or pronunciation approval. Technical tests also validate pack attribution and
Quran character preservation.
