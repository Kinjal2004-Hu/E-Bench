"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, FileText, Gavel, Landmark, Scale, Search, ShieldCheck, X, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    fetchRightsLawArticle,
    fetchRightsLawAwareness,
    fetchDailyLawSections,
    type LawAwarenessArticleDetail,
    type LawAwarenessArticleSummary,
    type LawAwarenessListResponse,
    type DailyLawSection,
    type DailyLawResponse,
} from "@/lib/userApi";

const FALLBACK_DATA: LawAwarenessListResponse = {
    law_title: "Fundamental Rights of People in India",
    intro: "A citizen-focused guide to the key Fundamental Rights under the Constitution of India. Select an article to read what it protects, when it is used, and which landmark cases shaped it.",
    articles: [
        { article_id: "article-14", article_number: "Article 14", title: "Equality Before Law", short_description: "Protects every person against arbitrary state action and guarantees equal treatment before law." },
        { article_id: "article-19", article_number: "Article 19", title: "Freedoms of Speech, Movement and Association", short_description: "Covers core civil freedoms such as speech, assembly, association, movement, residence, and profession." },
        { article_id: "article-21", article_number: "Article 21", title: "Right to Life and Personal Liberty", short_description: "Ensures that no person is deprived of life or personal liberty except by just, fair, and reasonable procedure." },
        { article_id: "article-21a", article_number: "Article 21A", title: "Right to Education", short_description: "Provides free and compulsory education for children between 6 and 14 years of age." },
        { article_id: "article-22", article_number: "Article 22", title: "Protection Against Arbitrary Arrest and Detention", short_description: "Grants safeguards such as being informed of grounds of arrest and consulting a lawyer." },
        { article_id: "article-32", article_number: "Article 32", title: "Right to Constitutional Remedies", short_description: "Allows a person to directly approach the Supreme Court for enforcement of fundamental rights." },
    ],
};

