import { getToken } from "./chatApi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const RAG_BASE = process.env.NEXT_PUBLIC_RAG_URL || "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function userFetch(path: string, init?: RequestInit) {
  const token = getToken();
  if (!token) throw new Error("Please login again");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserProfile = {
  _id?: string;
  fullName: string;
  email?: string;
  phone: string;
  organization: string;
  location: string;
  bio: string;
  role: string;
  barId: string;
};

export type UserStats = {
  totalCases: number;
  totalContracts: number;
  totalSummaries: number;
  totalChats: number;
};

export type AnalysisSection = {
  document: string;
  section_number: number;
  title: string;
  snippet: string;
  punishment_summary?: string;
  score: number;
};

export type SavedAnalysis = {
  _id: string;
  type: "case" | "contract" | "summary";
  title: string;
  description: string;
  riskScore: number;
  sections?: AnalysisSection[];
  createdAt: string;
};

export type FullAnalysis = SavedAnalysis & {
  aiAnswer: string;
  sections: AnalysisSection[];
  userRights: string[];
  legalSteps: string[];
};

export type RagAskResponse = {
  question: string;
  ai_answer: string;
  supporting_sections: AnalysisSection[];
  model_used: string;
  user_rights?: string[];
  legal_steps?: string[];
};

export type ToolCaseAnalyzerResponse = {
  ai_answer: string;
  supporting_sections: AnalysisSection[];
  model_used: string;
  savedAnalysisId?: string;
};

export type ToolContractRiskResponse = {
  ai_answer: string;
  supporting_sections: AnalysisSection[];
  risk_score: number;
  risk_level: string;
  flagged_clauses: string[];
  model_used: string;
  savedAnalysisId?: string;
};

export type ToolCaseSummarizerResponse = {
  ai_answer: string;
  supporting_sections: AnalysisSection[];
  model_used: string;
  savedAnalysisId?: string;
};

export type LawAwarenessCaseReference = {
  case_name: string;
  year: string;
  principle: string;
};

export type LawAwarenessArticleSummary = {
  article_id: string;
  article_number: string;
  title: string;
  short_description: string;
};

export type LawAwarenessArticleDetail = LawAwarenessArticleSummary & {
  rights_explained: string;
  practical_use: string[];
  case_references: LawAwarenessCaseReference[];
};

export type LawAwarenessListResponse = {
  law_title: string;
  intro: string;
  articles: LawAwarenessArticleSummary[];
};

// ── User Profile ──────────────────────────────────────────────────────────────

export async function fetchUserProfile(): Promise<UserProfile> {
  return userFetch("/api/user/profile");
}

export async function updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return userFetch("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function fetchUserDashboardStats(): Promise<UserStats> {
  return userFetch("/api/user/stats");
}

// ── Saved Analyses ────────────────────────────────────────────────────────────

export async function fetchAnalyses(type?: "case" | "contract" | "summary"): Promise<SavedAnalysis[]> {
  const q = type ? `?type=${type}` : "";
  return userFetch(`/api/user/analyses${q}`);
}

export async function fetchAnalysisById(id: string): Promise<FullAnalysis> {
  return userFetch(`/api/user/analyses/${id}`);
}

export async function saveAnalysis(payload: {
  type: "case" | "contract" | "summary";
  title: string;
  description?: string;
  aiAnswer?: string;
  sections?: AnalysisSection[];
  userRights?: string[];
  legalSteps?: string[];
  riskScore?: number;
}): Promise<FullAnalysis> {
  return userFetch("/api/user/analyses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  await userFetch(`/api/user/analyses/${id}`, { method: "DELETE" });
}

// ── RAG AI Ask ────────────────────────────────────────────────────────────────

export async function ragAsk(question: string, top_k = 7): Promise<RagAskResponse> {
  console.log("[ragAsk] sending:", { question: question.slice(0, 100), top_k });
  const res = await fetch(`${RAG_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k }),
  });
  console.log("[ragAsk] response status:", res.status);
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  const data = await res.json();
  console.log("[ragAsk] response data:", data);
  return data;
}

// ── Tool APIs (routed through backend → RAG, auto-saved) ─────────────────────

export async function toolCaseAnalyzer(caseText: string, top_k = 7): Promise<ToolCaseAnalyzerResponse> {
  return userFetch("/api/tools/case-analyzer", {
    method: "POST",
    body: JSON.stringify({ case_text: caseText, top_k }),
  });
}

export async function toolContractRisk(contractText: string, top_k = 7): Promise<ToolContractRiskResponse> {
  return userFetch("/api/tools/contract-risk", {
    method: "POST",
    body: JSON.stringify({ contract_text: contractText, top_k }),
  });
}

export async function toolCaseSummarizer(documentText: string, top_k = 7): Promise<ToolCaseSummarizerResponse> {
  return userFetch("/api/tools/case-summarizer", {
    method: "POST",
    body: JSON.stringify({ document_text: documentText, top_k }),
  });
}

export async function fetchRightsLawAwareness(): Promise<LawAwarenessListResponse> {
  const res = await fetch(`${RAG_BASE}/law-awareness/rights`);
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export type DailyLawSection = {
  document: string;
  section: number;
  title: string;
  snippet: string;
  page: number;
};

export type DailyLawResponse = {
  date: string;
  law_title: string;
  sections: DailyLawSection[];
};

export async function fetchDailyLawSections(): Promise<DailyLawResponse> {
  const res = await fetch(`${RAG_BASE}/law-awareness/daily`);
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

// ── Per-Law FAISS Index API (Phase 6+) ───────────────────────────────────

export type LawEntry = {
  id: string;
  label: string;
  domain: string;
  provision_label: string;
  provision_count: number;
};

export type LawListResponse = {
  total_laws: number;
  total_provisions: number;
  embedding_model: string;
  laws: LawEntry[];
};

export type LawProvision = {
  number: string;
  title: string;
};

export type LawDetailResponse = LawEntry & {
  strategy?: string;
  provisions?: LawProvision[];
};

export type ProvisionDetailResponse = {
  law_id: string;
  law_label: string;
  provision_label: string;
  number: string;
  title: string;
  full_text?: string;
  sub_clauses: { id: string; text: string; type: string; level: number }[];
  examples: { id: string; text: string }[];
  summary?: string;
  plain_english?: string;
  keywords: string[];
  legal_topics: string[];
  related: string[];
};

export type RoutedAskResult = {
  law_id: string;
  law_label: string;
  provision_number: string;
  title: string;
  score: number;
};

export type RoutedAskResponse = {
  question: string;
  ai_answer: string;
  law_ids: string[];
  results: RoutedAskResult[];
  total_found: number;
  model_used: string;
};

export async function fetchLaws(): Promise<LawListResponse> {
  const res = await fetch(`${RAG_BASE}/laws`);
  if (!res.ok) {
    let msg = `Failed to fetch laws (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchLawById(lawId: string, includeProvisions = false): Promise<LawDetailResponse> {
  const res = await fetch(`${RAG_BASE}/laws/${lawId}?include_provisions=${includeProvisions}`);
  if (!res.ok) {
    let msg = `Failed to fetch law ${lawId} (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchProvisionDetail(lawId: string, provisionNumber: string): Promise<ProvisionDetailResponse> {
  const res = await fetch(`${RAG_BASE}/laws/${lawId}/provisions/${provisionNumber}`);
  if (!res.ok) {
    let msg = `Failed to fetch provision (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function ragAskRouted(question: string, lawIds: string[], top_k = 5): Promise<RoutedAskResponse> {
  const res = await fetch(`${RAG_BASE}/ask/routed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, law_ids: lawIds, top_k }),
  });
  if (!res.ok) {
    let msg = `Routed RAG request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

// ── Legal News & Microlearning Progress ──────────────────────────────────

export type LegalNewsItem = {
  id: string;
  headline: string;
  summary: string;
  date: string;
  category: string;
  source: string;
};

export type NewsToLessonResponse = {
  news_id: string;
  headline: string;
  legal_topic: string;
  sections: AnalysisSection[];
  explanation: string;
  lesson_title: string;
  lesson_law_text: string;
  lesson_simple_explanation: string;
  lesson_scenario: string;
  lesson_quiz: any[];
  case_references: string[];
  model_used: string;
};

export type QuizAnswer = {
  questionId: string;
  selectedOption: string;
  correct: boolean;
};

export type LessonProgress = {
  lessonId: string;
  lessonTitle: string;
  completed: boolean;
  completedAt: string | null;
  quizAnswers: QuizAnswer[];
  quizScore: number;
  quizTotal: number;
  source: string;
};

export type LearningProgress = {
  _id: string;
  userId: string;
  dailyStreak: {
    current: number;
    longest: number;
    lastActive: string | null;
  };
  lessons: LessonProgress[];
};

export async function fetchTrendingNews(): Promise<{ news: LegalNewsItem[]; total: number }> {
  const res = await fetch(`${RAG_BASE}/legal-news/trending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchNewsApiNews(query: string = "law court India", pageSize: number = 10): Promise<{ news: LegalNewsItem[]; total: number }> {
  const res = await fetch(`${RAG_BASE}/legal-news/newsapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, page_size: pageSize }),
  });
  if (!res.ok) {
    let msg = `NewsAPI request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

const NEWS_STORAGE_KEY = "ebench_news_items";

export function storeNewsItems(items: LegalNewsItem[]): void {
  try { localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(items)); } catch { }
}

export function getStoredNewsItem(id: string): LegalNewsItem | null {
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (!raw) return null;
    const items = JSON.parse(raw) as LegalNewsItem[];
    return items.find(i => i.id === id) || null;
  } catch { return null; }
}

export async function fetchNewsToLesson(payload: {
  news_id: string;
  headline: string;
  summary: string;
  category?: string;
}): Promise<NewsToLessonResponse> {
  const res = await fetch(`${RAG_BASE}/legal-news/to-lesson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, category: payload.category || 'General' }),
  });
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export type GeneratedLesson = {
  lesson_id: string;
  title: string;
  description: string;
  difficulty: string;
  minutes: number;
  law_text: string;
  simple_explanation: string;
  important_case: { case_name: string; year: string; principle: string };
  scenario: { prompt: string; question: string };
  quiz: Array<{
    id: string;
    question: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
  }>;
  supporting_sections: Array<{ document: string; section_number: number; title: string; snippet: string }>;
};

export async function fetchGeneratedLesson(lessonId: string, lessonTitle: string, lessonDescription: string): Promise<GeneratedLesson> {
  const res = await fetch(`${RAG_BASE}/microlearning/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson_id: lessonId, lesson_title: lessonTitle, lesson_description: lessonDescription }),
  });
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try { const d = await res.json(); msg = d.detail || msg; } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchLearningProgress(): Promise<LearningProgress> {
  return userFetch('/api/user/microlearning/progress');
}

export async function saveLessonProgress(payload: {
  lessonId: string;
  lessonTitle?: string;
  source?: string;
}): Promise<LearningProgress> {
  return userFetch('/api/user/microlearning/progress/lesson', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveQuizProgress(payload: {
  lessonId: string;
  lessonTitle?: string;
  answers?: QuizAnswer[];
  score?: number;
  total?: number;
  source?: string;
}): Promise<LearningProgress> {
  return userFetch('/api/user/microlearning/progress/quiz', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchRightsLawArticle(articleId: string): Promise<LawAwarenessArticleDetail> {
  const res = await fetch(`${RAG_BASE}/law-awareness/rights/${articleId}`);
  if (!res.ok) {
    let msg = `RAG request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  return res.json();
}
