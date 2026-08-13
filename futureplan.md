# E-Bench Per-Law RAG — Future Plan

## Status (June 12, 2026)

**✅ ALL PHASES COMPLETE**

### Phase 1 (Corpus Extraction): COMPLETE
- 18 PDFs extracted with 5 strategies into `RAG/data/<law_id>/corpus.json`
- Footnote filter + title quality gate applied
- Total: ~5,000+ provisions indexed

### Phase 2 (FAISS Indexes): COMPLETE
- Per-law FAISS indexes with `bge-base-en-v1.5` (768-dim)
- 18 indexes, 15.5MB total, 5,641 provisions

### Phase 3 (Master Index): COMPLETE
- `data/master_index.json` router with 18 laws, 15 domains

### Phase 4 (Curated Summaries): COMPLETE
- Rule-based curated content per provision (summary, plain_english, keywords, legal_topics)

### Phase 5 (Cross-References): DEFERRED
- Not implemented — cross-law references handled by `/ask/routed` searching all indexes

### Phase 6 (RAG Server Endpoints): COMPLETE
- `GET /laws` — list all 18 laws
- `GET /laws/{law_id}` — law detail with provision list
- `GET /laws/{law_id}/provisions/{number}` — provision detail
- `POST /ask/routed` — law-filtered Q&A

### Phase 7 (On-Demand Enrichment): COMPLETE
- `POST /laws/{law_id}/provisions/{provision_number}/enrich` — Nemotron-generated doctrines, use_cases, important_concepts
- Cached into `curated.json` for instant subsequent access
- `force=true` parameter to re-enrich

### Phase 8 (Frontend Integration): COMPLETE
- `fetchLaws()`, `fetchLawById()`, `fetchProvisionDetail()`, `enrichProvision()`, `ragAskRouted()` in `lib/userApi.ts`
- Collapsible law-filter bar in `AiLegalChatPage.tsx`

### Phase 9 (Frontend Law Browser): COMPLETE
- `/laws` — Law browser with domain filtering, search, grid view
- `/laws/[lawId]` — Law detail with provision list and search
- `/laws/[lawId]/provisions/[number]` — Provision detail with AI enrichment
- Added to both user and lawyer dashboard sidebars

---

## Key Design Decisions

1. **BNS/BNSS under-capture**: Gazette-format PDFs (BNS, BNSS) have mid-line section numbers. Accepted 46/68 as-is — high-impact introductory sections; body text search via FAISS catches relevant text.

2. **Taxation over-capture**: 1581 provisions (vs expected ~500). Schedule rows are useful for tax queries about specific activities — accepted as semi-useful noise.

3. **Hybrid FAISS query**: All 18 indexes queried in parallel, merged with scores, CrossEncoder on top-K. Default behavior of `POST /ask/routed` without `law_id`.

---

## Runtime Estimates (Actual)

| Phase | Dev Time | Runtime | LLM Time |
|-------|----------|---------|----------|
| 1 — Corpus | Complete | 2 min | — |
| 2 — FAISS | Complete | 45 min | — |
| 3 — Master Index | Complete | 5 min | — |
| 4 — Curated | Complete | — | Rule-based |
| 5 — Cross-refs | Deferred | — | — |
| 6 — Endpoints | Complete | — | — |
| 7 — On-demand | Complete | — | (per-request) |
| 8 — Frontend | Complete | — | — |
| 9 — Law Browser | Complete | — | — |
| **Total** | **Complete** | **~52 min** | **per-request** |
