"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, FileText, Gavel, Home, SearchX, ShieldAlert } from "lucide-react";
import ForumHeader from "@/components/forum/ForumHeader";
import PostCard from "@/components/forum/PostCard";
import { forumPosts, toRelativeTimestamp, type ForumPost } from "@/lib/forum-data";

const sortOptions = [
  { label: "Latest", value: "latest" },
  { label: "Trending", value: "trending" },
  { label: "Most Helpful", value: "helpful" },
] as const;

const tagOptions = [
  { label: "All", value: "All" },
  { label: "Bail", value: "Bail" },
  { label: "FIR", value: "FIR" },
  { label: "Cyber Crime", value: "Cybercrime" },
  { label: "Property Disputes", value: "Property" },
] as const;

const rightsCards = [
  {
    title: "How to file an FIR",
    description: "Understand where to file, what to include, and what rights you have at the police station.",
    readTime: "6 min",
    icon: FileText,
  },
  {
    title: "Consumer complaint format",
    description: "Step-by-step structure for filing a consumer complaint with supporting documents.",
    readTime: "5 min",
    icon: Gavel,
  },
  {
    title: "Understanding bail terms",
    description: "A plain-language guide to bail process, conditions, and practical precautions.",
    readTime: "7 min",
    icon: ShieldAlert,
  },
  {
    title: "Tenant rights in India",
    description: "Key legal protections around notice periods, deposits, eviction, and rent disputes.",
    readTime: "5 min",
    icon: Home,
  },
  {
    title: "What to do after cyber fraud",
    description: "Immediate actions, reporting channels, and documentation checklist for recovery.",
    readTime: "4 min",
    icon: ShieldAlert,
  },
];

type SortOption = (typeof sortOptions)[number]["value"];

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PAGE_LIMIT = 6;

