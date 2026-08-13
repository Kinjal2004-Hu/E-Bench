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
            │  Nemotron-3 120B via NVIDIA NIM + Indian Kanoon API      │
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
| Framework | FastAPI (Python) — async endpoints with `asyncio.gather` for parallel IO |
| Embeddings | sentence-transformers — BAAI/bge-large-en-v1.5 (1024-dim) |
| Vector Search | FAISS (IndexFlatIP, inner product), top-30 retrieval |
| Reranker | CrossEncoder ms-marco-MiniLM-L-12-v2 |
| LLM | NVIDIA Nemotron-3 Super 120B (via NVIDIA NIM API) |
| Case Law | Indian Kanoon REST API (api.indiankanoon.org) |
| PDF Extraction | pdfplumber |
| **Semantic RAG** | **Structured extraction: section → sub-clause → example** |
| **Diversity** | MMR (Max Marginal Relevance, λ=0.5) via FAISS reconstruct |
| **Caching** | `@lru_cache(maxsize=256)` on retrieval for frequent queries |
| **Persistence** | MongoDB `lessons` collection for generated microlearning content |

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
│   │   │   ├── laws/                  # Law browser (per-law FAISS)
│   │   │   │   ├── page.tsx           # Law listing with domain filter + search
│   │   │   │   └── [lawId]/
│   │   │   │       ├── page.tsx       # Law detail with provision list
│   │   │   │       └── provisions/
│   │   │   │           └── [number]/page.tsx # Provision detail + AI enrichment
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
│   │   │   ├── legal-chat/page.tsx     # AI Legal Chat (wrapper around AiLegalChatPage)
│   │   │   ├── case-analyzer/page.tsx  # AI Case Analyzer (wrapper around CaseAnalyzerPage)
│   │   │   ├── risk-analyzer/page.tsx  # Contract Risk Analyzer (wrapper around RiskAnalyzerPage)
│   │   │   ├── contracts/page.tsx      # Saved contracts (wrapper around ContractsPage)
│   │   │   ├── legal-news/page.tsx     # Legal news feed (wrapper around LegalNewsPage)
│   │   │   ├── community/              # Community forum
│   │   │   │   ├── page.tsx            # Forum listing (wrapper around CommunityForumPage)
│   │   │   │   ├── ask/page.tsx        # Ask question (wrapper around AskQuestionPage)
│   │   │   │   └── post/[id]/page.tsx  # Post detail (wrapper around PostDetailPage)
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
│   │   ├── PaymentModal.tsx           # Slot booking + consultation payment flow (demo)
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
│   │   ├── tools/                     # Shared dashboard tool pages
│   │   │   ├── AiLegalChatPage.tsx
│   │   │   ├── CaseAnalyzerPage.tsx
│   │   │   ├── RiskAnalyzerPage.tsx
│   │   │   ├── ContractsPage.tsx
│   │   │   ├── LegalNewsPage.tsx
│   │   │   ├── CommunityForumPage.tsx
│   │   │   ├── AskQuestionPage.tsx
│   │   │   └── PostDetailPage.tsx
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
│   │   ├── microlearning-data.ts     # Microlearning lesson topic definitions (content generated by RAG LLM)
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
│   ├── main.py                       # Full RAG pipeline + 24 API endpoints (Semantic RAG + per-law)
│   ├── build_corpus.py               # Phase 1: per-PDF extraction with 5 parser strategies
│   ├── build_faiss.py                # Phase 2: per-law FAISS indexing (bge-base-en-v1.5, 768-dim)
│   ├── build_master_index.py         # Phase 3: master_index.json builder
│   ├── build_curated.py              # Phase 4: rule-based curated content per provision
│   ├── requirements.txt
│   ├── Readme.md
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
- **Fields**: `consultantId` (ref Consultant), `clientId` (ref User), `clientName`, `legalCategory`, `requestedDate` (YYYY-MM-DD), `requestedTime` (HH:MM), `consultationType` (Chat|Video|Office Meeting|Phone Call), `message`, `status` (pending|accepted|rejected)
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
| POST | `/microlearning/generate` | Generate full lesson via LLM + RAG retrieval (persisted to MongoDB) |
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
| GET | `/laws` | List all 18 indexed laws from `master_index.json` |
| GET | `/laws/{law_id}` | Law detail (`?include_provisions=true` to include provision list) |
| GET | `/laws/{law_id}/provisions/{number}` | Single provision detail with curated content |
| POST | `/laws/{law_id}/provisions/{number}/enrich` | On-demand Nemotron enrichment for doctrines/use_cases/important_concepts (cached) |
| POST | `/ask/routed` | Ask with law filter (`law_ids: ["bns_2023", "it_act_2000"]`) — uses per-law FAISS |

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
    1. Embed query with BAAI/bge-large-en-v1.5
    2. FAISS top-30 vector search across statute sections
    3. CrossEncoder reranks to top-7 with hybrid score: 0.35×vector + 0.65×rerank
    4. MMR diversity selects diverse sections
    5. Relevant sections → context window
    5. Retrieve top Indian Kanoon results for supplementary case law
    6. Nemotron-3 generates grounded answer with citations
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

