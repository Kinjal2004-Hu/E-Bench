"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, Landmark, Scale, Search, ShieldCheck, X } from "lucide-react";
import {
    fetchRightsLawArticle,
    fetchRightsLawAwareness,
    type LawAwarenessArticleDetail,
    type LawAwarenessArticleSummary,
} from "@/lib/userApi";

export default function LawAwarenessPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [lawTitle, setLawTitle] = useState("People's Rights Law Guide");
    const [intro, setIntro] = useState("");
    const [articles, setArticles] = useState<LawAwarenessArticleSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<LawAwarenessArticleDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    useEffect(() => {
        let active = true;

        fetchRightsLawAwareness()
            .then((data) => {
                if (!active) return;
                setLawTitle(data.law_title);
                setIntro(data.intro);
                setArticles(data.articles);
                setError("");
            })
            .catch((err: Error) => {
                if (!active) return;
                setError(err.message || "Unable to load rights law content.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!selected) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setSelected(null);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected]);

    const filteredArticles = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return articles;
        return articles.filter((article) =>
            `${article.article_number} ${article.title} ${article.short_description}`.toLowerCase().includes(term)
        );
    }, [articles, search]);

    const openArticle = async (articleId: string) => {
        setDetailLoading(true);
        setDetailError("");
        setSelected(null);
        try {
            const detail = await fetchRightsLawArticle(articleId);
            setSelected(detail);
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : "Unable to load article details.");
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 pb-6">
            <div className="flex justify-start">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C59A] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F2854] shadow-sm transition hover:bg-[#F6EFE2]"
                >
                    <ArrowLeft size={14} /> Back to Dashboard
                </button>
            </div>

           
            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[24px] border border-[#E8DCC2] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#F0E6D4] pb-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B28A34]">Article List</p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#0F2854]">Rights You Can Read and Use</h2>
                        </div>
                        <div className="rounded-2xl bg-[#F8F3E8] px-3 py-2 text-xs font-semibold text-[#7B6641]">
                            {filteredArticles.length} articles
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-dashed border-[#DCCCA8] bg-[#FBF8F1] px-5 py-8 text-sm text-[#6F6248]">
                            Loading rights law content...
                        </div>
                    ) : error ? (
                        <div className="rounded-2xl border border-[#F3D3D3] bg-[#FFF6F6] px-5 py-8 text-sm text-[#9B3A3A]">
                            {error}
                        </div>
                    ) : filteredArticles.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#DCCCA8] bg-[#FBF8F1] px-5 py-8 text-sm text-[#6F6248]">
                            No matching rights article found for your search.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredArticles.map((article) => (
                                <button
                                    key={article.article_id}
                                    type="button"
                                    onClick={() => openArticle(article.article_id)}
                                    className="group flex w-full items-start gap-4 rounded-2xl border border-[#E8DCC2] bg-[#FFFEFB] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#C7A657] hover:shadow-[0_10px_24px_rgba(15,40,84,0.08)]"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7E8C7] text-[#8B6914]">
                                        <Landmark size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17407D]">
                                                {article.article_number}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-[#0F2854] transition group-hover:text-[#17407D]">{article.title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-[#5F6574]">{article.short_description}</p>
                                    </div>
                                    <ChevronRight size={18} className="mt-1 shrink-0 text-[#B28A34]" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="rounded-[24px] border border-[#E8DCC2] bg-[#FCF7EE] p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2854] text-[#E5D3A3] shadow-sm">
                            <Scale size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B28A34]">How To Use</p>
                            <h2 className="font-serif text-xl font-bold text-[#0F2854]">Open Any Article for Full Detail</h2>
                        </div>
                    </div>
                    <div className="space-y-4 text-sm leading-7 text-[#5F6574]">
                        <div className="rounded-2xl border border-[#E8DCC2] bg-white p-4">
                            Click any article title to open a modal with the full explanation, practical use points, and landmark case references.
                        </div>
                        <div className="rounded-2xl border border-[#E8DCC2] bg-white p-4">
                            This section focuses on one law theme only: rights available to people under the Constitution of India.
                        </div>
                        <div className="rounded-2xl border border-[#E8DCC2] bg-white p-4">
                            Use the search box to quickly find an article like equality, life and liberty, arrest safeguards, or constitutional remedies.
                        </div>
                    </div>
                </aside>
            </section>

            {(detailLoading || detailError || selected) ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1730]/55 px-4 py-8">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#DCCCA8] bg-white shadow-[0_28px_80px_rgba(11,23,48,0.35)]">
                        <div className="flex items-start justify-between gap-4 border-b border-[#F0E6D4] bg-[#FCF8F0] px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A34]">
                                    {selected?.article_number || "Rights Detail"}
                                </p>
                                <h3 className="mt-1 font-serif text-2xl font-bold text-[#0F2854]">
                                    {selected?.title || "Loading article..."}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelected(null);
                                    setDetailError("");
                                }}
                                className="rounded-2xl border border-[#E8DCC2] bg-white p-2 text-[#0F2854] transition hover:bg-[#F6EFE2]"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-6 py-6">
                            {detailLoading ? (
                                <div className="rounded-2xl border border-dashed border-[#DCCCA8] bg-[#FBF8F1] px-5 py-8 text-sm text-[#6F6248]">
                                    Loading article details...
                                </div>
                            ) : detailError ? (
                                <div className="rounded-2xl border border-[#F3D3D3] bg-[#FFF6F6] px-5 py-8 text-sm text-[#9B3A3A]">
                                    {detailError}
                                </div>
                            ) : selected ? (
                                <div className="space-y-6">
                                    <section className="rounded-3xl border border-[#E8DCC2] bg-[#FFFEFB] p-5">
                                        <div className="mb-3 flex items-center gap-2 text-[#0F2854]">
                                            <BookOpen size={18} />
                                            <h4 className="font-semibold">What this article protects</h4>
                                        </div>
                                        <p className="text-sm leading-7 text-[#495062]">{selected.rights_explained}</p>
                                    </section>

                                    <section className="rounded-3xl border border-[#E8DCC2] bg-[#FFFEFB] p-5">
                                        <div className="mb-3 flex items-center gap-2 text-[#0F2854]">
                                            <ShieldCheck size={18} />
                                            <h4 className="font-semibold">Practical use</h4>
                                        </div>
                                        <div className="space-y-3">
                                            {selected.practical_use.map((item) => (
                                                <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#F8F3E8] px-4 py-3 text-sm text-[#495062]">
                                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#B28A34]" />
                                                    <span className="leading-6">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-3xl border border-[#E8DCC2] bg-[#FFFEFB] p-5">
                                        <div className="mb-3 flex items-center gap-2 text-[#0F2854]">
                                            <Landmark size={18} />
                                            <h4 className="font-semibold">Past case references</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {selected.case_references.map((caseItem) => (
                                                <div key={`${caseItem.case_name}-${caseItem.year}`} className="rounded-2xl border border-[#E8DCC2] bg-[#FCF8F0] p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <h5 className="text-sm font-bold text-[#0F2854]">{caseItem.case_name}</h5>
                                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7B6641]">
                                                            {caseItem.year}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-[#495062]">{caseItem.principle}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
