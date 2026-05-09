# E-Bench — Digital Justice Platform

> **Project Motivation**: India has over 40 million pending court cases. Most citizens cannot afford a lawyer for every question, do not know their basic rights, and cannot understand legal documents written in technical language. E-Bench bridges this gap by combining AI legal intelligence, live lawyer consultations, document-processing tools, and community legal education.

---

## 1. Project Architecture Overview

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
            │  FAISS + BGE embeddings + CrossEncoder +                 │
            │  Qwen2.5-7B-Instruct via Bytez + Indian Kanoon API       │
            └───────────────────────────────────────────────────────────┘
```

The frontend calls **both** the Express backend (for auth / CRUD / chat) and the Python RAG server (for AI-powered questions) independently.

---

## 2. Technology Stack

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
| Framework | FastAPI (Python) |
| Embeddings | sentence-transformers — BAAI/bge-base-en-v1.5 (768-dim) |
| Vector Search | FAISS (IndexFlatIP, inner product) |
| Reranker | CrossEncoder ms-marco-MiniLM-L-6-v2 |
| LLM | Qwen/Qwen2.5-7B-Instruct via Bytez API |
| Case Law | Indian Kanoon REST API (api.indiankanoon.org) |
| PDF Extraction | pdfplumber |

---

## 3. Repository Structure

```
E-Bench/
├── client/                            # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx                   # Landing page (Hero3D + 6 sections)
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles
│   │   ├── auth/page.tsx              # Login / Register (user + consultant)
│   │   ├── (dashboard)/               # Protected user route group
│   │   │   ├── layout.tsx             # Collapsible sidebar + top navbar + child pages
│   │   │   ├── dashboard/page.tsx     # Overview: typewriter AI bar, stats, tool cards
│   │   │   ├── cases/page.tsx         # Saved case analyses (table view)
│   │   │   ├── contracts/page.tsx     # Saved contract analyses (risk bar view)
│   │   │   ├── downloads/page.tsx     # All saved reports grid
│   │   │   ├── chat/page.tsx          # AI legal chat interface
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
│   │   │   ├── layout.tsx             # Lawyer sidebar + persistent Socket.IO (incoming-call)
│   │   │   ├── page.tsx               # Overview stats: appointments, requests, clients
│   │   │   ├── appointments/page.tsx   # Appointment CRUD
│   │   │   ├── consultations/page.tsx  # Manage consultation requests
│   │   │   ├── case-files/page.tsx     # Upload/manage case documents
│   │   │   ├── chat/page.tsx           # Client chat interface
│   │   │   ├── new-consultation/page.tsx  # New consultation page
│   │   │   └── profile/page.tsx        # Lawyer profile editor
│   │   └── session/[roomId]/page.tsx   # Video call room (WebRTC)
│   │
│   ├── components/
│   │   ├── Navbar.tsx                 # Landing page nav
│   │   ├── Footer.tsx                 # Landing page footer
│   │   ├── Hero3D.tsx                 # Three.js 3D scene
│   │   ├── Sidebar.tsx                # User dashboard sidebar
│   │   ├── TopNav.tsx                 # User dashboard top bar
│   │   ├── FormattedAiText.tsx        # Markdown renderer for AI responses
│   │   ├── PaymentModal.tsx           # Consultation payment flow (demo)
│   │   ├── LawyerPickerModal.tsx     # Lawyer selection modal
│   │   ├── lawyer/                    # Lawyer dashboard components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatCards.tsx
│   │   │   ├── AppointmentCard.tsx
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── ConsultationTable.tsx
│   │   │   ├── CaseFiles.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── OverviewCards.tsx
│   │   │   └── ProfileForm.tsx
│   │   ├── forum/                     # Forum components
│   │   │   ├── ForumHeader.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── ReplyCard.tsx
│   │   │   ├── CategoryCard.tsx
│   │   │   └── TrendingWidget.tsx
│   │   └── sections/                  # Landing page sections
│   │       ├── HeroSection.tsx
│   │       ├── PurposeSection.tsx
│   │       ├── FeaturesSection.tsx
│   │       ├── SourcesSection.tsx
│   │       ├── TestimonialsSection.tsx
│   │       ├── FAQSection.tsx
│   │       └── ContactSection.tsx
│   │
│   ├── lib/
│   │   ├── userApi.ts                # User profile + analysis CRUD + RAG ask + tool APIs
│   │   ├── lawyerApi.ts              # Lawyer dashboard CRUD APIs
│   │   ├── chatApi.ts                # Chat CRUD APIs + Socket.IO token helper
│   │   ├── exportPdf.ts              # jsPDF export + save to download history
│   │   ├── downloadHistory.ts        # localStorage PDF download history manager
│   │   ├── documentText.ts           # Extract text from PDF/DOCX/TXT files
│   │   ├── forum-data.ts             # Static fallback forum data + TypeScript types
│   │   ├── microlearning-data.ts     # Static microlearning lesson data
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
│   │   ├── authController.js         # Register + login (User model only)
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
│   │   └── authMiddleware.js         # JWT verification (Bearer + ?token= query param)
│   ├── routes/
│   │   ├── authRoutes.js             # Register/login user & consultant, /me, /consultants
│   │   ├── chatRoutes.js             # CRUD chats, lawyers, clients
│   │   ├── lawyerRoutes.js           # All /api/lawyer/* (with multer)
│   │   ├── userRoutes.js             # All /api/user/*
│   │   ├── microlearningRoutes.js    # Learning progress CRUD + daily streak /api/user/microlearning/*
│   │   ├── forumRoutes.js            # Forum posts, replies, upvotes, trending
│   │   ├── toolRoutes.js             # /api/tools/case-analyzer, contract-risk, case-summarizer
│   │   ├── analyzeImageRoutes.js     # Image analysis via NVIDIA LLM
│   │   └── extensionRoutes.js        # Extension APIs: T&C analyze, legal chat, OCR, Cloudinary upload
│   ├── hooks/
│   │   └── useVideoCall.js           # (unused) server-side helper
│   ├── uploads/                      # Multer case file storage
│   └── twilio-voice/                 # Twilio voice AI endpoints
│       ├── index.js
│       ├── config.js
│       ├── endpoints.js
│       ├── functions.js
│       └── router.js
│
├── RAG/                               # Python FastAPI AI server
│   ├── main.py                       # Full RAG pipeline + 20 API endpoints
│   ├── requirements.txt
│   ├── Readme.md
│   ├── law_sections.json             # Cached extracted law sections
│   ├── law_embeddings.npy            # Cached section embeddings
│   ├── law_faiss.index               # FAISS vector index
│   ├── bns_sections.json             # BNS-specific section cache
│   ├── bns_embeddings.npy            # BNS-specific embeddings
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
└── README.md                         # Full project documentation (1378 lines)
```

---

## 4. Database Models

### User (`UserModel.js`)
- **Collection**: `users`
- **Fields**: `fullName` (required), `email` (unique, lowercase), `password` (bcrypt hashed), `userType` ("user"|"consultant"), `phone`, `organization`, `location`, `bio` (max 500), `role` (default: "Client"), `barId`, `createdAt`
- **Pre-save hook**: Automatically hashes password with bcrypt (salt rounds: 10)
- **Methods**: `matchPassword(enteredPassword)`, `toJSON()` (strips password)

### Consultant (`ConsultantModel.js`)
- **Collection**: `consultants`
- **Fields**: `fullName` (required), `email` (unique), `password` (bcrypt hashed), `licenseNumber` (unique, required), `barRegistration` (required), `specialization` (enum: criminal/civil/corporate/family/intellectual/labor/tax/other), `professionalSummary` (max 500), `experience`, `languages`, `consultationFee`, `availability`, `photoUrl`, `isVerified` (default: false), `rating` (0-5), `totalClients`, `createdAt`
- **Pre-save hook**: Same as User
- **Methods**: `matchPassword()`, `toJSON()`

### Chat (`ChatModel.js`)
- **Collection**: `chats`
- **Fields**: `title`, `isDirect` (default: true), `participants` (array of `{ participant: ObjectId refPath, participantModel: "User"|"Consultant" }`), `messages` (array of `{ sender, senderModel, content (max 4000), timestamp }` with `_id`), `lastMessage`, `lastMessageAt`
- **Indexes**: `participants.participant + participantModel`, `updatedAt`
- Polymorphic: Uses `refPath` to dynamically reference User or Consultant model

### CaseAnalysis (`CaseAnalysisModel.js`)
- **Collection**: `caseanalyses`
- **Fields**: `userId` (ref User, indexed), `type` ("case"|"contract"|"summary"), `title` (max 200, required), `description` (max 5000), `aiAnswer`, `sections` (array of `{ document, section_number, title, snippet, punishment_summary, score }`), `userRights` ([String]), `legalSteps` ([String]), `riskScore` (0-100)
- **Indexes**: `userId + type`

### Appointment (`AppointmentModel.js`)
- **Collection**: `appointments`
- **Fields**: `consultantId` (ref Consultant), `clientId` (ref User), `clientName`, `consultationType` (Chat|Video|Office Meeting|Phone Call), `caseType`, `date` (YYYY-MM-DD), `time` (HH:MM), `status` (confirmed|rescheduled|pending)
- **Indexes**: `consultantId + date`

### ConsultationRequest (`ConsultationRequestModel.js`)
- **Collection**: `consultationrequests`
- **Fields**: `consultantId` (ref Consultant), `clientId` (ref User), `clientName`, `legalCategory`, `requestedDate`, `message`, `status` (pending|accepted|rejected)
- **Indexes**: `consultantId + status`

### ForumPost (`ForumPostModel.js`)
- **Collection**: `forumposts`
- **Fields**: `title` (max 200), `content` (max 5000), `category`, `tags` ([String]), `author`, `authorAvatar` (max 4 chars), `authorReputation`, `authorRole` (member|lawyer), `replies`, `upvotes`, `views`, `solved`
- **Indexes**: Text index on `title + content + category + tags`

### ForumReply (`ForumReplyModel.js`)
- **Collection**: `forumreplies`
- **Fields**: `postId` (ref ForumPost), `user`, `role` (member|lawyer), `avatar`, `reputation`, `text` (max 5000, required), `upvotes`, `isBestAnswer` (boolean)
- **Indexes**: `postId + createdAt`

### LearningProgress (`LearningProgressModel.js`)
- **Collection**: `learningprogresses`
- **Fields**: `userId` (ref User, unique, indexed), `dailyStreak` (embedded: `current`, `longest`, `lastActive`), `lessons` (array of embedded: `lessonId`, `lessonTitle`, `completed`, `completedAt`, `quizAnswers[{questionId, selectedOption, correct}]`, `quizScore`, `quizTotal`, `source` enum "static"|"news"|"rag")
- **Unique index**: `userId` (one progress document per user)
- Daily streak computed server-side by comparing consecutive active dates

---

## 5. API Reference

### Authentication Routes (`/api/auth`) — `/backend/routes/authRoutes.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register-user` | No | Register citizen |
| POST | `/login-user` | No | Login citizen → JWT |
| POST | `/register-consultant` | No | Register lawyer (extra fields) |
| POST | `/login-consultant` | No | Login lawyer → JWT |
| GET | `/me` | Yes | Get current user/consultant profile |
| POST | `/logout` | Yes | Logout (client-side token removal) |
| GET | `/consultants` | No | List verified consultants (optional `?specialization=`) |
| GET | `/consultant/:id` | No | Get consultant by ID |

**JWT Payload**: `{ id, email, userType }` — 7-day expiry, HS256 signed

### User Routes (`/api/user`) — `/backend/routes/userRoutes.js`
*All require JWT auth*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Get own profile |
| PUT | `/profile` | Update profile (fullName, phone, org, location, bio, role, barId) |
| GET | `/stats` | Dashboard stats (totalCases, totalContracts, totalSummaries, totalChats) |
| GET | `/analyses` | List saved AI analyses (`?type=case\|contract\|summary`) |
| GET | `/analyses/:id` | Get single analysis (full details) |
| POST | `/analyses` | Save a new AI analysis result |
| DELETE | `/analyses/:id` | Delete own analysis |

### Lawyer Routes (`/api/lawyer`) — `/backend/routes/lawyerRoutes.js`
*All require JWT auth (consultant role)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard stats (today's appointments, pending requests, clients, earnings) |
| GET | `/profile` | Get lawyer profile |
| PUT | `/profile` | Update profile |
| GET | `/appointments` | List appointments (`?date=YYYY-MM-DD`) |
| POST | `/appointments` | Create appointment |
| PATCH | `/appointments/:id/status` | Update appointment status |
| DELETE | `/appointments/:id` | Delete appointment |
| GET | `/consultation-requests` | List requests (`?status=pending`) |
| POST | `/consultation-requests` | Create request (by user) |
| PATCH | `/consultation-requests/:id/status` | Approve/reject request |
| GET | `/case-files` | List uploaded case files |
| POST | `/case-files` | Upload file (multipart/form-data, 10MB max) |
| GET | `/case-files/:id/download` | Download file (`?token=` supported) |
| DELETE | `/case-files/:id` | Delete file |

### Chat Routes (`/api/chats`) — `/backend/routes/chatRoutes.js`
*All require JWT auth*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/lawyers` | List available lawyers (`?specialization=&search=&verifiedOnly=`) |
| GET | `/clients` | List clients (consultant-only, `?search=`) |
| POST | `/` | Create or get existing direct chat |
| GET | `/` | List my chats |
| GET | `/:chatId` | Get chat by ID (participant access check) |
| POST | `/:chatId/messages` | Send message via REST |
| DELETE | `/:chatId` | Delete chat |

