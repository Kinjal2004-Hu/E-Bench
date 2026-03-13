"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Star, Video, ShieldCheck } from "lucide-react";
import {
  createOrGetDirectChat,
  fetchConsultants,
  type ApiConsultant,
} from "@/lib/chatApi";
import PaymentModal, { type SessionType } from "@/components/PaymentModal";

const THEME_COLOR = "#C8B48A";
const THEME_DARK = "#8D7A55";
const THEME_SOFT = "#F5EFE4";
const THEME_BORDER = "#E7D9BE";

function formatSpecialization(value: string) {
  return value
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function NewChatPage() {
  const router = useRouter();
  const [lawyers, setLawyers] = useState<ApiConsultant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedLawyer, setSelectedLawyer] = useState<ApiConsultant | null>(null);

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    if (userType === "consultant") {
      setError("This page is for users. Consultants can use the dashboard chat page.");
      setLoading(false);
      return;
    }

    const loadLawyers = async () => {
      try {
        const data = await fetchConsultants();
        setLawyers(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load lawyers";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadLawyers();
  }, []);

  const filteredLawyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lawyers;
    return lawyers.filter((lawyer) => {
      return (
        lawyer.fullName.toLowerCase().includes(q) ||
        lawyer.email.toLowerCase().includes(q) ||
        lawyer.specialization.toLowerCase().includes(q)
      );
    });
  }, [lawyers, search]);

  const handleBookConsultation = (lawyer: ApiConsultant) => {
    setSelectedLawyer(lawyer);
  };

  const handlePaymentSuccess = async (sessionType: SessionType) => {
    if (!selectedLawyer) return;
    setCreatingId(selectedLawyer._id);
    setSelectedLawyer(null);
    setError("");
    try {
      if (sessionType === "video") {
        const token = localStorage.getItem("token") || localStorage.getItem("ebench_token") || "";
        const res = await fetch("http://localhost:4000/create-room", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to create call room");
        const { roomId } = await res.json();
        const lp = encodeURIComponent(selectedLawyer.fullName);
        router.push(`/session/${roomId}/video?lawyer=${lp}`);
      } else {
        const chat = await createOrGetDirectChat({
          participantId: selectedLawyer._id,
          participantModel: "Consultant",
        });
        const lp = encodeURIComponent(selectedLawyer.fullName);
        router.push(`/session/${chat._id}/chat?lawyer=${lp}&lawyerId=${selectedLawyer._id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0 h-full">
      {selectedLawyer && (
        <PaymentModal
          lawyer={selectedLawyer}
          onSuccess={handlePaymentSuccess}
          onClose={() => setSelectedLawyer(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: THEME_DARK }}
          >
            Start New Chat
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Select a lawyer to book a consultation.
          </p>
        </div>

        <button
          onClick={() => router.push("/chats")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: THEME_BORDER, color: THEME_DARK, backgroundColor: "#fff" }}
        >
          <ArrowLeft size={16} /> Back to History
        </button>
      </div>

      <div
        className="rounded-2xl border px-4 py-3 bg-white"
        style={{ borderColor: THEME_BORDER }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: THEME_SOFT, border: `1px solid ${THEME_BORDER}` }}
        >
          <Search size={16} color={THEME_DARK} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lawyer name, email, or specialization"
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "#333" }}
          />
        </div>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded-lg border bg-red-50 text-red-700 border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
        {loading && (
          <div className="text-sm text-gray-500 px-2">Loading lawyers...</div>
        )}

        {!loading && filteredLawyers.length === 0 && (
          <div className="text-sm text-gray-500 px-2">No lawyers found for your search.</div>
        )}

        {!loading &&
          filteredLawyers.map((lawyer) => (
            <div
              key={lawyer._id}
              className="rounded-2xl border bg-white p-4 flex flex-col gap-3"
              style={{ borderColor: THEME_BORDER }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{lawyer.fullName}</h2>
                  <p className="text-xs text-gray-500">{lawyer.email}</p>
                </div>
                <span
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border"
                  style={
                    lawyer.isVerified
                      ? { borderColor: "#9bc9a4", backgroundColor: "#e8f8eb", color: "#2a6b2a" }
                      : { borderColor: THEME_BORDER, backgroundColor: THEME_SOFT, color: THEME_DARK }
                  }
                >
                  {lawyer.isVerified && <ShieldCheck size={11} />}
                  {lawyer.isVerified ? "Verified" : "Pending Verification"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Star size={14} color={THEME_DARK} />
                <span>{(lawyer.rating ?? 0).toFixed(1)} rating</span>
                <span>•</span>
                <span>{lawyer.totalClients ?? 0} clients</span>
              </div>

              <p className="text-xs text-gray-700">
                <span className="font-medium">Specialization:</span>{" "}
                {formatSpecialization(lawyer.specialization)}
              </p>

              <p className="text-xs text-gray-600 line-clamp-2 min-h-8">
                {lawyer.professionalSummary || "No professional summary provided."}
              </p>

              {/* Fee + session info */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: THEME_SOFT, border: `1px solid ${THEME_BORDER}` }}>
                <div>
                  <p className="text-[11px] text-gray-500">Consultation Fee</p>
                  <p className="text-base font-bold" style={{ color: THEME_DARK }}>
                    {lawyer.consultationFee ? `₹${lawyer.consultationFee}` : "On Request"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">Session</p>
                  <div className="flex items-center gap-1 text-xs font-medium" style={{ color: THEME_DARK }}>
                    <Video size={12} /> 30 min
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleBookConsultation(lawyer)}
                disabled={creatingId === lawyer._id}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                style={{ backgroundColor: THEME_COLOR }}
              >
                <Video size={15} />
                {creatingId === lawyer._id ? "Setting up…" : "Book Consultation"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
