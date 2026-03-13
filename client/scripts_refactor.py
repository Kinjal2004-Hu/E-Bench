import os

layout_path = r"c:\Users\Kinjal Ojha\Desktop\E-Bench\client\app\(dashboard)\layout.tsx"
page_path = r"c:\Users\Kinjal Ojha\Desktop\E-Bench\client\app\(dashboard)\dashboard\page.tsx"

with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

# Extract CSS
css_start = page_content.find("const makeStyle = (dark) => `")
css_end = page_content.find("`", css_start + 30) + 1
css_code = page_content[css_start:css_end]

# Layout code
layout_code = """"use client"

import { useState } from "react"
import {
    Bell, Search, Scale, FileText, LayoutDashboard, BookOpen, 
    Shield, Download, Settings, User, ChevronLeft, ChevronRight as ChevronR, 
    Mail, Sun, Moon
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

""" + css_code + """

const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cases", href: "/cases", icon: Scale },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: "Chats", href: "/chats", icon: BookOpen },
    { label: "Summaries", href: "/summaries", icon: Shield },
]

const bottomNav = [
    { label: "Downloads", href: "/downloads", icon: Download },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "User Profile", href: "/profile", icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(true)
    const [dark, setDark] = useState(false)
    const pathname = usePathname()
    const css = makeStyle(dark)
    const activeLabel = [...mainNav, ...bottomNav].find(nav => pathname.startsWith(nav.href))?.label || "Dashboard"

    return (
        <>
            <style>{css}</style>
            <div className="eb-root">

                {/* ── SIDEBAR ── */}
                <div className={`eb-sidebar ${open ? "" : "collapsed"}`}>
                    <button className="eb-toggle-btn" onClick={() => setOpen(!open)}>
                        {open ? <ChevronLeft size={13} strokeWidth={2.5} /> : <ChevronR size={13} strokeWidth={2.5} />}
                    </button>
                    <div className="eb-sidebar-inner">
                        <div className="eb-logo-wrap">
                            <div className="eb-logo-expanded">
                                <div className="eb-logo-text">
                                    <span className="eb-logo-text-main">E-Bench</span>
                                    <span className="eb-logo-text-sub">Digital Justice</span>
                                </div>
                            </div>
                            <div className="eb-logo-collapsed">
                                <img src="/logo.png" alt="E-Bench" className="eb-logo-img" style={{ width: 36, height: 36 }} />
                            </div>
                        </div>
                        {mainNav.map(({ label, href, icon: Icon }) => (
                            <Link key={label} href={href} data-tip={label}
                                className={`eb-navitem ${activeLabel === label ? "active" : ""}`}>
                                <Icon size={16} /><span className="eb-navitem-label">{label}</span>
                            </Link>
                        ))}
                        <div className="eb-sidebar-spacer" />
                        <div className="eb-sidebar-divider" />
                        {bottomNav.map(({ label, href, icon: Icon }) => (
                            <Link key={label} href={href} data-tip={label}
                                className={`eb-navitem ${activeLabel === label ? "active" : ""}`}>
                                <Icon size={16} /><span className="eb-navitem-label">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── MAIN ── */}
                <div className="eb-main">

                    {/* NAVBAR */}
                    <div className="eb-navbar">
                        <div className="eb-search-box">
                            <Search size={15} />
                            <input placeholder="Search cases, contracts, documents, or legal sections…" />
                        </div>
                        <div className="eb-navbar-right">
                            <Link href="/contact" className="eb-navbar-contact">
                                <Mail size={14} /> Contact Us
                            </Link>
                            <button className="eb-theme-btn" data-tip={dark ? "Light Mode" : "Dark Mode"} onClick={() => setDark(!dark)}>
                                {dark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                            <button className="eb-notif-btn">
                                <Bell size={16} /><span className="eb-notif-dot" />
                            </button>
                        </div>
                    </div>

                    {/* CONTENT Area */}
                    <div className="eb-content">
                        {children}
                    </div>
                </div>

            </div>
        </>
    )
}
"""

with open(layout_path, 'w', encoding='utf-8') as f:
    f.write(layout_code)


