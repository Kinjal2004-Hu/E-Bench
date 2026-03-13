# ⚖️ BNS 2023 RAG FastAPI

A lightweight **Retrieval-Augmented Generation (RAG)** API built in Python for querying the **Bharatiya Nyaya Sanhita, 2023** — India's new criminal code. Query any incident, get back the relevant section numbers and punishment details instantly.

---

## Architecture

```
BNS2023.pdf
    │
    ▼
pdfplumber  ──►  Section Extractor  ──►  343 sections parsed
                                              │
                                        TF-IDF Index
                                              │
                                        FastAPI endpoints
                                              │
                                        JSON responses
```

**No heavy ML/GPU required.** Uses TF-IDF retrieval with punishment clause extraction.

---

## Setup

```bash
# 1. Clone / place files
mkdir bns_rag && cd bns_rag
# Copy main.py, requirements.txt, and BNS2023.pdf here

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
BNS_PDF_PATH=./BNS2023.pdf uvicorn main:app --reload --port 8000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | HTML landing page |
| GET | `/query?q=...` | **Main RAG search** — natural language query |
| GET | `/section/{number}` | Full text of a specific section |
| GET | `/sections?keyword=...` | List/filter sections |
| GET | `/punishment?offense=...` | Punishment for a specific offence |
| GET | `/stats` | Index statistics |
| GET | `/docs` | Swagger UI |

---

## Example Queries

### 1. Search for murder punishment
```
GET /query?q=punishment+for+murder
```
```json
{
  "query": "punishment for murder",
  "results": [
    {
      "section_number": 103,
      "title": "(1) Whoever commits murder shall be punished with death or",
      "snippet": "…Whoever commits murder shall be punished with death or imprisonment for life…",
      "punishment_summary": "shall be punished with death or imprisonment for life, and shall also be liable to fine.",
      "page": 162,
      "score": 0.312
    }
  ],
  "answer_summary": "Most relevant: Section 103 — Punishment: shall be punished with death or imprisonment for life..."
}
```

### 2. Get section 64 (Rape punishment)
```
GET /section/64
```
```json
{
  "section_number": 64,
  "title": "(1) Whoever, except in the cases provided for in sub-section...",
  "full_text": "64. (1) Whoever...commits rape, shall be punished with rigorous imprisonment...not less than ten years...",
  "punishment_summary": "shall be punished with rigorous imprisonment...not less than ten years, but which may extend to imprisonment for life",
  "page": 92
}
```

### 3. Punishment for theft
```
GET /punishment?offense=theft
```

### 4. Search rape section number
```
GET /query?q=rape+section+number
```

### 5. List all murder-related sections
```
GET /sections?keyword=murder&limit=10
```

---

## Query Tips

- Use natural language: `"dowry death punishment"`, `"organised crime penalty"`
- Search by crime type: `"kidnapping"`, `"robbery"`, `"fraud"`, `"assault"`
- Search by punishment type: `"death penalty sections"`, `"life imprisonment offences"`
- Use `/punishment?offense=...` for quick punishment lookup

---

## Index Stats

- **343 sections** indexed from BNS 2023
- Sections **1–358** covered
- All punishment clauses auto-extracted
- First request may take ~5 seconds (PDF parsing); subsequent requests are instant from cache

---

## Files

```
bns_rag/
├── main.py           # FastAPI app with RAG logic
├── requirements.txt  # Python dependencies
├── README.md         # This file
└── BNS2023.pdf       # Place your PDF here (or set BNS_PDF_PATH env var)
```