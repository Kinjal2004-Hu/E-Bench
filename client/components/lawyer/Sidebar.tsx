"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  FolderOpen,
  UserCog,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Overview",               href: "/lawyer-dashboard",              icon: LayoutDashboard },
  { label: "Consultation Requests",  href: "/lawyer-dashboard/consultations", icon: ClipboardList },
  { label: "Appointments",           href: "/lawyer-dashboard/appointments",  icon: CalendarDays },
  { label: "Client Chat",            href: "/lawyer-dashboard/chat",          icon: MessageSquare },
  { label: "Case Files",             href: "/lawyer-dashboard/case-files",    icon: FolderOpen },
  { label: "Profile Settings",       href: "/lawyer-dashboard/profile",       icon: UserCog },
];

export default function LawyerSidebarNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/lawyer-dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 mt-6">
      {NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive(href)
              ? "text-white"
              : "text-[#d4d8b0] hover:bg-white/10 hover:text-white"
          }`}
          style={isActive(href) ? { background: "#757f35" } : {}}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 z-20 border-r border-[#3f5230]"
        style={{ background: "#2f3e24" }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#3f5230]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: "#757f35" }}
          >
            <Scale size={16} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">E-Bench</p>
            <p className="text-[#a8b87a] text-[10px] uppercase tracking-wider">Lawyer Portal</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks />
        </div>
        <div className="px-5 py-4 border-t border-[#3f5230]">
          <p className="text-[#a8b87a] text-xs">Adv. Kinjal Ojha</p>
          <p className="text-[#d4d8b0] text-[11px] mt-0.5">Senior Partner</p>
        </div>
      </aside>

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
          className="md:hidden fixed inset-0 z-20 pt-14"
          style={{ background: "#2f3e24" }}
        >
          <div className="px-3">
            <NavLinks />
          </div>
        </div>
      )}

      {/* Mobile top spacer */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  );
}