function normalizeApiPost(post: {
  _id: string;
  title: string;
  category: string;
  author?: string;
  authorAvatar?: string;
  authorReputation?: number;
  authorRole?: "member" | "lawyer";
  replies?: number;
  views?: number;
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
    authorAvatar: post.authorAvatar || "CM",
    authorReputation: Number.isFinite(Number(post.authorReputation)) ? Number(post.authorReputation) : 100,
    authorRole: post.authorRole === "lawyer" ? "lawyer" : "member",
    replies: post.replies || 0,
    views: post.views || 0,
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
  const activeTag = searchParams.get("tag") || "All";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<ForumPost[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);

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

      try {
        const params = new URLSearchParams();
        if (query) {
          params.set("q", query);
        }
        if (activeCategory !== "All") {
          params.set("category", activeCategory);
        }
        if (activeTag !== "All") {
          params.set("tag", activeTag);
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
            authorAvatar?: string;
            authorReputation?: number;
            authorRole?: "member" | "lawyer";
            replies?: number;
            views?: number;
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
        if (activeTag !== "All") {
          trendingParams.set("tag", activeTag);
        }
        trendingParams.set("sort", "trending");
        trendingParams.set("page", "1");
        trendingParams.set("limit", "10");

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
                authorAvatar?: string;
                authorReputation?: number;
                authorRole?: "member" | "lawyer";
                replies?: number;
                views?: number;
                upvotes?: number;
                solved?: boolean;
                tags?: string[];
                content: string;
                createdAt?: string;
              }>;
            })
          : { items: listJson.items.slice(0, 3) };

        const normalizedLatest = listJson.items.map(normalizeApiPost);
        const normalizedTrending = trendingJson.items.map(normalizeApiPost);
        const latestIds = new Set(normalizedLatest.map((item) => item.id));
        const distinctTrending = normalizedTrending.filter((item) => !latestIds.has(item.id)).slice(0, 3);

        setPosts(normalizedLatest);
        setTrendingPosts(distinctTrending);
        setPagination(listJson.pagination);

        if (listJson.pagination.page !== page) {
          updateQueryParam("page", String(listJson.pagination.page));
        }
      } catch {
        const fallback = fallbackPosts(query, activeCategory, sortBy, page);
        const filteredFallback = activeTag === "All" ? fallback.items : fallback.items.filter((item) => item.tags.includes(activeTag));
        const fallbackLatestIds = new Set(filteredFallback.map((item) => item.id));
        const fallbackDistinctTrending = fallback.trending.filter((item) => !fallbackLatestIds.has(item.id)).slice(0, 3);
        setPosts(filteredFallback);
        setTrendingPosts(fallbackDistinctTrending);
        setPagination(fallback.pagination);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();

    return () => controller.abort();
  }, [query, activeCategory, activeTag, sortBy, page]);

  const visiblePages = useMemo(() => getVisiblePages(pagination.page, pagination.totalPages), [pagination.page, pagination.totalPages]);
  const showTrendingSection = !loading && pagination.total >= 5 && trendingPosts.length > 0;

  return (
    <div className="space-y-6">
      <ForumHeader query={query} onQueryChange={(value) => updateQueryParam("q", value, true)} />

      <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => updateQueryParam("sort", e.target.value, true)}
            aria-label="Sort posts"
            className="h-10 rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] px-4 text-sm text-[#555] outline-none focus:ring-2 focus:ring-[#C49A10]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          <select
            value={activeTag}
            onChange={(e) => updateQueryParam("tag", e.target.value, true)}
            aria-label="Filter posts by tag"
            className="h-10 rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] px-4 text-sm text-[#555] outline-none focus:ring-2 focus:ring-[#C49A10]"
          >
            {tagOptions.map((tag) => (
              <option key={tag.value} value={tag.value}>
                Tag: {tag.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowGuidelines(true)}
            className="ml-auto rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] px-3 py-2 text-sm font-medium text-[#1C2333] transition hover:bg-[#EDE7D9]"
          >
            Community Guidelines
          </button>
        </div>
      </section>

      {showTrendingSection ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1C2333]">Trending Discussions</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trendingPosts.map((post) => (
              <PostCard key={post.id} post={post} compact />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1C2333]">Latest Questions Feed</h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-xl border border-[#E2DAC8] bg-[#FFFFFF]" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2DAC8] bg-[#FFFFFF] px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F1EA] text-[#555]">
              <SearchX className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#1C2333]">No discussions found</h3>
            <p className="mt-2 text-sm text-[#555]">
              No questions yet. Be the first to ask a legal question.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {pagination.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] px-4 py-3 shadow-sm">
              <p className="text-sm text-[#555]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total questions)
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQueryParam("page", String(Math.max(1, pagination.page - 1)))}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-[#E2DAC8] px-3 py-1.5 text-xs font-medium text-[#555] transition hover:bg-[#F5F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => updateQueryParam("page", String(pageNumber))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      pageNumber === pagination.page
                        ? "bg-[#1C2333] text-white"
                        : "border border-[#E2DAC8] text-[#555] hover:bg-[#F5F1EA]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => updateQueryParam("page", String(Math.min(pagination.totalPages, pagination.page + 1)))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-[#E2DAC8] px-3 py-1.5 text-xs font-medium text-[#555] transition hover:bg-[#F5F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#C49A10]" />
          <h2 className="text-lg font-semibold text-[#1C2333]">Know Your Rights</h2>
        </div>
        <p className="mt-2 text-sm text-[#555]">
          Quick legal guides to help citizens respond correctly in common legal situations.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rightsCards.map((guide) => {
            const Icon = guide.icon;
            return (
            <article
              key={guide.title}
              className="cursor-pointer rounded-lg border border-[#E2DAC8] bg-[#F5F1EA] p-3 text-sm text-[#555] transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C2333] text-[#C49A10]">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="pr-3 font-medium text-[#1C2333]">{guide.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#666]">{guide.description}</p>
              <p className="mt-2 text-xs text-[#777]">{guide.readTime}</p>
            </article>
            );
          })}
        </div>
      </section>

      {showGuidelines ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-[#1C2333]">Community Guidelines</h3>
            <p className="mt-2 text-sm text-[#555]">Reputation points are awarded for meaningful legal contributions.</p>
            <ul className="mt-3 space-y-1 text-sm text-[#555]">
              <li>+10 for most helpful answer</li>
              <li>+5 for posting a useful answer</li>
              <li>+2 for each upvote received</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              className="mt-4 rounded-lg bg-[#C49A10] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
