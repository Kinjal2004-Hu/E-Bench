import Link from "next/link";
import { ArrowUp, Bookmark, CheckCircle2, Eye, MessageCircle, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForumPost } from "@/lib/forum-data";
import { Badge } from "@/components/ui/badge";

export default function PostCard({ post, compact = false }: { post: ForumPost; compact?: boolean }) {
  return (
    <Link
      href={`/community/post/${post.id}`}
      className={cn(
        "block rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md",
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

      <h3 className={cn("mt-3 font-semibold text-[#1C2333]", compact ? "text-base" : "text-lg")}>{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#555]">{post.content}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C2333] text-[11px] font-semibold text-[#C49A10]">
            {post.authorAvatar}
          </div>
          <div>
            <p className="text-xs font-medium text-[#1C2333]">{post.author}</p>
            <p className="text-[11px] text-[#777]">{post.authorReputation} reputation</p>
          </div>
        </div>
        <button
          type="button"
          title="Save discussion"
          className="inline-flex items-center gap-1 rounded-md border border-[#E2DAC8] px-2 py-1 text-[11px] text-[#555] transition hover:bg-[#F5F1EA]"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#777]">
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.replies} replies
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {post.views} views
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="h-3.5 w-3.5" />
          {post.upvotes} upvotes
        </span>
        <span>{post.timestamp}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {post.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[#F5F1EA] px-2 py-1 text-xs text-[#555]">
            <Tag className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
