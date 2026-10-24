# Related passages and cross-tradition browsing

The reader's optional connection view has a graph and an equivalent accessible
list. Selecting a node previews its attributed text; following it makes that
passage the centre of the graph. Mobile controls show one graph/preview at a time.

Use separate edge kinds: `source_sequence` for the neighbouring passages in a
published edition, `cross_reference` for a relationship from an approved source
in the xrefs table, and `suggested` for automatic shared-word candidates. Solid
source edges and dashed suggestions remain distinct in the graph and filters.
Every edge has its basis. No scholarly cross-reference dataset is seeded yet;
show that limitation instead of attributing project-generated links to scholars.

Suggestions use at most eight significant normalized words, with a bounded
PostgreSQL shared-word scan and two candidates. They are not semantic matches or
evidence of equivalent doctrines. No model calls or embedding generation occur.

Explore themes are editorial keyword trails in English and Arabic, not reviewed
theological categories. Search each loaded work separately for exact keyword
matches and interleave at most two per work, preserving edition and tradition
labels. Absence of a matching word is not absence of a teaching. These searches
use the same private history and activity behaviour as ordinary Explore searches.

Verification: real database tests check source-order edges and distinct traditions
in theme results. Browser tests exercise graph filters, preview/follow, accessible
labels, no mobile overflow and reopening a theme from Explore history.