### Slot Booking (User → Lawyer Consultation Request)
```
User selects lawyer in /chats/new
  → Clicks "Book Consultation"
  → PaymentModal opens with date picker, time slots (9AM–5PM, 30-min intervals), case type, notes
  → User selects date/time/case-type/notes and chooses Video or Chat session type
  → "Pay &amp; Book Slot" click:
    1. POST /api/lawyer/consultation-requests { consultantId, legalCategory, requestedDate, requestedTime, consultationType, message }
    2. Backend creates ConsultationRequest document in MongoDB with status: "pending"
    3. Demo payment simulation (1.8s timeout)
    4. On success: creates chat room or video call room
  → Lawyer sees it in lawyer-dashboard under "Pending Consultation Requests"
  → Table columns: Client Name, Type (Video/Chat), Date, Time, Legal Category, Message, Status, Actions (Accept/Reject)
  → Lawyer accepts → status changes to "accepted" in DB
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
| Law Browser | `/laws` | Browse 18 indexed laws, domain filtering, search, provision detail with AI enrichment |
| Consultation (Chat + Video) | `/chats/new` | Select lawyer → book date/time slot + case type + notes → Pay → Real-time chat or WebRTC video call; slot saved to ConsultationRequests in MongoDB |
| Community Forum | `/community` | Posts, replies, upvotes, categories, reputation |
| Know Your Rights | `/free-tools/law-awareness` | 5 constitutional rights guides (Art 14, 19, 21, 22, 32) |
| Microlearning | `/microlearning` | Bite-sized legal lessons by topic; per-lesson AI-generated RAG Q&A; lesson-specific quiz questions; progress synced with backend API |
| Legal News | `/free-tools/news` | Curated legal news headlines (live from Indian Kanoon via RAG) |
| News Detail | `/free-tools/news/[id]` | Full news → legal topic → sections → explanation → microlearning lesson pipeline; completed news lessons appear in microlearning library |
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
| AI Legal Chat | `/lawyer-dashboard/legal-chat` | AI legal chat (shared component with user dashboard) |
| Case Analyzer | `/lawyer-dashboard/case-analyzer` | AI case analysis (shared component) |
| Risk Analyzer | `/lawyer-dashboard/risk-analyzer` | Contract risk analysis (shared component) |
| Contracts | `/lawyer-dashboard/contracts` | Saved contracts (shared component) |
| Law Browser | `/laws` | Browse indexed laws with provision detail and AI enrichment (shared with user dashboard) |
| Legal News | `/lawyer-dashboard/legal-news` | Legal news feed (shared component) |
| Community Forum | `/lawyer-dashboard/community` | Community forum (shared component, includes ask + post detail) |
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
2. Parse each section into structured components:
   - **Section header** (`N. Title`) detected via regex `^(\d{1,4})\.\s+(.+)`
   - **Sub-clauses** detected via `(1)`, `(2)` (numbered), `(a)`, `(b)` (lettered), `(i)`, `(ii)` (roman) patterns at word boundaries
   - **Explanations** detected via `Explanation.` / `Explanation N.` markers
   - **Illustrations/Examples** detected via `Illustrations.` with `(a)`, `(b)` sub-items
   - **Preamble** text before first sub-clause in each section
3. Build corpus from sub-clause level entries (not blind 220-word chunks):
   - Each sub-clause becomes an independent corpus entry prefixed with full context: `"Document Section N(ID) Title: text"`
   - Each illustration becomes a separate corpus entry: `"Document Section N Title - illus_id: text"`
   - Sections with no sub-clauses use full text as a single entry
4. Embed each corpus entry with `BAAI/bge-large-en-v1.5` SentenceTransformer
5. Store in FAISS `IndexFlatIP` (inner product / cosine similarity)
6. Maintain a `CORPUS_META` mapping to trace each embedding back to its parent section + sub-clause/example
7. Cache artifacts to disk: `law_sections.json` (structured), `law_embeddings.npy`, `law_faiss.index`

**Structured Data Format** (`law_sections.json`):
```json
{
    "document": "BNS",
    "section": 4,
    "title": "Punishments",
    "page": 2,
    "full_text": "...",
    "sub_clauses": [
        {"id": "1", "text": "...", "type": "numbered", "level": 0},
        {"id": "a", "text": "...", "type": "lettered", "level": 1},
        {"id": "i", "text": "...", "type": "roman", "level": 2}
    ],
    "examples": [
        {"id": "illus_a", "text": "..."}
    ]
}
```

**API Models:**
```python
class SubClause(BaseModel):
    id: str
    text: str
    type: str  # "numbered" | "lettered" | "roman" | "explanation" | "preamble" | "text"
    level: int