### Microlearning Routes (`/api/user/microlearning`) — `/backend/routes/microlearningRoutes.js`
*All require JWT auth*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/progress` | Fetch user's learning progress (lessons, daily streak) |
| POST | `/progress/lesson` | Mark lesson as completed (auto-updates daily streak) |
| POST | `/progress/quiz` | Save quiz answers, score, and total |

### Tool Routes (`/api/tools`) — `/backend/routes/toolRoutes.js`
*All require JWT auth — forward to RAG + auto-save to DB*

| Method | Path | Description |
|--------|------|-------------|
| POST | `/case-analyzer` | Analyze case → RAG → auto-save → return with `savedAnalysisId` |
| POST | `/contract-risk` | Analyze contract risk → RAG → auto-save → return with risk score |
| POST | `/case-summarizer` | Summarize document → RAG → auto-save → return |

### Forum Routes (`/api/forum`) — `/backend/routes/forumRoutes.js`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/topics/trending` | Get trending topic tags |
| GET | `/posts` | List/search posts (`?q=&category=&tag=&sort=&page=&limit=`) |
| GET | `/posts/:id` | Get post detail |
| POST | `/posts` | Create post |
| POST | `/posts/:id/upvote` | Upvote post |
| GET | `/posts/:id/replies` | List replies for post |
| POST | `/posts/:id/replies` | Create reply |
| POST | `/replies/:replyId/upvote` | Upvote reply |
| POST | `/posts/:id/mark-helpful` | Mark reply as best answer |

