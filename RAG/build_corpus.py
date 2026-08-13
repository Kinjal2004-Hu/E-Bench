"""
Per-PDF corpus extraction for the E-Bench RAG system.

For each registered law PDF, extracts a structured corpus.json with the
following per-provision shape (one of two schemas):

  Constitution:
    {
      "number": "21",
      "part": "III",
      "title": "Protection of life and personal liberty",
      "full_text": "...",
      "page": 18,
      "clause": null   # OR {"id": "1", "text": "..."} for sub-clauses
    }

  Acts (default + every other strategy):
    {
      "number": "73",
      "chapter": "V",
      "title": "Compensation for loss or damage caused by breach of contract",
      "full_text": "...",
      "page": 36
    }

The 5 parser strategies:
  - default_numbered          : NN. Title pattern (BNS, RERA, IT Act, etc.)
  - old_act_multiline         : NN. Title may wrap to next lines (ICA 1872, TPA 1882)
  - constitution_with_parts   : Articles with PART/CHAPTER context
  - multi_act_compilation     : Many Acts in one PDF (Labour & Employment)
  - rules_with_inline_clauses : N.(N) Title pattern (GDR Rules)

Run from RAG/:
    python build_corpus.py
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

RAG_DIR = Path(__file__).parent
PDF_DIR = RAG_DIR / "PDFs"
DATA_DIR = RAG_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


# (law_id, label, domain, pdf_filename, strategy, provision_label, has_schedules)
LAW_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "constitution",
        "label": "Constitution of India",
        "domain": "Constitutional Law",
        "pdf": "ConstitutionOfIndia.pdf",
        "strategy": "constitution_with_parts",
        "provision_label": "Article",
        "has_schedules": True,
    },
    {
        "id": "ica_1872",
        "label": "Indian Contract Act, 1872",
        "domain": "Contract Law",
        "pdf": "Indian Contract Act, 1872.pdf",
        "strategy": "old_act_multiline",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "tpa_1882",
        "label": "Transfer of Property Act, 1882",
        "domain": "Property Law",
        "pdf": "Transfer of Property Act, 1882.pdf",
        "strategy": "old_act_multiline",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "sra_1963",
        "label": "Specific Relief Act, 1963",
        "domain": "Civil Remedies",
        "pdf": "Specific Relief Act, 1963.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "cpa_2019",
        "label": "Consumer Protection Act, 2019",
        "domain": "Consumer Law",
        "pdf": "Consumer Protection Act, 2019.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "it_act_2000",
        "label": "Information Technology Act, 2000",
        "domain": "Cyber Law",
        "pdf": "Information Technology Act, 2000.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "family_laws",
        "label": "Family Courts Act, 1984",
        "domain": "Family Law",
        "pdf": "Family Laws.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "labour_employment",
        "label": "Labour & Employment Laws",
        "domain": "Labour Law",
        "pdf": "Labour & Employment Laws.pdf",
        "strategy": "multi_act_compilation",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "rera",
        "label": "Real Estate (Regulation and Development) Act, 2016",
        "domain": "Real Estate Law",
        "pdf": "the_real_estate_(regulation_and_development)_act,_2016.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "taxation",
        "label": "Income Tax Act, 1961",
        "domain": "Tax Law",
        "pdf": "Taxation.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "corporate",
        "label": "Companies Act, 2013",
        "domain": "Corporate Law",
        "pdf": "CorporateLaws.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "securities",
        "label": "Securities Laws",
        "domain": "Corporate Law",
        "pdf": "SecurityLaw.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "motor_vehicles",
        "label": "Motor Vehicles Act",
        "domain": "Transport Law",
        "pdf": "MotorVehicleAct.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": True,
    },
    {
        "id": "bns_2023",
        "label": "Bharatiya Nyaya Sanhita, 2023",
        "domain": "Criminal Law",
        "pdf": "BNS2023.pdf",
        "strategy": "gazette_two_column",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "bnss_2023",
        "label": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "domain": "Criminal Procedure",
        "pdf": "BNSS2023.pdf",
        "strategy": "gazette_two_column",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "bsa_2023",
        "label": "Bharatiya Sakshya Adhiniyam, 2023",
        "domain": "Evidence Law",
        "pdf": "BSA2023.pdf",
        "strategy": "gazette_two_column",
        "provision_label": "Section",
        "has_schedules": False,
    },
    {
        "id": "gdr_rules_2014",
        "label": "Companies (Issue of Global Depository Receipts) Rules, 2014",
        "domain": "Corporate Law",
        "pdf": "GLOBALDEPOSITORY.pdf",
        "strategy": "rules_with_inline_clauses",
        "provision_label": "Rule",
        "has_schedules": False,
    },
    {
        "id": "dv_act_2005",
        "label": "Protection of Women from Domestic Violence Act, 2005",
        "domain": "Family Law",
        "pdf": "Protection of Women Laws.pdf",
        "strategy": "default_numbered",
        "provision_label": "Section",
        "has_schedules": False,
    },
]


# ============================================================
#  Shared text utilities
# ============================================================

OMITTED_RE = re.compile(r"\[(Omitted|Repealed|Substituted)\b[^\]]*\]", re.IGNORECASE)
SECTION_HEADER_RE = re.compile(r"^(\d{1,4}[A-Z]?)\.\s+(.+)$")
CONSTITUTION_HEADER_RE = re.compile(r"^(\d{1,4}[A-Z]?)\.\s+(.+)$")  # same form, different chapter/part logic
PART_RE = re.compile(r"^PART\s+([IVXLCM]+)\s*$", re.IGNORECASE)
CHAPTER_RE = re.compile(r"^CHAPTER\s+([IVXLCM0-9A-Z]+)\s*$", re.IGNORECASE)
ACT_HEADING_RE = re.compile(
    r"^(?:THE\s+)?([A-Z][A-Za-z &\-,()]+(?:ACT|RULES?)[, ]+\d{4})\s*$",
    re.IGNORECASE,
)
RULES_INLINE_CLAUSE_RE = re.compile(r"^(\d{1,3})\.\((\d+)\)\s+(.+)$")


def is_continuation_line(line: str) -> bool:
    """Heuristic: a line that is part of a title or sub-item from an older Act.

    Continuation lines:
      - Start with a Capitalized word and end without a period
      - OR are short single-word lines like 'Extent.' 'Commencement.' 'Saving.'
      - OR are in the body and don't match a section header
    """
    s = line.strip()
    if not s:
        return False
    if SECTION_HEADER_RE.match(s):
        return False
    if OMITTED_RE.search(s):
        return False
    if len(s) <= 30 and s[0].isupper() and not s.endswith("."):
        return True
    if len(s) <= 40 and s.endswith(".") and s[0].isupper() and not s[0:2].isupper():
        return True
    return False


# ============================================================
#  Strategy 6: gazette_two_column (BNS / BNSS / BSA gazettes)
# ============================================================

# Government gazette PDFs (e.g., BNS2023.pdf) use a two-column layout:
#   - LEFT margin  (x0 < ~114) holds the section TITLE, wrapped over several
#     short lines aligned vertically.
#   - RIGHT column (x0 >= ~118) holds "NN. <body text>".
# The body text has NO space glyphs — words are separated only by a slightly
# wider gap between characters. We reconstruct words from character x-gaps:
#   - intra-word gaps are tiny  (~0.0 – 0.7)
#   - word-boundary gaps are larger (~0.95 – 3.8)
# A gap threshold of 0.8 cleanly separates the two distributions.
GAZETTE_MARGIN_X = 115.0   # chars with x0 < this are left margin/title
GAZETTE_BODY_X = 116.0     # chars with x0 >= this are body text (body lines start at x0=117.6)
GAZETTE_TITLE_RIGHT_X = 482.0  # chars with x0 > this are right margin/title (booklet outer edge; body wraps to x1 ~478)
GAZETTE_WORD_GAP = 0.8     # char gap > this => word boundary


def gazette_reconstruct_words(chars) -> str:
    """Rebuild words from character x-positions, inserting a space where the
    gap between consecutive characters exceeds GAZETTE_WORD_GAP."""
    chars = sorted(chars, key=lambda c: c["x0"])
    if not chars:
        return ""
    out = []
    cur = chars[0]["text"]
    prev_x1 = chars[0]["x1"]
    for c in chars[1:]:
        if c["x0"] - prev_x1 > GAZETTE_WORD_GAP:
            out.append(cur)
            cur = c["text"]
        else:
            cur += c["text"]
        prev_x1 = c["x1"]
    out.append(cur)
    return " ".join(out).strip()


GAZETTE_SECTION_RE = re.compile(r"^(\d{1,3}[A-Z]?)\.\s*(.*)$")
GAZETTE_CHAPTER_RE = re.compile(r"^CHAPTER\s+([IVXLCM0-9A-Z]+)\s*$", re.IGNORECASE)
GAZETTE_GAZETTE_RE = re.compile(r"THE\s+GAZETTE\s+OF\s+INDIA", re.IGNORECASE)
# Footnote act-citations printed alone in the margin column (e.g. "30 of 2019.",
# "2 of 2016.", "10 of 2017."). They are NOT part of section titles.
GAZETTE_CITATION_RE = re.compile(r"^\d{1,3}\s+of\s+\d{4}\.?\s*$")


def parse_gazette_two_column(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """NN. Title with margin title column(s) + squished body (BNS/BNSS/BSA).

    The gazette is laid out as a booklet: each page has a body column
    (x0 in [118, ~460]) and a title margin column on the OUTER edge — on the
    LEFT (x0 < 114) for even pages and on the RIGHT (x0 > 460) for odd pages.
    For each visual line we split chars into title vs body columns, then
    reconstruct words in each from char gaps. The title column accumulates the
    current section's title; body lines accumulate its text. A body line
    starting with 'NN.' begins a new section.
    """
    provisions: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None
    current_chapter: Optional[str] = None
    title_buf: List[str] = []
    body_buf: List[str] = []
    pending: Optional[str] = None
    pending_top: Optional[float] = None

    def flush() -> None:
        nonlocal current, title_buf, body_buf, pending, pending_top
        if pending is not None:
            title_buf.append(pending)
            pending = None
            pending_top = None
        if current is not None:
            current["title"] = clean_title(" ".join(title_buf))
            current["full_text"] = " ".join(body_buf).strip()
            if current.get("number"):
                provisions.append(current)
        current = None
        title_buf = []
        body_buf = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            chars = [c for c in (page.chars or []) if c.get("text", "").strip()]
            if not chars:
                continue

            # Group chars into visual lines by their vertical position.
            # Round to the nearest integer so a margin title line that sits
            # <1pt away from its section header (e.g. "Grievous hurt." at
            # top=513.5 vs "116." at 513.9) merges into the same group.
            lines: Dict[float, List[dict]] = {}
            for c in chars:
                key = round(c["top"])
                lines.setdefault(key, []).append(c)

            for top in sorted(lines):
                grp = sorted(lines[top], key=lambda c: c["x0"])
                left_margin = [c for c in grp if c["x0"] < GAZETTE_MARGIN_X]
                body = [c for c in grp if GAZETTE_BODY_X <= c["x0"] <= GAZETTE_TITLE_RIGHT_X]
                right_margin = [c for c in grp if c["x0"] > GAZETTE_TITLE_RIGHT_X]

                # Title = whichever margin column is populated (outer edge).
                mtext = gazette_reconstruct_words(left_margin) or gazette_reconstruct_words(right_margin)
                btext = gazette_reconstruct_words(body)

                # Skip pure footnote act-citations in the margin column.
                if mtext and GAZETTE_CITATION_RE.match(mtext):
                    mtext = ""

                # Skip page headers / footers.
                if GAZETTE_GAZETTE_RE.search(btext):
                    continue
                if btext and all(ch in "_-~ " for ch in btext):
                    continue
                if not mtext and not btext:
                    continue

                # Chapter heading (in body column).
                if btext and GAZETTE_CHAPTER_RE.match(btext):
                    flush()
                    current_chapter = f"CHAPTER {GAZETTE_CHAPTER_RE.match(btext).group(1).upper()}"
                    continue

                # Section header: body line starts with 'NN.'
                m = GAZETTE_SECTION_RE.match(btext) if btext else None
                if m and not re.match(r"^\d{4}", m.group(1)):
                    # A pending margin title sitting just above this header
                    # (e.g. "Stalking." at top=125 vs "78." at top=129)
                    # belongs to the NEW section, not the previous one.
                    prev_pending = None
                    if pending is not None and pending_top is not None and (top - pending_top) <= 8:
                        prev_pending = pending
                        pending = None
                        pending_top = None
                    flush()
                    current = {
                        "number": m.group(1),
                        "chapter": current_chapter,
                        "title": "",
                        "full_text": "",
                        "page": page_num + 1,
                    }
                    title_buf = []
                    if prev_pending:
                        title_buf.append(prev_pending)
                    if mtext:
                        title_buf.append(mtext)
                    body_buf = [m.group(2)] if m.group(2) else []
                    continue

                if current is not None:
                    if btext:
                        # Body line: any pending margin title flushes to the
                        # current section's title.
                        if pending is not None:
                            title_buf.append(pending)
                            pending = None
                            pending_top = None
                        body_buf.append(btext)
                    elif mtext:
                        # Margin-only line: the title is often offset a couple
                        # of points from its section header (e.g. "Stalking."
                        # at top=125 vs "78." at top=129). Hold it as pending;
                        # if the next line is a section header, the new section
                        # claims this title instead.
                        if pending is not None:
                            pending += " " + mtext
                        else:
                            pending = mtext
                            pending_top = top
                    # else: neither body nor margin (skipped earlier).

    flush()
    return [p for p in provisions if p.get("title") and p.get("number")]


def clean_title(title: str) -> str:
    """Strip trailing [Omitted.] markers, footnote citations, normalise whitespace."""
    t = (title or "").strip()
    t = OMITTED_RE.sub("", t)
    # Drop embedded footnote act-citations like "2 of 2016." / "30 of 2019."
    t = re.sub(r"\b\d{1,3}\s+of\s+\d{4}\.?", "", t)
    t = re.sub(r"\s+", " ", t).strip(" .,-:")
    return t or "(untitled)"


def looks_omitted(title: str, body: str) -> bool:
    return bool(OMITTED_RE.search(title) or OMITTED_RE.search(body[:200]))


# ----- Title quality filters ----------------------------------------

# Reject "N. Title" matches where the "title" is obviously body text, not
# a real section title. Real titles are short, capitalized, end with a period
# or a noun phrase. Body-text false positives have these signatures:
#   - very long (> 200 chars)
#   - start with a lowercase letter
#   - contain clause markers like "(1)" or "(a)" early on
#   - contain multiple sentences (full stop followed by capital)
#   - end with verbs/adverbs (ing, tion in middle of long text)
TITLE_MAX_LEN = 200


def is_plausible_title(title: str) -> bool:
    if not title or len(title) > TITLE_MAX_LEN:
        return False
    t = title.strip()
    if not t[0].isupper():
        return False
    # Reject if title contains a clause marker early on
    if re.match(r"^\(\d+\)|^Section\s+\d+|^Article\s+\d+", t, re.IGNORECASE):
        return False
    # Reject footnote / amendment text (no real section title starts with these)
    FOOTNOTE_MARKERS = (
        r"^Ins\.?\s+by\b",
        r"^Subs\.?\s+by\b",
        r"^Added\s+by\b",
        r"^Inserted\s+by\b",
        r"^Substituted\s+by\b",
        r"^Omitted\s+by\b",
        r"^Notification\s+No\.?",
        r"^G\.?S\.?R\.?\s+",
        r"^vide\s+(Notification|Act|Section|Ordinance)",
        r"^w\.?e\.?f\.?\s+",
    )
    for pat in FOOTNOTE_MARKERS:
        if re.match(pat, t, re.IGNORECASE):
            return False
    if re.search(r"\bG\.S\.R\.\s*\d+", t, re.IGNORECASE):
        return False
    # Reject if title contains a body-text sentence pattern
    # Multiple sentences: "Foo. Bar" — reject
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", t)
    if len(sentences) > 2:
        return False
    # Reject very short single-word or fragment titles (likely table rows or body fragments)
    if len(t.split()) <= 1:
        return False
    return True


def is_new_section_candidate(line: str) -> bool:
    """Check whether a line is plausibly a new section header (vs. body text)."""
    s = line.strip()
    if not s:
        return False
    # Must match the section header pattern
    m = SECTION_HEADER_RE.match(s)
    if not m:
        return False
    title = m.group(2)
    if not is_plausible_title(title):
        return False
    return True


# ============================================================
#  Strategy 1: default_numbered
# ============================================================

def parse_default_numbered(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """NN. Title — clean modern Acts (BNS, RERA, SRA, CPA, IT, Family, etc.)."""
    provisions: List[Dict[str, Any]] = []
    current_chapter: Optional[str] = None
    current: Optional[Dict[str, Any]] = None
    text_buf: List[str] = []
    page_of: Dict[str, int] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            raw = page.extract_text() or ""
            if not raw:
                continue
            for line in raw.split("\n"):
                line_stripped = line.strip()
                if not line_stripped:
                    text_buf.append("")
                    continue

                chap_m = CHAPTER_RE.match(line_stripped)
                if chap_m and len(line_stripped) < 80:
                    current_chapter = f"CHAPTER {chap_m.group(1).upper()}"
                    continue

                if is_new_section_candidate(line_stripped) and not RULES_INLINE_CLAUSE_RE.match(line_stripped):
                    m = SECTION_HEADER_RE.match(line_stripped)
                    if current is not None:
                        full_text = " ".join(t for t in text_buf if t).strip()
                        current["full_text"] = full_text
                        provisions.append(current)
                    number = m.group(1)
                    title = clean_title(m.group(2))
                    current = {
                        "number": number,
                        "chapter": current_chapter,
                        "title": title,
                        "full_text": "",
                        "page": page_of.get(number, page_num + 1),
                    }
                    page_of[number] = page_num + 1
                    text_buf = []
                else:
                    text_buf.append(line)

            if current is not None and not current.get("page"):
                current["page"] = page_num + 1

    if current is not None:
        current["full_text"] = " ".join(t for t in text_buf if t).strip()
        provisions.append(current)

    return [p for p in provisions if p.get("title") and p.get("number")]


# ============================================================
#  Strategy 2: old_act_multiline
# ============================================================

def parse_old_act_multiline(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """NN. Title may wrap onto next lines (Indian Contract Act 1872, TPA 1882).

    Lines that don't match a section header AND look like title fragments are
    appended to the current section's body/title.
    """
    provisions: List[Dict[str, Any]] = []
    current_chapter: Optional[str] = None
    current: Optional[Dict[str, Any]] = None
    text_buf: List[str] = []
    page_of: Dict[str, int] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            raw = page.extract_text() or ""
            if not raw:
                continue
            for line in raw.split("\n"):
                line_stripped = line.strip()
                if not line_stripped:
                    text_buf.append("")
                    continue

                if re.match(r"^PREAMBLE\s*$", line_stripped, re.IGNORECASE):
                    continue

                chap_m = CHAPTER_RE.match(line_stripped)
                if chap_m and len(line_stripped) < 100:
                    current_chapter = f"CHAPTER {chap_m.group(1).upper()}"
                    continue

                if is_new_section_candidate(line_stripped):
                    m = SECTION_HEADER_RE.match(line_stripped)
                    if current is not None:
                        full_text = " ".join(t for t in text_buf if t).strip()
                        current["full_text"] = full_text
                        provisions.append(current)
                    number = m.group(1)
                    title = clean_title(m.group(2))
                    current = {
                        "number": number,
                        "chapter": current_chapter,
                        "title": title,
                        "full_text": "",
                        "page": page_of.get(number, page_num + 1),
                    }
                    page_of[number] = page_num + 1
                    text_buf = []
                else:
                    text_buf.append(line)

    if current is not None:
        current["full_text"] = " ".join(t for t in text_buf if t).strip()
        provisions.append(current)

    return [p for p in provisions if p.get("title") and p.get("number")]


# ============================================================
#  Strategy 3: constitution_with_parts
# ============================================================

def parse_constitution_with_parts(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """Constitution of India — Articles, with PART/CHAPTER context.

    The Constitution uses 'NNN. Title' for Articles (e.g., '301. Freedom of
    trade...'). PART headings appear on their own line (e.g., 'PART XII').
    Schedule headings appear as 'THE FIRST SCHEDULE', 'THE SECOND SCHEDULE' etc.

    We skip the 'ARRANGEMENT OF ARTICLES' index pages at the start and only
    capture Articles once the actual Constitution body begins.
    """
    provisions: List[Dict[str, Any]] = []
    current_part: Optional[str] = None
    current: Optional[Dict[str, Any]] = None
    text_buf: List[str] = []
    in_body = False  # only start capturing once we see 'WE, THE PEOPLE' or first PART
    seen_articles: set = set()  # dedupe — Article 1 may be referenced multiple times

    def flush_current() -> None:
        nonlocal current
        if current is not None:
            full_text = " ".join(t for t in text_buf if t).strip()
            current["full_text"] = full_text
            if not looks_omitted(current["title"], full_text):
                provisions.append(current)
        current = None
        text_buf.clear()

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            raw = page.extract_text() or ""
            if not raw:
                continue

            for line in raw.split("\n"):
                line_stripped = line.strip()
                if not line_stripped:
                    text_buf.append("")
                    continue

                if not in_body:
                    if re.search(r"WE,?\s+THE\s+PEOPLE", line_stripped, re.IGNORECASE) or \
                       re.match(r"^PART\s+[IVXLCM]+\b", line_stripped, re.IGNORECASE) or \
                       re.search(r"shall\s+secure\s+to\s+all\s+its\s+citizens", line_stripped, re.IGNORECASE):
                        in_body = True

                if re.match(r"^(ARRANGEMENT\s+OF\s+ARTICLES|ARTICLES|APPENDIX)\b",
                            line_stripped, re.IGNORECASE):
                    continue

                if re.match(r"^PART\s+([IVXLCM]+)\b", line_stripped, re.IGNORECASE):
                    flush_current()
                    current_part = re.match(r"^PART\s+([IVXLCM]+)\b", line_stripped, re.IGNORECASE).group(1)
                    continue

                sched_m = re.match(
                    r"^(THE\s+(?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH))\s+SCHEDULE\s*$",
                    line_stripped, re.IGNORECASE,
                )
                if sched_m:
                    flush_current()
                    sched_name = sched_m.group(1).upper()
                    if sched_name not in seen_articles:
                        seen_articles.add(sched_name)
                        current = {
                            "number": f"SCHEDULE-{sched_name}",
                            "part": current_part,
                            "title": f"{sched_name} SCHEDULE",
                            "full_text": "",
                            "page": page_num + 1,
                        }
                    continue

                if is_new_section_candidate(line_stripped) and in_body:
                    m = SECTION_HEADER_RE.match(line_stripped)
                    flush_current()
                    number = m.group(1)
                    title = clean_title(m.group(2))
                    if looks_omitted(title, ""):
                        continue
                    if number in seen_articles:
                        continue
                    seen_articles.add(number)
                    current = {
                        "number": number,
                        "part": current_part,
                        "title": title,
                        "full_text": "",
                        "page": page_num + 1,
                    }
                else:
                    if in_body and current is not None:
                        text_buf.append(line)

    flush_current()
    return [p for p in provisions if p.get("title") and p.get("number")]


# ============================================================
#  Strategy 4: multi_act_compilation
# ============================================================

def parse_multi_act_compilation(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """A single PDF containing many Acts (Labour & Employment Laws).

    Each Act boundary is detected via the 'THE <NAME> ACT, <YEAR>' heading.
    The current Act's name becomes the 'act' prefix on each section. We also
    insert a synthetic 'header' entry at the start of each Act so retrieval
    can land on it.
    """
    provisions: List[Dict[str, Any]] = []
    current_act: Optional[str] = None
    current_chapter: Optional[str] = None
    current: Optional[Dict[str, Any]] = None
    text_buf: List[str] = []
    seen: set = set()

    def flush_current() -> None:
        nonlocal current
        if current is not None:
            full_text = " ".join(t for t in text_buf if t).strip()
            current["full_text"] = full_text
            if not looks_omitted(current["title"], full_text):
                provisions.append(current)
        current = None
        text_buf.clear()

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            raw = page.extract_text() or ""
            if not raw:
                continue

            for line in raw.split("\n"):
                line_stripped = line.strip()
                if not line_stripped:
                    text_buf.append("")
                    continue

                m_act = ACT_HEADING_RE.match(line_stripped)
                if m_act:
                    flush_current()
                    act_name = m_act.group(1).strip()
                    seen_acts = {p.get("act") for p in provisions if p.get("act")}
                    if act_name not in seen_acts:
                        current_act = act_name
                        current_chapter = None
                        seen.add(("ACT-HEADER", current_act))
                        provisions.append({
                            "number": "ACT-HEADER",
                            "chapter": None,
                            "act": current_act,
                            "title": f"{current_act} (Act header)",
                            "full_text": "",
                            "page": page_num + 1,
                        })
                    continue

                chap_m = CHAPTER_RE.match(line_stripped)
                if chap_m and len(line_stripped) < 100:
                    current_chapter = f"CHAPTER {chap_m.group(1).upper()}"
                    continue

                if is_new_section_candidate(line_stripped):
                    m = SECTION_HEADER_RE.match(line_stripped)
                    flush_current()
                    number = m.group(1)
                    title = clean_title(m.group(2))
                    if looks_omitted(title, ""):
                        continue
                    # dedupe within an act
                    key = (current_act, number)
                    if key in seen:
                        continue
                    seen.add(key)
                    current = {
                        "number": number,
                        "chapter": current_chapter,
                        "act": current_act,
                        "title": title,
                        "full_text": "",
                        "page": page_num + 1,
                    }
                else:
                    if current is not None:
                        text_buf.append(line)

    flush_current()
    return [p for p in provisions if p.get("title") and p.get("number")]


# ============================================================
#  Strategy 5: rules_with_inline_clauses
# ============================================================

def parse_rules_with_inline_clauses(pdf_path: Path, label: str) -> List[Dict[str, Any]]:
    """N.(N) Title pattern (GDR Rules 2014).

    Example: '1.(1) These Rules may be called Companies (Issue of GDR) Rules,
    2014.' — the (1) is a sub-clause marker, NOT the section title.

    We rewrite these as section header 'N.' + body '[(1)] <text>'.
    """
    provisions: List[Dict[str, Any]] = []
    current_chapter: Optional[str] = None
    current: Optional[Dict[str, Any]] = None
    text_buf: List[str] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            raw = page.extract_text() or ""
            if not raw:
                continue
            for line in raw.split("\n"):
                line_stripped = line.strip()
                if not line_stripped:
                    text_buf.append("")
                    continue

                chap_m = CHAPTER_RE.match(line_stripped)
                if chap_m and len(line_stripped) < 100:
                    current_chapter = f"CHAPTER {chap_m.group(1).upper()}"
                    continue

                m_inline = RULES_INLINE_CLAUSE_RE.match(line_stripped)
                if m_inline:
                    if current is not None:
                        current["full_text"] = " ".join(t for t in text_buf if t).strip()
                        provisions.append(current)
                    number = m_inline.group(1)
                    clause = m_inline.group(2)
                    rest = m_inline.group(3).strip()
                    current = {
                        "number": number,
                        "chapter": current_chapter,
                        "title": rest[:120].rstrip(" .") or f"Rule {number}",
                        "full_text": "",
                        "page": page_num + 1,
                    }
                    text_buf = [f"({clause}) {rest}"]
                    continue

                if is_new_section_candidate(line_stripped):
                    m = SECTION_HEADER_RE.match(line_stripped)
                    if current is not None:
                        current["full_text"] = " ".join(t for t in text_buf if t).strip()
                        provisions.append(current)
                    number = m.group(1)
                    title = clean_title(m.group(2))
                    current = {
                        "number": number,
                        "chapter": current_chapter,
                        "title": title,
                        "full_text": "",
                        "page": page_num + 1,
                    }
                    text_buf = []
                else:
                    text_buf.append(line)

    if current is not None:
        current["full_text"] = " ".join(t for t in text_buf if t).strip()
        provisions.append(current)

    return [p for p in provisions if p.get("title") and p.get("number")]


# ============================================================
#  Dispatcher
# ============================================================

STRATEGIES = {
    "default_numbered": parse_default_numbered,
    "old_act_multiline": parse_old_act_multiline,
    "constitution_with_parts": parse_constitution_with_parts,
    "multi_act_compilation": parse_multi_act_compilation,
    "rules_with_inline_clauses": parse_rules_with_inline_clauses,
    "gazette_two_column": parse_gazette_two_column,
}


def extract_law(law: Dict[str, Any]) -> Dict[str, Any]:
    pdf_path = PDF_DIR / law["pdf"]
    if not pdf_path.exists():
        return {
            "law_id": law["id"],
            "law_name": law["label"],
            "domain": law["domain"],
            "provision_label": law["provision_label"],
            "error": f"PDF not found: {pdf_path}",
            "provisions": [],
        }

    parser = STRATEGIES[law["strategy"]]
    t0 = time.perf_counter()
    provisions = parser(pdf_path, law["label"])
    elapsed = time.perf_counter() - t0

    return {
        "law_id": law["id"],
        "law_name": law["label"],
        "domain": law["domain"],
        "provision_label": law["provision_label"],
        "strategy": law["strategy"],
        "has_schedules": law.get("has_schedules", False),
        "pdf_path": law["pdf"],
        "provision_count": len(provisions),
        "extraction_seconds": round(elapsed, 2),
        "provisions": provisions,
    }


def main() -> None:
    summary: List[Dict[str, Any]] = []
    for law in LAW_REGISTRY:
        law_dir = DATA_DIR / law["id"]
        law_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n=== Extracting {law['id']} ({law['strategy']}) ===")
        corpus = extract_law(law)
        out = law_dir / "corpus.json"
        with open(out, "w", encoding="utf-8") as fp:
            json.dump(corpus, fp, ensure_ascii=False, indent=2)
        if "error" in corpus:
            print(f"  ERROR: {corpus['error']}")
        else:
            print(f"  {corpus['provision_count']} provisions extracted in {corpus['extraction_seconds']}s")
            print(f"  wrote {out}")
        summary.append({
            "id": law["id"],
            "label": law["label"],
            "domain": law["domain"],
            "provision_count": corpus.get("provision_count", 0),
            "strategy": law["strategy"],
            "extraction_seconds": corpus.get("extraction_seconds", 0),
            "error": corpus.get("error"),
        })

    summary_path = DATA_DIR / "_extraction_summary.json"
    with open(summary_path, "w", encoding="utf-8") as fp:
        json.dump(summary, fp, ensure_ascii=False, indent=2)
    print(f"\nSummary: {summary_path}")


if __name__ == "__main__":
    main()
