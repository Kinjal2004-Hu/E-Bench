"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Bell, ExternalLink, Calendar, ArrowLeft, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchTrendingNews, fetchNewsApiNews, storeNewsItems, type LegalNewsItem } from "@/lib/userApi";
import { mockLegalNews, trendingLegalTopics } from "@/data/mockLegalNews";

function toLegalNewsItem(m: typeof mockLegalNews[0]): LegalNewsItem {
  return {
    id: `mock_${m.id}`,
    headline: m.headline,
    summary: m.summary,
    date: m.date,
    category: m.category,
    source: "E-Bench",
  };
}

export default function LegalNewsPage() {
    const router = useRouter();
    const [news, setNews] = useState<LegalNewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceLabel, setSourceLabel] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);

        const load = async () => {
            try {
                const ik = await fetchTrendingNews();
                if (!active) return;
                if (ik.news?.length > 0) {
                    setNews(ik.news);
                    setSourceLabel("Indian Kanoon");
                    storeNewsItems(ik.news);
                    setError("");
                    return;
                }
            } catch { /* fall through */ }

            try {
                const na = await fetchNewsApiNews("law court India supreme court", 10);
                if (!active) return;
                if (na.news?.length > 0) {
                    setNews(na.news);
                    setSourceLabel("NewsAPI");
                    storeNewsItems(na.news);
                    setError("");
                    return;
                }
            } catch { /* fall through */ }

            if (!active) return;
            const mockItems = mockLegalNews.map(toLegalNewsItem);
            setNews(mockItems);
            setSourceLabel("Mock Data");
            setError("Live news sources unavailable — showing sample data.");
        };

        load().finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const filteredNews = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return news;
        return news.filter(item =>
            `${item.headline} ${item.summary} ${item.category}`.toLowerCase().includes(q)
        );
    }, [news, searchQuery]);

    const handleNewsClick = (item: LegalNewsItem) => {
        storeNewsItems(news);
        router.push(`/free-tools/news/${encodeURIComponent(item.id)}?headline=${encodeURIComponent(item.headline)}&summary=${encodeURIComponent(item.summary)}&category=${encodeURIComponent(item.category)}`);
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-2 bg-[#F5F7FA] text-[#1C4D8D] px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm font-bold hover:bg-[#E2E8F0] transition-colors shadow-sm shrink-0"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="p-3 bg-[#0F2854] rounded-xl text-white shadow-sm"><Newspaper size={24} /></div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#0F2854] font-serif tracking-tight">Daily Legal News</h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Curated updates
                            {sourceLabel ? <span className="text-[#4988C4]"> via {sourceLabel}</span> : null}
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#F5F7FA] text-[#1C4D8D] px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm font-bold hover:bg-[#E2E8F0] transition-colors shadow-sm shrink-0">
                    <Bell size={16} /> Subscribe to digest
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 flex flex-col gap-6">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search news headlines..."
                            className="pl-10 bg-white rounded-2xl border-gray-200"
                        />
                    </div>

                    {loading ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={24} className="animate-spin text-[#1C4D8D]" />
                            <p className="text-gray-500 text-sm font-medium">Fetching latest legal news...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2">
                            <p className="text-amber-700 text-sm font-medium">{error}</p>
                        </div>
                    ) : null}

                    {!loading && news.length > 0 && filteredNews.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <p className="text-gray-500 text-sm font-medium">No news matching "{searchQuery}".</p>
                        </div>
                    ) : null}

                    {!loading && filteredNews.length > 0 ? (
                        filteredNews.map((item) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => handleNewsClick(item)}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group text-left w-full"
                            >
                                <div className="flex gap-2 items-center mb-3 text-xs font-bold text-gray-400">
                                    <span className="uppercase tracking-widest text-[#4988C4]">{item.category}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                                    {item.source ? <><span>•</span><span>{item.source}</span></> : null}
                                </div>

                                <h2 className="text-xl font-bold text-[#0F2854] group-hover:text-[#1C4D8D] transition-colors mb-3 leading-snug">
                                    {item.headline}
                                </h2>
                                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                    {item.summary}
                                </p>

                                <div className="flex items-center gap-1 text-[11px] font-bold text-[#0F2854] uppercase tracking-wider group-hover:underline w-fit">
                                    Analyze Legal Impact <ExternalLink size={12} className="ml-1" />
                                </div>
                            </button>
                        ))
                    ) : null}
                </div>

                <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-[#0F2854] uppercase tracking-wider text-xs mb-4 border-b pb-3">Trending Topics</h3>
                        <div className="flex gap-2 flex-wrap">
                            {trendingLegalTopics.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setSearchQuery(tag)}
                                    className="bg-[#F5F7FA] text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 cursor-pointer hover:border-[#4988C4] hover:text-[#1C4D8D] transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
