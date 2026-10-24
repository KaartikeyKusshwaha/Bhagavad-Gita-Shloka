# Expanded reading collection

140 works, 120,858 source passages / reading blocks, 39,154 human translation
records. Counts describe this import, not the number of canonical verses in every
recension. `data/imports/library-manifest.json` lists each added edition, its
compressed bundle hash, section count, passage count and languages.

| Tradition         |                  Works | Included editions                                                                                                              |
| ----------------- | ---------------------: | ------------------------------------------------------------------------------------------------------------------------------ |
| Hinduism          |                     19 | Gita; Griffith Ramayana and four Vedas; Ganguli Mahabharata (18 books); 12 Müller Upanishad / Āraṇyaka editions                |
| Islam             |                      1 | Tanzil Uthmani Arabic; ClearQuran English, 6,236 explicit verse mappings                                                       |
| Christianity      |                     66 | World English Bible Protestant source books; Hindi IRV 2019 where verse IDs align                                              |
| Judaism           | 39 source subdivisions | Tanakh, JPS 1917 English; grouped as Torah, Prophets and Writings, not a claim of 39 canonical Jewish books                    |
| Buddhism          |                      3 | Dhammapada Pali / Sujato; Kern Lotus Sutra (27-chapter source edition); Fausbøll Sutta Nipāta numbered-verse selection         |
| Jainism           |                      4 | Jacobi Ācārāṅga, Kalpa, Uttarādhyayana and Sūtrakṛtāṅga sutras                                                                 |
| Sikhism           |                      2 | Guru Granth Sahib, 1,430 angs / 26,566 printed-line groups; Macauliffe historical English Japji                                |
| Zoroastrianism    |                      1 | Darmesteter Vendīdād, 22 fargards                                                                                              |
| Taoism            |                      1 | Legge Tao Te Ching, 81 chapters                                                                                                |
| Confucianism      |                      1 | Legge Analects, 20 books                                                                                                       |
| Shinto            |                      1 | Chamberlain Kojiki, source sections across three volumes                                                                       |
| Bahá’í            |                      1 | Hammond's 1909 anthology, selected Seven Valleys / tablets / sayings; historical translations, not current authorized editions |
| Latter-day Saints |                      1 | Project Gutenberg Book of Mormon, 239 chapters / 6,604 explicit verses                                                         |

English is the default study language where the source provides it. Native text
is available for the original Gita, Quran, Dhammapada and Gurbani imports. The
reader exposes all human editions loaded for a passage. It does not pretend an
English edition is original Sanskrit, Hebrew, Greek, Chinese or Japanese.

Additional languages can be requested as clearly labelled, unreviewed AI study
translations for eligible source texts. These are separate from published human
editions, are not canonical text, and can fail or be limited by Groq Free quotas.
ClearQuran (no derivatives), Tanzil verbatim text, SuttaCentral's model restriction,
and the Gurbani import are excluded from this translation feature. Groq is not
fine-tuned: Ask uses retrieved passages plus bounded conversation context.
Word/reference retrieval covers all imported works. The existing meaning index
still covers 6,936 Gita/Quran passages; it has not been rebuilt for the new works.

Historical source limitations remain visible. Some Ramayana canto numbers are
absent in the archive. Its reading blocks are not Sanskrit shloka numbers. The
Ganguli text zip retains its source errata. The archived Japji lacks a separate
XXVII heading. The Sutta Nipāta selection has 1,051 numbered verse paragraphs and
omits prose interludes / editorial notes; it is not a complete critical edition.
Archive typography can retain historical spellings, broken line hyphens and
transcription errors. Source numbering and per-section links are retained.

Preparation uses `scripts/prepare-library.py` and the pinned optional packages in
`scripts/requirements-library.txt`. Raw upstream files are cached locally and
hashed in each edition's provenance. `--reuse-prepared` reuses existing prepared
archive bundles. Runtime reads committed gzip bundles; upstream hosts are not
required for ordinary reading/search. Publication sources are checksum-gated.
Independent printed-edition signoff and owner acceptance remain pending.
