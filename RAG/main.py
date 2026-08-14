import json
import re
import html
import sys
import os
import asyncio
import time
import logging
import threading
import numpy as np
from pathlib import Path
from functools import lru_cache
from typing import Dict, List, Optional
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ── Logging Configuration ──
LOG_FORMAT = "%(asctime)s.%(msecs)03d | %(levelname)-7s | %(name)-18s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt=LOG_DATE_FORMAT,
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("rag")


def _truncate(text: str, limit: int = 240) -> str:
    text = (text or "").replace("\n", " ").replace("\r", " ").strip()
    return text if len(text) <= limit else text[:limit] + f"... (+{len(text) - limit} chars)"


def _format_retrieved_docs(ranked: List[dict]) -> str:
    if not ranked:
        return "<none>"
    parts = []
    for i, r in enumerate(ranked, 1):
        sec = r.get("section", {}) or {}
        doc = sec.get("document", "?")
        num = sec.get("section", "?")
        title = sec.get("title", "")
        sc = r.get("score", 0.0)
        bd = r.get("score_breakdown") or {}
        v = bd.get("vector_similarity", 0.0)
        rr = bd.get("reranker_relevance", 0.0)
        sub = r.get("sub_clause")
        ex = r.get("example")
        locator = f"§{num} {title}".strip()
        if sub:
            locator += f" sub({sub.get('id')})"
        if ex:
            locator += f" ex({ex.get('id')})"
        parts.append(f"#{i} {doc} {locator} | hybrid={sc:.3f} vec={v:.3f} rerank={rr:.3f}")
    return " | ".join(parts)

load_dotenv()

import httpx
import faiss

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from sentence_transformers import SentenceTransformer, CrossEncoder
from openai import OpenAI
from pymongo import MongoClient


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

# ── SerpApi (Google web search) — current-events / pending-legislation fallback ──
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search.json"
WEB_SEARCH_MODE = os.getenv("WEB_SEARCH_MODE", "auto").lower()
WEB_SEARCH_MAX_RESULTS = int(os.getenv("WEB_SEARCH_MAX_RESULTS", "5"))

# Queries about legislation that isn't (yet) an enacted statute in the corpus:
# bills, ordinances, drafts, or anything phrased as newly/recently passed.
CURRENT_EVENTS_RE = re.compile(
    r"\b(bill|ordinance|draft law|draft bill|amendment bill|pending legislation|"
    r"lok sabha|rajya sabha|parliament|cabinet approved|recently passed|"
    r"newly passed|new law|proposed law|introduced in parliament|gazette notification|"
    r"commencement notification|came into force|in force|latest|current|updated|"
    r"recent amendment|amended|notification|gazette)\b",
    re.IGNORECASE,
)
LEGAL_PROVISION_WEB_RE = re.compile(
    r"\b(section|sec\.?|s\.|article|art\.?|rule|regulation|reg\.?)\s*\.?\s*[1-9]\d{0,3}[A-Z]?\b",
    re.IGNORECASE,
)
LEGAL_SOURCE_RE = re.compile(
    r"\b(bns|bnss|bsa|bharatiya|constitution|it act|information technology act|"
    r"contract act|motor vehicles act|rera|companies act|consumer protection|"
    r"income tax|taxation|specific relief|transfer of property|law|act|code|sanhita)\b",
    re.IGNORECASE,
)


def _needs_web_search(query: str) -> bool:
    """Should this query get live web context in addition to corpus retrieval?"""
    if not SERPAPI_KEY or WEB_SEARCH_MODE == "off":
        return False
    if WEB_SEARCH_MODE == "always":
        return True
    return bool(
        CURRENT_EVENTS_RE.search(query)
        or (LEGAL_PROVISION_WEB_RE.search(query) and LEGAL_SOURCE_RE.search(query))
    )


def _official_law_web_query(query: str) -> str:
    official_sites = (
        "(site:indiacode.nic.in OR site:mha.gov.in OR site:egazette.gov.in "
        "OR site:pib.gov.in OR site:lawmin.gov.in)"
    )
    return f"{query} India law provision official source {official_sites}"

TOP_K_FINAL = 7
RERANK_TEXT_LEN = int(os.getenv("RERANK_TEXT_LEN", "800"))
RERANK_POOL = int(os.getenv("RERANK_POOL", "50"))
RERANK_PER_LAW_FLOOR = int(os.getenv("RERANK_PER_LAW_FLOOR", "2"))
TITLE_MATCH_WEIGHT = float(os.getenv("TITLE_MATCH_WEIGHT", "0.25"))
SKIP_RERANK_FOR_SINGLE_EXACT = os.getenv("SKIP_RERANK_FOR_SINGLE_EXACT", "true").lower() != "false"

EMBED_MODEL_NAME = "BAAI/bge-base-en-v1.5"
embed_model = SentenceTransformer(EMBED_MODEL_NAME)
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")

# ── CPU tuning for CrossEncoder reranking (Windows CPU default can be slow) ──
RERANK_BATCH_SIZE = int(os.getenv("RERANK_BATCH_SIZE", "16"))
RERANK_LOCK = threading.Lock()
try:
    import torch as _torch
    _torch.set_num_threads(min(int(os.getenv("RERANK_THREADS", "0")) or (os.cpu_count() or 4), os.cpu_count() or 4))
    logger.info("[runtime] torch threads set to %d", _torch.get_num_threads())
except Exception:
    pass

# ── Law / section-number detection for targeted retrieval ──
LAW_ALIASES = [
    (re.compile(r"bharatiya nyaya sanhita|nyaya sanhita"), "bns_2023"),
    (re.compile(r"bharatiya nagarik suraksha|nagarik suraksha"), "bnss_2023"),
    (re.compile(r"bharatiya sakshya|sakshya adhiniyam"), "bsa_2023"),
    (re.compile(r"indian penal code|\bipc\b"), "bns_2023"),
    (re.compile(r"criminal procedure code|\bcrpc\b"), "bnss_2023"),
    (re.compile(r"constitution of india|constitution\b"), "constitution"),
    (re.compile(r"companies act|corporate"), "corporate"),
    (re.compile(r"consumer protection"), "cpa_2019"),
    (re.compile(r"domestic violence"), "dv_act_2005"),
    (re.compile(r"family courts"), "family_laws"),
    (re.compile(r"global depository"), "gdr_rules_2014"),
    (re.compile(r"indian contract act|contract act"), "ica_1872"),
    (re.compile(r"information technology act|it act"), "it_act_2000"),
    (re.compile(r"labour|labor\b"), "labour_employment"),
    (re.compile(r"motor vehicles act|motor vehicle\b"), "motor_vehicles"),
    (re.compile(r"\brera\b|real estate"), "rera"),
    (re.compile(r"securities"), "securities"),
    (re.compile(r"specific relief"), "sra_1963"),
    (re.compile(r"income tax|taxation"), "taxation"),
    (re.compile(r"transfer of property"), "tpa_1882"),
]
SECTION_NUM_RE = re.compile(
    r"\b(?:section|secs?|ss\.?|s\.|article|art\.?|rule|regulation|reg\.?)\s*\.?\s*([1-9]\d{0,3}[A-Z]?)\b",
    re.IGNORECASE,
)
STANDALONE_NUM_RE = re.compile(r"\b([1-9]\d{2,3}[A-Z]?)\b", re.IGNORECASE)
# IPC -> BNS renumbering (verified against corpus titles)
IPC_TO_BNS = {
    "302": "103", "304": "105", "307": "109", "309": "109",
    "323": "115", "354": "74", "376": "64", "420": "318", "498A": "85",
}
TITLE_MATCH_STOPWORDS = {
    "what", "which", "does", "say", "about", "under", "section", "article",
    "rule", "regulation", "act", "law", "new", "the", "and", "for", "with",
    "from", "into", "bharatiya", "nyaya", "sanhita", "nagarik", "suraksha",
    "sakshya", "adhiniyam", "indian", "penal", "code", "constitution",
}


def _detect_law_ids(query: str) -> List[str]:
    """Return law ids explicitly mentioned in the query ("" = ambiguous, all)."""
    q = query.lower()
    q = re.sub(r"[^a-z0-9\s]", " ", q)
    hits = []
    for pat, lid in LAW_ALIASES:
        if pat.search(q):
            if lid not in hits:
                hits.append(lid)
    return hits


def _extract_section_number(query: str) -> str:
    """Extract an explicit section number from the query, e.g. 'Section 302 BNS' -> '302'."""
    m = SECTION_NUM_RE.search(query)
    if m:
        return m.group(1)
    m = STANDALONE_NUM_RE.search(query)
    return m.group(1) if m else None


def _targeted_provision_hits(query, search_query):
    """Return [(law_id, provision_number)] that the query explicitly asks for.

    Prefers the law(s) named in the query; falls back to all indexed laws.
    Supports IPC -> BNS renumbering so 'IPC 302' retrieves BNS 103.
    """
    num = _extract_section_number(query)
    if not num:
        return []
    names = _detect_law_ids(search_query)
    likes_ipc = bool(re.search(r"\bipc\b|indian penal code", search_query, re.IGNORECASE))
    hits = []
    for lid in names or ["bns_2023", "bnss_2023", "bsa_2023", "constitution",
                         "corporate", "cpa_2019", "dv_act_2005", "family_laws",
                         "gdr_rules_2014", "ica_1872", "it_act_2000", "labour_employment",
                         "motor_vehicles", "rera", "securities", "sra_1963",
                         "taxation", "tpa_1882"]:
        if lid not in PER_LAW_INDEXES:
            continue
        data = PER_LAW_INDEXES[lid]
        if _get_provision(data, num):
            hits.append((lid, num))
        if likes_ipc and lid == "bns_2023" and num.upper() in IPC_TO_BNS:
            target = IPC_TO_BNS[num.upper()]
            if _get_provision(data, target):
                hits.append(("bns_2023", target))
    if hits:
        return hits
    # No exact-number match anywhere: still help per-law routing for named laws
    return [(lid, None) for lid in names if lid in PER_LAW_INDEXES]

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

MONGO_DB = None
DATA_DIR = Path(__file__).parent / "data"
MASTER_INDEX = None
PER_LAW_INDEXES = {}


def _build_provision_lookup(corpus: dict) -> Dict[str, dict]:
    return {
        str(p.get("number", "")): p
        for p in corpus.get("provisions", [])
        if p.get("number") is not None
    }


def _get_provision(data: dict, number) -> Optional[dict]:
    if not data or number is None:
        return None
    key = str(number)
    prov = (data.get("provisions_by_number") or {}).get(key)
    if prov is not None:
        return prov
    return next(
        (p for p in data.get("corpus", {}).get("provisions", []) if str(p.get("number", "")) == key),
        None,
    )


