"use client";

import { useEffect, useState } from "react";
import StatCards from "@/components/lawyer/StatCards";
import AppointmentCard from "@/components/lawyer/AppointmentCard";
import ConsultationTable from "@/components/lawyer/ConsultationTable";
import { fetchStats, fetchAppointments, fetchConsultationRequests } from "@/lib/lawyerApi";
import type { DashboardStats, Appointment, ConsultationRequest } from "@/lib/lawyerApi";

export default function LawyerOverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysAppointments: 0,
    pendingRequests: 0,
    totalClients: 0,
    totalEarnings: 0,
  });
  const [todaysApts, setTodaysApts] = useState<Appointment[]>([]);
  const [pendingReqs, setPendingReqs] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetchStats(),
      fetchAppointments(today),
      fetchConsultationRequests("pending"),
    ])
      .then(([s, apts, reqs]) => {
        setStats(s);
        setTodaysApts(apts);
        setPendingReqs(reqs);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: "#7a7040" }}>Loading…</p>;
  if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Welcome back</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>Here is your practice summary for today.</p>
      </div>

      {/* Stat cards */}
      <StatCards stats={stats} />

      {/* Today's appointments */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: "#2f3e24" }}>
          Today&apos;s Appointments
          <span className="ml-2 text-xs font-normal" style={{ color: "#757f35" }}>({todaysApts.length})</span>
        </h2>
        {todaysApts.length === 0 ? (
          <p className="text-sm" style={{ color: "#7a7040" }}>No appointments scheduled for today.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {todaysApts.map((apt) => <AppointmentCard key={apt._id} apt={apt} />)}
          </div>
        )}
      </section>

      {/* Pending consultation requests */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: "#2f3e24" }}>
          Pending Consultation Requests
          <span className="ml-2 text-xs font-normal" style={{ color: "#757f35" }}>({pendingReqs.length})</span>
        </h2>
        <ConsultationTable requests={pendingReqs} />
      </section>
    </div>
  );
}
