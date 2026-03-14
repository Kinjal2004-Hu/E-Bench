"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
    Scale, FileText, AlertTriangle, Newspaper,
    BookOpen, ChevronRight, Clock, Shield, Gavel,
    CheckCircle, Sparkles, MessageSquare, Maximize2, X, Landmark, LogOut
} from "lucide-react"
import {
    fetchRightsLawArticle,
    fetchRightsLawAwareness,
    fetchUserProfile,
    type LawAwarenessArticleDetail,
    type LawAwarenessArticleSummary,
} from "@/lib/userApi"
import { mockLegalNews } from "@/data/mockLegalNews"

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

const categories = ["Rights Guide"]

const DASHBOARD_SUGGESTED = [
    { q: "What is Section 302 BNS and its punishment?", icon: Scale },
    { q: "Explain bail provisions under BNSS 2023", icon: Gavel },
    { q: "How does Section 420 IPC apply to fraud cases?", icon: FileText },
    { q: "What are rights of an accused under Indian law?", icon: BookOpen },
    { q: "Procedure for filing an FIR in India", icon: Scale },
    { q: "Director liability under Companies Act 2013", icon: FileText },
]

export default function Dashboard() {
    const [activeCat, setActiveCat] = useState("All")
    const [message, setMessage] = useState("")
    const [isInputFocused, setIsInputFocused] = useState(false)
    const [userName, setUserName] = useState("there")
    const [rightsArticles, setRightsArticles] = useState<LawAwarenessArticleSummary[]>([])
    const [rightsLoading, setRightsLoading] = useState(true)
    const [rightsError, setRightsError] = useState("")
    const [selectedArticle, setSelectedArticle] = useState<LawAwarenessArticleDetail | null>(null)
    const [articleLoading, setArticleLoading] = useState(false)
    const [articleError, setArticleError] = useState("")
    const { display, cursor } = useTypewriter(TAGLINES)
    const router = useRouter()
    const showTypewriter = !isInputFocused && message.trim().length === 0

    useEffect(() => {
        let active = true

        fetchRightsLawAwareness()
            .then((data) => {
                if (!active) return
                setRightsArticles(data.articles)
                setRightsError("")
            })
            .catch((err: Error) => {
                if (!active) return
                setRightsError(err.message || "Unable to load rights law content.")
            })
            .finally(() => {
                if (active) setRightsLoading(false)
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

    const openRightsArticle = async (articleId: string) => {
        setArticleLoading(true)
        setArticleError("")
        setSelectedArticle(null)
        try {
            const detail = await fetchRightsLawArticle(articleId)
            setSelectedArticle(detail)
        } catch (err) {
            setArticleError(err instanceof Error ? err.message : "Unable to load article details.")
        } finally {
            setArticleLoading(false)
        }
    }

    useEffect(() => {
        if (!selectedArticle && !articleError && !articleLoading) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedArticle(null)
                setArticleError("")
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [selectedArticle, articleError, articleLoading])

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

            {/* BOTTOM ROW: daily law awareness (left) + legal news feed (right) */}
            <div className="eb-bottom-grid">

                {/* DAILY LAW AWARENESS */}
                <div className="eb-info-card">
                    <div className="eb-info-header">
                        <div className="eb-info-icon"><BookOpen size={17} /></div>
                        <div>
                            <div className="eb-info-title">Daily Law Awareness</div>
                            <div className="eb-info-sub">Fundamental rights guide · open article details</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Open full guide" onClick={openLawAwarenessPage}><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-law-chips">
                        {categories.map(c => (
                            <div key={c} className={`eb-chip ${activeCat === c ? "active" : ""}`} onClick={() => setActiveCat(c)}>{c}</div>
                        ))}
                    </div>
                    <div className="eb-law-list">
                        {rightsLoading ? (
                            <div className="eb-awareness-item">
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">Loading rights articles...</div>
                                <span className="eb-awareness-badge eb-badge-update">Loading</span>
                            </div>
                        ) : rightsError ? (
                            <div className="eb-awareness-item">
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">{rightsError}</div>
                                <span className="eb-awareness-badge eb-badge-new">Error</span>
                            </div>
                        ) : rightsArticles.map((item) => (
                            <button
                                type="button"
                                className="eb-awareness-item"
                                key={item.article_id}
                                onClick={() => openRightsArticle(item.article_id)}
                                style={{ width: "100%", border: "none", textAlign: "left" }}
                            >
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">
                                    <strong>{item.article_number}</strong> - {item.title}
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
                            <div className="eb-info-sub">Dummy legal updates · curated preview</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Open news section" onClick={openNewsPage}><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-news-scroll">
                        {mockLegalNews.slice(0, 5).map((item) => (
                            <button type="button" className="eb-news-item" key={item.id} onClick={openNewsPage} style={{ width: "100%", border: "none", textAlign: "left" }}>
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

            {(articleLoading || articleError || selectedArticle) ? (
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
                            width: "min(880px, 100%)",
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
                                    {selectedArticle?.article_number || "Rights Article"}
                                </div>
                                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, fontWeight: 700, color: "var(--navy)", marginTop: 6 }}>
                                    {selectedArticle?.title || "Loading article..."}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedArticle(null)
                                    setArticleError("")
                                }}
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
                            {articleLoading ? (
                                <div style={{ background: "#FBF8F1", border: "1px dashed rgba(196,154,16,0.25)", borderRadius: 18, padding: 18, color: "var(--text-mid)", fontSize: 14 }}>
                                    Loading article details...
                                </div>
                            ) : articleError ? (
                                <div style={{ background: "#FFF6F6", border: "1px solid #F1CFCF", borderRadius: 18, padding: 18, color: "#9B3A3A", fontSize: 14 }}>
                                    {articleError}
                                </div>
                            ) : selectedArticle ? (
                                <>
                                    <div style={{ background: "#FFFEFB", border: "1px solid rgba(196,154,16,0.18)", borderRadius: 22, padding: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", marginBottom: 10 }}>
                                            <BookOpen size={18} />
                                            <div style={{ fontWeight: 700 }}>What this article protects</div>
                                        </div>
                                        <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-mid)" }}>{selectedArticle.rights_explained}</div>
                                    </div>

                                    <div style={{ background: "#FFFEFB", border: "1px solid rgba(196,154,16,0.18)", borderRadius: 22, padding: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", marginBottom: 12 }}>
                                            <Scale size={18} />
                                            <div style={{ fontWeight: 700 }}>Practical use</div>
                                        </div>
                                        <div style={{ display: "grid", gap: 10 }}>
                                            {selectedArticle.practical_use.map((item) => (
                                                <div key={item} style={{ display: "flex", gap: 10, background: "#F8F2E5", borderRadius: 16, padding: "12px 14px", fontSize: 14, color: "var(--text-mid)", lineHeight: 1.7 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--gold)", marginTop: 8, flexShrink: 0 }} />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ background: "#FFFEFB", border: "1px solid rgba(196,154,16,0.18)", borderRadius: 22, padding: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", marginBottom: 12 }}>
                                            <Landmark size={18} />
                                            <div style={{ fontWeight: 700 }}>Past case references</div>
                                        </div>
                                        <div style={{ display: "grid", gap: 12 }}>
                                            {selectedArticle.case_references.map((caseItem) => (
                                                <div key={`${caseItem.case_name}-${caseItem.year}`} style={{ background: "#FCF8F0", border: "1px solid rgba(196,154,16,0.18)", borderRadius: 18, padding: 16 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>{caseItem.case_name}</div>
                                                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-light)", background: "#fff", borderRadius: 999, padding: "6px 10px" }}>
                                                            {caseItem.year}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-mid)", marginTop: 8 }}>{caseItem.principle}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}