"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Scale,
    FileText,
    Download,
    Settings,
    User,
    Users,
    GraduationCap,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Cases", href: "/cases", icon: Scale },
    { name: "Contracts", href: "/contracts", icon: FileText },
    { name: "Consultation", href: "/chats/new", icon: Users },
    { name: "Microlearning", href: "/microlearning", icon: GraduationCap },
    { name: "Community", href: "/community", icon: Users },
    { name: "Downloads", href: "/downloads", icon: Download },
];

const bottomNavItems = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "User Profile", href: "/profile", icon: User },
];

export default function Sidebar({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}) {
    const pathname = usePathname();
    const router = useRouter();

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("ebench_token");
        localStorage.removeItem("userType");
        localStorage.removeItem("ebench_active_chat_id");
        router.push("/auth");
    }

    return (
        <aside
            className={`h-screen flex-shrink-0 flex flex-col transition-all duration-300 bg-[#0F2854] text-white
        ${isOpen ? "w-64" : "w-20"}
      `}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#1C4D8D]/50 flex-shrink-0">
                <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isOpen ? "w-auto opacity-100" : "w-0 opacity-0"}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#4988C4] flex justify-center items-center font-bold font-serif text-white">
                        EB
                    </div>
                    <div className="flex flex-col whitespace-nowrap">
                        <span className="font-semibold text-sm leading-tight">E-Bench</span>
                        <span className="text-[10px] text-[#BDE8F5] tracking-wide uppercase">Digital Justice</span>
                    </div>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-1.5 rounded-lg hover:bg-[#1C4D8D] text-[#BDE8F5] transition-colors ${!isOpen && "mx-auto"}`}
                >
                    {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
            </div>

            {/* Nav List */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1 overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
                ${isActive
                                    ? "bg-[#1C4D8D] text-white shadow-sm"
                                    : "text-slate-300 hover:bg-[#1C4D8D]/50 hover:text-white"
                                }
              `}
                            title={!isOpen ? item.name : undefined}
                        >
                            <item.icon size={20} className={`flex-shrink-0 ${isActive ? "text-[#BDE8F5]" : "text-slate-400 group-hover:text-white"}`} />
                            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Nav */}
            <div className="py-4 px-3 border-t border-[#1C4D8D]/50 flex flex-col gap-1">
                {bottomNavItems.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
                ${isActive
                                    ? "bg-[#1C4D8D] text-white shadow-sm"
                                    : "text-slate-300 hover:bg-[#1C4D8D]/50 hover:text-white"
                                }
              `}
                            title={!isOpen ? item.name : undefined}
                        >
                            <item.icon size={20} className={`flex-shrink-0 ${isActive ? "text-[#BDE8F5]" : "text-slate-400 group-hover:text-white"}`} />
                            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}

                <button
                    onClick={handleLogout}
                    title={!isOpen ? "Logout" : undefined}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group text-slate-300 hover:bg-red-500/20 hover:text-red-300 mt-1"
                >
                    <LogOut size={20} className="flex-shrink-0 text-slate-400 group-hover:text-red-300" />
                    <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"}`}>
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    );
}
