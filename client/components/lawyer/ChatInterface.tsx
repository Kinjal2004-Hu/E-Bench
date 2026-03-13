"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { ClientChat } from "@/data/mockLawyerData";

type ChatInterfaceProps = {
  chats: ClientChat[];
};

export default function ChatInterface({ chats }: ChatInterfaceProps) {
  const [chatState, setChatState] = useState(chats);
  const [activeChatId, setActiveChatId] = useState(chats[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = useMemo(
    () => chatState.find((c) => c.id === activeChatId),
    [chatState, activeChatId]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !activeChatId) return;
    setChatState((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `msg-${Date.now()}`,
                  sender: "lawyer" as const,
                  text,
                  time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : c
      )
    );
    setDraft("");
  };

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[500px]">
        {/* Client list */}
        <aside className="border-r" style={{ borderColor: "#c1b77a", background: "#e8dfa8" }}>
          <div className="p-4 border-b" style={{ borderColor: "#c1b77a" }}>
            <h3 className="font-semibold text-sm" style={{ color: "#2f3e24" }}>Clients</h3>
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
                  <p className="text-sm font-semibold" style={{ color: "#2f3e24" }}>{c.clientName}</p>
                  {c.unread > 0 && (
                    <span
                      className="text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#757f35" }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#5a5920" }}>{c.topic}</p>
                <p className="text-xs mt-0.5" style={{ color: "#7a7040" }}>{c.lastSeen}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Message panel */}
        <section className="lg:col-span-2 flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: "#c1b77a" }}>
            <h3 className="font-semibold text-sm" style={{ color: "#2f3e24" }}>
              {activeChat ? `${activeChat.clientName} — ${activeChat.topic}` : "Select a client"}
            </h3>
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

          <div className="p-3 border-t flex gap-2" style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
              placeholder="Type your reply…"
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
    </div>
  );
}
