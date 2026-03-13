import LawyerSidebarNav from "@/components/lawyer/Sidebar";

export default function LawyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "#d9d09e" }}>
      <LawyerSidebarNav />
      <main className="flex-1 md:ml-60 min-w-0 p-4 md:p-7">
        {children}
      </main>
    </div>
  );
}
