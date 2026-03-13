"use client";

import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto h-full">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><Mail size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Contact Support</h1>
                    <p className="text-sm text-gray-500">We're here to help with any technical or platform-related inquiries.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Contact Form */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <h2 className="text-lg font-bold text-[#0F2854] mb-6 border-b pb-4">Send us a Message</h2>

                    <form className="flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <input type="text" placeholder="John Doe" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all bg-gray-50 focus:bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input type="email" placeholder="john@example.com" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all bg-gray-50 focus:bg-white" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all bg-gray-50 focus:bg-white text-gray-700">
                                <option>General Inquiry</option>
                                <option>Technical Support</option>
                                <option>Billing Question</option>
                                <option>Feedback</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                            <textarea rows={5} placeholder="How can we help you today?" className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] transition-all bg-gray-50 focus:bg-white resize-none"></textarea>
                        </div>

                        <button type="button" className="bg-[#0F2854] hover:bg-[#1C4D8D] text-white px-6 py-3 rounded-lg font-medium transition-colors w-fit flex items-center gap-2 mt-2 shadow-sm">
                            <Send size={18} /> Submit Message
                        </button>
                    </form>
                </div>

                {/* Contact Info Sidebar */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[#1C4D8D] text-white rounded-2xl shadow-sm p-8 flex flex-col gap-8 h-full">
                        <div>
                            <h3 className="text-xl font-bold font-serif mb-2">E-Bench HQ</h3>
                            <p className="text-[#BDE8F5] text-sm leading-relaxed">Reach out to our dedicated support team directly.</p>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-white/10 rounded-lg"><Mail size={20} className="text-[#BDE8F5]" /></div>
                                <div>
                                    <p className="text-sm font-semibold mb-1 text-white">Email</p>
                                    <p className="text-sm text-[#BDE8F5]">support@ebench.ai</p>
                                    <p className="text-sm text-[#BDE8F5]">legal@ebench.ai</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-white/10 rounded-lg"><Phone size={20} className="text-[#BDE8F5]" /></div>
                                <div>
                                    <p className="text-sm font-semibold mb-1 text-white">Phone</p>
                                    <p className="text-sm text-[#BDE8F5]">+91 (800) 123-4567</p>
                                    <p className="text-sm text-[#BDE8F5]">Mon-Fri 9am to 6pm</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-white/10 rounded-lg"><MapPin size={20} className="text-[#BDE8F5]" /></div>
                                <div>
                                    <p className="text-sm font-semibold mb-1 text-white">Office</p>
                                    <p className="text-sm text-[#BDE8F5] leading-relaxed">
                                        E-Bench Technologies<br />
                                        Nariman Point<br />
                                        Mumbai, MH 400021<br />
                                        India
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
