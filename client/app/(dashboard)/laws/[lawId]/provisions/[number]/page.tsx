"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
    ChevronRight, ChevronLeft, Loader2, Scale,
    Sparkles, BookOpen, RefreshCw, ExternalLink,
} from "lucide-react"
import {
    fetchProvisionDetail, enrichProvision,
    type ProvisionDetailResponse,
} from "@/lib/userApi"

export default function ProvisionDetailPage() {
    const params = useParams()
    const lawId = params.lawId as string
    const number = params.number as string
    const [prov, setProv] = useState<ProvisionDetailResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [enriching, setEnriching] = useState(false)
    const [enrichError, setEnrichError] = useState("")

    useEffect(() => {
        if (!lawId || !number) return
        fetchProvisionDetail(lawId, number)
            .then(data => setProv(data))
            .catch(err => setError(err.message || "Failed to load provision"))
            .finally(() => setLoading(false))
    }, [lawId, number])

    const handleEnrich = async (force = false) => {
        if (!lawId || !number) return
        setEnriching(true)
        setEnrichError("")
        try {
            const result = await enrichProvision(lawId, number, force)
            setProv(prev => prev ? {
                ...prev,
                doctrines: result.doctrines || prev.doctrines,
                use_cases: result.use_cases || prev.use_cases,
                important_concepts: result.important_concepts || prev.important_concepts,
            } : prev)
        } catch (err: any) {
            setEnrichError(err.message || "Enrichment failed")
        } finally {
            setEnriching(false)
        }
    }

    const hasEnrichment = prov?.doctrines || prov?.use_cases || prov?.important_concepts

    return (
        <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
                <Link href="/laws" className="hover:text-[#C49A10] transition-colors flex items-center gap-1">
                    <ChevronLeft size={12} /> Law Browser
                </Link>
                <ChevronRight size={10} />
                <Link href={`/laws/${lawId}`} className="hover:text-[#C49A10] transition-colors">
                    {prov?.law_label || lawId}
                </Link>
                <ChevronRight size={10} />
                <span className="text-[#1C2333] font-medium">
                    {prov?.provision_label} {number}
                </span>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#C49A10]" />
                    <span className="ml-3 text-sm text-gray-500">Loading provision...</span>
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-500 text-sm">{error}</p>
                    <p className="text-gray-400 text-xs mt-2">Ensure the RAG server is running at localhost:8000</p>
                </div>
            ) : prov ? (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1C2333] flex items-center justify-center shrink-0">
                                <Scale size={22} className="text-[#C49A10]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-[#1C2333] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {prov.provision_label} {prov.number}
                                </h1>
                                {prov.title && (
                                    <p className="text-sm text-gray-600">{prov.title}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs text-gray-400">{prov.law_label}</span>
                                    {prov.page && (
                                        <span className="text-xs text-gray-400">Page {prov.page}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Full Text */}
                    {prov.full_text && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-sm font-bold text-[#1C2333] mb-3 flex items-center gap-2">
                                <BookOpen size={14} className="text-[#C49A10]" />
                                Full Text
                            </h2>
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                                {prov.full_text}
                            </div>
                        </div>
                    )}

                    {/* Sub-Clauses */}
                    {prov.sub_clauses && prov.sub_clauses.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-sm font-bold text-[#1C2333] mb-3">
                                Sub-Clauses ({prov.sub_clauses.length})
                            </h2>
                            <div className="space-y-3">
                                {prov.sub_clauses.map((sc, i) => (
                                    <div key={sc.id || i} className="flex gap-3 text-sm">
                                        <span className="font-mono text-xs text-[#C49A10] bg-[#FDF8EF] px-2 py-0.5 rounded shrink-0 h-fit">
                                            ({sc.id})
                                        </span>
                                        <span className="text-gray-700 leading-relaxed">{sc.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Curated Summary */}
                    {(prov.summary || prov.plain_english) && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-sm font-bold text-[#1C2333] mb-3">
                                Summary
                            </h2>
                            {prov.summary && (
                                <p className="text-sm text-gray-700 mb-3">{prov.summary}</p>
                            )}
                            {prov.plain_english && prov.plain_english !== prov.summary && (
                                <div className="bg-[#FDF8EF] rounded-xl p-4 mt-3">
                                    <p className="text-xs font-bold text-[#8D7A55] mb-1.5 uppercase tracking-wider">Plain English</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{prov.plain_english}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Keywords & Topics */}
                    {((prov.keywords && prov.keywords.length > 0) || (prov.legal_topics && prov.legal_topics.length > 0)) && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-sm font-bold text-[#1C2333] mb-3">Keywords & Topics</h2>
                            <div className="flex flex-wrap gap-2">
                                {prov.keywords?.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[#F6F0E4] text-[#8D7A55] border border-[#E7D9BE]">
                                        {kw}
                                    </span>
                                ))}
                                {prov.legal_topics?.map((topic, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[#1C2333] text-white">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Enrichment Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-[#1C2333] flex items-center gap-2">
                                <Sparkles size={14} className="text-[#C49A10]" />
                                AI Enrichment
                            </h2>
                            <button
                                onClick={() => handleEnrich(hasEnrichment ? true : false)}
                                disabled={enriching}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#C49A10] text-white hover:bg-[#8D7A55] disabled:opacity-50 transition-colors"
                            >
                                {enriching ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={12} />
                                )}
                                {hasEnrichment ? "Re-enrich" : "Enrich with AI"}
                            </button>
                        </div>

                        {enrichError && (
                            <p className="text-xs text-red-500 mb-3">{enrichError}</p>
                        )}

                        {hasEnrichment ? (
                            <div className="space-y-4">
                                {prov.doctrines && (
                                    <div>
                                        <h3 className="text-xs font-bold text-[#8D7A55] uppercase tracking-wider mb-1.5">Doctrines</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed">{prov.doctrines}</p>
                                    </div>
                                )}
                                {prov.use_cases && (
                                    <div>
                                        <h3 className="text-xs font-bold text-[#8D7A55] uppercase tracking-wider mb-1.5">Use Cases</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed">{prov.use_cases}</p>
                                    </div>
                                )}
                                {prov.important_concepts && (
                                    <div>
                                        <h3 className="text-xs font-bold text-[#8D7A55] uppercase tracking-wider mb-1.5">Important Concepts</h3>
                                        <p className="text-sm text-gray-700 leading-relaxed">{prov.important_concepts}</p>
                                    </div>
                                )}
                            </div>
                        ) : !enriching ? (
                            <div className="text-center py-8 bg-[#FDF8EF] rounded-xl">
                                <Sparkles size={20} className="text-[#C49A10] mx-auto mb-2" />
                                <p className="text-sm text-gray-500">
                                    Click &quot;Enrich with AI&quot; to get doctrines, use cases, and key concepts for this provision.
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Powered by Nemotron-3 120B</p>
                            </div>
                        ) : null}
                    </div>

                    {/* Ask AI about this provision */}
                    <div className="bg-[#1C2333] rounded-2xl p-6 text-center">
                        <p className="text-sm text-white/80 mb-3">
                            Have questions about {prov.provision_label} {prov.number}?
                        </p>
                        <Link
                            href={`/chat?message=Explain ${prov.provision_label} ${prov.number} of ${prov.law_label} in detail`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C49A10] text-white text-sm font-medium hover:bg-[#8D7A55] transition-colors"
                        >
                            Ask AI Legal Assistant
                            <ExternalLink size={12} />
                        </Link>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
