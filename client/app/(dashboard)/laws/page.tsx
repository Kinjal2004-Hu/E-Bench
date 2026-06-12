"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    BookOpen, Scale, Search, ChevronRight, Loader2,
    Building2, Gavel, FileText, Shield, Landmark,
} from "lucide-react"
import { fetchLaws, type LawEntry } from "@/lib/userApi"

const DOMAIN_ICONS: Record<string, typeof Scale> = {
    "Criminal Law": Shield,
    "Criminal Procedure": Gavel,
    "Evidence Law": FileText,
    "Constitutional Law": Landmark,
    "Corporate Law": Building2,
    "Consumer Law": Scale,
    "Family Law": Scale,
    "Contract Law": FileText,
    "Cyber Law": Shield,
    "Labour Law": Scale,
    "Transport Law": Scale,
    "Real Estate Law": Building2,
    "Civil Remedies": Gavel,
    "Tax Law": FileText,
    "Property Law": Building2,
}

const DOMAIN_COLORS: Record<string, string> = {
    "Criminal Law": "#DC2626",
    "Criminal Procedure": "#EA580C",
    "Evidence Law": "#7C3AED",
    "Constitutional Law": "#2563EB",
    "Corporate Law": "#059669",
    "Consumer Law": "#D97706",
    "Family Law": "#DB2777",
    "Contract Law": "#4F46E5",
    "Cyber Law": "#0891B2",
    "Labour Law": "#CA8A04",
    "Transport Law": "#9333EA",
    "Real Estate Law": "#0D9488",
    "Civil Remedies": "#6366F1",
    "Tax Law": "#B45309",
    "Property Law": "#16A34A",
}

export default function LawsBrowserPage() {
    const [laws, setLaws] = useState<LawEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

    useEffect(() => {
        fetchLaws()
            .then(data => setLaws(data.laws || []))
            .catch(err => setError(err.message || "Failed to load laws"))
            .finally(() => setLoading(false))
    }, [])

    const domains = Array.from(new Set(laws.map(l => l.domain))).sort()

    const filtered = laws.filter(law => {
        const matchesSearch = !search ||
            law.label.toLowerCase().includes(search.toLowerCase()) ||
            law.id.toLowerCase().includes(search.toLowerCase()) ||
            law.domain.toLowerCase().includes(search.toLowerCase())
        const matchesDomain = !selectedDomain || law.domain === selectedDomain
        return matchesSearch && matchesDomain
    })

    const totalProvisions = laws.reduce((sum, l) => sum + l.provision_count, 0)

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#1C2333] flex items-center justify-center">
                        <BookOpen size={20} className="text-[#C49A10]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1C2333]" style={{ fontFamily: "'Playfair Display', serif" }}>
                            Law Browser
                        </h1>
                        <p className="text-sm text-gray-500">
                            {laws.length} laws indexed &middot; {totalProvisions.toLocaleString()} provisions
                        </p>
                    </div>
                </div>
            </div>

            {/* Search + Domain Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search laws by name, ID, or domain..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C49A10] focus:ring-2 focus:ring-[#C49A10]/20 transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setSelectedDomain(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            !selectedDomain
                                ? "bg-[#1C2333] text-white border-[#1C2333]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                        All ({laws.length})
                    </button>
                    {domains.map(d => (
                        <button
                            key={d}
                            onClick={() => setSelectedDomain(selectedDomain === d ? null : d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                selectedDomain === d
                                    ? "text-white border-transparent"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                            style={selectedDomain === d ? { backgroundColor: DOMAIN_COLORS[d] || "#1C2333" } : {}}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#C49A10]" />
                    <span className="ml-3 text-sm text-gray-500">Loading laws...</span>
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-500 text-sm">{error}</p>
                    <p className="text-gray-400 text-xs mt-2">Ensure the RAG server is running at localhost:8000</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-500 text-sm">No laws match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(law => {
                        const Icon = DOMAIN_ICONS[law.domain] || Scale
                        const color = DOMAIN_COLORS[law.domain] || "#1C2333"
                        return (
                            <Link
                                key={law.id}
                                href={`/laws/${law.id}`}
                                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#C49A10]/30 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:scale-105"
                                        style={{ backgroundColor: `${color}15` }}
                                    >
                                        <Icon size={18} style={{ color }} />
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-[#C49A10] transition-colors mt-1" />
                                </div>
                                <h3 className="font-semibold text-sm text-[#1C2333] mb-1 leading-tight group-hover:text-[#C49A10] transition-colors">
                                    {law.label}
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">{law.domain}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-400">
                                        {law.provision_count} {law.provision_label}s
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                        {law.id}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
