"use client";

import { ShieldAlert, UploadCloud, Server, AlertTriangle, FileText, CheckCircle2, CheckCircle, ArrowLeft, Download, Eye, Highlighter } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toolContractRisk } from "@/lib/userApi";
import type { ToolContractRiskResponse } from "@/lib/userApi";
import { extractTextFromFile } from "@/lib/documentText";
import FormattedAiText from "@/components/FormattedAiText";
import { exportTextAsPdf } from "@/lib/exportPdf";

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function getClauseSearchTerm(clause: string) {
    const normalized = normalizeWhitespace(clause);
    if (!normalized) return "";
    const parts = normalized
        .split(/[.;:]/)
        .map((part) => part.trim())
        .filter(Boolean);
    const candidate = parts[0] || normalized;
    return candidate.split(" ").slice(0, 16).join(" ");
}

function buildMatchRegex(value: string) {
    const searchTerm = getClauseSearchTerm(value);
    if (!searchTerm) return null;
    const pattern = escapeRegExp(searchTerm).replace(/\s+/g, "\\s+");
    return new RegExp(pattern, "i");
}

function extractClauseSnippet(text: string, clause: string) {
    const regex = buildMatchRegex(clause);
    if (!regex) return null;
    const match = regex.exec(text);
    if (!match || match.index < 0) return null;

    const start = Math.max(0, match.index - 120);
    const end = Math.min(text.length, match.index + match[0].length + 120);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < text.length ? "..." : "";
    return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function highlightContractText(text: string, clauses: string[]) {
    if (!text.trim()) return [{ text, highlighted: false }];

    const ranges: Array<{ start: number; end: number }> = [];

    clauses.forEach((clause) => {
        const regex = buildMatchRegex(clause);
        if (!regex) return;
        const match = regex.exec(text);
        if (!match || match.index < 0) return;
        ranges.push({ start: match.index, end: match.index + match[0].length });
    });

    if (ranges.length === 0) return [{ text, highlighted: false }];

    ranges.sort((left, right) => left.start - right.start);
    const merged: Array<{ start: number; end: number }> = [];
    for (const range of ranges) {
        const current = merged[merged.length - 1];
        if (!current || range.start > current.end) {
            merged.push({ ...range });
            continue;
        }
        current.end = Math.max(current.end, range.end);
    }

    const segments: Array<{ text: string; highlighted: boolean }> = [];
    let cursor = 0;
    for (const range of merged) {
        if (range.start > cursor) {
            segments.push({ text: text.slice(cursor, range.start), highlighted: false });
        }
        segments.push({ text: text.slice(range.start, range.end), highlighted: true });
        cursor = range.end;
    }
    if (cursor < text.length) {
        segments.push({ text: text.slice(cursor), highlighted: false });
    }
    return segments;
}

export default function RiskAnalyzerPage() {
    const router = useRouter();
    const [contractText, setContractText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ToolContractRiskResponse | null>(null);
    const [riskScore, setRiskScore] = useState(0);
    const [analyzeError, setAnalyzeError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [uploadedFileName, setUploadedFileName] = useState("");
    const [resultView, setResultView] = useState<"full" | "harmful">("full");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const harmfulClauseMatches = useMemo(() => {
        if (!result?.flagged_clauses?.length) return [];

        return result.flagged_clauses.map((clause) => ({
            clause,
            snippet: extractClauseSnippet(contractText, clause),
        }));
    }, [contractText, result]);

    const highlightedContract = useMemo(() => {
        if (!result?.flagged_clauses?.length) {
            return [{ text: contractText, highlighted: false }];
        }
        return highlightContractText(contractText, result.flagged_clauses);
    }, [contractText, result]);

    const persistInMyChats = (prompt: string, data: ToolContractRiskResponse) => {
        try {
            const raw = localStorage.getItem("ebench_chats");
            const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
            const id = `chat_${Date.now()}`;
            const now = new Date().toISOString();
            const sources = (data.supporting_sections || []).map(
                (s) => `${s.document} - Section ${s.section_number}: ${s.title}`
            );

            const messages = [
                { id: Date.now(), sender: "user", text: prompt },
                {
                    id: Date.now() + 1,
                    sender: "ai",
                    text: data.ai_answer || "Risk analysis generated.",
                    sources,
                },
            ];

            list.unshift({
                id,
                title: `Contract Risk: ${prompt.slice(0, 60)}`,
                last_message: (data.ai_answer || "Risk analysis generated.").slice(0, 120),
                bot_type: "Contract Review",
                timestamp: now,
                message_count: messages.length,
                messages,
                pinned: false,
            });

            localStorage.setItem("ebench_chats", JSON.stringify(list));
        } catch {
            // no-op
        }
    };

    const downloadRiskReport = () => {
        if (!result) return;
        const lines = [
            "E-Bench Contract Risk Analysis",
            "",
            "Input:",
            contractText.trim() || "(uploaded file)",
            "",
            `Risk Score: ${result.risk_score} / 100 (${result.risk_level})`,
            "",
            "AI Analysis:",
            result.ai_answer || "",
            "",
            "Flagged Clauses:",
            ...(result.flagged_clauses || []).map((c, i) => `${i + 1}. ${c}`),
            "",
            "Relevant Legal Provisions:",
            ...(result.supporting_sections || []).map(
                (s, i) => `${i + 1}. ${s.document} - Section ${s.section_number}${s.title ? ` (${s.title})` : ""}`
            ),
            "",
            `Model: ${result.model_used}`,
        ];

        exportTextAsPdf(
            `contract-risk-${Date.now()}.pdf`,
            "E-Bench Contract Risk Analysis",
            lines
        );
    };

    const onUploadClick = () => fileInputRef.current?.click();

    const onFileSelected = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        setUploadError("");

        try {
            const extracted = await extractTextFromFile(file);
            if (!extracted.trim()) {
                throw new Error("Could not extract readable text from this file.");
            }

            setUploadedFileName(file.name);
            setContractText((prev) => (prev.trim() ? `${prev}\n\n${extracted}` : extracted));
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "File upload failed.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const analyze = async () => {
        if (!contractText.trim()) return;
        setAnalyzing(true);
        setAnalyzeError("");
        setResult(null);
        try {
            const data = await toolContractRisk(contractText);
            setResult(data);
            setRiskScore(data.risk_score || 0);
            setResultView("full");
            persistInMyChats(contractText, data);
        } catch (err: unknown) {
            setAnalyzeError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div>
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[#0F2854] text-sm font-semibold hover:bg-[#F7F9FC] transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>

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
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="hidden"
                            onChange={(e) => onFileSelected(e.target.files?.[0])}
                        />
                        <button
                            type="button"
                            onClick={onUploadClick}
                            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 hover:border-amber-400 transition-all group"
                        >
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <p className="text-sm font-bold text-[#0F2854] mb-1">{uploading ? "Extracting text..." : "Upload Contract PDF / Word Doc"}</p>
                            <p className="text-xs text-gray-500">PDF, DOCX, TXT, MD (Max 20MB)</p>
                            {uploadedFileName ? <p className="mt-2 text-xs text-emerald-700 font-medium">Loaded: {uploadedFileName}</p> : null}
                        </button>
                        {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}

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
                <div className="bg-[#F5F7FA] border border-gray-200 rounded-2xl shadow-inner p-6 flex flex-col relative overflow-hidden h-full min-h-[500px] max-h-[calc(100vh-220px)]">
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={downloadRiskReport}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2854] bg-white px-3 py-1.5 rounded-lg border border-gray-200"
                                        >
                                            <Download size={14} /> Download PDF
                                        </button>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                            <CheckCircle size={14} /> Auto-saved
                                        </div>
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

                            <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setResultView("full")}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                        resultView === "full"
                                            ? "bg-[#0F2854] text-white"
                                            : "text-[#0F2854] hover:bg-[#F5F7FA]"
                                    }`}
                                >
                                    <Eye size={15} /> Full View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResultView("harmful")}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                        resultView === "harmful"
                                            ? "bg-[#8B1E3F] text-white"
                                            : "text-[#8B1E3F] hover:bg-[#FDF2F4]"
                                    }`}
                                >
                                    <Highlighter size={15} /> Harmful Clauses
                                </button>
                            </div>

                            <div className="space-y-4">
                                {resultView === "full" ? (
                                    <>
                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">Full Contract View</h3>
                                            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-7 text-gray-700 whitespace-pre-wrap">
                                                {contractText.trim() ? highlightedContract.map((segment, index) => (
                                                    segment.highlighted ? (
                                                        <mark key={index} className="rounded bg-amber-200/80 px-1 py-0.5 text-[#5B3C00]">
                                                            {segment.text}
                                                        </mark>
                                                    ) : (
                                                        <span key={index}>{segment.text}</span>
                                                    )
                                                )) : "No contract text available."}
                                            </div>
                                            {result.flagged_clauses?.length ? (
                                                <p className="mt-2 text-xs text-amber-700">Highlighted sections show matched potentially harmful wording found in the uploaded contract.</p>
                                            ) : null}
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-3 border-b border-gray-200 pb-2">AI Risk Analysis</h3>
                                            <FormattedAiText text={result.ai_answer} className="space-y-1" />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#8B1E3F] mb-3 border-b border-red-100 pb-2">Harmful Clause Review</h3>
                                        {harmfulClauseMatches.length > 0 ? (
                                            <div className="space-y-3">
                                                {harmfulClauseMatches.map((item, index) => (
                                                    <div key={`${item.clause}-${index}`} className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                                                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                                                            <AlertTriangle size={12} /> Harmful Clause {index + 1}
                                                        </div>
                                                        <p className="text-sm font-semibold leading-6 text-[#4A1020]">{item.clause}</p>
                                                        <div className="mt-3 rounded-xl border border-red-100 bg-[#FFF7F8] p-3">
                                                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-500">Matched in contract</p>
                                                            <p className="mt-2 text-sm leading-6 text-gray-700">{item.snippet || "Exact clause match was not found in the pasted text, but the model still flagged this wording as harmful."}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-700">
                                                No harmful clauses were specifically flagged in this contract.
                                            </div>
                                        )}
                                    </div>
                                )}

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