### Extension Routes (`/api/extension`) — `/backend/routes/extensionRoutes.js`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze-tc` | Analyze Terms & Conditions document → NVIDIA LLM |
| POST | `/legal-chat` | IndianLegal Chat (message + OCR context + history) → NVIDIA LLM |
| POST | `/upload-image` | Upload image to Cloudinary (multipart) |
| POST | `/ocr` | Extract text from image via Tesseract.js (multipart) |

### Other Backend Endpoints — Inline in `/backend/index.js`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-room` | Create UUID video call room + notify all online lawyers |
| POST | `/api/call` | Trigger Twilio phone call to a number |
| POST | `/api/extension/analyze-tc` | (Deprecated — moved to extension routes) |

### Image Analysis Routes (`/api/`) — `/backend/routes/analyzeImageRoutes.js`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze-image` | Analyze image text via NVIDIA LLM |

### RAG API Endpoints (`/RAG/main.py`) — `http://localhost:8000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | HTML landing page |
| POST | `/ask` | **Primary AI Q&A** → returns answer + sections + IK results |
| GET | `/query` | Alternative GET-based Q&A |
| POST | `/microlearning/ask` | Microlearning-specific Q&A |
| POST | `/tools/case-analyzer` | Case analysis (called by backend /api/tools/case-analyzer) |
| POST | `/tools/contract-risk` | Contract risk analysis |
| POST | `/tools/case-summarizer` | Document summarization |
| GET | `/section/{number}` | Get specific section with AI explanation |
| GET | `/sections` | List/search sections (`?keyword=&limit=`) |
| GET | `/punishment` | Find punishment (`?offense=`) |
| GET | `/ik/search` | Search Indian Kanoon (`?q=`) |
| GET | `/ik/doc/{doc_id}` | Fetch full case document |
| GET | `/ik/docmeta/{doc_id}` | Fetch document metadata |
| GET | `/ik/case/{doc_id}/summary` | AI case summary |
| GET | `/ik/fragment/{doc_id}` | Matching fragments from case |
| GET | `/ik/case/{doc_id}/sections` | Case broken into sections |
| POST | `/ik/case/{doc_id}/ask` | Ask LLM about a case section |
| GET | `/law-awareness/rights` | List fundamental rights articles |
| GET | `/law-awareness/rights/{article_id}` | Get detailed rights article |
| POST | `/legal-news/trending` | Fetch trending legal news from Indian Kanoon (multiple queries merged) |
| POST | `/legal-news/to-lesson` | News → legal topic → sections → explanation → microlearning lesson |
| GET | `/stats` | Index statistics |

