"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, FileText, Gavel, Home, SearchX, ShieldAlert, X } from "lucide-react";
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

type RightsGuide = {
  title: string;
  description: string;
  readTime: string;
  icon: React.ElementType;
  sections: { heading: string; points: string[] }[];
};

const rightsCards: RightsGuide[] = [
  {
    title: "How to file an FIR",
    description: "Understand where to file, what to include, and what rights you have at the police station.",
    readTime: "6 min",
    icon: FileText,
    sections: [
      {
        heading: "What is an FIR?",
        points: [
          "A First Information Report (FIR) is a written document prepared by police when they receive information about a cognizable offence.",
          "Filing an FIR is your legal right under Section 154 of CrPC (now Section 173 BNSS, 2023).",
          "Cognizable offences (murder, robbery, rape, kidnapping, etc.) allow police to arrest without a warrant.",
        ],
      },
      {
        heading: "Where to file",
        points: [
          "Visit the police station in whose jurisdiction the crime occurred.",
          "If the jurisdictional station refuses, you can file at any station under Section 154(3) CrPC.",
          "You can also send an FIR by post to the Superintendent of Police.",
          "Online FIR portals are available in most states for select offences (e.g., cyber crime, vehicle theft).",
        ],
      },
      {
        heading: "What to include",
        points: [
          "Your full name, address, and contact details.",
          "Date, time, and place of the incident.",
          "A clear description of the offence and persons involved.",
          "Names of witnesses, if any.",
          "Description of any property lost or damaged.",
        ],
      },
      {
        heading: "Your rights at the police station",
        points: [
          "You have the right to receive a free copy of the FIR immediately after it is registered.",
          "Police cannot refuse to register an FIR for a cognizable offence.",
          "If refused, you can approach the Superintendent of Police or a Magistrate.",
          "You may file a Zero FIR at any police station if the crime occurred in a different jurisdiction.",
          "Female complainants can have the FIR recorded at their home by a woman officer.",
        ],
      },
    ],
  },
  {
    title: "Consumer complaint format",
    description: "Step-by-step structure for filing a consumer complaint with supporting documents.",
    readTime: "5 min",
    icon: Gavel,
    sections: [
      {
        heading: "Who can file?",
        points: [
          "Any consumer who has purchased goods or availed services for personal use can file a complaint.",
          "A complaint can be filed by a consumer, a registered consumer association, or the Central/State Government.",
          "The complaint must be filed within 2 years of the cause of action.",
        ],
      },
      {
        heading: "Which forum to approach?",
        points: [
          "District Commission: claims up to ₹1 crore.",
          "State Commission: claims between ₹1 crore and ₹10 crore.",
          "National Commission (NCDRC): claims above ₹10 crore.",
          "You can also file online at consumerhelpline.gov.in or call 1915 (National Consumer Helpline).",
        ],
      },
      {
        heading: "Format of the complaint",
        points: [
          "1. Name, address, and contact details of the complainant.",
          "2. Name and address of the opposite party (seller/service provider).",
          "3. Facts of the case – chronological description of events.",
          "4. Grounds of complaint – deficiency in service or defective goods.",
          "5. Relief sought – refund, replacement, compensation, or all three.",
          "6. Declaration that the complaint is correct to the best of your knowledge.",
        ],
      },
      {
        heading: "Supporting documents",
        points: [
          "Original purchase receipt, invoice, or bill.",
          "Warranty/guarantee card.",
          "Correspondence with the seller (emails, letters, WhatsApp screenshots).",
          "Medical reports if injury is involved.",
          "Expert opinion or assessment report, if applicable.",
        ],
      },
    ],
  },
  {
    title: "Understanding bail terms",
    description: "A plain-language guide to bail process, conditions, and practical precautions.",
    readTime: "7 min",
    icon: ShieldAlert,
    sections: [
      {
        heading: "Types of bail",
        points: [
          "Regular Bail (Section 483 BNSS): Granted by a court after arrest for a bailable or non-bailable offence.",
          "Anticipatory Bail (Section 484 BNSS): Applied before arrest when a person apprehends arrest.",
          "Interim Bail: Temporary bail granted for a short period pending hearing of the main bail application.",
          "Default Bail: Granted when police fail to file a charge sheet within the stipulated time (60 or 90 days).",
        ],
      },
      {
        heading: "Bailable vs. non-bailable offences",
        points: [
          "Bailable offences: Bail is a right (e.g., theft below ₹5,000, assault without grievous hurt). Police must grant bail.",
          "Non-bailable offences: Bail is at the discretion of the court (e.g., murder, rape, dacoity).",
        ],
      },
      {
        heading: "Common bail conditions",
        points: [
          "Surrender your passport and do not leave the country without court permission.",
          "Report to the local police station periodically (weekly/monthly).",
          "Do not contact witnesses or tamper with evidence.",
          "Provide a surety (a person who guarantees your appearance in court).",
          "Deposit a cash bond or execute a personal bond.",
        ],
      },
      {
        heading: "Practical precautions",
        points: [
          "Always carry a certified copy of the bail order when moving around.",
          "Attend every court date; absence may lead to cancellation of bail and a non-bailable warrant.",
          "Inform your lawyer immediately if any condition becomes difficult to comply with.",
          "Avoid social media posts that could be presented as evidence of non-compliance.",
        ],
      },
    ],
  },
  {
    title: "Tenant rights in India",
    description: "Key legal protections around notice periods, deposits, eviction, and rent disputes.",
    readTime: "5 min",
    icon: Home,
    sections: [
      {
        heading: "Notice period before eviction",
        points: [
          "A landlord cannot evict a tenant without prior written notice as specified in the rental agreement or state rent law.",
          "Under the Model Tenancy Act 2021, the notice period is typically 24 hours for emergency repairs and 15 days for other reasons.",
          "Forced eviction without due legal process is illegal regardless of rent payment status.",
        ],
      },
      {
        heading: "Security deposit",
        points: [
          "The Model Tenancy Act caps security deposits at 2 months' rent for residential premises.",
          "The deposit must be refunded within 1 month of handing over possession of the property.",
          "Deductions can only be made for actual damage beyond normal wear and tear — with proof.",
          "A written receipt for the security deposit must be provided.",
        ],
      },
      {
        heading: "Grounds for lawful eviction",
        points: [
          "Non-payment of rent for 2 or more months.",
          "Subletting the premises without the landlord's written consent.",
          "Using the property for a different purpose than agreed.",
          "Causing nuisance or creating a public health hazard.",
          "Landlord's bona fide personal use (with 3 months' notice).",
        ],
      },
      {
        heading: "Rent dispute resolution",
        points: [
          "First raise the dispute in writing with your landlord and keep a copy.",
          "Approach the Rent Authority or Rent Tribunal in your district.",
          "Disputes under the Model Tenancy Act are heard by a dedicated Rent Court.",
          "You may also approach the District Consumer Forum if the matter involves a service deficiency.",
        ],
      },
    ],
  },
  {
    title: "What to do after cyber fraud",
    description: "Immediate actions, reporting channels, and documentation checklist for recovery.",
    readTime: "4 min",
    icon: ShieldAlert,
    sections: [
      {
        heading: "Immediate actions (first 30 minutes)",
        points: [
          "Call the National Cyber Crime Helpline: 1930 to freeze fraudulent transactions.",
          "Immediately block your debit/credit card and internet banking via your bank's helpline.",
          "Change passwords for your email, banking, and social media accounts.",
          "Do not delete any messages, emails, or call logs — they are evidence.",
        ],
      },
      {
        heading: "Reporting channels",
        points: [
          "Online: File a complaint at cybercrime.gov.in (handles financial fraud, social media crimes, etc.).",
          "Police: Visit the nearest Cyber Cell or file an FIR at any police station.",
          "Bank: File a dispute with your bank's fraud department; request a chargeback for card transactions.",
          "RBI Ombudsman: For unresolved banking complaints at rbi.org.in.",
        ],
      },
      {
        heading: "Documentation checklist",
        points: [
          "Screenshots of fraudulent messages, emails, or social media profiles.",
          "Bank statements showing unauthorized transactions with dates and amounts.",
          "Transaction reference numbers/UTR numbers for all disputed transfers.",
          "Copies of any identity documents that were shared / misused.",
          "Call recordings, if any (check your device's call recorder app).",
        ],
      },
      {
        heading: "Recovery tips",
        points: [
          "Report to the bank within 3 days of the fraud for maximum chargeback eligibility under RBI guidelines.",
          "Keep all acknowledgment numbers from every complaint you file.",
          "Regularly follow up with the police and bank — inaction often stalls recovery.",
          "If your Aadhaar was misused, lock your biometrics at uidai.gov.in.",
        ],
      },
    ],
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
  const [selectedGuide, setSelectedGuide] = useState<RightsGuide | null>(null);

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
              onClick={() => setSelectedGuide(guide)}
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

      {selectedGuide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="flex w-full max-w-2xl flex-col rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] shadow-lg" style={{ maxHeight: "90vh" }}>
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-[#E2DAC8] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1C2333] text-[#C49A10]">
                  <selectedGuide.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1C2333]">{selectedGuide.title}</h3>
                  <p className="text-xs text-[#777]">{selectedGuide.readTime} read</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="ml-4 rounded-lg p-1 text-[#777] transition hover:bg-[#F5F1EA] hover:text-[#1C2333]"
                aria-label="Close guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              <p className="text-sm text-[#555]">{selectedGuide.description}</p>
              {selectedGuide.sections.map((section) => (
                <div key={section.heading}>
                  <h4 className="mb-2 text-sm font-semibold text-[#1C2333]">{section.heading}</h4>
                  <ul className="space-y-2">
                    {section.points.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#555]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C49A10]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="border-t border-[#E2DAC8] px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="rounded-lg bg-[#1C2333] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
