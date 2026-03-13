"use client";

import { Bell, Search, Moon, Sun, Mail, SearchCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TopNav() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDark, setIsDark] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
                <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0F2854] w-4 h-4 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search cases, contracts, documents, or legal sections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:bg-white focus:border-[#4988C4] focus:ring-2 focus:ring-[#BDE8F5]/50 hover:border-gray-300"
                    />
                </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 ml-4">
                <Link
                    href="/contact"
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#F0F4F8] text-[#1C4D8D] font-medium text-sm rounded-full hover:bg-[#E2E8F0] transition-colors"
                >
                    <Mail size={16} />
                    Contact Us
                </Link>

                <Link
                    href="/community"
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#E9EEF7] text-[#1C4D8D] font-medium text-sm rounded-full hover:bg-[#DDE7F5] transition-colors"
                >
                    <SearchCode size={16} />
                    Community
                </Link>

                {/* Action Icons */}
                <div className="flex items-center gap-1.5 ml-2">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
                    </button>

                    <button title="Notifications" aria-label="Notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                        <Bell size={18} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                    </button>
                </div>

                {/* User Dropdown / Avatar */}
                <div className="ml-2 pl-4 border-l border-gray-200 flex items-center cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-[#1C4D8D] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        KO
                    </div>
                    <div className="hidden lg:block ml-3">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">Adv. Kinjal Ojha</p>
                        <p className="text-[11px] text-gray-500 font-medium">Sr. Legal Partner</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
