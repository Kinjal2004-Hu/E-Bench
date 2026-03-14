"use client";

import { FileText, AlertTriangle, Search, Trash2, Eye, Highlighter, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { fetchAnalyses, deleteAnalysis, fetchAnalysisById } from "@/lib/userApi";
import type { SavedAnalysis, FullAnalysis } from "@/lib/userApi";
import FormattedAiText from "@/components/FormattedAiText";

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function getClauseSearchTerm(clause: string) {
    const normalized = normalizeWhitespace(clause);
    if (!normalized) return "";
    const pieces = normalized.split(/[.;:]/).map((piece) => piece.trim()).filter(Boolean);
    const candidate = pieces[0] || normalized;
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
    return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
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

export default function ContractsPage() {
    const [contracts, setContracts] = useState<SavedAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
    const [viewData, setViewData] = useState<FullAnalysis | null>(null);
    const [viewMode, setViewMode] = useState<"full" | "harmful">("full");

    useEffect(() => {
        fetchAnalyses("contract")
            .then(setContracts)
            .catch((err: unknown) =>
                setError(err instanceof Error ? err.message : "Failed to load contracts.")
            )
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteAnalysis(id);
            setContracts((prev) => prev.filter((c) => c._id !== id));
        } catch { /* no-op */ }
    };

    const handleView = async (id: string, mode: "full" | "harmful") => {
        setViewLoadingId(id);
        try {
            const data = await fetchAnalysisById(id);
            setViewData(data);
            setViewMode(mode);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load contract details.");
        } finally {
            setViewLoadingId(null);
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
        if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
    };

    const filtered = contracts.filter((c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const harmfulClauses = viewData?.legalSteps || [];

    const harmfulClauseMatches = useMemo(() => {
        if (!viewData?.description || harmfulClauses.length === 0) return [];
        return harmfulClauses.map((clause) => ({
            clause,
            snippet: extractClauseSnippet(viewData.description, clause),
        }));
    }, [harmfulClauses, viewData]);

    const highlightedContract = useMemo(() => {
        if (!viewData?.description) return [];
        return highlightContractText(viewData.description, harmfulClauses);
    }, [harmfulClauses, viewData]);

    if (loading) return <p className="text-sm py-8 text-center text-gray-500">Loading…</p>;
    if (error) return <p className="text-sm py-8 text-center text-red-600">{error}</p>;

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><FileText size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Analyzed Contracts</h1>
                        <p className="text-sm text-gray-500">Review uploaded contracts and their associated risk scores.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search contracts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F5F7FA] border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="p-4 pl-6">Contract Name</th>
                                <th className="p-4">Risk Level</th>
                                <th className="p-4">Risky Clauses Identified</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                    {contracts.length === 0 ? "No contracts yet. Analyze a contract to see it here." : "No contracts match your search."}
                                </td></tr>
                            ) : (
                                filtered.map((c) => (
                                    <tr key={c._id} className="hover:bg-[#F5F7FA]/50 transition-colors cursor-pointer group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <FileText className="text-gray-400" size={18} />
                                                <div>
                                                    <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{c._id.slice(-8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${c.riskScore >= 70 ? 'bg-red-500' : c.riskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${c.riskScore}%` }}
                                                    />
                                                </div>
                                                <span className={`px-2.5 py-1 text-xs font-bold border rounded-md ${getRiskColor(c.riskScore)}`}>
                                                    {c.riskScore}/100
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {c.sections && c.sections.length > 0 ? c.sections.map((s, i) => (
                                                    <span key={i} className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-semibold rounded border border-red-100 flex items-center gap-1">
                                                        <AlertTriangle size={10} /> {s.title || s.section_number || `Clause ${i + 1}`}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 pr-6">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleView(c._id, "full")}
                                                    disabled={viewLoadingId === c._id}
                                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#BDE8F5] text-[#1C4D8D] bg-[#F2FAFD] hover:bg-[#E7F5FB] disabled:opacity-60"
                                                >
                                                    {viewLoadingId === c._id && viewMode === "full" ? "Loading..." : "Full View"}
                                                </button>
                                                <button
                                                    onClick={() => handleView(c._id, "harmful")}
                                                    disabled={viewLoadingId === c._id}
                                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                                                >
                                                    Harmful Clauses
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c._id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewData ? (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[88vh] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-[#FBF8F1]">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#8D7A55]">
                                    {viewMode === "full" ? "Full Contract View" : "Harmful Clause View"}
                                </p>
                                <h3 className="text-base font-bold text-[#3d3220] mt-1 leading-snug">{viewData.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">Saved on {new Date(viewData.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("full")}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                        viewMode === "full"
                                            ? "border-[#0F2854] bg-[#0F2854] text-white"
                                            : "border-gray-200 bg-white text-[#0F2854]"
                                    }`}
                                >
                                    <Eye size={14} /> Full
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("harmful")}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                        viewMode === "harmful"
                                            ? "border-red-700 bg-red-700 text-white"
                                            : "border-red-200 bg-white text-red-700"
                                    }`}
                                >
                                    <Highlighter size={14} /> Harmful
                                </button>
                                <button
                                    onClick={() => setViewData(null)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                    aria-label="Close view"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto max-h-[calc(88vh-92px)]">
                            {viewMode === "full" ? (
                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-2">Saved Contract</h4>
                                        <div className="rounded-2xl border border-gray-200 bg-[#FFFEFB] p-4 text-sm text-gray-700 leading-7 whitespace-pre-wrap">
                                            {highlightedContract.length > 0 ? highlightedContract.map((segment, index) => (
                                                segment.highlighted ? (
                                                    <mark key={index} className="rounded bg-amber-200/80 px-1 py-0.5 text-[#5B3C00]">{segment.text}</mark>
                                                ) : (
                                                    <span key={index}>{segment.text}</span>
                                                )
                                            )) : (viewData.description || "-")}
                                        </div>
                                        {harmfulClauses.length > 0 ? <p className="mt-2 text-xs text-amber-700">Flagged wording is highlighted in the saved contract text.</p> : null}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-2">AI Contract Analysis</h4>
                                        <FormattedAiText text={viewData.aiAnswer || "No AI analysis available."} className="space-y-1" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-red-700 mb-2">Harmful Clauses</h4>
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
                                                            <p className="mt-2 text-sm leading-6 text-gray-700">{item.snippet || "This clause was flagged in the saved analysis, but an exact text match was not found in the stored contract excerpt."}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-700">
                                                No harmful clauses were saved for this contract.
                                            </div>
                                        )}
                                    </div>
                                    {viewData.aiAnswer ? (
                                        <div>
                                            <h4 className="text-sm font-bold uppercase tracking-wider text-[#0F2854] mb-2">AI Notes</h4>
                                            <FormattedAiText text={viewData.aiAnswer} className="space-y-1" />
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
