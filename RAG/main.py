import json
import re
import html
import sys
import os
import asyncio
import numpy as np
from pathlib import Path
from functools import lru_cache
from typing import List, Optional
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

load_dotenv()

import httpx
import pdfplumber
import faiss

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from sentence_transformers import SentenceTransformer, CrossEncoder
from openai import OpenAI


DOCUMENTS = {
    "BNS": "BNS2023.pdf",
    "BNSS": "BNSS2023.pdf",
    "BSA": "BSA2023.pdf",
    "Motor Vehicles Act": "MotorVehicleAct.pdf",
    "Corporate Laws": "CorporateLaws.pdf",
    "Securities Laws": "SecurityLaw.pdf"
}

LLM_MODEL = "nvidia/nemotron-3-super-120b-a12b"

# ── Indian Kanoon API ──
IK_API_TOKEN = os.getenv("IK_API_TOKEN", "")
IK_BASE_URL = "https://api.indiankanoon.org"
IK_HEADERS = {
    "Authorization": f"Token {IK_API_TOKEN}",
    "Accept": "application/json",
}

# ── NewsAPI ──
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
NEWSAPI_BASE = "https://newsapi.org/v2"

SECTION_CACHE = Path("law_sections.json")
EMBED_CACHE = Path("law_embeddings.npy")
FAISS_CACHE = Path("law_faiss.index")

TOP_K_VECTOR = 30
TOP_K_FINAL = 7
RERANK_TEXT_LEN = 2000

VECTOR_WEIGHT = 0.35
RERANK_WEIGHT = 0.65


embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY", "")
)

