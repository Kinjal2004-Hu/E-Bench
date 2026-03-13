import Link from "next/link";
import { ArrowUp, CheckCircle2, MessageCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForumPost } from "@/lib/forum-data";
import { Badge } from "@/components/ui/badge";

export default function PostCard({ post, compact = false }: { post: ForumPost; compact?: boolean }) {
  return (
    <Link
      href={`/community/post/${post.id}`}
      className={cn(
        "block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        compact && "p-4"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{post.category}</Badge>
        {post.solved ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Solved
          </Badge>
        ) : null}
      </div>

      <h3 className={cn("mt-3 font-semibold text-slate-900", compact ? "text-base" : "text-lg")}>{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{post.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.replies} replies
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="h-3.5 w-3.5" />
          {post.upvotes} upvotes
        </span>
        <span>{post.timestamp}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {post.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
            <Tag className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
