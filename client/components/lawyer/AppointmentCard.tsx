import type { Appointment } from "@/lib/lawyerApi";

const STATUS_BADGE: Record<Appointment["status"], { bg: string; color: string }> = {
  confirmed:   { bg: "#d1fae5", color: "#065f46" },
  pending:     { bg: "#fef3c7", color: "#92400e" },
  rescheduled: { bg: "#dbeafe", color: "#1e40af" },
};

const CONSULT_ICON: Record<Appointment["consultationType"], string> = {
  "Video":          "🎥",
  "Chat":           "💬",
  "Office Meeting": "🏢",
  "Phone Call":     "📞",
};

export default function AppointmentCard({ apt }: { apt: Appointment }) {
  const badge = STATUS_BADGE[apt.status];
  return (
    <div
      className="rounded-xl border p-4 shadow-sm flex flex-col gap-2"
      style={{ background: "#f0e8c3", borderColor: "#c1b77a" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold leading-tight" style={{ color: "#2f3e24" }}>
            {apt.clientName}
          </h3>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "#5a5920" }}>{apt.caseType}</p>
        </div>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0"
          style={{ background: badge.bg, color: badge.color }}
        >
          {apt.status}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#7a7040" }}>
        <span>{CONSULT_ICON[apt.consultationType]}</span>
        <span>{apt.consultationType}</span>
      </div>

      <div className="flex items-center gap-3 text-xs border-t pt-2" style={{ borderColor: "#d4c88a", color: "#5a5920" }}>
        <span>📅 {apt.date}</span>
        <span>🕐 {apt.time}</span>
      </div>
    </div>
  );
}
