"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";

type IncomingCall = {
  roomId: string;
  from: string;
  timestamp: number;
};

export default function LawyerNotificationsPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [calls, setCalls] = useState<IncomingCall[]>([]);

  useEffect(() => {
    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("register-lawyer");
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("incoming-call", (data: IncomingCall) => {
      setCalls((prev) => [data, ...prev]);
    });

    return () => { socket.disconnect(); };
  }, []);

  const joinCall = (roomId: string) => {
    router.push(`/calls/${roomId}?role=lawyer`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "sans-serif", color: "#fff" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Lawyer Call Dashboard</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            Incoming client call requests appear here in real-time.
          </p>
          <div style={{ marginTop: 12 }}>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: connected ? "#22c55e" : "#ef4444", color: "#fff",
            }}>
              {connected ? "Connected — Listening for calls" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Call list */}
        {calls.length === 0 ? (
          <div style={{
            background: "#1e293b", borderRadius: 12, padding: 40, textAlign: "center",
            border: "1px solid #334155",
          }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📞</p>
            <p style={{ color: "#94a3b8", fontSize: 15 }}>No incoming calls yet.</p>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Keep this page open to receive notifications.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {calls.map((call, i) => (
              <div
                key={call.roomId + i}
                style={{
                  background: "#1e293b", borderRadius: 12, padding: 20,
                  border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    Incoming Call from Client
                  </p>
                  <p style={{ color: "#64748b", fontSize: 12 }}>
                    Room: {call.roomId.slice(0, 8)}... &bull; {new Date(call.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => joinCall(call.roomId)}
                  style={{
                    background: "#22c55e", border: "none", borderRadius: 8,
                    padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Accept Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
