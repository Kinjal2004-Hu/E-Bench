# E-Bench — AI-Powered Legal Assistance Platform

> An end-to-end legal tech platform that connects citizens and lawyers, provides AI-powered legal analysis using RAG (Retrieval-Augmented Generation) over Indian law documents, enables real-time video consultations, and delivers live chat — all in a single full-stack application.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [How It Works — System Flow](#5-how-it-works--system-flow)
6. [RAG AI Engine (Python / FastAPI)](#6-rag-ai-engine-python--fastapi)
7. [Backend (Node.js / Express)](#7-backend-nodejs--express)
8. [Frontend (Next.js 14)](#8-frontend-nextjs-14)
9. [Feature Deep-Dives](#9-feature-deep-dives)
10. [Database Models](#10-database-models)
11. [API Reference](#11-api-reference)
12. [Authentication & Security](#12-authentication--security)
13. [Real-Time Features (Socket.IO + WebRTC)](#13-real-time-features-socketio--webrtc)
14. [Running the Project](#14-running-the-project)
15. [Environment Variables](#15-environment-variables)

---

## 1. Project Overview

**E-Bench** is a hackathon project built for St. John's that acts as a digital courthouse for everyday citizens. The platform has three types of users:

| Role | Access |
|---|---|
| **User (Citizen)** | AI tools, case consultation, real-time chat with lawyers, video calls |
| **Consultant (Lawyer)** | Case management, appointment scheduling, client consultation management, file upload |
| **Public** | Landing page, law awareness articles, legal news |

The core intelligence is a **Retrieval-Augmented Generation (RAG) pipeline** that indexes six major Indian law documents, performs hybrid vector + cross-encoder reranking retrieval, then passes context to an LLM (Qwen 2.5-7B) to produce grounded, cite-able legal answers. Results are augmented with live **Indian Kanoon** case law search.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 14)                      │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │  Landing Page│  │ User Dashboard │  │  Lawyer Dashboard   │  │
│  │  /auth       │  │ /(dashboard)/* │  │  /lawyer-dashboard/*│  │
│  └──────────────┘  └───────┬────────┘  └──────────┬──────────┘  │
└──────────────────────────────┼────────────────────────┼──────────┘
                               │ HTTP + Socket.IO        │ HTTP
                    ┌──────────▼────────────────────────▼──────────┐
                    │          Express Backend  :4000                │
                    │  /api/auth  /api/user  /api/lawyer  /api/chats│
                    │  + Socket.IO (chat + WebRTC signaling)        │
                    └──────────────────┬────────────────────────────┘
                                       │ Mongoose
                    ┌──────────────────▼──────────────────────────┐
                    │             MongoDB  (ebench DB)              │
                    │  Users | Consultants | Chats | Appointments  │
                    │  ConsultationRequests | CaseFiles | Analyses  │
                    └──────────────────────────────────────────────┘

                    ┌──────────────────────────────────────────────┐
                    │         Python FastAPI RAG  :8000             │
                    │  FAISS + BGE embeddings + Cross-Encoder +    │
                    │  Qwen 2.5-7B via Bytez + Indian Kanoon API   │
                    └──────────────────────────────────────────────┘
```

The frontend calls **both** the Express backend (for auth / CRUD / chat) and the Python RAG server (for AI-powered legal questions) independently.

---

## 3. Technology Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | App Router, SSR, routing |
| React | 18 | Component rendering |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Socket.IO Client | 4.8.3 | Real-time chat + WebRTC signaling |
| Lucide React | 0.577 | Icons |
| Three.js / R3F | 0.183 / 8.17 | 3D hero section scene |

### Backend (Node.js)
| Tool | Version | Purpose |
|---|---|---|
| Express | 5.2.1 | REST API server |
| Mongoose | 9.3.0 | MongoDB ODM |
| Socket.IO | 4.8.3 | Real-time events |
| jsonwebtoken | 9.0.3 | JWT auth |
| bcrypt | 6.0.0 | Password hashing |
| multer | 2.1.1 | File upload (case files) |
| uuid | 13 | Video call room IDs |

### RAG / AI (Python)
| Tool | Purpose |
|---|---|
| FastAPI | REST API for AI queries |
| FAISS (faiss-cpu) | Vector similarity search index |
| SentenceTransformers (BAAI/bge-base-en-v1.5) | Document & query embedding |
| CrossEncoder (ms-marco-MiniLM-L-6-v2) | Re-ranking retrieved chunks |
| Bytez SDK + Qwen/Qwen2.5-7B-Instruct | LLM for answer generation |
| pdfplumber | PDF text extraction from law documents |
| httpx | Async HTTP calls to Indian Kanoon API |

### Infrastructure
- **Database**: MongoDB (local or Atlas, database name: `ebench`)
- **WebRTC**: Browser-native peer-to-peer with Google STUN servers
- **Case Law**: Indian Kanoon REST API (`api.indiankanoon.org`)

---

## 4. Repository Structure

```
St.John Hackathon/
│
├── backend/                        # Express + Socket.IO server
│   ├── index.js                    # Entry point — Express app, Socket.IO, WebRTC signaling
│   ├── package.json
│   ├── .env                        # (not committed) MONGODB_URI, JWT_SECRET
│   │
│   ├── controller/
│   │   ├── authController.js       # register + login for both User and Consultant
│   │   ├── lawyerController.js     # Dashboard stats, appointments, consultations, case files
│   │   └── userController.js       # Profile, stats, AI analysis CRUD
│   │
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification (Bearer header + ?token= query param)
│   │
│   ├── models/
│   │   ├── UserModel.js            # Citizens — fullName, email, phone, org, role, barId
│   │   ├── ConsultantModel.js      # Lawyers — license, bar reg, specialization, fee, rating
│   │   ├── ChatModel.js            # Polymorphic chat: User ↔ Consultant messages
│   │   ├── CaseAnalysisModel.js    # AI tool results — case/contract/summary with sections
│   │   ├── AppointmentModel.js     # Lawyer appointments — date, time, clientName, status
│   │   └── ConsultationRequestModel.js  # Consultation requests — status, notes, fees
│   │
│   ├── routes/
│   │   ├── authRoutes.js           # POST /api/auth/register, /api/auth/login
│   │   ├── chatRoutes.js           # GET/POST /api/chats — list, create, history
│   │   ├── lawyerRoutes.js         # All /api/lawyer/* routes (with multer for file upload)
│   │   └── userRoutes.js           # All /api/user/* routes
│   │
│   ├── hooks/
│   │   └── useVideoCall.js         # (unused) server-side video call helper
│   └── uploads/                    # Multer stores case files here (auto-created)
│
├── client/                         # Next.js 14 App Router frontend
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   │
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page (Navbar + 6 sections + Footer)
│   │   │
│   │   ├── auth/
│   │   │   └── page.tsx            # Unified login/register for User + Consultant
│   │   │
│   │   ├── (dashboard)/            # Route group — User dashboard (requires auth)
│   │   │   ├── layout.tsx          # Sidebar + TopNav wrapper
│   │   │   ├── dashboard/page.tsx  # Overview: typewriter AI bar, quick links, stats
│   │   │   ├── cases/page.tsx      # List of saved AI case analyses
│   │   │   ├── contracts/page.tsx  # List of saved contract risk analyses
│   │   │   ├── downloads/page.tsx  # All saved reports (case + contract + summary)
│   │   │   ├── chat/page.tsx       # Chat interface (list of conversations)
│   │   │   ├── chats/[id]/page.tsx # Individual chat room
│   │   │   ├── contact/page.tsx    # Contact / find a lawyer
│   │   │   ├── profile/page.tsx    # User profile editor
│   │   │   ├── search/page.tsx     # Search lawyers / legal topics
│   │   │   ├── settings/page.tsx   # Account settings
│   │   │   ├── summaries/page.tsx  # Document summaries
│   │   │   ├── free-tools/
│   │   │   │   ├── law-awareness/page.tsx  # Law awareness cards (RTI, Cyber, Property…)
│   │   │   │   └── news/page.tsx           # Legal news feed
│   │   │   └── tools/
│   │   │       ├── case-analyzer/page.tsx     # AI Case Analyzer (RAG)
│   │   │       ├── case-summarizer/page.tsx   # AI Case Summarizer (RAG)
│   │   │       └── risk-analyzer/page.tsx     # Contract Risk Analyzer (RAG)
│   │   │
│   │   ├── lawyer-dashboard/       # Route group — Lawyer dashboard (requires auth)
│   │   │   ├── layout.tsx          # Lawyer Sidebar wrapper
│   │   │   ├── page.tsx            # Overview: stat cards, today's appointments, pending requests
│   │   │   ├── appointments/page.tsx    # Appointment calendar CRUD
│   │   │   ├── case-files/page.tsx      # Upload + manage client case files
│   │   │   ├── chat/page.tsx            # Lawyer chat interface
│   │   │   ├── consultations/page.tsx   # Manage consultation requests (approve/reject)
│   │   │   └── profile/page.tsx         # Lawyer profile editor
│   │   │
│   │   ├── calls/
│   │   │   ├── start/page.tsx      # Create a video call room + notify lawyers
│   │   │   ├── lawyer/page.tsx     # Lawyer listens for incoming call notifications
│   │   │   └── [roomId]/page.tsx   # Active WebRTC video call room
│   │   │
│   │   └── dash/page.tsx           # Redirect helper
│   │
│   ├── components/
│   │   ├── Navbar.tsx              # Landing page navigation
│   │   ├── Sidebar.tsx             # User dashboard sidebar
│   │   ├── TopNav.tsx              # User dashboard top bar
│   │   ├── Footer.tsx              # Landing page footer
│   │   ├── Hero3D.tsx              # Three.js 3D scene for landing page
│   │   ├── lawyer/                 # Lawyer dashboard components
│   │   │   ├── StatCards.tsx
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── ConsultationTable.tsx
│   │   │   ├── CaseFiles.tsx
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── OverviewCards.tsx
│   │   │   └── Sidebar.tsx
│   │   └── sections/               # Landing page sections
│   │       ├── HeroSection.tsx
│   │       ├── FeaturesSection.tsx
│   │       ├── PurposeSection.tsx
│   │       ├── SourcesSection.tsx
│   │       ├── FAQSection.tsx
│   │       └── ContactSection.tsx
│   │
│   ├── lib/
│   │   ├── userApi.ts              # All /api/user/* fetch helpers + RAG ragAsk()
│   │   ├── lawyerApi.ts            # All /api/lawyer/* fetch helpers
│   │   ├── chatApi.ts              # All /api/chats/* fetch helpers
│   │   └── utils.ts                # cn() className helper
│   │
│   └── hooks/
│       └── useVideoCall.ts         # WebRTC + Socket.IO hook (camera, mic, peer connection)
│
└── RAG/                            # Python FastAPI AI server
    ├── main.py                     # Full RAG pipeline + API endpoints
    ├── requirements.txt
    ├── Readme.md
    ├── law_sections.json           # Cached extracted law sections (auto-generated)
    ├── law_embeddings.npy          # Cached section embeddings (auto-generated)
    ├── law_faiss.index             # FAISS vector index (auto-generated)
    ├── bns_sections.json           # BNS-specific section cache
    └── bns_embeddings.npy          # BNS-specific embeddings
    (PDF files must be placed here — see Running the Project)
```

---

## 5. How It Works — System Flow

### User Registration & Login

```
Browser → POST /api/auth/register (fullName, email, password, userType)
       ← 201 { token, user }

Browser → POST /api/auth/login (email, password)
       ← 200 { token, user }
```

- Password is bcrypt hashed with 12 rounds before storage.
- JWT payload: `{ id, email, userType }`, 7-day expiry.
- Consultant registration requires additional fields: `licenseNumber`, `barRegistration`, `specialization`.
- The same `/api/auth` endpoint handles both `User` and `Consultant` models — routing is controlled by `userType` in the request body.

---

### AI Legal Query (RAG Pipeline)

```
Browser → POST http://localhost:8000/ask
         { question: "What is the punishment for cybercrime?", top_k: 7 }
       ← {
           ai_answer: "...",
           supporting_sections: [ { document, section_number, title, snippet, punishment_summary, score } ],
           user_rights: ["..."],
           legal_steps: ["..."],
           indian_kanoon_results: [ { doc_id, title, headline } ]
         }
```

The RAG pipeline inside `main.py` works as follows:

1. **Build Index** (once at startup):
   - Extract text from 6 law PDFs using `pdfplumber`
   - Split into overlapping 220-word chunks with 40-word overlap
   - Embed each chunk using `BAAI/bge-base-en-v1.5` SentenceTransformer
   - Store in a FAISS `IndexFlatIP` (inner product / cosine similarity)
   - All artifacts cached to disk (`law_sections.json`, `law_embeddings.npy`, `law_faiss.index`) — subsequent starts are instant

2. **Retrieval**:
   - Embed the query with the same model
   - FAISS retrieves top 60 candidates by vector similarity
   - Cross-encoder (`ms-marco-MiniLM-L-6-v2`) re-ranks all 60 pairs (query, chunk)
   - Hybrid score = `0.35 × vector_norm + 0.65 × reranker_sigmoid`
   - Filter: only keep results with hybrid score > 0.35
   - Return top `top_k` (default 7) results

3. **Indian Kanoon**:
   - Concurrently calls `api.indiankanoon.org/search/` with the same question
   - Returns up to 5 real case citations with titles and headlines

4. **LLM Answer**:
   - All retrieved section texts + Indian Kanoon results are passed as context
   - `Qwen/Qwen2.5-7B-Instruct` (via Bytez SDK) generates a structured answer
   - System prompt instructs it to cite Act names and section numbers

---

### Real-Time Chat

```
Browser → Socket.IO connect (with JWT in handshake.auth.token)
        → emit('join-chat-room', { chatId })    // verify participant in DB
        → emit('send-chat-message', { chatId, content }, ack)
                                                   // message saved to MongoDB
        ← on('chat-message-realtime', payload)    // broadcast to all in room
```

- Chat rooms are stored in MongoDB (`ChatModel`) with polymorphic participants (either `User` or `Consultant`).
- Socket.IO middleware verifies the JWT on every connection — unauthenticated connections are rejected.
- Message persistence happens on every `send-chat-message` — the DB is the source of truth; Socket.IO just delivers real-time notifications.

---

### Video Call (WebRTC)

```
User browser  →  POST /create-room  →  { roomId }
              →  Socket.IO join-room(roomId, 'user')
              
Lawyer        ←  on('incoming-call', { roomId })   // notified instantly
              →  Socket.IO join-room(roomId, 'lawyer')
              ←  on('peer-joined', { role })

--- WebRTC Handshake ---
Caller  → emit('offer', { roomId, offer }) 
        ← on('answer', { answer })
        ↔ emit/on 'ice-candidate'

Result: Peer-to-peer video / audio stream
```

- ICE servers: `stun:stun.l.google.com:19302` and `stun1.l.google.com:19302`
- The server only relays signaling — actual media streams flow peer-to-peer
- In-call chat messages are relayed via Socket.IO `chat-message` → `io.to(roomId).emit`

---

## 6. RAG AI Engine (Python / FastAPI)

**Server:** `http://localhost:8000`  
**Start:** `uvicorn main:app --reload` from the `RAG/` directory

### Indexed Law Documents

| Document | File |
|---|---|
| Bharatiya Nyaya Sanhita 2023 (BNS) | `BNS2023.pdf` |
| Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS) | `BNSS2023.pdf` |
| Bharatiya Sakshya Adhiniyam 2023 (BSA) | `BSA2023.pdf` |
| Motor Vehicles Act | `MotorVehicleAct.pdf` |
| Corporate Laws | `CorporateLaws.pdf` |
| Securities Laws | `SecuritiesLaws.pdf` |

PDFs must be placed in the `RAG/` directory. On first startup, the system extracts, embeds, and indexes all documents — this takes a few minutes. All cache files are saved to disk; subsequent starts load from cache in seconds.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ask` | Primary AI Q&A endpoint — returns answer + supporting sections + Indian Kanoon + user rights + legal steps |
| `GET` | `/query?q=...` | Alternative GET Q&A — same logic as `/ask` |
| `GET` | `/section/{number}` | Get a specific section with AI explanation |
| `GET` | `/sections?keyword=...&limit=20` | List / search section headings |
| `GET` | `/punishment?offense=...` | Find punishment text for an offense type |
| `GET` | `/ik/search?q=...` | Search Indian Kanoon case law |
| `GET` | `/ik/doc/{doc_id}` | Fetch full Indian Kanoon document |
| `GET` | `/ik/docmeta/{doc_id}` | Fetch Indian Kanoon document metadata |
| `GET` | `/ik/fragment/{doc_id}?q=...` | Fetch matching fragments from a case |
| `GET` | `/stats` | Index stats — sections per document, models used |

### Response Shape (`POST /ask`)

```json
{
  "question": "What is the penalty for identity theft?",
  "ai_answer": "Under BNS Section 66C...",
  "supporting_sections": [
    {
      "document": "BNS",
      "section_number": 66,
      "title": "Identity Theft",
      "snippet": "Whoever fraudulently or dishonestly...",
      "punishment_summary": "imprisonment up to 3 years and fine...",
      "page": 42,
      "score": 0.873,
      "score_breakdown": {
        "hybrid": 0.873,
        "vector_similarity": 0.812,
        "reranker_relevance": 0.904
      }
    }
  ],
  "model_used": "Qwen/Qwen2.5-7B-Instruct",
  "user_rights": ["Right to legal counsel", "Right to fair investigation"],
  "legal_steps": ["File an FIR at the nearest police station", "Contact the Cyber Crime Cell"],
  "indian_kanoon_results": [
    { "doc_id": "123456", "title": "State vs ABC", "headline": "..." }
  ]
}
```

---

## 7. Backend (Node.js / Express)

**Server:** `http://localhost:4000`  
**Start:** `npm run dev` from the `backend/` directory

### Route Groups

#### `/api/auth` — Authentication
| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/register` | `{ fullName, email, password, userType, ...consultantFields }` | Register user or consultant |
| `POST` | `/login` | `{ email, password }` | Login — returns JWT + user |

#### `/api/user` — User (Citizen) APIs *(requires JWT)*
| Method | Path | Description |
|---|---|---|
| `GET` | `/profile` | Get own profile |
| `PUT` | `/profile` | Update profile (fullName, phone, organization, location, bio, role) |
| `GET` | `/stats` | Dashboard stats (totalCases, totalContracts, totalSummaries, totalChats) |
| `GET` | `/analyses?type=case\|contract\|summary` | List saved AI analyses |
| `GET` | `/analyses/:id` | Get single analysis with all fields |
| `POST` | `/analyses` | Save a new AI analysis result |
| `DELETE` | `/analyses/:id` | Delete own analysis |

#### `/api/lawyer` — Lawyer (Consultant) APIs *(requires JWT)*
| Method | Path | Description |
|---|---|---|
| `GET` | `/stats` | Stats: today's appointments, pending requests, total clients, earnings |
| `GET/PUT` | `/profile` | Get / update lawyer profile |
| `GET` | `/appointments?date=YYYY-MM-DD` | List appointments (filter by date) |
| `POST` | `/appointments` | Create appointment |
| `PATCH` | `/appointments/:id/status` | Update appointment status |
| `DELETE` | `/appointments/:id` | Delete appointment |
| `GET` | `/consultation-requests?status=pending` | List consultation requests |
| `POST` | `/consultation-requests` | Create consultation request |
| `PATCH` | `/consultation-requests/:id/status` | Approve / reject consultation |
| `GET` | `/case-files` | List uploaded case files |
| `POST` | `/case-files` | Upload file (multipart/form-data, max 10MB) |
| `GET` | `/case-files/:id/download` | Authenticated file download |
| `DELETE` | `/case-files/:id` | Delete case file |

#### `/api/chats` — Chat REST APIs *(requires JWT)*
| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all chats for the authenticated user |
| `POST` | `/` | Create a new chat (specify participants) |
| `GET` | `/:id/messages` | Fetch message history for a chat |

#### WebRTC Signaling REST
| Method | Path | Description |
|---|---|---|
| `POST` | `/create-room` | Create a video call room and notify online lawyers |

---

## 8. Frontend (Next.js 14)

**Dev server:** `http://localhost:3000`  
**Start:** `npm run dev` from the `client/` directory

### Landing Page (`/`)

Six sections rendered in sequence:
1. **HeroSection** — 3D animated scene (`Hero3D.tsx` with Three.js/R3F) + headline + CTA buttons
2. **PurposeSection** — Why E-Bench exists
3. **FeaturesSection** — Feature highlights (AI tools, video calls, chat, RAG search)
4. **SourcesSection** — Law documents and data sources used
5. **FAQSection** — Common questions
6. **ContactSection** — Contact form

### Auth Page (`/auth`)

A single unified page that handles:
- User login / registration toggle
- Consultant login / registration toggle
- Dynamic form fields (consultants see extra fields: License Number, Bar Registration, Specialization, Professional Summary)
- Calls `POST /api/auth/register` or `/api/auth/login` based on mode
- Stores JWT in `localStorage` → redirects to the appropriate dashboard

### User Dashboard (`/(dashboard)/*`)

Protected by client-side JWT check. Layout: persistent **Sidebar** + **TopNav**.

| Page | Route | Feature |
|---|---|---|
| Overview | `/dashboard` | Typewriter AI search bar, quick-action cards, recent activity, stats |
| Cases | `/cases` | Table of saved case analyses from MongoDB (delete, search) |
| Contracts | `/contracts` | Table of saved contract analyses with risk score bar |
| Downloads | `/downloads` | Grid of all saved reports (case / contract / summary) with delete |
| Chat | `/chat` | List of chat conversations |
| Chat Room | `/chats/[id]` | Real-time chat via Socket.IO |
| Profile | `/profile` | Edit name, phone, organization, location, bio, role |
| Search | `/search` | Search lawyers / legal topics |
| Settings | `/settings` | Account settings |
| Law Awareness | `/free-tools/law-awareness` | Informational law cards (RTI, Cyber, Property, Consumer...) |
| Legal News | `/free-tools/news` | Legal news feed |
| **Case Analyzer** | `/tools/case-analyzer` | Paste case description → RAG AI analysis → Save report |
| **Case Summarizer** | `/tools/case-summarizer` | Paste legal document → RAG summary → Save report |
| **Risk Analyzer** | `/tools/risk-analyzer` | Paste contract text → RAG risk analysis + score → Save report |

### Lawyer Dashboard (`/lawyer-dashboard/*`)

| Page | Route | Feature |
|---|---|---|
| Overview | `/lawyer-dashboard` | Stat cards (appointments, requests, clients, earnings), today's appointments, pending consultations |
| Appointments | `/lawyer-dashboard/appointments` | Full appointment CRUD — book, update status, delete |
| Consultations | `/lawyer-dashboard/consultations` | Manage consultation requests — approve/reject/complete |
| Case Files | `/lawyer-dashboard/case-files` | Upload, list, download, and delete client case files |
| Profile | `/lawyer-dashboard/profile` | Edit professional details, specialization, fee, languages |
| Chat | `/lawyer-dashboard/chat` | Chat with clients |

### Video Calls (`/calls/*`)

| Page | Route | Purpose |
|---|---|---|
| Start Call | `/calls/start` | User creates a room + gets a `roomId`, backend notifies all online lawyers via Socket.IO |
| Lawyer Listen | `/calls/lawyer` | Lawyer registers as available and waits for incoming calls |
| Call Room | `/calls/[roomId]` | Full WebRTC peer-to-peer video call with in-call chat |

---

## 9. Feature Deep-Dives

### AI Case Analyzer

1. User types or pastes a case description
2. Frontend calls `POST http://localhost:8000/ask` with prompt: `"Analyze this case and identify applicable legal sections: {description}"`
3. RAG pipeline returns: AI answer, supporting law sections with snippets, user rights, next legal steps, Indian Kanoon cases
4. Results rendered in a structured output panel
5. User clicks **Save Report** → calls `POST /api/user/analyses` → stored in MongoDB as type `"case"`
6. Saved analysis appears in the **Cases** page table

### Contract Risk Analyzer

1. User pastes contract text
2. Frontend pregenerates a `riskScore` (0–100) by counting legal risk keywords: `liability, terminate, waive, indemnify, penalty, forfeit, damages, restrict, prohibit, disclaim`
3. Calls RAG API with: `"Identify legal risks and unfair clauses in this contract: {text}"`
4. Returns risky clauses with relevant law sections
5. Risk score bar rendered with colour coding: green (<40), amber (40–70), red (>70)
6. On save → type `"contract"` with `riskScore`

### Case Summarizer

1. User pastes a large legal document (FIR, judgement, chargesheet)
2. Calls RAG API with: `"Summarize this legal document and highlight key facts: {text}"`
3. Returns distilled AI summary, key legal sections, applicable rights
4. On save → type `"summary"`

### Real-Time Video Consultation

- **User side**: Clicks "Start Call" → `POST /create-room` → receives `roomId` → joins room as `"user"` role via Socket.IO → waits for peer
- **Lawyer side**: On the `/calls/lawyer` page they emit `register-lawyer` → Socket.IO server puts them in the `lawyers` Map → when a user creates a room, **all registered lawyers** receive `incoming-call` event → lawyer joins the room as `"lawyer"` role
- **WebRTC**:  Once both sides are in the room, the `peer-joined` event triggers the caller to `createOffer()` → SDP offer/answer + ICE candidate are relayed through Socket.IO → peer-to-peer stream established
- **In-call chat**: Both peers can send messages via `chat-message` Socket.IO event; the server broadcasts to the room

### Multi-type Chat System

- Direct chats between a User and a Consultant are stored in MongoDB with a polymorphic participant array
- Each participant is `{ participant: ObjectId, participantModel: 'User' | 'Consultant' }`
- Socket.IO join verifies the requester is actually a participant before allowing them into the room
- Messages are persisted to DB on every send (no in-memory-only messages)

---

## 10. Database Models

### User
```
fullName        String (required)
email           String (unique, lowercase)
password        String (bcrypt hashed, min 6 chars)
userType        "user" | "consultant"
phone           String
organization    String
location        String
bio             String (max 500)
role            String (default: "Client")
barId           String
createdAt       Date
```

### Consultant
```
fullName            String
email               String (unique)
password            String (bcrypt hashed)
licenseNumber       String (unique, required)
barRegistration     String
specialization      "criminal"|"civil"|"corporate"|"family"|"intellectual"|"labor"|"tax"|"other"
professionalSummary String (max 500)
experience          String
languages           String
consultationFee     String
availability        String
photoUrl            String
isVerified          Boolean
rating              Number (0–5)
totalClients        Number
createdAt           Date
```

### Chat
```
title           String (optional)
isDirect        Boolean
participants    [{ participant: ObjectId (ref User|Consultant), participantModel: String }]
messages        [{ sender, senderModel, content, timestamp }]
lastMessage     String
lastMessageAt   Date
```

### CaseAnalysis (User AI Tool Results)
```
userId          ObjectId (ref User)
type            "case" | "contract" | "summary"
title           String (max 200)
description     String (max 5000)
aiAnswer        String
sections        [{ document, section_number, title, snippet, punishment_summary, score }]
userRights      [String]
legalSteps      [String]
riskScore       Number (0–100)
createdAt / updatedAt   Auto timestamps
```

### Appointment (Lawyer)
```
consultantId    ObjectId (ref Consultant)
clientName      String
date            String (YYYY-MM-DD)
time            String
type            "consultation" | "follow-up" | "document-review" | "court-prep"
status          "scheduled" | "confirmed" | "completed" | "cancelled"
notes           String
fee             String
```

### ConsultationRequest (Lawyer)
```
consultantId    ObjectId (ref Consultant)
clientName      String
subject         String
description     String (max 1000)
status          "pending" | "approved" | "rejected" | "completed"
priority        "low" | "medium" | "high" | "urgent"
proposedFee     String
notes           String
```

---

## 11. API Reference

### Authentication Header
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

File download endpoints also accept `?token=<jwt_token>` as a query parameter (for browser `<a>` tags).

### Frontend API Helpers

All API logic is centralized in three TypeScript modules:

**`client/lib/userApi.ts`** — User dashboard
- `fetchUserProfile()` → `GET /api/user/profile`
- `updateUserProfile(data)` → `PUT /api/user/profile`
- `fetchUserDashboardStats()` → `GET /api/user/stats`
- `fetchAnalyses(type?)` → `GET /api/user/analyses?type=`
- `fetchAnalysisById(id)` → `GET /api/user/analyses/:id`
- `saveAnalysis(payload)` → `POST /api/user/analyses`
- `deleteAnalysis(id)` → `DELETE /api/user/analyses/:id`
- `ragAsk(question, top_k)` → `POST http://localhost:8000/ask`

**`client/lib/lawyerApi.ts`** — Lawyer dashboard
- `fetchStats()` · `fetchProfile()` · `updateProfile(data)`
- `fetchAppointments(date?)` · `createAppointment(data)` · `updateAppointmentStatus(id, status)` · `deleteAppointment(id)`
- `fetchConsultationRequests(status?)` · `createConsultationRequest(data)` · `updateConsultationStatus(id, status)`
- `fetchCaseFiles()` · `uploadCaseFile(formData)` · `downloadCaseFile(id)` · `deleteCaseFile(id)`

**`client/lib/chatApi.ts`** — Messaging
- `fetchChats()` · `createChat(participantId)` · `fetchMessages(chatId)`

---

## 12. Authentication & Security

- **Password hashing**: bcrypt with 10–12 salt rounds
- **JWT**: HS256, 7-day expiry, signed with `JWT_SECRET` env variable
- **Socket.IO**: JWT validated on every connection via `io.use()` middleware — sockets without valid tokens are rejected before any event handler runs
- **File uploads**:
  - Allowed file types: `.pdf .doc .docx .jpg .jpeg .png .txt`
  - Max size: 10 MB
  - Filenames sanitized: all non-alphanumeric characters replaced before save
  - Files scoped by `consultantId` prefix
- **CORS**: Backend allows only `http://localhost:3000`; RAG server allows `localhost:3000` and `127.0.0.1:3000`
- **Authorization scoping**: All controller queries filter by `req.user.id` — a user cannot access another user's analyses, appointments, or profile

---

## 13. Real-Time Features (Socket.IO + WebRTC)

### Socket.IO Events

#### Server → Client
| Event | Payload | When |
|---|---|---|
| `incoming-call` | `{ roomId, from, timestamp }` | Sent to all registered lawyers when a user creates a call room |
| `peer-joined` | `{ role, socketId }` | Sent to existing room occupant when the other party joins |
| `offer` | `{ offer, from }` | WebRTC SDP offer relay |
| `answer` | `{ answer }` | WebRTC SDP answer relay |
| `ice-candidate` | `{ candidate }` | ICE candidate relay |
| `chat-message` | `{ message, sender, timestamp }` | In-call chat relay |
| `chat-message-realtime` | `{ _id, chatId, sender, content, timestamp }` | Persistent chat message broadcast |

#### Client → Server
| Event | Payload | Purpose |
|---|---|---|
| `register-lawyer` | — | Lawyer registers as available for incoming calls |
| `join-room` | `{ roomId, role }` | Join a WebRTC call room |
| `offer` | `{ roomId, offer }` | Send WebRTC offer |
| `answer` | `{ roomId, answer }` | Send WebRTC answer |
| `ice-candidate` | `{ roomId, candidate }` | Send ICE candidate |
| `chat-message` | `{ roomId, message, sender }` | Send in-call chat message |
| `join-chat-room` | `{ chatId }` | Join a persistent chat room |
| `send-chat-message` | `{ chatId, content }` | Send persistent chat message (with ack) |

### `useVideoCall` Hook

The `client/hooks/useVideoCall.ts` hook encapsulates the full WebRTC lifecycle:
- `localVideoRef` / `remoteVideoRef` — attach to `<video>` elements
- `isMuted` / `toggleMute()` — toggle microphone track
- `isCameraOff` / `toggleCamera()` — toggle video track
- `isConnected` — `RTCPeerConnection.connectionState === "connected"`
- `messages` — in-call chat message array
- `sendMessage(text)` — emit in-call chat message
- `error` — connection error string

---

## 14. Running the Project

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB running locally on port 27017 (or provide Atlas URI via env)

### 1. Start MongoDB
```bash
mongod
```

### 2. Start the Express Backend
```bash
cd backend
npm install
# Create .env file (see Environment Variables section)
npm run dev
# Runs on http://localhost:4000
```

### 3. Start the RAG Python Server
```bash
cd RAG
pip install -r requirements.txt
# Place law PDFs in this directory (BNS2023.pdf, BNSS2023.pdf, etc.)
uvicorn main:app --reload --port 8000
# First run: extracts + indexes PDFs (takes ~5 minutes)
# Subsequent runs: loads from cache (seconds)
# Runs on http://localhost:8000
```

### 4. Start the Next.js Frontend
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:3000
```

### Access Points
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| RAG AI API | http://localhost:8000 |
| RAG API Docs (Swagger) | http://localhost:8000/docs |

---

## 15. Environment Variables

### `backend/.env`
```env
MONGODB_URI=mongodb://localhost:27017/ebench
JWT_SECRET=your_super_secret_jwt_key_change_in_production
PORT=4000
```

### RAG API Keys (hardcoded in `RAG/main.py` — move to env for production)
```
BYTEZ_API_KEY    — API key for Bytez LLM inference (Qwen 2.5-7B)
IK_API_TOKEN     — API token for api.indiankanoon.org
```

---

## Project Highlights

- **No external LLM API required on the Express backend** — all AI is handled by the Python service
- **Zero mock data in production code** — all dashboard pages fetch live from MongoDB
- **Offline-capable AI indexing** — once PDFs are embedded and cached, the RAG server works without re-processing
- **Hybrid retrieval quality** — FAISS finds semantically similar passages, cross-encoder re-ranks for precision; the combination outperforms pure vector search for legal queries
- **WebRTC peer-to-peer** — video calls do not route through the server; the backend is only used for signaling
- **Polymorphic chat** — one `ChatModel` handles both User↔Consultant and multi-party conversations via `refPath`
