import type { Appointment } from "@/data/mockLawyerData";

const STATUS_BADGE: Record<Appointment["status"], { bg: string; text: string }> = {
  confirmed:   { bg: "#d1fae5", text: "#065f46" },
  pending:     { bg: "#fef3c7", text: "#92400e" },
  rescheduled: { bg: "#dbeafe", text: "#1e40af" },
};

const TYPE_ICON: Record<Appointment["consultationType"], string> = {
  "Video":         "🎥",
  "Chat":          "💬",
  "Office Meeting": "🏢",
  "Phone Call":    "📞",
};

export default function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {appointments.map((apt) => {
        const badge = STATUS_BADGE[apt.status];
        return (
          <div
            key={apt.id}
            className="rounded-lg p-4 shadow-sm border"
            style={{ background: "#f0e8c3", borderColor: "#c1b77a" }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold" style={{ color: "#2f3e24" }}>{apt.clientName}</h3>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0"
                style={{ background: badge.bg, color: badge.text }}
              >
                {apt.status}
              </span>
            </div>
            <p className="text-xs mt-1 font-medium" style={{ color: "#5a5920" }}>{apt.caseType}</p>
            <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: "#7a7040" }}>
              <span>{TYPE_ICON[apt.consultationType]}</span>
              <span>{apt.consultationType}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#5a5920" }}>
              <span>📅 {apt.date}</span>
              <span>🕐 {apt.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
