"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, Plus, Pin, PinOff, Trash2, MessageSquare,
    Scale, FileText, Shield, Clock, ChevronRight, Sparkles, BookOpenText
} from "lucide-react";

/* ── Types ── */
type ChatEntry = {
    id: string;
    title: string;
    last_message: string;
    bot_type: string;
    timestamp: string;
    message_count: number;
    pinned: boolean;
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
    messageCount?: number;
    keywords?: string[];
};

const THEME_COLOR = "#C8B48A";
const THEME_DARK = "#8D7A55";
const THEME_SOFT = "#F5EFE4";
const THEME_BORDER = "#E7D9BE";

/* ── Bot type config ── */
const BOT_CONFIG: Record<string, { icon: typeof Scale; color: string; bg: string }> = {
    "Legal Research": { icon: Scale, color: THEME_DARK, bg: THEME_SOFT },
    "Case Analysis": { icon: Shield, color: "#7C3AED", bg: "#F3EEFF" },
    "Contract Review": { icon: FileText, color: "#0D6E4F", bg: "#ECFDF5" },
    Summary: { icon: BookOpenText, color: THEME_DARK, bg: THEME_SOFT },
};
const DEFAULT_BOT = { icon: Sparkles, color: THEME_DARK, bg: THEME_SOFT };

/* ── Filters ── */
const FILTERS = ["All", "Legal Research", "Case Analysis", "Contract Review", "Summary"] as const;
type FilterType = typeof FILTERS[number];

/* ── Demo data (shown when localStorage is empty) ── */
const DEMO_CHATS: ChatEntry[] = [
    { id: "demo_1", title: "Section 279 BNS — Rash Driving Penalties", last_message: "Here are relevant Supreme Court judgments on rash driving under Section 279...", bot_type: "Legal Research", timestamp: "2026-03-12T13:40:00", message_count: 8, pinned: true },
    { id: "demo_2", title: "Contract Clause Review — NDA Template", last_message: "The non-compete clause in Section 4.2 may be unenforceable under...", bot_type: "Contract Review", timestamp: "2026-03-11T10:15:00", message_count: 12, pinned: false },
    { id: "demo_3", title: "CrPC vs BNSS — Bail Provisions Comparison", last_message: "Under BNSS 2023, the bail provisions have been restructured...", bot_type: "Case Analysis", timestamp: "2026-03-10T16:30:00", message_count: 6, pinned: false },
    { id: "demo_4", title: "Motor Vehicle Act — Accident Compensation", last_message: "Section 166 of the Motor Vehicles Act provides for claims tribunals...", bot_type: "Legal Research", timestamp: "2026-03-09T09:20:00", message_count: 5, pinned: false },
    { id: "demo_5", title: "IT Act Section 66A — Still Valid?", last_message: "Section 66A was struck down by the Supreme Court in Shreya Singhal v UOI...", bot_type: "Legal Research", timestamp: "2026-03-08T14:55:00", message_count: 4, pinned: false },
    { id: "demo_6", title: "Corporate Fraud — Director Liability Under Companies Act", last_message: "Under Section 447, fraud carries both civil and criminal penalties...", bot_type: "Case Analysis", timestamp: "2026-03-07T11:10:00", message_count: 9, pinned: false },
];

const DEMO_SUMMARIES: SummaryEntry[] = [
    {
        id: "sum_1",
        title: "FIR 402/2023 - Cyber Fraud",
        preview: "The complainant reports a loss of Rs. 5 lakhs through a phishing link impersonating a banking portal.",
        keywords: ["Phishing", "IT Act 66D", "Banking Fraud"],
        timestamp: "2026-03-12T09:15:00",
    },
    {
        id: "sum_2",
        title: "Chargesheet - State vs ABC",
        preview: "Investigation findings link the accused to coordinated fund diversion and digital evidence tampering.",
        keywords: ["Conspiracy", "Digital Evidence", "120B IPC"],
        timestamp: "2026-03-10T12:05:00",
    },
    {
        id: "sum_3",
        title: "Judgment - Property Dispute",
        preview: "The court affirmed the plaintiff's inheritance claim after rejecting the challenge to the family settlement deed.",
        keywords: ["Inheritance", "Civil Court", "Settlement Deed"],
        timestamp: "2026-03-06T16:45:00",
    },
];

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

