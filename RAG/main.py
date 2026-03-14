import json
import re
import html
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
    text = re.sub(r"<[^>]+>", "", raw)
    return html.unescape(text).strip()


def build_case_summary(raw_html: str, title: str) -> str:
    """Generate a detailed, structured summary of a full judgment using Bytez."""
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

    result = llm.run(messages, {"temperature": 0})
    if result.error:
        raise HTTPException(500, str(result.error))

    output = result.output
    summary = output.get("content", str(output)) if isinstance(output, dict) else str(output)
    return summary.strip()


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
        model_used=BYTEZ_MODEL,
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

    result = llm.run(messages, {"temperature": 0})
    if result.error:
        raise HTTPException(500, str(result.error))

    output = result.output.get("content", str(result.output)) if isinstance(result.output, dict) else str(result.output)
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
        model_used=BYTEZ_MODEL,
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
        "model_used": BYTEZ_MODEL,
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
    result = llm.run(messages, {"temperature": 0})
    if result.error:
        raise HTTPException(500, str(result.error))
    output = result.output
    answer = output.get("content", str(output)) if isinstance(output, dict) else str(output)
    return CaseAskResponse(
        question=body.question,
        section_heading=body.section_text[:80].rstrip() + "...",
        ai_answer=answer,
        model_used=BYTEZ_MODEL,
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