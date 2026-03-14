"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBigUp, Bot, MessageSquare, Send } from "lucide-react";
import ReplyCard from "@/components/forum/ReplyCard";
import { forumPosts, forumReplies, toRelativeTimestamp, type ForumReply } from "@/lib/forum-data";

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type ApiPost = {
  _id: string;
  title: string;
  category: string;
  author?: string;
  upvotes?: number;
  solved?: boolean;
  content: string;
  createdAt?: string;
};

type ApiReply = {
  _id: string;
  postId: string;
  user?: string;
  role?: "member" | "lawyer";
  avatar?: string;
  reputation?: number;
  text: string;
  upvotes?: number;
  isBestAnswer?: boolean;
  createdAt?: string;
};

async function getPostById(id: string) {
  try {
    const response = await fetch(`${baseUrl}/api/forum/posts/${id}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ApiPost;
  } catch {
    return null;
  }
}

export default function DiscussionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [post, setPost] = useState<{
    id: string;
    title: string;
    category: string;
    author: string;
    timestamp: string;
    upvotes: number;
    solved: boolean;
    content: string;
  } | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [draftReply, setDraftReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [upvotingPost, setUpvotingPost] = useState(false);
  const [upvotingReplyId, setUpvotingReplyId] = useState<string | null>(null);

  const toClientReply = (reply: ApiReply): ForumReply => ({
    id: reply._id,
    postId: String(reply.postId),
    user: reply.user || "Community Member",
    role: reply.role === "lawyer" ? "lawyer" : "member",
    avatar: reply.avatar || "CM",
    reputation: Number.isFinite(Number(reply.reputation)) ? Number(reply.reputation) : 100,
    text: reply.text,
    timestamp: reply.createdAt ? toRelativeTimestamp(reply.createdAt) : "Just now",
    upvotes: Number.isFinite(Number(reply.upvotes)) ? Number(reply.upvotes) : 0,
    isBestAnswer: Boolean(reply.isBestAnswer),
  });

  useEffect(() => {
    if (!id) {
      return;
    }

    const hydrate = async () => {
      const fallbackPost = forumPosts.find((item) => item.id === id);
      let resolvedPost: {
        id: string;
        title: string;
        category: string;
        author: string;
        timestamp: string;
        upvotes: number;
        solved: boolean;
        content: string;
      } | null = null;

      try {
        const [apiPost, repliesResponse] = await Promise.all([
          getPostById(id),
          fetch(`${baseUrl}/api/forum/posts/${id}/replies`, { cache: "no-store" }),
        ]);

        if (apiPost) {
          resolvedPost = {
            id: apiPost._id,
            title: apiPost.title,
            category: apiPost.category,
            author: apiPost.author || "Community Member",
            timestamp: apiPost.createdAt ? toRelativeTimestamp(apiPost.createdAt) : "Just now",
            upvotes: apiPost.upvotes || 0,
            solved: Boolean(apiPost.solved),
            content: apiPost.content,
          };
        }

        if (repliesResponse.ok) {
          const repliesJson = (await repliesResponse.json()) as { items: ApiReply[] };
          setReplies((repliesJson.items || []).map(toClientReply));
        }
      } catch {
        // Keep fallbacks below.
      }

      if (!resolvedPost && fallbackPost) {
        resolvedPost = {
          id: fallbackPost.id,
          title: fallbackPost.title,
          category: fallbackPost.category,
          author: fallbackPost.author,
          timestamp: fallbackPost.timestamp,
          upvotes: fallbackPost.upvotes,
          solved: fallbackPost.solved,
          content: fallbackPost.content,
        };
      }

      if (!resolvedPost) {
        router.push("/community");
        return;
      }

      setPost(resolvedPost);
      setReplies((prev) => (prev.length ? prev : forumReplies.filter((reply) => reply.postId === resolvedPost.id)));
    };

    hydrate();
  }, [id, router]);

  const summaryText = useMemo(() => {
    if (!replies.length) {
      return "No replies yet to summarize.";
    }

    const lawyerReply = replies.find((reply) => reply.role === "lawyer");
    const bestReply = replies.find((reply) => reply.isBestAnswer);

    if (bestReply) {
      return `Most helpful guidance: ${bestReply.text}`;
    }

    if (lawyerReply) {
      return `Verified legal perspective: ${lawyerReply.text}`;
    }

    return `Top community insight: ${replies[0].text}`;
  }, [replies]);

  const upvotePost = async () => {
    if (!post || upvotingPost) {
      return;
    }

    setUpvotingPost(true);
    setPost((prev) => (prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev));

    try {
      const response = await fetch(`${baseUrl}/api/forum/posts/${post.id}/upvote`, { method: "POST" });
      if (!response.ok) {
        throw new Error("upvote failed");
      }
      const json = (await response.json()) as { upvotes: number };
      setPost((prev) => (prev ? { ...prev, upvotes: json.upvotes } : prev));
    } catch {
      setPost((prev) => (prev ? { ...prev, upvotes: Math.max(0, prev.upvotes - 1) } : prev));
    } finally {
      setUpvotingPost(false);
    }
  };

  const upvoteReply = async (replyId: string) => {
    if (upvotingReplyId) {
      return;
    }

    setUpvotingReplyId(replyId);
    setReplies((prev) => prev.map((reply) => (reply.id === replyId ? { ...reply, upvotes: reply.upvotes + 1 } : reply)));

    try {
      const response = await fetch(`${baseUrl}/api/forum/replies/${replyId}/upvote`, { method: "POST" });
      if (!response.ok) {
        throw new Error("reply upvote failed");
      }
      const json = (await response.json()) as { upvotes: number };
      setReplies((prev) => prev.map((reply) => (reply.id === replyId ? { ...reply, upvotes: json.upvotes } : reply)));
    } catch {
      setReplies((prev) => prev.map((reply) => (reply.id === replyId ? { ...reply, upvotes: Math.max(0, reply.upvotes - 1) } : reply)));
    } finally {
      setUpvotingReplyId(null);
    }
  };

  const markMostHelpful = async (replyId: string) => {
    setReplies((prev) => prev.map((reply) => ({ ...reply, isBestAnswer: reply.id === replyId })));
    setPost((prev) => (prev ? { ...prev, solved: true } : prev));

    if (!post) {
      return;
    }

    try {
      await fetch(`${baseUrl}/api/forum/posts/${post.id}/mark-helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
    } catch {
      // Keep optimistic UI.
    }
  };

  const submitReply = async () => {
    if (!post || submittingReply) {
      return;
    }

    const trimmed = draftReply.trim();
    if (!trimmed) {
      return;
    }

    setSubmittingReply(true);
    try {
      const response = await fetch(`${baseUrl}/api/forum/posts/${post.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          user: "Community Member",
          role: "member",
          avatar: "CM",
          reputation: 100,
        }),
      });

      if (!response.ok) {
        throw new Error("reply failed");
      }

      const created = (await response.json()) as ApiReply;
      setReplies((prev) => [...prev, toClientReply(created)]);
      setDraftReply("");
    } catch {
      const localReply: ForumReply = {
        id: `local-${Date.now()}`,
        postId: post.id,
        user: "Community Member",
        role: "member",
        avatar: "CM",
        reputation: 100,
        text: trimmed,
        timestamp: "Just now",
        upvotes: 0,
      };
      setReplies((prev) => [...prev, localReply]);
      setDraftReply("");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (!post) {
    return (
      <div className="space-y-3">
        <div className="h-44 animate-pulse rounded-xl border border-[#E2DAC8] bg-[#FFFFFF]" />
        <div className="h-72 animate-pulse rounded-xl border border-[#E2DAC8] bg-[#FFFFFF]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <article className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F5F1EA] px-2.5 py-1 text-xs font-medium text-[#1C2333]">{post.category}</span>
          {post.solved ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Solved</span>
          ) : null}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1C2333]">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#777]">
          <span>Posted by {post.author}</span>
          <span>{post.timestamp}</span>
        </div>

        <p className="mt-4 text-sm leading-7 text-[#555]">{post.content}</p>

        <button
          type="button"
          onClick={upvotePost}
          disabled={upvotingPost}
          className="mt-5 inline-flex items-center gap-1 rounded-md border border-[#E2DAC8] px-3 py-2 text-sm font-medium text-[#1C2333] transition hover:bg-[#F5F1EA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowBigUp className="h-4 w-4" />
          Upvote ({post.upvotes})
        </button>

        <button
          type="button"
          onClick={() => setShowSummary((prev) => !prev)}
          className="ml-2 inline-flex items-center gap-1 rounded-md border border-[#E2DAC8] px-3 py-2 text-sm font-medium text-[#1C2333] transition hover:bg-[#F5F1EA]"
        >
          <Bot className="h-4 w-4 text-[#C49A10]" />
          AI Thread Summary
        </button>

        {showSummary ? (
          <div className="mt-4 rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] p-3 text-sm text-[#555]">{summaryText}</div>
        ) : null}
      </article>

      <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#1C2333]" />
          <h2 className="text-lg font-semibold text-[#1C2333]">Replies ({replies.length})</h2>
        </div>

        {replies.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E2DAC8] bg-[#F5F1EA] px-4 py-8 text-center">
            <p className="text-sm text-[#555]">No replies yet. Be the first to help this community member.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                canMarkHelpful
                onMarkHelpful={markMostHelpful}
                onUpvote={upvoteReply}
                upvoting={upvotingReplyId === reply.id}
              />
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] p-3">
          <label htmlFor="reply-input" className="text-sm font-medium text-[#1C2333]">
            Add your reply
          </label>
          <textarea
            id="reply-input"
            value={draftReply}
            onChange={(event) => setDraftReply(event.target.value)}
            rows={4}
            placeholder="Share legal guidance, useful links, or practical next steps..."
            className="mt-2 w-full rounded-lg border border-[#E2DAC8] bg-white px-3 py-2 text-sm text-[#333] outline-none focus:ring-2 focus:ring-[#C49A10]"
          />
          <button
            type="button"
            onClick={submitReply}
            disabled={submittingReply || !draftReply.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1C2333] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submittingReply ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </section>
    </div>
  );
}