const FALLBACK_DETAILS: Record<string, LawAwarenessArticleDetail> = {
    "article-14": {
        article_id: "article-14", article_number: "Article 14", title: "Equality Before Law",
        short_description: "Protects every person against arbitrary state action.",
        rights_explained: "Article 14 guarantees equality before law and equal protection of laws. The State cannot act arbitrarily, selectively, or irrationally while making laws or taking executive action. Reasonable classification is allowed, but it must have an intelligible basis and a rational link to the objective.",
        practical_use: [
            "Challenge arbitrary government decisions, discriminatory policies, or unequal treatment by public authorities.",
            "Invoke it where a rule unfairly targets one class without valid legal reason.",
            "Use alongside Articles 19 and 21 when administrative action is unfair and unreasonable.",
        ],
        case_references: [
            { case_name: "E.P. Royappa v. State of Tamil Nadu", year: "1974", principle: "Arbitrariness is antithetical to equality; arbitrary state action violates Article 14." },
            { case_name: "Maneka Gandhi v. Union of India", year: "1978", principle: "Fairness, non-arbitrariness, and reasonableness became central to constitutional review." },
        ],
    },
    "article-19": {
        article_id: "article-19", article_number: "Article 19", title: "Freedoms of Speech, Movement and Association",
        short_description: "Covers core civil freedoms.",
        rights_explained: "Article 19(1) grants key freedoms to citizens, including free speech and expression, peaceful assembly, forming associations, moving freely, residing anywhere in India, and practising a profession or business. These freedoms are subject to reasonable restrictions in the interests of public order, sovereignty, morality, security, and other constitutionally recognised grounds.",
        practical_use: [
            "Raise it when speech is curtailed without lawful basis or a permit condition is excessive.",
            "Use it in disputes involving bans on meetings, associations, protests, or trade activity.",
            "Check whether the restriction is proportionate and grounded in a valid statute.",
        ],
        case_references: [
            { case_name: "Shreya Singhal v. Union of India", year: "2015", principle: "Struck down Section 66A of the IT Act for violating free speech protections." },
            { case_name: "Bennett Coleman & Co. v. Union of India", year: "1973", principle: "Freedom of the press is an essential part of Article 19(1)(a)." },
        ],
    },
    "article-21": {
        article_id: "article-21", article_number: "Article 21", title: "Right to Life and Personal Liberty",
        short_description: "Ensures fair procedure for deprivation of liberty.",
        rights_explained: "Article 21 has evolved into the broadest human-rights guarantee in Indian constitutional law. It covers dignity, privacy, livelihood, legal aid, a clean environment, fair procedure, health, and many other protections. Any procedure restricting liberty must be just, fair, and reasonable, not merely formally valid.",
        practical_use: [
            "Use it in cases involving unlawful detention, police excess, privacy invasion, or denial of dignified treatment.",
            "Rely on it where executive action affects survival, health, shelter, or procedural fairness.",
            "It often works together with Articles 14 and 22 in custody-related matters.",
        ],
        case_references: [
            { case_name: "Maneka Gandhi v. Union of India", year: "1978", principle: "Expanded personal liberty and required fair, just, and reasonable procedure." },
            { case_name: "Justice K.S. Puttaswamy v. Union of India", year: "2017", principle: "Recognised privacy as a fundamental right under Article 21." },
        ],
    },
    "article-21a": {
        article_id: "article-21a", article_number: "Article 21A", title: "Right to Education",
        short_description: "Free and compulsory education for children aged 6-14.",
        rights_explained: "Article 21A obligates the State to provide free and compulsory education to children aged 6 to 14 years. It strengthens access to schooling as a constitutional entitlement and is closely linked to dignity, development, and equality.",
        practical_use: [
            "Use it when a child is denied admission, basic access, or state educational support within the protected age group.",
            "Relevant in school-access disputes, neighbourhood-school issues, and public education enforcement.",
            "Works alongside the Right of Children to Free and Compulsory Education Act, 2009.",
        ],
        case_references: [
            { case_name: "Mohini Jain v. State of Karnataka", year: "1992", principle: "Recognised the importance of education as integral to constitutional freedoms." },
            { case_name: "Unni Krishnan v. State of Andhra Pradesh", year: "1993", principle: "Laid the foundation for later constitutional recognition of the right to education." },
        ],
    },
    "article-22": {
        article_id: "article-22", article_number: "Article 22", title: "Protection Against Arbitrary Arrest",
        short_description: "Safeguards for arrested persons.",
        rights_explained: "Article 22 provides procedural safeguards for arrested persons, including the right to be informed of the grounds of arrest, the right to consult and be defended by a legal practitioner, and production before a magistrate within 24 hours, subject to exceptions.",
        practical_use: [
            "Use it immediately after arrest or detention to test whether procedural safeguards were followed.",
            "Relevant where police fail to communicate grounds of arrest or delay production before a magistrate.",
            "Often relied on together with statutory safeguards under criminal procedure.",
        ],
        case_references: [
            { case_name: "D.K. Basu v. State of West Bengal", year: "1997", principle: "Laid down arrest and detention guidelines to curb custodial abuse." },
            { case_name: "Joginder Kumar v. State of Uttar Pradesh", year: "1994", principle: "Arrest must not be routine; necessity and justification matter." },
        ],
    },
    "article-32": {
        article_id: "article-32", article_number: "Article 32", title: "Right to Constitutional Remedies",
        short_description: "Enforce fundamental rights directly in Supreme Court.",
        rights_explained: "Article 32 is the enforcement mechanism for Fundamental Rights. It empowers the Supreme Court to issue writs such as habeas corpus, mandamus, prohibition, certiorari, and quo warranto where fundamental rights are violated.",
        practical_use: [
            "Use it when there is a direct and serious violation of a Fundamental Right requiring constitutional remedy.",
            "Helpful in urgent liberty matters, unlawful detention, censorship, or systemic state violations.",
            "High Courts provide similar remedies under Article 226, often used first in practice.",
        ],
        case_references: [
            { case_name: "Romesh Thappar v. State of Madras", year: "1950", principle: "Confirmed the importance of direct constitutional remedy for free speech violations." },
            { case_name: "Bandhua Mukti Morcha v. Union of India", year: "1984", principle: "Expanded public interest litigation for enforcing fundamental rights of vulnerable groups." },
        ],
    },
};