export default function ChatHistoryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [chats, setChats] = useState<ChatEntry[]>([]);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterType>("All");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        const requestedFilter = searchParams.get("filter");
        if (requestedFilter && FILTERS.includes(requestedFilter as FilterType)) {
            setActiveFilter(requestedFilter as FilterType);
        }
    }, [searchParams]);

    // Load chats from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("ebench_chats");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setChats(parsed);
                    return;
                }
            }
        } catch { /* ignore */ }
        setChats(DEMO_CHATS);
        localStorage.setItem("ebench_chats", JSON.stringify(DEMO_CHATS));
    }, []);

    // Persist to localStorage
    const persist = (updated: ChatEntry[]) => {
        setChats(updated);
        localStorage.setItem("ebench_chats", JSON.stringify(updated));
    };

    // Start new chat
    const handleNewChat = () => {
        router.push(`/chat`);
    };

    const handleFilterChange = (filter: FilterType) => {
        setActiveFilter(filter);
        const params = new URLSearchParams(searchParams.toString());
        if (filter === "All") params.delete("filter");
        else params.set("filter", filter);
        const query = params.toString();
        router.replace(query ? `/chats?${query}` : "/chats");
    };

    // Open existing chat
    const handleOpen = (id: string) => {
        router.push(`/chat/${id}`);
    };

    // Toggle pin
    const handlePin = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        persist(chats.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
    };

    // Delete chat
    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (deleteConfirm === id) {
            persist(chats.filter(c => c.id !== id));
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
            messageCount: chat.message_count,
        }));

        const summaryItems = DEMO_SUMMARIES.map((summary) => ({
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
    }, [chats]);

    // Filtered & sorted history
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
        // Pinned first, then by date
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
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: THEME_DARK }}>
                        History
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {historyItems.length} saved chat{historyItems.length !== 1 ? "s" : ""} and summaries in one place
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

            {/* Search + Filters */}
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
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all border ${activeFilter === f
                                ? "text-white"
                                : "bg-white text-gray-600 border-gray-200"
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

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
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
                                onClick={isChat ? () => handleOpen(item.id) : undefined}
                                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${isChat ? "cursor-pointer" : "cursor-default"} ${item.pinned
                                    ? "bg-[#FEFCF5] border-[#E8D9A8] hover:border-[#C49A10] hover:shadow-md"
                                    : "bg-white border-gray-100 hover:shadow-md"
                                    }`}
                                style={!item.pinned ? { borderColor: "#F1ECE2" } : undefined}
                            >
                                {/* Bot icon */}
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                    style={{ backgroundColor: cfg.bg }}
                                >
                                    <Icon size={20} style={{ color: cfg.color }} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold truncate" style={{ color: THEME_DARK }}>
                                            {item.title}
                                        </h3>
                                        {item.pinned && (
                                            <Pin size={12} className="text-[#C49A10] shrink-0 fill-[#C49A10]" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                        {item.subtitle}
                                    </p>
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
                                        <span
                                            className="px-2 py-0.5 rounded-md font-medium"
                                            style={{ backgroundColor: cfg.bg, color: cfg.color }}
                                        >
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

                                {/* Actions */}
                                {isChat ? (
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                                        <button
                                            onClick={(e) => handlePin(item.id, e)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                            title={item.pinned ? "Unpin" : "Pin"}
                                        >
                                            {item.pinned
                                                ? <PinOff size={14} className="text-[#C49A10]" />
                                                : <Pin size={14} className="text-gray-400" />
                                            }
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(item.id, e)}
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
                                    <div className="shrink-0 self-center rounded-lg px-3 py-1.5 text-[11px] font-semibold" style={{ border: `1px solid ${THEME_BORDER}`, backgroundColor: THEME_SOFT, color: THEME_DARK }}>
                                        Summary
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}