app = FastAPI(
    title="Indian Law AI API",
    description="AI Legal Assistant for BNS, BNSS, BSA, Motor Vehicles Act, Corporate Laws",
    version="6.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECTIONS = []
CORPUS_META = []
INDEX = None


# ── Pydantic Models ──

class SubClause(BaseModel):
    id: str
    text: str
    type: str
    level: int


class Example(BaseModel):
    id: str
    text: str


class SearchResult(BaseModel):
    document: str
    section_number: int
    title: str
    snippet: str
    sub_clause: Optional[SubClause] = None
    example: Optional[Example] = None
    punishment_summary: Optional[str] = None
    rights_summary: Optional[str] = None
    page: int
    score: float
    score_breakdown: Optional[dict] = None


class IKResult(BaseModel):
    """A single result from Indian Kanoon."""
    doc_id: str
    title: str
    headline: str = ""
    source: str = "Indian Kanoon"


class QueryResponse(BaseModel):
    query: str
    ai_answer: str
    results: List[SearchResult]
    total_found: int
    model_used: str
    user_rights: Optional[List[str]] = None
    indian_kanoon_results: Optional[List[IKResult]] = None


class AskRequest(BaseModel):
    question: str
    top_k: int = 7


class AskResponse(BaseModel):
    question: str
    ai_answer: str
    supporting_sections: List[SearchResult]
    model_used: str
    user_rights: Optional[List[str]] = None
    legal_steps: Optional[List[str]] = None
    indian_kanoon_results: Optional[List[IKResult]] = None


class CaseStudy(BaseModel):
    title: str
    facts: str
    legal_issue: str
    key_learning: str
    related_sections: List[str] = []


class MicrolearningAskRequest(BaseModel):
    lesson_id: Optional[str] = None
    lesson_title: str
    law_text: str
    question: str
    top_k: int = 5


class MicrolearningAskResponse(BaseModel):
    lesson_title: str
    question: str
    ai_answer: str
    supporting_sections: List[SearchResult]
    case_studies: List[CaseStudy]
    model_used: str


class ToolCaseAnalyzerRequest(BaseModel):
    case_text: str
    top_k: int = 7


class ToolCaseAnalyzerResponse(BaseModel):
    ai_answer: str
    supporting_sections: List[SearchResult]
    model_used: str


class ToolContractRiskRequest(BaseModel):
    contract_text: str
    top_k: int = 7


class ToolContractRiskResponse(BaseModel):
    ai_answer: str
    supporting_sections: List[SearchResult]
    risk_score: int
    risk_level: str
    flagged_clauses: List[str]
    model_used: str


class ToolCaseSummarizerRequest(BaseModel):
    document_text: str
    top_k: int = 7


class ToolCaseSummarizerResponse(BaseModel):
    ai_answer: str
    supporting_sections: List[SearchResult]
    model_used: str


class LawAwarenessCaseReference(BaseModel):
    case_name: str
    year: str
    principle: str


class LawAwarenessArticleSummary(BaseModel):
    article_id: str
    article_number: str
    title: str
    short_description: str


class LawAwarenessArticleDetail(LawAwarenessArticleSummary):
    rights_explained: str
    practical_use: List[str]
    case_references: List[LawAwarenessCaseReference]


class LawAwarenessListResponse(BaseModel):
    law_title: str
    intro: str
    articles: List[LawAwarenessArticleSummary]


RIGHTS_LAW_DATA = {
    "law_title": "Fundamental Rights of People in India",
    "intro": (
        "A citizen-focused guide to the key Fundamental Rights under the Constitution of India. "
        "Select an article to read what it protects, when it is used, and which landmark cases shaped it."
    ),
    "articles": [
        {
            "article_id": "article-14",
            "article_number": "Article 14",
            "title": "Equality Before Law",
            "short_description": "Protects every person against arbitrary state action and guarantees equal treatment before law.",
            "rights_explained": (
                "Article 14 guarantees equality before law and equal protection of laws. "
                "The State cannot act arbitrarily, selectively, or irrationally while making laws or taking executive action. "
                "Reasonable classification is allowed, but it must have an intelligible basis and a rational link to the objective."
            ),
            "practical_use": [
                "Challenge arbitrary government decisions, discriminatory policies, or unequal treatment by public authorities.",
                "Invoke it where a rule unfairly targets one class without valid legal reason.",
                "Use alongside Articles 19 and 21 when administrative action is unfair and unreasonable."
            ],
            "case_references": [
                {
                    "case_name": "E.P. Royappa v. State of Tamil Nadu",
                    "year": "1974",
                    "principle": "Arbitrariness is antithetical to equality; arbitrary state action violates Article 14."
                },
                {
                    "case_name": "Maneka Gandhi v. Union of India",
                    "year": "1978",
                    "principle": "Fairness, non-arbitrariness, and reasonableness became central to constitutional review."
                }
            ]
        },
        {
            "article_id": "article-19",
            "article_number": "Article 19",
            "title": "Freedoms of Speech, Movement and Association",
            "short_description": "Covers core civil freedoms such as speech, assembly, association, movement, residence, and profession.",
            "rights_explained": (
                "Article 19(1) grants key freedoms to citizens, including free speech and expression, peaceful assembly, forming associations, "
                "moving freely, residing anywhere in India, and practising a profession or business. These freedoms are subject to reasonable restrictions "
                "in the interests of public order, sovereignty, morality, security, and other constitutionally recognised grounds."
            ),
            "practical_use": [
                "Raise it when speech is curtailed without lawful basis or a permit condition is excessive.",
                "Use it in disputes involving bans on meetings, associations, protests, or trade activity.",
                "Check whether the restriction is proportionate and grounded in a valid statute."
            ],
            "case_references": [
                {
                    "case_name": "Shreya Singhal v. Union of India",
                    "year": "2015",
                    "principle": "Struck down Section 66A of the IT Act for violating free speech protections."
                },
                {
                    "case_name": "Bennett Coleman & Co. v. Union of India",
                    "year": "1973",
                    "principle": "Freedom of the press is an essential part of Article 19(1)(a)."
                }
            ]
        },
        {
            "article_id": "article-21",
            "article_number": "Article 21",
            "title": "Right to Life and Personal Liberty",
            "short_description": "Ensures that no person is deprived of life or personal liberty except by just, fair, and reasonable procedure.",
            "rights_explained": (
                "Article 21 has evolved into the broadest human-rights guarantee in Indian constitutional law. "
                "It covers dignity, privacy, livelihood, legal aid, a clean environment, fair procedure, health, and many other protections. "
                "Any procedure restricting liberty must be just, fair, and reasonable, not merely formally valid."
            ),
            "practical_use": [
                "Use it in cases involving unlawful detention, police excess, privacy invasion, or denial of dignified treatment.",
                "Rely on it where executive action affects survival, health, shelter, or procedural fairness.",
                "It often works together with Articles 14 and 22 in custody-related matters."
            ],
            "case_references": [
                {
                    "case_name": "Maneka Gandhi v. Union of India",
                    "year": "1978",
                    "principle": "Expanded personal liberty and required fair, just, and reasonable procedure."
                },
                {
                    "case_name": "Justice K.S. Puttaswamy v. Union of India",
                    "year": "2017",
                    "principle": "Recognised privacy as a fundamental right under Article 21."
                }
            ]
        },
        {
            "article_id": "article-21a",
            "article_number": "Article 21A",
            "title": "Right to Education",
            "short_description": "Provides free and compulsory education for children between 6 and 14 years of age.",
            "rights_explained": (
                "Article 21A obligates the State to provide free and compulsory education to children aged 6 to 14 years. "
                "It strengthens access to schooling as a constitutional entitlement and is closely linked to dignity, development, and equality."
            ),
            "practical_use": [
                "Use it when a child is denied admission, basic access, or state educational support within the protected age group.",
                "Relevant in school-access disputes, neighbourhood-school issues, and public education enforcement.",
                "Works alongside the Right of Children to Free and Compulsory Education Act, 2009."
            ],
            "case_references": [
                {
                    "case_name": "Mohini Jain v. State of Karnataka",
                    "year": "1992",
                    "principle": "Recognised the importance of education as integral to constitutional freedoms."
                },
                {
                    "case_name": "Unni Krishnan v. State of Andhra Pradesh",
                    "year": "1993",
                    "principle": "Laid the foundation for later constitutional recognition of the right to education."
                }
            ]
        },
        {
            "article_id": "article-22",
            "article_number": "Article 22",
            "title": "Protection Against Arbitrary Arrest and Detention",
            "short_description": "Grants safeguards such as being informed of grounds of arrest and consulting a lawyer.",
            "rights_explained": (
                "Article 22 provides procedural safeguards for arrested persons, including the right to be informed of the grounds of arrest, "
                "the right to consult and be defended by a legal practitioner, and production before a magistrate within 24 hours, subject to exceptions."
            ),
            "practical_use": [
                "Use it immediately after arrest or detention to test whether procedural safeguards were followed.",
                "Relevant where police fail to communicate grounds of arrest or delay production before a magistrate.",
                "Often relied on together with statutory safeguards under criminal procedure."
            ],
            "case_references": [
                {
                    "case_name": "D.K. Basu v. State of West Bengal",
                    "year": "1997",
                    "principle": "Laid down arrest and detention guidelines to curb custodial abuse."
                },
                {
                    "case_name": "Joginder Kumar v. State of Uttar Pradesh",
                    "year": "1994",
                    "principle": "Arrest must not be routine; necessity and justification matter."
                }
            ]
        },
        {
            "article_id": "article-32",
            "article_number": "Article 32",
            "title": "Right to Constitutional Remedies",
            "short_description": "Allows a person to directly approach the Supreme Court for enforcement of fundamental rights.",
            "rights_explained": (
                "Article 32 is the enforcement mechanism for Fundamental Rights. "
                "It empowers the Supreme Court to issue writs such as habeas corpus, mandamus, prohibition, certiorari, and quo warranto where fundamental rights are violated."
            ),
            "practical_use": [
                "Use it when there is a direct and serious violation of a Fundamental Right requiring constitutional remedy.",
                "Helpful in urgent liberty matters, unlawful detention, censorship, or systemic state violations.",
                "High Courts provide similar remedies under Article 226, often used first in practice."
            ],
            "case_references": [
                {
                    "case_name": "Romesh Thappar v. State of Madras",
                    "year": "1950",
                    "principle": "Confirmed the importance of direct constitutional remedy for free speech violations."
                },
                {
                    "case_name": "Bandhua Mukti Morcha v. Union of India",
                    "year": "1984",
                    "principle": "Expanded public interest litigation for enforcing fundamental rights of vulnerable groups."
                }
            ]
        }
    ]
}


def chunk_text(text, chunk_size=220, overlap=40):
    words = text.split()
    chunks = []
    step = chunk_size - overlap

    for i in range(0, len(words), step):
        chunk = words[i:i + chunk_size]
        if chunk:
            chunks.append(" ".join(chunk))

    return chunks


def parse_sub_clauses(text):
    """Parse section text into structured sub-clauses with numbered/lettered/roman nesting."""
    if not text or len(text.strip()) < 5:
        return []

    clause_re = re.compile(r'(?:\s+|^)\((\d{1,3}|[a-z]|[ivxlcdm]{1,4})\)(?:\s+|$)')
    matches = []
    for m in clause_re.finditer(text):
        cid = m.group(1)
        if cid.isdigit() and 1 <= int(cid) <= 999:
            matches.append((m, "numbered", 0))
        elif cid.isalpha() and all(c in "ivxlcdm" for c in cid) and cid in ("i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"):
            matches.append((m, "roman", 2))
        elif len(cid) == 1 and cid.isalpha() and cid >= 'a' and cid <= 'z' and cid not in ("i", "v", "x"):
            matches.append((m, "lettered", 1))

    if not matches:
        return [{"id": "main", "text": text.strip(), "type": "text", "level": 0}]

    sub_clauses = []
    for i, (m, ctype, level) in enumerate(matches):
        if i == 0:
            preamble = text[:m.start()].strip()
            if preamble:
                sub_clauses.append({"id": "preamble", "text": preamble, "type": "preamble", "level": 0})
        sc_start = m.end()
        sc_end = matches[i + 1][0].start() if i + 1 < len(matches) else len(text)
        sc_text = text[sc_start:sc_end].strip()
        sub_clauses.append({"id": m.group(1), "text": sc_text, "type": ctype, "level": level})

    return sub_clauses


def parse_examples(text):
    """Extract Illustration/Example blocks from section text."""
    if not text:
        return []

    illus_match = re.search(r'Illustrations?\.', text)
    if not illus_match:
        return []

    illus_text = text[illus_match.end():].strip()
    ex_re = re.compile(r'\s*\(([a-z])\)\s+')
    matches = list(ex_re.finditer(illus_text))

    if not matches:
        return [{"id": "illus", "text": illus_text}]

    examples = []
    for i, m in enumerate(matches):
        ex_start = m.end()
        ex_end = matches[i + 1].start() if i + 1 < len(matches) else len(illus_text)
        examples.append({"id": f"illus_{m.group(1)}", "text": illus_text[ex_start:ex_end].strip()})

    return examples


def extract_sub_clauses_and_examples(text):
    """Parse full section text into (sub_clauses, examples) tuples.

    Handles: section preamble, (1)(2) numbered, (a)(b) lettered,
             (i)(ii) roman, Explanation., Provided that, and Illustrations.
    """
    if not text or len(text.strip()) < 10:
        return [], []

    illus_match = re.search(r'Illustrations?\.', text)
    main_text = text[:illus_match.start()].strip() if illus_match else text.strip()
    illus_section = text[illus_match.start():] if illus_match else ""

    expl_pattern = re.compile(r'Explanation\s*(\d*)\.\s*')

    def _split_at_explanations(txt):
        """Split text at Explanation boundaries, return list of (text, is_explanation, expl_number)."""
        segments = []
        matches = list(expl_pattern.finditer(txt))
        if not matches:
            if txt.strip():
                segments.append((txt.strip(), False, None))
            return segments
        pos = 0
        for i, m in enumerate(matches):
            if pos < m.start():
                before = txt[pos:m.start()].strip()
                if before:
                    segments.append((before, False, None))
            expl_num = m.group(1) if m.group(1) else "1"
            pos = m.end()
            if i + 1 < len(matches):
                expl_text = txt[pos:matches[i+1].start()].strip()
            else:
                expl_text = txt[pos:].strip() if pos < len(txt) else ""
            if expl_text:
                segments.append((expl_text, True, expl_num))
            if i + 1 < len(matches):
                pos = matches[i+1].start()
        return segments

    main_segments = _split_at_explanations(main_text)

    sub_clauses = []
    for seg_text, is_expl, expl_num in main_segments:
        parsed = parse_sub_clauses(seg_text)
        for sc in parsed:
            if is_expl:
                sc["type"] = "explanation"
                sc["level"] = 0
                sc["id"] = f"expl_{expl_num}"
            sub_clauses.append(sc)

    examples = parse_examples(illus_section)

    return sub_clauses, examples


def extract_sections():

    sections = []

    for doc_name, pdf_path in DOCUMENTS.items():

        try:

            with pdfplumber.open(pdf_path) as pdf:

                current = None
                text_buf = []

                for page_num, page in enumerate(pdf.pages):

                    raw = page.extract_text()

                    if not raw:
                        continue

                    for line in raw.split("\n"):

                        m = re.match(r"^(\d{1,4})\.\s+(.+)", line)

                        if m:

                            if current:

                                full_text = " ".join(text_buf)
                                sub_clauses, examples = extract_sub_clauses_and_examples(full_text)

                                sections.append({
                                    "document": current["document"],
                                    "section": current["section"],
                                    "title": current["title"],
                                    "page": current["page"],
                                    "full_text": full_text,
                                    "sub_clauses": sub_clauses,
                                    "examples": examples
                                })

                            current = {
                                "document": doc_name,
                                "section": int(m.group(1)),
                                "title": m.group(2),
                                "page": page_num + 1
                            }

                            text_buf = []

                        else:
                            text_buf.append(line)

                if current:

                    full_text = " ".join(text_buf)
                    sub_clauses, examples = extract_sub_clauses_and_examples(full_text)

                    sections.append({
                        "document": current["document"],
                        "section": current["section"],
                        "title": current["title"],
                        "page": current["page"],
                        "full_text": full_text,
                        "sub_clauses": sub_clauses,
                        "examples": examples
                    })

        except Exception as e:
            print("PDF parse error:", pdf_path, e)

    return sections


def build_corpus(sections):
    """Build flat corpus entries and metadata mapping from structured sections."""
    corpus = []
    meta = []

    for sec_idx, sec in enumerate(sections):
        doc_prefix = f"{sec['document']} Section {sec['section']} {sec['title']}"

        sc_list = sec.get("sub_clauses", [])
        is_purely_structural = (
            len(sc_list) <= 1
            and (len(sc_list) == 0 or sc_list[0].get("id") == "main")
            and not sec.get("examples")
        )

        if is_purely_structural:
            text = sec.get("full_text", "")
            if text:
                corpus.append(f"{doc_prefix}: {text}")
                meta.append({"section_idx": sec_idx, "sub_clause_id": None, "example_id": None, "type": "section"})
            continue

        for sc in sec.get("sub_clauses", []):
            if sc["id"] == "preamble":
                prefix = doc_prefix
            elif sc["type"] in ("numbered", "lettered", "roman"):
                prefix = f"{doc_prefix} ({sc['id']})"
            else:
                prefix = doc_prefix

            text = sc["text"]
            if text and len(text) > 3:
                corpus.append(f"{prefix}: {text}")
                meta.append({"section_idx": sec_idx, "sub_clause_id": sc["id"], "example_id": None, "type": "sub_clause"})

        for ex in sec.get("examples", []):
            text = ex["text"]
            if text and len(text) > 3:
                corpus.append(f"{doc_prefix} - {ex['id']}: {text}")
                meta.append({"section_idx": sec_idx, "sub_clause_id": None, "example_id": ex["id"], "type": "example"})

    return corpus, meta


def build_index():

    global SECTIONS, CORPUS_META

    if SECTION_CACHE.exists():

        with open(SECTION_CACHE) as f:
            SECTIONS = json.load(f)

        corpus, CORPUS_META = build_corpus(SECTIONS)

    else:

        SECTIONS = extract_sections()

        with open(SECTION_CACHE, "w") as f:
            json.dump(SECTIONS, f, indent=2)

        corpus, CORPUS_META = build_corpus(SECTIONS)

    if EMBED_CACHE.exists():

        embeddings = np.load(EMBED_CACHE)

    else:

        embeddings = embed_model.encode(
            corpus,
            normalize_embeddings=True,
            show_progress_bar=True,
            batch_size=128
        )

        np.save(EMBED_CACHE, embeddings)

    dim = embeddings.shape[1]

    if FAISS_CACHE.exists():

        index = faiss.read_index(str(FAISS_CACHE))

    else:

        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        faiss.write_index(index, str(FAISS_CACHE))

    print(f"[build_index] {len(SECTIONS)} sections, {len(corpus)} corpus entries indexed", flush=True)
    return index


def mmr_diversify(ranked_entries, top_k, lambda_mmr=0.5):
    """Maximum Marginal Relevance to diversify results by source section.

    MMR = lambda * relevance - (1-lambda) * max_similarity_to_selected
    Uses FAISS index reconstruction for embedding similarity.
    """
    if len(ranked_entries) <= top_k:
        return ranked_entries[:top_k]

    entry_list = list(ranked_entries)
    selected = []
    pool = list(enumerate(entry_list))

    pool_emb = []
    for _, (_, _, _, idx) in pool:
        pool_emb.append(INDEX.reconstruct(int(idx)))
    pool_emb = np.array(pool_emb)

    sel_emb = [pool_emb[0]]
    selected.append(pool.pop(0))
    pool_emb = pool_emb[1:]

    while len(selected) < top_k and len(pool) > 0:
        sim_matrix = np.dot(pool_emb, np.array(sel_emb).T)
        max_sim = sim_matrix.max(axis=1) if sim_matrix.ndim > 1 else sim_matrix

        mmr_vals = []
        for i, (_, (h, _, _, _)) in enumerate(pool):
            mmr = lambda_mmr * h - (1 - lambda_mmr) * float(max_sim[i])
            mmr_vals.append(mmr)

        best = int(np.argmax(mmr_vals))
        sel_emb.append(pool_emb[best])
        selected.append(pool.pop(best))
        pool_emb = np.delete(pool_emb, best, axis=0)

    return [item for _, item in selected]


@lru_cache(maxsize=256)
def retrieve(query, top_k=TOP_K_FINAL):

    qvec = embed_model.encode([query], normalize_embeddings=True)

    raw_scores, ids = INDEX.search(qvec, TOP_K_VECTOR)

    vector_scores = raw_scores[0]

    pairs = []
    valid_indices = []
    for i in ids[0]:
        meta = CORPUS_META[i]
        sec = SECTIONS[meta["section_idx"]]
        text = sec.get("full_text", "")
        if meta["sub_clause_id"] and meta["sub_clause_id"] != "main":
            match = [sc for sc in sec.get("sub_clauses", []) if sc["id"] == meta["sub_clause_id"]]
            if match:
                text = match[0]["text"]
        elif meta["example_id"]:
            match = [ex for ex in sec.get("examples", []) if ex["id"] == meta["example_id"]]
            if match:
                text = match[0]["text"]
        pairs.append((query, text[:RERANK_TEXT_LEN]))
        valid_indices.append(i)

    rerank_raw = reranker.predict(pairs)

    def sigmoid(x):
        return 1 / (1 + np.exp(-x))

    rerank_norm = sigmoid(np.array(rerank_raw))

    v_min, v_max = vector_scores.min(), vector_scores.max()
    v_range = v_max - v_min if v_max != v_min else 1

    vector_norm = (vector_scores - v_min) / v_range

    hybrid = VECTOR_WEIGHT * vector_norm + RERANK_WEIGHT * rerank_norm

    ranked = sorted(
        zip(hybrid, vector_norm, rerank_norm, valid_indices),
        reverse=True
    )

    ranked = [r for r in ranked if r[0] > 0.35]
    ranked = mmr_diversify(ranked, top_k)

    results = []

    for h_score, v_score, r_score, idx in ranked:

        meta = CORPUS_META[idx]
        sec = SECTIONS[meta["section_idx"]]

        sub_clause = None
        if meta["sub_clause_id"]:
            match = [sc for sc in sec.get("sub_clauses", []) if sc["id"] == meta["sub_clause_id"]]
            if match:
                sub_clause = match[0]

        example = None
        if meta["example_id"]:
            match = [ex for ex in sec.get("examples", []) if ex["id"] == meta["example_id"]]
            if match:
                example = match[0]

        snippet_text = sec.get("full_text", "")[:400]
        if sub_clause:
            snippet_text = sub_clause["text"][:400]
        elif example:
            snippet_text = example["text"][:400]

        results.append({
            "score": float(h_score),
            "score_breakdown": {
                "hybrid": round(float(h_score), 4),
                "vector_similarity": round(float(v_score), 4),
                "reranker_relevance": round(float(r_score), 4)
            },
            "section": sec,
            "snippet": snippet_text,
            "sub_clause": sub_clause,
            "example": example
        })

    return results


def extract_punishment(text):

    patterns = [
        r"(?:shall be punished|punishable)[^.]{0,250}\.",
        r"imprisonment[^.]{0,200}\.",
        r"fine[^.]{0,150}\.",
        r"death[^.]{0,100}\."
    ]

    for p in patterns:

        m = re.search(p, text, re.IGNORECASE)

        if m:
            return m.group(0).strip()

    return None


# ── Indian Kanoon helpers ──

def _strip_html(raw: str) -> str:
    """Remove HTML tags from Indian Kanoon response text."""
    text = re.sub(r"<[^>]+>", "", raw)
    return html.unescape(text).strip()


def build_case_summary(raw_html: str, title: str) -> str:
    """Generate a detailed, structured summary of a full judgment using LLM."""
    # Preserve some paragraph structure before stripping tags.
    text = re.sub(r"<(?:p|br|div|li|tr|h[1-6])[^>]*>", "\n", raw_html, flags=re.IGNORECASE)
    text = _strip_html(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text).strip()

    if not text:
        return "No readable case text was returned by Indian Kanoon for this document."

    # Keep within model context while retaining the most informative beginning of the judgment.
    context = text[:18000]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior Indian legal analyst. Produce a detailed but clear case summary. "
                "Use headings and bullet points. Prefer precise legal language. "
                "Do not hallucinate facts not present in the text."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Case title: {title}\n\n"
                "Summarize this full judgment with these sections:\n"
                "1) Background and facts\n"
                "2) Key legal issues\n"
                "3) Parties' arguments\n"
                "4) Court's reasoning\n"
                "5) Final decision and relief\n"
                "6) Key legal principles / precedent value\n"
                "7) Practical takeaway for a litigant\n\n"
                "If any section is unavailable in text, explicitly say 'Not clearly stated in extracted text'.\n\n"
                f"Judgment text:\n{context}"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0,
        max_tokens=16384,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384}
    )
    return (response.choices[0].message.content or "").strip()


