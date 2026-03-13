"use client";

import { useEffect, useState } from "react";
import { X, Star, Users, ShieldCheck, Search } from "lucide-react";
import { fetchConsultants, type ApiConsultant } from "@/lib/chatApi";

interface Props {
  onSelect: (lawyer: ApiConsultant) => void;
  onClose: () => void;
}

export default function LawyerPickerModal({ onSelect, onClose }: Props) {
  const [lawyers, setLawyers] = useState<ApiConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchConsultants()
      .then(setLawyers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = lawyers.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(q) ||
      l.specialization.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#F5EFE4", border: "1.5px solid #C8B48A" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "#8D7A55", color: "#F5EFE4" }}
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight">Book a Consultation</h2>
            <p className="text-sm opacity-75 mt-0.5">Choose a lawyer to get started</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ background: "#EDE0CB" }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D7A55]" />
            <input
              type="text"
              placeholder="Search by name or specialization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none border"
              style={{
                background: "#F5EFE4",
                border: "1px solid #C8B48A",
                color: "#4a3f30",
              }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <p className="text-center text-sm py-8" style={{ color: "#8D7A55" }}>
              Loading lawyers…
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: "#8D7A55" }}>
              No lawyers found.
            </p>
          )}
          {filtered.map((lawyer) => (
            <div
              key={lawyer._id}
              className="flex items-start gap-4 p-4 rounded-xl border transition-shadow hover:shadow-md"
              style={{ background: "#fff", border: "1px solid #C8B48A" }}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: "#C8B48A", color: "#F5EFE4" }}
              >
                {lawyer.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#3d3220]">{lawyer.fullName}</span>
                  {lawyer.isVerified && (
                    <span
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#ddf3dd", color: "#2a6b2a" }}
                    >
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: "#8D7A55" }}>
                  {lawyer.specialization}
                </p>
                {lawyer.professionalSummary && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#a08d70" }}>
                    {lawyer.professionalSummary}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "#8D7A55" }}>
                  {lawyer.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {lawyer.rating.toFixed(1)}
                    </span>
                  )}
                  {lawyer.totalClients != null && (
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {lawyer.totalClients} clients
                    </span>
                  )}
                </div>
              </div>

              {/* Fee + CTA */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-bold text-[#3d3220] text-sm">
                  {lawyer.consultationFee ? `₹${lawyer.consultationFee}` : "Contact"}
                </span>
                <span className="text-xs" style={{ color: "#8D7A55" }}>
                  per session
                </span>
                <button
                  onClick={() => onSelect(lawyer)}
                  className="mt-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: "#8D7A55", color: "#F5EFE4" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#6b5c3e")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#8D7A55")}
                >
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
