"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    Scale, FileText, AlertTriangle, Newspaper, Flame,
    BookOpen, ChevronRight, Clock, Gavel,
    CheckCircle, Sparkles, MessageSquare, Maximize2, X, LogOut,
    FileSignature,
} from "lucide-react"
import {
    fetchDailyLawSections,
    fetchTrendingNews,
    fetchUserProfile,
    fetchLearningProgress,
    type DailyLawSection,
    type LegalNewsItem,
} from "@/lib/userApi"

/* ─── typewriter taglines ─── */
const TAGLINES = [
    "Ask me anything about your case...",
    "Search legal sections instantly...",
    "Summarize a document in seconds...",
    "Check contract risks before you sign...",
    "Know your rights. Ask E-Bench.",
]

function useTypewriter(lines: string[], typingSpeed = 60, pauseMs = 1800, deleteSpeed = 35) {
    const [display, setDisplay] = useState("")
    const [cursor, setCursor] = useState(true)
    const lineRef = useRef(0)
    const charRef = useRef(0)
    const deleting = useRef(false)

    useEffect(() => {
        const blink = setInterval(() => setCursor(c => !c), 530)
        return () => clearInterval(blink)
    }, [])

    useEffect(() => {
        let timeout: NodeJS.Timeout
        const tick = () => {
            const line = lines[lineRef.current]
            if (!deleting.current) {
                if (charRef.current < line.length) {
                    charRef.current++
                    setDisplay(line.slice(0, charRef.current))
                    timeout = setTimeout(tick, typingSpeed)
                } else {
                    timeout = setTimeout(() => { deleting.current = true; tick() }, pauseMs)
                }
            } else {
                if (charRef.current > 0) {
                    charRef.current--
                    setDisplay(line.slice(0, charRef.current))
                    timeout = setTimeout(tick, deleteSpeed)
                } else {
                    deleting.current = false
                    lineRef.current = (lineRef.current + 1) % lines.length
                    timeout = setTimeout(tick, 300)
                }
            }
        }
        timeout = setTimeout(tick, 600)
        return () => clearTimeout(timeout)
    }, [])

    return { display, cursor }
}

const DASHBOARD_SUGGESTED = [
    { q: "What is Section 302 BNS and its punishment?", icon: Scale },
    { q: "Explain bail provisions under BNSS 2023", icon: Gavel },
    { q: "How does Section 420 IPC apply to fraud cases?", icon: FileText },
    { q: "What are rights of an accused under Indian law?", icon: BookOpen },
    { q: "Procedure for filing an FIR in India", icon: Scale },
    { q: "Director liability under Companies Act 2013", icon: FileText },
]

