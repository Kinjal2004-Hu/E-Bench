# E-Bench — Digital Justice Platform

> AI-powered legal platform that gives every Indian citizen access to legal intelligence, verified lawyer consultations, and real-time case tools — in plain language.

India has over 40 million pending court cases. Most citizens cannot afford a lawyer for every question, do not know their basic rights, and cannot understand legal documents written in technical language. E-Bench bridges this gap by combining:

- **AI legal intelligence** built on 18 Indian statutes (BNS 2023, BNSS 2023, BSA 2023, Constitution of India, Companies Act 2013, IT Act 2000, Income Tax Act 1961, IPC, CRPC, Contract Act 1872, and more) via a per-law FAISS RAG pipeline + Nemotron-3 120B LLM.
- **Live lawyer consultations** via secured text chat and WebRTC video call.
- **Document-processing tools** that turn dense FIRs, chargesheets, and contracts into clear summaries and risk scores — in seconds.
- **Community legal forum** so citizens can learn from shared experiences.
- **Microlearning** modules to build ongoing legal literacy.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [RAG Pipeline — Per-Law FAISS Architecture](#rag-pipeline--per-law-faiss-architecture)
6. [Data Flow](#data-flow)
7. [Authentication & Security](#authentication--security)
8. [Real-Time Communication](#real-time-communication)
9. [Getting Started](#getting-started)
10. [Environment Variables](#environment-variables)

---

## Feature Overview

### For Citizens (User Dashboard)

| Feature | What it does |
|---|---|
| **AI Legal Chat** | Conversational Q&A grounded in 18 Indian statutes via per-law FAISS RAG; supports law-filtering, markdown output, copy/save |
| **AI Case Analyzer** | Upload/paste a case description → get applicable sections + relevant judgments from Indian Kanoon |
| **Contract Risk Analyzer** | Upload/paste a contract → risk score with flagged harmful clauses and clause-by-clause explanation |
| **Case File Summarizer** | Upload FIRs, chargesheets, court orders (PDF/DOCX/TXT) → structured plain-English summary |
| **Saved Cases / Contracts / Summaries** | All AI tool analyses auto-saved to MongoDB; full-view and harmful-clause views |
| **Consultation (Chat + Video)** | Browse lawyers → book slot → real-time text chat or WebRTC video call |
| **Community Forum** | Posts, replies, upvotes, categories, trending discussions |
| **Know Your Rights** | Constitutional rights guides (Art 14, 19, 21, 22, 32) with plain-English explanations |
| **Microlearning** | Bite-sized legal literacy lessons with per-lesson quizzes, daily streak tracking |
| **Legal News Feed** | Curated legal news headlines + news-to-lesson pipeline |
| **Law-Awareness Daily** | Random section-of-the-day from major legal codes |
| **Downloads** | PDF export history (localStorage, max 15) |
| **Profile & Settings** | Profile management, account settings |

### For Lawyers (Lawyer Dashboard)

| Feature | What it does |
|---|---|
| **Overview** | Today's appointments, pending requests, total clients, earnings |
| **Consultation Requests** | Accept/reject incoming consultation requests |
| **Appointments** | Full CRUD calendar view |
| **Client Chat** | Real-time Socket.IO text chat with clients |
| **Case Files** | Upload, list, download, delete client documents (multer, max 10MB) |
| **Incoming Call Notification** | Persistent listener for video call requests; animated toast with Accept/Decline |
| **AI Legal Chat** | Same law-filtered AI chat as user dashboard |
| **Case Analyzer / Risk Analyzer / Contract Viewer** | Shared tool components reused from user dashboard |
| **Profile** | Edit specialization, consultation fee, languages, availability |

### Chrome Extension (T&C Analyzer + IndianLegal Chat)

| Feature | What it does |
|---|---|
| **T&C Auto-Detect** | Detects Terms & Conditions pages by keywords, extracts text, analyzes via NVIDIA LLM |
| **T&C Popup** | "Analyze Current Page" button triggers manual analysis |
| **IndianLegal Chat** | Legal AI chat in extension popup |
| **Screenshot OCR** | Upload document screenshot → Tesseract.js extracts text |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Browser (Next.js 14 App Router)                    │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐   │
│  │  Landing / Auth   │  │  User Dashboard   │  │  Lawyer Dashboard │   │
│  │  /  /auth         │  │  /(dashboard)/*   │  │  /lawyer-dash/*   │   │
│  └──────────────────┘  └────────┬───────────┘  └────────┬─────────┘   │
└─────────────────────────────────┼─────────────────────────┼───────────┘
                                  │ HTTP + Socket.IO         │ HTTP
            ┌─────────────────────▼─────────────────────────▼───────────┐
            │              Express Backend  :4000                       │
            │  /api/auth  /api/user  /api/lawyer  /api/chats  /api/forum│
            │  /api/tools  /create-room  + Socket.IO (chat + WebRTC)    │
            └──────────────────────┬────────────────────────────────────┘
                                  │ Mongoose ODM
            ┌─────────────────────▼─────────────────────────────────────┐
            │              MongoDB  (ebench DB)                         │
            │  Users | Consultants | Chats | CaseAnalyses              │
            │  Appointments | ConsultationRequests | ForumPosts         │
            │  ForumReplies                                             │
            └───────────────────────────────────────────────────────────┘

            ┌───────────────────────────────────────────────────────────┐
            │          Python FastAPI RAG Server  :8000                 │
            │  Per-law FAISS indexes (18 laws, 5,641 provisions)       │
            │  BGE embeddings + CrossEncoder reranker                  │
            │  Nemotron-3 120B via NVIDIA NIM API                      │
            │  Indian Kanoon API for case law retrieval                 │
            └───────────────────────────────────────────────────────────┘
```

The frontend calls **both** the Express backend (for auth / CRUD / chat) and the Python RAG server (for AI-powered questions) independently.

---

## Tech Stack

### Frontend (`/client`)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline CSS-in-JS |
| Icons | lucide-react |
| 3D Landing | React Three Fiber + Drei + Three.js |
| PDF Export | jsPDF |
| Document Parsing | pdfjs-dist (PDF), mammoth (DOCX) |
| Realtime | socket.io-client |
| State | React `useState` / `useEffect` / `useMemo` / `useRef` |
| Persistence | localStorage (chat history, PDF downloads, call history) |
| Translation | Google Translate widget (en, hi, mr) |

### Backend (`/backend`)

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Realtime | Socket.IO 4 |
| File Uploads | Multer (max 10MB, allowed: .pdf .doc .docx .jpg .jpeg .png .txt) |
| Room IDs | uuid |
| LLM | NVIDIA Nemotron-3 Super 120B (via API) |
| Image Storage | Cloudinary v2 |
| OCR | tesseract.js |
| Telephony | Twilio (voice calls) |
| Live Tunnel | localtunnel |

### Chrome Extension (`/extensions/tc-analyzer`)

| Layer | Technology |
|---|---|
| Platform | Chrome Extension Manifest V3 |
| Language | JavaScript (Vanilla) |
| OCR | tesseract.js (server-side via backend) |
| Image Upload | Cloudinary (signed uploads via backend) |
| Styling | Pure CSS |

### RAG AI Server (`/RAG`)

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) — async endpoints with `asyncio.gather` for parallel IO |
| Embeddings (per-law) | `sentence-transformers` — BAAI/bge-base-en-v1.5 (768-dim) |
| Embeddings (legacy) | BAAI/bge-large-en-v1.5 (1024-dim) |
| Vector Search | FAISS IndexFlatIP — 18 per-law indexes, 15.5MB total |
| Reranker | CrossEncoder ms-marco-MiniLM-L-12-v2 |
| LLM | NVIDIA Nemotron-3 Super 120B (via NVIDIA NIM API) |
| Case Law | Indian Kanoon REST API (api.indiankanoon.org) |
| PDF Extraction | pdfplumber |
| Semantic RAG | Structured extraction: section → sub-clause → example |
| Diversity | MMR (Max Marginal Relevance, λ=0.5) via FAISS reconstruct |
| Caching | `@lru_cache(maxsize=256)` on retrieval for frequent queries |
| Persistence | MongoDB `lessons` collection for generated microlearning content |

---

## Repository Structure

```
E-Bench/
├── client/                            # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx                   # Landing page (Hero3D + 6 sections)
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles
│   │   ├── auth/page.tsx              # Login / Register (user + consultant)
│   │   ├── (dashboard)/               # Protected user route group
│   │   │   ├── layout.tsx             # Collapsible sidebar + top navbar
│   │   │   ├── dashboard/page.tsx     # Overview: typewriter AI bar, stats, tool cards
│   │   │   ├── cases/page.tsx         # Saved case analyses (table view)
│   │   │   ├── contracts/page.tsx     # Saved contract analyses (risk bar view)
│   │   │   ├── downloads/page.tsx     # All saved reports grid
│   │   │   ├── chat/page.tsx          # AI legal chat interface (law-filter support)
│   │   │   ├── chats/                 # Lawyer chat system
│   │   │   │   ├── page.tsx           # Chat list
│   │   │   │   ├── [id]/page.tsx      # Individual chat room (Socket.IO)
│   │   │   │   └── new/page.tsx       # New consultation (find lawyer + pay)
│   │   │   ├── contact/page.tsx       # Contact / find lawyer
│   │   │   ├── profile/page.tsx       # User profile editor
│   │   │   ├── search/page.tsx        # Search lawyers / legal topics
│   │   │   ├── settings/page.tsx      # Account settings
│   │   │   ├── summaries/page.tsx     # Document summaries list
│   │   │   ├── community/page.tsx     # Forum (posts, ask, detail, replies)
│   │   │   ├── microlearning/         # Legal literacy lessons
│   │   │   │   ├── page.tsx           # Lesson list
│   │   │   │   └── [lessonId]/page.tsx # Individual lesson
│   │   │   ├── tools/
│   │   │   │   ├── case-analyzer/page.tsx    # AI Case Analyzer
│   │   │   │   ├── case-summarizer/page.tsx  # AI Case Summarizer
│   │   │   │   └── risk-analyzer/page.tsx    # Contract Risk Analyzer
│   │   │   └── free-tools/
│   │   │       ├── law-awareness/page.tsx  # Know Your Rights (constitutional rights)
│   │   │       ├── news/page.tsx           # Legal news feed (fetches from RAG trending)
│   │   │       └── news/[id]/page.tsx      # News → legal impact → microlearning lesson
│   │   ├── lawyer-dashboard/           # Protected lawyer route group
│   │   │   ├── layout.tsx             # Lawyer sidebar + persistent Socket.IO
│   │   │   ├── page.tsx               # Overview stats: appointments, requests, clients
│   │   │   ├── appointments/page.tsx  # Appointment CRUD
│   │   │   ├── consultations/page.tsx # Manage consultation requests
│   │   │   ├── case-files/page.tsx    # Upload/manage case documents
│   │   │   ├── chat/page.tsx          # Client chat interface
│   │   │   ├── new-consultation/page.tsx  # New consultation
│   │   │   ├── legal-chat/page.tsx    # AI Legal Chat (wrapper)
│   │   │   ├── case-analyzer/page.tsx # AI Case Analyzer (wrapper)
│   │   │   ├── risk-analyzer/page.tsx # Contract Risk Analyzer (wrapper)
│   │   │   ├── contracts/page.tsx     # Saved contracts (wrapper)
│   │   │   ├── legal-news/page.tsx    # Legal news (wrapper)
│   │   │   ├── community/             # Community forum (wrapper)
│   │   │   └── profile/page.tsx       # Lawyer profile editor
│   │   └── session/[roomId]/page.tsx  # Video call room (WebRTC)
│   │
│   ├── components/
│   │   ├── Navbar.tsx                 # Landing page nav
│   │   ├── Footer.tsx                 # Landing page footer
│   │   ├── Hero3D.tsx                 # Three.js 3D scene
│   │   ├── Sidebar.tsx                # User dashboard sidebar
│   │   ├── TopNav.tsx                 # User dashboard top bar
│   │   ├── FormattedAiText.tsx        # Markdown renderer for AI responses
│   │   ├── PaymentModal.tsx           # Slot booking + consultation payment flow
│   │   ├── LawyerPickerModal.tsx      # Lawyer selection modal
│   │   ├── lawyer/                    # Lawyer dashboard components
│   │   │   ├── Sidebar.tsx / StatCards.tsx / AppointmentCard.tsx / ...
│   │   ├── tools/                     # Shared dashboard tool pages
│   │   │   ├── AiLegalChatPage.tsx    # (law-filter bar included)
│   │   │   ├── CaseAnalyzerPage.tsx
│   │   │   ├── RiskAnalyzerPage.tsx
│   │   │   ├── ContractsPage.tsx
│   │   │   ├── LegalNewsPage.tsx
│   │   │   ├── CommunityForumPage.tsx
│   │   │   ├── AskQuestionPage.tsx
│   │   │   └── PostDetailPage.tsx
│   │   ├── forum/                     # Forum components
│   │   └── sections/                  # Landing page sections
│   │
│   ├── lib/
│   │   ├── userApi.ts                # User profile + analysis CRUD + RAG ask + tool APIs + law APIs
│   │   ├── lawyerApi.ts              # Lawyer dashboard CRUD APIs
│   │   ├── chatApi.ts                # Chat CRUD APIs + Socket.IO token helper
│   │   ├── exportPdf.ts              # jsPDF export + save to download history
│   │   ├── downloadHistory.ts        # localStorage PDF download history manager
│   │   ├── documentText.ts           # Extract text from PDF/DOCX/TXT files
│   │   ├── forum-data.ts             # Static fallback forum data
│   │   ├── microlearning-data.ts     # Microlearning lesson topic definitions
│   │   ├── utils.ts                  # cn() className helper
│   │   └── useReveal.ts             # Scroll reveal animation hook
│   │
│   ├── hooks/
│   │   └── useVideoCall.ts          # WebRTC + Socket.IO hook (full lifecycle)
│   │
│   └── data/
│       ├── mockLawyerData.ts         # Static mock lawyer data
│       └── mockLegalNews.ts          # Static mock legal news feed
│
├── backend/                           # Express API + Socket.IO server
│   ├── index.js                      # Entry: Express app, Socket.IO, WebRTC signaling
│   ├── package.json
│   ├── controller/
│   │   ├── authController.js         # Register + login (User + Consultant)
│   │   ├── userController.js         # Profile CRUD, dashboard stats, analysis CRUD
│   │   ├── lawyerController.js       # Stats, profile, appointments, consults, case files
│   │   ├── chatController.js         # Chat CRUD, available lawyers/clients
│   │   └── toolController.js         # Forward to RAG + auto-save to CaseAnalysis
│   ├── models/
│   │   ├── UserModel.js              # Citizen accounts
│   │   ├── ConsultantModel.js        # Lawyer accounts
│   │   ├── ChatModel.js              # Polymorphic chat threads + messages
│   │   ├── CaseAnalysisModel.js      # AI tool outputs (case/contract/summary)
│   │   ├── AppointmentModel.js       # Lawyer appointments
│   │   ├── ConsultationRequestModel.js # Consultation requests
│   │   ├── ForumPostModel.js         # Community forum posts
│   │   ├── ForumReplyModel.js        # Forum replies
│   │   └── LearningProgressModel.js  # User learning progress + daily streak
│   ├── middleware/
│   │   └── authMiddleware.js         # JWT verification
│   ├── routes/
│   │   ├── authRoutes.js             # Register/login user & consultant, /me
│   │   ├── chatRoutes.js             # CRUD chats, lawyers, clients
│   │   ├── lawyerRoutes.js           # All /api/lawyer/* (with multer)
│   │   ├── userRoutes.js             # All /api/user/*
│   │   ├── microlearningRoutes.js    # Learning progress CRUD + daily streak
│   │   ├── forumRoutes.js            # Forum posts, replies, upvotes, trending
│   │   ├── toolRoutes.js             # /api/tools/case-analyzer, contract-risk, case-summarizer
│   │   ├── analyzeImageRoutes.js     # Image analysis via NVIDIA LLM
│   │   └── extensionRoutes.js        # Extension APIs: T&C analyze, legal chat, OCR, Cloudinary
│   ├── uploads/                      # Multer case file storage
│   └── twilio-voice/                 # Twilio voice AI endpoints
│
├── RAG/                               # Python FastAPI AI server
│   ├── main.py                       # Full RAG pipeline + 24 API endpoints (Semantic RAG + per-law)
│   ├── build_corpus.py               # Phase 1: per-PDF extraction with 5 parser strategies
│   ├── build_faiss.py                # Phase 2: per-law FAISS indexing (bge-base-en-v1.5, 768-dim)
│   ├── build_master_index.py         # Phase 3: master_index.json builder
│   ├── build_curated.py              # Phase 4: rule-based curated content per provision
│   ├── requirements.txt
│   ├── law_sections.json             # Legacy cached sections (old single-index pipeline)
│   ├── law_embeddings.npy            # Legacy embeddings (old single-index)
│   ├── law_faiss.index               # Legacy FAISS index (old single-index)
│   ├── data/                         # Per-law file architecture (Phase 1-6)
│   │   ├── master_index.json         # Router: 18 laws, 5,641 provisions, 15 domains
│   │   ├── <law_id>/                 # Per-law directory (18 total)
│   │   │   ├── corpus.json           # Extracted provisions
│   │   │   ├── curated.json          # Rule-based summaries, keywords, topics
│   │   │   ├── corpus_meta.json      # Embedding → provision number mapping
│   │   │   ├── faiss.index           # Per-law FAISS index
│   │   │   └── embeddings.npy        # Per-law embeddings
│   │   ├── _extraction_summary.json  # Build stats
│   │   ├── _faiss_summary.json       # FAISS build stats
│   │   └── _curated_summary.json     # Curated content stats
│   ├── BNS2023.pdf                   # Bharatiya Nyaya Sanhita 2023
│   ├── BNSS2023.pdf                  # Bharatiya Nagarik Suraksha Sanhita 2023
│   ├── BSA2023.pdf                   # Bharatiya Sakshya Adhiniyam 2023
│   ├── MotorVehicleAct.pdf
│   ├── CorporateLaws.pdf
│   └── SecurityLaw.pdf               # Securities Laws
│
├── extensions/tc-analyzer/            # Chrome Extension — T&C Analyzer + IndianLegal Chat
│   ├── manifest.json                  # Manifest V3
│   ├── background.js                  # Service worker
│   ├── content.js                     # Auto-detect T&C pages, inject analysis banner
│   ├── popup.html                     # Tabbed UI: IndianLegal Chat + T&C Analyzer
│   ├── popup.js                       # Chat logic, screenshot upload, T&C analysis trigger
│   └── styles.css                     # Popup + chat UI styles
│
├── dummy-data/                        # Test data for legal AI tools
│   ├── case-analyzer/                 # 3 case description texts
│   ├── contract-risk/                 # 3 contract texts
│   └── case-summarizer/               # 3 legal document texts
│
├── PPT/                               # Presentation files
│   ├── recursion 7.0 ppt.pptx
│   └── ppT.pdf
│
├── AbstarctOfEBenchKJS.pdf           # Project abstract
├── README.md                         # This file
├── CONTEXT.md                        # Developer reference (detailed)
├── futureplan.md                     # Build roadmap
└── build_log_v2.txt / build_log_v3.txt / faiss_build_log.txt  # Build logs
```

---

## RAG Pipeline — Per-Law FAISS Architecture

### The Three-Phase Build Pipeline

The RAG server uses a **per-law FAISS architecture** — one FAISS index per PDF (18 indexes, 5,641 total provisions, 15.5MB). This enables law-filtered queries, modular add/remove of laws without rebuilding everything, and smaller per-query memory.

**Phase 1 — Corpus Extraction** (`build_corpus.py`): Parses 18 Indian law PDFs using 5 extraction strategies (`default_numbered`, `old_act_multiline`, `constitution_with_parts`, `multi_act_compilation`, `rules_with_inline_clauses`). Extracts structured provisions with section → sub-clause → example hierarchy. Applies footnote filters and title-length gates. Output: per-law `corpus.json`.

**Phase 2 — FAISS Indexing** (`build_faiss.py`): Embeds each provision with `BAAI/bge-base-en-v1.5` (768-dim, 8 CPU threads) into per-law `faiss.index` + `embeddings.npy` files.

**Phase 3 — Master Index** (`build_master_index.py`): Builds `data/master_index.json` — a router mapping 18 laws across 15 domains with `law_id`, `label`, `domain`, `provision_count`.

**Phase 4 — Curated Content** (`build_curated.py`): Generates rule-based `curated.json` per law with `summary`, `plain_english`, `keywords`, `legal_topics` for every provision (upgradable to Nemotron-generated content later).

### Indexed Laws (18 total)

| Law ID | Label | Domain | Provisions |
|---|---|---|---|
| `bns_2023` | Bharatiya Nyaya Sanhita 2023 | Criminal Law | 46 |
| `bnss_2023` | Bharatiya Nagarik Suraksha Sanhita 2023 | Criminal Procedure | 68 |
| `bsa_2023` | Bharatiya Sakshya Adhiniyam 2023 | Evidence Law | 46 |
| `constitution` | Constitution of India | Constitutional Law | 459 |
| `corporate` | Companies Act 2013 | Corporate Law | 1,217 |
| `cpa_2019` | Consumer Protection Act 2019 | Consumer Law | 212 |
| `dv_act_2005` | Domestic Violence Act 2005 | Family Law | 70 |
| `family_laws` | Family Courts Act 1984 | Family Law | 46 |
| `gdr_rules_2014` | GDR Rules 2014 | Corporate Law | 4 |
| `ica_1872` | Indian Contract Act 1872 | Contract Law | 317 |
| `it_act_2000` | Information Technology Act 2000 | Cyber Law | 214 |
| `labour_employment` | Labour & Employment Laws | Labour Law | 251 |
| `motor_vehicles` | Motor Vehicles Act | Transport Law | 453 |
| `rera` | RERA 2016 | Real Estate Law | 180 |
| `securities` | Securities Laws | Corporate Law | 104 |
| `sra_1963` | Specific Relief Act 1963 | Civil Remedies | 94 |
| `taxation` | Income Tax Act 1961 | Tax Law | 1,581 |
| `tpa_1882` | Transfer of Property Act 1882 | Property Law | 279 |

### Retrieval Pipeline

1. Query is embedded with `BAAI/bge-base-en-v1.5` (768-dim)
2. Per-law FAISS IndexFlatIP search retrieves top-30 candidates
3. CrossEncoder (`ms-marco-MiniLM-L-12-v2`) reranks all candidates
4. Hybrid score: `0.35 × vector_similarity + 0.65 × reranker_relevance`
5. MMR diversity (λ=0.5) selects top-7 with diverse section coverage
6. Indian Kanoon API supplements with real case law
7. NVIDIA Nemotron-3 Super 120B generates grounded answer with citations

### API Endpoints

| Method | Path | Description |
|---|---|---|
| **POST** | `/ask` | Primary AI Q&A — returns answer + sections + IK results |
| **GET** | `/query?q=...&top_k=...` | Alternative GET-based Q&A |
| **POST** | `/ask/routed` | Law-filtered Q&A (`law_ids: ["bns_2023", "bnss_2023"]`) |
| **POST** | `/ask/stream` | Streaming SSE Q&A (used by chat UI) |
| **POST** | `/tools/case-analyzer` | Case analysis (called by backend proxy) |
| **POST** | `/tools/contract-risk` | Contract risk analysis |
| **POST** | `/tools/case-summarizer` | Document summarization |
| **GET** | `/laws` | List all 18 indexed laws |
| **GET** | `/laws/{law_id}` | Law detail (`?include_provisions=true`) |
| **GET** | `/laws/{law_id}/provisions/{number}` | Single provision detail with curated content |
| **GET** | `/sections?keyword=&limit=` | Search section headings |
| **GET** | `/section/{number}` | Get specific section with AI explanation |
| **GET** | `/punishment?offense=` | Find punishment text for an offense |
| **GET** | `/ik/search?q=` | Search Indian Kanoon case law |
| **GET** | `/ik/doc/{doc_id}` | Fetch full Indian Kanoon case document |
| **GET** | `/ik/case/{doc_id}/summary` | AI-generated case summary |
| **POST** | `/ik/case/{doc_id}/ask` | Ask LLM about a case section |
| **GET** | `/law-awareness/rights` | List fundamental rights articles |
| **POST** | `/legal-news/trending` | Fetch trending legal news |
| **POST** | `/legal-news/to-lesson` | News → legal topic → lesson pipeline |
| **POST** | `/microlearning/ask` | Microlearning-specific Q&A |
| **POST** | `/microlearning/generate` | Generate full lesson via LLM + RAG |
| **GET** | `/stats` | Index and pipeline statistics |

---

## Data Flow

### AI Legal Chat

```
User types question in chat/page.tsx
  → POST http://localhost:8000/ask { question, top_k: 7 }
  → (or POST /ask/routed { question, law_ids: [...] } if law filter active)
  → RAG Server: embed → FAISS per-law search → CrossEncoder rerank → MMR diversify
  → Retrieve Indian Kanoon results
  → Nemotron-3 generates grounded answer with citations
  → Response: { ai_answer, supporting_sections[], user_rights[], legal_steps[], indian_kanoon_results[] }
  → FormattedAiText renders markdown in chat bubble
```

### Contract Risk Analysis

```
User pastes contract text
  → Frontend computes preliminary riskScore (0-100) from keyword counting
  → POST http://localhost:8000/tools/contract-risk { contract_text }
  → RAG returns { risk_score, risk_level, flagged_clauses[], ai_answer, supporting_sections }
  → Auto-saves to backend: POST /api/user/analyses { type: "contract", ... }
  → Frontend renders risk bar (green <40, amber 40-70, red >70) + flagged clause cards
```

### Lawyer-Client Real-time Chat

```
Client opens chat → Socket.IO connect (JWT in handshake.auth.token)
  → emit('join-chat-room', { chatId }) — server verifies participant
  → emit('send-chat-message', { chatId, content }) — server persists to MongoDB
  → io.to(`chat:${chatId}`).emit('chat-message-realtime', payload)
```

### Video Call (WebRTC)

```
User clicks "Start Call" → POST /create-room → { roomId }
  → Joins Socket.IO room as 'user' role
  → Server notifies ALL registered lawyers via 'incoming-call' event
Lawyer dashboard → receives 'incoming-call' → animated toast (60s)
  → Accept → navigates to /session/[roomId]?role=lawyer
Both peers: → WebRTC signaling (offer/answer/ice-candidate) via Socket.IO
  → Peer-to-peer video/audio stream (Google STUN)
  → In-call text chat via Socket.IO
```

### News → Legal Topic → Microlearning Lesson

```
User clicks news item → /free-tools/news/[id]
  → POST /legal-news/to-lesson { news_id, headline, summary, category }
  → RAG: retrieve statute sections via FAISS + Indian Kanoon
  → LLM identifies legal topic + generates explanation + microlearning lesson + quiz
  → User views 4 tabs: Explanation, Legal Sections, Micro Lesson, Quiz
  → Lesson completion + quiz answers saved to backend progress API
  → Daily streak auto-updated
```

---

## Authentication & Security

- **Password hashing**: bcrypt with 10-12 salt rounds (auto-hashed in pre-save hooks)
- **JWT**: HS256, 7-day expiry, signed with `JWT_SECRET` env variable; payload `{ id, email, userType }`
- **Socket.IO**: JWT validated on every connection via `io.use()` middleware
- **File uploads**: Allowed types `.pdf .doc .docx .jpg .jpeg .png .txt`, max 10MB, filenames sanitized
- **File scoping**: Files prefixed with `consultantId` — only owning consultant can access
- **Authorization scoping**: All controllers filter by `req.user.id`
- **CORS**: Backend allows `http://localhost:3000`; RAG allows `localhost:3000` and `127.0.0.1:3000`

---

## Real-Time Communication

Socket.IO runs on the same Express HTTP server (port 4000). All connections require a valid JWT in `socket.handshake.auth.token`.

### Events — Lawyer-Client Chat

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-chat-room` | Client → Server | `{ chatId }` | Join chat (verifies participant) |
| `send-chat-message` | Client → Server | `{ chatId, content }` | Send + persist to MongoDB |
| `chat-message-realtime` | Server → Room | `{ _id, sender, senderModel, content, timestamp, chatId }` | Broadcast |

### Events — Video Call Signalling

| Event | Direction | Payload | Description |
|---|---|---|---|
| `register-lawyer` | Lawyer → Server | — | Register for incoming call notifications |
| `join-room` | All → Server | `{ roomId, role }` | Join WebRTC room |
| `incoming-call` | Server → Lawyers | `{ roomId, callerName, timestamp }` | Notify all online lawyers |
| `peer-joined` | Server → Room | `{ role, socketId }` | Other peer joined |
| `offer` | Peer ↔ Server ↔ Peer | `{ roomId, offer }` | WebRTC SDP offer relay |
| `answer` | Peer ↔ Server ↔ Peer | `{ roomId, answer }` | WebRTC SDP answer relay |
| `ice-candidate` | Peer ↔ Server ↔ Peer | `{ roomId, candidate }` | ICE candidate relay |
| `chat-message` | Peer ↔ Server ↔ Room | `{ roomId, message, sender }` | In-call text chat |
| `peer-left` | Server → Room | `{ role }` | Peer disconnected |

---

## Getting Started

```bash
# Prerequisites: Node.js ≥ 18, Python ≥ 3.10, MongoDB

# 1. Start MongoDB
mongod

# 2. Start Backend
cd backend
npm install
# Create backend/.env: MONGODB_URI, JWT_SECRET, NVIDIA_API_KEY, CLOUDINARY_*, TWILIO_*
npm run dev    # → http://localhost:4000

# 3. Start RAG AI Server
cd RAG
pip install -r requirements.txt
# Create RAG/.env: NVIDIA_API_KEY, IK_API_TOKEN, NEWSAPI_KEY, SERPAPI_KEY
uvicorn main:app --reload --port 8000  # → http://localhost:8000
# First run: loads two embedding models (~30s), then builds legacy + per-law indexes

# 4. Start Frontend
cd client
npm install
npm run dev    # → http://localhost:3000
```

### Access Points

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| RAG AI API | http://localhost:8000 |
| RAG Docs (Swagger) | http://localhost:8000/docs |

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `MONGODB_URI` | Backend, RAG | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret for signing JWT tokens |
| `PORT` | Backend | Server port (default 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend base URL (default http://localhost:4000) |
| `NEXT_PUBLIC_RAG_URL` | Frontend | RAG server base URL (default http://localhost:8000) |
| `NEXT_PUBLIC_RAG_API` | Frontend | RAG server base URL (used by chat component) |
| `RAG_BASE_URL` | Backend | RAG server URL for tool controller (default http://localhost:8000) |
| `NVIDIA_API_KEY` | Backend, RAG | API key for NVIDIA Nemotron-3 120B LLM |
| `CLOUDINARY_CLOUD_NAME` | Backend | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Backend | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend | Cloudinary API secret |
| `TWILIO_ACCOUNT_SID` | Backend | Twilio account SID for voice calls |
| `TWILIO_AUTH_TOKEN` | Backend | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Backend | Twilio phone number |
| `GOOGLE_API_KEY` | Backend | Google API key (Gemini fallback for voice) |
| `IK_API_TOKEN` | RAG | Indian Kanoon API token |
| `NEWSAPI_KEY` | RAG | NewsAPI.org API key |
| `SERPAPI_KEY` | RAG | SerpApi (Google search) key — powers the web-search fallback for pending-bill/current-events queries not covered by the static statute corpus |

**All secrets are read from `.env` files — never hardcoded in source code.**
- `backend/.env` — MongoDB, JWT, NVIDIA, Cloudinary, Twilio, Google
- `RAG/.env` — NVIDIA, Indian Kanoon, NewsAPI

---

## Key Highlights

- **Per-law FAISS architecture** — 18 separate indexes (15.5MB total) instead of one monolith; enables law-filtered queries and modular updates
- **Semantic RAG** — sub-clause level indexing with section → sub-clause → example hierarchy, not blind 220-word chunks
- **Hybrid retrieval** — FAISS vector search + CrossEncoder reranking + MMR diversity gives precise legal results
- **No LLM dependency on Express backend** — all AI is handled by the Python RAG server
- **WebRTC peer-to-peer** — video calls do not route through the server; signaling only
- **Polymorphic chat** — one `ChatModel` with `refPath` handles User↔Consultant via a single collection
- **Chrome Extension** — T&C Analyzer and IndianLegal Chat work independently of the main web app
- **Dual pipeline** — legacy single-index pipeline (6 docs, bge-large) preserved for backward compatibility alongside new per-law system (18 laws, bge-base)
