"use client";

import { ShieldAlert, UploadCloud, Server, AlertTriangle, FileText, CheckCircle2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toolContractRisk } from "@/lib/userApi";
import type { ToolContractRiskResponse } from "@/lib/userApi";

export default function RiskAnalyzerPage() {
    const [contractText, setContractText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<ToolContractRiskResponse | null>(null);
    const [riskScore, setRiskScore] = useState(0);
    const [analyzeError, setAnalyzeError] = useState("");

    const analyze = async () => {
        if (!contractText.trim()) return;
        setAnalyzing(true);
        setAnalyzeError("");
        setResult(null);
        try {
            const data = await toolContractRisk(contractText);
            setResult(data);
            setRiskScore(data.risk_score || 0);
        } catch (err: unknown) {
            setAnalyzeError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-amber-400 transition-all group">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <p className="text-sm font-bold text-[#0F2854] mb-1">Drag & Drop Contract PDF / Word Doc</p>
                            <p className="text-xs text-gray-500">Max file size: 20MB</p>
                        </div>

                        <div className="flex items-center gap-4 my-4">
                            <div className="h-px bg-gray-200 flex-1"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR paste text</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>

                        <textarea
                            rows={6}
                            value={contractText}
                            onChange={(e) => setContractText(e.target.value)}
                            placeholder="Paste the contract text here to analyze for risky clauses..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none text-sm text-gray-700"
                        />

                        <button
                            onClick={analyze}
                            disabled={analyzing || !contractText.trim()}
                            className="mt-4 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <ShieldAlert size={18} />}
                            {analyzing ? "Scanning Clauses & Risk Variables..." : "Run Risk Analysis"}
                        </button>
                        {analyzeError && <p className="mt-2 text-xs text-red-600">{analyzeError}</p>}
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
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-gray-500 uppercase tracking-wider font-bold">Overall Risk Score</p>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                        <CheckCircle size={14} /> Auto-saved
                                    </div>
                                </div>
                                <div className="flex items-end justify-center gap-2">
                                    <span className={`text-5xl font-bold ${riskScore >= 70 ? "text-red-600" : riskScore >= 40 ? "text-amber-500" : "text-emerald-600"}`}>{riskScore}</span>
                                    <span className="text-lg font-bold text-gray-400 mb-1">/ 100</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 mt-4 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${riskScore >= 70 ? "bg-red-500" : riskScore >= 40 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${riskScore}%` }}></div>
                                </div>
                                <p className={`text-xs font-semibold mt-2 flex items-center justify-center gap-1 ${riskScore >= 70 ? "text-red-600" : riskScore >= 40 ? "text-amber-500" : "text-emerald-600"}`}>
                                    {riskScore >= 70 ? <><AlertTriangle size={12} /> High Risk Detected</> : riskScore >= 40 ? <><AlertTriangle size={12} /> Moderate Risk</> : <><CheckCircle2 size={12} /> Low Risk</>}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">AI Risk Analysis</h3>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.ai_answer}</p>
                                </div>

                                {result.supporting_sections && result.supporting_sections.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Relevant Legal Provisions</h3>
                                        <div className="flex flex-col gap-2">
                                            {result.supporting_sections.map((s, i) => (
                                                <div key={i} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="bg-amber-50 p-3 border-b border-amber-200 flex items-center justify-between">
                                                        <span className="font-bold text-amber-700 text-sm">{s.document} — {s.section_number}{s.title ? ` (${s.title})` : ""}</span>
                                                    </div>
                                                    <div className="p-3">
                                                        {s.snippet && <p className="text-xs text-gray-600 italic">{s.snippet}</p>}
                                                        {s.punishment_summary && <p className="text-xs text-red-600 mt-1 font-medium">⚖ {s.punishment_summary}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.flagged_clauses && result.flagged_clauses.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Flagged Clauses</h3>
                                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 marker:text-amber-500">
                                            {result.flagged_clauses.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