---

## 6. Data Flows

### Authentication Flow
```
Register/Login → POST /api/auth/register-user (or login-user)
  → bcrypt hash on register, JWT signed with JWT_SECRET (7d expiry)
  → Returns { token, user/consultant }
  → Frontend stores token + userType in localStorage
  → All API calls: Authorization: Bearer <token>
  → authMiddleware.js verifies token, attaches req.user = { id, email, userType }
  → Logout: clears localStorage, redirects to /auth
```

### AI Legal Chat (RAG Q&A)
```
User types question in chat/page.tsx
  → POST http://localhost:8000/ask { question, top_k: 7 }
  → RAG Server (main.py):
    1. Embed query with BAAI/bge-base-en-v1.5
    2. FAISS top-60 vector search across statute sections
    3. CrossEncoder reranks to top-7 with hybrid score: 0.35×vector + 0.65×rerank
    4. Relevant sections → context window
    5. Retrieve top Indian Kanoon results for supplementary case law
    6. Qwen2.5-7B-Instruct generates grounded answer with citations
  → Response { ai_answer, supporting_sections[], user_rights[], legal_steps[], indian_kanoon_results[] }
  → FormattedAiText renders markdown (headings, bold, bullets, numbers, blockquotes)
```

### Contract Risk Analysis
```
User pastes contract text → client computes preliminary riskScore (0-100) from keyword counting
  → POST http://localhost:8000/tools/contract-risk { contract_text }
  → RAG returns { risk_score, risk_level, flagged_clauses[], ai_answer, supporting_sections }
  → Auto-saves to backend: POST http://localhost:4000/api/user/analyses { type: "contract", ... }
  → Frontend renders:
    - Risk score bar (green <40, amber 40-70, red >70)
    - Full View: contract text with <mark> highlights on flagged wording
    - Harmful Clauses: per-clause cards with fuzzy-matched excerpt from contract text
  → PDF export via jsPDF
```

