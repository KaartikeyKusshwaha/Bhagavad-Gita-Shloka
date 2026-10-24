# Oracle page-load performance · 25 October 2026

The owner reported slow initial loading and authorized fixing Oracle before moving
hosts. Measurements against public URLs from the VM before the change: Explore
7.04 s total, Read 3.98 s. Local-loopback passage reading was 0.16 s. Home rendering
unnecessarily audited all eligible vectors and catalogue reads repeatedly counted
120,858 passages and joined translations.

Home now checks index existence instead of validating every stored vector; search
still validates content hashes and source permissions. Read catalogue and section
lists have a production-only, database-scoped 60-second cache, including concurrent
request deduplication and failure eviction. No searches, conversations or personal
state are cached. Source publication changes can take up to 60 seconds to reach
these catalogue lists; individual passage queries still use approved-source views.

Release `eec76369a5877ee77f8d233fee61972b618f0b9c` passed CI `40143088111`:
lint, strict types, 34 automated tests, source/database checks, build and 18 browser
flows. Runtime SHA-256:
`582260dc62e31783a7111c73d0a44b251caa83581bac66dfd1c6c7d72d35e093`.
Installed using the backup-and-rollback upgrade procedure.

Post-deploy public URL totals measured from the VM: first Explore 3.41 s after
restart, warm Explore 0.189 s; Read 0.265 s and 0.205 s. These measure response
transfer, not client rendering, and do not guarantee a reader's network latency.
The service remained active with zero automatic restarts after this upgrade.
No hosting move, resource upgrade or paid service was introduced.
