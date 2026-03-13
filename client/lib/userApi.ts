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
  const res = await fetch(`${RAG_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k }),
  });
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
