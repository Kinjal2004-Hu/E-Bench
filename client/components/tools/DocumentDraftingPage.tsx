"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, FileText, Download, Eye, RefreshCw,
  CheckCircle, ArrowLeft, ArrowRight, Check, AlertCircle, FileSignature,
  House, Scale, Scroll, FilePen, Sparkles,
} from "lucide-react";
import {
  CATEGORIES,
  getTemplateForCategory,
  generateStyledLegalPdf,
  type DraftSession,
  type DocCategory,
  type DraftQuestion,
} from "@/lib/documentDrafting";

const THEME_COLOR = "#C8B48A";
const THEME_DARK = "#8D7A55";
const THEME_SOFT = "#F6F0E4";
const THEME_BORDER = "#E7D9BE";
const THEME_PANEL = "#FBF8F2";

const CATEGORY_ICONS: Record<DocCategory, typeof House> = {
  tenant: House,
  legal_notice: Scale,
  affidavit: Scroll,
  rent_agreement: FileSignature,
  custom: FilePen,
};

function InputField({ q, value, onChange, onKeyDown }: {
  q: DraftQuestion;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: `1.5px solid ${THEME_BORDER}`,
    backgroundColor: "#fff",
    fontSize: 14,
    outline: "none",
    fontFamily: "Inter, sans-serif",
    transition: "border-color 0.2s",
  };

  if (q.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={q.placeholder}
        rows={4}
        style={{ ...baseStyle, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
      />
    );
  }

  if (q.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...baseStyle, cursor: "pointer", appearance: "auto" }}
      >
        <option value="">Select...</option>
        {(q.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (q.type === "yesno") {
    return (
      <div style={{ display: "flex", gap: 12 }}>
        {["Yes", "No"].map((opt) => {
          const active = value === opt.toLowerCase();
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt.toLowerCase())}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 12,
                border: `2px solid ${active ? THEME_COLOR : THEME_BORDER}`,
                background: active ? THEME_SOFT : "#fff",
                color: active ? THEME_DARK : "#666",
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{ ...baseStyle, cursor: "pointer" }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={q.placeholder}
      style={baseStyle}
    />
  );
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

export default function DocumentDraftingPage() {
  const [session, setSession] = useState<DraftSession>({
    category: null,
    answers: {},
    currentStep: 0,
    phase: "select",
  });
  const [generatedText, setGeneratedText] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState("");
  const [showOnline, setShowOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const answersRef = useRef<HTMLDivElement>(null);

  // Scroll to top when step changes
  useEffect(() => {
    answersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [session.currentStep]);

  function selectCategory(cat: DocCategory) {
    setSession({ category: cat, answers: {}, currentStep: 0, phase: "interview" });
    setGeneratedText("");
    setPdfBlobUrl("");
    setShowOnline(false);
  }

  function getTemplate() {
    if (!session.category) return null;
    return getTemplateForCategory(session.category);
  }

  function getCurrentQuestion(): DraftQuestion | null {
    const tpl = getTemplate();
    if (!tpl) return null;
    return tpl.questions[session.currentStep] || null;
  }

  function updateAnswer(id: string, value: string) {
    setSession((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: value },
    }));
  }

  function nextStep() {
    const tpl = getTemplate();
    if (!tpl) return;
    const q = tpl.questions[session.currentStep];
    if (q?.required && !session.answers[q.id]?.trim()) return;

    if (session.currentStep < tpl.questions.length - 1) {
      setSession((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else {
      // Generate the document
      setLoading(true);
      // Small delay to show loading state
      setTimeout(() => {
        const text = tpl.generate(session.answers);
        setGeneratedText(text);
        setSession((prev) => ({ ...prev, phase: "preview" }));
        setLoading(false);
      }, 300);
    }
  }

  function prevStep() {
    if (session.currentStep > 0) {
      setSession((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  }

  function skipToEnd() {
    const tpl = getTemplate();
    if (!tpl) return;
    // Fill required fields with placeholder values
    const filled = { ...session.answers };
    for (const q of tpl.questions) {
      if (q.required && !filled[q.id]?.trim()) {
        filled[q.id] = q.type === "select" ? (q.options?.[0] || "[Required]") : "[Required]";
      }
    }
    setSession((prev) => ({ ...prev, answers: filled }));
    const text = tpl.generate(filled);
    setGeneratedText(text);
    setSession((prev) => ({ ...prev, phase: "preview" }));
    setLoading(false);
  }

  function handleGeneratePdf() {
    const tpl = getTemplate();
    if (!tpl) return;
    const title = tpl.label;
    const fileName = `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const url = generateStyledLegalPdf(fileName, title, generatedText, tpl.legalRefs, tpl.category);
    setPdfBlobUrl(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleViewOnline() {
    handleGeneratePdf();
    setShowOnline(true);
  }

  function handleNewDocument() {
    setSession({ category: null, answers: {}, currentStep: 0, phase: "select" });
    setGeneratedText("");
    setPdfBlobUrl("");
    setShowOnline(false);
  }

  function handleEdit() {
    setSession((prev) => ({ ...prev, phase: "interview", currentStep: 0 }));
    setPdfBlobUrl("");
    setShowOnline(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      nextStep();
    }
  }

  // ── Phase 1: Select Category ──
  if (session.phase === "select") {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ backgroundColor: THEME_COLOR }}>
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-[15px]">Legal Document Drafting</h1>
            <p className="text-[10px] text-white/80 mt-0.5">Select a document type to get started</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6" style={{ backgroundColor: THEME_PANEL }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg" style={{ background: `linear-gradient(135deg, ${THEME_DARK}, ${THEME_COLOR})` }}>
                <FileSignature size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: THEME_DARK }}>
                What would you like to draft?
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 max-w-lg mx-auto">
                Choose a document type below. I&apos;ll walk you through a few simple questions and generate a professionally formatted legal document.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES.map(({ category, label, description, icon }) => {
                const Icon = CATEGORY_ICONS[category];
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => selectCategory(category)}
                    className="flex items-start gap-4 p-5 rounded-xl bg-white border hover:shadow-md transition-all group text-left"
                    style={{ borderColor: THEME_BORDER }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: THEME_SOFT }}>
                      <Icon size={20} style={{ color: THEME_DARK }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm" style={{ color: THEME_DARK }}>{label}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tpl = getTemplate();
  const q = getCurrentQuestion();
  const progress = tpl ? Math.round(((session.currentStep + 1) / tpl.questions.length) * 100) : 0;
  const isLast = tpl ? session.currentStep >= tpl.questions.length - 1 : false;

  // ── Phase 2: Interview ──
  if (session.phase === "interview" && tpl && q) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ backgroundColor: THEME_COLOR }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-[15px]">{tpl.label}</h1>
              <p className="text-[10px] text-white/80 mt-0.5">Step {session.currentStep + 1} of {tpl.questions.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={skipToEnd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            Skip to Preview
          </button>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 h-1.5 bg-gray-100">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, backgroundColor: THEME_COLOR }}
          />
        </div>

        {/* Question Area */}
        <div ref={answersRef} className="flex-1 overflow-y-auto min-h-0" style={{ backgroundColor: THEME_PANEL }}>
          <div className="max-w-2xl mx-auto p-6 md:p-10">
            {/* AI Avatar + Question */}
            <div className="flex gap-4 mb-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${THEME_DARK}, ${THEME_COLOR})` }}
              >
                AI
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl rounded-tl-sm border px-5 py-4 shadow-sm" style={{ borderColor: THEME_BORDER }}>
                  <p className="text-sm font-medium" style={{ color: THEME_DARK }}>{q.label}</p>
                  {q.hint && (
                    <p className="text-xs text-gray-400 mt-1.5">{q.hint}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="pl-14">
              <InputField
                q={q}
                value={session.answers[q.id] || ""}
                onChange={(v) => updateAnswer(q.id, v)}
                onKeyDown={handleKeyDown}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={session.currentStep === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  style={{ color: THEME_DARK, border: `1.5px solid ${THEME_BORDER}`, background: "#fff" }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {q.required ? "Required" : "Optional"}
                  </span>
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={q.required && !session.answers[q.id]?.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    {isLast ? "Generate Document" : "Next"}
                    {isLast ? <Check size={14} /> : <ArrowRight size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Answer Summary */}
            {Object.keys(session.answers).length > 0 && (
              <div className="mt-10 pt-6 border-t" style={{ borderColor: THEME_BORDER }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: THEME_DARK }}>
                  Your answers so far
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tpl.questions.slice(0, session.currentStep + 1).map((question) => {
                    const val = session.answers[question.id];
                    if (!val?.trim()) return null;
                    const display = question.type === "date" ? formatDateShort(val) : val;
                    return (
                      <div
                        key={question.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: THEME_SOFT }}
                      >
                        <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: THEME_COLOR }} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium truncate" style={{ color: THEME_DARK }}>{question.label}</p>
                          <p className="text-xs text-gray-600 truncate">{display}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 3: Preview ──
  if (session.phase === "preview" && tpl) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ backgroundColor: THEME_COLOR }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <CheckCircle size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-[15px]">{tpl.label}</h1>
              <p className="text-[10px] text-white/80 mt-0.5">Document ready for review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleNewDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <RefreshCw size={12} /> New Document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0" style={{ backgroundColor: THEME_PANEL }}>
          <div className="max-w-4xl mx-auto p-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-5 border-b" style={{ borderColor: THEME_BORDER }}>
              <button
                type="button"
                onClick={handleViewOnline}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
                style={{ backgroundColor: THEME_COLOR }}
              >
                <Eye size={15} /> View Online
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                style={{ color: THEME_DARK, border: `2px solid ${THEME_COLOR}`, backgroundColor: "#fff" }}
              >
                <Download size={15} /> Download PDF
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: "#666", border: `1.5px solid ${THEME_BORDER}`, backgroundColor: "#fff" }}
              >
                <FilePen size={14} /> Edit Answers
              </button>
            </div>

            {/* Online PDF Viewer */}
            {showOnline && pdfBlobUrl && (
              <div className="mb-6 rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: THEME_BORDER }}>
                <iframe
                  src={pdfBlobUrl}
                  className="w-full"
                  style={{ height: 500, border: "none" }}
                  title="Document Preview"
                />
              </div>
            )}

            {/* Document Preview */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: THEME_BORDER }}>
              {/* Letterhead */}
              <div className="px-8 pt-8 pb-3 text-center border-b" style={{ borderColor: THEME_BORDER }}>
                <div style={{ width: 40, height: 3, backgroundColor: THEME_COLOR, margin: "0 auto 10px" }} />
                <h2 className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Playfair Display', serif", color: THEME_DARK }}>
                  E-BENCH
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Digital Justice Platform — Legal Document</p>
                <div style={{ width: "100%", height: 1, backgroundColor: THEME_BORDER, marginTop: 12 }} />
              </div>

              {/* Document Body */}
              <div className="px-8 py-6">
                <pre
                  className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
                  style={{ color: "#333", fontFamily: "'Inter', sans-serif", lineHeight: 1.7 }}
                >
                  {generatedText}
                </pre>
              </div>

              {/* References */}
              {tpl.legalRefs && tpl.legalRefs.length > 0 && (
                <div className="px-8 pb-6 pt-3 border-t" style={{ borderColor: THEME_BORDER }}>
                  <div style={{ width: "100%", height: 1, backgroundColor: THEME_COLOR, marginBottom: 12 }} />
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: THEME_DARK }}>
                    Legal References
                  </p>
                  <ul className="space-y-1">
                    {tpl.legalRefs.map((ref, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-gray-500">
                        <span className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: THEME_COLOR }} />
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="px-8 py-3 text-center text-[9px] italic text-gray-300 border-t" style={{ borderColor: THEME_BORDER }}>
                Generated by E-Bench Digital Justice Platform · This is a draft document and does not constitute legal advice.
              </div>
            </div>

            {/* Download again at bottom */}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                style={{ color: THEME_DARK, border: `2px solid ${THEME_COLOR}`, backgroundColor: "#fff" }}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback / Loading
  return (
    <div className="flex items-center justify-center h-full" style={{ backgroundColor: THEME_PANEL }}>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME_COLOR, borderTopColor: "transparent" }} />
        Preparing document...
      </div>
    </div>
  );
}
