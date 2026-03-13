"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, HelpCircle, Lightbulb, Loader2, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { microLessons } from "@/lib/microlearning-data";

type QuizOption = {
  id: string;
  label: string;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
};

const defaultQuiz: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which legal concept is the core focus of this lesson?",
    options: [
      { id: "a", label: "Tax filing compliance" },
      { id: "b", label: "Fundamental rights and legal procedure" },
      { id: "c", label: "International trade tariffs" },
      { id: "d", label: "Company share allotment" },
    ],
    correctOptionId: "b",
    explanation: "This lesson focuses on core legal rights/procedure concepts in practical scenarios.",
  },
  {
    id: "q2",
    question: "What is the best first action after identifying a potential rights violation?",
    options: [
      { id: "a", label: "Ignore and wait" },
      { id: "b", label: "Collect facts and seek legal remedy promptly" },
      { id: "c", label: "Share only on social media" },
      { id: "d", label: "Sign unrelated settlement immediately" },
    ],
    correctOptionId: "b",
    explanation: "Timely documentation and proper legal steps improve outcomes significantly.",
  },
];

export default function MicrolearningLessonPage() {
  const router = useRouter();
  const ragBaseUrl = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8000";
  const params = useParams<{ lessonId: string }>();
  const lessonId = params?.lessonId;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionInput, setQuestionInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [caseStudies, setCaseStudies] = useState<Array<{ title: string; facts: string; legal_issue: string; key_learning: string; related_sections: string[] }>>([]);
  const [supportingSections, setSupportingSections] = useState<Array<{ document: string; section_number: number; title: string; snippet: string }>>([]);

  const lesson = useMemo(() => microLessons.find((item) => item.id === lessonId), [lessonId]);

  const score = useMemo(() => {
    return defaultQuiz.reduce((acc, question) => {
      return answers[question.id] === question.correctOptionId ? acc + 1 : acc;
    }, 0);
  }, [answers]);

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const callMicrolearningAi = async (question: string) => {
    if (!lesson) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(`${ragBaseUrl}/microlearning/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          law_text: lesson.lawText,
          question,
          top_k: 5,
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const json = (await response.json()) as {
        ai_answer: string;
        case_studies: Array<{ title: string; facts: string; legal_issue: string; key_learning: string; related_sections: string[] }>;
        supporting_sections: Array<{ document: string; section_number: number; title: string; snippet: string }>;
      };

      setAiAnswer(json.ai_answer || "");
      setCaseStudies(Array.isArray(json.case_studies) ? json.case_studies : []);
      setSupportingSections(Array.isArray(json.supporting_sections) ? json.supporting_sections : []);
    } catch {
      setAiError("Unable to fetch AI response right now. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSimplify = () => {
    const prompt = `Explain ${lesson?.title} in very simple language with 5 short bullet points and one practical caution.`;
    callMicrolearningAi(prompt);
  };

  const handleAskAi = () => {
    const prompt = questionInput.trim() || `Give practical guidance for ${lesson?.title} with next legal steps.`;
    callMicrolearningAi(prompt);
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#EDE8DF]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card className="rounded-xl border p-0 shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h1 className="text-xl font-semibold text-[#1C2333]">Lesson not found</h1>
              <p className="text-sm text-slate-600">This lesson may have moved or is not available yet.</p>
              <Button type="button" variant="outline" className="rounded-lg" onClick={() => router.push("/microlearning")}>
                Back to Library
              </Button>
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
          <ArrowLeft className="h-4 w-4" />
          Back to Library
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
                <TabsTrigger value="quiz">Quick Quiz</TabsTrigger>
              </TabsList>

              <TabsContent value="lesson" className="space-y-6">
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#1C2333]">Law / Section</h2>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 border-l-4 border-l-[#C49A10]">
                    <p className="font-mono text-sm leading-7 text-slate-700">{lesson.lawText}</p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h2 className="text-base font-semibold text-[#1C2333]">What this means</h2>
                  <p className="text-sm leading-7 text-slate-700">{lesson.simpleExplanation}</p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#1C2333]">Important Case</h2>
                  <Card className="rounded-xl border p-0 bg-white">
                    <CardContent className="p-4 space-y-2">
                      <Badge className="bg-[#F5F1EA] text-[#1C2333]">Landmark Case</Badge>
                      <p className="text-sm font-semibold text-[#1C2333]">{lesson.importantCase.name}</p>
                      <p className="text-sm text-slate-700">{lesson.importantCase.summary}</p>
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
              </TabsContent>

              <TabsContent value="quiz" className="space-y-4">
                <Card className="rounded-xl border p-0 bg-slate-50">
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-sm text-[#1C2333]">
                      <BookOpen className="h-4 w-4 text-[#C49A10]" />
                      Quiz Score
                    </div>
                    <div className="text-sm font-semibold text-[#1C2333]">
                      {score} / {defaultQuiz.length} Correct
                    </div>
                  </CardContent>
                </Card>

                {defaultQuiz.map((question) => {
                  const selectedOptionId = answers[question.id];
                  const answered = Boolean(selectedOptionId);
                  const isCorrect = selectedOptionId === question.correctOptionId;

                  return (
                    <Card key={question.id} className="rounded-xl border p-0">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="mt-0.5 h-4 w-4 text-[#C49A10]" />
                          <p className="text-sm font-medium text-[#1C2333]">{question.question}</p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {question.options.map((option) => {
                            const selected = selectedOptionId === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectAnswer(question.id, option.id)}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${
                                  selected
                                    ? "border-[#C49A10] bg-[#F5F1EA] text-[#1C2333]"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>

                        {answered ? (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                            <p className={`font-semibold ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                              {isCorrect ? "Correct" : "Incorrect"}
                            </p>
                            <p className="mt-1 text-slate-700">{question.explanation}</p>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                onClick={handleSimplify}
                disabled={aiLoading}
                className="rounded-lg px-4 py-2 font-medium bg-[#1C2333] text-white hover:opacity-90"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                Explain in Simpler Words
              </Button>
              <Button type="button" variant="outline" onClick={handleAskAi} disabled={aiLoading} className="rounded-lg px-4 py-2 font-medium">
                <Scale className="h-4 w-4 text-[#C49A10]" />
                Ask AI about this law
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                value={questionInput}
                onChange={(event) => setQuestionInput(event.target.value)}
                placeholder="Ask a microlearning query for this lesson..."
              />

              {aiError ? <p className="text-sm text-rose-600">{aiError}</p> : null}

              {aiAnswer ? (
                <Card className="rounded-xl border p-0 bg-slate-50">
                  <CardHeader>
                    <CardTitle className="text-base text-[#1C2333]">AI Lesson Guidance</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{aiAnswer}</p>
                  </CardContent>
                </Card>
              ) : null}

              {caseStudies.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[#1C2333]">Case Studies</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {caseStudies.map((item) => (
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
                    {supportingSections.slice(0, 3).map((section, index) => (
                      <Card key={`${section.document}-${section.section_number}-${index}`} className="rounded-xl border p-0">
                        <CardContent className="p-3">
                          <p className="text-xs font-semibold text-[#1C2333]">
                            {section.document} Section {section.section_number}: {section.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-600 line-clamp-3">{section.snippet}</p>
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
