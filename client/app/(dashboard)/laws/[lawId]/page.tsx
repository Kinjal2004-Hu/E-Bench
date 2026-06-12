"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    BookOpen, ChevronRight, ChevronLeft, Search,
    Loader2, Scale, Filter,
} from "lucide-react"
import { fetchLawById, type LawDetailResponse } from "@/lib/userApi"

export default function LawDetailPage() {
    const params = useParams()
    const lawId = params.lawId as string
    const [law, setLaw] = useState<LawDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [search, setSearch] = useState("")

    useEffect(() => {
        if (!lawId) return
        fetchLawById(lawId, true)
            .then(data => setLaw(data))
            .catch(err => setError(err.message || "Failed to load law"))
            .finally(() => setLoading(false))
    }, [lawId])

    const provisions = (law?.provisions || []).filter(p => {
        if (!search) return true
        const s = search.toLowerCase()
        return (p.number || "").toLowerCase().includes(s) ||
               (p.title || "").toLowerCase().includes(s)
    })

    return (
        <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                <Link href="/laws" className="hover:text-[#C49A10] transition-colors flex items-center gap-1">
                    <ChevronLeft size={12} /> Law Browser
                </Link>
                <ChevronRight size={10} />
                <span className="text-[#1C2333] font-medium">{law?.label || lawId}</span>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#1C2333] flex items-center justify-center">
                        <Scale size={20} className="text-[#C49A10]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1C2333]" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {law?.label || "Loading..."}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {law?.domain} &middot; {law?.provision_count || 0} {law?.provision_label || "Provisions"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={`Search ${law?.provision_label || "provisions"}...`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#C49A10] focus:ring-2 focus:ring-[#C49A10]/20 transition-all"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#C49A10]" />
                    <span className="ml-3 text-sm text-gray-500">Loading provisions...</span>
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-500 text-sm">{error}</p>
                    <p className="text-gray-400 text-xs mt-2">Ensure the RAG server is running at localhost:8000</p>
                </div>
            ) : provisions.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-500 text-sm">No provisions found.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                            {provisions.length} {law?.provision_label || "Provisions"}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {provisions.map((prov, i) => (
                            <Link
                                key={prov.number || i}
                                href={`/laws/${lawId}/provisions/${prov.number}`}
                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FDF8EF] transition-colors group"
                            >
                                <span className="w-8 h-8 rounded-lg bg-[#F6F0E4] flex items-center justify-center text-xs font-bold text-[#8D7A55] shrink-0 group-hover:bg-[#C49A10] group-hover:text-white transition-colors">
                                    {prov.number}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#1C2333] truncate group-hover:text-[#C49A10] transition-colors">
                                        {law?.provision_label} {prov.number}
                                    </p>
                                    {prov.title && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{prov.title}</p>
                                    )}
                                </div>
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-[#C49A10] transition-colors shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