class Example(BaseModel):
    id: str
    text: str

class SearchResult(BaseModel):
    document: str
    section_number: int
    title: str
    snippet: str
    sub_clause: Optional[SubClause] = None   # populated when match is a sub-clause
    example: Optional[Example] = None         # populated when match is an illustration
    punishment_summary: Optional[str] = None
    page: int
    score: float
    score_breakdown: Optional[dict] = None
```

**Retrieval:**
1. Embed query with same model
2. FAISS retrieves top 30 candidates by vector similarity (searches sub-clause-level corpus)
3. Map each candidate back to parent section + specific sub-clause/example via `CORPUS_META`
4. CrossEncoder reranks all 30 pairs (query, sub-clause text)
5. Hybrid score = `0.35 × vector_norm + 0.65 × reranker_sigmoid`
6. Filter: keep only hybrid score > 0.35
7. MMR diversity (λ=0.5) selects top `top_k` results with diverse section coverage
8. Return top `top_k` (default 7) results with both section-level and sub-clause-level metadata

**Generation:**
- Context: retrieved sub-clause/section texts + Indian Kanoon results
- LLM: `nvidia/nemotron-3-super-120b-a12b` via NVIDIA NIM API
- System prompt: cites Act names, section numbers, and specific sub-clauses
- Returns: `ai_answer`, `supporting_sections[]` (with sub_clause/example), `user_rights[]`, `legal_steps[]`, `indian_kanoon_results[]`

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
- `fetchLaws()`, `fetchLawById()`, `fetchProvisionDetail()` — per-law FAISS browse
- `enrichProvision(lawId, number, force?)` — on-demand Nemotron enrichment
- `ragAskRouted(question, lawIds, top_k)` — law-filtered RAG Q&A

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
4. **Shared tool components** — Tool pages (AI Legal Chat, Case Analyzer, Risk Analyzer, Contracts, Legal News, Community Forum) are extracted to `components/tools/*.tsx` and reused by both user dashboard and lawyer dashboard via thin wrapper pages, keeping a single source of truth
5. **Frontend calls RAG directly** for `/ask` (AI legal chat) — no backend proxy needed for real-time Q&A
6. **Hybrid retrieval** — FAISS + CrossEncoder combination outperforms pure vector search for legal queries
7. **WebRTC peer-to-peer** — video calls don't route through server; backend only handles signaling
8. **localStorage persistence** — chat history (`ebench_chats`), PDF downloads (`ebench_pdf_downloads`), video call history, AI chat IDs
9. **Static mock data** — Forum uses static data from `lib/forum-data.ts`. Microlearning lessons live in `lib/microlearning-data.ts` with per-lesson quiz questions and can be supplemented by news-generated lessons from the `POST /legal-news/to-lesson` RAG pipeline, tracked via the progress API with `source: "news"`.
10. **Live legal news** — News page fetches from RAG POST /legal-news/trending (Indian Kanoon API); news detail dynamically generates microlearning lessons
11. **Backend learning progress** — `LearningProgressModel` persists lesson completions and daily streak server-side; frontend falls back to localStorage if backend unreachable
12. **Dark/light theme** — inline CSS-in-JS with CSS custom properties, toggle stored in sidebar layout
13. **Socket.IO in lawyer layout** — persistent listener across all lawyer pages for incoming call notifications
14. **Google Translate widget** — on-page translation via `googtrans` cookie approach; available in English, Hindi, Marathi in both sidebar and navbar
15. **Chrome Extension as standalone product** — T&C Analyzer and IndianLegal Chat work independently of the main web app, calling backend NVIDIA API directly
16. **Semantic RAG (sub-clause level indexing)** — Instead of blind 220-word chunking, the pipeline parses legal PDFs into structured components (section → sub-clause → example). Each sub-clause and illustration becomes an independent corpus entry, enabling precise retrieval of specific legal provisions. The embedding corpus includes the full hierarchical context (`Section 4(1)(a) Punishments`) for accurate semantic matching, and retrieved results carry structured metadata down to the individual clause level. MMR diversity (λ=0.5) ensures section diversity in results, and LRU caching (256 entries) speeds up repeated queries.
17. **Per-law FAISS architecture** — Instead of a single FAISS index for all laws, pipelines 1-6 build one FAISS index per PDF (18 indexes total, 5,641 provisions, 15.5MB). Each index uses `bge-base-en-v1.5` (768-dim, 10× faster on CPU than `bge-large`). A `master_index.json` router at `RAG/data/` maps law_id → metadata. This enables law-filtered queries (`POST /ask/routed`), modular add/remove of laws without rebuilding everything, and smaller per-query memory (load only relevant indexes). Phase 4 uses rule-based curated content (no LLM) — `curated.json` with summary/plain_english/keywords/legal_topics for every provision, upgradable to Nemotron-generated content later.

---

## 12b. Per-Law FAISS Architecture (Phases 1-6)

**✅ PHASES 1-6 COMPLETE**

The per-law FAISS pipeline is fully operational with the following components:
- **18 laws** indexed (unique PDFs and compiled documents) across 15 domains
- **5,641 total provisions** extracted and indexed
- **18 per-law FAISS indexes** (768-dim, IndexFlatIP, bge-base-en-v1.5)
- **15.5MB total index size** across all 18 laws
- **master_index.json** router at `RAG/data/` for law discovery
- **Per-law curated content** (rule-based: summary, plain_english, keywords, legal_topics)
- **Legacy single-index pipeline** preserved for backward compatibility (`/ask`, `/query`)

**New Endpoints (Phase 6):**
- `GET /laws` — list all 18 laws with metadata
- `GET /laws/{law_id}` — law detail with optional provision list
- `GET /laws/{law_id}/provisions/{number}` — single provision with curated content
- `POST /ask/routed` — law-filtered Q&A using per-law FAISS + Nemotron-3

**Per-Law Index Breakdown (largest to smallest):**
- taxation (Income Tax Act 1961) — 1,581 provisions / 4.7MB / 3,284s build time
- corporate (Companies Act 2013) — 1,217 provisions / 3.6MB
- constitution (Constitution of India) — 459 provisions
- motor_vehicles (Motor Vehicles Act) — 453 provisions
- ica_1872 (Indian Contract Act 1872) — 317 provisions
- tpa_1882 (Transfer of Property Act 1882) — 279 provisions
- labour_employment (Labour & Employment Laws) — 251 provisions
- it_act_2000 (Information Technology Act 2000) — 214 provisions
- cpa_2019 (Consumer Protection Act 2019) — 212 provisions
- rera (RERA 2016) — 180 provisions
- securities (Securities Laws) — 104 provisions
- sra_1963 (Specific Relief Act 1963) — 94 provisions
- dv_act_2005 (Domestic Violence Act 2005) — 70 provisions
- bnss_2023 (BNSS 2023) — 68 provisions
- bns_2023 (BNS 2023) — 46 provisions
- bsa_2023 (BSA 2023) — 46 provisions
- family_laws (Family Courts Act 1984) — 46 provisions
- gdr_rules_2014 (GDR Rules 2014) — 4 provisions

**Frontend Integration (Phase 8):**
- `fetchLaws()`, `fetchLawById()`, `fetchProvisionDetail()` in `lib/userApi.ts`
- `ragAskRouted()` for law-filtered chat
- Collapsible law-filter bar in `AiLegalChatPage.tsx` — click law chips to filter

**✅ Phase 7 — On-demand Enrichment:**
- `POST /laws/{law_id}/provisions/{provision_number}/enrich` — Nemotron-generated doctrines, use_cases, important_concepts
- Results cached into `curated.json` for instant subsequent access
- `force=true` parameter to re-enrich even if cached
- `ProvisionDetailResponse` includes `doctrines`, `use_cases`, `important_concepts` fields

**✅ Phase 9 — Frontend Law Browser:**
- `/laws` — Law browser page with domain filtering, search, and grid view
- `/laws/[lawId]` — Law detail page with provision list and search
- `/laws/[lawId]/provisions/[number]` — Provision detail with full text, sub-clauses, curated summary, keywords, and AI enrichment
- `enrichProvision()` API helper in `lib/userApi.ts`
- Law Browser added to both user and lawyer dashboard sidebars

---

## 12c. Known Bug Fixes & Lessons Learned

### 🐛 Bug: User message replaced by AI response in chat (FIXED)

**Symptom:** In the AI Legal Chat (`client/components/tools/AiLegalChatPage.tsx`), after the user sends a question, the user message bubble visually disappeared and the AI's response appeared in its place. The user thought the AI's answer had "replaced" their typed question.

**Root cause:** The user-message and the AI placeholder were being assigned ids from `Date.now()` calls in two different evaluation contexts:

```tsx
// BEFORE (buggy)
setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: q, ... }]);
setIsTyping(true);
const msgId = Date.now() + 1;
setMessages(prev => [...prev, { id: msgId, sender: "ai", text: "", ... }]);
```

- The first `id: Date.now()` was *inside* the `setMessages` updater, so it was evaluated by React **later**, at state-update time.
- The second `id: msgId` (computed as `Date.now() + 1` at line-execution time) was captured in the closure at the moment the line ran.

Whenever the updater fired ~1 ms after the line executed, both messages ended up with the **same `id`**. React's `key={msg.id}` then reused the same DOM node for both, and the second (AI) message visually overwrote the first (user) message. The streaming response handler also updated the wrong message, appending AI tokens to the user bubble.

**Fix:** Capture both ids synchronously, *outside* the updater callbacks, so they can never collide:

```tsx
// AFTER (fixed)
const userId = Date.now();
const msgId = userId + 1;
setMessages(prev => [...prev, { id: userId, sender: "user", text: q, ... }]);
setIsTyping(true);
setMessages(prev => [...prev, { id: msgId, sender: "ai", text: "", ... }]);
```

Applied in:
- `client/components/tools/AiLegalChatPage.tsx` — `sendMessage()` and `analyzeImage()` (lines ~135, ~187).

**Lesson:** When you build a list keyed by `id` and push multiple items in the same render frame, **always compute their ids synchronously, outside the `setState` updater**. A `Date.now()` call inside an updater is evaluated when React runs the updater — not when you wrote the line — and can collide with sibling ids computed moments earlier.

**Related but safe:** The other `id: Date.now()` / `id: Date.now() + 1` patterns in `CaseAnalyzerPage.tsx`, `RiskAnalyzerPage.tsx`, `case-summarizer/page.tsx`, and `cases/page.tsx` are **not** affected — they build a local `messages[]` array that is then stored in `localStorage` and do not pass through a `setMessages` updater, so both `Date.now()` calls evaluate at line-execution time and never collide.

**Unrelated issue surfaced in the same report:** The 403 "Authorization failed" the user saw in the AI bubble is a real backend error from the RAG server's NVIDIA NIM API key (`NVIDIA_API_KEY` in `RAG/.env`) being invalid, expired, or rate-limited. It's a credential issue, not a UI bug — but the user message is now visible alongside it.

### 📊 RAG Server Terminal Logging

The RAG server (`RAG/main.py`) now has structured, timestamped terminal logging via Python's `logging` module, configured at startup with format:

```
%(asctime)s.%(msecs)03d | %(levelname)-7s | %(name)-18s | %(message)s
```

Example: `2026-06-02 20:42:13.481 | INFO    | rag               | [POST /ask/stream] → NVIDIA ...`

**What gets logged for every request:**

1. **Endpoint entry** — request method, path, question preview, `top_k`, history message count
2. **Retrieval timing** — `embed`, `faiss`, `rerank`, `total` durations in seconds (per-stage breakdown)
3. **Retrieved documents** — for each of the top results: document name (BNS/BNSS/BSA/MVA/Corporate/Securities), section number, title, sub-clause/example locator, and the three scores (hybrid, vector_similarity, reranker_relevance)
4. **Unique docs touched** — sorted list of distinct document names hit during retrieval
5. **LLM call** — model name, prompt size (chars / estimated tokens), with `→ NVIDIA` (request) and `← NVIDIA` (response) markers
6. **LLM response** — elapsed time, prompt/completion/total token counts (from `response.usage`), answer length, response preview (truncated to 400 chars)
7. **Errors** — exception message, elapsed time at failure, with `logger.error` (not `print`)
8. **Request total** — end-to-end elapsed time from request received to response sent

**Endpoints covered:**
- `POST /ask` — non-streaming AI Q&A
- `POST /ask/stream` — streaming AI Q&A (uses `/ask/stream` from frontend chat)
- `GET /query` — alternative GET-based Q&A
- `POST /tools/case-analyzer` — case analysis tool
- `POST /tools/contract-risk` — contract risk tool
- `POST /tools/case-summarizer` — document summarizer tool
- `POST /microlearning/ask` — microlearning Q&A

**Helpers added at top of `RAG/main.py`:**
- `logger = logging.getLogger("rag")`
- `_truncate(text, limit=240)` — flattens newlines and truncates with a `(+N chars)` suffix
- `_format_retrieved_docs(ranked)` — produces a single-line summary of all retrieved docs with their scores

**Startup banner** also logs: model name, document set, FAISS build time + vector count + corpus entry count, MongoDB connection status.

---

## 13. Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend, RAG | MongoDB connection string |
| `JWT_SECRET` | Backend | Secret for signing JWT tokens |
| `PORT` | Backend | Server port (default 4000) |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend base URL (default http://localhost:4000) |
| `NEXT_PUBLIC_RAG_URL` | Frontend | RAG server base URL (default http://localhost:8000) |
| `RAG_BASE_URL` | Backend | RAG server URL for tool controller (default http://localhost:8000) |
| `NVIDIA_API_KEY` | Backend, RAG | API key for NVIDIA Nemotron LLM |
| `CLOUDINARY_CLOUD_NAME` | Backend | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Backend | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend | Cloudinary API secret |
| `TWILIO_ACCOUNT_SID` | Backend | Twilio account SID for voice calls |
| `TWILIO_AUTH_TOKEN` | Backend | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Backend | Twilio phone number |
| `GOOGLE_API_KEY` | Backend | Google API key (Gemini fallback for voice) |
| `IK_API_TOKEN` | RAG | Indian Kanoon API token |
| `NEWSAPI_KEY` | RAG | NewsAPI.org API key |

**All secrets are read from `.env` files — never hardcoded in source code.**
- `backend/.env` — MongoDB, JWT, NVIDIA, Cloudinary, Twilio, Google
- `RAG/.env` — NVIDIA, Indian Kanoon, NewsAPI

---

## 14. Getting Started

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
# Create RAG/.env: IK_API_TOKEN, NEWSAPI_KEY, NVIDIA_API_KEY
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



  Session   HuggingFace Vercel Render deploy plan & keys
opencode -s ses_0996b01d8ffeS26YhtaHjUuula