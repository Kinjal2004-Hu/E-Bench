RAG Latency & Hit-Rate Improvement Plan
Context
The RAG service (RAG/main.py) runs on Hugging Face Spaces free tier (CPU-only, ~2 vCPU, no GPU). The last saved retrieval eval (RAG/data/_eval_recall_results.json, RAG/eval_recall.py) shows two separate problems that need different fixes:

Latency: ~8-10s per query even for pure retrieve() calls with no LLM involved (no HyDE, no generation) — e.g. every single logged query in the eval, including trivial exact-section-number lookups, took 9.9-10.4s.
Hit rate: Hit@1 = 61%, Hit@3/5/7 plateau at 72% (13/18). The misses aren't random — they cluster in a specific pattern I traced in the code:
Queries with an explicit section number ("Section 302 BNS") hit reliably, because retrieve()'s targeted-routing path (SECTION_NUM_RE + _detect_law_ids in RAG/main.py) short-circuits straight to the right provision with a forced vector_score=10.0.
Queries without a number, or using "Article" instead of "Section" (only SECTION_NUM_RE keywords are recognized — "Article 21" never triggers targeted routing), fall back to pure semantic ranking — e.g. the gold query "What is the punishment for murder in the Bharatiya Nyaya Sanhita?" completely misses BNS §103 "Punishment for murder" even though the provision title is a near-exact paraphrase of the query.
Root cause of that specific miss, traced through retrieve() (RAG/main.py Phase 2-3): all 18 per-law FAISS indexes are searched and pooled into one list, then globally trimmed to RERANK_POOL (default 50) by raw vector score before reranking. Large, generic-boilerplate-heavy indexes (taxation: 1,581 provisions, corporate: 1,217) contain lots of "punishment"/"penalty"/"fine" language that can out-score a correct-but-more-specific BNS candidate on raw cosine similarity, starving BNS out of the shared 50-slot pool entirely — so the CrossEncoder reranker never even gets a chance to see the right answer.
Goal: measurably improve both without a GPU, working within the constraints of HF Spaces free tier.

Phase 0 — Diagnostics (do first, ~2 min, no code changes)
retrieve() already logs a per-stage breakdown (embed=...faiss=...rerank=...total=..., RAG/main.py ~line 826) but eval_recall.py doesn't capture it. Re-run python RAG/eval_recall.py locally with logging visible to confirm the CrossEncoder rerank stage is the dominant cost (expected, given it's a ~130M-param BERT cross-encoder doing up to 50 forward passes per query on CPU) before spending effort optimizing it. This also gives a fresh, non-stale baseline to measure all following changes against.

Phase 1 — Latency fixes
O(1) provision lookup (pure win, zero accuracy risk). load_per_law_indexes() currently leaves each law's provisions as a flat list; every lookup by number — in retrieve() Phase 4 text resolution, the targeted exact-match block, _ranked_to_section_meta(), and _build_context_from_results() — does a linear next((p for p in provisions if ...), None) scan. Build a {number: provision} dict per law once at load time (store alongside the existing corpus/meta/index in PER_LAW_INDEXES[lid]) and use it everywhere instead. For the 1,581-provision taxation index this scan runs up to RERANK_POOL times per query — real, free savings.

Cut CrossEncoder cost directly (main lever, since HF free tier has no GPU):

Skip reranking entirely when targeted produced a confident single exact match (already gets vector_score=10.0 + the 0.15 exact-match boost) — the common "Section N of Law X" query pattern doesn't need a rerank pass at all.
Reduce RERANK_TEXT_LEN (2000 → ~800 chars) — shorter sequences into the CrossEncoder mean a faster forward pass; the decisive content is almost always in the title + opening lines.
Tune RERANK_POOL down from 50 (already an env var, RERANK_POOL) — verify against Phase 0's fresh eval numbers so this doesn't trade away Phase 2's hit-rate fix.
Optional stretch, flagged not committed to: export the CrossEncoder (cross-encoder/ms-marco-MiniLM-L-12-v2) to ONNX via optimum[onnxruntime] for CPU inference speedup, or swap to a smaller cross-encoder (ms-marco-TinyBERT-L-2-v2). Only pursue this after Phase 0 confirms rerank is in fact the bottleneck and Phase 1.1/1.2 aren't sufficient — it's the highest-effort, highest-uncertainty lever and carries its own small accuracy trade-off.

Note, not a code change: HF Spaces free tier sleeps the Space after inactivity, causing a one-time ~30s cold-start (model loading) on the next request. That's separate from steady-state per-query latency and isn't fixable in code — only by keeping the Space warm or upgrading tier.

Phase 2 — Hit-rate fixes
Recognize "Article"/"Rule"/"Regulation" in targeted routing, not just "Section/Sec/S." (SECTION_NUM_RE in RAG/main.py). Cheap, safe fix — gives Constitution and rules-style queries the same reliable exact-match fast path that fixed section-number queries already get. Directly addresses the "Article 21" miss.

Fix cross-law candidate starvation in the Phase 3 pool-trim of retrieve(): replace the pure global all_candidates.sort(...)[:RERANK_POOL] cut with a per-law floor + global fill — guarantee each law with at least one candidate keeps its top ~2-3 by vector score before the remaining slots are filled globally by score. This directly targets the diagnosed "murder in BNS" failure mode (correct-law candidate crowded out by generic boilerplate from much larger indexes) without touching the reranker or embeddings.

Expand the gold eval set (RAG/eval_recall.py's GOLD list, currently 18 queries across 18 laws — thin signal). Add more queries per law, weighted toward natural-language phrasing without explicit section numbers, since that's where the actual gap is. This isn't required for the fix itself but is required to trust that Phase 2.1/2.2 actually help instead of overfitting to the current 18.

Verification
Run python RAG/eval_recall.py before Phase 1/2 changes (Phase 0) and after, diff Hit@1/3/5/7, MRR@7, and avg retrieval latency in the printed summary / RAG/data/_eval_recall_results.json.
Manually re-check the previously-missed gold queries by law_id/number: IT Act §66, Motor Vehicles §130, Contract Act §10, Constitution Art. 21, and the "murder in BNS" natural-language query — confirm they now land in the top results.
Watch the [retrieve] ... embed=...faiss=...rerank=...total=... log line to confirm where time now g