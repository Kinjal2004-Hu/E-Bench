import StatCards from "@/components/lawyer/StatCards";
import AppointmentCard from "@/components/lawyer/AppointmentCard";
import ConsultationTable from "@/components/lawyer/ConsultationTable";
import {
  appointments,
  consultationRequests,
  dashboardStats,
} from "@/data/mockLawyerData";

export default function LawyerOverviewPage() {
  const todaysApts = appointments.filter((a) => a.date === "2026-03-13");
  const pendingReqs = consultationRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Welcome back, Adv. Kinjal Ojha</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>Here is your practice summary for today.</p>
      </div>

      {/* Stat cards */}
      <StatCards stats={dashboardStats} />

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
            {todaysApts.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
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

