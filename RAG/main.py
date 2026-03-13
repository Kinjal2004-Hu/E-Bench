import json
import re
import numpy as np
from pathlib import Path
from typing import List, Optional

import httpx
import pdfplumber
import faiss

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from sentence_transformers import SentenceTransformer, CrossEncoder
from bytez import Bytez


DOCUMENTS = {
    "BNS": "BNS2023.pdf",
    "BNSS": "BNSS2023.pdf",
    "BSA": "BSA2023.pdf",
    "Motor Vehicles Act": "MotorVehicleAct.pdf",
    "Corporate Laws": "CorporateLaws.pdf",
    "Secuirities Laws": "SecuritiesLaws.pdf"
}

BYTEZ_API_KEY = "9268ffc395909476591c086452f3d86f"
BYTEZ_MODEL = "Qwen/Qwen2.5-7B-Instruct"

# ── Indian Kanoon API ──
IK_API_TOKEN = "13b60931108de83810d7b4e1509dfb3f8e2b55b3"
IK_BASE_URL = "https://api.indiankanoon.org"
IK_HEADERS = {
    "Authorization": f"Token {IK_API_TOKEN}",
    "Accept": "application/json",
}

SECTION_CACHE = Path("law_sections.json")
EMBED_CACHE = Path("law_embeddings.npy")
FAISS_CACHE = Path("law_faiss.index")

TOP_K_VECTOR = 60
TOP_K_FINAL = 7
RERANK_TEXT_LEN = 2000

VECTOR_WEIGHT = 0.35
RERANK_WEIGHT = 0.65


embed_model = SentenceTransformer("BAAI/bge-base-en-v1.5")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

sdk = Bytez(BYTEZ_API_KEY)
llm = sdk.model(BYTEZ_MODEL)

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
INDEX = None


# ── Pydantic Models ──

class SearchResult(BaseModel):
    document: str
    section_number: int
    title: str
    snippet: str
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


def chunk_text(text, chunk_size=220, overlap=40):
    words = text.split()
    chunks = []
    step = chunk_size - overlap

    for i in range(0, len(words), step):
        chunk = words[i:i + chunk_size]
        if chunk:
            chunks.append(" ".join(chunk))

    return chunks


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

                                for c in chunk_text(full_text):

                                    sections.append({
                                        "document": current["document"],
                                        "section": current["section"],
                                        "title": current["title"],
                                        "text": c,
                                        "page": current["page"]
                                    })

                            current = {
                                "document": doc_name,
                                "section": int(m.group(1)),
                                "title": m.group(2),
                                "page": page_num + 1
                            }

                            text_buf = [line]

                        else:
                            text_buf.append(line)

                if current:

                    full_text = " ".join(text_buf)

                    for c in chunk_text(full_text):

                        sections.append({
                            "document": current["document"],
                            "section": current["section"],
                            "title": current["title"],
                            "text": c,
                            "page": current["page"]
                        })

        except Exception as e:
            print("PDF parse error:", pdf_path, e)

    return sections


def build_index():

    global SECTIONS

    if SECTION_CACHE.exists():

        with open(SECTION_CACHE) as f:
            SECTIONS = json.load(f)

    else:

        SECTIONS = extract_sections()

        with open(SECTION_CACHE, "w") as f:
            json.dump(SECTIONS, f)

    corpus = [
        f"{s['document']} Section {s['section']} {s['title']}: {s['text']}"
        for s in SECTIONS
    ]

    if EMBED_CACHE.exists():

        embeddings = np.load(EMBED_CACHE)

    else:

        embeddings = embed_model.encode(
            corpus,
            normalize_embeddings=True,
            show_progress_bar=True
        )

        np.save(EMBED_CACHE, embeddings)

    dim = embeddings.shape[1]

    if FAISS_CACHE.exists():

        index = faiss.read_index(str(FAISS_CACHE))

    else:

        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        faiss.write_index(index, str(FAISS_CACHE))

    return index


