import Link from "next/link";
import TrendingWidget from "@/components/forum/TrendingWidget";
import { forumCategories, recentlySolved, topContributors, trendingTopics } from "@/lib/forum-data";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-4 py-6 md:px-6 lg:grid-cols-12 lg:py-8">
        <aside className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Forum Categories</h2>
            <ul className="mt-3 space-y-2">
              {forumCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/community?category=${encodeURIComponent(category.name)}`}
                    className="block rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Community Help Desk</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ask your legal doubt in clear language and let members and verified lawyers guide you.
            </p>
            <Link
              href="/community/ask"
              className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Post a Question
            </Link>
          </section>
        </aside>

        <main className="lg:col-span-6">{children}</main>

        <aside className="space-y-4 lg:col-span-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Top Contributors</h3>
            <ul className="mt-3 space-y-2">
              {topContributors.map((person, index) => (
                <li key={person.name} className="flex items-center justify-between text-sm text-slate-600">
                  <span>
                    {index + 1}. {person.name}
                  </span>
                  <span className="font-medium text-slate-900">{person.points}</span>
                </li>
              ))}
            </ul>
          </section>

          <TrendingWidget title="Trending Topics" items={trendingTopics} linked />
          <TrendingWidget title="Recently Solved Questions" items={recentlySolved} linked />
        </aside>
      </div>
    </div>
  );
}
