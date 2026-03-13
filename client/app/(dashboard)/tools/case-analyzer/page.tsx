"use client";

import { Scale, UploadCloud, Sparkles, Server, FileText, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function CaseAnalyzerPage() {
    const [description, setDescription] = useState("");
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
                            disabled={analyzing}
                            className="mt-4 w-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white py-3 rounded-xl font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                        >
                            {analyzing ? <span className="animate-spin"><Server size={18} /></span> : <Sparkles size={18} />}
                            {analyzing ? "Analyzing Case Data..." : "Generate AI Insights"}
                        </button>
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
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold w-fit mb-6">
                                <Sparkles size={14} /> Analysis Complete
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Applicable Laws</h3>
                                    <div className="flex flex-col gap-2">
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-[#1C4D8D]">
                                            <p className="font-bold text-[#1C4D8D] text-sm">Information Technology Act, 2000 - Section 66D</p>
                                            <p className="text-xs text-gray-600 mt-1">Punishment for cheating by personation by using computer resource.</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-[#1C4D8D]">
                                            <p className="font-bold text-[#1C4D8D] text-sm">Indian Penal Code (IPC) - Section 420</p>
                                            <p className="text-xs text-gray-600 mt-1">Cheating and dishonestly inducing delivery of property.</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Relevant Court Cases</h3>
                                    <div className="flex flex-col gap-3">
                                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-[#0F2854] text-sm">Avnish Bajaj vs State (N.C.T.) of Delhi</p>
                                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-semibold border border-gray-200">2005</span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed italic">"Dealt with liability of intermediaries in e-commerce under the IT Act."</p>
                                            <button className="text-xs font-bold text-[#4988C4] flex items-center hover:underline w-fit mt-1">
                                                Read Citation <ArrowRight size={12} className="ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Strategic Legal Insights</h3>
                                    <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4 marker:text-[#4988C4]">
                                        <li>Ensure to file a complaint under the National Cyber Crime Portal immediately.</li>
                                        <li>Bank statements reflecting the illicit transfer establish prima facie evidence for Section 420 IPC.</li>
                                        <li>Jurisdiction can be established at the complainant's location under IT Act provisions.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
