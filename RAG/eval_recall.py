"""Recall evaluation for the unified retrieve() pipeline.

Run:  python eval_recall.py
Loads the per-law indexes in-process (no server, no generator calls), runs a
gold set of queries through main.retrieve(top_k=7) and reports Hit@k / MRR.
"""
import json
import time

import main

GOLD = [
    ("What is Section 302 BNS and its punishment?", "bns_2023", "302"),
    ("What is the punishment for murder in the Bharatiya Nyaya Sanhita?", "bns_2023", "103"),
    ("What does Section 302 of the Indian Penal Code say in BNS?", "bns_2023", "103"),
    ("What is the punishment for rape under BNS?", "bns_2023", "64"),
    ("What is the punishment for dowry death in BNS?", "bns_2023", "80"),
    ("What is Section 302 of BNSS about?", "bnss_2023", "302"),
    ("What is Section 197 of BNSS about?", "bnss_2023", "197"),
    ("What is Section 480 of BNSS about bail?", "bnss_2023", "480"),
    ("What does Section 3 of BSA say about evidence?", "bsa_2023", "3"),
    ("What is Section 66 of the Information Technology Act?", "it_act_2000", "66"),
    ("Section 130 of the Motor Vehicles Act, duty to produce licence?", "motor_vehicles", "130"),
    ("What agreements are contracts under Section 10 of the Indian Contract Act?", "ica_1872", "10"),
    ("What does Article 21 of the Constitution of India protect?", "constitution", "21"),
    ("What does Section 18 of RERA say about return of amount?", "rera", "18"),
    ("What is cheating under Section 420 of the IPC in the new law?", "bns_2023", "318"),
    ("What is the punishment for criminal breach of trust?", "bns_2023", "316"),
    ("What does Section 109 of BNS say about attempt to murder?", "bns_2023", "109"),
    ("What is Section 482 of BNSS about anticipatory bail?", "bnss_2023", "482"),
]

TOP_K = 7


def run():
    print("[eval] loading per-law indexes...")
    main.load_per_law_indexes()
    print("[eval] indexes loaded: %d laws" % len(main.PER_LAW_INDEXES))

    results = []
    hits = {k: 0 for k in (1, 3, 5, 7)}
    mrr_sum = 0.0
    total_time = 0.0

    for query, law_id, number in GOLD:
        t0 = time.perf_counter()
        rows = main.retrieve(query, TOP_K)
        elapsed = time.perf_counter() - t0
        total_time += elapsed

        rank, hit = main_metrics(rows, law_id, number)
        if hit:
            for k in (1, 3, 5, 7):
                if rank <= k:
                    hits[k] += 1
            mrr_sum += 1.0 / rank

        top = [
            {"law": r["section"]["document"], "num": r["provision_number"],
             "title": (r["section"]["title"] or "")[:50], "score": round(r["score"], 4)}
            for r in rows[:5]
        ]
        results.append({
            "query": query, "expected": {"law_id": law_id, "number": number},
            "hit_at": rank if hit else None, "elapsed_s": round(elapsed, 2), "top": top,
        })
        mark = "HIT@%d" % rank if hit else "MISS"
        print("\n[%s] %s" % (mark, query))
        print("  expected %s %s | %.2fs" % (law_id, number, elapsed))
        for t in top:
            print("    %-32s %s  %s  %.4f" % (t["law"], t["num"], t["title"], t["score"]))

    n = len(GOLD)
    print("\n" + "=" * 60)
    print("Recall@1 = %.1f%%  @3 = %.1f%%  @5 = %.1f%%  @7 = %.1f%%" % (
        hits[1] / n * 100, hits[3] / n * 100, hits[5] / n * 100, hits[7] / n * 100))
    print("MRR@7   = %.3f   (avg retrieval %.2fs/query)" % (mrr_sum / n, total_time / n))
    print("=" * 60)

    with open("data/_eval_recall_results.json", "w", encoding="utf-8") as fp:
        json.dump({"results": results, "top_k": TOP_K,
                   "hits": hits, "mrr": round(mrr_sum / n, 4),
                   "avg_retrieval_s": round(total_time / n, 2)}, fp, indent=2)


def main_metrics(rows, law_id, number):
    for rank, r in enumerate(rows, start=1):
        if r["law_id"] == law_id and str(r["provision_number"]) == str(number):
            return rank, True
    return None, False


if __name__ == "__main__":
    run()