### Case Analyzer + Case Summarizer
```
User pastes case description / legal document → calls RAG via backend proxy
  → POST /api/tools/case-analyzer (or /case-summarizer)
  → ToolController forwards to RAG, auto-saves to CaseAnalysis collection
  → Returns { ai_answer, supporting_sections[], savedAnalysisId }
  → Saved analyses appear in Cases / Summaries / Downloads pages
  → PDF export + localStorage "My Chats" history
```

### Lawyer-Client Real-time Chat
```
Client opens chat → Socket.IO connect (JWT in handshake.auth.token)
  → emit('join-chat-room', { chatId }) — server verifies participant in DB
  → emit('send-chat-message', { chatId, content }) — server persists to MongoDB
  → io.to(`chat:${chatId}`).emit('chat-message-realtime', payload)
  → Messages saved to ChatModel.messages[] — DB is source of truth
```

### Video Call (WebRTC)
```
User clicks "Start Call"
  → POST /create-room → receives { roomId }
  → Joins Socket.IO room as 'user' role
  → Server notifies ALL registered lawyers via 'incoming-call' event
  
Lawyer dashboard (layout.tsx):
  → Persistent Socket.IO listener on all pages
  → Receives 'incoming-call' → animated toast notification (60s auto-dismiss)
  → Clicks Accept → navigates to /session/[roomId]/video?role=lawyer

Both peers in same room:
  → WebRTC signaling via Socket.IO: offer/answer/ice-candidate
  → Peer-to-peer video/audio stream (Google STUN servers)
  → In-call text chat relayed via Socket.IO 'chat-message' event
  → useVideoCall hook manages full lifecycle (local/remote video, mute, camera, messages)
```

### Case File Upload (Lawyer)
```
Lawyer uploads file → POST /api/lawyer/case-files (multipart/form-data)
  → Multer stores in /backend/uploads/ with filename: {consultantId}_{clientName}_{originalname}
  → File filter: .pdf .doc .docx .jpg .jpeg .png .txt, max 10MB
  → Files listed/downloadable/deletable only by owning consultant
  → Download supports ?token= query param for <a> tag links
```

### T&C Analyzer (Chrome Extension)
```
User visits any site with T&C / privacy text (auto-detected by keywords)
  → content.js extracts page text (up to 20K chars from relevant DOM selectors)
  → Injects floating banner (bottom-right) with "Analyzing..." spinner
  → POST http://localhost:4000/api/extension/analyze-tc { documentText }
  → Backend calls NVIDIA Nemotron-3 120B LLM with T&C analysis prompt
  → Returns { riskLevel, summary, redFlags[], recommendation }
  → Banner updates with risk score (color-coded), summary, flagged clauses, recommendation
  → Popup "Analyze Current Page" button triggers same flow manually
```

### IndianLegal Chat (Chrome Extension)
```
User opens popup → Chat tab
  → Types a legal question OR uploads a document screenshot
  → Screenshot upload:
    1. Sent to POST /api/extension/ocr → Tesseract.js extracts text
    2. Also uploaded to Cloudinary (POST /api/extension/upload-image)
    3. OCR text shown in preview bar
  → POST /api/extension/legal-chat { message, ocrText?, history[] }
  → Backend calls NVIDIA Nemotron-3 120B with legal system prompt + chat history
  → Returns AI reply → displayed in chat
  → Chat history persisted in chrome.storage.local
```

