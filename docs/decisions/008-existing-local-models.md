# Existing free model integration

Use existing Qwen3-1.7B Q8_0 for concise cited study explanations and
Qwen3-Embedding-0.6B Q8_0 for semantic retrieval, served through llama.cpp.
No training, new agent platform, paid model subscription or new client app.
Portable preparation is pinned to official Qwen repository commits and SHA-256
digests. Runtime b11857 CPU/Vulkan archives also have pinned release digests.
Downloads remain in ignored .local/models. Models are Apache-2.0; llama.cpp is MIT.

The optional environment variables select existing HTTP inference endpoints.
Only HTTPS or loopback HTTP is accepted. No endpoint comes from user requests.
Embedding dimensions must be 1024, finite and nonzero. Index only published
source editions that do not exclude model use. Preserve model identity and a
SHA-256 of the exact indexed text; changed text is not retrieved via a stale
vector. The local index covers 6,936 Gita/Quran passages. SuttaCentral's text is
excluded from embeddings, contexts and generated explanations.

Search first resolves actual references and exact wording. Fuzzy SQL calculates
similarities once per text, rather than per correlated passage/translation.
For default searches without an exact hit, fuse lexical and optional semantic
rankings. Explicit meaning search returns a clear unavailable response if its
runtime/index is absent. Similarity scores are not confidence or quotation proof.

Ask uses current question, up to three previous questions and re-resolved published
passage IDs. Do not trust client-supplied scripture/assistant prose. A source
reference is recognized before a whole-question search. Collect nearby context,
then ask the model for short JSON paragraphs with evidence IDs. Every citation
must exist in the supplied evidence. Every explicit reference in a paragraph
must be among its citations; quoted wording must occur in the cited text. Reject
invented URLs/HTML and withhold malformed/unverifiable output. These checks do
not prove interpretive correctness, so label the answer as AI and show sources
first. Missing/busy/failed providers leave the evidence usable. Bound inference
time and concurrency; do not log raw conversations server-side.

Current local evidence: actual 1024-dimensional normalized embedding, 6,936
indexed eligible passages, semantic retrieval of BG 2.62 for anger/desire, and
cited BG 2.47 answers plus follow-up answers. Dedicated live-model browser tests
are separate from provider-free CI and must be run with actual configured models.
Synthetic endpoint tests check vector storage, source exclusion and stale-vector
rejection; they are not model-quality benchmarks. Human evaluation remains pending.

Deployment: the available Oracle E2 micro has 1 GB RAM and existing apps. Its
resource-limited website can be deployed separately, but both local models must
not be started on that host. A model-capable free host or separately verified
free API is still needed for production model availability. No paid upgrade is
authorized. Oracle session refresh/browser access is needed to inspect other
free capacity through the current account.
