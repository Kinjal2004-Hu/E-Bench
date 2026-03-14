"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { SendHorizontal, Clock, ArrowLeft, Scale, Paperclip, X, FileText, Image } from "lucide-react";
import { io, Socket } from "socket.io-client";

const SESSION_DURATION = 30 * 60;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface ChatMsg {
  _id?: string;
  sender: string;
  senderModel: "User" | "Consultant";
  content: string;
  timestamp?: string;
  pending?: boolean;
  attachment?: { name: string; url: string; type: string };
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("ebench_token") || "";
}

export default function ChatSessionPage() {
  const { roomId: chatId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lawyerName = searchParams.get("lawyer") ?? "Lawyer";
  const lawyerId = searchParams.get("lawyerId") ?? "";
  const role = searchParams.get("role") ?? "user";

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [connected, setConnected] = useState(false);

  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userIdRef = useRef("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userIdRef.current = payload.id || payload.userId || "";
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!chatId) return;
    const token = getToken();
    if (!token) return;
    const socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;
    socket.on("connect", () => { setConnected(true); socket.emit("join-chat-room", { chatId }); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat-message-realtime", (msg: ChatMsg) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.pending && m.sender === msg.sender && m.content === msg.content);
        if (idx !== -1) { const u = [...prev]; u[idx] = msg; return u; }
        return [...prev, msg];
      });
    });
    return () => { socket.disconnect(); };
  }, [chatId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(timerRef.current!); setSessionEnded(true); return 0; } return t - 1; });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachedFile({ name: file.name, url, type: file.type });
    e.target.value = "";
  };

  const handleSend = useCallback(() => {
    if ((!input.trim() && !attachedFile) || sessionEnded || !socketRef.current) return;
    const content = input.trim() || (attachedFile ? `📎 ${attachedFile.name}` : "");
    const attachment = attachedFile ?? undefined;
    setInput("");
    setAttachedFile(null);
    const optimistic: ChatMsg = { sender: userIdRef.current, senderModel: role === "lawyer" ? "Consultant" : "User", content, attachment, pending: true };
    setMessages((prev) => [...prev, optimistic]);
    socketRef.current.emit("send-chat-message", { chatId, content }, (ack: { ok: boolean }) => {
      if (!ack?.ok) setMessages((prev) => prev.filter((m) => m !== optimistic));
    });
  }, [input, attachedFile, sessionEnded, chatId, role]);

  const isWarning = timeLeft > 0 && timeLeft <= 5 * 60;
  const isMyMessage = (msg: ChatMsg) => lawyerId
    ? (role === "lawyer" ? msg.sender === userIdRef.current : msg.sender !== lawyerId)
    : msg.senderModel === (role === "lawyer" ? "Consultant" : "User");

  const backPath = role === "lawyer" ? "/lawyer-dashboard" : "/dashboard";
  const peerLabel = role === "lawyer" ? "Client" : lawyerName;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5EFE4" }}>
      <div className="flex items-center justify-between px-5 py-4 shadow-sm" style={{ background: "#8D7A55", color: "#F5EFE4" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.replace(backPath)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "#C8B48A", color: "#3d3220" }}>
            {peerLabel.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{peerLabel}</p>
            <p className="text-xs opacity-70">Consultation Session</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-semibold
          ${sessionEnded ? "bg-red-800/80" : isWarning ? "bg-amber-700/80 animate-pulse" : "bg-black/20"}`}>
          <Clock size={14} />
          {sessionEnded ? "Ended" : formatTime(timeLeft)}
        </div>
      </div>

      {!connected && !sessionEnded && (
        <div className="px-5 py-2 text-xs text-center bg-amber-100 text-amber-700 border-b border-amber-200">Connecting…</div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <Scale size={40} style={{ color: "#C8B48A" }} className="mb-3" />
            <p className="text-sm font-medium" style={{ color: "#8D7A55" }}>Session started with {peerLabel}.</p>
            <p className="text-xs mt-1" style={{ color: "#a08d70" }}>You have {formatTime(timeLeft)} remaining.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const mine = isMyMessage(msg);
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl text-sm shadow-sm ${msg.pending ? "opacity-60" : ""}`}
                style={mine
                  ? { background: "#8D7A55", color: "#F5EFE4", borderBottomRightRadius: 4 }
                  : { background: "#fff", color: "#3d3220", borderBottomLeftRadius: 4, border: "1px solid #C8B48A" }}>
                {msg.attachment && (
                  <div className="px-4 pt-2.5 pb-1">
                    {msg.attachment.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.attachment.url} alt={msg.attachment.name} className="max-w-full rounded-lg max-h-48 object-cover" />
                    ) : (
                      <a href={msg.attachment.url} download={msg.attachment.name}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                        style={{ background: mine ? "rgba(255,255,255,0.15)" : "#F5EFE4", color: mine ? "#F5EFE4" : "#8D7A55" }}>
                        <FileText size={14} />
                        <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                      </a>
                    )}
                  </div>
                )}
                {(!msg.attachment || !msg.content.startsWith("📎")) && (
                  <div className="px-4 py-2.5">{msg.content}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t" style={{ background: "#EDE0CB", borderColor: "#C8B48A" }}>
        {sessionEnded ? (
          <div className="text-center">
            <p className="text-sm font-medium mb-3" style={{ color: "#8D7A55" }}>Your 30-minute session has ended.</p>
            <button onClick={() => router.replace(backPath)} className="px-6 py-2 rounded-xl font-semibold text-sm" style={{ background: "#8D7A55", color: "#F5EFE4" }}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {attachedFile && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: "#fff", border: "1px solid #C8B48A", color: "#3d3220" }}>
                {attachedFile.type.startsWith("image/") ? <Image size={14} style={{ color: "#8D7A55", flexShrink: 0 }} /> : <FileText size={14} style={{ color: "#8D7A55", flexShrink: 0 }} />}
                <span className="flex-1 truncate text-xs">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="p-0.5 rounded hover:bg-black/10">
                  <X size={13} style={{ color: "#8D7A55" }} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className="p-2.5 rounded-xl transition-colors flex-shrink-0"
                style={{ background: attachedFile ? "#C8B48A" : "#fff", border: "1px solid #C8B48A", color: "#8D7A55" }}
              >
                <Paperclip size={18} />
              </button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message…"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border"
                style={{ background: "#fff", border: "1px solid #C8B48A", color: "#3d3220" }} />
              <button onClick={handleSend} disabled={!input.trim() && !attachedFile}
                className="p-2.5 rounded-xl disabled:opacity-40 transition-colors"
                style={{ background: "#8D7A55", color: "#F5EFE4" }}>
                <SendHorizontal size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {sessionEnded && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="rounded-2xl p-8 text-center max-w-sm shadow-2xl" style={{ background: "#F5EFE4", border: "1.5px solid #C8B48A" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0e0d0" }}>
              <Clock size={32} style={{ color: "#8D7A55" }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#3d3220" }}>Session Ended</h2>
            <p className="text-sm mb-6" style={{ color: "#8D7A55" }}>Your 30-minute consultation has ended.</p>
            <button onClick={() => router.replace(backPath)} className="w-full py-3 rounded-xl font-semibold" style={{ background: "#8D7A55", color: "#F5EFE4" }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
