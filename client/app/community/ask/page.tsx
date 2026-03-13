"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { forumCategories } from "@/lib/forum-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function AskQuestionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(forumCategories[0]?.name ?? "");
  const [tags, setTags] = useState("");
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${baseUrl}/api/forum/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: description,
          category,
          tags,
          author: "Community Member",
          authorRole: "member",
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not post your question");
      }

      const data = (await response.json()) as { _id: string };
      router.push(`/community/post/${data._id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not post your question");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ask a Legal Question</h1>
      <p className="mt-2 text-sm text-slate-600">
        Share your issue with enough context so the community and verified lawyers can provide practical guidance.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="question-title" className="text-sm font-medium text-slate-700">
            Question Title
          </label>
          <Input
            id="question-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Example: Is notice period mandatory in all employment contracts?"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="question-description" className="text-sm font-medium text-slate-700">
            Detailed Description
          </label>
          <Textarea
            id="question-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
            placeholder="Describe your situation, key dates, documents, and what help you need."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="question-category" className="text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="question-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {forumCategories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="question-tags" className="text-sm font-medium text-slate-700">
              Tags
            </label>
            <Input
              id="question-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Example: Bail, FIR, IPC"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="question-file" className="text-sm font-medium text-slate-700">
            Optional Document Attachment
          </label>

          <label
            htmlFor="question-file"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
          >
            <Paperclip className="h-4 w-4" />
            {fileName || "Upload supporting file (PDF, DOC, Image)"}
          </label>

          <input
            id="question-file"
            type="file"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Question"}
          </Button>

          <Link
            href="/community"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
