"use client";

import { FileText, UploadCloud, Sparkles, Server, List, Save, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ragAsk, saveAnalysis } from "@/lib/userApi";
import type { RagAskResponse } from "@/lib/userApi";

export default function CaseSummarizerPage() {
    const [text, setText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<RagAskResponse | null>(null);
    const [analyzeError, setAnalyzeError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const analyze = async () => {
        if (!text.trim()) return;
        setAnalyzing(true);
        setAnalyzeError("");
        setResult(null);
        setSaved(false);
        try {
            const data = await ragAsk(
                "Summarize this legal document and highlight key facts: " + text
            );
            setResult(data);
        } catch (err: unknown) {
            setAnalyzeError(err instanceof Error ? err.message : "Summarization failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        setSaving(true);
        try {
            await saveAnalysis({
                type: "summary",
                title: text.slice(0, 80) || "Case Summary",
                description: text,
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-[#4988C4] transition-all group">
                            <div className="w-12 h-12 bg-[#F5F7FA] text-[#1C4D8D] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <p className="text-sm font-bold text-[#0F2854] mb-1">Drag & Drop Judgement / FIR / Chargesheet</p>
                            <p className="text-xs text-gray-500">PDF, DOCX (Max 50MB)</p>
                        </div>

                        <div className="flex items-center gap-4 my-4">
                            <div className="h-px bg-gray-200 flex-1"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">OR paste text</span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>

                        <textarea
                            rows={6}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste the legal document content here (FIR, judgment, chargesheet)..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all resize-none text-sm text-gray-700"
                        />

                        <button
                            onClick={analyze}
                            disabled={analyzing || !text.trim()}
                            className="mt-4 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <List size={18} />}
                            {analyzing ? "Processing Document..." : "Generate Summary"}
                        </button>
                        {analyzeError && <p className="mt-2 text-xs text-red-600">{analyzeError}</p>}
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
                                <button
                                    onClick={handleSave}
                                    disabled={saving || saved}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0F2854] hover:bg-[#1C4D8D] px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-70 transition-colors"
                                >
                                    {saved ? <><CheckCircle size={14} /> Saved</> : saving ? "Saving…" : <><Save size={14} /> Save Report</>}
                                </button>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                                <div className="p-5">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#4988C4] mb-3">Summary</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.ai_answer}</p>
                                </div>

                                {result.supporting_sections && result.supporting_sections.length > 0 && (
                                    <div className="p-5 bg-[#F5F7FA]">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#0F2854] mb-3">Legal Sections Referenced</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            {result.supporting_sections.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-[#1C4D8D] text-xs font-bold shadow-sm">
                                                    {s.section_number} — {s.document}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.user_rights && result.user_rights.length > 0 && (
                                    <div className="p-5">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#4988C4] mb-3">Your Rights</h4>
                                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 marker:text-[#4988C4]">
                                            {result.user_rights.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {result.legal_steps && result.legal_steps.length > 0 && (
                                    <div className="p-5">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#4988C4] mb-3">Recommended Action Steps</h4>
                                        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 marker:text-[#4988C4]">
                                            {result.legal_steps.map((s, i) => <li key={i}>{s}</li>)}
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