def ik_search(query: str, page: int = 0, max_results: int = 5) -> List[dict]:
    """Search Indian Kanoon and return a list of result dicts."""
    try:
        resp = httpx.post(
            f"{IK_BASE_URL}/search/",
            data={"formInput": query, "pagenum": page},
            headers=IK_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        docs = data.get("docs", [])[:max_results]
        results = []
        for d in docs:
            results.append({
                "doc_id": str(d.get("tid", "")),
                "title": _strip_html(d.get("title", "")),
                "headline": _strip_html(d.get("headline", "")),
            })
        return results
    except Exception as e:
        print(f"Indian Kanoon search error: {e}")
        return []


def ik_get_document(doc_id: str) -> dict:
    """Fetch a full document from Indian Kanoon by doc ID."""
    try:
        resp = httpx.get(
            f"{IK_BASE_URL}/doc/{doc_id}/",
            headers=IK_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Indian Kanoon doc error: {e}")
        return {}


def ik_get_docmeta(doc_id: str) -> dict:
    """Fetch document metadata from Indian Kanoon."""
    try:
        resp = httpx.get(
            f"{IK_BASE_URL}/docmeta/{doc_id}/",
            headers=IK_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Indian Kanoon docmeta error: {e}")
        return {}


def ik_doc_fragment(doc_id: str, query: str) -> dict:
    """Fetch document fragments matching a query from Indian Kanoon."""
    try:
        resp = httpx.get(
            f"{IK_BASE_URL}/docfragment/{doc_id}/",
            params={"formInput": query},
            headers=IK_HEADERS,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Indian Kanoon fragment error: {e}")
        return {}


# ── Case section parsing ──

LEGAL_SECTION_KEYWORDS = {
    "Facts": ["facts", "background", "brief facts", "factual background", "case arose"],
    "Issues": ["issues", "question", "points for consideration", "issue involved"],
    "Arguments": ["argument", "submission", "contention", "counsel submitted", "pleading"],
    "Judgment": ["held", "judgment", "order", "disposed", "dismissed", "allowed", "decided"],
    "Ratio": ["ratio", "ratio decidendi", "legal principle", "principle of law"],
    "Reasoning": ["reasoning", "analysis", "consideration", "finding", "observed"],
    "Relief": ["relief", "remedy", "direction", "compensation", "awarded", "damages"],
    "Conclusion": ["conclusion", "therefore", "accordingly", "result", "in view of"],
}


def _detect_section_label(text: str) -> str:
    lower = text.lower()
    for label, keywords in LEGAL_SECTION_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return label
    return ""


def parse_case_into_sections(raw_html: str) -> List[dict]:
    """Convert raw HTML case text into step-by-step named sections."""
    text = re.sub(r"<(?:p|br|div|h[1-6]|li|tr)[^>]*>", "\n", raw_html, flags=re.IGNORECASE)
    text = _strip_html(text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 80]

    if not paragraphs:
        return [{"step": 1, "heading": "Full Case", "content": text[:3000]}]

    sections = []
    step = 0
    seen_labels = {}

    for para in paragraphs[:20]:
        first_line = para.split("\n")[0].strip()
        if first_line.isupper() and 3 < len(first_line) < 80:
            heading = first_line.title()
            content = para[len(first_line):].strip() or para
        else:
            label = _detect_section_label(para[:300])
            if label:
                count = seen_labels.get(label, 0) + 1
                seen_labels[label] = count
                heading = label if count == 1 else f"{label} (cont.)"
            else:
                heading = ""
            content = para

        if not heading:
            heading = f"Section {step + 1}"

        step += 1
        sections.append({"step": step, "heading": heading, "content": content[:2000]})

    return sections


class CaseSection(BaseModel):
    step: int
    heading: str
    content: str


class CaseSectionsResponse(BaseModel):
    doc_id: str
    title: str
    source: str
    sections: List[CaseSection]


class CaseAskRequest(BaseModel):
    section_text: str
    question: str


class CaseAskResponse(BaseModel):
    question: str
    section_heading: str
    ai_answer: str
    model_used: str


SYSTEM_PROMPT = """
You are an expert Indian legal assistant.

Use the provided legal sections and any Indian Kanoon case-law context.

Explain the law clearly, cite Act and Section numbers, and reference
relevant case names when available.
"""


def ask_llm(question, sections, ik_results=None):

    context = ""

    for s in sections:
        sec_text = s.get("full_text") or " ".join(sc["text"] for sc in s.get("sub_clauses", []))
        context += f"\n{s['document']} Section {s['section']} — {s['title']}\n{sec_text}\n"

    if ik_results:
        context += "\n--- Indian Kanoon Case Law ---\n"
        for ik in ik_results:
            context += f"\n[{ik['title']}]\n{ik.get('headline', '')}\n"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Question: {question}\n\nRelevant law:\n{context}"
        }
    ]

    print(f"[ask_llm] sending to LLM: question='{question[:100]}' sections={len(sections)} ik_results={len(ik_results or [])}", flush=True)
    try:
        # Use non-streaming for faster response
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=4096
        )
        answer = completion.choices[0].message.content
        print(f"[ask_llm] done: content_len={len(answer)}", flush=True)
        return answer
    except Exception as e:
        print(f"[ask_llm] ERROR: {e}", flush=True)
        return f"Sorry, I encountered an error: {str(e)}"


def _extract_json_object(text: str) -> Optional[dict]:
    """Extract first JSON object from model output text."""
    if not text:
        return None
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _normalize_risk_level(score: int) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


def to_search_results(ranked):

    results = []

    for r in ranked:
        sec = r["section"]
        text_for_punishment = sec.get("full_text", "")
        if r.get("sub_clause"):
            text_for_punishment = r["sub_clause"]["text"]

        sub_clause_model = None
        if r.get("sub_clause"):
            sub_clause_model = SubClause(**r["sub_clause"])

        example_model = None
        if r.get("example"):
            example_model = Example(**r["example"])

        results.append(
            SearchResult(
                document=sec["document"],
                section_number=sec["section"],
                title=sec["title"],
                snippet=r.get("snippet", sec.get("full_text", "")[:400]),
                sub_clause=sub_clause_model,
                example=example_model,
                punishment_summary=extract_punishment(text_for_punishment),
                page=sec["page"],
                score=r["score"],
                score_breakdown=r["score_breakdown"]
            )
        )

    return results


def build_case_studies(question, sections, ik_results=None):

    case_studies = []

    for i, sec in enumerate(sections[:2], start=1):
        section_ref = f"{sec['document']} Section {sec['section']}"
        case_studies.append(
            CaseStudy(
                title=f"Case Study {i}: Applying {section_ref}",
                facts=f"A citizen faces a legal problem similar to '{question}'. Authorities need to act within due legal process.",
                legal_issue=f"Whether safeguards under {section_ref} and related procedure were followed.",
                key_learning=f"Map facts to statutory elements first, then evaluate remedies under {section_ref}.",
                related_sections=[section_ref],
            )
        )

    if ik_results:
        first_case = ik_results[0]
        case_studies.append(
            CaseStudy(
                title="Case Study 3: Case-Law Perspective",
                facts=f"Reference judgment: {first_case.get('title', 'Indian Kanoon precedent')}",
                legal_issue="How precedent can guide interpretation of facts in similar disputes.",
                key_learning="Use case-law ratio to strengthen legal reasoning beyond bare section text.",
                related_sections=[],
            )
        )

    return case_studies[:3]


@app.on_event("startup")
def startup():

    global INDEX

    INDEX = build_index()


@app.get("/", response_class=HTMLResponse)
def home():

    return """
    <h1>Indian Law AI Assistant</h1>
    <p>Supports BNS, BNSS, BSA, Motor Vehicles Act, Corporate Laws + Indian Kanoon Case Law</p>
    <a href="/docs">API Docs</a>
    """


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):

    print(f"[ask] question='{body.question}' top_k={body.top_k}", flush=True)

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, body.question, body.top_k)
    ik_task = loop.run_in_executor(None, ik_search, body.question, 0, 5)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
    print(f"[ask] retrieved {len(ranked)} sections, {len(ik_raw)} ik results", flush=True)

    sections = [r["section"] for r in ranked]

    ai_answer = await loop.run_in_executor(None, ask_llm, body.question, sections, ik_raw)
    print(f"[ask] ai_answer length={len(ai_answer)} preview='{ai_answer[:200]}'", flush=True)

    results = to_search_results(ranked)

    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]

    return AskResponse(
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        model_used=LLM_MODEL,
        indian_kanoon_results=ik_models,
    )


