"use client";

import { useEffect, useState } from "react";
import AppointmentCard from "@/components/lawyer/AppointmentCard";
import { fetchAppointments } from "@/lib/lawyerApi";
import type { Appointment } from "@/lib/lawyerApi";

export default function AppointmentsPage() {
  const [all, setAll] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAppointments()
      .then(setAll)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load appointments.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm py-8 text-center" style={{ color: "#7a7040" }}>Loading…</p>;
  if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

  const today = new Date().toISOString().split("T")[0];
  const todayApts = all.filter((a) => a.date === today);
  const upcoming = all.filter((a) => a.date > today);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Appointments</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>Your scheduled consultations.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: "#2f3e24" }}>
          Today
          <span className="ml-2 text-xs font-normal" style={{ color: "#757f35" }}>({todayApts.length})</span>
        </h2>
        {todayApts.length === 0 ? (
          <p className="text-sm" style={{ color: "#7a7040" }}>No appointments today.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayApts.map((apt) => <AppointmentCard key={apt._id} apt={apt} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: "#2f3e24" }}>
          Upcoming
          <span className="ml-2 text-xs font-normal" style={{ color: "#757f35" }}>({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: "#7a7040" }}>No upcoming appointments.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcoming.map((apt) => <AppointmentCard key={apt._id} apt={apt} />)}
          </div>
        )}
      </section>
    </div>
  );
}
