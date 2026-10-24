# First additional reading editions

The website now seeds Gita, Quran and Dhammapada into the same PostgreSQL reader
and search. Additional source catalogue entries remain external/planned until
their actual text is imported. No runtime scripture API keys or subscriptions.

Tanzil Uthmani version 1.1 contains 6,236 verses in 114 surahs. The checked-in
bundle preserves the downloaded strings exactly, including Unicode combining
order, pause marks, tatweel and Bismillah prefixes. Do not normalize these display
strings to NFC. Search normalization is stored separately. The complete source
copyright notice is in both bundle and source record and available in the reader.
SHA-256 of the reconstructed verse lines verifies the verbatim strings. No English
translation or transliteration is claimed for this edition.

Dhammapada has 423 Pali verses and Bhikkhu Sujato's 423 English translations in 26
chapters. Bilara published commit 6a395ceb6f28549111d7d96859f7f6f6610afc01 is
pinned. Join numeric segments into verses; exclude zero-numbered story headings
and untranslated chapter colophons. Parse out Bilara's `<j>` join marker, without
changing words. Keep upstream file checksums and edition attribution. In keeping
with SuttaCentral's request, these texts must not be used in generative AI
contexts, embeddings, model training or synthetic voice generation; source
records carry `no_generative_ai: true` for provider code to enforce. Ordinary
reading and deterministic text search are available.

Chapter pickers use actual verse numbers/references, not assumed 1..N indices:
Dhammapada chapter 2 begins at verse 21. Reference parsing recognizes Quran
chapter:verse and Dhammapada global verse numbers separately from Gita numbers.

Exact search runs before fuzzy fallback. Script-aware fuzzy comparison avoids
expensive comparisons of Latin queries against Arabic primary text while still
checking translations. Meaning-based search is still unavailable.

These are source imports, not independent editorial approval. Human canonical
samples and final maintainer acceptance remain pending.