@app.post("/ask/stream")
def ask_stream(body: AskRequest):
    print(f"[ask/stream] question='{body.question}'", flush=True)

    ranked = retrieve(body.question, body.top_k)
    sections = [r["section"] for r in ranked]
    ik_raw = ik_search(body.question, max_results=5)

    context = ""
    for s in sections:
        sec_text = s.get("full_text") or " ".join(sc["text"] for sc in s.get("sub_clauses", []))
        context += f"\n{s['document']} Section {s['section']} — {s['title']}\n{sec_text}\n"
    if ik_raw:
        context += "\n--- Indian Kanoon Case Law ---\n"
        for ik in ik_raw:
            context += f"\n[{ik['title']}]\n{ik.get('headline', '')}\n"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Question: {body.question}\n\nRelevant law:\n{context}"}
    ]

    sections_meta = [{"document": s["document"], "section_number": s["section"], "title": s["title"], "snippet": (s.get("full_text") or "")[:400]} for s in sections]
    ik_meta = [{"doc_id": d["doc_id"], "title": d["title"], "headline": d.get("headline", "")} for d in ik_raw]

    def event_stream():
        try:
            completion = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                temperature=0,
                max_tokens=16384,
                extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384},
                stream=True
            )
            for chunk in completion:
                if not chunk.choices:
                    continue
                if chunk.choices[0].delta.content is not None:
                    yield f"data: {json.dumps({'t': 'token', 'c': chunk.choices[0].delta.content})}\n\n"
        except Exception as e:
            print(f"[ask/stream] ERROR: {e}", flush=True)
            yield f"data: {json.dumps({'t': 'error', 'c': str(e)})}\n\n"

        yield f"data: {json.dumps({'t': 'meta', 'sections': sections_meta, 'ik': ik_meta})}\n\n"
        yield f"data: {json.dumps({'t': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/query", response_model=QueryResponse)
