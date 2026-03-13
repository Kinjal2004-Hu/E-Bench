import { ArrowBigUp, BadgeCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForumReply } from "@/lib/forum-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReplyCard({ reply }: { reply: ForumReply }) {
  const isLawyer = reply.role === "lawyer";

  return (
    <article
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        reply.isBestAnswer ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
            {reply.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{reply.user}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{reply.timestamp}</span>
              {isLawyer ? (
                <Badge>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified Legal Professional
                </Badge>
              ) : null}
              {reply.isBestAnswer ? (
                <Badge variant="success">
                  <Sparkles className="h-3.5 w-3.5" />
                  Best Answer
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
          <ArrowBigUp className="h-3.5 w-3.5" />
          {reply.upvotes}
        </Button>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">{reply.text}</p>
    </article>
  );
}
