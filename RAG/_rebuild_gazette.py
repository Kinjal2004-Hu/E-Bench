"""Rebuild corpus.json for BNS/BNSS/BSA using the gazette parser."""
import json
import sys
import time
sys.path.insert(0, r'D:\Mr.Ashish\EBENCH\RAG')
from pathlib import Path
from build_corpus import (
    LAW_REGISTRY, extract_law, DATA_DIR,
)

IDS = {"bns_2023", "bnss_2023", "bsa_2023"}

summary = []
for law in LAW_REGISTRY:
    if law["id"] not in IDS:
        continue
    print(f"\n=== Extracting {law['id']} ({law['strategy']}) ===")
    t0 = time.perf_counter()
    corpus = extract_law(law)
    law_dir = DATA_DIR / law["id"]
    law_dir.mkdir(parents=True, exist_ok=True)
    with open(law_dir / "corpus.json", "w", encoding="utf-8") as fp:
        json.dump(corpus, fp, ensure_ascii=False, indent=2)
    print(f"  {corpus['provision_count']} provisions in {time.perf_counter()-t0:.1f}s")
    summary.append({
        "id": law["id"],
        "provision_count": corpus.get("provision_count", 0),
        "strategy": law["strategy"],
        "error": corpus.get("error"),
    })

# Patch extraction summary
summary_path = DATA_DIR / "_extraction_summary.json"
if summary_path.exists():
    with open(summary_path, "r", encoding="utf-8") as fp:
        existing = json.load(fp)
    for s in summary:
        for e in existing:
            if e["id"] == s["id"]:
                e.update(s)
    with open(summary_path, "w", encoding="utf-8") as fp:
        json.dump(existing, fp, ensure_ascii=False, indent=2)
    print(f"\nUpdated {summary_path}")

print("\nDone.")
