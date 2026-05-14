"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, CheckCircle2, HelpCircle, Lightbulb, Loader2, Scale, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { microLessonTopics } from "@/lib/microlearning-data";
import { fetchGeneratedLesson, fetchLearningProgress, saveLessonProgress, saveQuizProgress } from "@/lib/userApi";
import type { GeneratedLesson } from "@/lib/userApi";

const COMPLETED_KEY = "ebench_microlearning_completed_lessons";
const QUIZ_PROGRESS_KEY = "ebench_microlearning_quiz_progress";
const PASS_THRESHOLD = 3;

export default function MicrolearningLessonPage() {
  const router = useRouter();
  const ragBaseUrl = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000";
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [lessonError, setLessonError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [completionMsg, setCompletionMsg] = useState("");

  const topic = useMemo(() => microLessonTopics.find((t) => t.id === lessonId), [lessonId]);

  useEffect(() => {
    if (!topic || !lessonId) return;
    let active = true;
    setLessonLoading(true);

    fetchGeneratedLesson(lessonId, topic.title, topic.description)
      .then((data) => { if (active) setLesson(data); })
      .catch((err: Error) => { if (active) setLessonError(err.message); })
      .finally(() => { if (active) setLessonLoading(false); });

    return () => { active = false; };
  }, [topic, lessonId]);

  const quizQuestions = lesson?.quiz || [];

  const score = useMemo(() => {
    return quizQuestions.reduce((acc, q) => (answers[q.id] === q.correctOptionId ? acc + 1 : acc), 0);
  }, [answers, quizQuestions]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allQuestionsAnswered = answeredCount === quizQuestions.length;
  const passed = submitted && score >= PASS_THRESHOLD;

  useEffect(() => {
    if (!lessonId) return;
    const loadProgress = async () => {
      try {
        const backend = await fetchLearningProgress();
        const bl = (backend.lessons || []).find(l => l.lessonId === lessonId);
        if (bl) {
          if (bl.completed) setCompleted(true);
          if (bl.quizAnswers?.length) {
            const restored: Record<string, string> = {};
            for (const qa of bl.quizAnswers) restored[qa.questionId] = qa.selectedOption;
            if (Object.keys(restored).length > 0) {
              setAnswers(restored);
              if (bl.completed) setSubmitted(true);
              try {
                const p = JSON.parse(localStorage.getItem(QUIZ_PROGRESS_KEY) || "{}");
                p[lessonId] = restored;
                localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(p));
              } catch { }
              return;
            }
          }
        }
      } catch { }
      try {
        const p = JSON.parse(localStorage.getItem(QUIZ_PROGRESS_KEY) || "{}");
        const saved = p[lessonId] || {};
        setAnswers(saved);
        const cl = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]") as string[];
        setCompleted(cl.includes(lessonId));
      } catch { setAnswers({}); setCompleted(false); }
    };
    loadProgress();
  }, [lessonId]);

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    if (submitted || !lessonId) return;
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    try {
      const p = JSON.parse(localStorage.getItem(QUIZ_PROGRESS_KEY) || "{}");
      p[lessonId] = next;
      localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(p));
    } catch { }
  };

  const handleSubmit = () => { if (allQuestionsAnswered) setSubmitted(true); };
  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setCompleted(false);
    setCompletionMsg("");
    if (lessonId) {
      try {
        const p = JSON.parse(localStorage.getItem(QUIZ_PROGRESS_KEY) || "{}");
        delete p[lessonId];
        localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(p));
      } catch { }
    }
  };

  const markCourseCompleted = () => {
    if (!lesson || !submitted || !passed || !lessonId) return;
    try {
      const cl = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]") as string[];
      if (!cl.includes(lessonId)) { cl.push(lessonId); localStorage.setItem(COMPLETED_KEY, JSON.stringify(cl)); }
      setCompleted(true);
      setCompletionMsg("Course marked as completed.");
    } catch { setCompletionMsg("Course completion saved."); setCompleted(true); }

    saveLessonProgress({ lessonId, lessonTitle: lesson.title, source: "rag" }).catch(() => {});
    const qe = quizQuestions.map((q) => ({
      questionId: q.id, selectedOption: answers[q.id] || "", correct: answers[q.id] === q.correctOptionId,
    }));
    saveQuizProgress({ lessonId, lessonTitle: lesson.title, answers: qe, score, total: quizQuestions.length, source: "rag" }).catch(() => {});
  };

  const callMicrolearningAi = useCallback(async (question: string) => {
    if (!lesson) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await fetch(`${ragBaseUrl}/microlearning/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, lesson_title: lesson.title, law_text: lesson.law_text, question, top_k: 5 }),
      });
      if (!r.ok) throw new Error("AI request failed");
      const j = await r.json() as { ai_answer: string; case_studies: any[]; supporting_sections: any[] };
      setAiAnswer(j.ai_answer || "");
      setCaseStudies(Array.isArray(j.case_studies) ? j.case_studies : []);
      setSupportingSections(Array.isArray(j.supporting_sections) ? j.supporting_sections : []);
    } catch { setAiError("Unable to fetch AI response right now."); } finally { setAiLoading(false); }
  }, [lesson, lessonId, ragBaseUrl]);

  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [supportingSections, setSupportingSections] = useState<any[]>([]);

  const handleSimplify = () => { callMicrolearningAi(`Explain ${lesson?.title} in very simple language with 5 short bullet points and one practical caution.`); };
  const handleAskAi = () => { callMicrolearningAi(questionInput.trim() || `Give practical guidance for ${lesson?.title} with next legal steps.`); };

  if (lessonLoading) {
    return (
      <div className="min-h-screen bg-[#EDE8DF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#C49A10]" />
          <p className="text-sm text-slate-600">Generating lesson content...</p>
        </div>
      </div>
    );
  }

  if (lessonError) {
    return (
      <div className="min-h-screen bg-[#EDE8DF]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card className="rounded-xl border p-0 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h1 className="text-xl font-semibold text-[#1C2333]">Lesson unavailable</h1>
              <p className="text-sm text-red-600">{lessonError}</p>
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/microlearning")}>Back to Library</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#EDE8DF]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card className="rounded-xl border p-0 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h1 className="text-xl font-semibold text-[#1C2333]">Lesson not found</h1>
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/microlearning")}>Back to Library</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/microlearning")}>
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Button>

        <Card className="rounded-xl border p-0 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5F1EA] text-[#1C2333]">{lesson.minutes} min</Badge>
              <Badge className="bg-[#EDE7D9] text-[#1C2333]">{lesson.difficulty}</Badge>
            </div>
            <CardTitle className="text-[#1C2333]">{lesson.title}</CardTitle>
            <CardDescription>{lesson.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs defaultValue="lesson" className="space-y-5">
              <TabsList>
                <TabsTrigger value="lesson">Lesson</TabsTrigger>
                <TabsTrigger value="quiz">Quick Quiz ({quizQuestions.length} questions)</TabsTrigger>
              </TabsList>

              <TabsContent value="lesson" className="space-y-6">
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#1C2333]">Law / Section</h2>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 border-l-4 border-l-[#C49A10]">
                    <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{lesson.law_text}</p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-semibold text-[#1C2333]">What this means</h2>
                  <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{lesson.simple_explanation}</p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#1C2333]">Important Case</h2>
                  <Card className="rounded-xl border p-0 bg-white">
                    <CardContent className="p-4 space-y-2">
                      <Badge className="bg-[#F5F1EA] text-[#1C2333]">Landmark Case</Badge>
                      <p className="text-sm font-semibold text-[#1C2333]">{lesson.important_case.case_name}</p>
                      <p className="text-sm text-slate-700">{lesson.important_case.principle}</p>
                    </CardContent>
                  </Card>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#1C2333]">Scenario</h2>
                  <Card className="rounded-xl border p-0 bg-slate-50">
                    <CardContent className="p-4 space-y-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F1EA] text-[#1C2333]">
                        <Lightbulb className="h-4 w-4 text-[#C49A10]" />
                      </div>
                      <p className="text-sm text-slate-700">{lesson.scenario.prompt}</p>
                      <p className="text-sm font-medium text-[#1C2333]">{lesson.scenario.question}</p>
                    </CardContent>
                  </Card>
                </section>

                {lesson.supporting_sections?.length > 0 && (
                  <section className="space-y-2">
                    <h2 className="text-base font-semibold text-[#1C2333]">Legal Sources</h2>
                    <div className="space-y-2">
                      {lesson.supporting_sections.slice(0, 3).map((s, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                          <strong>{s.document} Section {s.section_number}:</strong> {s.title}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="quiz" className="space-y-4">
                <Card className={`rounded-xl border p-0 ${submitted ? (passed ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300") : "bg-slate-50"}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-[#1C2333]">
                        <BookOpen className="h-4 w-4 text-[#C49A10]" />
                        {submitted ? "Your Score" : "Quiz Progress"}
                      </div>
                      <div className="text-sm font-semibold text-[#1C2333]">
                        {submitted ? (
                          <span className="flex items-center gap-1.5">
                            {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                            {score} / {quizQuestions.length}
                          </span>
                        ) : <>{answeredCount}/{quizQuestions.length} answered</>}
                      </div>
                    </div>
                    <Progress value={submitted ? (score / Math.max(quizQuestions.length, 1)) * 100 : (answeredCount / Math.max(quizQuestions.length, 1)) * 100} />
                    {submitted ? (
                      <div className="text-center">
                        {passed ? (
                          <p className="text-emerald-700 font-semibold text-sm flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Passed! — Minimum {PASS_THRESHOLD}/{quizQuestions.length} required
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-rose-700 font-semibold text-sm flex items-center justify-center gap-1">
                              <XCircle className="h-4 w-4" /> Not passed ({score}/{quizQuestions.length}) — Minimum {PASS_THRESHOLD}/{quizQuestions.length} required
                            </p>
                            <Button type="button" variant="outline" onClick={handleRetry} className="rounded-lg text-sm">Retry Quiz</Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {!submitted ? (
                        <Button type="button" onClick={handleSubmit} disabled={!allQuestionsAnswered}
                          className="rounded-lg px-4 py-2 font-medium bg-[#1C2333] text-white hover:opacity-90 disabled:opacity-60">Submit Quiz</Button>
                      ) : null}
                      {submitted && passed && !completed ? (
                        <Button type="button" onClick={markCourseCompleted}
                          className="rounded-lg px-4 py-2 font-medium bg-emerald-700 text-white hover:opacity-90">
                          <CheckCircle2 className="h-4 w-4" /> Mark Course as Completed</Button>
                      ) : null}
                      {completed ? <span className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Completed</span> : null}
                      {submitted && !allQuestionsAnswered ? <p className="text-xs text-slate-600">Answer all questions before submitting.</p> : null}
                      {!submitted && allQuestionsAnswered ? <p className="text-xs text-slate-600">All answered. Click Submit to check.</p> : null}
                      {completionMsg ? <p className="text-xs text-emerald-700">{completionMsg}</p> : null}
                    </div>
                  </CardContent>
                </Card>

                {quizQuestions.map((q) => {
                  const selected = answers[q.id];
                  const answered = Boolean(selected);
                  const correct = selected === q.correctOptionId;
                  return (
                    <Card key={q.id} className="rounded-xl border p-0">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="mt-0.5 h-4 w-4 text-[#C49A10]" />
                          <p className="text-sm font-medium text-[#1C2333]">{q.question}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {q.options.map((o) => {
                            let style = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                            if (submitted) {
                              if (o.id === q.correctOptionId) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
                              else if (selected === o.id && !correct) style = "border-rose-300 bg-rose-50 text-rose-800";
                              else style = "border-slate-200 bg-white text-slate-500";
                            } else if (selected === o.id) style = "border-[#C49A10] bg-[#F5F1EA] text-[#1C2333]";
                            return (
                              <button key={o.id} type="button" onClick={() => handleSelectAnswer(q.id, o.id)} disabled={submitted}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${style}`}>{o.label}</button>
                            );
                          })}
                        </div>
                        {answered && submitted ? (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                            <p className={`font-semibold ${correct ? "text-emerald-700" : "text-rose-700"}`}>{correct ? "✓ Correct" : "✗ Incorrect"}</p>
                            <p className="mt-1 text-slate-700">{q.explanation}</p>
                          </div>
                        ) : null}
                        {answered && !submitted ? (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">Answer saved. Submit to check.</div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="button" onClick={handleSimplify} disabled={aiLoading}
                className="rounded-lg px-4 py-2 font-medium bg-[#1C2333] text-white hover:opacity-90">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                Explain in Simpler Words
              </Button>
              <Button type="button" variant="outline" onClick={handleAskAi} disabled={aiLoading} className="rounded-lg px-4 py-2 font-medium">
                <Scale className="h-4 w-4 text-[#C49A10]" /> Ask AI about this law
              </Button>
            </div>

            <div className="space-y-3">
              <Input value={questionInput} onChange={(e) => setQuestionInput(e.target.value)} placeholder="Ask a microlearning query for this lesson..." />
              {aiError ? <p className="text-sm text-rose-600">{aiError}</p> : null}
              {aiAnswer ? (
                <Card className="rounded-xl border p-0 bg-slate-50">
                  <CardHeader><CardTitle className="text-base text-[#1C2333]">AI Lesson Guidance</CardTitle></CardHeader>
                  <CardContent className="pt-0"><p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{aiAnswer}</p></CardContent>
                </Card>
              ) : null}
              {caseStudies.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[#1C2333]">Case Studies</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {caseStudies.map((item: any) => (
                      <Card key={item.title} className="rounded-xl border p-0">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm font-semibold text-[#1C2333]">{item.title}</p>
                          <p className="text-xs text-slate-600">{item.facts}</p>
                          <p className="text-xs text-slate-700"><span className="font-semibold">Issue:</span> {item.legal_issue}</p>
                          <p className="text-xs text-slate-700"><span className="font-semibold">Learning:</span> {item.key_learning}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
              {supportingSections.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-[#1C2333]">Supporting Sections</h3>
                  <div className="space-y-2">
                    {supportingSections.slice(0, 3).map((s: any, i: number) => (
                      <Card key={i} className="rounded-xl border p-0">
                        <CardContent className="p-3">
                          <p className="text-xs font-semibold text-[#1C2333]">{s.document} Section {s.section_number}: {s.title}</p>
                          <p className="mt-1 text-xs text-slate-600 line-clamp-3">{s.snippet}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