def _provision_rerank_text(prov: Optional[dict]) -> str:
    if not prov:
        return ""
    title = prov.get("title", "") or ""
    full_text = prov.get("full_text", "") or ""
    return f"{title}\n{full_text}".strip()[:RERANK_TEXT_LEN]


def _title_match_score(query: str, title: str) -> float:
    if not query or not title:
        return 0.0
    q_norm = re.sub(r"[^a-z0-9]+", " ", query.lower()).strip()
    title_norm = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    if title_norm and title_norm in q_norm:
        return 2.0

    q_tokens = {
        t for t in re.findall(r"[a-z0-9]+", q_norm)
        if len(t) > 2 and t not in TITLE_MATCH_STOPWORDS
    }
    title_tokens = [
        t for t in re.findall(r"[a-z0-9]+", title_norm)
        if len(t) > 2 and t not in TITLE_MATCH_STOPWORDS
    ]
    if not q_tokens or not title_tokens:
        return 0.0
    overlap = sum(1 for t in title_tokens if t in q_tokens)
    return overlap / len(title_tokens)


def _candidate_key(candidate: dict) -> tuple:
    return (candidate.get("law_id"), str(candidate.get("provision_number", "")))


def _trim_rerank_candidates(candidates: list, pool_size: int = RERANK_POOL) -> list:
    if len(candidates) <= pool_size:
        return sorted(candidates, key=lambda c: -c["vector_score"])

    selected = {}

    def add(candidate: dict):
        selected.setdefault(_candidate_key(candidate), candidate)

    by_law = {}
    for candidate in candidates:
        by_law.setdefault(candidate["law_id"], []).append(candidate)

    for law_candidates in by_law.values():
        law_candidates.sort(key=lambda c: -c["vector_score"])
        for candidate in law_candidates[:max(0, RERANK_PER_LAW_FLOOR)]:
            if len(selected) >= pool_size:
                break
            add(candidate)

    for candidate in sorted(candidates, key=lambda c: -c["vector_score"]):
        if len(selected) >= pool_size:
            break
        add(candidate)

    return sorted(selected.values(), key=lambda c: -c["vector_score"])


def _result_from_candidate(entry: dict, score: float = 1.0, vector_score: float = 1.0, rerank_score: float = 0.0) -> dict:
    return {
        "score": float(score),
        "score_breakdown": {
            "hybrid": round(float(score), 4),
            "vector_similarity": round(float(vector_score), 4),
            "reranker_relevance": round(float(rerank_score), 4),
        },
        "section": {
            "document": entry["law_label"],
            "section": entry["provision_number"],
            "title": entry["title"],
            "page": entry["page"],
            "full_text": "",
        },
        "snippet": "",
        "sub_clause": None,
        "example": None,
        "law_id": entry["law_id"],
        "provision_number": entry["provision_number"],
    }


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
    section_number: Union[int, str]
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


class WebResult(BaseModel):
    """A single live web-search result (current events / pending legislation)."""
    title: str
    link: str
    snippet: str = ""
    source: str = ""
    date: str = ""
    displayed_link: str = ""
    position: Optional[int] = None


class QueryResponse(BaseModel):
    query: str
    ai_answer: str
    results: List[SearchResult]
    total_found: int
    model_used: str
    user_rights: Optional[List[str]] = None
    indian_kanoon_results: Optional[List[IKResult]] = None
    web_results: Optional[List[WebResult]] = None


class AskRequest(BaseModel):
    question: str
    top_k: int = 7
    history: Optional[List[Dict[str, str]]] = None


class AskResponse(BaseModel):
    question: str
    ai_answer: str
    supporting_sections: List[SearchResult]
    model_used: str
    user_rights: Optional[List[str]] = None
    legal_steps: Optional[List[str]] = None
    indian_kanoon_results: Optional[List[IKResult]] = None
    web_results: Optional[List[WebResult]] = None


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


class LessonQuizOption(BaseModel):
    id: str
    label: str

class LessonQuizQuestion(BaseModel):
    id: str
    question: str
    options: List[LessonQuizOption]
    correctOptionId: str
    explanation: str

class LessonScenario(BaseModel):
    prompt: str
    question: str

class GenerateLessonRequest(BaseModel):
    lesson_id: str
    lesson_title: str
    lesson_description: str

class GenerateLessonResponse(BaseModel):
    lesson_id: str
    title: str
    description: str
    difficulty: str
    minutes: int
    law_text: str
    simple_explanation: str
    important_case: LawAwarenessCaseReference
    scenario: LessonScenario
    quiz: List[LessonQuizQuestion]
    supporting_sections: List[SearchResult]


# In-memory lesson cache
_lesson_cache: dict = {}


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


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def _normalize_query(query: str) -> str:
    """Normalize query for caching: lowercase, strip, collapse whitespace."""
    return " ".join(query.lower().split())


def rewrite_query(raw_query: str) -> str:
    """Expand abbreviations and add legal synonyms for better retrieval."""
    if not raw_query:
        return ""
    q = raw_query.strip()
    # Expand common legal abbreviations
    expansions = {
        r"\bBNS\b": "Bharatiya Nyaya Sanhita",
        r"\bBNSS\b": "Bharatiya Nagarik Suraksha Sanhita",
        r"\bBSA\b": "Bharatiya Sakshya Adhiniyam",
        r"\bIPC\b": "Indian Penal Code",
        r"\bCrPC\b": "Criminal Procedure Code",
        r"\bFIR\b": "First Information Report",
        r"\bSC\b": "Supreme Court",
        r"\bHC\b": "High Court",
    }
    for pattern, replacement in expansions.items():
        q = re.sub(pattern, replacement, q, flags=re.IGNORECASE)
    return q


def hyde_query(raw_query: str) -> str:
    """Generate a hypothetical answer to use as retrieval query (HyDE)."""
    if not raw_query or len(raw_query) < 5:
        return raw_query
    prompt = f"Generate a short hypothetical paragraph from a legal document that would answer this question: {raw_query}"
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=256,
        )
        hyde_text = resp.choices[0].message.content or ""
        return f"{raw_query}\n{hyde_text[:500]}"
    except Exception:
        return raw_query


@lru_cache(maxsize=256)
def retrieve(query, top_k=TOP_K_FINAL):
    """Unified retrieval using per-law FAISS indexes with CrossEncoder reranking."""

    start_wall = time.perf_counter()

    # Phase 1: Query expansion for better recall
    expanded = rewrite_query(query)
    search_query = expanded

    # Targeted routing: pull the exact provision the query asks for, when it
    # names a provision number and/or a law (e.g. "Section 302 BNS").
    named_laws = set(_detect_law_ids(search_query))
    targeted = {lid: num for lid, num in _targeted_provision_hits(query, search_query) if num is not None}
    if targeted:
        named_laws |= set(targeted)

    if SKIP_RERANK_FOR_SINGLE_EXACT and len(targeted) == 1:
        lid, num = next(iter(targeted.items()))
        data = PER_LAW_INDEXES.get(lid)
        prov = _get_provision(data, num)
        if data and prov:
            entry = {
                "law_id": lid,
                "law_label": data["label"],
                "provision_label": data.get("provision_label", "Section"),
                "provision_number": str(num),
                "title": prov.get("title", ""),
                "page": prov.get("page", 0),
                "vector_score": 10.0,
                "corpus_idx": -1,
                "exact": True,
            }
            t_done = time.perf_counter()
            logger.info(
                "[retrieve] query=%r | top_k=%d | embed=%.3fs faiss=%.3fs rerank=%.3fs total=%.3fs | docs=%s | exact_shortcut=true",
                _truncate(query, 120), top_k,
                0.0, 0.0, 0.0, t_done - start_wall,
                [data["label"]],
            )
            return [_result_from_candidate(entry, score=1.0, vector_score=1.0, rerank_score=0.0)]

    # Phase 2: Embed and search all per-law indexes
    t0 = time.perf_counter()
    q_emb = embed_model.encode([search_query], normalize_embeddings=True)
    t_embed = time.perf_counter()

    search_law_ids = [lid for lid in PER_LAW_INDEXES if not named_laws or lid in named_laws]

    all_candidates = []
    for lid in search_law_ids:
        data = PER_LAW_INDEXES[lid]
        idx = data["index"]
        meta = data["meta"]
        corpus = data["corpus"]
        label = data["label"]
        prov_label = data.get("provision_label", "Section")
        # Give named laws a deeper FAISS look (cheap: FAISS only), so the
        # wanted section still enters the global candidate pool.
        search_k = min(top_k * 4 + (64 if lid in named_laws else 0), idx.ntotal)
        scores, indices = idx.search(q_emb, search_k)
        for si, ii in enumerate(indices[0]):
            if ii < 0 or ii >= len(meta):
                continue
            m = meta[ii]
            prov_num = m.get("number", "?")
            prov_title = m.get("title", "")
            all_candidates.append({
                "law_id": lid,
                "law_label": label,
                "provision_label": prov_label,
                "provision_number": str(prov_num),
                "title": prov_title,
                "page": m.get("page", 0),
                "vector_score": float(scores[0][si]),
                "corpus_idx": ii,
            })
    # Exact-number matches are guaranteed pool members (vector_score 10.0
    # sorts them above every FAISS hit, so the pool trim cannot drop them).
    for lid, num in targeted.items():
        data = PER_LAW_INDEXES.get(lid)
        if not data:
            continue
        prov = _get_provision(data, num)
        if not prov:
            continue
        all_candidates.append({
            "law_id": lid,
            "law_label": data["label"],
            "provision_label": data.get("provision_label", "Section"),
            "provision_number": num,
            "title": prov.get("title", ""),
            "page": prov.get("page", 0),
            "vector_score": 10.0,
            "corpus_idx": -1,
            "exact": True,
        })
    t_faiss = time.perf_counter()

    # Phase 3: Trim candidate pool before reranking (CPU CrossEncoder is slow).
    # Keep a small per-law floor first, then fill remaining slots globally by
    # vector score so large generic indexes cannot starve the right law.
    all_candidates = _trim_rerank_candidates(all_candidates, RERANK_POOL)

    # Phase 4: Resolve provision text for reranking
    pairs = []
    valid = []
    for c in all_candidates:
        data = PER_LAW_INDEXES.get(c["law_id"])
        if not data:
            continue
        prov = _get_provision(data, c["provision_number"])
        text = _provision_rerank_text(prov)
        if not text:
            continue
        pairs.append((query, text))
        valid.append(c)

    # Phase 5: CrossEncoder reranking (skippable via RERANK_ENABLED=false)
    if pairs and os.getenv("RERANK_ENABLED", "true").lower() != "false":
        with RERANK_LOCK:
            rerank_raw = reranker.predict(pairs, batch_size=RERANK_BATCH_SIZE, show_progress_bar=False)
    else:
        rerank_raw = [0.0] * len(pairs)
    t_rerank = time.perf_counter()

    def softmax(x, temp=1.0):
        e = np.exp((np.array(x) - np.max(x)) / temp)
        return e / e.sum()

    # Phase 6: Hybrid scoring with softmax normalization
    if valid:
        vec_scores = np.array([v["vector_score"] for v in valid])
        rerank_scores = np.array(rerank_raw) if len(rerank_raw) == len(valid) else vec_scores

        vec_norm = softmax(vec_scores)
        rerank_norm = softmax(rerank_scores)

        # Dynamic weight: trust reranker more when it's confident
        rerank_confidence = float(np.max(sigmoid(rerank_scores)))
        w_rerank = max(0.4, min(0.8, rerank_confidence))
        w_vec = 1.0 - w_rerank

        hybrid = w_vec * vec_norm + w_rerank * rerank_norm
        title_scores = np.array([_title_match_score(query, v.get("title", "")) for v in valid])
        if TITLE_MATCH_WEIGHT > 0:
            hybrid = hybrid + TITLE_MATCH_WEIGHT * title_scores

        # Notes: exact matches get a moderate boost so "Section 302 BNS" is not
        # overtaken by an irrelevant BNSS hit that only matches on "Section".
        if any(c.get("exact") for c in valid):
            hybrid = hybrid + 0.15 * np.array([1.0 if c.get("exact") else 0.0 for c in valid])

        scored = list(zip(hybrid, vec_norm, rerank_norm, valid))
        scored.sort(key=lambda x: -x[0])

        # Phase 6: Filter low-scoring results (percentile guard keeps ~70%
        # of the pool; the top_k slice below does the final selection)
        threshold = max(0.03, np.percentile(hybrid, 25) if len(hybrid) > 5 else 0.03)
        scored = [s for s in scored if s[0] > threshold]
    else:
        scored = []

    # Phase 7: Build result format matching old contract (section dicts for backward compat)
    results = []
    seen_sections = set()
    for h_score, v_score, r_score, entry in scored[:top_k]:
        dedup_key = (entry["law_id"], entry["provision_number"])
        if dedup_key in seen_sections:
            continue
        seen_sections.add(dedup_key)

        results.append({
            "score": float(h_score),
            "score_breakdown": {
                "hybrid": round(float(h_score), 4),
                "vector_similarity": round(float(v_score), 4),
                "reranker_relevance": round(float(r_score), 4),
                "title_match": round(float(_title_match_score(query, entry.get("title", ""))), 4),
            },
            "section": {
                "document": entry["law_label"],
                "section": entry["provision_number"],
                "title": entry["title"],
                "page": entry["page"],
                "full_text": "",
            },
            "snippet": "",
            "sub_clause": None,
            "example": None,
            "law_id": entry["law_id"],
            "provision_number": entry["provision_number"],
        })

    t_done = time.perf_counter()
    docs_used = sorted({r["section"]["document"] for r in results})
    logger.info(
        "[retrieve] query=%r | top_k=%d | embed=%.3fs faiss=%.3fs rerank=%.3fs total=%.3fs | docs=%s",
        _truncate(query, 120), top_k,
        t_embed - t0, t_faiss - t_embed, t_rerank - t_faiss, t_done - start_wall,
        docs_used or "<none>",
    )
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
        max_tokens=8192,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 4096}
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


