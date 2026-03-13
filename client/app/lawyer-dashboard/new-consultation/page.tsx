"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquarePlus, Users } from "lucide-react";
import {
  createOrGetDirectChat,
  fetchClients,
  type ApiClient,
} from "@/lib/chatApi";

export default function NewConsultationPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchClients();
        setClients(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load clients";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleStart = async (client: ApiClient) => {
    setCreatingId(client._id);
    setError("");
    try {
      const chat = await createOrGetDirectChat({
        participantId: client._id,
        participantModel: "User",
        initialMessage: "Hello, I am available to assist you with your legal matter.",
      });
      router.push(`/lawyer-dashboard/chat`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start consultation";
      setError(msg);
      setCreatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>
          Consultation
        </h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Select a client to start a new consultation chat.
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 border"
        style={{ borderColor: "#c1b77a", background: "#fdf8e8" }}
      >
        <Search size={15} color="#7a7040" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name or email"
          className="w-full bg-transparent outline-none text-sm"
          style={{ color: "#2f3e24" }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm px-3 py-2 rounded-lg border bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}

      {/* Client list */}
      {loading ? (
        <p className="text-sm" style={{ color: "#7a7040" }}>
          Loading clients...
        </p>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border"
          style={{ borderColor: "#c1b77a", background: "#f5efc8" }}
        >
          <Users size={36} color="#c1b77a" className="mb-3" />
          <p className="text-sm font-medium" style={{ color: "#5a5920" }}>
            No clients found
          </p>
          <p className="text-xs mt-1" style={{ color: "#7a7040" }}>
            {search ? "Try a different search term" : "No registered clients yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client._id}
              className="rounded-xl border p-4 flex flex-col gap-3"
              style={{ borderColor: "#c1b77a", background: "#fdf8e8" }}
            >
              {/* Avatar + Info */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: "#757f35" }}
                >
                  {client.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#2f3e24" }}>
                    {client.fullName}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#5a5920" }}>
                    {client.email}
                  </p>
                </div>
              </div>

              {client.createdAt && (
                <p className="text-xs" style={{ color: "#7a7040" }}>
                  Member since{" "}
                  {new Date(client.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}

              <button
                onClick={() => handleStart(client)}
                disabled={creatingId === client._id}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                style={{ background: "#757f35" }}
              >
                <MessageSquarePlus size={14} />
                {creatingId === client._id ? "Starting..." : "Start Consultation"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
