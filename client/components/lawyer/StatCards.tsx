import type { DashboardStats } from "@/lib/lawyerApi";

const CARDS = [
  { key: "todaysAppointments",  label: "Today's Appointments",        icon: "📅" },
  { key: "pendingRequests",     label: "Pending Consultation Requests", icon: "📋" },
  { key: "totalClients",        label: "Total Clients",               icon: "👥" },
  { key: "totalEarnings",       label: "Total Earnings",              icon: "💰" },
] as const;

export default function StatCards({ stats }: { stats: DashboardStats }) {
  const format = (key: (typeof CARDS)[number]["key"]) => {
    const v = stats[key];
    return key === "totalEarnings"
      ? `₹${(v as number).toLocaleString("en-IN")}`
      : (v as number).toString();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon }) => (
        <div
          key={key}
          className="rounded-xl p-5 shadow-sm border flex flex-col gap-2"
          style={{ background: "#f0e8c3", borderColor: "#c1b77a" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#757f35" }}>
              {label}
            </p>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#2f3e24" }}>{format(key)}</p>
        </div>
      ))}
    </div>
  );
}
