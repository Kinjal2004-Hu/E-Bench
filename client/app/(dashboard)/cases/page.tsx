"use client";

import { Scale, Search, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchAnalyses, deleteAnalysis } from "@/lib/userApi";
import type { SavedAnalysis } from "@/lib/userApi";

export default function CasesPage() {
    const [cases, setCases] = useState<SavedAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAnalyses("case")
            .then(setCases)
            .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "Failed to load cases.")
            )
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteAnalysis(id);
            setCases((prev) => prev.filter((c) => c._id !== id));
        } catch { /* no-op */ }
    };

    const filtered = cases.filter((c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p className="text-sm py-8 text-center text-gray-500">Loading…</p>;
    if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><Scale size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Analyzed Cases</h1>
                        <p className="text-sm text-gray-500">View and manage all previously analyzed case files.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search cases..."
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
                                <th className="p-4 pl-6">Case Title</th>
                                <th className="p-4">Legal Sections Found</th>
                                <th className="p-4">Description</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                    {cases.length === 0 ? "No cases yet. Analyze a case to see it here." : "No cases match your search."}
                                </td></tr>
                            ) : (
                                filtered.map((c) => (
                                    <tr key={c._id} className="hover:bg-[#F5F7FA]/50 transition-colors cursor-pointer group">
                                        <td className="p-4 pl-6">
                                            <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{c._id.slice(-8).toUpperCase()}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-[#BDE8F5]/30 text-[#1C4D8D] text-xs font-semibold rounded-md border border-[#BDE8F5]">
                                                AI Analysis
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={c.description}>{c.description || "—"}</td>
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
