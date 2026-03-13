"use client";

import { useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useVideoCall } from "@/hooks/useVideoCall";

function CallRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const role = searchParams.get("role") || "user";

  const {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    isMuted,
    isCameraOff,
    messages,
    error,
    toggleMute,
    toggleCamera,
    sendMessage,
    endCall,
  } = useVideoCall(roomId, role);

  const [chatInput, setChatInput] = useState("");

  const handleSend = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  if (error) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#f87171", fontFamily: "sans-serif", fontSize: 18 }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>

      {/* ── Video area ── */}
      <div style={{ flex: 1, position: "relative", background: "#1e293b" }}>

        {/* Remote video (full) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", background: "#1e293b" }}
        />

        {/* Local video (picture-in-picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute", bottom: 100, right: 20,
            width: 180, height: 130, borderRadius: 12,
            border: "2px solid #3b82f6", objectFit: "cover", background: "#0f172a",
          }}
        />

        {/* Status badge */}
        <div style={{ position: "absolute", top: 20, left: 20 }}>
          <span style={{
            background: isConnected ? "#22c55e" : "#f59e0b",
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#fff",
          }}>
            {isConnected ? "Connected" : "Waiting for peer..."}
          </span>
        </div>

        {/* Role badge */}
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <span style={{ background: "#334155", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {role === "lawyer" ? "Lawyer" : "Client"}
          </span>
        </div>

        {/* Controls bar */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 16,
        }}>
          <button
            onClick={toggleMute}
            style={{
              background: isMuted ? "#ef4444" : "#374151", border: "none", borderRadius: "50%",
              width: 52, height: 52, fontSize: 20, cursor: "pointer", color: "#fff",
            }}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>
          <button
            onClick={toggleCamera}
            style={{
              background: isCameraOff ? "#ef4444" : "#374151", border: "none", borderRadius: "50%",
              width: 52, height: 52, fontSize: 20, cursor: "pointer", color: "#fff",
            }}
          >
            {isCameraOff ? "📷" : "🎥"}
          </button>
          <button
            onClick={() => { endCall(); window.close(); }}
            style={{
              background: "#ef4444", border: "none", borderRadius: "50%",
              width: 52, height: 52, fontSize: 20, cursor: "pointer", color: "#fff",
            }}
          >
            📞
          </button>
        </div>
      </div>

      {/* ── Chat sidebar ── */}
      <div style={{ width: 300, background: "#1e293b", display: "flex", flexDirection: "column", borderLeft: "1px solid #334155" }}>

        <div style={{ padding: 16, borderBottom: "1px solid #334155", fontWeight: 700, fontSize: 15 }}>
          Chat
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 20 }}>No messages yet</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.sender === role ? "flex-end" : "flex-start",
                background: m.sender === role ? "#3b82f6" : "#334155",
                padding: "8px 12px", borderRadius: 12, maxWidth: "80%", fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2, textTransform: "capitalize" }}>{m.sender}</div>
              {m.message}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: 12, borderTop: "1px solid #334155", display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Type a message..."
            style={{
              flex: 1, background: "#334155", border: "none", borderRadius: 8,
              padding: "10px 12px", color: "#fff", outline: "none", fontSize: 14,
            }}
          />
          <button
            onClick={handleSend}
            style={{
              background: "#3b82f6", border: "none", borderRadius: 8,
              padding: "10px 16px", cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 14,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>Loading call...</div>}>
      <CallRoom />
    </Suspense>
  );
}