"""
RAG Retrieval Evaluation — measures precision@k, recall@k, F1@k, MRR, doc accuracy
for the legacy single-index retrieval pipeline (BNSS, BSA, Motor Vehicles Act).
"""
import time, json, numpy as np

print("[eval] Loading RAG modules...")
import main

print("[eval] Building/loading index...")
t0 = time.perf_counter()
index = main.build_index()
main.INDEX = index
n_sec = len(main.SECTIONS)
n_corpus = len(main.CORPUS_META)
print(f"[eval] Index ready ({n_sec} sections, {n_corpus} corpus entries) in {time.perf_counter()-t0:.2f}s")

TEST_QUERIES = [
    {"q": "What is the punishment for driving a motor vehicle without a driving license?",
     "exp": [("Motor Vehicles Act", 3), ("Motor Vehicles Act", 181)]},
    {"q": "How do I apply for a driving license in India?",
     "exp": [("Motor Vehicles Act", 9), ("Motor Vehicles Act", 8)]},
    {"q": "What is the minimum age to drive a motor vehicle?",
     "exp": [("Motor Vehicles Act", 4)]},
    {"q": "What is the procedure for arrest without warrant by a police officer?",
     "exp": [("BNSS", 35)]},
    {"q": "What are the rights of a person after being arrested?",
     "exp": [("BNSS", 38)]},
    {"q": "What is the punishment for driving under the influence of alcohol?",
     "exp": [("Motor Vehicles Act", 185)]},
    {"q": "How to register a motor vehicle in India?",
     "exp": [("Motor Vehicles Act", 39), ("Motor Vehicles Act", 41)]},
    {"q": "Is third party insurance mandatory for motor vehicles?",
     "exp": [("Motor Vehicles Act", 146)]},
    {"q": "What compensation is available for hit and run accident victims?",
     "exp": [("Motor Vehicles Act", 161)]},
    {"q": "How to claim compensation after a motor vehicle accident?",
     "exp": [("Motor Vehicles Act", 166)]},
    {"q": "What should a driver do immediately after causing an accident?",
     "exp": [("Motor Vehicles Act", 134)]},
    {"q": "What is the penalty for driving a motor vehicle without insurance?",
     "exp": [("Motor Vehicles Act", 196)]},
    {"q": "What constitutes dangerous driving under the Motor Vehicles Act?",
     "exp": [("Motor Vehicles Act", 184)]},
    {"q": "What is a Motor Accidents Claims Tribunal?",
     "exp": [("Motor Vehicles Act", 165)]},
    {"q": "When can a police officer search a place without a warrant?",
     "exp": [("BNSS", 103)]},
    {"q": "How long can a person be detained without being produced before a magistrate?",
     "exp": [("BNSS", 57)]},
    {"q": "When can a Magistrate take cognizance of an offence?",
     "exp": [("BNSS", 210)]},
    {"q": "Is a confession made to a police officer admissible as evidence?",
     "exp": [("BSA", 23)]},
    {"q": "When are facts not otherwise relevant made relevant in evidence?",
     "exp": [("BSA", 9)]},
    {"q": "How can a witness refresh their memory while giving testimony in court?",
     "exp": [("BSA", 162)]},
    {"q": "What is the burden of proof regarding whether a person is alive or dead?",
     "exp": [("BSA", 110)]},
    {"q": "What is the process for getting a learner's driving license?",
     "exp": [("Motor Vehicles Act", 8)]},
    {"q": "Is it mandatory to wear a helmet while riding a two-wheeler?",
     "exp": [("Motor Vehicles Act", 129)]},
    {"q": "What documents must a driver produce when requested by a police officer?",
     "exp": [("Motor Vehicles Act", 130)]},
    {"q": "What is the relevancy of a previous court judgment in a new case?",
     "exp": [("BSA", 35)]},
]

K = [1, 3, 5, 7]


def docsec(r):
    s = r["section"]
    return (s["document"], s["section"])


def exp_key(e):
    return (e[0], e[1])


