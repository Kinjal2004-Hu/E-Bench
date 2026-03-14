"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  FolderOpen,
  UserCog,
  Scale,
  Users,
  Menu,
  X,
  FileText,
  GraduationCap,
  Download,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Overview",               href: "/lawyer-dashboard",              icon: LayoutDashboard },
  { label: "Consultation Requests",  href: "/lawyer-dashboard/consultations", icon: ClipboardList },
  { label: "Appointments",           href: "/lawyer-dashboard/appointments",  icon: CalendarDays },
  { label: "Client Chat",            href: "/lawyer-dashboard/chat",          icon: MessageSquare },
  { label: "Case Files",             href: "/lawyer-dashboard/case-files",    icon: FolderOpen },
  { label: "Contracts",              href: "/contracts",                      icon: FileText },
  { label: "Microlearning",          href: "/microlearning",                  icon: GraduationCap },
  { label: "Community Forum",        href: "/community",                      icon: Users },
  { label: "Downloads",              href: "/downloads",                      icon: Download },
];

const BOTTOM_NAV = [
  { label: "Settings",           href: "/settings",                   icon: Settings },
  { label: "Profile Settings",   href: "/lawyer-dashboard/profile",   icon: UserCog },
];

export default function LawyerSidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("ebench_token");
    localStorage.removeItem("userType");
    localStorage.removeItem("ebench_active_chat_id");
    router.push("/auth");
  }

  const isActive = (href: string) =>
    href === "/lawyer-dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <nav className="flex flex-col gap-1 mt-4">
      {NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileOpen(false)}
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
            isActive(href)
              ? "text-white shadow-sm"
              : "text-[#d4d8b0] hover:bg-white/10 hover:text-white"
          }`}
          style={isActive(href) ? { background: "#757f35" } : {}}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"}`}>
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );

  const BottomLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col gap-1">
      {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileOpen(false)}
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
            isActive(href)
              ? "text-white shadow-sm"
              : "text-[#d4d8b0] hover:bg-white/10 hover:text-white"
          }`}
          style={isActive(href) ? { background: "#757f35" } : {}}
        >
          <Icon size={18} className="flex-shrink-0" />
          <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "opacity-0 w-0 hidden" : "opacity-100 w-auto"}`}>
            {label}
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-20 border-r border-[#3f5230] transition-all duration-300 ${isOpen ? "w-60" : "w-20"}`}
        style={{ background: "#2f3e24" }}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#3f5230] flex-shrink-0">
          <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${isOpen ? "w-auto opacity-100" : "w-0 opacity-0"}`}>
            <div
              className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white"
              style={{ background: "#757f35" }}
            >
              <Scale size={16} />
            </div>
            <div className="whitespace-nowrap">
              <p className="text-white font-bold text-sm leading-tight">E-Bench</p>
              <p className="text-[#a8b87a] text-[10px] uppercase tracking-wider">Lawyer Portal</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1.5 rounded-lg hover:bg-white/10 text-[#a8b87a] transition-colors ${!isOpen && "mx-auto"}`}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks collapsed={!isOpen} />
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-4 border-t border-[#3f5230]">
          <BottomLinks collapsed={!isOpen} />

          <button
            onClick={handleLogout}
            title={!isOpen ? "Logout" : undefined}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#d4d8b0] hover:bg-red-900/30 hover:text-red-300 group"
          >
            <LogOut size={18} className="flex-shrink-0 group-hover:text-red-300" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
              Logout
            </span>
          </button>

          {isOpen && (
            <div className="mt-3 px-1">
              <p className="text-[#a8b87a] text-xs">Adv. Kinjal Ojha</p>
              <p className="text-[#d4d8b0] text-[11px] mt-0.5">Senior Partner</p>
            </div>
          )}
        </div>
      </aside>

      {/* Spacer so main content doesn't hide under the fixed sidebar */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isOpen ? "w-60" : "w-20"}`} />

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 border-b border-[#3f5230]"
        style={{ background: "#2f3e24" }}
      >
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-[#b8c47a]" />
          <span className="text-white font-bold text-sm">E-Bench Lawyer</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 pt-14 overflow-y-auto"
          style={{ background: "#2f3e24" }}
        >
          <div className="px-3">
            <NavLinks />
            <div className="mt-4 pt-4 border-t border-[#3f5230]">
              <BottomLinks />
              <button
                onClick={handleLogout}
                className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#d4d8b0] hover:bg-red-900/30 hover:text-red-300 group"
              >
                <LogOut size={18} className="flex-shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile top spacer */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  );
}
