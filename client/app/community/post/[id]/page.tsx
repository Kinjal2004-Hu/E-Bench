import { notFound } from "next/navigation";
import { ArrowBigUp, MessageSquare } from "lucide-react";
import ReplyCard from "@/components/forum/ReplyCard";
import { forumPosts, forumReplies, toRelativeTimestamp } from "@/lib/forum-data";

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

export default async function DiscussionPage({ params }: { params: { id: string } }) {
  const apiPost = await getPostById(params.id);
  const fallbackPost = forumPosts.find((item) => item.id === params.id);
  const post = apiPost
    ? {
        id: apiPost._id,
        title: apiPost.title,
        category: apiPost.category,
        author: apiPost.author || "Community Member",
        timestamp: apiPost.createdAt ? toRelativeTimestamp(apiPost.createdAt) : "Just now",
        upvotes: apiPost.upvotes || 0,
        solved: Boolean(apiPost.solved),
        content: apiPost.content,
      }
    : fallbackPost;

  if (!post) {
    notFound();
  }

  const replies = forumReplies.filter((reply) => reply.postId === post.id);

  return (
    <div className="space-y-5">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{post.category}</span>
          {post.solved ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Solved</span>
          ) : null}
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>Posted by {post.author}</span>
          <span>{post.timestamp}</span>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-700">{post.content}</p>

        <button className="mt-5 inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <ArrowBigUp className="h-4 w-4" />
          Upvote ({post.upvotes})
        </button>
      </article>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Replies ({replies.length})</h2>
        </div>

        {replies.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-600">No replies yet. Be the first to help this community member.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <ReplyCard key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