### News → Legal Topic → Microlearning Lesson
```
User visits news page → fetches live from RAG POST /legal-news/trending
  → IK trending searches (Supreme Court, High Court, rights, criminal law queries)
  → Deduplicates, returns up to 10 news items with headline/summary/category/date

User clicks a news item → /free-tools/news/[id] page
  → POST http://localhost:8000/legal-news/to-lesson { news_id, headline, summary, category }
  → RAG Server (main.py):
    1. Retrieves relevant statute sections via FAISS + CrossEncoder
    2. Searches Indian Kanoon for supplementary case law
    3. LLM identifies legal topic (e.g. "Right to Privacy", "Bail")
    4. LLM generates explanation connecting news to legal provisions
    5. LLM generates microlearning lesson (title, law text, simple explanation, scenario)
    6. LLM generates 2 quiz questions with 4 options each
  → Response: { news_id, headline, legal_topic, sections[], explanation, lesson_title,
                  lesson_law_text, lesson_simple_explanation, lesson_scenario,
                  lesson_quiz[], case_references[], model_used }
  → User views 4 tabs: Explanation, Legal Sections, Micro Lesson, Quiz
  → Quiz answers + lesson completion saved to backend progress API
  → Daily streak auto-updated on lesson completion
```

### Forum
```
REST-based community forum:
  → GET /api/forum/posts — paginated, searchable by q/category/tag/sort
  → POST /api/forum/posts — create post (title, content, category, tags)
  → POST /api/forum/posts/:id/replies — add reply
  → POST /api/forum/posts/:id/upvote — upvote post
  → POST /api/forum/replies/:replyId/upvote — upvote reply
  → POST /api/forum/posts/:id/mark-helpful — mark reply as best answer
  → GET /api/forum/topics/trending — trending tags (aggregated from recent posts)
  Note: Frontend uses static mock data from lib/forum-data.ts by default
```

---

## 7. Feature Details

### User Dashboard Features
| Feature | Route | What it does |
|---------|-------|-------------|
| Dashboard Overview | `/dashboard` | Typewriter AI search bar, quick-action cards, daily streak card, recent stats |
| AI Legal Chat | `/chat` | Conversational Q&A via RAG; suggested questions, markdown output |
| AI Case Analyzer | `/tools/case-analyzer` | Upload/paste case → BNS sections + Indian Kanoon judgments |
| Contract Risk Analyzer | `/tools/risk-analyzer` | Upload/paste contract → risk score, flagged clauses, highlights |
| Case File Summarizer | `/tools/case-summarizer` | Upload FIR/chargesheet/court order → plain-English summary |
| Saved Cases | `/cases` | All tool analyses auto-saved to DB |
| Saved Contracts | `/contracts` | Full-view + harmful-clause-view per saved contract |
| Saved Summaries | `/summaries` | All document summaries |
| Downloads | `/downloads` | PDF download history (localStorage, max 15 entries) |
| Consultation (Chat + Video) | `/chats/new` | Select lawyer → Pay → Real-time chat or WebRTC video call |
| Community Forum | `/community` | Posts, replies, upvotes, categories, reputation |
| Know Your Rights | `/free-tools/law-awareness` | 5 constitutional rights guides (Art 14, 19, 21, 22, 32) |
| Microlearning | `/microlearning` | Bite-sized legal lessons by topic; progress saved to backend |
| Legal News | `/free-tools/news` | Curated legal news headlines (live from Indian Kanoon via RAG) |
| News Detail | `/free-tools/news/[id]` | Full news → legal topic → sections → explanation → microlearning lesson pipeline |
| Profile | `/profile` | Edit personal details |
| Settings | `/settings` | Account settings |

### Lawyer Dashboard Features
| Feature | Route | What it does |
|---------|-------|-------------|
| Overview | `/lawyer-dashboard` | Today's appointments, pending requests, clients, earnings |
| Appointments | `/lawyer-dashboard/appointments` | Full CRUD calendar |
| Consultation Requests | `/lawyer-dashboard/consultations` | Accept/reject with notes |
| Client Chat | `/lawyer-dashboard/chat` | Real-time text chat with clients |
| Case Files | `/lawyer-dashboard/case-files` | Upload, list, download, delete |
| Profile | `/lawyer-dashboard/profile` | Edit specialization, fee, languages |
| Incoming Call | (layout-level) | Animated toast with Accept/Decline (60s timeout) |

### Chrome Extension Features (T&C Analyzer + IndianLegal Chat)
| Feature | What it does |
|---------|-------------|
| T&C Auto-Detect | Automatically detects Terms & Conditions pages by keywords, extracts text, and analyzes via NVIDIA LLM |
| T&C Popup | "Analyze Current Page" button in extension popup triggers manual analysis |
| IndianLegal Chat | Legal AI chat in popup — ask questions about Indian law |
| Screenshot OCR | Upload a screenshot of any legal document → Tesseract.js extracts text |
| Cloudinary Storage | Uploaded screenshots stored on Cloudinary for reference |
| Chat History | Conversations persisted in chrome.storage.local |

---

## 8. RAG Pipeline Details

**Indexed Documents** (6 PDFs):
- Bharatiya Nyaya Sanhita (BNS) 2023
- Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023
- Bharatiya Sakshya Adhiniyam (BSA) 2023
- Motor Vehicles Act
- Corporate Laws
- Securities Laws