def web_search(query: str, max_results: int = 5) -> List[dict]:
    """Search live web via SerpApi for current legal context and official provisions."""
    if not SERPAPI_KEY:
        return []
    try:
        resp = httpx.get(
            SERPAPI_BASE,
            params={
                "engine": "google",
                "q": _official_law_web_query(query),
                "location": "India",
                "gl": "in",
                "hl": "en",
                "google_domain": "google.co.in",
                "num": max_results,
                "api_key": SERPAPI_KEY,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        organic = data.get("organic_results", [])[:max_results]
        results = []
        for r in organic:
            results.append({
                "title": r.get("title", ""),
                "link": r.get("link", ""),
                "snippet": r.get("snippet", ""),
                "source": r.get("source", ""),
                "date": r.get("date", ""),
                "displayed_link": r.get("displayed_link", ""),
                "position": r.get("position", None),
            })
        return results
    except Exception as e:
        print(f"SerpApi web search error: {e}")
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


SYSTEM_PROMPT = """You are E-Bench, an AI Legal Assistant for Indian law.

Your primary objective is to provide legally accurate, structured, easy-to-understand, and trustworthy responses using ONLY the retrieved legal context.

You are NOT a general chatbot.
You are NOT a lawyer.
You provide legal information, procedural guidance, and educational explanations based on official legal sources.

==========================================================
CORE PRINCIPLES
==========================================================

1. NEVER answer outside the retrieved legal context.
If information is unavailable, explicitly state:

"I could not find sufficient legal authority in the available sources to answer this confidently."

Never hallucinate sections, punishments, procedures, or judgments.

2. Explain the law.

Do not simply copy statutory language.

Interpret the law in simple English understandable by a non-lawyer.

3. Be concise but complete.

Avoid unnecessary repetition.

Avoid long paragraphs.

Break information into logical sections.

4. Every legal statement should be supported by either:

- Retrieved statute
- Retrieved rule
- Retrieved judgment

Never invent citations.

5. Prioritize

Official Acts
↓
Official Rules
↓
Supreme Court Judgments
↓
High Court Judgments
↓
Government notifications
↓
Recent Web/News Results (current-events context only)

6. Recent Web/News Results are supplementary, not enacted law.

If the context includes a "Recent Web/News Results" section, it covers bills, ordinances,
proposed amendments, or news that may NOT yet be enacted law.

Always state clearly whether something is:
- Enacted law (in force), or
- A pending bill / proposal / draft (not yet law)

Never present a pending bill as if it were already binding law.
Cite the web source (title + link) when used.

If NO retrieved statute, judgment, or web result supports an answer, state:

"I could not find sufficient legal authority in the available sources to answer this confidently."

==========================================================
STANDARD RESPONSE FORMAT
==========================================================

Generate responses using the following structure.

Only include sections that are relevant.

----------------------------------------------------------
## Overview
----------------------------------------------------------

Provide a direct answer in 2-4 sentences.

Immediately answer the user's question before explaining anything else.

Avoid legal jargon whenever possible.

----------------------------------------------------------
## Quick Facts
----------------------------------------------------------

Display as a table.

Include only applicable fields.

Possible fields:

• Law
• Section
• Topic
• Category
• Nature of Offence
• Punishment
• Cognizable
• Bailable
• Compoundable
• Court
• Limitation
• Applicable Persons

Do not leave empty fields.

----------------------------------------------------------
## Detailed Explanation
----------------------------------------------------------

Explain:

• What the law means

• Why it exists

• When it applies

• Important legal conditions

• Exceptions (if any)

Explain naturally instead of quoting the Act.

----------------------------------------------------------
## Legal Procedure
----------------------------------------------------------

Include ONLY if the question involves:

• FIR
• Arrest
• Investigation
• Complaint
• Filing
• Registration
• Court procedure
• Appeals
• Legal process

Display both:

A simple step flow

Example

Complaint
↓
Registration
↓
Investigation
↓
Notice
↓
Trial
↓
Judgment

Then explain each step briefly.

----------------------------------------------------------
## Rights and Responsibilities
----------------------------------------------------------

Include only when relevant.

Examples:

Rights of accused

Rights of victim

Rights of consumer

Rights of employee

Responsibilities

Legal obligations

----------------------------------------------------------
## Required Documents
----------------------------------------------------------

Include only if relevant.

Provide bullet points.

----------------------------------------------------------
## Time Limits
----------------------------------------------------------

Include only if relevant.

Use a table.

Example

Action | Time Limit

----------------------------------------------------------
## Punishment / Legal Consequences
----------------------------------------------------------

Only when applicable.

Explain:

Maximum punishment

Minimum punishment

Fine

Civil consequences

Administrative consequences

----------------------------------------------------------
## Relevant Legal Provisions
----------------------------------------------------------

Display as a table.

Provision | Why it matters

Only include provisions actually used in the explanation.

----------------------------------------------------------
## Important Judgments
----------------------------------------------------------

Include only landmark or directly relevant judgments.

Maximum five.

For each:

Case Name

Court

One sentence explaining why it matters.

Never dump large excerpts.

----------------------------------------------------------
## AI Legal Insight
----------------------------------------------------------

Generate a practical legal insight.

This section should explain:

How courts generally interpret the law

Common misconceptions

Practical implications

Important legal nuances

This should NOT be legal advice.

----------------------------------------------------------
## Practical Scenarios
----------------------------------------------------------

When useful, provide 2-3 short examples showing how the law applies in real situations.

----------------------------------------------------------
## Related Questions
----------------------------------------------------------

Generate 3-5 relevant follow-up questions that a user may ask next.

----------------------------------------------------------
## Sources
----------------------------------------------------------

Group retrieved sources into:

Statutes

Judgments

Government Sources

Recent Web/News Results (label each as "Enacted" or "Pending/Proposed")

Mention only sources actually retrieved.

----------------------------------------------------------
## Disclaimer
----------------------------------------------------------

Always end with:

"This response is for general legal information based on the retrieved legal sources and is not a substitute for professional legal advice. For advice specific to your situation, consult a qualified legal practitioner."

==========================================================
STYLE GUIDE
==========================================================

Use plain English.

Avoid Latin terms unless necessary.

Avoid overly technical legal language.

Prefer short paragraphs.

Prefer bullet points.

Use tables where appropriate.

Never overwhelm the user with unnecessary legal provisions.

Never repeat the same information.

==========================================================
SPECIAL RULES
==========================================================

If the user asks:

"What is..."

→ Focus on explanation.

If the user asks:

"What happens after..."

→ Focus on procedure.

If the user asks:

"Can I..."

→ Explain eligibility and legal conditions.

If the user asks:

"Punishment"

→ Focus on offence, punishment, bail, trial court, legal consequences.

If the user asks:

"Difference"

→ Produce a comparison table.

If the user asks:

"How to file"

→ Produce a procedural guide.

If the user asks:

"Judgment"

→ Summarize facts, issue, reasoning, holding, legal principle.

==========================================================
QUALITY CHECK BEFORE FINAL OUTPUT
==========================================================

Before responding, verify that:

✓ The question is directly answered first.

✓ Every legal claim comes from retrieved context.

✓ No hallucinated laws or judgments are included.

✓ The explanation is understandable to a non-lawyer.

✓ Only relevant sections are shown.

✓ The answer is well-structured and easy to scan.

✓ The response is informative without becoming unnecessarily lengthy.

Your goal is to make every response feel like it was prepared by an experienced legal researcher: accurate, structured, practical, and easy to understand.
"""


def ask_llm(question, ranked, ik_results=None, web_results=None):
    """Ask LLM using ranked results from new unified retrieve()."""

    context = _build_context_from_results(ranked, ik_results or [], web_results or [])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Question: {question}\n\nRelevant law:\n{context}"
        }
    ]

    print(f"[ask_llm] sending to LLM: question='{question[:100]}' sections={len(ranked)} ik_results={len(ik_results or [])}", flush=True)
    logger.info(
        "[ask_llm] → NVIDIA | model=%s | question=%r | sections=%d | ik_results=%d | prompt_tokens≈%d",
        LLM_MODEL,
        _truncate(question, 120),
        len(ranked),
        len(ik_results or []),
        sum(len(m["content"]) for m in messages) // 4,
    )
    t_llm = time.perf_counter()
    try:
        # Use non-streaming for faster response
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=4096
        )
        elapsed = time.perf_counter() - t_llm
        answer = completion.choices[0].message.content
        usage = getattr(completion, "usage", None)
        prompt_t = getattr(usage, "prompt_tokens", None) if usage else None
        comp_t = getattr(usage, "completion_tokens", None) if usage else None
        total_t = getattr(usage, "total_tokens", None) if usage else None
        logger.info(
            "[ask_llm] ← NVIDIA | elapsed=%.3fs | prompt_tokens=%s | completion_tokens=%s | total_tokens=%s | answer_len=%d",
            elapsed,
            prompt_t,
            comp_t,
            total_t,
            len(answer or ""),
        )
        logger.info("[ask_llm] response preview: %s", _truncate(answer, 400))
        return answer
    except Exception as e:
        elapsed = time.perf_counter() - t_llm
        logger.error("[ask_llm] ← NVIDIA | ERROR after %.3fs | %s", elapsed, e, exc_info=False)
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
        sec = r.get("section", {})
        doc = sec.get("document", r.get("law_id", "?"))
        sec_num = sec.get("section", r.get("provision_number", "?"))
        title = sec.get("title", r.get("title", ""))

        # Try to look up full text for snippet
        snippet = r.get("snippet", "")
        if not snippet:
            lid = r.get("law_id", "")
            pn = r.get("provision_number", "")
            if lid and pn:
                data = PER_LAW_INDEXES.get(lid, {})
                prov = _get_provision(data, pn)
                if prov:
                    full = prov.get("full_text", "")
                    snippet = full[:400] if full else ""

        results.append(
            SearchResult(
                document=doc,
                section_number=sec_num if isinstance(sec_num, int) else (int(sec_num) if str(sec_num).isdigit() else str(sec_num)),
                title=title,
                snippet=snippet,
                sub_clause=None,
                example=None,
                punishment_summary=None,
                page=sec.get("page", r.get("page", 0)),
                score=r.get("score", 0),
                score_breakdown=r.get("score_breakdown"),
            )
        )

    return results


