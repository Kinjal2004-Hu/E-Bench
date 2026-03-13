"use client";

import { FileText, UploadCloud, Sparkles, Server, List } from "lucide-react";
import { useState } from "react";

export default function CaseSummarizerPage() {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<null | boolean>(null);

    const analyze = () => {
        setAnalyzing(true);
        setTimeout(() => {
            setAnalyzing(false);
            setResult(true);
        }, 1500);
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><FileText size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Case File Summarizer</h1>
                    <p className="text-sm text-gray-500">Upload FIR, judgement, or chargesheet to get simplified summaries and key facts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Input Section */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col">
                        <h2 className="text-sm font-bold text-[#0F2854] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UploadCloud size={18} /> Upload Legal Document
                        </h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex-1 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-[#4988C4] transition-all group min-h-[300px]">
                            <div className="w-16 h-16 bg-[#F5F7FA] text-[#1C4D8D] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <p className="text-base font-bold text-[#0F2854] mb-2">Drag & Drop Judgement / FIR / Chargesheet</p>
                            <p className="text-sm text-gray-500 mb-6">Or click to browse your computer</p>
                            <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">Browse Files</span>
                            <p className="text-xs text-gray-400 mt-4">Supported formats: PDF, DOCX (Max 50MB)</p>
                        </div>

                        <button
                            onClick={analyze}
                            disabled={analyzing}
                            className="mt-6 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <List size={18} />}
                            {analyzing ? "Processing Document..." : "Generate Summary"}
                        </button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl shadow-inner p-6 flex flex-col relative overflow-hidden h-full min-h-[500px]">
                    {!result && !analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <List size={48} className="text-[#1C4D8D] mb-4 opacity-50" />
                            <p className="text-lg font-bold text-[#0F2854] max-w-xs">Waiting for Document</p>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm">Upload a large legal document to condense it into a structured, readable summary.</p>
                        </div>
                    )}

                    {analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 transition-all">
                            <div className="w-16 h-16 border-4 border-[#BDE8F5] border-t-[#0F2854] rounded-full animate-spin"></div>
                            <p className="font-semibold text-[#0F2854] mt-6 tracking-wide">Extracting & Summarizing facts...</p>
                        </div>
                    )}

                    {result && !analyzing && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2 text-[#1C4D8D] bg-[#F0F4F8] border border-[#1C4D8D]/20 px-3 py-1.5 rounded-lg text-xs font-bold w-fit">
                                    <Sparkles size={14} /> AI Summary Generated
                                </div>
                                <button className="text-xs font-semibold text-[#4988C4] hover:underline bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-1.5">
                                    <FileText size={14} /> Download PDF
                                </button>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                                <div className="p-5 bg-gray-50/50">
                                    <h3 className="font-bold text-[#0F2854] mb-1">State vs. ABC & Others</h3>
                                    <p className="text-xs text-gray-500">Document Type: FIR Copy • Pages Reduced: 14 to 1</p>
                                </div>

                                <div className="p-5">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#4988C4] mb-3">Simplified Summary</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed mb-0">
                                        The complainant alleges that an unauthorized withdrawal of Rs. 4,50,000 was made from their bank account via a cloned debit card. The incident spans over three transactions across different ATMs in Mumbai on the night of Oct 14th. Police have registered the FIR against unknown persons.
                                    </p>
                                </div>

                                <div className="p-5">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#4988C4] mb-3">Key Facts</h4>
                                    <ul className="text-sm text-gray-700 space-y-2.5">
                                        <li className="flex gap-2 items-start"><span className="text-emerald-500 font-bold mt-0.5">•</span> <strong>Location:</strong> Mumbai, Maharashtra (ATMs located in Andheri)</li>
                                        <li className="flex gap-2 items-start"><span className="text-emerald-500 font-bold mt-0.5">•</span> <strong>Date of Offense:</strong> 14th October 2023, 11:30 PM - 11:45 PM</li>
                                        <li className="flex gap-2 items-start"><span className="text-emerald-500 font-bold mt-0.5">•</span> <strong>Modus Operandi:</strong> Card Cloning / Skimming Devices</li>
                                    </ul>
                                </div>

                                <div className="p-5 bg-[#F5F7FA]">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Legal Sections Involved</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[#1C4D8D] text-xs font-bold shadow-sm">IPC 420</span>
                                        <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[#1C4D8D] text-xs font-bold shadow-sm">IT Act 66C</span>
                                        <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[#1C4D8D] text-xs font-bold shadow-sm">IT Act 66D</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
