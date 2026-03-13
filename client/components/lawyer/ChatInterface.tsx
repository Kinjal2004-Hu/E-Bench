"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  createOrGetDirectChat,
  fetchClients,
  fetchMyChats,
  getToken,
  type ApiChat,
  type ApiClient,
} from "@/lib/chatApi";

type UiMessage = {
  id: string;
  sender: "client" | "lawyer";
  text: string;
  time: string;
};

type UiChat = {
  id: string;
  clientName: string;
  topic: string;
  lastSeen: string;
  unread: number;
  messages: UiMessage[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function toTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function toAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mapApiChat(chat: ApiChat): UiChat {
  const other = chat.participants.find((p) => p.participantModel === "User")?.participant;
  return {
    id: chat._id,
    clientName: other?.fullName || "Client",
    topic: chat.title || "Legal Consultation",
    lastSeen: toAgo(chat.lastMessageAt || chat.updatedAt),
    unread: 0,
    messages: (chat.messages || []).map((m) => ({
      id: m._id,
      sender: m.senderModel === "Consultant" ? "lawyer" : "client",
      text: m.content,
      time: toTime(m.timestamp),
    })),
  };
}

export default function ChatInterface() {
  const [chatState, setChatState] = useState<UiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [draft, setDraft] = useState("");
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const activeChat = useMemo(
    () => chatState.find((c) => c.id === activeChatId),
    [chatState, activeChatId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length]);

  useEffect(() => {
    let mounted = true;
    const token = getToken();

    const loadChats = async () => {
      try {
        const chats = await fetchMyChats();
        if (!mounted) return;

        const mapped = chats.map(mapApiChat);
        setChatState(mapped);
        if (mapped.length > 0) setActiveChatId(mapped[0].id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load chats";
        if (mounted) setError(msg);
      }
    };

    loadChats();

    if (!token) return () => {
      mounted = false;
    };

    const socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      chatState.forEach((chat) => {
        socket.emit("join-chat-room", { chatId: chat.id });
      });
    });

    socket.on("chat-message-realtime", (payload: {
      _id: string;
      chatId: string;
      senderModel: "User" | "Consultant";
      content: string;
      timestamp: string;
    }) => {
      setChatState((prev) =>
        prev.map((chat) => {
          if (chat.id !== payload.chatId) return chat;
          if (chat.messages.some((m) => m.id === payload._id)) return chat;

          return {
            ...chat,
            lastSeen: toAgo(payload.timestamp),
            messages: [
              ...chat.messages,
              {
                id: payload._id,
                sender: payload.senderModel === "Consultant" ? "lawyer" : "client",
                text: payload.content,
                time: toTime(payload.timestamp),
              },
            ],
          };
        })
      );
    });

    return () => {
      mounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    if (!chatState.length) return;
    chatState.forEach((chat) => {
      socketRef.current?.emit("join-chat-room", { chatId: chat.id });
    });
  }, [chatState]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      return (
        client.fullName.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q)
      );
    });
  }, [clients, clientSearch]);

  const openClientPicker = async () => {
    setShowClientPicker(true);
    if (clients.length > 0) return;

    setClientsLoading(true);
    setError("");
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load clients";
      setError(msg);
    } finally {
      setClientsLoading(false);
    }
  };

  const startChatWithClient = async (client: ApiClient) => {
    setError("");
    try {
      const chat = await createOrGetDirectChat({
        participantId: client._id,
        participantModel: "User",
        initialMessage: "Hello, I am available to assist you with your legal matter.",
      });

      const mapped = mapApiChat(chat);
      setChatState((prev) => {
        const existing = prev.find((c) => c.id === mapped.id);
        if (existing) return prev;
        return [mapped, ...prev];
      });
      setActiveChatId(mapped.id);
      setShowClientPicker(false);
      setClientSearch("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start chat";
      setError(msg);
    }
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !activeChatId || !socketRef.current) return;

    socketRef.current.emit(
      "send-chat-message",
      { chatId: activeChatId, content: text },
      (ack: { ok: boolean; error?: string }) => {
        if (!ack?.ok) {
          setError(ack?.error || "Failed to send message");
        }
      }
    );

    setDraft("");
  };

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
        <aside className="border-r" style={{ borderColor: "#c1b77a", background: "#e8dfa8" }}>
          <div className="p-4 border-b" style={{ borderColor: "#c1b77a" }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm" style={{ color: "#2f3e24" }}>
                Clients
              </h3>
              <button
                onClick={openClientPicker}
                className="text-xs px-2.5 py-1 rounded-md font-medium text-white"
                style={{ background: "#757f35" }}
              >
                New Chat
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[440px]">
            {chatState.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChatId(c.id)}
                className="w-full text-left px-4 py-3 border-b transition-colors"
                style={{
                  borderColor: "#c1b77a",
                  background: c.id === activeChatId ? "#d4c88a" : "transparent",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "#2f3e24" }}>
                    {c.clientName}
                  </p>
                  {c.unread > 0 && (
                    <span
                      className="text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#757f35" }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#5a5920" }}>
                  {c.topic}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#7a7040" }}>
                  {c.lastSeen}
                </p>
              </button>
            ))}
            {!chatState.length && !error ? (
              <p className="px-4 py-5 text-xs" style={{ color: "#7a7040" }}>
                No chats yet.
              </p>
            ) : null}
          </div>
        </aside>

        <section className="lg:col-span-2 flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: "#c1b77a" }}>
            <h3 className="font-semibold text-sm" style={{ color: "#2f3e24" }}>
              {activeChat ? `${activeChat.clientName} - ${activeChat.topic}` : "Select a client"}
            </h3>
            {error ? (
              <p className="text-xs mt-1 text-red-700">{error}</p>
            ) : null}
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ background: "#f5efc8" }}>
            {activeChat?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                  msg.sender === "lawyer" ? "ml-auto text-white" : ""
                }`}
                style={{
                  background: msg.sender === "lawyer" ? "#757f35" : "#fff",
                  border: msg.sender === "client" ? "1px solid #c1b77a" : "none",
                  color: msg.sender === "lawyer" ? "#fff" : "#2f3e24",
                }}
              >
                <p>{msg.text}</p>
                <p className="text-[10px] mt-1 opacity-70">{msg.time}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div
            className="p-3 border-t flex gap-2"
            style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your reply..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "#c1b77a", background: "#fdf8e8" }}
            />
            <button
              onClick={sendMessage}
              className="rounded-lg text-white px-4 py-2 text-sm font-medium transition-colors"
              style={{ background: "#757f35" }}
            >
              Send
            </button>
          </div>
        </section>
      </div>

      {showClientPicker ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-xl border shadow-lg"
            style={{ borderColor: "#c1b77a", background: "#fdf8e8" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "#c1b77a" }}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold" style={{ color: "#2f3e24" }}>
                  Start Chat With Client
                </h3>
                <button
                  onClick={() => setShowClientPicker(false)}
                  className="text-xs px-2 py-1 rounded border"
                  style={{ borderColor: "#c1b77a", color: "#5a5920" }}
                >
                  Close
                </button>
              </div>
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search by name or email"
                className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "#c1b77a", background: "#fff" }}
              />
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {clientsLoading ? (
                <p className="text-xs px-2 py-3" style={{ color: "#7a7040" }}>
                  Loading clients...
                </p>
              ) : null}

              {!clientsLoading && filteredClients.length === 0 ? (
                <p className="text-xs px-2 py-3" style={{ color: "#7a7040" }}>
                  No clients found.
                </p>
              ) : null}

              {!clientsLoading &&
                filteredClients.map((client) => (
                  <button
                    key={client._id}
                    onClick={() => startChatWithClient(client)}
                    className="w-full text-left px-3 py-2 rounded-lg border mb-2 hover:bg-[#f2e9c0] transition-colors"
                    style={{ borderColor: "#c1b77a" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "#2f3e24" }}>
                      {client.fullName}
                    </p>
                    <p className="text-xs" style={{ color: "#5a5920" }}>
                      {client.email}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