def build_case_studies(question, ranked, ik_results=None):

    case_studies = []

    for i, r in enumerate(ranked[:2], start=1):
        sec = r.get("section", {})
        doc = sec.get("document", r.get("law_id", "?"))
        pnum = sec.get("section", r.get("provision_number", "?"))
        section_ref = f"{doc} Section {pnum}"
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

    logger.info("=" * 80)
    logger.info("[startup] RAG server starting | model=%s | embed_model=%s", LLM_MODEL, EMBED_MODEL_NAME)

    global MONGO_DB

    mongodb_uri = os.getenv("MONGODB_URI", "")
    if mongodb_uri:
        try:
            mongo_client = MongoClient(mongodb_uri)
            MONGO_DB = mongo_client.get_database()
            print(f"[startup] MongoDB connected: {MONGO_DB.name}", flush=True)
            logger.info("[startup] MongoDB connected: %s", MONGO_DB.name)
        except Exception as e:
            print(f"[startup] MongoDB connection failed: {e}", flush=True)
            logger.warning("[startup] MongoDB connection failed: %s", e)
            MONGO_DB = None
    else:
        print("[startup] MONGODB_URI not set, skipping MongoDB", flush=True)
        logger.info("[startup] MONGODB_URI not set, skipping MongoDB")

    load_per_law_indexes()
    logger.info("[startup] RAG server ready on http://localhost:8000")
    logger.info("=" * 80)


@app.get("/", response_class=HTMLResponse)
def home():

    return """
    <h1>Indian Law AI Assistant</h1>
    <p>Supports BNS, BNSS, BSA, Motor Vehicles Act, Corporate Laws + Indian Kanoon Case Law</p>
    <a href="/docs">API Docs</a>
    """


def _build_context_from_results(ranked: list, ik_raw: list, web_raw: Optional[list] = None, max_chars: int = 12000) -> str:
    """Build LLM context from retrieved results, truncating to avoid token overflow."""
    parts = []
    chars = 0
    for r in ranked:
        lid = r.get("law_id", "")
        pn = r.get("provision_number", "")
        sec = r.get("section", {})
        label = sec.get("document", lid)
        pnum = sec.get("section", pn)
        title = sec.get("title", r.get("title", ""))

        # Look up full text from per-law corpus
        text = ""
        if lid and pn:
            data = PER_LAW_INDEXES.get(lid, {})
            prov = _get_provision(data, pn)
            if prov:
                text = prov.get("full_text", "") or ""

        entry = f"\n{label} {pnum} — {title}\n{text}\n"
        if chars + len(entry) > max_chars:
            # Truncate this entry
            remaining = max_chars - chars
            entry = entry[:remaining]
            parts.append(entry)
            break
        parts.append(entry)
        chars += len(entry)

    if ik_raw:
        ik_section = "\n--- Indian Kanoon Case Law ---\n"
        for ik in ik_raw:
            ik_section += f"\n[{ik['title']}]\n{ik.get('headline', '')}\n"
        if chars + len(ik_section) <= max_chars:
            parts.append(ik_section)
            chars += len(ik_section)

    if web_raw:
        web_section = (
            "\n--- Recent Web/News Results (current-events context; may include "
            "pending bills/proposals that are NOT yet enacted law — verify status "
            "before treating as binding) ---\n"
        )
        for w in web_raw:
            date_part = f" ({w['date']})" if w.get("date") else ""
            source = w.get("source") or w.get("displayed_link", "")
            web_section += f"\n[{w['title']}]{date_part} — {source}\n{w.get('snippet', '')}\nLink: {w.get('link', '')}\n"
        if chars + len(web_section) <= max_chars:
            parts.append(web_section)

    return "".join(parts)


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest):

    req_start = time.perf_counter()
    print(f"[ask] question='{body.question}' top_k={body.top_k}", flush=True)
    logger.info("─" * 80)
    logger.info("[POST /ask] request received | question=%r | top_k=%d | history_msgs=%d",
                _truncate(body.question, 160), body.top_k, len(body.history or []))

    loop = asyncio.get_event_loop()

    # HyDE: generate hypothetical answer for better retrieval
    hyde_query_str = await loop.run_in_executor(None, hyde_query, body.question)

    ranked_task = loop.run_in_executor(None, retrieve, hyde_query_str, body.top_k)
    ik_task = loop.run_in_executor(None, ik_search, body.question, 0, 5)
    web_task = loop.run_in_executor(None, web_search, body.question, WEB_SEARCH_MAX_RESULTS) if _needs_web_search(body.question) else None

    if web_task is not None:
        ranked, ik_raw, web_raw = await asyncio.gather(ranked_task, ik_task, web_task)
    else:
        ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
        web_raw = []
    print(f"[ask] retrieved {len(ranked)} sections, {len(ik_raw)} ik results, {len(web_raw)} web results", flush=True)
    logger.info("[POST /ask] retrieval done | sections=%d | ik_results=%d | web_results=%d | elapsed=%.3fs",
                len(ranked), len(ik_raw), len(web_raw), time.perf_counter() - req_start)

    context = _build_context_from_results(ranked, ik_raw, web_raw)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (body.history or []):
        role = "user" if h.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": f"Question: {body.question}\n\nRelevant law:\n{context}"})

    logger.info("[POST /ask] → NVIDIA | model=%s | context_chars=%d", LLM_MODEL, len(context))
    t_llm = time.perf_counter()
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=4096,
        )
        ai_answer = completion.choices[0].message.content or ""
    except Exception as e:
        logger.error("[POST /ask] ← NVIDIA ERROR | %s", e)
        ai_answer = f"Error: {str(e)}"
    elapsed_llm = time.perf_counter() - t_llm

    print(f"[ask] ai_answer length={len(ai_answer)} preview='{ai_answer[:200]}'", flush=True)
    logger.info("[POST /ask] response sent | answer_len=%d | llm_elapsed=%.3fs | total_elapsed=%.3fs",
                len(ai_answer), elapsed_llm, time.perf_counter() - req_start)
    logger.info("─" * 80)

    results = to_search_results(ranked)
    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]
    web_models = [WebResult(**w) for w in web_raw]

    return AskResponse(
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        model_used=LLM_MODEL,
        indian_kanoon_results=ik_models,
        web_results=web_models,
    )


def _ranked_to_section_meta(ranked: list) -> list:
    """Convert ranked results to section metadata dicts for frontend."""
    meta = []
    for r in ranked:
        sec = r.get("section", {})
        snippet = ""
        lid = r.get("law_id", "")
        pn = r.get("provision_number", "")
        if lid and pn:
            data = PER_LAW_INDEXES.get(lid, {})
            prov = _get_provision(data, pn)
            if prov:
                snippet = (prov.get("full_text") or "")[:400]
        meta.append({
            "document": sec.get("document", lid),
            "section_number": sec.get("section", pn),
            "title": sec.get("title", r.get("title", "")),
            "snippet": snippet,
        })
    return meta


