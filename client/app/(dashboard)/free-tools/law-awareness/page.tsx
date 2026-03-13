"use client";

import { BookOpen, HelpCircle, AlertOctagon, Scale, Shield, Landmark } from "lucide-react";

export default function LawAwarenessPage() {
    const cards = [
        {
            title: "RTI Act Explained",
            sub: "Right to Information",
            desc: "Knowing how to file an RTI to demand accountability from government offices digitally. Complete guide for citizens.",
            icon: BookOpen,
            color: "bg-blue-50 text-blue-600 border-blue-200"
        },
        {
            title: "Consumer Protection",
            sub: "E-Commerce Guidelines",
            desc: "Did you receive a defective product? Understand your rights to refund and replacement under Consumer Protection Act 2019.",
            icon: Shield,
            color: "bg-emerald-50 text-emerald-600 border-emerald-200"
        },
        {
            title: "Cyber Law Basics",
            sub: "Digital Safety",
            desc: "What to do if your bank account is hacked? A citizen's guide to the Information Technology Act 2000 and reporting portals.",
            icon: AlertOctagon,
            color: "bg-amber-50 text-amber-600 border-amber-200"
        },
        {
            title: "Property & Inheritance",
            sub: "Civil Law",
            desc: "A simplified breakdown of the Hindu Succession Act and ancestral property rights for daughters and sons alike.",
            icon: Landmark,
            color: "bg-purple-50 text-purple-600 border-purple-200"
        },
        {
            title: "Arrest Rights",
            sub: "Criminal Procedure Code",
            desc: "Your foundational rights if detained by authorities. Includes D.K. Basu guidelines and right to legal counsel.",
            icon: Scale,
            color: "bg-rose-50 text-rose-600 border-rose-200"
        },
        {
            title: "Traffic Rule Penalties",
            sub: "Motor Vehicles Act",
            desc: "Updated chart of fines for traffic violations. Know your liability before you interact with traffic police.",
            icon: HelpCircle,
            color: "bg-gray-100 text-gray-600 border-gray-300"
        }
    ];

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0F2854] text-white p-8 rounded-2xl shadow-md relative overflow-hidden z-0">
                <div className="absolute right-0 top-0 w-64 h-64 bg-[#1C4D8D] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 -z-10"></div>
                <div className="flex items-center gap-4 z-10">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl text-[#BDE8F5] border border-white/20"><BookOpen size={30} /></div>
                    <div>
                        <h1 className="text-3xl font-bold font-serif tracking-tight mb-1">Daily Law Awareness</h1>
                        <p className="text-sm text-[#BDE8F5] font-medium max-w-md">Educational legal content simplified for citizens. Know your rights and stay informed.</p>
                    </div>
                </div>
                <div className="mt-6 md:mt-0 z-10 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Search topics..."
                        className="w-full md:w-64 bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-2 outline-none focus:bg-white/20 focus:border-[#BDE8F5] transition-all text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group">
                        <div className={`p-3 w-min rounded-xl border ${card.color}`}>
                            <card.icon size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4988C4] mb-1">{card.sub}</p>
                            <h3 className="text-lg font-bold text-[#0F2854] group-hover:text-[#1C4D8D] transition-colors">{card.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2 flex-grow">
                            {card.desc}
                        </p>
                        <div className="mt-auto">
                            <span className="text-xs font-bold text-[#0F2854] bg-[#F5F7FA] border border-gray-200 px-3 py-1.5 rounded-lg group-hover:bg-[#1C4D8D] group-hover:text-white transition-colors uppercase tracking-wider">
                                Start Reading
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
