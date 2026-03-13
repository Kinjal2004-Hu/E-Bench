"use client";

import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, FileText, Scale, ShieldAlert, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";

    // Mock search logic 
    const results = [
        { type: "cases", icon: Scale, title: "State vs. Sharma Corp", sub: "High Court of Delhi • Fraud", link: "/cases" },
        { type: "contracts", icon: FileText, title: "Vendor Agreement 2024.docx", sub: "Medium Risk • Uploaded Oct 12", link: "/contracts" },
        { type: "documents", icon: ShieldAlert, title: "Cyber Fraud Summary (FIR 402)", sub: "Summarized • IT Act 66D", link: "/chats?filter=Summary" },
        { type: "articles", icon: BookOpen, title: "Understanding the RTI Act 2005", sub: "Citizen Rights • Legal Article", link: "/free-tools/law-awareness" },
    ];

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white border border-gray-200 rounded-xl text-[#1C4D8D] shadow-sm"><SearchIcon size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Search Results</h1>
                    <p className="text-sm text-gray-500">Showing results for <span className="font-semibold text-gray-700">"{query}"</span></p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {results.map((res, i) => (
                    <Link key={i} href={res.link} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex items-center p-4 hover:border-[#4988C4] hover:shadow-md transition-all group cursor-pointer">
                        <div className="w-12 h-12 rounded-lg bg-[#F5F7FA] flex items-center justify-center text-[#1C4D8D] flex-shrink-0">
                            <res.icon size={20} />
                        </div>
                        <div className="ml-4 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4988C4] mb-1 block">{res.type}</span>
                            <h3 className="font-semibold text-[#0F2854] text-lg group-hover:text-[#1C4D8D] transition-colors">{res.title}</h3>
                            <p className="text-sm text-gray-500">{res.sub}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 text-[#1C4D8D]">
                            <ArrowRight size={20} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function SearchResultsPage() {
    return (
        <Suspense fallback={<div className="text-gray-500 font-medium">Loading search results...</div>}>
            <SearchResultsContent />
        </Suspense>
    );
}