@app.post("/ask/stream")
def ask_stream(body: AskRequest):
    req_start = time.perf_counter()
    print(f"[ask/stream] question='{body.question}'", flush=True)
    logger.info("─" * 80)
    logger.info("[POST /ask/stream] request received | question=%r | top_k=%d | history_msgs=%d",
                _truncate(body.question, 160), body.top_k, len(body.history or []))

    ranked = retrieve(body.question, body.top_k)
    ik_raw = ik_search(body.question, max_results=5)
    web_raw = web_search(body.question, max_results=WEB_SEARCH_MAX_RESULTS) if _needs_web_search(body.question) else []
    logger.info("[POST /ask/stream] retrieval done | sections=%d | ik_results=%d | web_results=%d",
                len(ranked), len(ik_raw), len(web_raw))

    context = _build_context_from_results(ranked, ik_raw, web_raw)
    history = body.history or []
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history:
        role = "user" if h.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": h.get("content", "")})
    messages.append({"role": "user", "content": f"Question: {body.question}\n\nRelevant law:\n{context}"})

    sections_meta = _ranked_to_section_meta(ranked)
    ik_meta = [{"doc_id": d["doc_id"], "title": d["title"], "headline": d.get("headline", "")} for d in ik_raw]
    web_meta = [{
        "title": w["title"],
        "link": w["link"],
        "snippet": w.get("snippet", ""),
        "source": w.get("source", ""),
        "date": w.get("date", ""),
        "displayed_link": w.get("displayed_link", ""),
        "position": w.get("position"),
    } for w in web_raw]

    def event_stream():
        llm_start = time.perf_counter()
        logger.info("[POST /ask/stream] → NVIDIA (streaming) | model=%s | prompt_chars=%d",
                    LLM_MODEL, sum(len(m["content"]) for m in messages))
        full_response_parts = []
        try:
            completion = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                temperature=0,
                max_tokens=4096,
                extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 4096},
                stream=True
            )
            for chunk in completion:
                if not chunk.choices:
                    continue
                if chunk.choices[0].delta.content is not None:
                    token = chunk.choices[0].delta.content
                    full_response_parts.append(token)
                    yield f"data: {json.dumps({'t': 'token', 'c': token})}\n\n"
        except Exception as e:
            elapsed = time.perf_counter() - llm_start
            logger.error("[POST /ask/stream] ← NVIDIA | STREAM ERROR after %.3fs | %s", elapsed, e, exc_info=False)
            print(f"[ask/stream] ERROR: {e}", flush=True)
            yield f"data: {json.dumps({'t': 'error', 'c': str(e)})}\n\n"

        elapsed = time.perf_counter() - llm_start
        full_response = "".join(full_response_parts)
        logger.info("[POST /ask/stream] ← NVIDIA | stream_elapsed=%.3fs | streamed_chars=%d | total_elapsed=%.3fs",
                    elapsed, len(full_response), time.perf_counter() - req_start)
        logger.info("[POST /ask/stream] full response preview: %s", _truncate(full_response, 400))
        logger.info("─" * 80)

        yield f"data: {json.dumps({'t': 'meta', 'sections': sections_meta, 'ik': ik_meta, 'web': web_meta})}\n\n"
        yield f"data: {json.dumps({'t': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/query", response_model=QueryResponse)
async def query(q: str = Query(...), top_k: int = 7):

    req_start = time.perf_counter()
    logger.info("─" * 80)
    logger.info("[GET /query] request received | q=%r | top_k=%d", _truncate(q, 160), top_k)

    loop = asyncio.get_event_loop()

    hyde_query_str = await loop.run_in_executor(None, hyde_query, q)
    ranked_task = loop.run_in_executor(None, retrieve, hyde_query_str, top_k)
    ik_task = loop.run_in_executor(None, ik_search, q, 0, 5)
    web_task = loop.run_in_executor(None, web_search, q, WEB_SEARCH_MAX_RESULTS) if _needs_web_search(q) else None

    if web_task is not None:
        ranked, ik_raw, web_raw = await asyncio.gather(ranked_task, ik_task, web_task)
    else:
        ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)
        web_raw = []

    context = _build_context_from_results(ranked, ik_raw, web_raw)
    ai_answer = await loop.run_in_executor(None, ask_llm, q, ranked, ik_raw, web_raw)

    logger.info("[GET /query] done | total_elapsed=%.3fs | answer_len=%d",
                time.perf_counter() - req_start, len(ai_answer))
    logger.info("─" * 80)

    results = to_search_results(ranked)
    ik_models = [IKResult(doc_id=d["doc_id"], title=d["title"], headline=d.get("headline", "")) for d in ik_raw]
    web_models = [WebResult(**w) for w in web_raw]

    return QueryResponse(
        query=q,
        ai_answer=ai_answer,
        results=results,
        total_found=len(results),
        model_used=LLM_MODEL,
        user_rights=None,
        web_results=web_models,
        indian_kanoon_results=ik_models,
    )


@app.post("/microlearning/ask", response_model=MicrolearningAskResponse)
async def microlearning_ask(body: MicrolearningAskRequest):

    req_start = time.perf_counter()
    logger.info("─" * 80)
    logger.info("[POST /microlearning/ask] request received | lesson_id=%s | lesson_title=%r | question=%r",
                body.lesson_id, _truncate(body.lesson_title, 100), _truncate(body.question, 160))

    composite_query = (
        f"Lesson: {body.lesson_title}. "
        f"Law Text: {body.law_text}. "
        f"User Question: {body.question}"
    )

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, composite_query, body.top_k)
    ik_task = loop.run_in_executor(None, ik_search, f"{body.lesson_title} {body.question}", 0, 3)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)

    ai_answer = await loop.run_in_executor(
        None,
        ask_llm,
        f"Microlearning lesson '{body.lesson_title}'. Question: {body.question}. "
        f"Explain in concise, learner-friendly steps with practical legal caution.",
        ranked,
        ik_raw,
    )

    results = to_search_results(ranked)
    case_studies = build_case_studies(body.question, ranked, ik_raw)

    logger.info("[POST /microlearning/ask] done | total_elapsed=%.3fs | answer_len=%d | case_studies=%d",
                time.perf_counter() - req_start, len(ai_answer), len(case_studies))
    logger.info("─" * 80)

    return MicrolearningAskResponse(
        lesson_title=body.lesson_title,
        question=body.question,
        ai_answer=ai_answer,
        supporting_sections=results,
        case_studies=case_studies,
        model_used=LLM_MODEL,
    )


GENERATE_LESSON_PROMPT = """You are an expert Indian legal educator. Generate a detailed, practical legal lesson.

Return ONLY valid JSON with this exact structure:
{
  "law_text": "Detailed legal text with section references (2-3 paragraphs)",
  "simple_explanation": "Easy to understand plain-language explanation (2-3 paragraphs)",
  "important_case": {"case_name": "Full case name with year", "year": "YYYY", "principle": "Key legal principle established"},
  "scenario": {"prompt": "Real-world scenario description (2-3 sentences)", "question": "What legal question arises from this scenario?"},
  "quiz": [
    {"id": "q1", "question": "Question text", "options": [{"id": "a", "label": "Option A"}, {"id": "b", "label": "Option B"}, {"id": "c", "label": "Option C"}, {"id": "d", "label": "Option D"}], "correctOptionId": "a", "explanation": "Why this answer is correct"},
    {"id": "q2", ...},
    {"id": "q3", ...},
    {"id": "q4", ...},
    {"id": "q5", ...}
  ]
}

Requirements:
- Base the lesson on the provided legal sections from Indian statutes (BNS, BNSS, BSA, etc.)
- Include specific section numbers and act names
- Make the scenario practical and relatable
- Quiz questions must test understanding, not just memorization
- Each quiz question must have 4 options with exactly one correct
- Explanations should teach why the answer is right"""


@app.post("/microlearning/generate", response_model=GenerateLessonResponse)
def microlearning_generate(body: GenerateLessonRequest):
    """Generate a detailed lesson dynamically using LLM + RAG retrieval. Persists to MongoDB."""

    cached = _lesson_cache.get(body.lesson_id)
    if cached:
        return cached

    if MONGO_DB is not None:
        try:
            existing = MONGO_DB.lessons.find_one({"lesson_id": body.lesson_id})
            if existing:
                existing.pop("_id", None)
                _lesson_cache[body.lesson_id] = GenerateLessonResponse(**existing)
                return _lesson_cache[body.lesson_id]
        except Exception as e:
            print(f"[microlearning_generate] MongoDB read error: {e}", flush=True)

    ranked = retrieve(body.lesson_title, top_k=5)

    context = _build_context_from_results(ranked, [], max_chars=12000)

    messages = [
        {"role": "system", "content": GENERATE_LESSON_PROMPT},
        {"role": "user", "content": (
            f"Generate a detailed legal lesson about: {body.lesson_title}\n"
            f"Description: {body.lesson_description}\n\n"
            f"Relevant Indian law sections found:\n{context[:12000]}"
        )}
    ]

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=8192,
    )
    output = response.choices[0].message.content or "{}"

    import json as _json
    parsed = {}
    m = re.search(r"\{[\s\S]*\}", output)
    if m:
        try:
            parsed = _json.loads(m.group(0))
        except Exception:
            parsed = {}

    case_name = "Relevant Indian legal precedent"
    case_year = "2023"
    case_principle = "This case established important legal principles related to the topic."
    ic = parsed.get("important_case", {})
    if isinstance(ic, dict):
        case_name = ic.get("case_name", case_name)
        case_year = ic.get("year", case_year)
        case_principle = ic.get("principle", case_principle)

    raw_scenario = parsed.get("scenario", {})
    if not isinstance(raw_scenario, dict):
        raw_scenario = {}

    raw_quiz = parsed.get("quiz", [])
    if not isinstance(raw_quiz, list):
        raw_quiz = []

    difficulty = "Beginner" if body.lesson_description and len(body.lesson_description) < 60 else "Intermediate"

    result = GenerateLessonResponse(
        lesson_id=body.lesson_id,
        title=body.lesson_title,
        description=body.lesson_description,
        difficulty=difficulty,
        minutes=8,
        law_text=str(parsed.get("law_text", "Legal provisions related to this topic.")),
        simple_explanation=str(parsed.get("simple_explanation", "Understanding this legal concept helps citizens protect their rights.")),
        important_case=LawAwarenessCaseReference(
            case_name=case_name,
            year=case_year,
            principle=case_principle,
        ),
        scenario=LessonScenario(
            prompt=str(raw_scenario.get("prompt", "A citizen faces a legal situation related to this topic.")),
            question=str(raw_scenario.get("question", "What legal steps should be taken?")),
        ),
        quiz=[LessonQuizQuestion(**q) for q in raw_quiz if isinstance(q, dict) and q.get("id") and q.get("question")],
        supporting_sections=to_search_results(ranked),
    )

    _lesson_cache[body.lesson_id] = result
    if len(_lesson_cache) > 64:
        oldest = next(iter(_lesson_cache))
        del _lesson_cache[oldest]

    if MONGO_DB is not None:
        try:
            doc = result.model_dump()
            doc["_id"] = doc["lesson_id"]
            MONGO_DB.lessons.replace_one({"lesson_id": body.lesson_id}, doc, upsert=True)
        except Exception as e:
            print(f"[microlearning_generate] MongoDB write error: {e}", flush=True)

    return result


