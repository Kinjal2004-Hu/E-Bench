"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, Flame, GraduationCap, Lock, PlayCircle, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { lessonOfTheDayId, microLessons, type LessonStatus } from "@/lib/microlearning-data";

const COMPLETED_KEY = "ebench_microlearning_completed_lessons";
const QUIZ_PROGRESS_KEY = "ebench_microlearning_quiz_progress";

const statusMeta: Record<
  LessonStatus,
  {
    label: string;
    className: string;
  }
> = {
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  "in-progress": { label: "In Progress", className: "bg-amber-50 text-amber-700" },
  locked: { label: "Locked", className: "bg-slate-100 text-slate-600" },
};

const difficultyMeta = {
  Beginner: "bg-[#F5F1EA] text-[#1C2333]",
  Intermediate: "bg-[#EDE7D9] text-[#1C2333]",
} as const;

function LessonCardIcon({ status }: { status: LessonStatus }) {
  if (status === "completed") {
    return <BookOpen className="h-5 w-5 text-emerald-700" />;
  }
  if (status === "locked") {
    return <Lock className="h-5 w-5 text-slate-500" />;
  }
  return <PlayCircle className="h-5 w-5 text-[#C49A10]" />;
}

export default function MicrolearningLibraryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [quizProgress, setQuizProgress] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    try {
      const completedRaw = localStorage.getItem(COMPLETED_KEY);
      const completed = completedRaw ? (JSON.parse(completedRaw) as string[]) : [];
      setCompletedIds(Array.isArray(completed) ? completed : []);

      const progressRaw = localStorage.getItem(QUIZ_PROGRESS_KEY);
      const progress = progressRaw ? (JSON.parse(progressRaw) as Record<string, Record<string, string>>) : {};
      setQuizProgress(progress && typeof progress === "object" ? progress : {});
    } catch {
      setCompletedIds([]);
      setQuizProgress({});
    }
  }, []);

  const lessonsWithProgress = useMemo(() => {
    return microLessons.map((lesson) => {
      const storedAnswers = quizProgress[lesson.id] || {};
      const answeredCount = Object.keys(storedAnswers).length;
      const quizPercent = Math.min(100, Math.round((answeredCount / 2) * 100));

      const isCompleted = lesson.status === "completed" || completedIds.includes(lesson.id);

      const progress = lesson.status === "locked"
        ? 0
        : isCompleted
          ? 100
          : quizPercent > 0
            ? quizPercent
            : lesson.status === "in-progress"
              ? 40
              : 0;

      const status: LessonStatus = lesson.status === "locked"
        ? "locked"
        : isCompleted
          ? "completed"
          : "in-progress";

      return {
        ...lesson,
        status,
        progress,
      };
    });
  }, [completedIds, quizProgress]);

  const completedLessons = lessonsWithProgress.filter((lesson) => lesson.status === "completed").length;
  const inProgressLessons = lessonsWithProgress.filter((lesson) => lesson.status === "in-progress").length;
  const totalLessons = lessonsWithProgress.length;
  const streakDays = 3;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  const lessonOfTheDay = lessonsWithProgress.find((lesson) => lesson.id === lessonOfTheDayId) || lessonsWithProgress[0];

  const filteredLessons = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return lessonsWithProgress;
    }

    return lessonsWithProgress.filter((lesson) => {
      const haystack = `${lesson.title} ${lesson.description} ${lesson.difficulty}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, lessonsWithProgress]);

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-[#1C2333]">Microlearning</h1>
          <p className="text-sm text-slate-600">Master important legal concepts in minutes.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-xl border p-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Lessons Completed</p>
                <p className="mt-1 text-2xl font-semibold text-[#1C2333]">{completedLessons}</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <BookOpen className="h-5 w-5 text-emerald-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border p-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Total Lessons</p>
                <p className="mt-1 text-2xl font-semibold text-[#1C2333]">{totalLessons}</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F1EA]">
                <GraduationCap className="h-5 w-5 text-[#1C2333]" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border p-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Current Streak</p>
                <p className="mt-1 text-2xl font-semibold text-[#1C2333]">{streakDays} days</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Flame className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border p-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Overall Progress</p>
                <p className="mt-1 text-2xl font-semibold text-[#1C2333]">{progressPercentage}%</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50">
                <BarChart3 className="h-5 w-5 text-sky-700" />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-xl border p-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
              <span>Progress</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <Progress value={progressPercentage} />
            <p className="text-xs text-slate-500">{inProgressLessons} lesson(s) currently in progress.</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border p-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5F1EA] text-[#1C2333]">
                <Sparkles className="h-3.5 w-3.5 text-[#C49A10]" />
                Lesson of the Day
              </Badge>
            </div>
            <CardTitle className="text-[#1C2333]">{lessonOfTheDay.title}</CardTitle>
            <CardDescription>{lessonOfTheDay.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5F1EA] text-[#1C2333]">{lessonOfTheDay.minutes} min</Badge>
              <Badge className={difficultyMeta[lessonOfTheDay.difficulty]}>{lessonOfTheDay.difficulty}</Badge>
            </div>
            <Button
              type="button"
              onClick={() => router.push(`/microlearning/${lessonOfTheDay.id}`)}
              className="rounded-lg px-4 py-2 font-medium bg-[#1C2333] text-white hover:opacity-90"
            >
              Start Lesson
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search legal lessons..."
              className="pl-10"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLessons.map((lesson) => {
              const status = statusMeta[lesson.status];
              const isLocked = lesson.status === "locked";

              return (
                <Card
                  key={lesson.id}
                  className="group rounded-xl border p-0 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F1EA]">
                        <LessonCardIcon status={lesson.status} />
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    <CardTitle className="text-[#1C2333] text-base">{lesson.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{lesson.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={difficultyMeta[lesson.difficulty]}>{lesson.difficulty}</Badge>
                      <Badge className="bg-[#F5F1EA] text-[#1C2333]">{lesson.minutes} min</Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Course Progress</span>
                        <span>{lesson.progress}%</span>
                      </div>
                      <Progress value={lesson.progress} />
                    </div>

                    <Button
                      type="button"
                      onClick={() => router.push(`/microlearning/${lesson.id}`)}
                      variant={isLocked ? "secondary" : "outline"}
                      className="w-full rounded-lg sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
                      disabled={isLocked}
                    >
                      {isLocked ? "Locked" : lesson.progress > 0 && lesson.progress < 100 ? "Resume Lesson" : lesson.progress === 100 ? "Review Lesson" : "Start Lesson"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
