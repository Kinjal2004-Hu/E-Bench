"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, SearchX } from "lucide-react";
import CategoryCard from "@/components/forum/CategoryCard";
import ForumHeader from "@/components/forum/ForumHeader";
import PostCard from "@/components/forum/PostCard";
import { beginnerGuides, forumCategories, forumPosts, toRelativeTimestamp, type ForumPost } from "@/lib/forum-data";

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Trending", value: "trending" },
  { label: "Most Helpful", value: "helpful" },
] as const;

type SortOption = (typeof sortOptions)[number]["value"];

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PAGE_LIMIT = 6;

function normalizeApiPost(post: {
  _id: string;
  title: string;
  category: string;
  author?: string;
  authorRole?: "member" | "lawyer";
  replies?: number;
  upvotes?: number;
  solved?: boolean;
  tags?: string[];
  content: string;
  createdAt?: string;
}): ForumPost {
  return {
    id: post._id,
    title: post.title,
    category: post.category,
    author: post.author || "Community Member",
    authorRole: post.authorRole === "lawyer" ? "lawyer" : "member",
    replies: post.replies || 0,
    upvotes: post.upvotes || 0,
    timestamp: post.createdAt ? toRelativeTimestamp(post.createdAt) : "Just now",
    solved: Boolean(post.solved),
    tags: Array.isArray(post.tags) ? post.tags : [],
    content: post.content,
  };
}

function fallbackPosts(query: string, category: string, sortBy: SortOption, page: number) {
  const queryLower = query.toLowerCase();

  let posts = forumPosts.filter((post) => {
    if (category !== "All" && post.category !== category) {
      return false;
    }
    if (!queryLower) {
      return true;
    }
    const haystack = `${post.title} ${post.content} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
    return haystack.includes(queryLower);
  });

  posts = [...posts].sort((a, b) => {
    if (sortBy === "trending") {
      return b.upvotes + b.replies * 2 - (a.upvotes + a.replies * 2);
    }
    if (sortBy === "helpful") {
      return Number(b.solved) - Number(a.solved) || b.upvotes - a.upvotes;
    }
    return b.id.localeCompare(a.id);
  });

  const total = posts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_LIMIT;

  return {
    items: posts.slice(start, start + PAGE_LIMIT),
    pagination: {
      page: safePage,
      limit: PAGE_LIMIT,
      total,
      totalPages,
    },
    trending: [...posts].sort((a, b) => b.upvotes + b.replies * 2 - (a.upvotes + a.replies * 2)).slice(0, 3),
  };
}

function getVisiblePages(current: number, totalPages: number) {
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return pages;
}

export default function CommunityHomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const sortBy = (searchParams.get("sort") || "latest") as SortOption;
  const activeCategory = searchParams.get("category") || "All";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const updateQueryParam = (key: string, value: string, resetPage = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    if (resetPage) {
      params.delete("page");
    }

    router.replace(`/community${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadPosts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (query) {
          params.set("q", query);
        }
        if (activeCategory !== "All") {
          params.set("category", activeCategory);
        }
        params.set("sort", sortBy);
        params.set("page", String(page));
        params.set("limit", String(PAGE_LIMIT));

        const listResponse = await fetch(`${baseUrl}/api/forum/posts?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!listResponse.ok) {
          throw new Error("Failed to fetch forum posts");
        }

        const listJson = (await listResponse.json()) as {
          items: Array<{
            _id: string;
            title: string;
            category: string;
            author?: string;
            authorRole?: "member" | "lawyer";
            replies?: number;
            upvotes?: number;
            solved?: boolean;
            tags?: string[];
            content: string;
            createdAt?: string;
          }>;
          pagination: { page: number; limit: number; total: number; totalPages: number };
        };

        const trendingParams = new URLSearchParams();
        if (query) {
          trendingParams.set("q", query);
        }
        if (activeCategory !== "All") {
          trendingParams.set("category", activeCategory);
        }
        trendingParams.set("sort", "trending");
        trendingParams.set("page", "1");
        trendingParams.set("limit", "3");

        const trendingResponse = await fetch(`${baseUrl}/api/forum/posts?${trendingParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const trendingJson = trendingResponse.ok
          ? ((await trendingResponse.json()) as {
              items: Array<{
                _id: string;
                title: string;
                category: string;
                author?: string;
                authorRole?: "member" | "lawyer";
                replies?: number;
                upvotes?: number;
                solved?: boolean;
                tags?: string[];
                content: string;
                createdAt?: string;
              }>;
            })
          : { items: listJson.items.slice(0, 3) };

        setPosts(listJson.items.map(normalizeApiPost));
        setTrendingPosts(trendingJson.items.map(normalizeApiPost));
        setPagination(listJson.pagination);

        if (listJson.pagination.page !== page) {
          updateQueryParam("page", String(listJson.pagination.page));
        }
      } catch {
        const fallback = fallbackPosts(query, activeCategory, sortBy, page);
        setPosts(fallback.items);
        setTrendingPosts(fallback.trending);
        setPagination(fallback.pagination);
        setError("Showing cached discussions because forum API is currently unreachable.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();

    return () => controller.abort();
  }, [query, activeCategory, sortBy, page]);

  const visiblePages = useMemo(() => getVisiblePages(pagination.page, pagination.totalPages), [pagination.page, pagination.totalPages]);

  return (
    <div className="space-y-6">
      <ForumHeader query={query} onQueryChange={(value) => updateQueryParam("q", value, true)} />

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Legal Categories</h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => updateQueryParam("sort", e.target.value, true)}
              aria-label="Sort posts"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>

            <select
              value={activeCategory}
              onChange={(e) => updateQueryParam("category", e.target.value, true)}
              aria-label="Filter posts by category"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">Filter: All Categories</option>
              {forumCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  Filter: {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateQueryParam("category", "All", true)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === "All" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {forumCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateQueryParam("category", category.name, true)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeCategory === category.name
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {forumCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Trending Discussions</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trendingPosts.map((post) => (
              <PostCard key={post.id} post={post} compact />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Latest Questions Feed</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <SearchX className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No discussions found</h3>
            <p className="mt-2 text-sm text-slate-600">
              Try a different category or keyword, or be the first to ask this question in the community.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total questions)
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQueryParam("page", String(Math.max(1, pagination.page - 1)))}
                  disabled={pagination.page <= 1}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => updateQueryParam("page", String(pageNumber))}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      pageNumber === pagination.page
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => updateQueryParam("page", String(Math.min(pagination.totalPages, pagination.page + 1)))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Beginner Legal Guides</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Start your legal awareness journey with practical, easy-to-understand explainers created for first-time learners.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {beginnerGuides.map((guide) => (
            <article key={guide.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">{guide.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{guide.readTime} read</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
