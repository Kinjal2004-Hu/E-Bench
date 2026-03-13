"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartCallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4000/create-room", { method: "POST" });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      router.push(`/calls/${data.roomId}?role=user`);
    } catch {
      setError("Could not create room. Make sure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", fontFamily: "sans-serif" }}>
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 40, width: 420, textAlign: "center", border: "1px solid #334155" }}>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Start a Video Call</h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>
          A new room will be created and your lawyer will be notified instantly.
        </p>

        <button
          onClick={createRoom}
          disabled={loading}
          style={{
            width: "100%", padding: "14px 0", background: loading ? "#475569" : "#3b82f6",
            color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating room..." : "Create Room & Join Call"}
        </button>

        {error && (
          <p style={{ color: "#f87171", marginTop: 16, fontSize: 13 }}>{error}</p>
        )}

        <p style={{ color: "#64748b", fontSize: 12, marginTop: 24 }}>
          Share the call link with your lawyer, or they will receive a live notification.
        </p>
      </div>
    </div>
  );
}
