"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Plus, Pin, PinOff, Trash2, MessageSquare,
  Scale, FileText, Shield, Clock, ChevronRight, Sparkles, BookOpenText, X,
} from "lucide-react";
import { fetchMyChats, deleteChatById, createOrGetDirectChat, type ApiChat, type ApiConsultant } from "@/lib/chatApi";
import { fetchAnalyses, fetchAnalysisById, type SavedAnalysis, type FullAnalysis } from "@/lib/userApi";
import LawyerPickerModal from "@/components/LawyerPickerModal";
import PaymentModal, { type SessionType } from "@/components/PaymentModal";

type ChatEntry = {
  id: string;
  title: string;
  last_message: string;
  bot_type: string;
  timestamp: string;
  message_count: number;
  pinned: boolean;
  source: "api" | "local";
};

type SummaryEntry = {
  id: string;
  title: string;
  preview: string;
  keywords: string[];
  timestamp: string;
};

type HistoryItem = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  timestamp: string;
  kind: "chat" | "summary";
  pinned: boolean;
  source?: "api" | "local";
  messageCount?: number;
  keywords?: string[];
};

const THEME_COLOR = "#C8B48A";
const THEME_DARK = "#8D7A55";
const THEME_SOFT = "#F5EFE4";
const THEME_BORDER = "#E7D9BE";
const RAG_BASE = process.env.NEXT_PUBLIC_RAG_URL || "http://localhost:8000";

const BOT_CONFIG: Record<string, { icon: typeof Scale; color: string; bg: string }> = {
  "Legal Research": { icon: Scale, color: THEME_DARK, bg: THEME_SOFT },
  "Case Analysis": { icon: Shield, color: "#7C3AED", bg: "#F3EEFF" },
  "Contract Review": { icon: FileText, color: "#0D6E4F", bg: "#ECFDF5" },
  Summary: { icon: BookOpenText, color: THEME_DARK, bg: THEME_SOFT },
};
const DEFAULT_BOT = { icon: Sparkles, color: THEME_DARK, bg: THEME_SOFT };

const FILTERS = ["All", "Legal Research", "Case Analysis", "Contract Review", "Summary"] as const;
type FilterType = typeof FILTERS[number];

type LocalStoredChat = {
  id: string;
  title?: string;
  last_message?: string;
  bot_type?: string;
  timestamp?: string;
  message_count?: number;
  pinned?: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function loadLocalAiChats(): ChatEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ebench_chats");
    const list: LocalStoredChat[] = raw ? JSON.parse(raw) : [];
    return list
      .filter((c) => c?.id && String(c.id).startsWith("chat_"))
      .map((c) => ({
        id: c.id,
        title: c.title || "AI Chat",
        last_message: c.last_message || "No messages yet",
        bot_type: c.bot_type || "Legal Research",
        timestamp: c.timestamp || new Date().toISOString(),
        message_count: c.message_count || 0,
        pinned: !!c.pinned,
        source: "local",
      }));
  } catch {
    return [];
  }
}

function saveLocalPin(chatId: string, pinned: boolean) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("ebench_chats");
    const list: LocalStoredChat[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((c) => c.id === chatId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], pinned };
      localStorage.setItem("ebench_chats", JSON.stringify(list));
    }
  } catch {
    // no-op
  }
}

