"use client";

import { useState } from "react";
import { updateConsultationStatus } from "@/lib/lawyerApi";
import type { ConsultationRequest } from "@/lib/lawyerApi";

type ConsultationTableProps = {
  requests: ConsultationRequest[];
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ConsultationTable({ requests }: ConsultationTableProps) {
  const [rows, setRows] = useState(requests);
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (id: string, status: "accepted" | "rejected") => {
    setBusy(id);
    try {
      const updated = await updateConsultationStatus(id, status);
      setRows((prev) => prev.map((r) => (r._id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to update consultation status:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden"
      style={{ borderColor: "#c1b77a", background: "#f0e8c3" }}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ background: "#d4c88a", color: "#2f3e24" }}>
              <th className="text-left px-4 py-3 font-semibold">Client Name</th>
              <th className="text-left px-4 py-3 font-semibold">Legal Category</th>
              <th className="text-left px-4 py-3 font-semibold">Requested Date</th>
              <th className="text-left px-4 py-3 font-semibold">Message</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: "#7a7040" }}>
                  No consultation requests found.
                </td>
              </tr>
            ) : (
              rows.map((req) => (
                <tr key={req._id} className="border-t align-top" style={{ borderColor: "#c1b77a" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#2f3e24" }}>{req.clientName}</td>
                  <td className="px-4 py-3" style={{ color: "#5a5920" }}>{req.legalCategory}</td>
                  <td className="px-4 py-3" style={{ color: "#5a5920" }}>{req.requestedDate}</td>
                  <td className="px-4 py-3 max-w-xs" style={{ color: "#5a5920" }}>{req.message}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => update(req._id, "accepted")}
                        disabled={req.status !== "pending" || busy === req._id}
                        className="px-3 py-1.5 rounded-md text-white text-xs font-medium disabled:opacity-40 transition-colors"
                        style={{ background: req.status === "pending" ? "#757f35" : "#999" }}
                      >
                        {busy === req._id ? "…" : "Accept"}
                      </button>
                      <button
                        onClick={() => update(req._id, "rejected")}
                        disabled={req.status !== "pending" || busy === req._id}
                        className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium disabled:opacity-40"
                      >
                        {busy === req._id ? "…" : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
