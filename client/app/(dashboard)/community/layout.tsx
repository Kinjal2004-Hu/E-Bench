"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { BadgeCheck, BriefcaseBusiness, Building2, Headset, Scale, Shield, Users, LayoutDashboard, MessageSquare, PenSquare, ChevronRight } from "lucide-react";
import TrendingWidget from "@/components/forum/TrendingWidget";
import { forumCategories, recentlySolved, topContributors, trendingTopics } from "@/lib/forum-data";

type SidebarTopic = { label: string; href: string };

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const categoryIcons = {
  Scale,
  Users,
  Building2,
  Shield,
  BadgeCheck,
  BriefcaseBusiness,
} as const;

const communityNavItems = [
  { label: "Forum", href: "/community", icon: MessageSquare },
  { label: "Ask a Question", href: "/community/ask", icon: PenSquare },
];

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeCategory = searchParams.get("category") || "All";
  const [trendingItems, setTrendingItems] = useState<SidebarTopic[]>([]);
  const [recentSolvedItems, setRecentSolvedItems] = useState<SidebarTopic[]>([]);

  const fallbackTrendingItems = trendingTopics.slice(0, 4).map((topic) => ({
    label: topic,
    href: `/community?q=${encodeURIComponent(topic)}`,
  }));

  const fallbackSolvedItems = recentlySolved.slice(0, 4).map((topic) => ({
    label: topic,
    href: `/community?sort=helpful&q=${encodeURIComponent(topic)}`,
  }));

  useEffect(() => {
    const controller = new AbortController();

    const loadSidebarData = async () => {
      try {
        const [trendingResponse, solvedResponse] = await Promise.all([
          fetch(`${baseUrl}/api/forum/topics/trending?limit=4`, { signal: controller.signal, cache: "no-store" }),
          fetch(`${baseUrl}/api/forum/posts?sort=helpful&page=1&limit=6`, { signal: controller.signal, cache: "no-store" }),
        ]);

        if (trendingResponse.ok) {
          const trendingJson = (await trendingResponse.json()) as { items: SidebarTopic[] };
          setTrendingItems(Array.isArray(trendingJson.items) ? trendingJson.items : []);
        } else {
          setTrendingItems([]);
        }

        if (solvedResponse.ok) {
          const solvedJson = (await solvedResponse.json()) as {
            items: Array<{ _id: string; title: string; solved?: boolean }>;
          };
          const solved = solvedJson.items
            .filter((item) => item.solved)
            .slice(0, 4)
            .map((item) => ({ label: item.title, href: `/community/post/${item._id}` }));
          setRecentSolvedItems(solved);
        } else {
          setRecentSolvedItems([]);
        }
      } catch {
        setTrendingItems([]);
        setRecentSolvedItems([]);
      }
    };

    loadSidebarData();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#EDE8DF]">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 bg-white border-b border-[#E2DAC8] shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6 h-12">
          {/* Back to Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-[#555] hover:text-[#1C2333] transition-colors pr-4 border-r border-[#E2DAC8] mr-3"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
          <ChevronRight size={14} className="text-[#C49A10] mr-2 flex-shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#C49A10] mr-4">Community</span>
          {/* Community section tabs */}
          {communityNavItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/community" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-4 h-12 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#C49A10] text-[#1C2333]"
                    : "border-transparent text-[#777] hover:text-[#1C2333] hover:border-[#E2DAC8]"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-12">
        <aside className="space-y-6 md:col-span-3">
          <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <h2 className="text-lg font-semibold text-[#1C2333]">Forum Categories</h2>
            <ul className="mt-3 space-y-2">
              {forumCategories.map((category) => {
                const Icon = categoryIcons[(category.icon as keyof typeof categoryIcons) || "Scale"] || Scale;
                return (
                <li key={category.id}>
                  <Link
                    href={`/community?category=${encodeURIComponent(category.name)}`}
                    className={`flex items-center rounded-md px-3 py-2 text-sm transition ${
                      activeCategory === category.name
                        ? "bg-[#F5F1EA] text-[#1C2333]"
                        : "text-[#555] hover:bg-[#F5F1EA] hover:text-[#1C2333]"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4 text-[#C49A10]" />
                    {category.name}
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-[#E2DAC8] bg-[#F5F1EA] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-lg font-semibold text-[#1C2333]">Community Help Desk</h3>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1C2333] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Headset className="h-4 w-4" />
              Contact Us
            </Link>
          </section>
        </aside>

        <main className="md:col-span-6">{children}</main>

        <aside className="space-y-6 md:col-span-3">
          <section className="rounded-xl border border-[#E2DAC8] bg-[#FFFFFF] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="mb-3 text-base font-semibold text-[#1C2333]">Top Contributors</h3>
            <ul>
              {topContributors.map((person, index) => (
                <li
                  key={person.name}
                  className={`flex items-center justify-between py-1.5 text-sm text-[#666] ${
                    index === topContributors.length - 1 ? "" : "border-b border-gray-100"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2 pr-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1C2333] text-[10px] font-semibold text-[#C49A10]">
                      {person.avatar}
                    </div>
                    <span className="truncate">
                      {index + 1}. {person.name}
                    </span>
                  </div>
                  <span className="font-medium text-[#1C2333]">{person.points} pts</span>
                </li>
              ))}
            </ul>
          </section>

          <TrendingWidget
            title="Trending Topics"
            items={trendingItems.length ? trendingItems : fallbackTrendingItems}
            linked
          />
          <TrendingWidget
            title="Recently Solved Questions"
            items={recentSolvedItems.length ? recentSolvedItems : fallbackSolvedItems}
            linked
          />
        </aside>
      </div>
    </div>
  );
}
