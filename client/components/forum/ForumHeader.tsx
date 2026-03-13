"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export default function ForumHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h1 className="text-3xl font-bold text-[#1C2333]">Community Forum</h1>
      <p className="mt-1 text-[#555]">Ask legal questions and learn from the legal community.</p>

      <div className="mt-4 flex items-center gap-3">
        <label className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search discussions, topics, or tags"
            className="w-full rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] px-4 py-2 pl-10 text-sm text-[#333] outline-none focus:ring-2 focus:ring-[#C49A10]"
          />
        </label>

        <Link
          href="/community/ask"
          className="inline-flex items-center justify-center rounded-lg bg-[#C49A10] px-4 py-2 font-medium text-white transition hover:opacity-90"
        >
          Ask Question
        </Link>
      </div>
    </section>
  );
}
