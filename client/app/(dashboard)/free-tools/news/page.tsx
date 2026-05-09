"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Bell, ExternalLink, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { fetchTrendingNews, type LegalNewsItem } from "@/lib/userApi";
import { trendingLegalTopics } from "@/data/mockLegalNews";

export default function DailyNewsPage() {
    const router = useRouter();
    const [news, setNews] = useState<LegalNewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchTrendingNews()
            .then((data) => {
                if (!active) return;
                setNews(data.news || []);
                setError("");
            })
            .catch((err: Error) => {
                if (!active) return;
                setError(err.message || "Unable to fetch legal news.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

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
                        <p className="text-sm text-gray-500 font-medium">Curated, real-time updates from Indian courts and legislatures.</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#F5F7FA] text-[#1C4D8D] px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm font-bold hover:bg-[#E2E8F0] transition-colors shadow-sm shrink-0">
                    <Bell size={16} /> Subscribe to digest
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 flex flex-col gap-6">
                    {loading ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={24} className="animate-spin text-[#1C4D8D]" />
                            <p className="text-gray-500 text-sm font-medium">Fetching latest legal news...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                        </div>
                    ) : news.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <p className="text-gray-500 text-sm font-medium">No legal news available at this time.</p>
                        </div>
                    ) : (
                        news.map((item, idx) => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => router.push(`/free-tools/news/${encodeURIComponent(item.id)}?headline=${encodeURIComponent(item.headline)}&summary=${encodeURIComponent(item.summary)}&category=${encodeURIComponent(item.category)}`)}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group text-left w-full"
                            >
                                <div className="flex gap-2 items-center mb-3 text-xs font-bold text-gray-400">
                                    <span className="uppercase tracking-widest text-[#4988C4]">{item.category}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                                    <span>•</span>
                                    <span>{item.source}</span>
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
                    )}
                </div>

                <div className="md:col-span-4 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-[#0F2854] uppercase tracking-wider text-xs mb-4 border-b pb-3">Trending Topics</h3>
                        <div className="flex gap-2 flex-wrap">
                            {trendingLegalTopics.map(tag => (
                                <span key={tag} className="bg-[#F5F7FA] text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 cursor-pointer hover:border-[#4988C4] hover:text-[#1C4D8D] transition-colors">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