async def query(q: str = Query(...), top_k: int = 7):

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, q, top_k)
    ik_task = loop.run_in_executor(None, ik_search, q, 0, 5)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
    sections = [r["section"] for r in ranked]

    ai_answer = await loop.run_in_executor(None, ask_llm, q, sections, ik_raw)

    results = to_search_results(ranked)

    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]

    return QueryResponse(
        query=q,
        ai_answer=ai_answer,
        results=results,
        total_found=len(results),
        model_used=LLM_MODEL,
        user_rights=None,
        indian_kanoon_results=ik_models,
    )


@app.post("/microlearning/ask", response_model=MicrolearningAskResponse)
async def microlearning_ask(body: MicrolearningAskRequest):

    composite_query = (
        f"Lesson: {body.lesson_title}. "
        f"Law Text: {body.law_text}. "
        f"User Question: {body.question}"
    )

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, composite_query, body.top_k)
    ik_task = loop.run_in_executor(None, ik_search, f"{body.lesson_title} {body.question}", 0, 3)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
    sections = [r["section"] for r in ranked]

    ai_answer = await loop.run_in_executor(
        None,
        ask_llm,
        f"Microlearning lesson '{body.lesson_title}'. Question: {body.question}. "
        f"Explain in concise, learner-friendly steps with practical legal caution.",
        sections,
        ik_raw,
    )

    results = to_search_results(ranked)
    case_studies = build_case_studies(body.question, sections, ik_raw)

    return MicrolearningAskResponse(
        lesson_title=body.lesson_title,
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        case_studies=case_studies,
        model_used=LLM_MODEL,
    )


