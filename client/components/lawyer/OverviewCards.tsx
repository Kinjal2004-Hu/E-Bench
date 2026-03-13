import type { DashboardStats } from "@/data/mockLawyerData";

type StatCardsProps = {
  stats: DashboardStats;
};

export default function StatCards({ stats }: StatCardsProps) {
  const cards = [
    { label: "Today's Appointments",        value: stats.todaysAppointments.toString() },
    { label: "Pending Consultation Requests", value: stats.pendingRequests.toString() },
    { label: "Total Clients",               value: stats.totalClients.toString() },
    { label: "Total Earnings",              value: `₹${stats.totalEarnings.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg p-5 shadow-sm border"
          style={{ background: "#f0e8c3", borderColor: "#c1b77a" }}
        >
          <p className="text-sm font-medium" style={{ color: "#5a5920" }}>{card.label}</p>
          <p className="mt-3 text-3xl font-bold" style={{ color: "#2f3e24" }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