export default function Dashboard() {
    const [message, setMessage] = useState("")
    const [isInputFocused, setIsInputFocused] = useState(false)
    const [userName, setUserName] = useState("there")
    const [dailySections, setDailySections] = useState<DailyLawSection[]>([])
    const [dailyLawTitle, setDailyLawTitle] = useState("")
    const [dailyDate, setDailyDate] = useState("")
    const [sectionsLoading, setSectionsLoading] = useState(true)
    const [sectionsError, setSectionsError] = useState("")
    const [selectedSection, setSelectedSection] = useState<DailyLawSection | null>(null)
    const [newsItems, setNewsItems] = useState<LegalNewsItem[]>([])
    const [newsLoading, setNewsLoading] = useState(true)
    const [streakDays, setStreakDays] = useState(0)
    const [streakLongest, setStreakLongest] = useState(0)
    const STREAK_KEY = "ebench_streak"
    const { display, cursor } = useTypewriter(TAGLINES)
    const router = useRouter()
    const showTypewriter = !isInputFocused && message.trim().length === 0

    useEffect(() => {
        let active = true

        fetchDailyLawSections()
            .then((data) => {
                if (!active) return
                setDailySections(data.sections)
                setDailyLawTitle(data.law_title)
                setDailyDate(data.date)
                setSectionsError("")
            })
            .catch((err: Error) => {
                if (!active) return
                setSectionsError(err.message || "Unable to load daily law sections.")
            })
            .finally(() => {
                if (active) setSectionsLoading(false)
            })

        fetchTrendingNews()
            .then((data) => {
                if (!active) return
                setNewsItems(data.news.slice(0, 5))
            })
            .catch(() => { /* keep empty */ })
            .finally(() => {
                if (active) setNewsLoading(false)
            })

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        fetchUserProfile()
            .then((p) => {
                const first = p.fullName?.split(" ")[0]
                if (first) setUserName(first)
            })
            .catch(() => { /* keep default */ })

        // Load streak from localStorage first
        try {
            const stored = localStorage.getItem(STREAK_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.current) setStreakDays(parsed.current)
                if (parsed.longest) setStreakLongest(parsed.longest)
            }
        } catch { /* ignore */ }

        // Then try backend — overwrite local if it succeeds
        fetchLearningProgress()
            .then((data) => {
                const current = data.dailyStreak?.current || 0
                const longest = data.dailyStreak?.longest || 0
                setStreakDays(current)
                setStreakLongest(longest)
                try {
                    localStorage.setItem(STREAK_KEY, JSON.stringify({ current, longest, lastActive: data.dailyStreak?.lastActive }))
                } catch { /* ignore */ }
            })
            .catch(() => { /* keep local fallback */ })
    }, [])

    const handleAskClick = () => {
        if (message.trim()) {
            router.push(`/chat?message=${encodeURIComponent(message)}`)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleAskClick()
        }
    }

    const openChatWithPrompt = (prompt: string) => {
        router.push(`/chat?message=${encodeURIComponent(prompt)}`)
    }

    const openTool = (toolPath: string) => {
        router.push(toolPath)
    }

    const openLawAwarenessPage = () => {
        router.push("/free-tools/law-awareness")
    }

    const openNewsPage = () => {
        router.push("/free-tools/news")
    }

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("ebench_token")
        localStorage.removeItem("userType")
        localStorage.removeItem("ebench_active_chat_id")
        router.push("/auth")
    }

    const openSectionDetail = (section: DailyLawSection) => {
        setSelectedSection(section)
    }

    useEffect(() => {
        if (!selectedSection) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedSection(null)
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [selectedSection])

    return (
        <>
            {/* WELCOME */}
            <div className="eb-welcome" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="eb-welcome-title">Welcome back, {userName}.</div>
                <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(220,38,38,0.25)",
                        background: "rgba(220,38,38,0.06)",
                        color: "#dc2626",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,38,38,0.12)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(220,38,38,0.06)")}
                >
                    <LogOut size={15} />
                    Logout
                </button>
            </div>

            {/* TOP ROW: chatbot (big left) + tool cards stacked (right) */}
            <div className="eb-top-grid">

                {/* CHATBOT */}
                <div className="eb-chatbot-card">
                    <div className="eb-chatbot-top">
                        <div className="eb-chatbot-icon"><Sparkles size={20} color="#C49A10" /></div>
                        <div>
                            <div className="eb-chatbot-heading">E-Bench AI Assistant</div>
                            <div className="eb-chatbot-sub-txt">Powered by verified legal intelligence</div>
                        </div>
                    </div>
                    <div className="eb-chatbot-desc">
                        Get instant, conversational legal insights backed by verified citations, acts, and books. Ask anything about your case, contract, or legal rights — in plain language.
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 10,
                        }}
                    >
                        {DASHBOARD_SUGGESTED.map(({ q, icon: Icon }) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => openChatWithPrompt(q)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    textAlign: "left",
                                    border: "1.5px solid rgba(196,154,16,0.25)",
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.82)",
                                    padding: "12px 12px",
                                    fontSize: 12.5,
                                    color: "var(--txt)",
                                    lineHeight: 1.35,
                                    cursor: "pointer",
                                }}
                            >
                                <span
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: "rgba(139,105,20,0.12)",
                                        color: "var(--gold)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={14} />
                                </span>
                                <span style={{ flex: 1 }}>{q}</span>
                                <ChevronRight size={13} style={{ color: "var(--gold)", flexShrink: 0 }} />
                            </button>
                        ))}
                    </div>

                    <div className="eb-chatbot-input-row">
                        <MessageSquare size={14} />
                        <input 
                            className="eb-chat-input" 
                            placeholder={showTypewriter ? "" : "Ask your legal question..."}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            style={{ caretColor: "var(--txt)" }} 
                        />
                        {showTypewriter ? (
                            <span style={{ fontSize: 13, color: "var(--txt-light)", pointerEvents: "none", whiteSpace: "nowrap", overflow: "hidden", flex: 1, display: "flex", alignItems: "center" }}>
                                {display}<span className="eb-chat-cursor" style={{ opacity: cursor ? 1 : 0 }} />
                            </span>
                        ) : null}
                        <button className="eb-chat-send" onClick={handleAskClick}><Sparkles size={13} /> Ask</button>
                    </div>
                </div>

                {/* 3 TOOL CARDS stacked */}
                <div className="eb-tools-col">
                    <button type="button" className="eb-tool-card" onClick={() => openTool('/tools/case-analyzer')}>
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><Scale size={18} /></div>
                            <span className="eb-tool-tag">Case Intelligence</span>
                        </div>
                        <div className="eb-tool-name">AI Case Analyzer</div>
                        <div className="eb-tool-desc">Upload or describe a case and instantly identify applicable legal sections and relevant past judgments.</div>
                        <div className="eb-tool-link">Analyze a Case <ChevronRight size={12} /></div>
                    </button>
                    <button type="button" className="eb-tool-card" onClick={() => openTool('/tools/risk-analyzer')}>
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><AlertTriangle size={18} /></div>
                            <span className="eb-tool-tag">Risk Detection</span>
                        </div>
                        <div className="eb-tool-name">Contract Risk Analyzer</div>
                        <div className="eb-tool-desc">Detect hidden risks, unfair clauses, and legal loopholes. Get a plain-English risk score.</div>
                        <div className="eb-tool-link">Review a Contract <ChevronRight size={12} /></div>
                    </button>
                    <button type="button" className="eb-tool-card" onClick={() => openTool('/tools/document-draft')}>
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><FileSignature size={18} /></div>
                            <span className="eb-tool-tag">Document Drafting</span>
                        </div>
                        <div className="eb-tool-name">Legal Document Drafting</div>
                        <div className="eb-tool-desc">Draft legal letters, notices, affidavits, and rent agreements with a guided step-by-step interview.</div>
                        <div className="eb-tool-link">Draft a Document <ChevronRight size={12} /></div>
                    </button>
                    <button type="button" className="eb-tool-card" onClick={() => openTool('/tools/case-summarizer')}>
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><FileText size={18} /></div>
                            <span className="eb-tool-tag">Document Processing</span>
                        </div>
                        <div className="eb-tool-name">Case File Summarizer</div>
                        <div className="eb-tool-desc">Convert FIRs, chargesheets, and court orders into clear structured summaries in minutes.</div>
                        <div className="eb-tool-link">Summarize a Document <ChevronRight size={12} /></div>
                    </button>
                </div>

            </div>

            {/* BOTTOM ROW: streak (left) + law awareness (center) + news feed (right) */}
            <div className="eb-bottom-grid">

                {/* DAILY STREAK */}
                <div className="eb-streak-card">
                    <div className="eb-streak-header">
                        <div className="eb-streak-icon-box"><Flame size={20} /></div>
                        <span className="eb-streak-title">Learning Streak</span>
                    </div>
                    <div className="eb-streak-sub">Keep learning daily to maintain your streak</div>
                    <div className="eb-streak-count">{streakDays}</div>
                    <div className="eb-streak-label">Day Streak</div>
                    <div className="eb-streak-days">
                        {["M","T","W","T","F","S","S"].map((d, i) => (
                            <div key={i} className={`eb-streak-day ${i < (streakDays % 7) ? "active" : ""}`}>{d}</div>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--txt-light)", marginTop: 4 }}>
                        Longest streak: {streakLongest} days
                    </div>
                    <button type="button" className="eb-streak-btn" onClick={() => router.push("/microlearning")}>
                        <BookOpen size={14} /> Continue Learning
                    </button>
                </div>

                {/* DAILY LAW AWARENESS */}
                <div className="eb-info-card">
                    <div className="eb-info-header">
                        <div className="eb-info-icon"><BookOpen size={17} /></div>
                        <div>
                            <div className="eb-info-title">{dailyLawTitle || "Daily Law Awareness"}</div>
                            <div className="eb-info-sub">{dailyDate ? `${dailyDate} · Tap a section to read` : "Legal sections that change daily"}</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Open full guide" onClick={openLawAwarenessPage}><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-law-list">
                        {sectionsLoading ? (
                            <div className="eb-awareness-item">
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">Loading today's sections...</div>
                                <span className="eb-awareness-badge eb-badge-update">Loading</span>
                            </div>
                        ) : sectionsError ? (
                            <div className="eb-awareness-item">
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">{sectionsError}</div>
                                <span className="eb-awareness-badge eb-badge-new">Error</span>
                            </div>
                        ) : dailySections.slice(0, 6).map((item, i) => (
                            <button
                                type="button"
                                className="eb-awareness-item"
                                key={`${item.document}-${item.section}-${i}`}
                                onClick={() => openSectionDetail(item)}
                                style={{ width: "100%", border: "none", textAlign: "left" }}
                            >
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">
                                    <strong>{item.document} §{item.section}</strong> — {item.title}
                                </div>
                                <span className="eb-awareness-badge eb-badge-update">Open</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* LEGAL NEWS FEED */}
                <div className="eb-info-card">
                    <div className="eb-info-header">
                        <div className="eb-info-icon"><Newspaper size={17} /></div>
                        <div>
                            <div className="eb-info-title">Legal News Feed</div>
                            <div className="eb-info-sub">Live from Indian Kanoon · tap to explore</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Open news section" onClick={openNewsPage}><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-news-scroll">
                        {newsLoading ? (
                            <div className="eb-news-item" style={{ opacity: 0.5 }}>
                                <div className="eb-news-dot" />
                                <div className="eb-news-text">Loading latest legal news...</div>
                            </div>
                        ) : newsItems.length === 0 ? (
                            <div className="eb-news-item" style={{ opacity: 0.5 }}>
                                <div className="eb-news-dot" />
                                <div className="eb-news-text">No news available right now.</div>
                            </div>
                        ) : newsItems.map((item) => (
                            <button type="button" className="eb-news-item" key={item.id} onClick={() => router.push(`/free-tools/news/${item.id}?headline=${encodeURIComponent(item.headline)}&summary=${encodeURIComponent(item.summary)}&category=${encodeURIComponent(item.category)}`)} style={{ width: "100%", border: "none", textAlign: "left" }}>
                                <div className="eb-news-dot" />
                                <div>
                                    <div className="eb-news-text">{item.headline}</div>
                                    <div className="eb-news-time"><Clock size={9} /> {item.date}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button type="button" className="eb-view-all" onClick={openNewsPage} style={{ background: "transparent", border: "none" }}>
                        View All News <ChevronRight size={12} />
                    </button>
                </div>

            </div>

            {selectedSection ? (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        background: "rgba(15,30,51,0.56)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                    }}
                >
                    <div
                        style={{
                            width: "min(720px, 100%)",
                            maxHeight: "90vh",
                            overflow: "hidden",
                            borderRadius: 24,
                            border: "1px solid rgba(196,154,16,0.25)",
                            background: "var(--warm-white)",
                            boxShadow: "0 28px 80px rgba(15,30,51,0.35)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 16,
                                padding: "22px 24px",
                                borderBottom: "1px solid rgba(196,154,16,0.12)",
                                background: "linear-gradient(180deg,#FCF7EC 0%,#FFFDF8 100%)",
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold)" }}>
                                    {selectedSection.document} · Section {selectedSection.section}
                                </div>
                                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "var(--navy)", marginTop: 6 }}>
                                    {selectedSection.title}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedSection(null)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    border: "1px solid rgba(196,154,16,0.2)",
                                    background: "#fff",
                                    color: "var(--navy)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ maxHeight: "calc(90vh - 96px)", overflowY: "auto", padding: 24, display: "grid", gap: 18 }}>
                            <div style={{ background: "#FBF8F1", border: "1px solid rgba(196,154,16,0.18)", borderRadius: 18, padding: 20 }}>
                                <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-mid)", whiteSpace: "pre-wrap" }}>
                                    {selectedSection.snippet || "Full text not available."}
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-light)", textAlign: "center" }}>
                                Page {selectedSection.page} · Updated daily
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}