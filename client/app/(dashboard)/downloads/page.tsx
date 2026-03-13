"use client";

import { Download, File as FileIcon, Search, FileText, FileSearch, ShieldAlert, Folder } from "lucide-react";
import { useState } from "react";

const mockFiles = [
    { id: "F-01", name: "Report_Sharma_Corp_Fraud.pdf", type: "Case Analysis", size: "2.4 MB", date: "Oct 12, 2023" },
    { id: "F-02", name: "SaaS_Enterprise_RiskScore.pdf", type: "Contract Risk", size: "1.1 MB", date: "Dec 05, 2023" },
    { id: "F-03", name: "Summary_FIR_402.docx", type: "Summary", size: "0.8 MB", date: "Nov 15, 2023" },
    { id: "F-04", name: "Report_TechNova.pdf", type: "Case Analysis", size: "3.2 MB", date: "Nov 05, 2023" },
];

export default function DownloadsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const getIcon = (type: string) => {
        switch (type) {
            case "Case Analysis": return <FileSearch className="text-[#4988C4]" size={24} />;
            case "Contract Risk": return <ShieldAlert className="text-amber-500" size={24} />;
            case "Summary": return <FileText className="text-emerald-500" size={24} />;
            default: return <FileIcon className="text-gray-400" size={24} />;
        }
    };

    const filtered = mockFiles.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><Download size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Downloads & Reports</h1>
                        <p className="text-sm text-gray-500">Access and download generated AI reports and summaries.</p>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 w-64 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <Folder size={16} /> Generated Files
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-[#4988C4] hover:shadow-md transition-all group cursor-pointer bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    {getIcon(file.type)}
                                </div>
                                <button className="text-gray-400 hover:text-[#0F2854] transition-colors p-1.5 rounded-md hover:bg-gray-200">
                                    <Download size={16} />
                                </button>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[#0F2854] line-clamp-2" title={file.name}>{file.name}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] font-medium px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600">
                                        {file.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{file.size}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                            <FileIcon size={48} className="mb-4 opacity-50" />
                            <p>No files found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
