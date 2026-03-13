"use client";

import { ShieldAlert, UploadCloud, Server, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function RiskAnalyzerPage() {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<null | boolean>(null);

    const analyze = () => {
        setAnalyzing(true);
        setTimeout(() => {
            setAnalyzing(false);
            setResult(true);
        }, 1800);
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white border border-gray-200 rounded-xl text-amber-600 shadow-sm"><ShieldAlert size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Contract Risk Analyzer</h1>
                    <p className="text-sm text-gray-500">Upload agreements to detect hidden risks, unfair clauses, and compute a safety score.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Input Section */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col">
                        <h2 className="text-sm font-bold text-[#0F2854] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UploadCloud size={18} /> Upload Contract
                        </h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex-1 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-amber-400 transition-all group min-h-[300px]">
                            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={32} />
                            </div>
                            <p className="text-base font-bold text-[#0F2854] mb-2">Drag & Drop Contract PDF / Word Doc</p>
                            <p className="text-sm text-gray-500 mb-6">Or click to browse your computer</p>
                            <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">Browse Files</span>
                            <p className="text-xs text-gray-400 mt-4">Max file size: 20MB</p>
                        </div>

                        <button
                            onClick={analyze}
                            disabled={analyzing}
                            className="mt-6 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <ShieldAlert size={18} />}
                            {analyzing ? "Scanning Clauses & Risk Variables..." : "Run Risk Analysis"}
                        </button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl shadow-inner p-6 flex flex-col relative overflow-hidden h-full min-h-[500px]">
                    {!result && !analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <ShieldAlert size={48} className="text-amber-600 mb-4 opacity-50" />
                            <p className="text-lg font-bold text-[#0F2854] max-w-xs">Waiting for Contract</p>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm">Upload a contract to view its risk score, highlighted risky clauses, and alternative suggestions.</p>
                        </div>
                    )}

                    {analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 transition-all">
                            <div className="w-16 h-16 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin"></div>
                            <p className="font-semibold text-[#0F2854] mt-6 tracking-wide">Evaluating clauses against legal databases...</p>
                        </div>
                    )}

                    {result && !analyzing && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex flex-col mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-2">Overall Risk Score</p>
                                <div className="flex items-end justify-center gap-2">
                                    <span className="text-5xl font-bold text-red-600">82</span>
                                    <span className="text-lg font-bold text-gray-400 mb-1">/ 100</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 mt-4 rounded-full overflow-hidden">
                                    <div className="bg-red-500 h-full rounded-full" style={{ width: '82%' }}></div>
                                </div>
                                <p className="text-xs font-semibold text-red-600 mt-2 flex items-center justify-center gap-1">
                                    <AlertTriangle size={12} /> High Risk Detected
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Highlighted Risky Clauses</h3>

                                <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-red-50 p-3 border-b border-red-200 flex items-center justify-between">
                                        <span className="font-bold text-red-700 text-sm">1. Limitation of Liability (Clause 8.2)</span>
                                        <span className="bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">Critical</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-gray-600 leading-relaxed italic bg-gray-50 border-l-2 border-red-300 pl-3 py-1">
                                            "Under no circumstances shall the Company's total aggregate liability arising out of or in connection with this Agreement exceed the sum of ₹100 regardless of action."
                                        </p>
                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-[#0F2854] mb-1">AI Suggestion:</p>
                                            <p className="text-sm text-gray-700">The liability cap is unreasonably low (₹100). Suggest amending it to equal the total contract value or 12 months' fees, standard in B2B SaaS agreements under Indian Contract Act Section 73.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-amber-50 p-3 border-b border-amber-200 flex items-center justify-between">
                                        <span className="font-bold text-amber-700 text-sm">2. Unilateral Termination (Clause 12.1)</span>
                                        <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">Moderate</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs text-gray-600 leading-relaxed italic bg-gray-50 border-l-2 border-amber-300 pl-3 py-1">
                                            "Provider retains the right to terminate this agreement at any time, without cause, providing 24 hours written notice."
                                        </p>
                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-[#0F2854] mb-1">AI Suggestion:</p>
                                            <p className="text-sm text-gray-700">24 hours is inadequate notice for a commercial contract. Propose mutual termination for convenience with a minimum 30 or 60-day notice period.</p>
                                        </div>
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