@app.post("/tools/case-analyzer", response_model=ToolCaseAnalyzerResponse)
def tool_case_analyzer(body: ToolCaseAnalyzerRequest):
    req_start = time.perf_counter()
    if not body.case_text.strip():
        raise HTTPException(400, "case_text is required")

    prompt = (
        "Analyze this case description and provide a practical legal analysis for India. "
        "Include likely offences/violations, applicable legal provisions, and immediate legal steps.\n\n"
        f"Case text:\n{body.case_text}"
    )

    logger.info("─" * 80)
    logger.info("[POST /tools/case-analyzer] request received | case_text_len=%d chars", len(body.case_text))

    ranked = retrieve(prompt, body.top_k)
    ai_answer = ask_llm(prompt, ranked)

    logger.info("[POST /tools/case-analyzer] done | total_elapsed=%.3fs | answer_len=%d",
                time.perf_counter() - req_start, len(ai_answer))
    logger.info("─" * 80)

    return ToolCaseAnalyzerResponse(
        ai_answer=ai_answer,
        supporting_sections=to_search_results(ranked),
        model_used=LLM_MODEL,
    )


@app.post("/tools/contract-risk", response_model=ToolContractRiskResponse)
def tool_contract_risk(body: ToolContractRiskRequest):
    req_start = time.perf_counter()
    if not body.contract_text.strip():
        raise HTTPException(400, "contract_text is required")

    logger.info("─" * 80)
    logger.info("[POST /tools/contract-risk] request received | contract_text_len=%d chars", len(body.contract_text))

    ranked = retrieve(
        "Identify legal risks, unfair terms, liabilities, and enforceability concerns in this contract:\n"
        + body.contract_text,
        body.top_k,
    )

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

    logger.info("[POST /tools/contract-risk] → NVIDIA | model=%s | prompt_chars=%d",
                LLM_MODEL, sum(len(m["content"]) for m in messages))
    llm_start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=4096,
            extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 2048}
        )
        llm_elapsed = time.perf_counter() - llm_start
        output = response.choices[0].message.content or ""
        usage = getattr(response, "usage", None)
        logger.info("[POST /tools/contract-risk] ← NVIDIA | llm_elapsed=%.3fs | output_len=%d | tokens=%s/%s/%s",
                    llm_elapsed, len(output),
                    getattr(usage, "prompt_tokens", "?") if usage else "?",
                    getattr(usage, "completion_tokens", "?") if usage else "?",
                    getattr(usage, "total_tokens", "?") if usage else "?")
        logger.info("[POST /tools/contract-risk] raw output preview: %s", _truncate(output, 400))
    except Exception as e:
        llm_elapsed = time.perf_counter() - llm_start
        logger.error("[POST /tools/contract-risk] ← NVIDIA | LLM ERROR after %.3fs | %s", llm_elapsed, e, exc_info=False)
        output = ""
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

    logger.info("[POST /tools/contract-risk] done | risk_score=%d | risk_level=%s | flagged=%d | recommendations=%d | total_elapsed=%.3fs",
                risk_score, _normalize_risk_level(risk_score), len(flagged_clauses), len(recommendations),
                time.perf_counter() - req_start)
    logger.info("─" * 80)

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
    req_start = time.perf_counter()
    if not body.document_text.strip():
        raise HTTPException(400, "document_text is required")

    prompt = (
        "Summarize this legal document in a structured format for a litigant. "
        "Cover key facts, legal issues, findings, and practical next steps.\n\n"
        f"Document text:\n{body.document_text}"
    )

    logger.info("─" * 80)
    logger.info("[POST /tools/case-summarizer] request received | document_text_len=%d chars", len(body.document_text))

    ranked = retrieve(prompt, body.top_k)
    ai_answer = ask_llm(prompt, ranked)

    logger.info("[POST /tools/case-summarizer] done | total_elapsed=%.3fs | answer_len=%d",
                time.perf_counter() - req_start, len(ai_answer))
    logger.info("─" * 80)

    return ToolCaseSummarizerResponse(
        ai_answer=ai_answer,
        supporting_sections=to_search_results(ranked),
        model_used=LLM_MODEL,
    )


@app.get("/section/{number}")
def section(number: int):
    """Look up a section across all per-law indexes (legacy endpoint)."""
    for lid, data in PER_LAW_INDEXES.items():
        prov = _get_provision(data, number)
        if prov:
            ranked_single = [{
                "score": 1.0,
                "section": {
                    "document": data["label"],
                    "section": str(number),
                    "title": prov.get("title", ""),
                    "page": prov.get("page", 0),
                    "full_text": prov.get("full_text", ""),
                },
                "law_id": lid,
                "provision_number": str(number),
            }]
            explanation = ask_llm(
                f"Explain {data['label']} Section {number}",
                ranked_single,
            )
            return {
                "document": data["label"],
                "section": number,
                "title": prov.get("title", ""),
                "page": prov.get("page", 0),
                "full_text": prov.get("full_text", ""),
                "sub_clauses": prov.get("sub_clauses", []),
                "examples": prov.get("examples", []),
                "punishment_summary": extract_punishment(prov.get("full_text", "")),
                "ai_explanation": explanation,
            }
    raise HTTPException(404)


@app.get("/sections")
def list_sections(keyword: Optional[str] = None, limit: int = 20):
    """List sections across all per-law indexes (legacy endpoint)."""
    out = []
    for lid, data in PER_LAW_INDEXES.items():
        provisions = data["corpus"].get("provisions", [])
        for prov in provisions:
            text = (prov.get("full_text") or "") + prov.get("title", "")
            if keyword and keyword.lower() not in text.lower():
                continue
            out.append({
                "document": data["label"],
                "section": prov.get("number", ""),
                "title": prov.get("title", ""),
                "page": prov.get("page", 0),
            })
            if len(out) >= limit:
                break
        if len(out) >= limit:
            break
    return out


