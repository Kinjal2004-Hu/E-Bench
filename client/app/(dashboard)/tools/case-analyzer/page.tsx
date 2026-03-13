"use client";

import { Scale, UploadCloud, Sparkles, Server, FileText, ArrowRight, Save, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ragAsk, saveAnalysis } from "@/lib/userApi";
import type { RagAskResponse } from "@/lib/userApi";

export default function CaseAnalyzerPage() {
    const [description, setDescription] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<RagAskResponse | null>(null);
    const [analyzeError, setAnalyzeError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const analyze = async () => {
        if (!description.trim()) return;
        setAnalyzing(true);
        setAnalyzeError("");
        setResult(null);
        setSaved(false);
        try {
            const data = await ragAsk(
                "Analyze this case and identify applicable legal sections: " + description
            );
            setResult(data);
        } catch (err: unknown) {
            setAnalyzeError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        setSaving(true);
        try {
            await saveAnalysis({
                type: "case",
                title: description.slice(0, 80) || "Case Analysis",
                description,
                aiAnswer: result.ai_answer,
                sections: result.supporting_sections,
                userRights: result.user_rights,
                legalSteps: result.legal_steps,
                riskScore: 0,
            });
            setSaved(true);
        } catch { /* no-op */ } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><Scale size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">AI Case Analyzer</h1>
                    <p className="text-sm text-gray-500">Upload a case document or paste details to get instant legal insights.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-sm font-bold text-[#0F2854] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UploadCloud size={18} /> Upload Case Document
                        </h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-[#4988C4] transition-all group">
                            <div className="w-12 h-12 bg-[#F5F7FA] text-[#1C4D8D] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <p className="text-sm font-semibold text-[#0F2854] mb-1">Click to upload or drag & drop</p>
                            <p className="text-xs text-gray-500">Supported formats: PDF, DOCX (Max 20MB)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-200 flex-1"></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-sm font-bold text-[#0F2854] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Sparkles size={18} /> Paste Case Description
                        </h2>
                        <textarea
                            rows={6}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="E.g. A client was defrauded of Rs. 10 Lakhs through a fake e-commerce website..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all resize-none text-sm text-gray-700"
                        ></textarea>

                        <button
                            onClick={analyze}
                            disabled={analyzing || !description.trim()}
                            className="mt-4 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <Sparkles size={18} />}
                            {analyzing ? "Analyzing Case Data..." : "Generate AI Insights"}
                        </button>
                        {analyzeError && <p className="mt-2 text-xs text-red-600">{analyzeError}</p>}
                    </div>
                </div>

                {/* Output Section */}
                <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl shadow-inner p-6 flex flex-col relative overflow-hidden h-full min-h-[500px]">
                    {!result && !analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-60">
                            <Scale size={48} className="text-[#1C4D8D] mb-4 opacity-50" />
                            <p className="text-lg font-bold text-[#0F2854] max-w-xs">Awaiting Input</p>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm">Provide a case file or description to see applicable laws and relevant judgments.</p>
                        </div>
                    )}

                    {analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 transition-all">
                            <div className="w-16 h-16 border-4 border-[#BDE8F5] border-t-[#0F2854] rounded-full animate-spin"></div>
                            <p className="font-semibold text-[#0F2854] mt-6 tracking-wide">Scanning Legal Databases</p>
                        </div>
                    )}

                    {result && !analyzing && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold w-fit">
                                    <Sparkles size={14} /> Analysis Complete
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || saved}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0F2854] hover:bg-[#1C4D8D] px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-70 transition-colors"
                                >
                                    {saved ? <><CheckCircle size={14} /> Saved</> : saving ? "Saving…" : <><Save size={14} /> Save Report</>}
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">AI Analysis</h3>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.ai_answer}</p>
                                </div>

                                {result.supporting_sections && result.supporting_sections.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Applicable Laws</h3>
                                        <div className="flex flex-col gap-2">
                                            {result.supporting_sections.map((s, i) => (
                                                <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-[#1C4D8D]">
                                                    <p className="font-bold text-[#1C4D8D] text-sm">{s.document} — {s.section_number}{s.title ? ` (${s.title})` : ""}</p>
                                                    {s.snippet && <p className="text-xs text-gray-600 mt-1">{s.snippet}</p>}
                                                    {s.punishment_summary && <p className="text-xs text-red-600 mt-1 font-medium">⚖ {s.punishment_summary}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.user_rights && result.user_rights.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Your Rights</h3>
                                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 marker:text-[#4988C4]">
                                            {result.user_rights.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {result.legal_steps && result.legal_steps.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Recommended Steps</h3>
                                        <div className="flex flex-col gap-2">
                                            {result.legal_steps.map((step, i) => (
                                                <div key={i} className="flex gap-2 items-start text-sm text-gray-700">
                                                    <ArrowRight size={14} className="text-[#4988C4] mt-0.5 shrink-0" />
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
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