**Indexing Process** (at startup):
1. Extract text from all 6 PDFs using `pdfplumber`
2. Split into overlapping 220-word chunks (40-word overlap)
3. Embed each chunk with `BAAI/bge-base-en-v1.5` SentenceTransformer
4. Store in FAISS `IndexFlatIP` (inner product / cosine similarity)
5. Cache artifacts to disk: `law_sections.json`, `law_embeddings.npy`, `law_faiss.index`

**Retrieval:**
1. Embed query with same model
2. FAISS retrieves top 60 candidates by vector similarity
3. CrossEncoder reranks all 60 pairs (query, chunk)
4. Hybrid score = `0.35 × vector_norm + 0.65 × reranker_sigmoid`
5. Filter: keep only hybrid score > 0.35
6. Return top `top_k` (default 7) results

**Generation:**
- Context: retrieved section texts + Indian Kanoon results
- LLM: `Qwen/Qwen2.5-7B-Instruct` via Bytez SDK
- System prompt: cites Act names and section numbers
- Returns: `ai_answer`, `supporting_sections[]`, `user_rights[]`, `legal_steps[]`, `indian_kanoon_results[]`

---

## 9. Real-Time Communication (Socket.IO)

**Connection**: All Socket.IO connections require valid JWT in `socket.handshake.auth.token`

### Events — Lawyer-Client Chat
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-chat-room` | Client → Server | `{ chatId }` | Join chat (verifies participant) |
| `send-chat-message` | Client → Server | `{ chatId, content }` | Send + persist to MongoDB |
| `chat-message-realtime` | Server → Room | `{ _id, sender, senderModel, content, timestamp, chatId }` | Broadcast to all in room |

### Events — Video Call Signalling
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `register-lawyer` | Lawyer → Server | — | Register for incoming call notifications |
| `join-room` | All → Server | `{ roomId, role }` | Join WebRTC room |
| `incoming-call` | Server → Lawyers | `{ roomId, callerName, timestamp }` | Notify all online lawyers |
| `peer-joined` | Server → Room | `{ role, socketId }` | Other peer joined |
| `offer` | Peer ↔ Server ↔ Peer | `{ roomId, offer }` | WebRTC SDP offer relay |
| `answer` | Peer ↔ Server ↔ Peer | `{ roomId, answer }` | WebRTC SDP answer relay |
| `ice-candidate` | Peer ↔ Server ↔ Peer | `{ roomId, candidate }` | ICE candidate relay |
| `chat-message` | Peer ↔ Server ↔ Room | `{ roomId, message, sender }` | In-call text chat |
| `peer-left` | Server → Room | `{ role }` | Peer disconnected |

**States**: In-memory `rooms` Map with `{ user, lawyer, createdAt }` — stale rooms cleaned every 30 min.

---

## 10. Frontend API Helpers

### `client/lib/userApi.ts`
- `fetchUserProfile()`, `updateUserProfile(data)`
- `fetchUserDashboardStats()`
- `fetchAnalyses(type?)`, `fetchAnalysisById(id)`, `saveAnalysis(payload)`, `deleteAnalysis(id)`
- `ragAsk(question, top_k)` — direct call to RAG server
- `toolCaseAnalyzer(caseText)` — via backend proxy + auto-save
- `toolContractRisk(contractText)` — via backend proxy + auto-save
- `toolCaseSummarizer(documentText)` — via backend proxy + auto-save
- `fetchRightsLawAwareness()`, `fetchRightsLawArticle(articleId)` — from RAG server
- `fetchTrendingNews()` — live legal news from RAG POST /legal-news/trending
- `fetchNewsToLesson(payload)` — convert news to full lesson from RAG POST /legal-news/to-lesson
- `fetchLearningProgress()` — fetch user's learning progress from backend
- `saveLessonProgress(payload)` — mark lesson complete, auto-updates daily streak
- `saveQuizProgress(payload)` — save quiz answers/score

### `client/lib/lawyerApi.ts`
- `fetchStats()`, `fetchLawyerProfile()`, `updateLawyerProfile(data)`
- `fetchAppointments(date?)`, `createAppointment(data)`, `updateAppointmentStatus(id, status)`, `deleteAppointment(id)`
- `fetchConsultationRequests(status?)`, `updateConsultationStatus(id, status)`
- `fetchCaseFiles()`, `uploadCaseFile(file, clientName)`, `getCaseFileDownloadUrl(fileId)`, `deleteCaseFile(fileId)`

### `client/lib/chatApi.ts`
- `getToken()` — reads from localStorage
- `fetchMyChats()`, `fetchChatById(chatId)`, `deleteChatById(chatId)`
- `fetchConsultants()`, `fetchClients()`
- `createOrGetDirectChat({ participantId, participantModel, initialMessage })`

### `client/lib/exportPdf.ts`
- `exportTextAsPdf(fileName, title, lines)` — generates PDF via jsPDF, auto-saves to localStorage download history

### `client/lib/downloadHistory.ts`
- `getPdfDownloads()`, `savePdfDownload(record)`, `removePdfDownload(id)`, `redownloadPdf(record)`
- Storage key: `ebench_pdf_downloads`, max 15 entries

### `client/lib/documentText.ts`
- `extractTextFromFile(file)` — extracts text from PDF (pdfjs-dist), DOCX (mammoth), TXT/MD
- Max file size: 20MB

---

## 11. Authentication & Security

- **Password hashing**: bcrypt with 10-12 salt rounds (auto-hashed in pre-save hooks)
- **JWT**: HS256, 7-day expiry, signed with `JWT_SECRET` env variable
- **JWT Payload**: `{ id, email, userType }`
- **Socket.IO**: JWT validated on every connection via `io.use()` middleware
- **File uploads**: Allowed types `.pdf .doc .docx .jpg .jpeg .png .txt`, max 10MB, filenames sanitized
- **File scoping**: Files prefixed with `consultantId` — only owning consultant can access
- **Authorization scoping**: All controllers filter by `req.user.id`
- **CORS**: Backend allows `http://localhost:3000`; RAG allows `localhost:3000` and `127.0.0.1:3000`