@app.get("/punishment")
def punishment(offense: str):
    """Find punishment for an offense across per-law indexes."""
    ranked = retrieve(offense)
    results = []
    for r in ranked:
        sec = r.get("section", {})
        lid = r.get("law_id", "")
        pn = r.get("provision_number", "")
        text_for_pun = ""
        if lid and pn:
            data = PER_LAW_INDEXES.get(lid, {})
            prov = _get_provision(data, pn)
            if prov:
                text_for_pun = prov.get("full_text", "") or ""
        p = extract_punishment(text_for_pun) if text_for_pun else None
        if p:
            results.append({
                "document": sec.get("document", lid),
                "section": sec.get("section", pn),
                "title": sec.get("title", r.get("title", "")),
                "punishment": p,
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
        max_tokens=4096,
        extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 2048}
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


DAILY_DOC_IDS = ["bns_2023", "bnss_2023", "bsa_2023", "corporate", "motor_vehicles"]

@app.get("/law-awareness/daily", response_model=DailyLawResponse)
def law_awareness_daily():
    """Return a few random sections from each legal code, selected deterministically by date."""
    from datetime import date as dt_date
    today = dt_date.today()
    date_str = today.isoformat()
    seed_base = int(today.year * 10000 + today.month * 100 + today.day)

    sections_out = []
    for lid in DAILY_DOC_IDS:
        data = PER_LAW_INDEXES.get(lid)
        if not data:
            continue
        provisions = data["corpus"].get("provisions", [])
        if not provisions:
            continue

        label = data["label"]
        doc_hash = (seed_base + sum(ord(c) for c in lid)) % len(provisions)
        chosen = provisions[doc_hash]

        sections_out.append(DailyLawSection(
            document=label,
            section=chosen.get("number", ""),
            title=chosen.get("title", ""),
            snippet=(chosen.get("full_text", "") or "")[:300],
            page=chosen.get("page", 0),
        ))

        second_idx = (doc_hash + 7) % len(provisions)
        if second_idx != doc_hash and len(sections_out) < 12:
            second = provisions[second_idx]
            sections_out.append(DailyLawSection(
                document=label,
                section=second.get("number", ""),
                title=second.get("title", ""),
                snippet=(second.get("full_text", "") or "")[:300],
                page=second.get("page", 0),
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

    if MONGO_DB is not None:
        try:
            existing = MONGO_DB.news_lessons.find_one({"news_id": body.news_id})
            if existing:
                existing.pop("_id", None)
                return NewsToLessonResponse(**existing)
        except Exception as e:
            print(f"[legal_news_to_lesson] MongoDB read error: {e}", flush=True)

    composite = f"{body.headline} {body.summary} {body.category}"

    loop = asyncio.get_event_loop()

    ranked_task = loop.run_in_executor(None, retrieve, composite, 5)
    ik_task = loop.run_in_executor(None, ik_search, body.headline, 0, 3)

    ranked, ik_raw = await asyncio.gather(ranked_task, ik_task)

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

    # Build section references from ranked results
    def _sec_ref(r):
        sec = r.get("section", {})
        doc = sec.get("document", r.get("law_id", ""))
        num = sec.get("section", r.get("provision_number", "?"))
        title = sec.get("title", r.get("title", ""))
        return doc, num, title

    section_refs = "\n".join([f"- {d} Section {n}: {t}" for d, n, t in (_sec_ref(r) for r in ranked[:5])])
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
    explanation = await loop.run_in_executor(None, ask_llm, explain_prompt, ranked, ik_raw)

    # Generate microlearning lesson
    lesson_title = f"Understanding {legal_topic}"
    first3 = [_sec_ref(r) for r in ranked[:3]]
    lesson_law_text = "\n\n".join([f"{d} Section {n} — {t}\n" for d, n, t in first3])
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

    result = NewsToLessonResponse(
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

    if MONGO_DB is not None:
        try:
            doc = result.model_dump()
            doc["_id"] = doc["news_id"]
            MONGO_DB.news_lessons.replace_one({"news_id": body.news_id}, doc, upsert=True)
        except Exception as e:
            print(f"[legal_news_to_lesson] MongoDB write error: {e}", flush=True)

    return result


def load_per_law_indexes():
    global MASTER_INDEX, PER_LAW_INDEXES
    mip = DATA_DIR / "master_index.json"
    if not mip.exists():
        logger.warning("[startup] master_index.json not found at %s — skipping per-law FAISS loading", mip)
        return
    with open(mip, "r", encoding="utf-8") as fp:
        MASTER_INDEX = json.load(fp)
    logger.info("[startup] master_index.json loaded | %d laws, %d total provisions",
                MASTER_INDEX["total_laws"], MASTER_INDEX["total_provisions"])
    for law in MASTER_INDEX["laws"]:
        lid = law["id"]
        law_dir = DATA_DIR / lid
        index_path = law_dir / "faiss.index"
        meta_path = law_dir / "corpus_meta.json"
        corpus_path = law_dir / "corpus.json"
        curated_path = law_dir / "curated.json"
        if not index_path.exists():
            logger.warning("[startup]  %s: faiss.index not found, skipping", lid)
            continue
        t = time.perf_counter()
        idx = faiss.read_index(str(index_path))
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else []
        corpus = json.loads(corpus_path.read_text(encoding="utf-8")) if corpus_path.exists() else {}
        curated = json.loads(curated_path.read_text(encoding="utf-8")) if curated_path.exists() else {}
        provisions_by_number = _build_provision_lookup(corpus)
        PER_LAW_INDEXES[lid] = {
            "index": idx,
            "meta": meta,
            "corpus": corpus,
            "provisions_by_number": provisions_by_number,
            "curated": curated,
            "label": law["label"],
            "domain": law["domain"],
            "provision_label": corpus.get("provision_label", "Section"),
        }
        logger.info("[startup]  %s: %s | %d vectors | %.1fs",
                    lid, law["label"], idx.ntotal, time.perf_counter() - t)
    logger.info("[startup] per-law FAISS loaded: %d/%d laws | total vectors: %d",
                len(PER_LAW_INDEXES), len(MASTER_INDEX["laws"]),
                sum(v["index"].ntotal for v in PER_LAW_INDEXES.values()))


class LawListResponse(BaseModel):
    total_laws: int
    total_provisions: int
    embedding_model: str
    laws: List[dict]


class LawDetailResponse(BaseModel):
    id: str
    label: str
    domain: str
    strategy: str
    provision_label: str
    provision_count: int
    provisions: List[dict] = []


class ProvisionDetailResponse(BaseModel):
    law_id: str
    law_label: str
    provision_label: str
    number: str
    title: str
    full_text: Optional[str] = None
    section_number: Optional[str] = None
    page: Optional[int] = None
    sub_clauses: List[dict] = []
    examples: List[dict] = []
    summary: Optional[str] = None
    plain_english: Optional[str] = None
    keywords: List[str] = []
    legal_topics: List[str] = []
    related: List[str] = []
    cross_references: List[dict] = []
    doctrines: Optional[str] = None
    use_cases: Optional[str] = None
    important_concepts: Optional[str] = None


class ProvisionEnrichRequest(BaseModel):
    force: bool = False


class ProvisionEnrichResponse(BaseModel):
    law_id: str
    provision_number: str
    doctrines: Optional[str] = None
    use_cases: Optional[str] = None
    important_concepts: Optional[str] = None
    model_used: str
    cached: bool


class RoutedAskRequest(BaseModel):
    question: str
    law_ids: List[str]
    top_k: int = 5


def per_law_retrieve(law_id: str, query: str, top_k: int = 5) -> list:
    """Per-law FAISS retrieval with CrossEncoder reranking."""
    data = PER_LAW_INDEXES.get(law_id)
    if not data:
        return []
    idx = data["index"]
    meta = data["meta"]
    q_emb = embed_model.encode([query], normalize_embeddings=True)
    scores, indices = idx.search(q_emb, min(top_k * 4, idx.ntotal))

    pairs = []
    valid = []
    for si, ii in enumerate(indices[0]):
        if ii < 0 or ii >= len(meta):
            continue
        m = meta[ii]
        prov_num = str(m.get("number", ""))
        prov = _get_provision(data, prov_num)
        text = _provision_rerank_text(prov)
        pairs.append((query, text))
        valid.append(m)

    rerank_scores = reranker.predict(pairs, batch_size=RERANK_BATCH_SIZE, show_progress_bar=False) if pairs else []

    def softmax_single(x, temp=1.0):
        e = np.exp((np.array(x) - np.max(x)) / temp)
        return e / e.sum()

    vec_scores = np.array([float(scores[0][i]) for i in range(len(valid))])
    rerank_arr = np.array(rerank_scores) if len(rerank_scores) == len(valid) else vec_scores
    vec_norm = softmax_single(vec_scores)
    rerank_norm = softmax_single(rerank_arr)
    w_rerank = max(0.4, min(0.8, float(np.max(sigmoid(rerank_arr)))))
    hybrid = (1 - w_rerank) * vec_norm + w_rerank * rerank_norm

    results = []
    for i, m in enumerate(valid):
        results.append({
            "score": float(hybrid[i]),
            "provision_number": str(m.get("number", "?")),
            "title": m.get("title", ""),
            "page": m.get("page", 0),
        })
    results.sort(key=lambda x: -x["score"])
    return results[:top_k]


def multi_law_retrieve(query: str, top_k: int = 10) -> list:
    """Search ALL per-law FAISS indexes and return merged, deduplicated results with reranking."""
    if not PER_LAW_INDEXES:
        return []
    q_emb = embed_model.encode([query], normalize_embeddings=True)
    all_candidates = []
    for lid, data in PER_LAW_INDEXES.items():
        idx = data["index"]
        meta = data["meta"]
        search_k = min(top_k, idx.ntotal)
        scores, indices = idx.search(q_emb, search_k)
        for si, ii in enumerate(indices[0]):
            if ii < 0 or ii >= len(meta):
                continue
            m = meta[ii]
            all_candidates.append({
                "law_id": lid,
                "law_label": data["label"],
                "provision_number": str(m.get("number", "?")),
                "title": m.get("title", ""),
                "page": m.get("page", 0),
                "vector_score": float(scores[0][si]),
                "meta_idx": ii,
            })

    pairs = []
    valid = []
    for c in all_candidates:
        data = PER_LAW_INDEXES.get(c["law_id"])
        if not data:
            continue
        prov = _get_provision(data, c["provision_number"])
        text = _provision_rerank_text(prov)
        pairs.append((query, text))
        valid.append(c)

    rerank_scores = reranker.predict(pairs, batch_size=RERANK_BATCH_SIZE, show_progress_bar=False) if pairs else []

    def softmax_single(x, temp=1.0):
        e = np.exp((np.array(x) - np.max(x)) / temp)
        return e / e.sum()

    if valid:
        vec = np.array([v["vector_score"] for v in valid])
        rr = np.array(rerank_scores) if len(rerank_scores) == len(valid) else vec
        vec_norm = softmax_single(vec)
        rr_norm = softmax_single(rr)
        w_rerank = max(0.4, min(0.8, float(np.max(sigmoid(rr)))))
        hybrid = (1 - w_rerank) * vec_norm + w_rerank * rr_norm
        for i, v in enumerate(valid):
            v["score"] = float(hybrid[i])

    all_results = sorted(valid, key=lambda x: -x["score"])
    seen = set()
    unique = []
    for r in all_results:
        key = (r["law_id"], r["provision_number"])
        if key not in seen:
            seen.add(key)
            unique.append({
                "law_id": r["law_id"],
                "law_label": r["law_label"],
                "provision_label": PER_LAW_INDEXES.get(r["law_id"], {}).get("provision_label", "Section"),
                "provision_number": r["provision_number"],
                "title": r["title"],
                "page": r["page"],
                "score": r["score"],
            })
    return unique[:top_k]


@app.get("/laws", response_model=LawListResponse)
def list_laws():
    if not MASTER_INDEX:
        raise HTTPException(503, "Master index not loaded")
    return LawListResponse(
        total_laws=MASTER_INDEX["total_laws"],
        total_provisions=MASTER_INDEX["total_provisions"],
        embedding_model=MASTER_INDEX.get("embedding_model", "BAAI/bge-base-en-v1.5"),
        laws=MASTER_INDEX["laws"],
    )


@app.get("/laws/{law_id}", response_model=LawDetailResponse)
def get_law(law_id: str, include_provisions: bool = Query(False)):
    if not MASTER_INDEX:
        raise HTTPException(503, "Master index not loaded")
    law_entry = next((l for l in MASTER_INDEX["laws"] if l["id"] == law_id), None)
    if not law_entry:
        raise HTTPException(404, f"Law '{law_id}' not found")
    provisions = []
    if include_provisions:
        data = PER_LAW_INDEXES.get(law_id, {}).get("corpus", {})
        provisions = data.get("provisions", [])
    return LawDetailResponse(
        id=law_entry["id"],
        label=law_entry["label"],
        domain=law_entry["domain"],
        strategy=law_entry.get("strategy", ""),
        provision_label=law_entry.get("provision_label", "Section"),
        provision_count=law_entry["provision_count"],
        provisions=provisions,
    )


@app.get("/laws/{law_id}/provisions/{provision_number}", response_model=ProvisionDetailResponse)
def get_provision(law_id: str, provision_number: str):
    if not MASTER_INDEX:
        raise HTTPException(503, "Master index not loaded")
    law_entry = next((l for l in MASTER_INDEX["laws"] if l["id"] == law_id), None)
    if not law_entry:
        raise HTTPException(404, f"Law '{law_id}' not found")
    data = PER_LAW_INDEXES.get(law_id)
    if not data:
        raise HTTPException(404, f"Law '{law_id}' data not loaded")
    corpus = data["corpus"]
    prov = _get_provision(data, provision_number)
    if not prov:
        raise HTTPException(404, f"Provision {provision_number} not found in {law_id}")
    curated = data.get("curated", {}).get("curated", [])
    cur_entry = next((c for c in curated if c.get("provision_number") == provision_number), None)
    return ProvisionDetailResponse(
        law_id=law_id,
        law_label=data["label"],
        provision_label=corpus.get("provision_label", "Section"),
        number=prov.get("number", provision_number),
        title=prov.get("title", ""),
        full_text=prov.get("full_text"),
        section_number=prov.get("section"),
        page=prov.get("page"),
        sub_clauses=prov.get("sub_clauses", []),
        examples=prov.get("examples", []),
        summary=(cur_entry or {}).get("summary"),
        plain_english=(cur_entry or {}).get("plain_english"),
        keywords=(cur_entry or {}).get("keywords", []),
        legal_topics=(cur_entry or {}).get("legal_topics", []),
        related=(cur_entry or {}).get("related", []),
        cross_references=law_entry.get("cross_references", []),
        doctrines=(cur_entry or {}).get("doctrines"),
        use_cases=(cur_entry or {}).get("use_cases"),
        important_concepts=(cur_entry or {}).get("important_concepts"),
    )


@app.post("/laws/{law_id}/provisions/{provision_number}/enrich", response_model=ProvisionEnrichResponse)
def enrich_provision(law_id: str, provision_number: str, body: ProvisionEnrichRequest = ProvisionEnrichRequest()):
    """On-demand Nemotron enrichment for doctrines, use_cases, important_concepts.
    Results are cached into curated.json so subsequent calls are instant."""
    req_start = time.perf_counter()
    logger.info("[POST /laws/%s/provisions/%s/enrich] request | force=%s", law_id, provision_number, body.force)

    if not MASTER_INDEX:
        raise HTTPException(503, "Master index not loaded")
    law_entry = next((l for l in MASTER_INDEX["laws"] if l["id"] == law_id), None)
    if not law_entry:
        raise HTTPException(404, f"Law '{law_id}' not found")
    data = PER_LAW_INDEXES.get(law_id)
    if not data:
        raise HTTPException(404, f"Law '{law_id}' data not loaded")
    corpus = data["corpus"]
    prov = _get_provision(data, provision_number)
    if not prov:
        raise HTTPException(404, f"Provision {provision_number} not found in {law_id}")

    curated_data = data.get("curated", {})
    curated_list = curated_data.get("curated", [])
    cur_entry = next((c for c in curated_list if c.get("provision_number") == provision_number), None)

    has_enrichment = cur_entry and (cur_entry.get("doctrines") or cur_entry.get("use_cases") or cur_entry.get("important_concepts"))
    if has_enrichment and not body.force:
        logger.info("[POST /laws/%s/provisions/%s/enrich] cache hit | returning cached", law_id, provision_number)
        return ProvisionEnrichResponse(
            law_id=law_id,
            provision_number=provision_number,
            doctrines=cur_entry.get("doctrines"),
            use_cases=cur_entry.get("use_cases"),
            important_concepts=cur_entry.get("important_concepts"),
            model_used=LLM_MODEL,
            cached=True,
        )

    provision_label = corpus.get("provision_label", "Section")
    full_text = prov.get("full_text", "") or ""
    title = prov.get("title", "")
    summary = (cur_entry or {}).get("summary", "")
    law_label = data["label"]

    prompt = f"""You are an expert Indian legal scholar. Analyze the following statutory provision and provide three things in plain English:

1. **Doctrines**: What legal doctrines or principles does this provision establish or relate to?
2. **Use Cases**: In what real-world legal situations would this provision be invoked? Give 2-3 specific examples.
3. **Important Concepts**: What are the key legal concepts or definitions a law student or practitioner must understand from this provision?

Be concise (2-3 sentences each). Use plain English, not legalese.

Law: {law_label}
{provision_label} {provision_number}: {title}
{summary}
Full text: {full_text[:3000]}"""

    messages = [
        {"role": "system", "content": "You are an expert Indian legal scholar. Respond only with the three sections requested, clearly labeled."},
        {"role": "user", "content": prompt},
    ]

    t_llm = time.perf_counter()
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1024,
        )
        raw = completion.choices[0].message.content or ""
        elapsed = time.perf_counter() - t_llm
        logger.info("[enrich] ← NVIDIA | elapsed=%.3fs | len=%d", elapsed, len(raw))
    except Exception as e:
        elapsed = time.perf_counter() - t_llm
        logger.error("[enrich] ← NVIDIA ERROR after %.3fs | %s", elapsed, e)
        raise HTTPException(502, f"LLM enrichment failed: {e}")

    doctrines = ""
    use_cases = ""
    important_concepts = ""

    for section in raw.split("\n"):
        lower = section.lower().strip()
        if lower.startswith("**doctrines") or lower.startswith("1.") or lower.startswith("doctrines:"):
            doctrines = section.split(":", 1)[-1].strip().strip("*") if ":" in section else section.strip().strip("*").split(".", 1)[-1].strip()
        elif lower.startswith("**use cases") or lower.startswith("2.") or lower.startswith("use cases:"):
            use_cases = section.split(":", 1)[-1].strip().strip("*") if ":" in section else section.strip().strip("*").split(".", 1)[-1].strip()
        elif lower.startswith("**important") or lower.startswith("3.") or lower.startswith("important concepts:"):
            important_concepts = section.split(":", 1)[-1].strip().strip("*") if ":" in section else section.strip().strip("*").split(".", 1)[-1].strip()

    if not doctrines and not use_cases and not important_concepts:
        parts = raw.split("\n\n")
        if len(parts) >= 3:
            doctrines = parts[0].strip().strip("*").split(".", 1)[-1].strip()
            use_cases = parts[1].strip().strip("*").split(".", 1)[-1].strip()
            important_concepts = parts[2].strip().strip("*").split(".", 1)[-1].strip()
        elif len(parts) == 2:
            doctrines = parts[0].strip()
            use_cases = parts[1].strip()

    if cur_entry:
        cur_entry["doctrines"] = doctrines
        cur_entry["use_cases"] = use_cases
        cur_entry["important_concepts"] = important_concepts
    else:
        new_entry = {
            "provision_number": provision_number,
            "summary": f"{provision_label} {provision_number}: {title}",
            "plain_english": full_text[:500] if full_text else f"{provision_label} {provision_number}",
            "keywords": [],
            "legal_topics": [],
            "related": [],
            "doctrines": doctrines,
            "use_cases": use_cases,
            "important_concepts": important_concepts,
        }
        curated_list.append(new_entry)
        curated_data["curated"] = curated_list

    curated_path = DATA_DIR / law_id / "curated.json"
    try:
        curated_path.write_text(json.dumps(curated_data, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("[enrich] cached to %s", curated_path)
    except Exception as e:
        logger.error("[enrich] cache write error: %s", e)

    total_elapsed = time.perf_counter() - req_start
    logger.info("[enrich] done | total_elapsed=%.3fs", total_elapsed)

    return ProvisionEnrichResponse(
        law_id=law_id,
        provision_number=provision_number,
        doctrines=doctrines,
        use_cases=use_cases,
        important_concepts=important_concepts,
        model_used=LLM_MODEL,
        cached=False,
    )


@app.post("/ask/routed")
async def ask_routed(body: RoutedAskRequest):
    req_start = time.perf_counter()
    logger.info("─" * 80)
    logger.info("[POST /ask/routed] request | law_ids=%s | question=%r | top_k=%d",
                body.law_ids, _truncate(body.question, 160), body.top_k)

    if not body.law_ids:
        raise HTTPException(400, "At least one law_id is required")
    invalid = [lid for lid in body.law_ids if lid not in PER_LAW_INDEXES]
    if invalid:
        raise HTTPException(404, f"Laws not loaded: {invalid}")

    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, per_law_retrieve, lid, body.question, body.top_k)
             for lid in body.law_ids]
    per_law_results = await asyncio.gather(*tasks)
    all_results = []
    for lid, results in zip(body.law_ids, per_law_results):
        data = PER_LAW_INDEXES[lid]
        for r in results:
            all_results.append({
                "law_id": lid,
                "law_label": data["label"],
                "provision_number": r["provision_number"],
                "title": r["title"],
                "page": r["page"],
                "score": r["score"],
            })
    all_results.sort(key=lambda x: -x["score"])
    top = all_results[:body.top_k]

    context_parts = []
    for r in top:
        data = PER_LAW_INDEXES[r["law_id"]]
        pnl = data["provision_label"]
        prov = _get_provision(data, r["provision_number"])
        text = prov.get("full_text") or "" if prov else ""
        context_parts.append(
            f"{r['law_label']} {pnl} {r['provision_number']} — {r['title']}\n{text[:2000]}"
        )
    context = "\n\n".join(context_parts)

    messages = [
        {"role": "system", "content": (
            "You are an expert Indian legal assistant. Answer concisely under 2000 characters.\n"
            "Use this structure:\n"
            "- **Summary** (1-2 sentences)\n"
            "- **Your Rights** (bullet list)\n"
            "- **Relevant Laws** (table: Act | Section | What it says — include 3-7 laws when multiple apply)\n"
            "- **Steps to Take** (max 5)\n"
            "Cite Act name + Section number. Never repeat a section. "
            "For multi-domain matters, cite from ALL relevant domains (criminal, civil, contractual). "
            "End with: 'This is general legal information, not legal advice. Consult a lawyer for your specific situation.'"
        )},
        {"role": "user", "content": f"Question: {body.question}\n\nRelevant provisions:\n{context}"},
    ]

    logger.info("[POST /ask/routed] → NVIDIA | law_ids=%s | top=%d | context_chars=%d",
                body.law_ids, len(top), len(context))
    t_llm = time.perf_counter()
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0,
            max_tokens=4096,
        )
        answer = completion.choices[0].message.content or ""
        elapsed = time.perf_counter() - t_llm
        logger.info("[POST /ask/routed] ← NVIDIA | elapsed=%.3fs | answer_len=%d",
                    elapsed, len(answer))
    except Exception as e:
        elapsed = time.perf_counter() - t_llm
        logger.error("[POST /ask/routed] ← NVIDIA | ERROR after %.3fs | %s", elapsed, e)
        answer = f"Error: {str(e)}"

    logger.info("[POST /ask/routed] done | total_elapsed=%.3fs",
                time.perf_counter() - req_start)
    logger.info("─" * 80)

    return {
        "question": body.question,
        "ai_answer": answer,
        "law_ids": body.law_ids,
        "results": top,
        "total_found": len(all_results),
        "model_used": LLM_MODEL,
    }


@app.get("/stats")
def stats():

    per_law = {}
    total_provisions = 0
    for lid, data in PER_LAW_INDEXES.items():
        provisions = data["corpus"].get("provisions", [])
        n = len(provisions)
        total_provisions += n
        per_law[lid] = {
            "label": data["label"],
            "domain": data["domain"],
            "provisions": n,
            "vectors": data["index"].ntotal,
        }

    return {
        "total_laws": len(PER_LAW_INDEXES),
        "total_provisions": total_provisions,
        "per_law": per_law,
        "embedding_model": EMBED_MODEL_NAME,
        "reranker": "cross-encoder/ms-marco-MiniLM-L-12-v2",
        "llm": LLM_MODEL,
        "external_sources": ["Indian Kanoon (api.indiankanoon.org)"],
        "index_type": "per_law_faiss_with_reranker",
    }
