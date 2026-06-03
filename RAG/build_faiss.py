"""
Per-law FAISS index builder for the E-Bench RAG system.

Iterates over RAG/data/<law_id>/corpus.json, embeds each provision's text
with BAAI/bge-large-en-v1.5, and saves:
  - faiss.index      (FAISS IndexFlatIP)
  - embeddings.npy   (N × 1024 float32)
  - corpus_meta.json (embedding_idx → {number, title, page, provision_label})

Run from RAG/:
    python build_faiss.py
"""

import json
import os
import sys
import time
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

RAG_DIR = Path(__file__).parent
DATA_DIR = RAG_DIR / "data"

MODEL_NAME = "BAAI/bge-base-en-v1.5"
EMBED_DIM = 768
BATCH_SIZE = 128


def build_provision_text(p: dict, provision_label: str) -> str:
    """Build a searchable text string from a provision record."""
    num = p.get("number", "?")
    title = p.get("title", "")
    full = p.get("full_text", "")
    # Use a reasonable prefix length + full body
    text = f"{provision_label} {num}: {title}"
    if full:
        body = full[:1500].strip()
        if body:
            text += f". {body}"
    return text


def build_for_law(law_id: str) -> dict:
    law_dir = DATA_DIR / law_id
    corpus_path = law_dir / "corpus.json"
    if not corpus_path.exists():
        return {"law_id": law_id, "error": f"corpus.json not found at {corpus_path}"}

    with open(corpus_path, "r", encoding="utf-8") as fp:
        corpus = json.load(fp)

    provisions = corpus.get("provisions", [])
    if not provisions:
        return {"law_id": law_id, "error": "No provisions in corpus", "provision_count": 0}

    provision_label = corpus.get("provision_label", "Section")
    texts = [build_provision_text(p, provision_label) for p in provisions]

    t0 = time.perf_counter()
    print(f"  embedding {len(texts)} texts...", flush=True)
    embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=False,
                              normalize_embeddings=True)
    embed_time = time.perf_counter() - t0

    emb_array = np.array(embeddings, dtype=np.float32)

    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(emb_array)
    faiss_time = time.perf_counter() - t0 - embed_time

    # Save artefacts
    faiss_path = law_dir / "faiss.index"
    faiss.write_index(index, str(faiss_path))

    npy_path = law_dir / "embeddings.npy"
    np.save(str(npy_path), emb_array)

    meta = []
    for i, p in enumerate(provisions):
        meta.append({
            "idx": i,
            "number": p.get("number"),
            "title": p.get("title"),
            "page": p.get("page"),
        })
    meta_path = law_dir / "corpus_meta.json"
    with open(meta_path, "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False, indent=2)

    return {
        "law_id": law_id,
        "provision_count": len(provisions),
        "embed_seconds": round(embed_time, 2),
        "faiss_seconds": round(faiss_time, 2),
        "faiss_size_kb": round(os.path.getsize(faiss_path) / 1024, 1),
    }


if __name__ == "__main__":
    import os as _os
    import logging
    _os.environ["TRANSFORMERS_VERBOSITY"] = "error"
    _os.environ["TOKENIZERS_PARALLELISM"] = "false"
    logging.getLogger("transformers").setLevel(logging.ERROR)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    import torch
    _ncpu = _os.cpu_count() or 8
    torch.set_num_threads(_ncpu)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading embedding model: {MODEL_NAME} (device={device}, threads={_ncpu})", flush=True)
    t_start = time.perf_counter()
    model = SentenceTransformer(MODEL_NAME, device=device, cache_folder=_os.path.join(_os.path.expanduser("~"), ".cache", "huggingface", "hub"))
    print(f"Model loaded in {time.perf_counter() - t_start:.1f}s", flush=True)

    law_ids = sorted(d.name for d in DATA_DIR.iterdir()
                     if d.is_dir() and (DATA_DIR / d.name / "corpus.json").exists())
    print(f"Found {len(law_ids)} laws with corpus.json: {law_ids}", flush=True)

    summary = []
    for lid in law_ids:
        print(f"\n=== {lid} ===", flush=True)
        result = build_for_law(lid)
        if "error" in result:
            print(f"  ERROR: {result['error']}", flush=True)
        else:
            print(f"  {result['provision_count']} provisions -> "
                  f"embed {result['embed_seconds']}s, "
                  f"faiss {result['faiss_seconds']}s, "
                  f"index {result['faiss_size_kb']}KB", flush=True)
        summary.append(result)

    summary_path = DATA_DIR / "_faiss_summary.json"
    with open(summary_path, "w", encoding="utf-8") as fp:
        json.dump(summary, fp, ensure_ascii=False, indent=2)
    print(f"\nSummary: {summary_path}", flush=True)
