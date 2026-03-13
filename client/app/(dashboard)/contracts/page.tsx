"use client";

import { FileText, AlertTriangle, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchAnalyses, deleteAnalysis } from "@/lib/userApi";
import type { SavedAnalysis } from "@/lib/userApi";

export default function ContractsPage() {
    const [contracts, setContracts] = useState<SavedAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAnalyses("contract")
            .then(setContracts)
            .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "Failed to load contracts.")
            )
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteAnalysis(id);
            setContracts((prev) => prev.filter((c) => c._id !== id));
        } catch { /* no-op */ }
    };

    const getRiskColor = (score: number) => {
        if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
        if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
    };

    const filtered = contracts.filter((c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p className="text-sm py-8 text-center text-gray-500">Loading…</p>;
    if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><FileText size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Analyzed Contracts</h1>
                        <p className="text-sm text-gray-500">Review uploaded contracts and their associated risk scores.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F5F7FA] border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="p-4 pl-6">Contract Name</th>
                                <th className="p-4">Risk Level</th>
                                <th className="p-4">Risky Clauses Identified</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                    {contracts.length === 0 ? "No contracts yet. Analyze a contract to see it here." : "No contracts match your search."}
                                </td></tr>
                            ) : (
                                filtered.map((c) => (
                                    <tr key={c._id} className="hover:bg-[#F5F7FA]/50 transition-colors cursor-pointer group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <FileText className="text-gray-400" size={18} />
                                                <div>
                                                    <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{c._id.slice(-8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${c.riskScore >= 70 ? 'bg-red-500' : c.riskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${c.riskScore}%` }}
                                                    />
                                                </div>
                                                <span className={`px-2.5 py-1 text-xs font-bold border rounded-md ${getRiskColor(c.riskScore)}`}>
                                                    {c.riskScore}/100
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {c.sections && c.sections.length > 0 ? c.sections.map((s, i) => (
                                                    <span key={i} className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-semibold rounded border border-red-100 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {s.title || s.section_number || `Clause ${i + 1}`}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 pr-6">
                                            <button
                                                onClick={() => handleDelete(c._id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