---

## 12. Key Design Decisions

1. **Separate User and Consultant models** — distinct schemas for citizens vs. lawyers, though auth routes in `authRoutes.js` use separate endpoints for each
2. **Polymorphic chat** — single `ChatModel` handles User↔Consultant via `refPath` in Mongoose
3. **Backend proxies AI tools** — `/api/tools/*` routes forward to RAG + auto-save results to `CaseAnalysis` collection, avoiding separate save calls from frontend
4. **Frontend calls RAG directly** for `/ask` (AI legal chat) — no backend proxy needed for real-time Q&A
5. **Hybrid retrieval** — FAISS + CrossEncoder combination outperforms pure vector search for legal queries
6. **WebRTC peer-to-peer** — video calls don't route through server; backend only handles signaling
7. **localStorage persistence** — chat history (`ebench_chats`), PDF downloads (`ebench_pdf_downloads`), video call history, AI chat IDs
8. **Static mock data** — Forum and microlearning use static data from `lib/forum-data.ts` and `lib/microlearning-data.ts`; API routes exist but aren't fully wired
9. **Live legal news** — News page fetches from RAG POST /legal-news/trending (Indian Kanoon API); news detail dynamically generates microlearning lessons
10. **Backend learning progress** — `LearningProgressModel` persists lesson completions and daily streak server-side; frontend falls back to localStorage if backend unreachable
11. **Dark/light theme** — inline CSS-in-JS with CSS custom properties, toggle stored in sidebar layout
12. **Socket.IO in lawyer layout** — persistent listener across all lawyer pages for incoming call notifications
13. **Google Translate widget** — on-page translation via `googtrans` cookie approach; available in English, Hindi, Marathi in both sidebar and navbar
14. **Chrome Extension as standalone product** — T&C Analyzer and IndianLegal Chat work independently of the main web app, calling backend NVIDIA API directly

---

## 13. Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret for signing JWT tokens |
| `PORT` | Backend | Server port (default 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend base URL (default http://localhost:4000) |
| `NEXT_PUBLIC_RAG_URL` | Frontend | RAG server base URL (default http://localhost:8000) |
| `RAG_BASE_URL` | Backend | RAG server URL for tool controller (default http://localhost:8000) |
| `NVIDIA_API_KEY` | Backend | API key for NVIDIA Nemotron LLM (T&C analysis, legal chat) |
| `CLOUDINARY_CLOUD_NAME` | Backend | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Backend | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend | Cloudinary API secret |

**Hardcoded in RAG/main.py** (move to env for production):
- `BYTEZ_API_KEY` — API key for Bytez LLM inference
- `IK_API_TOKEN` — API token for Indian Kanoon

---

## 14. Getting Started

```bash
# Prerequisites: Node.js ≥ 18, Python ≥ 3.10, MongoDB

# 1. Start MongoDB
mongod

# 2. Start Backend
cd backend
npm install
# Create backend/.env: MONGODB_URI, JWT_SECRET, PORT=4000
npm run dev    # → http://localhost:4000

# 3. Start RAG AI Server
cd RAG
pip install -r requirements.txt
uvicorn main:app --reload --port 8000  # → http://localhost:8000

# 4. Start Frontend
cd client
npm install
npm run dev    # → http://localhost:3000
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| RAG AI API | http://localhost:8000 |
| RAG Docs (Swagger) | http://localhost:8000/docs |
