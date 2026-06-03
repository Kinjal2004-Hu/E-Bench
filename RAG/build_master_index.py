"""
Builds RAG/data/master_index.json — the router for per-law data.

Reads each law's corpus.json and faiss artefacts, and emits:
  - master_index.json with laws[], domain_index, paths

Run from RAG/:
    python build_master_index.py
"""

import json
from pathlib import Path

RAG_DIR = Path(__file__).parent
DATA_DIR = RAG_DIR / "data"

if __name__ == "__main__":
    laws = []
    domain_index = {}

    law_dirs = sorted(d.name for d in DATA_DIR.iterdir()
                      if d.is_dir() and (DATA_DIR / d.name / "corpus.json").exists())

    for lid in law_dirs:
        law_dir = DATA_DIR / lid
        corpus_path = law_dir / "corpus.json"
        meta_path = law_dir / "corpus_meta.json"
        faiss_path = law_dir / "faiss.index"
        emb_path = law_dir / "embeddings.npy"

        with open(corpus_path, "r", encoding="utf-8") as fp:
            corpus = json.load(fp)

        provision_count = corpus.get("provision_count", 0)
        domain = corpus.get("domain", "Unknown")
        strategy = corpus.get("strategy", "default_numbered")
        provision_label = corpus.get("provision_label", "Section")

        law_entry = {
            "id": lid,
            "label": corpus.get("law_name", lid),
            "domain": domain,
            "strategy": strategy,
            "provision_label": provision_label,
            "provision_count": provision_count,
            "has_schedules": corpus.get("has_schedules", False),
            "corpus_json": str(corpus_path.relative_to(RAG_DIR)),
            "corpus_meta": str(meta_path.relative_to(RAG_DIR)) if meta_path.exists() else None,
            "faiss_index": str(faiss_path.relative_to(RAG_DIR)) if faiss_path.exists() else None,
            "embeddings_npy": str(emb_path.relative_to(RAG_DIR)) if emb_path.exists() else None,
            "error": corpus.get("error"),
        }
        laws.append(law_entry)

        if domain:
            domain_index.setdefault(domain, []).append(lid)

    master = {
        "total_laws": len(laws),
        "total_provisions": sum(l["provision_count"] for l in laws),
        "embedding_model": "BAAI/bge-base-en-v1.5",
        "embedding_dim": 768,
        "build_version": "2.0",
        "laws": laws,
        "domain_index": domain_index,
    }

    out_path = DATA_DIR / "master_index.json"
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump(master, fp, ensure_ascii=False, indent=2)

    print(f"Written: {out_path}")
    print(f"  {master['total_laws']} laws, {master['total_provisions']} total provisions")
    print(f"  {len(domain_index)} domains:")
    for domain, ids in sorted(domain_index.items()):
        print(f"    {domain}: {', '.join(ids)}")