def retrieve(query, top_k=TOP_K_FINAL):

    qvec = embed_model.encode([query], normalize_embeddings=True)

    raw_scores, ids = INDEX.search(qvec, TOP_K_VECTOR)

    vector_scores = raw_scores[0]

    candidates = [SECTIONS[i] for i in ids[0]]

    pairs = [(query, c["text"][:RERANK_TEXT_LEN]) for c in candidates]

    rerank_raw = reranker.predict(pairs)

    def sigmoid(x):
        return 1 / (1 + np.exp(-x))

    rerank_norm = sigmoid(np.array(rerank_raw))

    v_min, v_max = vector_scores.min(), vector_scores.max()
    v_range = v_max - v_min if v_max != v_min else 1

    vector_norm = (vector_scores - v_min) / v_range

    hybrid = VECTOR_WEIGHT * vector_norm + RERANK_WEIGHT * rerank_norm

    ranked = sorted(
        zip(hybrid, vector_norm, rerank_norm, candidates),
        reverse=True
    )

    ranked = [r for r in ranked if r[0] > 0.35][:top_k]

    results = []

    for h_score, v_score, r_score, sec in ranked:

        results.append({
            "score": float(h_score),
            "score_breakdown": {
                "hybrid": round(float(h_score), 4),
                "vector_similarity": round(float(v_score), 4),
                "reranker_relevance": round(float(r_score), 4)
            },
            "section": sec
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
    return re.sub(r"<[^>]+>", "", raw).strip()


def ik_search(query: str, page: int = 0, max_results: int = 5) -> List[dict]:
    """Search Indian Kanoon and return a list of result dicts."""
    try:
        resp = httpx.get(
            f"{IK_BASE_URL}/search/",
            params={"formInput": query, "pagenum": page},
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


SYSTEM_PROMPT = """
You are an expert Indian legal assistant.

Use the provided legal sections and any Indian Kanoon case-law context.

Explain the law clearly, cite Act and Section numbers, and reference
relevant case names when available.
"""


def ask_llm(question, sections, ik_results=None):

    context = ""

    for s in sections:
        context += f"\n{s['document']} Section {s['section']} — {s['title']}\n{s['text']}\n"

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

    result = llm.run(messages, {"temperature": 0})

    if result.error:
        return str(result.error)

    output = result.output

    if isinstance(output, dict):
        return output.get("content", str(output))

    return str(output)


def to_search_results(ranked):

    results = []

    for r in ranked:
        sec = r["section"]
        results.append(
            SearchResult(
                document=sec["document"],
                section_number=sec["section"],
                title=sec["title"],
                snippet=sec["text"][:400],
                punishment_summary=extract_punishment(sec["text"]),
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
def ask(body: AskRequest):

    ranked = retrieve(body.question, body.top_k)
    sections = [r["section"] for r in ranked]

    # Fetch Indian Kanoon results in parallel with LLM
    ik_raw = ik_search(body.question, max_results=5)

    ai_answer = ask_llm(body.question, sections, ik_results=ik_raw)

    results = to_search_results(ranked)

    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]

    return AskResponse(
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        model_used=BYTEZ_MODEL,
        indian_kanoon_results=ik_models,
    )


@app.get("/query", response_model=QueryResponse)
def query(q: str = Query(...), top_k: int = 7):

    ranked = retrieve(q, top_k)
    sections = [r["section"] for r in ranked]

    ik_raw = ik_search(q, max_results=5)

    ai_answer = ask_llm(q, sections, ik_results=ik_raw)

    results = to_search_results(ranked)

    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]

    return QueryResponse(
        query=q,
        ai_answer=ai_answer,
        results=results,
        total_found=len(results),
        model_used=BYTEZ_MODEL,
        user_rights=None,
        indian_kanoon_results=ik_models,
    )


@app.post("/microlearning/ask", response_model=MicrolearningAskResponse)
def microlearning_ask(body: MicrolearningAskRequest):

    composite_query = (
        f"Lesson: {body.lesson_title}. "
        f"Law Text: {body.law_text}. "
        f"User Question: {body.question}"
    )

    ranked = retrieve(composite_query, body.top_k)
    sections = [r["section"] for r in ranked]

    ik_raw = ik_search(f"{body.lesson_title} {body.question}", max_results=3)

    ai_answer = ask_llm(
        f"Microlearning lesson '{body.lesson_title}'. Question: {body.question}. "
        f"Explain in concise, learner-friendly steps with practical legal caution.",
        sections,
        ik_results=ik_raw,
    )

    results = to_search_results(ranked)
    case_studies = build_case_studies(body.question, sections, ik_raw)

    return MicrolearningAskResponse(
        lesson_title=body.lesson_title,
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        case_studies=case_studies,
        model_used=BYTEZ_MODEL,
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

    return {
        "document": s["document"],
        "section": s["section"],
        "title": s["title"],
        "page": s["page"],
        "text": s["text"],
        "punishment_summary": extract_punishment(s["text"]),
        "ai_explanation": explanation
    }


@app.get("/sections")
def list_sections(keyword: Optional[str] = None, limit: int = 20):

    out = []

    for s in SECTIONS:

        if keyword and keyword.lower() not in (s["text"] + s["title"]).lower():
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

        p = extract_punishment(sec["text"])

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


@app.get("/ik/fragment/{doc_id}")
def ik_fragment_endpoint(doc_id: str, q: str = Query(...)):
    """Fetch document fragments matching a query from Indian Kanoon."""
    data = ik_doc_fragment(doc_id, q)
    if not data:
        raise HTTPException(404, "Fragment not found on Indian Kanoon")
    return data


@app.get("/stats")
def stats():

    doc_counts = {}

    for s in SECTIONS:

        doc_counts[s["document"]] = doc_counts.get(s["document"], 0) + 1

    return {
        "sections_indexed": len(SECTIONS),
        "documents": list(DOCUMENTS.keys()),
        "sections_per_document": doc_counts,
        "vector_model": "bge-base-en-v1.5",
        "reranker": "cross-encoder/ms-marco-MiniLM-L-6-v2",
        "llm": BYTEZ_MODEL,
        "external_sources": ["Indian Kanoon (api.indiankanoon.org)"],
    }