@app.post("/tools/case-analyzer", response_model=ToolCaseAnalyzerResponse)
def tool_case_analyzer(body: ToolCaseAnalyzerRequest):
    if not body.case_text.strip():
        raise HTTPException(400, "case_text is required")

    prompt = (
        "Analyze this case description and provide a practical legal analysis for India. "
        "Include likely offences/violations, applicable legal provisions, and immediate legal steps.\n\n"
        f"Case text:\n{body.case_text}"
    )

    ranked = retrieve(prompt, body.top_k)
    sections = [r["section"] for r in ranked]
    ai_answer = ask_llm(prompt, sections)

    return ToolCaseAnalyzerResponse(
        ai_answer=ai_answer,
        supporting_sections=to_search_results(ranked),
        model_used=LLM_MODEL,
    )


@app.post("/tools/contract-risk", response_model=ToolContractRiskResponse)
def tool_contract_risk(body: ToolContractRiskRequest):
    if not body.contract_text.strip():
        raise HTTPException(400, "contract_text is required")

    ranked = retrieve(
        "Identify legal risks, unfair terms, liabilities, and enforceability concerns in this contract:\n"
        + body.contract_text,
        body.top_k,
    )
    sections = [r["section"] for r in ranked]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a senior contract risk analyst for Indian law. "
                "Return STRICT JSON only with keys: summary, risk_score, flagged_clauses, recommendations."
            ),
        },
        {
            "role": "user",
            "content": (
                "Analyze this contract text and output JSON.\n"
                "risk_score must be an integer from 0-100.\n"
                "flagged_clauses must be an array of short strings (max 8).\n"
                "recommendations must be an array of short strings (max 8).\n\n"
                f"Contract text:\n{body.contract_text[:12000]}"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0,
        max_tokens=16384,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384}
    )
    output = response.choices[0].message.content or ""
    parsed = _extract_json_object(output) or {}

    risk_score = parsed.get("risk_score", 0)
    try:
        risk_score = int(risk_score)
    except Exception:
        risk_score = 0
    risk_score = max(0, min(100, risk_score))

    flagged_clauses = parsed.get("flagged_clauses") or []
    if not isinstance(flagged_clauses, list):
        flagged_clauses = []
    flagged_clauses = [str(x).strip() for x in flagged_clauses if str(x).strip()][:8]

    recommendations = parsed.get("recommendations") or []
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(x).strip() for x in recommendations if str(x).strip()][:8]

    summary = str(parsed.get("summary", "")).strip()
    if not summary:
        summary = output[:1500] if output else "Contract risk analysis generated."

    ai_answer = summary
    if recommendations:
        ai_answer += "\n\nRecommended Actions:\n" + "\n".join([f"- {r}" for r in recommendations])

    return ToolContractRiskResponse(
        ai_answer=ai_answer,
        supporting_sections=to_search_results(ranked),
        risk_score=risk_score,
        risk_level=_normalize_risk_level(risk_score),
        flagged_clauses=flagged_clauses,
        model_used=LLM_MODEL,
    )


@app.post("/tools/case-summarizer", response_model=ToolCaseSummarizerResponse)
def tool_case_summarizer(body: ToolCaseSummarizerRequest):
    if not body.document_text.strip():
        raise HTTPException(400, "document_text is required")

    prompt = (
        "Summarize this legal document in a structured format for a litigant. "
        "Cover key facts, legal issues, findings, and practical next steps.\n\n"
        f"Document text:\n{body.document_text}"
    )

    ranked = retrieve(prompt, body.top_k)
    sections = [r["section"] for r in ranked]
    ai_answer = ask_llm(prompt, sections)

    return ToolCaseSummarizerResponse(
        ai_answer=ai_answer,
        supporting_sections=to_search_results(ranked),
        model_used=LLM_MODEL,
    )


@app.get("/section/{number}")
def section(number: int):

    matches = [s for s in SECTIONS if s["section"] == number]

    if not matches:
        raise HTTPException(404)

    s = matches[0]

    explanation = ask_llm(
        f"Explain {s['document']} Section {number}",
        [s]
    )

    text_for_punishment = s.get("full_text") or " ".join(sc["text"] for sc in s.get("sub_clauses", []))

    return {
        "document": s["document"],
        "section": s["section"],
        "title": s["title"],
        "page": s["page"],
        "full_text": s.get("full_text", ""),
        "sub_clauses": s.get("sub_clauses", []),
        "examples": s.get("examples", []),
        "punishment_summary": extract_punishment(text_for_punishment),
        "ai_explanation": explanation
    }


@app.get("/sections")
def list_sections(keyword: Optional[str] = None, limit: int = 20):

    out = []

    for s in SECTIONS:

        if keyword and keyword.lower() not in ((s.get("full_text") or "") + s["title"]).lower():
            continue

        out.append({
            "document": s["document"],
            "section": s["section"],
            "title": s["title"],
            "page": s["page"]
        })

        if len(out) >= limit:
            break

    return out


@app.get("/punishment")
def punishment(offense: str):

    ranked = retrieve(offense)

    results = []

    for r in ranked:

        sec = r["section"]

        text_for_pun = sec.get("full_text") or " ".join(sc["text"] for sc in sec.get("sub_clauses", []))
        p = extract_punishment(text_for_pun)

        if p:

            results.append({
                "document": sec["document"],
                "section": sec["section"],
                "title": sec["title"],
                "punishment": p
            })

    return results


# ── Indian Kanoon dedicated endpoints ──

@app.get("/ik/search")
def ik_search_endpoint(q: str = Query(...), page: int = 0, max_results: int = 10):
    """Search Indian Kanoon case law database."""
    results = ik_search(q, page=page, max_results=max_results)
    return {"query": q, "page": page, "results": results, "total": len(results)}


@app.get("/ik/doc/{doc_id}")
def ik_doc_endpoint(doc_id: str):
    """Fetch a full document from Indian Kanoon."""
    data = ik_get_document(doc_id)
    if not data:
        raise HTTPException(404, "Document not found on Indian Kanoon")
    return data


@app.get("/ik/docmeta/{doc_id}")
def ik_docmeta_endpoint(doc_id: str):
    """Fetch document metadata from Indian Kanoon."""
    data = ik_get_docmeta(doc_id)
    if not data:
        raise HTTPException(404, "Metadata not found on Indian Kanoon")
    return data


