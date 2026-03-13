"use client"

import { useState } from "react"
import {
    Bell, Search, Scale, FileText, LayoutDashboard, BookOpen,
  Download, Settings, User, ChevronLeft, ChevronRight as ChevronR,
    Mail, Sun, Moon, Bot, Plus, GraduationCap
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const makeStyle = (dark :boolean) => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #C49A10;
    --gold-light: #e8c94a;
    --sb-bg:      ${dark ? "#1a1f2e" : "#C8B48A"};
    --sb-text:    ${dark ? "rgba(255,255,255,0.75)" : "#333"};
    --sb-active:  ${dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.45)"};
    --sb-hover-ul:${dark ? "rgba(200,180,138,0.8)" : "#1C2333"};
    --tip-bg:     ${dark ? "#C49A10" : "#1C2333"};
    --tip-clr:    #fff;
    --bg:         ${dark ? "#0f1319" : "#EDE8DF"};
    --surface:    ${dark ? "#1a1f2e" : "#FFFFFF"};
    --surface2:   ${dark ? "#222840" : "#F5F1EA"};
    --surface3:   ${dark ? "#2a3050" : "#EDE7D9"};
    --border:     ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
    --navy:       ${dark ? "#a8c4f0" : "#1C2333"};
    --navy-icon:  ${dark ? "#1C2333" : "#1C2333"};
    --txt:        ${dark ? "#e8e8e8" : "#222"};
    --txt-mid:    ${dark ? "#aaa" : "#555"};
    --txt-light:  ${dark ? "#666" : "#888"};
    --card-icon-bg: ${dark ? "#0f1319" : "#1C2333"};
    --card-icon-clr:${dark ? "#C49A10" : "#D4A017"};
    --chip-bg:    ${dark ? "#222840" : "#F5F1EA"};
    --chip-bd:    ${dark ? "#333d60" : "#E2DAC8"};
  }

  .eb-root { display:flex; height:100vh; width:100%; font-family:'Inter',sans-serif; background:var(--bg); overflow:hidden; transition: background 0.3s; }

  /* ── SIDEBAR ── */
  .eb-sidebar {
    width: 185px; background: var(--sb-bg);
    display:flex; flex-direction:column;
    transition: width 0.32s cubic-bezier(.4,0,.2,1), background 0.3s;
    overflow: visible; position:relative; flex-shrink:0; z-index:20;
  }
  .eb-sidebar.collapsed { width: 62px; }
  .eb-sidebar-inner { display:flex; flex-direction:column; height:100%; overflow:hidden; padding:16px 10px 12px; gap:3px; }

  /* logo area */
  .eb-logo-wrap {
    display:flex; align-items:center; justify-content:center;
    padding-bottom:14px; border-bottom:1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"};
    margin-bottom:8px; overflow:hidden; flex-shrink:0;
  }
  .eb-logo-img { object-fit:contain; display:block; }
  /* expanded: text name */
  .eb-logo-text { display:flex; flex-direction:column; align-items:center; gap:2px; white-space:nowrap; }
  .eb-logo-text-main { font-family:'Playfair Display',serif; font-size:20px; font-weight:700; color:${dark ? "#C49A10" : "#1C2333"}; letter-spacing:-0.01em; line-height:1; }
  .eb-logo-text-sub  { font-size:9px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:${dark ? "rgba(196,154,16,0.7)" : "rgba(28,35,51,0.5)"}; }
  .eb-logo-expanded { display:flex; align-items:center; justify-content:center; }
  .eb-logo-collapsed { display:none; align-items:center; justify-content:center; }
  .eb-sidebar.collapsed .eb-logo-expanded { display:none; }
  .eb-sidebar.collapsed .eb-logo-collapsed { display:flex; }

  /* toggle btn on boundary */
  .eb-toggle-btn {
    position:absolute; right:-13px; top:16px;
    width:26px; height:26px;
    background:var(--sb-bg); border:2px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"};
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:${dark ? "#C49A10" : "#1C2333"};
    transition:background 0.18s, box-shadow 0.18s, color 0.18s;
    z-index:30; box-shadow:0 2px 8px rgba(0,0,0,0.2);
  }
  .eb-toggle-btn:hover { background:var(--gold); color:#fff; box-shadow:0 3px 14px rgba(196,154,16,0.4); }

  /* nav items */
  .eb-navitem {
    position:relative; display:flex; align-items:center; gap:10px;
    padding:10px 10px; border:none; border-bottom:2px solid transparent; border-radius:0;
    background:transparent; color:var(--sb-text);
    font-family:'Inter',sans-serif; font-size:13px; font-weight:500;
    cursor:pointer; text-align:left; white-space:nowrap; width:100%;
    transition: border-color 0.18s, background 0.18s, color 0.18s, border-radius 0.18s;
    overflow:hidden;
  }
  .eb-navitem svg { flex-shrink:0; opacity:0.65; transition:opacity 0.18s; }
  .eb-navitem-label { opacity:1; transition:opacity 0.2s; overflow:hidden; }

  .eb-sidebar.collapsed .eb-navitem { justify-content:center; padding:10px 0; border-bottom-color:transparent !important; }
  .eb-sidebar.collapsed .eb-navitem-label { width:0; opacity:0; pointer-events:none; }

  /* expanded hover = underline */
  .eb-sidebar:not(.collapsed) .eb-navitem:hover { border-bottom-color:var(--sb-hover-ul); color:var(--sb-hover-ul); }
  .eb-sidebar:not(.collapsed) .eb-navitem:hover svg { opacity:1; }
  /* expanded active = light box */
  .eb-sidebar:not(.collapsed) .eb-navitem.active { background:var(--sb-active); border-radius:8px; border-bottom-color:transparent; color:${dark ? "#fff" : "#1C2333"}; font-weight:600; }
  .eb-sidebar:not(.collapsed) .eb-navitem.active svg { opacity:1; }
  /* collapsed hover = box */
  .eb-sidebar.collapsed .eb-navitem:hover { background:var(--sb-active); border-radius:10px; }
  .eb-sidebar.collapsed .eb-navitem:hover svg { opacity:1; }
  /* collapsed active = box */
  .eb-sidebar.collapsed .eb-navitem.active { background:var(--sb-active); border-radius:10px; }
  .eb-sidebar.collapsed .eb-navitem.active svg { opacity:1; }

  /* tooltip (collapsed only) */
  .eb-sidebar.collapsed .eb-navitem::after {
    content:attr(data-tip); position:fixed; left:74px;
    background:var(--tip-bg); color:var(--tip-clr);
    font-family:'Inter',sans-serif; font-size:11.5px; font-weight:500;
    padding:5px 12px; border-radius:7px; white-space:nowrap;
    opacity:0; pointer-events:none; transition:opacity 0.18s;
    z-index:9999; transform:translateY(-50%);
  }
  .eb-sidebar.collapsed .eb-navitem::before {
    content:''; position:fixed; left:68px;
    border:5px solid transparent; border-right-color:var(--tip-bg);
    opacity:0; pointer-events:none; transition:opacity 0.18s;
    z-index:9999; transform:translateY(-50%);
  }
  .eb-sidebar.collapsed .eb-navitem:hover::after,
  .eb-sidebar.collapsed .eb-navitem:hover::before { opacity:1; }

  .eb-sidebar-spacer { flex:1; min-height:10px; }
  .eb-sidebar-divider { height:1px; background:${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}; margin:4px 0 6px; flex-shrink:0; }

  /* ── MAIN ── */
  .eb-main { flex:1; display:flex; flex-direction:column; overflow:hidden; min-width:0; }

  /* navbar */
  .eb-navbar {
    background:var(--surface); border-bottom:1px solid var(--border);
    padding:0 24px; height:62px; display:flex; align-items:center; flex-shrink:0;
    transition:background 0.3s; position:relative;
  }
  .eb-search-box {
    display:flex; align-items:center; gap:9px;
    background:var(--surface2); border:1.5px solid var(--chip-bd);
    border-radius:30px; padding:0 16px; height:40px; width:400px;
    transition:background 0.3s, border-color 0.3s;
    position:absolute; left:50%; transform:translateX(-50%);
  }
  .eb-search-box svg { color:var(--txt-light); flex-shrink:0; }
  .eb-search-box input { flex:1; border:none; background:transparent; font-family:'Inter',sans-serif; font-size:13.5px; color:var(--txt); outline:none; }
  .eb-search-box input::placeholder { color:var(--txt-light); }
  .eb-navbar-right { margin-left:auto; display:flex; gap:10px; align-items:center; z-index:1; }

  /* contact us navbar button */
  .eb-navbar-contact {
    display:flex; align-items:center; gap:7px;
    padding:0 16px; height:38px;
    background:var(--gold); color:#fff;
    border:none; border-radius:9px;
    font-family:'Inter',sans-serif; font-size:12.5px; font-weight:500;
    cursor:pointer; transition:opacity 0.18s, transform 0.15s;
    box-shadow:0 2px 8px rgba(196,154,16,0.28); flex-shrink:0;
  }
  .eb-navbar-contact:hover { opacity:0.88; transform:translateY(-1px); }

  /* dark/light toggle */
  .eb-theme-btn {
    width:38px; height:38px; border-radius:9px; border:1.5px solid var(--chip-bd);
    background:var(--surface2); color:var(--txt); display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all 0.18s; position:relative;
  }
  .eb-theme-btn:hover { background:var(--gold); color:#fff; border-color:var(--gold); }

  /* notification icon-only btn */
  .eb-notif-btn {
    position:relative; width:38px; height:38px; border-radius:9px;
    border:1.5px solid var(--chip-bd); background:var(--surface2); color:var(--txt);
    display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.18s;
  }
  .eb-notif-btn:hover { background:var(--gold); color:#fff; border-color:var(--gold); }
  .eb-notif-dot { position:absolute; top:6px; right:7px; width:7px; height:7px; background:#E74C3C; border-radius:50%; border:2px solid var(--surface2); }

  /* content */
  .eb-content { flex:1; overflow-y:auto; padding:10px 24px 20px; display:flex; flex-direction:column; gap:16px; }
  .eb-content::-webkit-scrollbar { width:5px; }
  .eb-content::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.12); border-radius:3px; }

  /* welcome */
  .eb-welcome { flex-shrink:0; margin-bottom:2px; }
  .eb-welcome-title { font-family:'Playfair Display',serif; font-size:26px; font-weight:700; color:var(--navy); line-height:1.15; }

  /* ── TOP ROW: chatbot big-left + 3 tool cards stacked right ── */
  .eb-top-grid { display:grid; grid-template-columns:1fr 320px; gap:16px; flex-shrink:0; }

  /* CHATBOT card — slightly darker surface to make it stand out */
  .eb-chatbot-card {
    background:${dark ? "#1e2436" : "#EDE0CB"}; border-radius:18px; padding:32px 28px 26px;
    border:1.5px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(196,154,16,0.2)"};
    display:flex; flex-direction:column; gap:18px; min-height:280px;
    box-shadow: 0 4px 24px ${dark ? "rgba(0,0,0,0.3)" : "rgba(196,154,16,0.1)"};
    transition:background 0.3s;
  }
  .eb-chatbot-top { display:flex; align-items:center; gap:12px; }
  .eb-chatbot-icon {
    width:44px; height:44px;
    background:var(--navy); border-radius:12px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    box-shadow:0 3px 12px rgba(28,35,51,0.25);
  }
  .eb-chatbot-heading { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; color:var(--navy); }
  .eb-chatbot-sub-txt { font-size:11px; color:var(--txt-light); margin-top:2px; }
  .eb-chatbot-desc { font-size:13px; line-height:1.75; color:var(--txt-mid); flex:1; }
  .eb-chatbot-input-row {
    display:flex; align-items:center; gap:10px;
    background:${dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)"};
    border:1.5px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(196,154,16,0.25)"};
    border-radius:12px; padding:12px 14px; margin-top:auto;
    transition:border-color 0.2s, box-shadow 0.2s;
  }
  .eb-chatbot-input-row:focus-within { border-color:var(--gold); box-shadow:0 0 0 3px rgba(196,154,16,0.12); }
  .eb-chatbot-input-row svg { color:var(--gold); flex-shrink:0; }
  .eb-chat-input { flex:1; border:none; background:transparent; font-family:'Inter',sans-serif; font-size:13px; color:var(--txt); outline:none; min-width:0; }
  .eb-chat-cursor { display:inline-block; width:2px; height:13px; background:var(--gold); margin-left:1px; border-radius:1px; vertical-align:middle; animation:eb-blink 1.05s steps(1) infinite; }
  @keyframes eb-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  .eb-chat-send { display:flex; align-items:center; gap:7px; padding:0 20px; height:40px; background:var(--gold); color:#fff; border:none; border-radius:9px; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:opacity 0.18s,transform 0.15s; flex-shrink:0; box-shadow:0 2px 12px rgba(196,154,16,0.3); }
  .eb-chat-send:hover { opacity:0.88; transform:translateY(-1px); }

  /* tool cards column (stacked) */
  .eb-tools-col { display:flex; flex-direction:column; gap:12px; }
  .eb-tool-card {
    background:var(--surface); border-radius:14px; padding:18px 18px;
    border:1.5px solid var(--border); cursor:pointer;
    transition:box-shadow 0.22s,transform 0.22s,border-color 0.22s,background 0.3s;
    display:flex; flex-direction:column; gap:8px; flex:1;
  }
  .eb-tool-card:hover { box-shadow:0 6px 24px rgba(0,0,0,0.1); transform:translateY(-2px); border-color:rgba(196,154,16,0.3); }
  .eb-tool-top-row { display:flex; align-items:center; justify-content:space-between; }
  .eb-tool-icon-box {
    width:40px; height:40px; background:var(--navy); border-radius:10px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    color:${dark ? "#C49A10" : "#D4A017"};
  }
  .eb-tool-card:hover .eb-tool-icon-box { background:var(--gold); color:#fff; }
  .eb-tool-tag { font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--gold); }
  .eb-tool-name { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; color:var(--navy); line-height:1.2; }
  .eb-tool-desc { font-size:11.5px; line-height:1.6; color:var(--txt-mid); }
  .eb-tool-link { display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; color:var(--gold); margin-top:2px; transition:gap 0.18s; }
  .eb-tool-card:hover .eb-tool-link { gap:8px; }

  /* ── BOTTOM ROW: daily law awareness (left) + legal news feed (right) ── */
  .eb-bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; min-height:360px; flex-shrink:0; }

  /* shared info card */
  .eb-info-card {
    background:var(--surface); border-radius:16px; padding:20px 20px;
    border:1.5px solid var(--border); display:flex; flex-direction:column; gap:12px;
    transition:background 0.3s; overflow:hidden; height:360px;
  }
  .eb-info-header { display:flex; align-items:center; gap:10px; flex-shrink:0; padding-bottom:12px; border-bottom:1px solid var(--border); }

  /* fullscreen button */
  .eb-fullscreen-btn {
    margin-left:auto; width:28px; height:28px; border-radius:7px; flex-shrink:0;
    background:var(--surface2); border:1.5px solid var(--border);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:var(--txt-mid); transition:all 0.18s;
  }
  .eb-fullscreen-btn:hover { background:var(--navy); color:#fff; border-color:var(--navy); }
  .eb-info-icon {
    width:38px; height:38px; background:var(--navy); border-radius:10px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
    color:${dark ? "#C49A10" : "#D4A017"};
  }
  .eb-info-title { font-family:'Playfair Display',serif; font-size:16px; font-weight:700; color:var(--navy); }
  .eb-info-sub { font-size:11px; color:var(--txt-light); margin-top:1px; }

  /* law awareness */
  .eb-law-list { flex:1; overflow-y:auto; display:flex; flex-direction:column; min-height:0; }
  .eb-law-list::-webkit-scrollbar { width:3px; }
  .eb-law-list::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.13); border-radius:2px; }
  .eb-awareness-item { display:flex; align-items:flex-start; gap:9px; padding:9px 10px; background:var(--surface2); border-radius:9px; margin-bottom:6px; transition:background 0.15s; cursor:pointer; flex-shrink:0; }
  .eb-awareness-item:hover { background:var(--surface3); }
  .eb-awareness-item svg { color:var(--gold); flex-shrink:0; margin-top:1px; }
  .eb-awareness-text { font-size:12px; line-height:1.5; color:var(--txt); flex:1; }
  .eb-awareness-badge { font-size:10px; font-weight:600; padding:2px 8px; border-radius:10px; white-space:nowrap; flex-shrink:0; }
  .eb-badge-new    { background:rgba(39,174,96,0.12); color:#1e8449; }
  .eb-badge-update { background:rgba(196,154,16,0.12); color:var(--gold); }
  .eb-law-chips { display:flex; flex-wrap:wrap; gap:5px; flex-shrink:0; }
  .eb-chip { padding:4px 10px; border-radius:20px; font-size:11px; font-weight:500; background:var(--chip-bg); border:1.5px solid var(--chip-bd); color:var(--txt-mid); cursor:pointer; transition:all 0.18s; }
  .eb-chip:hover,.eb-chip.active { background:var(--navy); color:#fff; border-color:var(--navy); }

  /* news feed */
  .eb-news-scroll { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:7px; min-height:0; }
  .eb-news-scroll::-webkit-scrollbar { width:3px; }
  .eb-news-scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.13); border-radius:2px; }
  .eb-news-item { display:flex; gap:9px; align-items:flex-start; padding:9px 10px; background:var(--surface2); border-radius:9px; transition:background 0.15s; flex-shrink:0; cursor:pointer; }
  .eb-news-item:hover { background:var(--surface3); }
  .eb-news-dot { width:6px; height:6px; border-radius:50%; background:var(--gold); margin-top:5px; flex-shrink:0; }
  .eb-news-text { font-size:12px; line-height:1.5; color:var(--txt); }
  .eb-news-time { font-size:10px; color:var(--txt-light); display:flex; align-items:center; gap:3px; margin-top:2px; }
  .eb-view-all { display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; color:var(--gold); cursor:pointer; flex-shrink:0; transition:gap 0.18s; margin-top:2px; }
  .eb-view-all:hover { gap:7px; }
`

const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cases", href: "/cases", icon: Scale },
    { label: "Contracts", href: "/contracts", icon: FileText },
    { label: "Microlearning", href: "/microlearning", icon: GraduationCap },
    { label: "AI Chatbot", href: "/chat", icon: Bot },
    { label: "My Chats", href: "/chats", icon: BookOpen },
  { label: "Community", href: "/community", icon: BookOpen },
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
    const activeLabel = [...mainNav, ...bottomNav].find(nav =>
        pathname === nav.href || pathname.startsWith(nav.href + "/")
    )?.label || "Dashboard"

    return (
        <>
            <style suppressHydrationWarning>{css}</style>
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
                        <Link href="/chats/new" data-tip="New Chat"
                            className="eb-navitem"
                            style={{ marginTop: 4, background: 'var(--gold)', borderRadius: 8, color: '#fff', opacity: 1 }}>
                            <Plus size={16} /><span className="eb-navitem-label" style={{ fontWeight: 600 }}>New Chat</span>
                        </Link>
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
                            <button className="eb-theme-btn" onClick={() => setDark(!dark)}>
                                {dark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                            <button className="eb-notif-btn" title="Notifications" aria-label="Notifications">
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