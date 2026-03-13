"use client";

import { Download, File as FileIcon, Search, FileText, FileSearch, ShieldAlert, Folder, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchAnalyses, deleteAnalysis } from "@/lib/userApi";
import type { SavedAnalysis } from "@/lib/userApi";

const TYPE_MAP: Record<string, string> = {
    case: "Case Analysis",
    contract: "Contract Risk",
    summary: "Summary",
};

export default function DownloadsPage() {
    const [files, setFiles] = useState<SavedAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchAnalyses()
            .then(setFiles)
            .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "Failed to load reports.")
            )
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteAnalysis(id);
            setFiles((prev) => prev.filter((f) => f._id !== id));
        } catch { /* no-op */ }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "case": return <FileSearch className="text-[#4988C4]" size={24} />;
            case "contract": return <ShieldAlert className="text-amber-500" size={24} />;
            case "summary": return <FileText className="text-emerald-500" size={24} />;
            default: return <FileIcon className="text-gray-400" size={24} />;
        }
    };

    const filtered = files.filter((f) =>
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (TYPE_MAP[f.type] ?? f.type).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p className="text-sm py-8 text-center text-gray-500">Loading…</p>;
    if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

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
                    <Folder size={16} /> Saved Reports
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((file) => (
                        <div key={file._id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-[#4988C4] hover:shadow-md transition-all group cursor-pointer bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    {getIcon(file.type)}
                                </div>
                                <button
                                    onClick={() => handleDelete(file._id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-gray-200"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[#0F2854] line-clamp-2" title={file.title}>{file.title}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[11px] font-medium px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600">
                                        {TYPE_MAP[file.type] ?? file.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(file.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400">
                            <FileIcon size={48} className="mb-4 opacity-50" />
                            <p>{files.length === 0 ? "No reports yet. Use the AI tools to generate reports." : "No files found."}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