function removeLocalChat(chatId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("ebench_chats");
    const list: LocalStoredChat[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((c) => c.id !== chatId);
    localStorage.setItem("ebench_chats", JSON.stringify(filtered));
  } catch {
    // no-op
  }
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [summaries, setSummaries] = useState<SummaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [showLawyerPicker, setShowLawyerPicker] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<ApiConsultant | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<FullAnalysis | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const handleLawyerSelect = (lawyer: ApiConsultant) => {
    setSelectedLawyer(lawyer);
    setShowLawyerPicker(false);
  };

  const handlePaymentSuccess = async (sessionType: SessionType) => {
    if (!selectedLawyer) return;
    setBookingLoading(true);
    setSelectedLawyer(null);
    try {
      if (sessionType === "video") {
        const token = typeof window !== "undefined"
          ? localStorage.getItem("token") || localStorage.getItem("ebench_token") || ""
          : "";
        const res = await fetch("http://localhost:4000/create-room", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to create room");
        const { roomId } = await res.json();
        const lawyerParam = encodeURIComponent(selectedLawyer.fullName);
        router.push(`/session/${roomId}/video?lawyer=${lawyerParam}`);
      } else {
        const chat = await createOrGetDirectChat({
          participantId: selectedLawyer._id,
          participantModel: "Consultant",
        });
        const lawyerParam = encodeURIComponent(selectedLawyer.fullName);
        const lawyerIdParam = selectedLawyer._id;
        router.push(`/session/${chat._id}/chat?lawyer=${lawyerParam}&lawyerId=${lawyerIdParam}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    const requestedFilter = searchParams.get("filter");
    if (requestedFilter && FILTERS.includes(requestedFilter as FilterType)) {
      setActiveFilter(requestedFilter as FilterType);
    }
  }, [searchParams]);

  const mapApiChatToEntry = (chat: ApiChat): ChatEntry => {
    const ownUserType = typeof window !== "undefined" ? localStorage.getItem("userType") : "user";
    const ownModel = ownUserType === "consultant" ? "Consultant" : "User";
    const other = chat.participants.find((p) => p.participantModel !== ownModel)?.participant;

    return {
      id: chat._id,
      title: other?.fullName || chat.title || "Direct Chat",
      last_message: chat.lastMessage || "No messages yet",
      bot_type: "Legal Research",
      timestamp: chat.lastMessageAt || chat.updatedAt,
      message_count: chat.messages?.length || 0,
      pinned: false,
      source: "api",
    };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [apiChats, summaryAnalyses] = await Promise.all([
          fetchMyChats(),
          fetchAnalyses("summary"),
        ]);

        const apiEntries = apiChats.map(mapApiChatToEntry);
        const localEntries = loadLocalAiChats();
        setChats([...localEntries, ...apiEntries]);

        const summaryEntries = (summaryAnalyses || []).map((s: SavedAnalysis) => ({
          id: s._id,
          title: s.title,
          preview: s.description || "Saved AI summary",
          keywords: ["Summary", "Saved"],
          timestamp: s.createdAt,
        }));
        setSummaries(summaryEntries);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load chats";
        setError(msg);
      }
    };

    load();
  }, []);

  const handleNewChat = () => {
    setShowLawyerPicker(true);
  };

  const handleOpenSummary = async (summaryId: string) => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const full = await fetchAnalysisById(summaryId);

      let enriched = full;
      const quickMatch = full.aiAnswer?.match(/Indian Kanoon quick summary for case\s+(\d+)/i);
      const looksLowQuality = !full.aiAnswer || full.aiAnswer.trim().length < 350 || full.aiAnswer.trim() === (full.description || "").trim();

      let docId = quickMatch?.[1] || "";

      if (!docId && looksLowQuality) {
        try {
          const queryTitle = (full.title || "").replace(/^Summary:\s*/i, "").trim();
          if (queryTitle) {
            const searchRes = await fetch(`${RAG_BASE}/ik/search?q=${encodeURIComponent(queryTitle)}&max_results=1`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const first = Array.isArray(searchData?.results) ? searchData.results[0] : null;
              if (first?.doc_id) docId = String(first.doc_id);
            }
          }
        } catch {
          // Continue with existing summary if search-based recovery fails.
        }
      }

      if (docId && looksLowQuality) {
        try {
          const res = await fetch(`${RAG_BASE}/ik/case/${docId}/summary`);
          if (res.ok) {
            const data = await res.json();
            const detailed = typeof data?.summary === "string" ? data.summary.trim() : "";
            if (detailed && detailed.length >= 350) {
              enriched = {
                ...full,
                description: detailed.slice(0, 4900),
                aiAnswer: detailed,
              };
            }
          }
        } catch {
          // Keep existing saved summary if enrichment request fails.
        }
      }

      setSelectedSummary(enriched);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "All") params.delete("filter");
    else params.set("filter", filter);
    const query = params.toString();
    router.replace(query ? `/chats?${query}` : "/chats");
  };

  const handleOpen = (id: string, source?: "api" | "local") => {
    if (source === "local" || id.startsWith("chat_")) {
      router.push(`/chat/${id}`);
      return;
    }
    router.push(`/session/${id}/chat`);
  };

  const handlePin = (id: string, source: "api" | "local", e: React.MouseEvent) => {
    e.stopPropagation();
    setChats((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const nextPinned = !c.pinned;
      if (source === "local") saveLocalPin(id, nextPinned);
      return { ...c, pinned: nextPinned };
    }));
  };

  const handleDelete = async (id: string, source: "api" | "local", e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm === id) {
      try {
        if (source === "local" || id.startsWith("chat_")) {
          removeLocalChat(id);
        } else {
          await deleteChatById(id);
        }
        setChats((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete chat";
        setError(msg);
      }
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const historyItems = useMemo<HistoryItem[]>(() => {
    const chatItems = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      subtitle: chat.last_message,
      category: chat.bot_type,
      timestamp: chat.timestamp,
      kind: "chat" as const,
      pinned: chat.pinned,
      source: chat.source,
      messageCount: chat.message_count,
    }));

    const summaryItems = summaries.map((summary) => ({
      id: summary.id,
      title: summary.title,
      subtitle: summary.preview,
      category: "Summary",
      timestamp: summary.timestamp,
      kind: "summary" as const,
      pinned: false,
      keywords: summary.keywords,
    }));

    return [...chatItems, ...summaryItems];
  }, [chats, summaries]);

  const filtered = useMemo(() => {
    let list = historyItems;
    if (activeFilter !== "All") {
      list = list.filter((item) => item.category === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((keyword) => keyword.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [historyItems, activeFilter, search]);

  const totalByType = useMemo(() => {
    const counts: Record<string, number> = {};
    historyItems.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1; });
    return counts;
  }, [historyItems]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full gap-4">
      {selectedSummary && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-[#FBF8F1]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8D7A55]">Full Summary</p>
                <h3 className="text-base font-bold text-[#3d3220] mt-1 leading-snug">{selectedSummary.title}</h3>
                <p className="text-xs text-gray-500 mt-1">Saved on {new Date(selectedSummary.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close summary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8D7A55] mb-2">Summary</p>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] border border-gray-200 rounded-xl p-4">
                  {selectedSummary.description || "No summary text available."}
                </div>
              </div>

              {selectedSummary.aiAnswer ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8D7A55] mb-2">AI Answer</p>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] border border-gray-200 rounded-xl p-4">
                    {selectedSummary.aiAnswer}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showLawyerPicker && (
        <LawyerPickerModal
          onSelect={handleLawyerSelect}
          onClose={() => setShowLawyerPicker(false)}
        />
      )}
      {selectedLawyer && (
        <PaymentModal
          lawyer={selectedLawyer}
          onSuccess={handlePaymentSuccess}
          onClose={() => setSelectedLawyer(null)}
        />
      )}
      {bookingLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-10 py-8 flex flex-col items-center gap-3 shadow-xl">
            <svg className="animate-spin h-8 w-8 text-[#8D7A55]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm font-medium text-[#8D7A55]">Setting up your session...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: THEME_DARK }}>
            History
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {historyItems.length} saved chats and summaries in one place
          </p>
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          style={{ backgroundColor: THEME_COLOR }}
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats by topic, law, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-1 transition-all"
            style={{ borderColor: search ? THEME_BORDER : undefined }}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeFilter === f ? "text-white" : "bg-white text-gray-600 border-gray-200"
              }`}
              style={activeFilter === f
                ? { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR }
                : { borderColor: undefined, color: undefined }}
            >
              {f}
              {f !== "All" && totalByType[f] ? (
                <span className="ml-1.5 text-[10px] opacity-70">({totalByType[f]})</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
        {error ? (
          <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-100 mb-2">{error}</div>
        ) : null}
        {summaryError ? (
          <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-100 mb-2">{summaryError}</div>
        ) : null}
        {summaryLoading ? (
          <div className="p-3 rounded-lg text-sm text-[#8D7A55] bg-[#FBF8F1] border border-[#E7D9BE] mb-2">Loading full summary...</div>
        ) : null}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <MessageSquare size={40} strokeWidth={1.2} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">No results found</p>
            <p className="text-xs mt-1">{search ? "Try a different search term" : "Switch filters or create a new chat"}</p>
          </div>
        ) : (
          filtered.map((item) => {
            const cfg = BOT_CONFIG[item.category] || DEFAULT_BOT;
            const Icon = cfg.icon;
            const isChat = item.kind === "chat";
            return (
              <div
                key={item.id}
                onClick={isChat ? () => handleOpen(item.id, item.source) : () => handleOpenSummary(item.id)}
                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${item.pinned
                  ? "bg-[#FEFCF5] border-[#E8D9A8] hover:border-[#C49A10] hover:shadow-md"
                  : "bg-white border-gray-100 hover:shadow-md"
                }`}
                style={!item.pinned ? { borderColor: "#F1ECE2" } : undefined}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: cfg.bg }}>
                  <Icon size={20} style={{ color: cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate" style={{ color: THEME_DARK }}>{item.title}</h3>
                    {item.pinned && <Pin size={12} className="text-[#C49A10] shrink-0 fill-[#C49A10]" />}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.subtitle}</p>
                  {item.kind === "summary" && item.keywords?.length ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {item.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                          style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: `${cfg.color}22` }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatDate(item.timestamp)}
                    </span>
                    {isChat ? (
                      <span className="flex items-center gap-1">
                        <MessageSquare size={11} /> {item.messageCount} msgs
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <BookOpenText size={11} /> AI summary
                      </span>
                    )}
                  </div>
                </div>

                {isChat ? (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                    <button
                      onClick={(e) => handlePin(item.id, item.source || "api", e)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title={item.pinned ? "Unpin" : "Pin"}
                    >
                      {item.pinned
                        ? <PinOff size={14} className="text-[#C49A10]" />
                        : <Pin size={14} className="text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, item.source || "api", e)}
                      className={`p-1.5 rounded-lg transition-colors ${deleteConfirm === item.id
                        ? "bg-red-50 text-red-600"
                        : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                      }`}
                      title={deleteConfirm === item.id ? "Click again to confirm" : "Delete"}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} className="text-gray-300 transition-colors group-hover:text-[#8D7A55]" />
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSummary(item.id);
                    }}
                    className="shrink-0 self-center rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:opacity-90"
                    style={{ border: `1px solid ${THEME_BORDER}`, backgroundColor: THEME_SOFT, color: THEME_DARK }}
                  >
                    Summary
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
