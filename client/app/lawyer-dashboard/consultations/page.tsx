"use client";

import { useEffect, useState } from "react";
import ConsultationTable from "@/components/lawyer/ConsultationTable";
import { fetchConsultationRequests } from "@/lib/lawyerApi";
import type { ConsultationRequest } from "@/lib/lawyerApi";

export default function ConsultationsPage() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConsultationRequests()
      .then(setRequests)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load requests.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: "#7a7040" }}>Loading…</p>;
  if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Consultation Requests</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>
          Review incoming client requests and accept or reject them.
        </p>
      </div>
      <ConsultationTable requests={requests} />
    </div>
  );
}
