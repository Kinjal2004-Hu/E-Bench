import AppointmentCard from "@/components/lawyer/AppointmentCard";
import { appointments } from "@/data/mockLawyerData";

export default function AppointmentsPage() {
  const today = appointments.filter((a) => a.date === "2026-03-13");
  const upcoming = appointments.filter((a) => a.date > "2026-03-13");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#2f3e24" }}>Appointments</h1>
        <p className="text-sm mt-1" style={{ color: "#5a5920" }}>Your scheduled consultations.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: "#2f3e24" }}>
          Today
          <span className="ml-2 text-xs font-normal" style={{ color: "#757f35" }}>({today.length})</span>
        </h2>
        {today.length === 0 ? (
          <p className="text-sm" style={{ color: "#7a7040" }}>No appointments today.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {today.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
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
            {upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)}
          </div>
        )}
      </section>
    </div>
  );
}