@app.get("/ik/case/{doc_id}/summary")
def ik_case_summary(doc_id: str):
    """Generate a detailed summary for the complete case text from Indian Kanoon."""
    data = ik_get_document(doc_id)
    if not data:
        raise HTTPException(404, "Document not found on Indian Kanoon")

    raw_html = data.get("doc", "")
    title = _strip_html(data.get("title", "Case"))

    if not raw_html:
        raise HTTPException(404, "Case content not available from Indian Kanoon")

    summary = build_case_summary(raw_html, title)

    return {
        "doc_id": doc_id,
        "title": title,
        "summary": summary,
        "model_used": LLM_MODEL,
        "source": "Indian Kanoon",
    }


@app.get("/ik/fragment/{doc_id}")
def ik_fragment_endpoint(doc_id: str, q: str = Query(...)):
    """Fetch document fragments matching a query from Indian Kanoon."""
    data = ik_doc_fragment(doc_id, q)
    if not data:
        raise HTTPException(404, "Fragment not found on Indian Kanoon")
    return data


@app.get("/ik/case/{doc_id}/sections", response_model=CaseSectionsResponse)
def ik_case_sections(doc_id: str):
    """Fetch an Indian Kanoon case and break it into step-by-step named sections."""
    data = ik_get_document(doc_id)
    if not data:
        raise HTTPException(404, "Document not found on Indian Kanoon")
    raw_html = data.get("doc", "")
    title = _strip_html(data.get("title", "Case"))
    source = data.get("docsource", "Indian Kanoon")
    sections = parse_case_into_sections(raw_html)
    return CaseSectionsResponse(
        doc_id=doc_id,
        title=title,
        source=source,
        sections=[CaseSection(**s) for s in sections],
    )


@app.post("/ik/case/{doc_id}/ask", response_model=CaseAskResponse)
def ik_case_ask(doc_id: str, body: CaseAskRequest):
    """Ask the LLM a question about a specific section of an Indian Kanoon case."""
    if not body.question.strip() or not body.section_text.strip():
        raise HTTPException(400, "Both question and section_text are required.")
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert Indian legal assistant analyzing a court judgment. "
                "Answer the user's question based strictly on the provided case section. "
                "Cite specific legal points, acts, and section numbers where relevant. "
                "Be clear and concise."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Case Section:\n{body.section_text[:2500]}\n\n"
                f"Question: {body.question}"
            ),
        },
    ]
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0,
        max_tokens=16384,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384}
    )
    answer = response.choices[0].message.content or ""
    return CaseAskResponse(
        question=body.question,
        section_heading=body.section_text[:80].rstrip() + "...",
        ai_answer=answer,
        model_used=LLM_MODEL,
    )


@app.get("/law-awareness/rights", response_model=LawAwarenessListResponse)
def law_awareness_rights_list():
    return LawAwarenessListResponse(
        law_title=RIGHTS_LAW_DATA["law_title"],
        intro=RIGHTS_LAW_DATA["intro"],
        articles=[LawAwarenessArticleSummary(**article) for article in RIGHTS_LAW_DATA["articles"]],
    )


@app.get("/law-awareness/rights/{article_id}", response_model=LawAwarenessArticleDetail)
def law_awareness_rights_detail(article_id: str):
    article = next((item for item in RIGHTS_LAW_DATA["articles"] if item["article_id"] == article_id), None)
    if not article:
        raise HTTPException(404, "Rights article not found")
    return LawAwarenessArticleDetail(**article)


class DailyLawSection(BaseModel):
    document: str
    section: int
    title: str
    snippet: str
    page: int

class DailyLawResponse(BaseModel):
    date: str
    law_title: str
    sections: List[DailyLawSection]


DAILY_DOCUMENTS = ["BNS", "BNSS", "BSA", "Corporate Laws", "Motor Vehicles Act"]

@app.get("/law-awareness/daily", response_model=DailyLawResponse)
def law_awareness_daily():
    """Return a few random sections from each legal code, selected deterministically by date."""
    from datetime import date as dt_date
    today = dt_date.today()
    date_str = today.isoformat()
    seed_base = int(today.year * 10000 + today.month * 100 + today.day)

    sections_out = []
    for doc in DAILY_DOCUMENTS:
        doc_sections = [s for s in SECTIONS if s["document"] == doc]
        if not doc_sections:
            continue

        doc_hash = (seed_base + sum(ord(c) for c in doc)) % len(doc_sections)
        chosen_idx = doc_hash
        chosen = doc_sections[chosen_idx]

        sections_out.append(DailyLawSection(
            document=doc,
            section=chosen["section"],
            title=chosen["title"],
            snippet=(chosen.get("full_text", "")[:300] or
                     " ".join(sc["text"] for sc in chosen.get("sub_clauses", []) if sc.get("text")))[:300],
            page=chosen["page"],
        ))

        second_idx = (doc_hash + 7) % len(doc_sections)
        if second_idx != doc_hash and len(sections_out) < 12:
            second = doc_sections[second_idx]
            sections_out.append(DailyLawSection(
                document=doc,
                section=second["section"],
                title=second["title"],
                snippet=(second.get("full_text", "")[:300] or
                         " ".join(sc["text"] for sc in second.get("sub_clauses", []) if sc.get("text")))[:300],
                page=second["page"],
            ))

    return DailyLawResponse(
        date=date_str,
        law_title="Daily Legal Code Sections",
        sections=sections_out,
    )


# ── Legal News + Microlearning Pipeline ──

class LegalNewsItem(BaseModel):
    id: str
    headline: str
    summary: str
    date: str
    category: str
    source: str = "Indian Kanoon"

class LegalNewsTrendingResponse(BaseModel):
    news: List[LegalNewsItem]
    total: int

class NewsToLessonRequest(BaseModel):
    news_id: str
    headline: str
    summary: str
    category: str = "General"

class NewsToLessonResponse(BaseModel):
    news_id: str
    headline: str
    legal_topic: str
    sections: List[SearchResult]
    explanation: str
    lesson_title: str
    lesson_law_text: str
    lesson_simple_explanation: str
    lesson_scenario: str
    lesson_quiz: List[dict]
    case_references: List[str]
    model_used: str

TRENDING_QUERIES = [
    "latest Supreme Court judgment India",
    "recent High Court decision India landmark",
    "Indian Supreme Court constitutional law ruling",
    "recent judgment fundamental rights India",
    "landmark Indian criminal law case latest",
]

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@app.post("/legal-news/trending", response_model=LegalNewsTrendingResponse)
async def legal_news_trending():
    """Fetch trending legal news from Indian Kanoon across multiple legal queries."""
    from datetime import datetime, timedelta

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, ik_search, q, 0, 5) for q in TRENDING_QUERIES]
    all_query_results = await asyncio.gather(*tasks)

    seen_titles = set()
    all_news = []
    today = datetime.now()
    cats = ["Supreme Court", "Constitutional Law", "Criminal Law", "Civil Law", "Corporate Law", "Human Rights", "Cyber Law"]

    for results in all_query_results:
        for r in results:
            title = r.get("title", "")
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            day_offset = len(all_news) % 7
            d = (today - timedelta(days=day_offset)).strftime("%b %d, %Y")
            all_news.append(LegalNewsItem(
                id=f"ik_{r['doc_id']}",
                headline=title[:200],
                summary=_strip_html(r.get("headline", ""))[:300] or f"Recent judgment from Indian Kanoon (Doc ID: {r['doc_id']})",
                date=d,
                category=cats[len(all_news) % len(cats)],
            ))
            if len(all_news) >= 10:
                break
        if len(all_news) >= 10:
            break

    return LegalNewsTrendingResponse(news=all_news[:10], total=len(all_news))


