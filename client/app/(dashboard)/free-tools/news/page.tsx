"use client";

import { useRouter } from "next/navigation";
import { Newspaper, Bell, ExternalLink, Calendar, ArrowLeft } from "lucide-react";
import { mockLegalNews, trendingLegalTopics } from "@/data/mockLegalNews";

export default function DailyNewsPage() {
    const router = useRouter();

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
                {/* Main Feed */}
                <div className="md:col-span-8 flex flex-col gap-6">
                    {mockLegalNews.map((item) => (
                        <div key={item.id} className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer group ${item.featured ? 'border-[#4988C4] shadow-[#BDE8F5]/50' : 'border-gray-200'}`}>

                            {item.featured && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C4D8D] bg-[#BDE8F5]/50 px-3 py-1 rounded-full w-fit mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#1C4D8D] animate-pulse"></div> Breaking News
                                </div>
                            )}

                            <div className="flex gap-2 items-center mb-3 text-xs font-bold text-gray-400">
                                <span className="uppercase tracking-widest text-[#4988C4]">{item.category}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                                <span>•</span>
                                <span>{item.tag}</span>
                            </div>

                            <h2 className="text-xl font-bold text-[#0F2854] group-hover:text-[#1C4D8D] transition-colors mb-3 leading-snug">
                                {item.headline}
                            </h2>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                {item.summary}
                            </p>

                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#0F2854] uppercase tracking-wider group-hover:underline w-fit">
                                Read Full Article <ExternalLink size={12} className="ml-1" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar */}
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
