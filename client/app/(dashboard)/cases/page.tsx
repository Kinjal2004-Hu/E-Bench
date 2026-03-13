"use client";

import { Scale, Search, Filter } from "lucide-react";
import { useState } from "react";

const mockCases = [
    { id: "CAS-2023-01", name: "State vs. Sharma Corp", court: "High Court of Delhi", sections: "IPC 420, 120B", summary: "Fraud and conspiracy regarding tender bidding.", date: "2023-10-12" },
    { id: "CAS-2023-02", name: "TechNova vs Cyber Cell", court: "Supreme Court", sections: "IT Act 66C, 66D", summary: "Identity theft and cyber security breach appeal.", date: "2023-11-05" },
    { id: "CAS-2023-03", name: "Rao vs. Builders Assn.", court: "District Court, Mumbai", sections: "Consumer Protection 35", summary: "Delay in possession of property.", date: "2023-11-20" },
    { id: "CAS-2023-04", name: "Ministry of Finance vs Agrawal", court: "High Court of Bombay", sections: "PMLA Sec 3, 4", summary: "Money laundering investigation.", date: "2023-12-01" }
];

export default function CasesPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filtered = mockCases.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sections.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F5F7FA] border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="p-4 pl-6">Case Name</th>
                                <th className="p-4">Court</th>
                                <th className="p-4">Legal Sections</th>
                                <th className="p-4">Summary</th>
                                <th className="p-4 pr-6">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-[#F5F7FA]/50 transition-colors cursor-pointer group">
                                    <td className="p-4 pl-6">
                                        <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{c.id}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 font-medium">{c.court}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {c.sections.split(', ').map(sec => (
                                                <span key={sec} className="px-2 py-1 bg-[#BDE8F5]/30 text-[#1C4D8D] text-xs font-semibold rounded-md border border-[#BDE8F5]">
                                                    {sec}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={c.summary}>{c.summary}</td>
                                    <td className="p-4 pr-6 text-sm text-gray-500 whitespace-nowrap">{c.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">No cases found matching your search.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