if __name__ == "__main__":
    T = len(TEST_QUERIES)
    cache = {}

    print(f"[eval] Running retrieval for {T} queries...")
    for i, item in enumerate(TEST_QUERIES):
        t0 = time.perf_counter()
        r = main.retrieve(item["q"], top_k=7)
        cache[i] = (r, time.perf_counter() - t0)
        if (i + 1) % 5 == 0:
            print(f"  ... {i+1}/{T} done")

    agg = {k: {"tp": 0, "total_rel": 0} for k in K}
    doc_hit = {k: 0 for k in K}
    rr = []

    print("\n" + "=" * 80)
    print("PER-QUERY RESULTS")
    print("=" * 80)

    for i, item in enumerate(TEST_QUERIES):
        retrieved, elapsed = cache[i]
        exp_set = set(exp_key(e) for e in item["exp"])
        rp = [docsec(r) for r in retrieved[:K[-1]]]
        rp_set_at = {k: set(docsec(r) for r in retrieved[:k]) for k in K}

        first = None
        for rank, pair in enumerate(rp, 1):
            if pair in exp_set:
                first = 1.0 / rank
                break
        rr.append(first or 0.0)

        for k in K:
            hit = rp_set_at[k] & exp_set
            agg[k]["tp"] += len(hit)
            agg[k]["total_rel"] += min(k, len(exp_set))
            if hit:
                doc_hit[k] += 1

        exp_str = ", ".join(f"{d} §{s}" for d, s in item["exp"])
        got_str = ", ".join(f"{d} §{s}" for d, s in rp[:K[0]]) if rp else "—"
        hit_str = ", ".join(f"{d} §{s}" for d, s in (rp_set_at[K[-1]] & exp_set)) if (rp_set_at[K[-1]] & exp_set) else "—"
        print(f"\n  [{i+1:2d}/{T}] {item['q']}")
        print(f"        Expected: {exp_str}")
        print(f"        Top-1:    {got_str}")
        print(f"        Hits@7:   {hit_str}")
        print(f"        Time:     {elapsed:.3f}s | MRR: {first or 0:.3f}")

    print("\n" + "=" * 80)
    print("AGGREGATE RETRIEVAL METRICS")
    print("=" * 80)
    for k in K:
        p = agg[k]["tp"] / (T * k) if T * k > 0 else 0
        r = agg[k]["tp"] / agg[k]["total_rel"] if agg[k]["total_rel"] > 0 else 0
        f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0
        hit_pct = doc_hit[k] / T * 100
        print(f"\n  @k={k}:")
        print(f"    Precision@{k}:  {p:.4f}  ({agg[k]['tp']}/{T*k})")
        print(f"    Recall@{k}:     {r:.4f}  ({agg[k]['tp']}/{agg[k]['total_rel']})")
        print(f"    F1@{k}:         {f1:.4f}")
        print(f"    Hit Rate@{k}:   {hit_pct:.1f}%  ({doc_hit[k]}/{T})")

    mrr = np.mean(rr)
    print(f"\n  MRR:              {mrr:.4f}  ({mrr*100:.1f}%)")
    print(f"  Avg retrieval:    {np.mean([c[1] for c in cache.values()]):.3f}s")

    print(f"\n{'='*80}")
    print("PER-DOCUMENT BREAKDOWN (Hit@1)")
    print("=" * 80)
    for doc_name in ["BNSS", "BSA", "Motor Vehicles Act"]:
        idxs = [i for i, item in enumerate(TEST_QUERIES)
                if any(e[0] == doc_name for e in item["exp"])]
        if not idxs:
            continue
        hits = sum(1 for i in idxs
                   if set(docsec(r) for r in cache[i][0][:1]) &
                   set(exp_key(e) for e in TEST_QUERIES[i]["exp"]))
        print(f"  {doc_name:25s}: {hits:2d}/{len(idxs):2d} = {hits/len(idxs)*100:.0f}%")

    out = {
        "config": {"top_k_vector": 30, "top_k_final": 7, "vector_weight": 0.35,
                   "rerank_weight": 0.65, "hybrid_threshold": 0.35, "mmr_lambda": 0.5,
                   "embed_model": "BAAI/bge-large-en-v1.5",
                   "reranker": "cross-encoder/ms-marco-MiniLM-L-12-v2",
                   "documents": ["BNSS", "BSA", "Motor Vehicles Act"],
                   "total_sections": n_sec, "total_corpus": n_corpus,
                   "test_queries": T},
        "results": {},
        "per_query": {}
    }
    for k in K:
        p = agg[k]["tp"] / (T * k) if T * k > 0 else 0
        r = agg[k]["tp"] / agg[k]["total_rel"] if agg[k]["total_rel"] > 0 else 0
        f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0
        out["results"][f"@{k}"] = {"precision": round(p, 4), "recall": round(r, 4),
                                    "f1": round(f1, 4), "hit_rate": round(doc_hit[k]/T, 4)}
    out["results"]["mrr"] = round(mrr, 4)
    for i, item in enumerate(TEST_QUERIES):
        retrieved, _ = cache[i]
        out["per_query"][item["q"][:60]] = {
            "expected": [f"{d} §{s}" for d, s in item["exp"]],
            "retrieved": [f"{r['section']['document']} §{r['section']['section']}" for r in retrieved],
            "scores": [round(r["score"], 4) for r in retrieved]
        }

    with open("eval_results.json", "w") as f:
        json.dump(out, f, indent=2)
    print(f"\n[eval] Detailed results saved to eval_results.json")