const DAILY_DOCUMENTS = ["BNS", "BNSS", "BSA", "Corporate Laws", "Motor Vehicles Act"];

const docIcons: Record<string, typeof Gavel> = {
    "BNS": Gavel,
    "BNSS": ShieldCheck,
    "BSA": BookOpen,
    "Corporate Laws": FileText,
    "Motor Vehicles Act": Scale,
};

const docColors: Record<string, string> = {
    "BNS": "bg-red-50 text-red-700 border-red-200",
    "BNSS": "bg-blue-50 text-blue-700 border-blue-200",
    "BSA": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Corporate Laws": "bg-purple-50 text-purple-700 border-purple-200",
    "Motor Vehicles Act": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function LawAwarenessPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("rights");
    const [search, setSearch] = useState("");
    const [lawTitle, setLawTitle] = useState("People's Rights Law Guide");
    const [intro, setIntro] = useState("");
    const [articles, setArticles] = useState<LawAwarenessArticleSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState<LawAwarenessArticleDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    const [dailySections, setDailySections] = useState<DailyLawSection[]>([]);
    const [dailyDate, setDailyDate] = useState("");
    const [dailyLoading, setDailyLoading] = useState(false);
    const [dailyError, setDailyError] = useState("");

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
            .catch(() => {
                if (!active) return;
                setLawTitle(FALLBACK_DATA.law_title);
                setIntro(FALLBACK_DATA.intro);
                setArticles(FALLBACK_DATA.articles);
                setError("Could not reach server — showing offline guide.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (activeTab !== "codes") return;
        let active = true;
        setDailyLoading(true);

        fetchDailyLawSections()
            .then((data) => {
                if (!active) return;
                setDailySections(data.sections || []);
                setDailyDate(data.date);
                setDailyError("");
            })
            .catch(() => {
                if (!active) return;
                setDailyError("Unable to fetch today's legal code sections.");
            })
            .finally(() => {
                if (active) setDailyLoading(false);
            });

        return () => { active = false; };
    }, [activeTab]);

    useEffect(() => {
        if (!selected) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setSelected(null); setDetailError(""); }
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
        } catch {
            const fallback = FALLBACK_DETAILS[articleId];
            if (fallback) {
                setSelected(fallback);
                setDetailError("");
            } else {
                setDetailError("Unable to load article details.");
            }
        } finally {
            setDetailLoading(false);
        }
    };

    const groupedDaily = useMemo(() => {
        const groups: Record<string, DailyLawSection[]> = {};
        for (const doc of DAILY_DOCUMENTS) {
            const docSections = dailySections.filter(s => s.document === doc);
            if (docSections.length > 0) groups[doc] = docSections;
        }
        return groups;
    }, [dailySections]);

    return (
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 pb-6">
            <div className="flex justify-start">
                <button
                    type="button"
                    onClick={() => router.push("/free-tools/news")}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8C59A] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F2854] shadow-sm transition hover:bg-[#F6EFE2]"
                >
                    <ArrowLeft size={14} /> Back to Free Tools
                </button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="rights" className="flex items-center gap-2">
                        <Landmark size={15} /> Know Your Rights
                    </TabsTrigger>
                    <TabsTrigger value="codes" className="flex items-center gap-2">
                        <FileText size={15} /> Today&apos;s Legal Codes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rights" className="mt-0">
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

                            <div className="relative mb-4">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B28A34]" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search rights articles..."
                                    className="rounded-2xl border-[#E8DCC2] bg-[#FFFEFB] pl-10"
                                />
                            </div>

                            {error ? (
                                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
                            ) : null}

                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex animate-pulse items-start gap-4 rounded-2xl border border-[#E8DCC2] bg-white p-4">
                                            <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#F0E6D4]" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-4 w-24 rounded-full bg-[#F0E6D4]" />
                                                <div className="h-5 w-3/4 rounded bg-[#F0E6D4]" />
                                                <div className="h-4 w-full rounded bg-[#F5F1EA]" />
                                            </div>
                                        </div>
                                    ))}
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
                                    Click any article to see the full explanation, practical use points, and landmark case references.
                                </div>
                                <div className="rounded-2xl border border-[#E8DCC2] bg-white p-4">
                                    Also check <strong>Today's Legal Codes</strong> tab for daily featured sections from BNS, BNSS, BSA, Corporate, and Motor Vehicle laws.
                                </div>
                            </div>
                        </aside>
                    </section>
                </TabsContent>

                <TabsContent value="codes" className="mt-0">
                    <div className="rounded-[24px] border border-[#E8DCC2] bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#F0E6D4] pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F2854] text-[#E5D3A3]">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B28A34]">
                                        {dailyDate || "Today's Selection"}
                                    </p>
                                    <h2 className="mt-1 font-serif text-2xl font-bold text-[#0F2854]">Today's Legal Code Sections</h2>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-[#F8F3E8] px-3 py-2 text-xs font-semibold text-[#7B6641]">
                                {dailySections.length} sections
                            </div>
                        </div>

                        {dailyLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex animate-pulse items-start gap-4 rounded-2xl border border-[#E8DCC2] bg-white p-4">
                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-[#F0E6D4]" />
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="h-4 w-32 rounded bg-[#F0E6D4]" />
                                            <div className="h-5 w-2/3 rounded bg-[#F0E6D4]" />
                                            <div className="h-4 w-full rounded bg-[#F5F1EA]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : dailyError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-600">{dailyError}</div>
                        ) : dailySections.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#DCCCA8] bg-[#FBF8F1] px-5 py-8 text-sm text-[#6F6248]">
                                No sections available today.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {DAILY_DOCUMENTS.map((doc) => {
                                    const docSections = groupedDaily[doc];
                                    if (!docSections?.length) return null;
                                    const Icon = docIcons[doc] || Gavel;
                                    const colorClass = docColors[doc] || "bg-slate-50 text-slate-700 border-slate-200";

                                    return (
                                        <div key={doc} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`${colorClass} flex items-center gap-1.5 px-3 py-1.5`}>
                                                    <Icon size={13} /> {doc}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {docSections.map((sec, idx) => (
                                                    <div
                                                        key={`${sec.document}-${sec.section}-${idx}`}
                                                        className="rounded-2xl border border-[#E8DCC2] bg-[#FFFEFB] p-4 transition hover:shadow-sm"
                                                    >
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <Badge className="bg-[#EEF4FF] text-[#17407D] border-0">
                                                                Section {sec.section}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-[#0F2854] mb-2">{sec.title}</h3>
                                                        <p className="text-xs leading-6 text-[#5F6574] line-clamp-4">{sec.snippet}</p>
                                                        <p className="mt-2 text-[10px] text-[#B28A34] font-semibold uppercase tracking-wider">
                                                            Page {sec.page}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {dailySections.length > 0 ? (
                        <div className="rounded-[24px] border border-[#E8DCC2] bg-[#FCF7EE] p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F2854] text-[#E5D3A3] shadow-sm">
                                    <Scale size={18} />
                                </div>
                                <p className="text-sm font-semibold text-[#0F2854]">
                                    Sections change daily. Use the AI Legal Chat to ask detailed questions about any section.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </TabsContent>
            </Tabs>

            {selected ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1730]/55 px-4 py-8">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#DCCCA8] bg-white shadow-[0_28px_80px_rgba(11,23,48,0.35)]">
                        <div className="flex items-start justify-between gap-4 border-b border-[#F0E6D4] bg-[#FCF8F0] px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B28A34]">
                                    {selected.article_number}
                                </p>
                                <h3 className="mt-1 font-serif text-2xl font-bold text-[#0F2854]">
                                    {selected.title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setSelected(null); setDetailError(""); }}
                                className="rounded-2xl border border-[#E8DCC2] bg-white p-2 text-[#0F2854] transition hover:bg-[#F6EFE2]"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[calc(90vh-96px)] overflow-y-auto px-6 py-6">
                            {detailLoading ? (
                                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#DCCCA8] bg-[#FBF8F1] px-5 py-8">
                                    <Loader2 size={20} className="animate-spin text-[#B28A34]" />
                                    <p className="text-sm text-[#6F6248]">Loading article details...</p>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
