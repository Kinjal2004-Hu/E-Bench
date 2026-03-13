"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Scale, Gavel, Paperclip, Send, Sparkles,
    CheckCheck, Copy, BookMarked, ArrowLeft,
} from "lucide-react";

const RAG_API = process.env.NEXT_PUBLIC_RAG_API || "http://localhost:8000";

type Section = { document: string; section_number: number; title: string; snippet?: string };
type IKResult = { doc_id: string; title: string; headline: string };
type Message = {
    id: number;
    sender: "user" | "ai";
    text: string;
    timestamp: string;
    sections?: Section[];
    ikResults?: IKResult[];
    saved?: boolean;
    copied?: boolean;
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function ExistingChatPage() {
    const { chatId } = useParams<{ chatId: string }>();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatTitle, setChatTitle] = useState("Legal AI Chat");
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load existing chat from localStorage
    useEffect(() => {
        if (!chatId) return;
        try {
            const raw = localStorage.getItem("ebench_chats");
            if (raw) {
                const all = JSON.parse(raw);
                const chat = all.find((c: { id: string }) => c.id === chatId);
                if (chat) {
                    if (chat.messages?.length) setMessages(chat.messages);
                    if (chat.title) setChatTitle(chat.title);
                }
            }
        } catch { /* ignore */ }
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Persist messages to localStorage
    useEffect(() => {
        if (!chatId || messages.length === 0) return;
        try {
            const raw = localStorage.getItem("ebench_chats");
            const all: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
            const idx = all.findIndex((c: { id?: string }) => c.id === chatId);
            const firstUser = messages.find(m => m.sender === "user");
            const last = messages[messages.length - 1];
            const entry = {
                id: chatId,
                title: firstUser?.text.slice(0, 80) ?? chatTitle,
                last_message: last.text.slice(0, 120),
                bot_type: "Legal Research",
                timestamp: new Date().toISOString(),
                message_count: messages.length,
                messages,
                pinned: idx >= 0 ? (all[idx] as { pinned?: boolean }).pinned ?? false : false,
            };
            if (idx >= 0) all[idx] = entry;
            else all.unshift(entry);
            localStorage.setItem("ebench_chats", JSON.stringify(all));
        } catch { /* ignore */ }
    }, [messages, chatId, chatTitle]);

    const sendMessage = async (text?: string) => {
        const q = (text ?? input).trim();
        if (!q || isTyping) return;
        setInput("");
        const now = new Date().toISOString();
        setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: q, timestamp: now }]);
        setIsTyping(true);
        try {
            const res = await fetch(`${RAG_API}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q, top_k: 7 }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: "ai",
                text: data.ai_answer || "No response generated.",
                timestamp: new Date().toISOString(),
                sections: data.supporting_sections || [],
                ikResults: data.indian_kanoon_results || [],
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: "ai",
                text: "Sorry, I couldn't reach the AI service. Please ensure the RAG server is running at localhost:8000.",
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCopy = (id: number, text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: true } : m));
        setTimeout(() => setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: false } : m)), 2000);
    };

    const handleSave = (id: number) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, saved: !m.saved } : m));
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0B1E45] via-[#0F2854] to-[#1C4D8D] shrink-0">
                <button
                    onClick={() => router.push("/chats")}
                    className="p-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors shrink-0"
                >
                    <ArrowLeft size={15} />
                </button>
                <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-yellow-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-white text-[14px] truncate">{chatTitle}</h1>
                    <p className="text-[10px] text-blue-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        AI Legal Assistant
                    </p>
                </div>
            </div>

            {/* ── Chat Body ── */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#F8FAFC]">
                <div className="p-5 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] flex items-center justify-center mb-3">
                                <Scale size={22} className="text-[#1C4D8D]" />
                            </div>
                            <p className="text-sm font-medium text-gray-600">Continue the conversation</p>
                            <p className="text-xs text-gray-400 mt-1">Ask a legal question to continue this chat</p>
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm self-start mt-1 ${msg.sender === "ai" ? "bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] text-white" : "bg-[#EEF4FF] text-[#0F2854] border border-[#C8DEFF]"}`}>
                                {msg.sender === "ai" ? "AI" : "YOU"}
                            </div>
                            <div className={`flex flex-col gap-2 max-w-[78%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                                {/* Main bubble */}
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === "user" ? "bg-[#0F2854] text-white rounded-tr-sm" : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm whitespace-pre-wrap"}`}>
                                    {msg.text}
                                </div>
                                {/* Referenced Laws */}
                                {msg.sections && msg.sections.length > 0 && (
                                    <div className="bg-white border border-[#D8E6FF] rounded-xl p-3.5 w-full shadow-sm">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#0F2854] uppercase tracking-wider mb-2.5 pb-2 border-b border-gray-100">
                                            <Scale size={11} className="text-[#4988C4]" /> Referenced Laws
                                        </p>
                                        <ul className="space-y-1.5">
                                            {msg.sections.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                                    <span className="w-4 h-4 rounded-full bg-[#EEF4FF] text-[#1C4D8D] flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                                    <span><strong>{s.document}</strong> — §{s.section_number}: {s.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {/* Relevant Judgements */}
                                {msg.ikResults && msg.ikResults.length > 0 && (
                                    <div className="bg-[#FFFDF5] border border-[#E8D9A8] rounded-xl p-3.5 w-full shadow-sm">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#7C5C00] uppercase tracking-wider mb-2.5 pb-2 border-b border-yellow-100">
                                            <Gavel size={11} className="text-[#C49A10]" /> Relevant Judgements
                                        </p>
                                        <ul className="space-y-1.5">
                                            {msg.ikResults.map((ik, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                                    <span className="w-4 h-4 rounded-full bg-[#FFFBEB] text-[#C49A10] flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                                    <span><strong>{ik.title}</strong>{ik.headline ? <span className="text-gray-400"> — {ik.headline.slice(0, 90)}</span> : null}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {/* Timestamp + Actions */}
                                <div className={`flex items-center gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                                    <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                                    {msg.sender === "ai" && (
                                        <>
                                            <button
                                                onClick={() => handleCopy(msg.id, msg.text)}
                                                className={`flex items-center gap-1 text-[10px] transition-colors ${msg.copied ? "text-emerald-600" : "text-gray-400 hover:text-[#1C4D8D]"}`}
                                            >
                                                {msg.copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                                                {msg.copied ? "Copied!" : "Copy"}
                                            </button>
                                            <button
                                                onClick={() => handleSave(msg.id)}
                                                className={`flex items-center gap-1 text-[10px] transition-colors ${msg.saved ? "text-[#C49A10]" : "text-gray-400 hover:text-[#C49A10]"}`}
                                            >
                                                <BookMarked size={11} />
                                                {msg.saved ? "Saved" : "Save"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] text-white flex items-center justify-center text-[10px] font-bold shrink-0 self-start mt-1 shadow-sm">AI</div>
                            <div className="px-4 py-3.5 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm flex items-center gap-1.5">
                                <style>{`.ebd{display:inline-block;width:7px;height:7px;border-radius:50%;background:#4988C4} @keyframes ebB{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}} .ebd:nth-child(1){animation:ebB 1.2s ease infinite 0s} .ebd:nth-child(2){animation:ebB 1.2s ease infinite .15s} .ebd:nth-child(3){animation:ebB 1.2s ease infinite .3s}`}</style>
                                <span className="ebd" /><span className="ebd" /><span className="ebd" />
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Bar ── */}
            <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3.5 pb-4">
                <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    className="flex items-center gap-2"
                >
                    <button type="button" className="p-2 rounded-xl text-gray-400 hover:text-[#4988C4] hover:bg-[#EEF4FF] transition-colors shrink-0" title="Attach file">
                        <Paperclip size={17} />
                    </button>
                    <div className="flex-1 border border-gray-200 rounded-2xl bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#4988C4] focus-within:ring-2 focus-within:ring-[#4988C4]/15 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a legal question — cite a section, case, or scenario..."
                            className="w-full bg-transparent px-4 py-3 outline-none text-sm text-gray-800 placeholder:text-gray-400"
                            disabled={isTyping}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-3 rounded-2xl bg-[#0F2854] text-white flex items-center justify-center disabled:opacity-40 disabled:bg-gray-300 hover:bg-[#1C4D8D] transition-all shrink-0 shadow-sm"
                    >
                        <Send size={17} />
                    </button>
                </form>
                <p className="text-[10px] text-center text-gray-400 mt-2 select-none">
                    E-Bench AI can make mistakes. Verify critical legal information with a licensed professional.
                </p>
            </div>
        </div>
    );
}