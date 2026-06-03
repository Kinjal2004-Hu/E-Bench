"""
Generates curated.json per law with rule-based content (no LLM calls).

Produces: summary, plain_english, keywords, legal_topics,
         <domain_field> (null), related (empty).

These can be upgraded with Nemotron later by re-running with LLM enabled.

Run from RAG/:
    python build_curated.py
"""

import json
import re
from pathlib import Path

RAG_DIR = Path(__file__).parent
DATA_DIR = RAG_DIR / "data"

STOPWORDS = {"the", "a", "an", "of", "in", "to", "for", "and", "or", "is", "are",
             "be", "by", "with", "on", "as", "at", "from", "that", "this", "its",
             "shall", "may", "any", "all", "such", "no", "not", "but", "every",
             "under", "into", "after", "before", "upon", "within", "without"}

DOMAIN_TOPICS = {
    "constitution": "Constitutional Law",
    "ica_1872": "Contract Law",
    "tpa_1882": "Property Law",
    "sra_1963": "Civil Remedies",
    "cpa_2019": "Consumer Law",
    "it_act_2000": "Cyber Law",
    "family_laws": "Family Law",
    "labour_employment": "Labour Law",
    "rera": "Real Estate Law",
    "taxation": "Tax Law",
    "corporate": "Corporate Law",
    "securities": "Corporate Law",
    "motor_vehicles": "Transport Law",
    "bns_2023": "Criminal Law",
    "bnss_2023": "Criminal Procedure",
    "bsa_2023": "Evidence Law",
    "gdr_rules_2014": "Corporate Law",
    "dv_act_2005": "Family Law",
}


def extract_keywords(title: str, full: str) -> list[str]:
    text = f"{title} {full[:500]}"
    tokens = re.findall(r"[A-Za-z]{4,}", text)
    tokens = [t.lower() for t in tokens if t.lower() not in STOPWORDS and not t.isdigit()]
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    sorted_kw = sorted(freq.items(), key=lambda x: -x[1])
    return [kw.title() for kw, _ in sorted_kw[:6]]


def build_curated(lid: str) -> dict:
    law_dir = DATA_DIR / lid
    corpus_path = law_dir / "corpus.json"

    with open(corpus_path, "r", encoding="utf-8") as fp:
        corpus = json.load(fp)

    provisions = corpus.get("provisions", [])
    provision_label = corpus.get("provision_label", "Section")
    domain = corpus.get("domain", "Law")
    domain_topic = DOMAIN_TOPICS.get(lid, domain)

    curated = []
    for prov in provisions:
        num = prov.get("number", "?")
        title = prov.get("title", "")
        full = prov.get("full_text", "")
        summary = f"{provision_label} {num}: {title}" if title else f"{provision_label} {num}"
        plain = full[:500].strip() if full else summary
        if len(plain) > 500:
            plain = plain[:plain.rfind(".", 0, 500) + 1]
        plain = plain or summary
        keywords = extract_keywords(title, full)
        legal_topics = [domain_topic]

        curated.append({
            "provision_number": num,
            "summary": summary,
            "plain_english": plain,
            "keywords": keywords,
            "legal_topics": legal_topics,
            "related": [],
        })

    return {"law_id": lid, "domain_field": None, "curated": curated}


if __name__ == "__main__":
    law_ids = sorted(d.name for d in DATA_DIR.iterdir()
                     if d.is_dir() and (DATA_DIR / d.name / "corpus.json").exists())

    for lid in law_ids:
        print(f"=== {lid} ===", flush=True)
        result = build_curated(lid)
        out_path = DATA_DIR / lid / "curated.json"
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  {len(result['curated'])} provisions -> {out_path}", flush=True)

    print("\nDone. All curated.json files written (rule-based, no LLM).", flush=True)
