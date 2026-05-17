"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FormattedAiText from "@/components/FormattedAiText";
import {
  ArrowLeft, BookOpen, Brain, CheckCircle2, Gavel, HelpCircle,
  Landmark, Lightbulb, Loader2, Scale, Sparkles, X,
} from "lucide-react";
import {
  fetchNewsToLesson,
  getStoredNewsItem,
  saveLessonProgress,
  saveQuizProgress,
  type NewsToLessonResponse,
} from "@/lib/userApi";

export default function NewsDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const newsId = params?.id || "";

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("General");
  const [paramsReady, setParamsReady] = useState(false);

  useEffect(() => {
    const stored = getStoredNewsItem(newsId);
    if (stored) {
      setHeadline(stored.headline);
      setSummary(stored.summary);
      setCategory(stored.category);
      setParamsReady(true);
      return;
    }

    const h = searchParams?.get("headline");
    const s = searchParams?.get("summary");
    const c = searchParams?.get("category");
    if (h) setHeadline(h);
    if (s) setSummary(s);
    if (c) setCategory(c);
    setParamsReady(true);
  }, [newsId, searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lesson, setLesson] = useState<NewsToLessonResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"explain" | "sections" | "lesson" | "quiz">("explain");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!paramsReady || !newsId || !headline) return;
    let active = true;
    setLoading(true);
    fetchNewsToLesson({ news_id: newsId, headline, summary, category })
      .then((data) => { if (active) { setLesson(data); setError(""); } })
      .catch((err: Error) => { if (active) setError(err.message || "Failed to analyze news."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [paramsReady, newsId, headline, summary, category]);

  const handleSelectAnswer = (qIdx: number, option: string) => {
    setQuizAnswers(prev => ({ ...prev, [`q${qIdx}`]: option }));
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;
    try {
      await saveLessonProgress({
        lessonId: `news_${newsId}`,
        lessonTitle: lesson.lesson_title,
        source: "news",
      });
      const quizEntries = (lesson.lesson_quiz || []).map((q: any, i: number) => ({
        questionId: `q${i}`,
        selectedOption: quizAnswers[`q${i}`] || "",
        correct: (quizAnswers[`q${i}`] || "").startsWith((q.correct || "").charAt(0)),
      }));
      const correctCount = quizEntries.filter(e => e.correct).length;
      await saveQuizProgress({
        lessonId: `news_${newsId}`,
        lessonTitle: lesson.lesson_title,
        answers: quizEntries,
        score: correctCount,
        total: quizEntries.length,
        source: "news",
      });
      setCompleted(true);
      try {
        const STREAK_KEY = "ebench_streak";
        const stored = JSON.parse(localStorage.getItem(STREAK_KEY) || '{}');
        const today = new Date().toDateString();
        const lastActive = stored.lastActive || '';
        let current = stored.current || 0;
        if (lastActive !== today) {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          current = lastActive === yesterday ? (current || 0) + 1 : 1;
        }
        const longest = Math.max(current, stored.longest || 0);
        localStorage.setItem(STREAK_KEY, JSON.stringify({ current, longest, lastActive: today }));
      } catch { /* ignore */ }
    } catch { /* no-op */ }
  };

  if (!paramsReady) {
    return (
      <div className="min-h-screen bg-[#EDE8DF] flex items-center justify-center p-6">
        <Loader2 size={24} className="animate-spin text-[#C49A10]" />
      </div>
    );
  }

  if (!newsId || !headline) {
    return (
      <div className="min-h-screen bg-[#EDE8DF] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <p className="text-gray-600">No news article selected.</p>
          <button type="button" onClick={() => router.push("/free-tools/news")} className="mt-4 text-sm font-bold text-[#1C4D8D] underline">Back to News</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <button type="button" onClick={() => router.push("/free-tools/news")} className="flex items-center gap-2 text-sm font-bold text-[#1C4D8D] hover:underline">
          <ArrowLeft size={16} /> Back to News
        </button>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[#C49A10]" />
            <p className="text-gray-500 text-sm">Analyzing legal impact...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : lesson ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[#4988C4] uppercase tracking-widest mb-2">{lesson.legal_topic}</div>
              <h1 className="text-2xl font-bold text-[#0F2854] leading-snug mb-2">{lesson.headline}</h1>
              <p className="text-sm text-gray-600">{summary}</p>
              {completed && (
                <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm font-medium">
                  <CheckCircle2 size={16} /> Lesson completed
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "explain", label: "Explanation", icon: Brain },
                { key: "sections", label: "Legal Sections", icon: BookOpen },
                { key: "lesson", label: "Micro Lesson", icon: Lightbulb },
                { key: "quiz", label: "Quiz", icon: HelpCircle },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === key ? "bg-[#0F2854] text-white" : "bg-white text-[#0F2854] border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            {activeTab === "explain" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-bold text-[#0F2854]"><Brain size={20} /> Legal Explanation</div>
                <FormattedAiText text={lesson.explanation} />
              </div>
            )}

            {activeTab === "sections" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-lg font-bold text-[#0F2854]"><BookOpen size={20} /> Relevant Legal Sections</div>
                {lesson.sections.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-sm text-gray-500">No specific sections found.</div>
                ) : (
                  lesson.sections.map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#4988C4] uppercase tracking-widest mb-1">{s.document} · Section {s.section_number}</div>
                      <div className="text-sm font-bold text-[#0F2854] mb-1">{s.title}</div>
                      <p className="text-sm text-gray-600 leading-relaxed">{s.snippet}</p>
                    </div>
                  ))
                )}
                {lesson.case_references.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0F2854]"><Landmark size={16} /> Related Case References</div>
                    {lesson.case_references.map((ref, i) => (
                      <p key={i} className="text-sm text-gray-600">• {ref}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "lesson" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-bold text-[#0F2854]"><Lightbulb size={20} /> {lesson.lesson_title}</div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">The Law</div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lesson.lesson_law_text}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                  <div className="text-xs font-bold text-[#4988C4] uppercase tracking-widest mb-2">Simple Explanation</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{lesson.lesson_simple_explanation}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest mb-2"><Scale size={14} /> Real World Scenario</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{lesson.lesson_scenario}</p>
                </div>
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-bold text-[#0F2854]"><HelpCircle size={20} /> Quick Quiz</div>
                {(lesson.lesson_quiz || []).length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-sm text-gray-500">No quiz available.</div>
                ) : (
                  (lesson.lesson_quiz || []).map((q: any, qIdx: number) => (
                    <div key={qIdx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
                      <p className="text-sm font-bold text-[#0F2854]">{q.question || `Question ${qIdx + 1}`}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(q.options || []).map((opt: string, oIdx: number) => {
                          const selected = quizAnswers[`q${qIdx}`] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleSelectAnswer(qIdx, opt)}
                              className={`text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                                selected ? "border-[#C49A10] bg-[#F5F1EA] text-[#1C2333]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizAnswers[`q${qIdx}`] && (
                        <div className={`text-sm ${(quizAnswers[`q${qIdx}`] || "").startsWith((q.correct || "").charAt(0)) ? "text-emerald-700" : "text-rose-600"}`}>
                          {(quizAnswers[`q${qIdx}`] || "").startsWith((q.correct || "").charAt(0)) ? "✓ Correct" : `✗ Correct answer: ${q.correct}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={completed}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0F2854] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> {completed ? "Completed" : "Mark Lesson Complete"}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
