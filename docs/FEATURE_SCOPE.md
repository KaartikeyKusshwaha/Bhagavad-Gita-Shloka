# Finalized college-website scope

Latest maintainer direction: one free multi-faith website, professional and simple,
with three destinations (Explore, Read, Study). The source PDF is reference material;
the conversation's explicit scope changes override its extra channels and business
operations. No MCP server, WhatsApp bot, browser extension or separate Android app.

## Agreed functionality

1. Multi-faith source/work selection, using free APIs, reusable downloads or clearly
   labelled external reading hosts. Expose exact collection/language coverage.
2. Original text, human translations, available transliteration, correct section
   counts, direct passage links, surrounding context and translation comparison.
3. Reference, exact, fuzzy and semantic search, with source/language filters.
4. Quotation matching and attribution checks, cited context and cautious explanation.
5. Cited text questions and follow-up questions through an existing model provider.
6. Push-to-talk input with transcript confirmation; TTS for explanations; licensed
   human sacred recitations where available.
7. Related-passages graph/list, with sourced links separate from suggested similarity.
8. Cross-tradition theme browsing, with clear sources and no equivalence claims.
9. Daily reading plans, progress and device-local bookmarks.
10. Shareable classroom passage/question sets, without student accounts.
11. Hide/reveal memorization practice, prompts, quizzes and spaced revision.
12. Experimental spoken verse identification and omission/substitution feedback;
    no claim of expert pronunciation/chanting assessment.
13. Share links/cards, appearance/text-size controls, mobile and keyboard access.
14. Offline reading and exact search for downloaded works.
15. Attribution/license visibility, error reports, neutral content handling, privacy,
    technical tests, deployment on Render or Oracle, and final owner testing.
16. User-requested GitHub/LeetCode-style learning activity grid and ChatGPT-style
    Explore conversations/search history. Keep browser-local by default, with
    reopening, search, rename/delete, pause and clear controls.

Universal coverage of every edition/language and 22 fully reviewed languages is
not promised. Continuous interruptible voice, expert theological judgments,
scholar/community organizations, business/legal setup, OCR and sermon/video
checking are outside the initial agreed delivery or later enhancements.

## Implemented versus pending

The expanded implementation has 140 works across 13 traditions, totaling 120,858
primary passages/reading blocks. The original 700 Gita passages, 6,236 preserved
Tanzil Quran Arabic verses and 423 Dhammapada verses remain. ClearQuran adds 6,236
verbatim human English Quran mappings under CC BY-ND 4.0, excluded from AI use.
The Bible has the public-domain WEB Protestant edition and licensed Hindi IRV
translations where explicit verse identifiers align. The Tanakh uses JPS 1917
English; its 39 source book subdivisions are not a claim of 39 Jewish canonical books.
Hinduism adds the Ramayana, Mahabharata, all four Vedas and 12 Upanishad/Āraṇyaka
editions. Other imported works cover Jain āgamas, Lotus Sutra, Sutta Nipāta verse
selections, Gurbani on 1,430 angs and historical English Japji, Vendīdād, Tao Te
Ching, Analects, Kojiki, a historical Bahá’í anthology and the Book of Mormon.
See `data/imports/library-manifest.json` for exact titles, sections and counts.
These are identified editions and selections, with source transcription limitations;
they are not a comprehensive collection of every text, recension or language.
It provides exact/fuzzy/reference retrieval, conservative quotation
checking, reader/context, source records and report API. Explore has a single
composer and persistent device history. Study has real activity/streak counts,
calendar keyboard navigation, bookmarks, and deliberate read marks.
The reader has hide/reveal recall practice, experimental browser dictation,
word-difference feedback and self-rated spaced review. Study tools provide a
daily reading plan, revision queue and reference-based classroom share links.
Explore dictation requires transcript review. Explanation playback uses installed
local voices; actual microphone recognition and voice availability vary by browser.

Ask now supports an existing Qwen model through a configured server: cited study
paragraphs, previous-question/passage context and source-first display. The local
Qwen3-1.7B runtime and Qwen3-Embedding-0.6B index have been exercised with actual
requests. The 6,936 eligible Gita/Quran passages are indexed locally. SuttaCentral
editions remain excluded from model use. Model availability is checked; a failure
keeps retrieved evidence visible and states why an answer is unavailable.
The reader now includes an interactive connection graph/list and Explore provides
keyword-guided cross-tradition themes. Graph source-order links are distinct from
automatic shared-word suggestions. No scholarly cross-reference dataset has yet
been imported; that absence is stated in the graph.
Downloadable editions now have a cached offline reader with exact/reference
search, chapter selection and device-local progress. Human audio currently includes
one complete Al-Fatiha recording by Adeel Shaikh (CC BY-SA 4.0), streamed only on
request and explicitly labelled as a whole surah rather than verse-aligned audio.
Word-order quizzes and attributed PNG cards are implemented inside the reader.
The Oracle deployment hosts Qwen query embeddings and a verified 6,936-passage
index; the new works have word/reference search and source retrieval. Their meaning
embeddings have not yet been generated. Cited Ask uses the authorized Groq Free-plan account. Its actual
model browser test passes meaning retrieval, cited follow-ups and history reload.
The second Gita edition has 671 translation segments mapped to 700 verses, with
24 combined ranges disclosed. Further editions are additions, not implied current
coverage. Read now has religion tabs, grouped shelves, language/text filters,
paginated long sections, coloured bookmarks, private notes and deliberate read
marks that provide a return-to-reading link. Ask can explicitly include up to two
relevant saved exchanges in addition to the current conversation context. Notes
are never sent. This is retrieval and context, not model fine-tuning. Optional
unreviewed study translations support 24 target languages only for eligible sources;
they are never stored as canonical text or published human editions.
Final owner acceptance remains pending. Source research or an empty
workspace package does not count as a functioning feature.
