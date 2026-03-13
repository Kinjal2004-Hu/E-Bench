"use client";

import { Scale, Search, Trash2, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAnalyses, deleteAnalysis, saveAnalysis } from "@/lib/userApi";
import type { SavedAnalysis } from "@/lib/userApi";

const RAG_BASE = "http://localhost:8000";

interface IKSearchResult {
  doc_id: string;
  title: string;
  headline: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<SavedAnalysis[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");
  const [casesSearch, setCasesSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"my" | "search">("my");

  const [ikQuery, setIkQuery] = useState("");
  const [ikResults, setIkResults] = useState<IKSearchResult[]>([]);
  const [ikLoading, setIkLoading] = useState(false);
  const [ikError, setIkError] = useState("");
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [savedDocIds, setSavedDocIds] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState("");

  const loadCases = async () => {
    setCasesLoading(true);
    try {
      const data = await fetchAnalyses("case");
      setCases(data);
      setCasesError("");
    } catch (err: unknown) {
      setCasesError(err instanceof Error ? err.message : "Failed to load cases.");
    } finally {
      setCasesLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysis(id);
      setCases((prev) => prev.filter((c) => c._id !== id));
    } catch {
      // no-op
    }
  };

  const filteredCases = cases.filter((c) =>
    c.title.toLowerCase().includes(casesSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(casesSearch.toLowerCase())
  );

  const handleIkSearch = async () => {
    if (!ikQuery.trim()) return;
    setIkLoading(true);
    setIkError("");
    setStatusMsg("");
    try {
      const res = await fetch(`${RAG_BASE}/ik/search?q=${encodeURIComponent(ikQuery)}&max_results=10`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const results = data.results || [];
      setIkResults(results);
      if (results.length === 0) setIkError("No cases found. Try different keywords.");
    } catch {
      setIkError("Could not reach the RAG server. Make sure it is running on port 8000.");
    } finally {
      setIkLoading(false);
    }
  };

  const handleSaveKanoonCase = async (result: IKSearchResult) => {
    const title = (result.title || "").trim() || `Indian Kanoon Case ${result.doc_id}`;

    setSavingDocId(result.doc_id);
    setStatusMsg("");
    setIkError("");

    try {
      const summaryRes = await fetch(`${RAG_BASE}/ik/case/${result.doc_id}/summary`);
      if (!summaryRes.ok) {
        throw new Error("Failed to generate detailed summary. Please ensure RAG server is running with latest code and try again.");
      }

      const summaryData = await summaryRes.json();
      const detailedSummary = typeof summaryData?.summary === "string" ? summaryData.summary.trim() : "";

      // Reject low-information summaries so we don't save snippet-like text again.
      if (!detailedSummary || detailedSummary.length < 350) {
        throw new Error("Generated summary is too short. Please retry in a moment.");
      }

      const boundedDescription = detailedSummary.slice(0, 4900);

      await saveAnalysis({
        type: "case",
        title,
        description: boundedDescription,
        aiAnswer: detailedSummary,
        sections: [],
        userRights: [],
        legalSteps: [],
      });

      await saveAnalysis({
        type: "summary",
        title: `Summary: ${title}`,
        description: boundedDescription,
        aiAnswer: detailedSummary,
        sections: [],
        userRights: [],
        legalSteps: [],
      });

      setSavedDocIds((prev) => ({ ...prev, [result.doc_id]: true }));
      setStatusMsg("Case saved. Summary added to My Chats > Summary.");
      await loadCases();
      setActiveTab("my");
    } catch (err: unknown) {
      setIkError(err instanceof Error ? err.message : "Failed to save case.");
    } finally {
      setSavingDocId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Cases</h1>
            <p className="text-sm text-gray-500">Search Indian Kanoon and save cases directly.</p>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(["my", "search"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? "bg-white text-[#0F2854] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "my" ? "My Cases" : "Search Case Law"}
            </button>
          ))}
        </div>
      </div>

      {statusMsg ? <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">{statusMsg}</p> : null}

      {activeTab === "my" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search cases..."
                value={casesSearch}
                onChange={(e) => setCasesSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] outline-none"
              />
            </div>
          </div>

          {casesLoading ? (
            <p className="text-sm py-8 text-center text-gray-500">Loading...</p>
          ) : casesError ? (
            <p className="text-sm py-8 text-center text-red-600">{casesError}</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                      <th className="p-4 pl-6">Case Title</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                          {cases.length === 0 ? "No cases yet." : "No cases match your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredCases.map((c) => (
                        <tr key={c._id} className="hover:bg-[#F5F7FA]/50 transition-colors group">
                          <td className="p-4 pl-6">
                            <p className="font-semibold text-[#0F2854] group-hover:text-[#1C4D8D]">{c.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c._id.slice(-8).toUpperCase()}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-[#BDE8F5]/30 text-[#1C4D8D] text-xs font-semibold rounded-md border border-[#BDE8F5]">
                              Saved
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={c.description}>
                            {c.description || "-"}
                          </td>
                          <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 pr-6">
                            <button onClick={() => handleDelete(c._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search Indian Kanoon..."
                value={ikQuery}
                onChange={(e) => setIkQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIkSearch()}
                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#4988C4] focus:ring-2 focus:ring-[#4988C4]/20 outline-none shadow-sm"
              />
            </div>
            <button
              onClick={handleIkSearch}
              disabled={ikLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F2854] text-white rounded-xl text-sm font-medium hover:bg-[#1C4D8D] disabled:opacity-60 transition-colors shadow-sm"
            >
              {ikLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>

          {ikError ? <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{ikError}</p> : null}

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
            {ikResults.map((r) => {
              const saving = savingDocId === r.doc_id;
              const saved = !!savedDocIds[r.doc_id];
              return (
                <div key={r.doc_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Doc ID: {r.doc_id}</p>
                    <h3 className="text-sm font-semibold text-[#0F2854] leading-snug">{r.title || "Untitled case"}</h3>
                    {r.headline ? <p className="text-xs text-gray-500 mt-2 line-clamp-3">{r.headline}</p> : null}
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => handleSaveKanoonCase(r)}
                      disabled={saving || saved}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0F2854] text-white hover:bg-[#1C4D8D] disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saved ? "Saved" : "Save Case + Summary"}
                    </button>
                    <a
                      href={`https://indiankanoon.org/doc/${r.doc_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#1C4D8D] font-medium hover:underline"
                    >
                      Open on Kanoon
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
