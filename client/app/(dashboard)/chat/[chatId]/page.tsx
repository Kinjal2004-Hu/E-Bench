"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Scale,
  Paperclip,
  Send,
  Sparkles,
  CheckCheck,
  Copy,
  BookMarked,
  ArrowLeft,
} from "lucide-react";
import { fetchChatById, getToken, type ApiChatMessage } from "@/lib/chatApi";

type Message = {
  id: string;
  sender: "user" | "consultant";
  text: string;
  timestamp: string;
  saved?: boolean;
  copied?: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function mapMessage(msg: ApiChatMessage, ownModel: "User" | "Consultant"): Message {
  return {
    id: msg._id,
    sender: msg.senderModel === ownModel ? "user" : "consultant",
    text: msg.content,
    timestamp: msg.timestamp,
  };
}

export default function ExistingChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState("Direct Chat");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const token = getToken();
    const ownModel: "User" | "Consultant" =
      typeof window !== "undefined" && localStorage.getItem("userType") === "consultant"
        ? "Consultant"
        : "User";

    if (!chatId || !token) {
      setError("Please login to access chats.");
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        const chat = await fetchChatById(chatId);
        if (!mounted) return;

        const otherParticipant = chat.participants.find((p) => p.participantModel !== ownModel)?.participant;
        setChatTitle(otherParticipant?.fullName || "Direct Chat");
        setMessages((chat.messages || []).map((m) => mapMessage(m, ownModel)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load chat";
        if (mounted) setError(msg);
      }
    };

    load();

    const socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-chat-room", { chatId });
    });

    socket.on("chat-message-realtime", (payload: {
      _id: string;
      senderModel: "User" | "Consultant";
      content: string;
      timestamp: string;
      chatId: string;
    }) => {
      if (payload.chatId !== chatId) return;
      const incoming: Message = {
        id: payload._id,
        sender: payload.senderModel === ownModel ? "user" : "consultant",
        text: payload.content,
        timestamp: payload.timestamp,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    socket.on("connect_error", (err) => {
      if (mounted) setError(err.message || "Realtime connection failed");
    });

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !chatId || !socketRef.current) return;

    setInput("");
    setIsTyping(true);
    setError("");

    socketRef.current.emit(
      "send-chat-message",
      { chatId, content: text },
      (ack: { ok: boolean; error?: string }) => {
        setIsTyping(false);
        if (!ack?.ok) {
          setError(ack?.error || "Failed to send message");
        }
      }
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, copied: true } : m)));
    setTimeout(
      () => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, copied: false } : m))),
      2000
    );
  };

  const handleSave = (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, saved: !m.saved } : m)));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
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
            Realtime secure chat
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-[#F8FAFC]">
        <div className="p-5 space-y-6">
          {error ? (
            <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-100">{error}</div>
          ) : null}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] flex items-center justify-center mb-3">
                <Scale size={22} className="text-[#1C4D8D]" />
              </div>
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation now</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm self-start mt-1 ${
                  msg.sender === "user"
                    ? "bg-[#EEF4FF] text-[#0F2854] border border-[#C8DEFF]"
                    : "bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] text-white"
                }`}
              >
                {msg.sender === "user" ? "YOU" : "LAW"}
              </div>

              <div
                className={`flex flex-col gap-2 max-w-[78%] ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#0F2854] text-white rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-tl-sm whitespace-pre-wrap"
                  }`}
                >
                  {msg.text}
                </div>

                <div className={`flex items-center gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                  {msg.sender !== "user" && (
                    <>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${
                          msg.copied ? "text-emerald-600" : "text-gray-400 hover:text-[#1C4D8D]"
                        }`}
                      >
                        {msg.copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                        {msg.copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleSave(msg.id)}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${
                          msg.saved ? "text-[#C49A10]" : "text-gray-400 hover:text-[#C49A10]"
                        }`}
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

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] text-white flex items-center justify-center text-[10px] font-bold shrink-0 self-start mt-1 shadow-sm">
                ...
              </div>
              <div className="px-4 py-3.5 bg-white rounded-2xl rounded-tl-sm border border-gray-200 shadow-sm text-xs text-gray-500">
                Sending message...
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-3.5 pb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            className="p-2 rounded-xl text-gray-400 hover:text-[#4988C4] hover:bg-[#EEF4FF] transition-colors shrink-0"
            title="Attach file"
          >
            <Paperclip size={17} />
          </button>
          <div className="flex-1 border border-gray-200 rounded-2xl bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#4988C4] focus-within:ring-2 focus-within:ring-[#4988C4]/15 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
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
      </div>
    </div>
  );
}