page_code_new = """"use client"

import { useState, useEffect, useRef } from "react"
import {
    Scale, FileText, AlertTriangle, Newspaper,
    BookOpen, ChevronRight, Clock, Shield,
    CheckCircle, Sparkles, MessageSquare, Maximize2
} from "lucide-react"

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

const newsItems = [
    { text: "Supreme Court upholds digital privacy in landmark ruling", time: "2h ago" },
    { text: "IPC Section 420 amendments on fraud — penalties tightened", time: "5h ago" },
    { text: "Ministry releases new guidelines for digital evidence", time: "1d ago" },
    { text: "High Court stays new bail amendment provisions", time: "2d ago" },
    { text: "Cyber law tribunals established across 12 new states", time: "3d ago" },
]
const awarenessItems = [
    { text: "RTI filing now fully digital — simplified process for all citizens", badge: "New", type: "new" },
    { text: "Consumer Protection Act 2019: updated complaint deadlines issued", badge: "Update", type: "update" },
    { text: "New POCSO guidelines issued by Ministry of Women & Child Dev.", badge: "New", type: "new" },
    { text: "Amended Motor Vehicles Act — penalty structures revised", badge: "Update", type: "update" },
    { text: "Domestic Violence Act amendments — broader protection scope", badge: "New", type: "new" },
]
const categories = ["All", "Criminal", "Cyber Law", "Constitutional", "Civil", "Corporate"]

export default function Dashboard() {
    const [activeCat, setActiveCat] = useState("All")
    const { display, cursor } = useTypewriter(TAGLINES)
    const userName = "Kinjal"

    return (
        <>
            {/* WELCOME */}
            <div className="eb-welcome">
                <div className="eb-welcome-title">Welcome back, {userName}.</div>
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
                    <div className="eb-chatbot-input-row">
                        <MessageSquare size={14} />
                        <input className="eb-chat-input" placeholder="" style={{ caretColor: "transparent" }} />
                        <span style={{ fontSize: 13, color: "var(--txt-light)", pointerEvents: "none", whiteSpace: "nowrap", overflow: "hidden", flex: 1, display: "flex", alignItems: "center" }}>
                            {display}<span className="eb-chat-cursor" style={{ opacity: cursor ? 1 : 0 }} />
                        </span>
                        <button className="eb-chat-send"><Sparkles size={13} /> Ask</button>
                    </div>
                </div>

                {/* 3 TOOL CARDS stacked */}
                <div className="eb-tools-col">
                    <div className="eb-tool-card">
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><Scale size={18} /></div>
                            <span className="eb-tool-tag">Case Intelligence</span>
                        </div>
                        <div className="eb-tool-name">AI Case Analyzer</div>
                        <div className="eb-tool-desc">Upload or describe a case and instantly identify applicable legal sections and relevant past judgments.</div>
                        <div className="eb-tool-link">Analyze a Case <ChevronRight size={12} /></div>
                    </div>
                    <div className="eb-tool-card">
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><AlertTriangle size={18} /></div>
                            <span className="eb-tool-tag">Risk Detection</span>
                        </div>
                        <div className="eb-tool-name">Contract Risk Analyzer</div>
                        <div className="eb-tool-desc">Detect hidden risks, unfair clauses, and legal loopholes. Get a plain-English risk score.</div>
                        <div className="eb-tool-link">Review a Contract <ChevronRight size={12} /></div>
                    </div>
                    <div className="eb-tool-card">
                        <div className="eb-tool-top-row">
                            <div className="eb-tool-icon-box"><FileText size={18} /></div>
                            <span className="eb-tool-tag">Document Processing</span>
                        </div>
                        <div className="eb-tool-name">Case File Summarizer</div>
                        <div className="eb-tool-desc">Convert FIRs, chargesheets, and court orders into clear structured summaries in minutes.</div>
                        <div className="eb-tool-link">Summarize a Document <ChevronRight size={12} /></div>
                    </div>
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
                            <div className="eb-info-sub">Know your rights · stay informed</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Full screen"><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-law-chips">
                        {categories.map(c => (
                            <div key={c} className={`eb-chip ${activeCat === c ? "active" : ""}`} onClick={() => setActiveCat(c)}>{c}</div>
                        ))}
                    </div>
                    <div className="eb-law-list">
                        {awarenessItems.map((item, i) => (
                            <div className="eb-awareness-item" key={i}>
                                <CheckCircle size={13} />
                                <div className="eb-awareness-text">{item.text}</div>
                                <span className={`eb-awareness-badge ${item.type === "new" ? "eb-badge-new" : "eb-badge-update"}`}>{item.badge}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LEGAL NEWS FEED */}
                <div className="eb-info-card">
                    <div className="eb-info-header">
                        <div className="eb-info-icon"><Newspaper size={17} /></div>
                        <div>
                            <div className="eb-info-title">Legal News Feed</div>
                            <div className="eb-info-sub">Curated legal developments · updated hourly</div>
                        </div>
                        <button className="eb-fullscreen-btn" title="Full screen"><Maximize2 size={13} /></button>
                    </div>
                    <div className="eb-news-scroll">
                        {newsItems.map((item, i) => (
                            <div className="eb-news-item" key={i}>
                                <div className="eb-news-dot" />
                                <div>
                                    <div className="eb-news-text">{item.text}</div>
                                    <div className="eb-news-time"><Clock size={9} /> {item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="eb-view-all">View All News <ChevronRight size={12} /></div>
                </div>

            </div>
        </>
    )
}
"""

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_code_new)

print("Done")
