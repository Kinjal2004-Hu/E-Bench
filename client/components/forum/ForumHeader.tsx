"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForumHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Community Forum</h1>
      <p className="mt-2 text-sm text-slate-600">Ask legal questions and learn from the legal community.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search discussions, topics, or tags"
            className="pl-10"
          />
        </label>

        <Link
          href="/community/ask"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Ask Question
        </Link>
      </div>
      </CardContent>
    </Card>
  );
}
