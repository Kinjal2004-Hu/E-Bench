"use client";

import { FileText, AlertTriangle, CheckCircle, Search, Upload } from "lucide-react";
import { useState } from "react";

const mockContracts = [
    { id: "CTR-01", name: "SaaS Enterprise SLA.pdf", riskScore: 85, clauses: ["Liability Cap", "Data Ownership"], date: "2023-12-05", status: "High Risk" },
    { id: "CTR-02", name: "Vendor Agreement 2024.docx", riskScore: 42, clauses: ["Termination"], date: "2023-12-06", status: "Medium Risk" },
    { id: "CTR-03", name: "NDA - Global Partners.pdf", riskScore: 12, clauses: [], date: "2023-12-07", status: "Low Risk" },
    { id: "CTR-04", name: "Employment Contract - Jan.pdf", riskScore: 56, clauses: ["Non-Compete", "IP Rights"], date: "2023-12-08", status: "Medium Risk" },
];

export default function ContractsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filtered = mockContracts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRiskColor = (score: number) => {
        if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
        if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
    };

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0F2854] text-white rounded-lg text-sm font-medium hover:bg-[#1C4D8D] transition-colors">
                        <Upload size={16} /> New Upload
                    </button>
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
                                <th className="p-4 pr-6">Upload Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-[#F5F7FA]/50 transition-colors cursor-pointer group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-gray-400" size={18} />
                                            <div>
                                                <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.name}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{c.id}</p>
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
                                            {c.clauses.length > 0 ? c.clauses.map(clause => (
                                                <span key={clause} className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-semibold rounded border border-red-100 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> {clause}
                                                </span>
                                            )) : (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-semibold rounded border border-emerald-100 flex items-center gap-1">
                                                    <CheckCircle size={10} /> Clean
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 pr-6 text-sm text-gray-500 whitespace-nowrap">{c.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">No contracts found matching your search.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