class NewsApiRequest(BaseModel):
    query: str = "law court India"
    page_size: int = 10


@app.post("/legal-news/newsapi", response_model=LegalNewsTrendingResponse)
async def legal_news_newsapi(body: NewsApiRequest = NewsApiRequest()):
    """Fetch legal/world news from NewsAPI.org as supplementary source."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{NEWSAPI_BASE}/everything",
                params={
                    "q": body.query,
                    "pageSize": body.page_size,
                    "sortBy": "publishedAt",
                    "apiKey": NEWSAPI_KEY,
                    "language": "en",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            articles = data.get("articles", [])
            news_items = []
            for i, article in enumerate(articles[:body.page_size]):
                url = article.get("url", str(i))
                source_name = article.get("source", {}).get("name", "News")
                news_items.append(LegalNewsItem(
                    id=f"newsapi_{i}_{abs(hash(url)) % 100000}",
                    headline=(article.get("title") or "")[:200],
                    summary=((article.get("description") or "")[:300] or (article.get("content") or "")[:300]),
                    date=(article.get("publishedAt") or "")[:10],
                    category="Legal News",
                    source=source_name,
                ))
            return LegalNewsTrendingResponse(news=news_items, total=len(news_items))
    except Exception as e:
        print(f"[newsapi] error: {e}", flush=True)
        return LegalNewsTrendingResponse(news=[], total=0)


@app.post("/legal-news/to-lesson", response_model=NewsToLessonResponse)
async def legal_news_to_lesson(body: NewsToLessonRequest):
    """Convert a legal news event into a full lesson flow: topic → sections → explanation → microlearning."""
    composite = f"{body.headline} {body.summary} {body.category}"

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, composite, 5)
    ik_task = loop.run_in_executor(None, ik_search, body.headline, 0, 3)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
    sections = [r["section"] for r in ranked]

    # Identify legal topic via LLM
    topic_prompt = (
        f"Given this legal news headline and summary, identify the single most relevant legal topic "
        f"(e.g., 'Bail', 'Right to Privacy', 'Contract Law', 'Criminal Procedure', 'Fundamental Rights'). "
        f"Reply with just the topic name, 2-5 words.\n\nHeadline: {body.headline}\nSummary: {body.summary}"
    )
    topic_msg = [
        {"role": "system", "content": "You are a legal topic classifier. Reply with only the topic name."},
        {"role": "user", "content": topic_prompt}
    ]
    topic_resp = await loop.run_in_executor(
        None, lambda: client.chat.completions.create(model=LLM_MODEL, messages=topic_msg, temperature=0, max_tokens=50)
    )
    legal_topic = (topic_resp.choices[0].message.content or "Legal Procedure").strip()

    # Generate explanation
    section_refs = "\n".join([f"- {s['document']} Section {s['section']}: {s['title']}" for s in sections[:5]])
    ik_refs = "\n".join([f"- {r['title']}" for r in ik_raw[:3]])
    explain_prompt = (
        f"A user read this news:\n{body.headline}\n{body.summary}\n\n"
        f"The identified legal topic is: {legal_topic}\n\n"
        f"Relevant statute sections:\n{section_refs}\n\n"
        f"Related case law:\n{ik_refs}\n\n"
        f"Explain this legal topic in plain language. Cover:\n"
        f"1. What this legal topic means\n"
        f"2. Key laws/sections involved\n"
        f"3. How it connects to the news event\n"
        f"4. Practical rights and steps for an ordinary citizen"
    )
    explanation = await loop.run_in_executor(None, ask_llm, explain_prompt, sections, ik_raw)

    # Generate microlearning lesson
    lesson_title = f"Understanding {legal_topic}"
    lesson_law_text = "\n\n".join([f"{s['document']} Section {s['section']} — {s['title']}\n{(s.get('full_text') or '')[:500]}" for s in sections[:3]])
    lesson_simple = (
        f"This lesson explains '{legal_topic}' in the context of recent legal news. "
        f"Key statutes include relevant sections from the Bharatiya Nyaya Sanhita and related acts. "
        f"Citizens should understand their rights and procedures under these provisions."
    )
    lesson_scenario = f"A person reads about '{body.headline[:100]}' and wants to understand how the law applies to their own situation. They need to identify the relevant legal provisions and understand their rights."

    # Generate quiz questions using LLM
    quiz_prompt = (
        f"Based on this legal news and legal topic, generate 2 quiz questions (multiple choice with 4 options). "
        f"Return valid JSON array only: [{{\"question\":\"...\",\"options\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"correct\":\"A\"}}]\n\n"
        f"News: {body.headline}\nTopic: {legal_topic}\nSections:\n{section_refs}"
    )
    quiz_msg = [
        {"role": "system", "content": "You generate quiz questions as JSON arrays. Reply with only the JSON."},
        {"role": "user", "content": quiz_prompt}
    ]
    quiz_resp = await loop.run_in_executor(
        None, lambda: client.chat.completions.create(model=LLM_MODEL, messages=quiz_msg, temperature=0.3, max_tokens=1024)
    )
    quiz_text = quiz_resp.choices[0].message.content or "[]"
    try:
        import json as _json
        quiz_data = _json.loads(re.search(r'\[[\s\S]*\]', quiz_text).group(0)) if re.search(r'\[[\s\S]*\]', quiz_text) else []
    except Exception:
        quiz_data = [
            {"question": f"What is the primary legal topic in this news item?", "options": [f"A. {legal_topic}", "B. Contract Law", "C. Property Law", "D. Tax Law"], "correct": "A"},
            {"question": "What should a citizen do first when facing a legal issue related to this topic?", "options": ["A. Ignore it", "B. Gather facts and seek legal advice", "C. Post on social media", "D. Pay immediately"], "correct": "B"},
        ]

    case_refs = [r["title"] for r in ik_raw[:3]]

    search_results = to_search_results(ranked)

    return NewsToLessonResponse(
        news_id=body.news_id,
        headline=body.headline,
        legal_topic=legal_topic,
        sections=search_results,
        explanation=explanation,
        lesson_title=lesson_title,
        lesson_law_text=lesson_law_text,
        lesson_simple_explanation=lesson_simple,
        lesson_scenario=lesson_scenario,
        lesson_quiz=quiz_data,
        case_references=case_refs,
        model_used=LLM_MODEL,
    )


@app.get("/stats")
def stats():

    doc_counts = {}
    sub_clause_counts = {}
    example_counts = {}
    corpus_entries = len(CORPUS_META) if CORPUS_META else 0

    for s in SECTIONS:
        doc = s["document"]
        doc_counts[doc] = doc_counts.get(doc, 0) + 1
        sub_clause_counts[doc] = sub_clause_counts.get(doc, 0) + len(s.get("sub_clauses", []))
        example_counts[doc] = example_counts.get(doc, 0) + len(s.get("examples", []))

    return {
        "sections_indexed": len(SECTIONS),
        "corpus_entries": corpus_entries,
        "documents": list(DOCUMENTS.keys()),
        "sections_per_document": doc_counts,
        "sub_clauses_per_document": sub_clause_counts,
        "examples_per_document": example_counts,
        "index_type": "semantic_rag_sub_clause",
        "vector_model": "bge-base-en-v1.5",
        "reranker": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "llm": LLM_MODEL,
        "external_sources": ["Indian Kanoon (api.indiankanoon.org)"],
    }